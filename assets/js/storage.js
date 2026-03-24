// ===================================================================
// STORAGE.JS - Gestion des Donnees et Supabase
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
    if (!window.AppCore.clubActuel) return 'players_grenoble';
    const nom = window.AppCore.clubActuel.nom.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_');
    return `players_${nom}`;
}

async function chargerProfilUtilisateur() {
    try {
        if (!window.AppCore.supabaseClient || !window.AppCore.supabaseClient.auth) {
            window.AppCore.currentUser = null;
            window.AppCore.currentRole = 'admin';
            return { role: window.AppCore.currentRole, user: null };
        }

        const { data: sessionData, error: sessionError } = await window.AppCore.supabaseClient.auth.getSession();
        if (sessionError) throw sessionError;

        const user = sessionData && sessionData.session ? sessionData.session.user : null;
        window.AppCore.currentUser = user || null;

        // Compatibilite: sans login, on conserve les droits admin historiques.
        if (!user) {
            window.AppCore.currentRole = 'admin';
            return { role: window.AppCore.currentRole, user: null };
        }

        const { data: profil, error: profilError } = await window.AppCore.supabaseClient
            .from('user_profiles')
            .select('role, actif')
            .eq('id', user.id)
            .maybeSingle();

        if (profilError) {
            console.warn('Profil utilisateur indisponible, fallback operateur:', profilError.message);
        }

        if (!profil || profil.actif === false) {
            window.AppCore.currentRole = 'operateur';
        } else {
            window.AppCore.currentRole = (profil.role === 'admin') ? 'admin' : 'operateur';
        }

        try {
            const { data: setting } = await window.AppCore.supabaseClient
                .from('app_settings')
                .select('value_text')
                .eq('key', 'enforce_level_security')
                .maybeSingle();
            if (setting && typeof setting.value_text === 'string') {
                const v = setting.value_text.toLowerCase();
                window.AppCore.levelSecurityEnforced = ['true', '1', 'yes', 'on'].includes(v);
            }
        } catch (e) {
            // Step 2 pas encore applique: ignorer.
            window.AppCore.levelSecurityEnforced = false;
        }

        return { role: window.AppCore.currentRole, user };
    } catch (error) {
        console.error('Erreur chargement profil utilisateur:', error);
        window.AppCore.currentUser = null;
        window.AppCore.currentRole = 'admin';
        window.AppCore.levelSecurityEnforced = false;
        return { role: window.AppCore.currentRole, user: null };
    }
}

// === CHARGEMENT DES CLUBS ===
async function chargerClubs() {
    try {
        const { data, error } = await window.AppCore.supabaseClient.from('clubs').select('*');
        if (error) throw error;
        window.AppCore.clubs = data || [];

        const clubSauvegarde = getClubSauvegarde();
        window.AppCore.clubActuel = window.AppCore.clubs.find(c => c.nom.toLowerCase() === clubSauvegarde) || window.AppCore.clubs[0];

        const selectClub = document.getElementById('clubSelect');
        if (selectClub && window.AppCore.clubActuel) {
            selectClub.value = window.AppCore.clubActuel.nom.toLowerCase();
        }

        return window.AppCore.clubs;
    } catch (error) {
        console.error('Erreur chargement clubs:', error);
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
        if (!window.AppCore.clubActuel) return [];

        const tableName = getTableName();
        const clubSlug = window.AppCore.getClubSlug();
        const canViewNiveaux = window.AppCore.canViewNiveaux ? window.AppCore.canViewNiveaux() : true;

        let joueursData = [];

        if (!canViewNiveaux && window.AppCore.levelSecurityEnforced) {
            const { data, error } = await window.AppCore.supabaseClient
                .rpc('api_players_list_safe', { p_club: clubSlug });
            if (error) throw error;
            joueursData = (data || []).map(j => ({
                id: j.id,
                nom: j.nom,
                niveau: 5, // Mode aveugle: niveau reel non expose au client
                poste: j.poste,
                groupe: j.groupe,
                actif: j.actif !== false
            }));
        } else {
            console.log(`Chargement depuis la table: ${tableName}`);
            const { data, error } = await window.AppCore.supabaseClient
                .from(tableName)
                .select('*');
            if (error) throw error;
            joueursData = (data || []).map(j => ({
                id: j.id,
                nom: j.nom,
                niveau: j.niveau,
                poste: j.poste,
                groupe: j.groupe,
                actif: j.actif !== false
            }));
        }

        window.AppCore.joueurs = joueursData;

        const clubInfo = document.getElementById('clubInfo');
        if (clubInfo) {
            const roleLabel = window.AppCore.currentRole === 'admin' ? 'admin' : 'operateur';
            clubInfo.textContent = `${window.AppCore.joueurs.length} joueur(s) - role ${roleLabel}`;
        }

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
        window.AppCore.updateStatus('Synchronisation...', 'connecting');

        if (!window.AppCore.isOnline) {
            await init();
            return;
        }

        await chargerProfilUtilisateur();
        await chargerJoueurs();

        if (window.AppUI && window.AppUI.appliquerPermissionsUI) {
            window.AppUI.appliquerPermissionsUI();
        }
        if (window.afficherJoueurs) window.afficherJoueurs();

        window.AppCore.updateStatus(`Connecte (${window.AppCore.joueurs.length} joueurs - ${window.AppCore.clubActuel.nom})`, 'connected');
        window.AppCore.showToast('Synchronisation reussie !');
    } catch (error) {
        console.error('Erreur sync:', error);
        window.AppCore.showToast('Erreur synchronisation: ' + error.message, true);
        window.AppCore.updateStatus('Erreur sync', 'offline');
    }
}

// === EXPORT DES FONCTIONS ===
window.AppStorage = {
    getClubSauvegarde,
    sauvegarderClub,
    getTableName,
    chargerProfilUtilisateur,
    chargerClubs,
    chargerJoueurs,
    synchroniser
};
