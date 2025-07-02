(function() {
    const SUPABASE_URL = 'https://qsbdzyhxppdbtsikhozp.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzYmR6eWh4cHBkYnRzaWtob3pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0NzI5OTYsImV4cCI6MjA2NzA0ODk5Nn0.kanu7GfIr-qDtd3wcSmDbjEMK9VYX4o9HdG4cD0rcus';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    let licenses = [];
    let editingIndex = null;

    async function load() {
        const { data, error } = await supabaseClient.from('licenses').select('*');
        if (error) {
            console.error('Erreur chargement licences:', error);
            licenses = [];
        } else {
            licenses = data || [];
        }
    }

    function daysUntil(dateStr) {
        if (!dateStr) return Infinity;
        const diff = new Date(dateStr) - new Date();
        return Math.ceil(diff / (1000*60*60*24));
    }

    function renderDashboard() {
        const total = licenses.length;
        const expiring = licenses.filter(l => daysUntil(l.expirationDate) <= 30 && daysUntil(l.expirationDate) >= 0).length;
        const expired = licenses.filter(l => daysUntil(l.expirationDate) < 0).length;
        const dashboard = document.getElementById('dashboard');
        dashboard.innerHTML = `
            <div class="dashboard-item">Total licences : ${total}</div>
            <div class="dashboard-item">Expirant &lt; 30j : ${expiring}</div>
            <div class="dashboard-item">Expirées : ${expired}</div>
        `;
    }

    function renderList(filterExpiring = false) {
        const list = document.getElementById('licensesList');
        const search = document.getElementById('searchInputLic').value.toLowerCase().trim();
        list.innerHTML = '';
        let data = licenses;
        if (search) {
            data = data.filter(l =>
                l.software.toLowerCase().includes(search) ||
                l.vendor.toLowerCase().includes(search)
            );
        }
        if (filterExpiring) {
            data = data.filter(l => daysUntil(l.expirationDate) <= 30);
        }
        data.forEach((l, idx) => {
            const d = daysUntil(l.expirationDate);
            let cls = 'ok';
            if (d < 0) cls = 'expired';
            else if (d <= 30) cls = 'warning';
            const card = document.createElement('div');
            card.className = `license-card ${cls}`;
            card.innerHTML = `
                <div class="license-info">
                    <div><strong>${l.software}</strong> ${l.version || ''}</div>
                    <div>${l.vendor}</div>
                    <div>Type: ${l.type}</div>
                    <div>Qté: ${l.quantity || 1}</div>
                    <div>Expire: ${l.expirationDate || '-'}</div>
                </div>
                <div class="license-actions">
                    <button class="btn btn-secondary" data-edit="${idx}"><span class="material-icons">edit</span></button>
                    <button class="btn btn-danger" data-del="${idx}"><span class="material-icons">delete</span></button>
                </div>
            `;
            list.appendChild(card);
        });
    }

    function fillForm(lic) {
        document.getElementById('softwareName').value = lic.software || '';
        document.getElementById('vendor').value = lic.vendor || '';
        document.getElementById('version').value = lic.version || '';
        document.getElementById('licenseType').value = lic.type || 'perpetuelle';
        document.getElementById('quantity').value = lic.quantity || '';
        document.getElementById('purchaseDate').value = lic.purchaseDate || '';
        document.getElementById('expirationDate').value = lic.expirationDate || '';
        document.getElementById('renewalDate').value = lic.renewalDate || '';
        document.getElementById('initialCost').value = lic.initialCost || '';
        document.getElementById('renewalCost').value = lic.renewalCost || '';
        document.getElementById('contacts').value = lic.contacts || '';
        document.getElementById('assignedTo').value = lic.assignedTo || '';
    }

    function clearForm() {
        fillForm({});
        editingIndex = null;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const lic = {
            software: document.getElementById('softwareName').value.trim(),
            vendor: document.getElementById('vendor').value.trim(),
            version: document.getElementById('version').value.trim(),
            type: document.getElementById('licenseType').value,
            quantity: parseInt(document.getElementById('quantity').value) || 1,
            purchaseDate: document.getElementById('purchaseDate').value,
            expirationDate: document.getElementById('expirationDate').value,
            renewalDate: document.getElementById('renewalDate').value,
            initialCost: parseFloat(document.getElementById('initialCost').value) || 0,
            renewalCost: parseFloat(document.getElementById('renewalCost').value) || 0,
            contacts: document.getElementById('contacts').value.trim(),
            assignedTo: document.getElementById('assignedTo').value.trim()
        };
        if (editingIndex !== null) {
            const id = licenses[editingIndex].id;
            const { error } = await supabaseClient
                .from('licenses')
                .update(lic)
                .eq('id', id);
            if (!error) {
                licenses[editingIndex] = { id, ...lic };
            } else {
                console.error('Erreur maj licence:', error);
            }
        } else {
            const { data, error } = await supabaseClient
                .from('licenses')
                .insert([lic])
                .select();
            if (!error && data && data[0]) {
                lic.id = data[0].id;
                licenses.push(lic);
            } else {
                console.error('Erreur ajout licence:', error);
            }
        }
        clearForm();
        renderDashboard();
        renderList();
    }

    async function handleActions(e) {
        const edit = e.target.closest('[data-edit]');
        if (edit) {
            editingIndex = parseInt(edit.getAttribute('data-edit'));
            fillForm(licenses[editingIndex]);
            return;
        }
        const del = e.target.closest('[data-del]');
        if (del) {
            const idx = parseInt(del.getAttribute('data-del'));
            if (confirm('Supprimer cette licence ?')) {
                const id = licenses[idx].id;
                const { error } = await supabaseClient
                    .from('licenses')
                    .delete()
                    .eq('id', id);
                if (!error) {
                    licenses.splice(idx, 1);
                    renderDashboard();
                    renderList();
                } else {
                    console.error('Erreur suppression licence:', error);
                }
            }
        }
    }

    document.addEventListener('DOMContentLoaded', async () => {
        await load();
        renderDashboard();
        renderList();
        document.getElementById('licenseForm').addEventListener('submit', handleSubmit);
        document.getElementById('licensesList').addEventListener('click', handleActions);
        document.getElementById('searchInputLic').addEventListener('input', () => renderList());
        document.getElementById('filterExpiring').addEventListener('click', () => renderList(true));
    });
})();
