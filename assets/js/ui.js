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

function toggleTriJoueurs(tri) {
    window.AppCore.triJoueurs = tri || (window.AppCore.triJoueurs === 'niveau' ? 'alpha' : 'niveau');
    document.querySelectorAll('.tri-btn').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.tri === window.AppCore.triJoueurs)
    );
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

// === NAVIGATION PAR ONGLETS ===
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.tab === tabName));
    document.querySelectorAll('.tab-section').forEach(s =>
        s.classList.toggle('active', s.id === `section-${tabName}`));
    if (tabName === 'historique' && window.AppSessions && window.AppSessions.chargerHistorique) {
        window.AppSessions.chargerHistorique();
    }
    if (tabName === 'stats' && window.AppSessions && window.AppSessions.afficherStats) {
        window.AppSessions.afficherStats();
    }
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
                           placeholder="Nom du joueur">
                </div>
                <div class="player-field">
                    <div class="niveau-wrapper">
                        <span class="niveau-label">Niv.</span>
                        <input type="number" value="${j.niveau}" min="1" max="10" step="0.1" 
                               onchange="window.AppPlayers.modifierJoueur(${originalIndex}, 'niveau', this.value)"
                               placeholder="1-10" title="Niveau de 1 à 10">
                    </div>
                </div>
                <div class="player-field">
<select onchange="window.AppPlayers.modifierJoueur(${originalIndex}, 'poste', this.value)" title="Position du joueur">
    <option value="indifferent" ${j.poste==='indifferent'?'selected':''}>Indifférent</option>
    <option value="avant" ${j.poste==='avant'?'selected':''}>Avant</option>
    <option value="arriere" ${j.poste==='arriere'?'selected':''}>Arrière</option>
    <option value="ailier" ${j.poste==='ailier'?'selected':''}>Ailier</option>
    <option value="centre" ${j.poste==='centre'?'selected':''}>Centre</option>
    <option value="pivot" ${j.poste==='pivot'?'selected':''}>Pivot</option>
    <option value="arr_centre" ${j.poste==='arr_centre'?'selected':''}>Arr. Centre</option>
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

// === ATTACHER LES EVENT LISTENERS ===
function attachEventListeners() {
    console.log('🔗 Attachement des event listeners...');

    // Onglets de navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    console.log('✅ Event listeners onglets attachés');
    
    // Sélecteur de club
    const clubSelect = document.getElementById('clubSelect');
    if (clubSelect) {
        clubSelect.addEventListener('change', function() {
            if (window.AppClubs && window.AppClubs.changerClub) {
                window.AppClubs.changerClub(this.value);
            }
        });
        console.log('✅ Event listener club attaché');
    }

    // Bouton d'ajout de joueur
    const ajouterBtn = document.getElementById('ajouterBtn');
    if (ajouterBtn) {
        ajouterBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (window.AppPlayers && window.AppPlayers.ajouterJoueur) {
                window.AppPlayers.ajouterJoueur();
            }
        });
        console.log('✅ Event listener ajout attaché');
    }

    // Bouton de recherche
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', rechercherJoueurs);
        console.log('✅ Event listener recherche attaché');
    }

    // Bouton effacer recherche
    const clearSearchBtn = document.getElementById('clearSearch');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', effacerRecherche);
        console.log('✅ Event listener effacer recherche attaché');
    }

    // Boutons tri (segmented control)
    document.querySelectorAll('.tri-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleTriJoueurs(btn.dataset.tri));
        btn.classList.toggle('active', btn.dataset.tri === (window.AppCore.triJoueurs || 'alpha'));
    });
    console.log('✅ Event listeners tri attachés');

    // Bouton créer équipes (ID CORRIGÉ : creerBtn)
    const createTeamsBtn = document.getElementById('creerBtn');
    if (createTeamsBtn) {
        createTeamsBtn.addEventListener('click', function() {
            if (window.AppTeams && window.AppTeams.creerEquipes) {
                window.AppTeams.creerEquipes();
            }
        });
        console.log('✅ Event listener créer équipes attaché');
    } else {
        console.error('❌ Element creerBtn non trouvé !');
    }

    // Bouton export
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            if (window.AppPlayers && window.AppPlayers.exporterJoueurs) {
                window.AppPlayers.exporterJoueurs();
            }
        });
        console.log('✅ Event listener export attaché');
    }

    // Bouton sync
    const syncBtn = document.getElementById('syncBtn');
    if (syncBtn) {
        syncBtn.addEventListener('click', async function() {
            if (window.AppStorage && window.AppStorage.synchroniser) {
                await window.AppStorage.synchroniser();
            } else if (window.AppStorage && window.AppStorage.chargerJoueurs) {
                await window.AppStorage.chargerJoueurs();
                if (window.afficherJoueurs) window.afficherJoueurs();
                window.AppCore.showToast('Synchronisation effectuée');
            }
        });
        console.log('✅ Event listener sync attaché');
    }

    // Import de fichier
    const fichierJoueurs = document.getElementById('fichierJoueurs');
    if (fichierJoueurs) {
        fichierJoueurs.addEventListener('change', function() {
            if (window.AppPlayers && window.AppPlayers.importerJoueurs) {
                window.AppPlayers.importerJoueurs();
            }
        });
        console.log('✅ Event listener import attaché');
    }

    // Bouton export matchs
    const exportMatchsBtn = document.getElementById('exportMatchsBtn');
    if (exportMatchsBtn) {
        exportMatchsBtn.addEventListener('click', function() {
            if (window.AppSessions && window.AppSessions.exporterMatchs) {
                window.AppSessions.exporterMatchs();
            }
        });
        console.log('✅ Event listener export matchs attaché');
    }

    // Import fichier matchs
    const fichierMatchs = document.getElementById('fichierMatchs');
    if (fichierMatchs) {
        fichierMatchs.addEventListener('change', function() {
            if (window.AppSessions && window.AppSessions.importerMatchs) {
                window.AppSessions.importerMatchs();
            }
        });
        console.log('✅ Event listener import matchs attaché');
    }

    console.log('🎉 Tous les event listeners attachés avec succès!');
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
    afficherJoueurs,
    attachEventListeners,
    switchTab
};

// Rendre afficherJoueurs globale pour compatibilité
window.afficherJoueurs = afficherJoueurs;
window.attachEventListeners = attachEventListeners;
