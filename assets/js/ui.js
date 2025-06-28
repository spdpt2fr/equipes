// ===================================================================
// UI.JS - Interface et Affichage
// Module de gestion de l'interface utilisateur
// ===================================================================

// === FONCTIONS DE RECHERCHE ET TRI ===
function rechercherJoueurs() {
    window.AppCore.searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    afficherJoueurs();
}

function effacerRecherche() {
    document.getElementById('searchInput').value = '';
    window.AppCore.searchTerm = '';
    afficherJoueurs();
}

function filtrerJoueurs(joueursListe) {
    if (!window.AppCore.searchTerm) return joueursListe;
    return joueursListe.filter(joueur => 
        joueur.nom.toLowerCase().includes(window.AppCore.searchTerm) ||
        joueur.poste.toLowerCase().includes(window.AppCore.searchTerm) ||
        joueur.niveau.toString().includes(window.AppCore.searchTerm)
    );
}

function trierJoueurs(joueursListe) {
    const joueursCopie = [...joueursListe];
    if (window.AppCore.triJoueurs === 'alpha') {
        return joueursCopie.sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));
    } else {
        return joueursCopie.sort((a, b) => b.niveau - a.niveau || a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));
    }
}

function toggleTriJoueurs() {
    window.AppCore.triJoueurs = window.AppCore.triJoueurs === 'niveau' ? 'alpha' : 'niveau';
    document.getElementById('sortText').textContent = window.AppCore.triJoueurs === 'alpha' ? 'Alphabétique' : 'Par niveau';
    afficherJoueurs();
}

function toggleTriEquipes() {
    window.AppCore.triEquipes = window.AppCore.triEquipes === 'niveau' ? 'alpha' : 'niveau';
    if (window.afficherEquipes) window.afficherEquipes();
}

function toggleTotalNiveaux() {
    window.AppCore.afficherTotal = !window.AppCore.afficherTotal;
    if (window.afficherEquipes) window.afficherEquipes();
}

// === AFFICHAGE DES JOUEURS ===
function afficherJoueurs() {
    const carte = document.getElementById('listeJoueursCard');
    const liste = document.getElementById('listeJoueurs');
    const statsElement = document.getElementById('searchStats');

    if (window.AppCore.joueurs.length === 0) {
        carte.style.display = 'none';
        return;
    }

    carte.style.display = 'block';
    liste.innerHTML = '';

    // Trier puis filtrer les joueurs
    const joueursTries = trierJoueurs(window.AppCore.joueurs);
    const joueursFiltres = filtrerJoueurs(joueursTries);

    // Mettre à jour les statistiques
    const totalJoueurs = window.AppCore.joueurs.length;
    const joueursActifs = window.AppCore.joueurs.filter(j => j.actif).length;
    const joueursAffiches = joueursFiltres.length;
    
    let statsText = `${totalJoueurs} joueur(s) total`;
    if (joueursActifs !== totalJoueurs) {
        statsText += ` (${joueursActifs} actifs)`;
    }
    if (window.AppCore.searchTerm) {
        statsText += ` - ${joueursAffiches} trouvé(s)`;
    }
    statsElement.textContent = statsText;

    joueursFiltres.forEach((j, index) => {
        const originalIndex = window.AppCore.joueurs.indexOf(j);
        const playerCard = document.createElement('div');
        playerCard.className = `player-card ${!j.actif ? 'inactive' : ''}`;

        playerCard.innerHTML = `
            <div class="checkbox-wrapper">
                <input type="checkbox" ${j.actif ? 'checked' : ''} onchange="window.AppPlayers.modifierJoueur(${originalIndex}, 'actif', this.checked)">
            </div>
            <div class="player-info">
                <div class="player-field">
                    <input type="text" value="${j.nom}" class="player-name-input" 
                           onchange="window.AppPlayers.modifierJoueur(${originalIndex}, 'nom', this.value)"
                           onblur="window.AppPlayers.modifierJoueur(${originalIndex}, 'nom', this.value)"
                           placeholder="Nom du joueur">
                </div>
                <div class="player-field">
                    <div class="niveau-wrapper">
                        <span class="niveau-label">Niv.</span>
                        <input type="number" value="${j.niveau}" min="1" max="10" 
                               onchange="window.AppPlayers.modifierJoueur(${originalIndex}, 'niveau', this.value)"
                               placeholder="1-10" title="Niveau de 1 à 10">
                    </div>
                </div>
                <div class="player-field">
                    <select onchange="window.AppPlayers.modifierJoueur(${originalIndex}, 'poste', this.value)" title="Position du joueur">
                        <option value="arriere" ${j.poste==='arriere'?'selected':''}>Arrière</option>
                        <option value="pivot" ${j.poste==='pivot'?'selected':''}>Pivot</option>
                        <option value="centre" ${j.poste==='centre'?'selected':''}>Centre</option>
                        <option value="ailier" ${j.poste==='ailier'?'selected':''}>Ailier</option>
                        <option value="indifferent" ${j.poste==='indifferent'?'selected':''}>Indifférent</option>
                    </select>
                </div>
                <div class="player-field">
                    <input type="number" value="${j.groupe || ''}" min="1" 
                           onchange="window.AppPlayers.modifierJoueur(${originalIndex}, 'groupe', this.value)"
                           placeholder="Groupe" title="Numéro de groupe (optionnel)">
                </div>
            </div>
            <button onclick="window.AppPlayers.supprimerJoueur(${originalIndex})" class="btn btn-danger">
                <span class="material-icons">delete</span>
            </button>
        `;

        liste.appendChild(playerCard);
    });
}

// === EXPORT DES FONCTIONS ===
window.AppUI = {
    rechercherJoueurs,
    effacerRecherche,
    filtrerJoueurs,
    trierJoueurs,
    toggleTriJoueurs,
    toggleTriEquipes,
    toggleTotalNiveaux,
    afficherJoueurs
};

// Rendre afficherJoueurs globale pour compatibilité
window.afficherJoueurs = afficherJoueurs;
