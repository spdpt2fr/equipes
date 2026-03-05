// ===================================================================
// STORAGE.JS - Gestion des Données et Supabase
// Module de persistance et synchronisation
// ===================================================================

// === GESTION LOCALE ===
function getClubSauvegarde() {
    return localStorage.getItem('hockeySub_clubActuel') || 'grenoble';
}

function sauvegarderClub(clubId) {
    localStorage.setItem('hockeySub_clubActuel', clubId);
}

function getTableName() {
    if (!window.AppCore.clubActuel) return 'players_grenoble'; // fallback
    const nom = window.AppCore.clubActuel.nom.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // supprimer accents
        .replace(/\s+/g, '_');
    return `players_${nom}`;
}

// === CHARGEMENT DES CLUBS ===
async function chargerClubs() {
    try {
        const { data, error } = await window.AppCore.supabaseClient.from('clubs').select('*');
        if (error) throw error;
        window.AppCore.clubs = data || [];
        
        // Initialiser le club actuel
        const clubSauvegarde = getClubSauvegarde();
        window.AppCore.clubActuel = window.AppCore.clubs.find(c => c.nom.toLowerCase() === clubSauvegarde) || window.AppCore.clubs[0];
        
        // Mettre à jour le sélecteur
        document.getElementById('clubSelect').value = window.AppCore.clubActuel.nom.toLowerCase();
        
        return window.AppCore.clubs;
    } catch (error) {
        console.error('Erreur chargement clubs:', error);
        // Mode fallback
        window.AppCore.clubs = [
            { id: 1, nom: 'Grenoble' },
            { id: 2, nom: 'Jeeves' }
        ];
        window.AppCore.clubActuel = window.AppCore.clubs[0];
        return window.AppCore.clubs;
    }
}

// === CHARGEMENT DES JOUEURS ===
async function chargerJoueurs() {
    try {
        if (!window.AppCore.clubActuel) return;
        
        const tableName = getTableName();
        console.log(`Chargement depuis la table: ${tableName}`);
        
        const { data, error } = await window.AppCore.supabaseClient
            .from(tableName)
            .select('*');
        
        if (error) throw error;
        
        window.AppCore.joueurs = (data || []).map(j => ({
            id: j.id,
            nom: j.nom,
            niveau: j.niveau,
            poste: j.poste,
            groupe: j.groupe,
            actif: j.actif !== false
        }));
        
        // Mettre à jour l'info du club
        document.getElementById('clubInfo').textContent = `${window.AppCore.joueurs.length} joueur(s)`;
        
        return window.AppCore.joueurs;
    } catch (error) {
        console.error('Erreur chargement joueurs:', error);
        window.AppCore.joueurs = [];
        return [];
    }
}

// === SYNCHRONISATION ===
async function synchroniser() {
    try {
        window.AppCore.updateStatus('🔄 Synchronisation...', 'connecting');
        
        if (!window.AppCore.isOnline) {
            await init();
            return;
        }
        
        await chargerJoueurs();
        
        if (window.afficherJoueurs) window.afficherJoueurs();
        window.AppCore.updateStatus(`🟢 Synchronisé (${window.AppCore.joueurs.length} joueurs - ${window.AppCore.clubActuel.nom})`, 'connected');
        window.AppCore.showToast('Synchronisation réussie !');
        
    } catch (error) {
        console.error('Erreur sync:', error);
        window.AppCore.showToast('Erreur synchronisation: ' + error.message, true);
        window.AppCore.updateStatus('🔴 Erreur sync', 'offline');
    }
}

// === EXPORT DES FONCTIONS ===
window.AppStorage = {
    getClubSauvegarde,
    sauvegarderClub,
    getTableName,
    chargerClubs,
    chargerJoueurs,
    synchroniser
};
