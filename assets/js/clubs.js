// ===================================================================
// CLUBS.JS - Gestion des Clubs
// Module de gestion du switch entre clubs
// ===================================================================

// === CHANGEMENT DE CLUB ===
async function changerClub(nomClub) {
    try {
        if (!nomClub) {
            const selectClub = document.getElementById('clubSelect');
            nomClub = selectClub ? selectClub.value : null;
        }

        window.AppCore.clubActuel = window.AppCore.clubs.find(c => c.nom.toLowerCase() === nomClub);

        if (!window.AppCore.clubActuel) {
            throw new Error(`Club "${nomClub}" non trouve`);
        }

        window.AppCore.equipes = [];
        window.AppCore.sessionValidee = null;

        const equipesContainer = document.getElementById('equipesContainer');
        if (equipesContainer) equipesContainer.innerHTML = '';

        const resultatsContainer = document.getElementById('resultatsContainer');
        if (resultatsContainer) resultatsContainer.innerHTML = '';

        window.AppStorage.sauvegarderClub(nomClub);

        await window.AppStorage.chargerJoueurs();

        if (window.AppUI && window.AppUI.appliquerPermissionsUI) {
            window.AppUI.appliquerPermissionsUI();
        }

        if (window.afficherJoueurs) window.afficherJoueurs();

        if (window.AppSessions && window.AppSessions.chargerHistorique) {
            await window.AppSessions.chargerHistorique();
        }

        window.AppCore.updateStatus(`Connecte (${window.AppCore.joueurs.length} joueurs - ${window.AppCore.clubActuel.nom})`, 'connected');
        window.AppCore.showToast(`Bascule vers le club ${window.AppCore.clubActuel.nom}`);
        console.log(`Club change vers ${window.AppCore.clubActuel.nom}`);
    } catch (error) {
        console.error('Erreur changement club:', error);
        window.AppCore.showToast('Erreur changement de club: ' + error.message, true);
    }
}

// === INITIALISATION COMPLETE ===
async function init() {
    try {
        window.AppCore.updateStatus('Connexion...', 'connecting');
        console.log('Initialisation...');

        window.AppCore.supabaseClient = supabase.createClient(window.AppCore.SUPABASE_URL, window.AppCore.SUPABASE_ANON_KEY);
        console.log('Client Supabase cree');

        await window.AppStorage.chargerProfilUtilisateur();
        await window.AppStorage.chargerClubs();
        await window.AppStorage.chargerJoueurs();

        window.AppCore.isOnline = true;

        if (window.AppUI && window.AppUI.appliquerPermissionsUI) {
            window.AppUI.appliquerPermissionsUI();
        }

        const roleTag = window.AppCore.currentRole === 'admin' ? 'admin' : 'operateur';
        window.AppCore.updateStatus(`Connecte (${window.AppCore.joueurs.length} joueurs - ${window.AppCore.clubActuel.nom} - ${roleTag})`, 'connected');
        console.log('Connexion OK, joueurs charges:', window.AppCore.joueurs.length);

        if (window.afficherJoueurs) window.afficherJoueurs();
        window.AppCore.showToast(`Connexion reussie ! Club: ${window.AppCore.clubActuel.nom} (${roleTag})`);

        if (window.AppSessions && window.AppSessions.chargerHistorique) {
            await window.AppSessions.chargerHistorique();
        }
    } catch (error) {
        console.error('Erreur connexion:', error);
        window.AppCore.isOnline = false;
        window.AppCore.updateStatus('Hors ligne', 'offline');
        window.AppCore.showToast('Mode hors ligne - ' + (error.message || 'Connexion impossible'), true);
    }
}

// === EXPORT DES FONCTIONS ===
window.AppClubs = {
    changerClub,
    init
};
