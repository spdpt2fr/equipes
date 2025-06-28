// ===================================================================
// CLUBS.JS - Gestion des Clubs
// Module de gestion du switch entre clubs
// ===================================================================

// === CHANGEMENT DE CLUB ===
function changerClub() {
    const selectClub = document.getElementById('clubSelect');
    const nomClub = selectClub.value;
    window.AppCore.clubActuel = window.AppCore.clubs.find(c => c.nom.toLowerCase() === nomClub);
    
    window.AppStorage.sauvegarderClub(nomClub);
    
    // Recharger les joueurs pour le nouveau club
    window.AppStorage.chargerJoueurs();
    
    window.AppCore.showToast(`Basculé vers le club ${window.AppCore.clubActuel.nom}`);
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
