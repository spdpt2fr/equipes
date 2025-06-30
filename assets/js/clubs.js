// ===================================================================
// CLUBS.JS - Gestion des Clubs
// Module de gestion du switch entre clubs
// ===================================================================

// === CHANGEMENT DE CLUB ===
async function changerClub(nomClub) {
    try {
        // Si pas de paramètre, récupérer depuis le select
        if (!nomClub) {
            const selectClub = document.getElementById('clubSelect');
            nomClub = selectClub.value;
        }
        
        window.AppCore.clubActuel = window.AppCore.clubs.find(c => c.nom.toLowerCase() === nomClub);
        
        if (!window.AppCore.clubActuel) {
            throw new Error(`Club "${nomClub}" non trouvé`);
        }
        
        window.AppStorage.sauvegarderClub(nomClub);
        
        // Recharger les joueurs pour le nouveau club
        await window.AppStorage.chargerJoueurs();
        
        // Rafraîchir l'affichage automatiquement
        if (window.afficherJoueurs) {
            window.afficherJoueurs();
        }
        
        // Mettre à jour le statut
        window.AppCore.updateStatus(`🟢 Connecté (${window.AppCore.joueurs.length} joueurs - ${window.AppCore.clubActuel.nom})`, 'connected');
        
        window.AppCore.showToast(`Basculé vers le club ${window.AppCore.clubActuel.nom}`);
        
        console.log(`✅ Club changé vers: ${window.AppCore.clubActuel.nom} (${window.AppCore.joueurs.length} joueurs)`);
        
    } catch (error) {
        console.error('Erreur changement club:', error);
        window.AppCore.showToast('Erreur lors du changement de club: ' + error.message, true);
    }
}

// === INITIALISATION COMPLÈTE ===
async function init() {
    try {
        window.AppCore.updateStatus('🔄 Connexion...', 'connecting');
        console.log('Initialisation...');
        
        // Créer client Supabase
        window.AppCore.supabaseClient = supabase.createClient(window.AppCore.SUPABASE_URL, window.AppCore.SUPABASE_ANON_KEY);
        console.log('Client Supabase créé');
        
        // Charger les clubs en premier
        await window.AppStorage.chargerClubs();
        console.log('Clubs chargés:', window.AppCore.clubs);
        
        // Charger les joueurs pour le club actuel
        await window.AppStorage.chargerJoueurs();
        
        window.AppCore.isOnline = true;
        window.AppCore.updateStatus(`🟢 Connecté (${window.AppCore.joueurs.length} joueurs - ${window.AppCore.clubActuel.nom})`, 'connected');
        console.log('Connexion OK, joueurs chargés:', window.AppCore.joueurs.length);
        
        if (window.afficherJoueurs) window.afficherJoueurs();
        window.AppCore.showToast(`Connexion réussie ! Club: ${window.AppCore.clubActuel.nom}`);
        
    } catch (error) {
        console.error('Erreur connexion:', error);
        window.AppCore.isOnline = false;
        window.AppCore.updateStatus('🔴 Hors ligne', 'offline');
        window.AppCore.showToast('Mode hors ligne - ' + (error.message || 'Connexion impossible'), true);
    }
}

// === EXPORT DES FONCTIONS ===
window.AppClubs = {
    changerClub,
    init
};
