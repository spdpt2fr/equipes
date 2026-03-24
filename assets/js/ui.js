// ===================================================================
// UI.JS - Interface et Affichage
// Module de gestion de l'interface utilisateur
// ===================================================================

// === FONCTIONS DE RECHERCHE ET TRI ===
function rechercherJoueurs() {
    const input = document.getElementById('searchInput');
    window.AppCore.searchTerm = input ? input.value.toLowerCase().trim() : '';
    afficherJoueurs();
}

function effacerRecherche() {
    const input = document.getElementById('searchInput');
    if (input) input.value = '';
    window.AppCore.searchTerm = '';
    afficherJoueurs();
}

function filtrerJoueurs(joueursListe) {
    if (!window.AppCore.searchTerm) return joueursListe;
    const canViewNiveaux = window.AppCore.canViewNiveaux ? window.AppCore.canViewNiveaux() : true;

    return joueursListe.filter(joueur => {
        const baseMatch = joueur.nom.toLowerCase().includes(window.AppCore.searchTerm) ||
            (joueur.poste || '').toLowerCase().includes(window.AppCore.searchTerm);

        if (baseMatch) return true;
        if (!canViewNiveaux) return false;

        return (joueur.niveau != null) && joueur.niveau.toString().includes(window.AppCore.searchTerm);
    });
}

function trierJoueurs(joueursListe) {
    const joueursCopie = [...joueursListe];
    const canViewNiveaux = window.AppCore.canViewNiveaux ? window.AppCore.canViewNiveaux() : true;
    const triEffectif = (!canViewNiveaux && window.AppCore.triJoueurs === 'niveau') ? 'alpha' : window.AppCore.triJoueurs;

    if (triEffectif === 'alpha') {
        return joueursCopie.sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));
    }

    return joueursCopie.sort((a, b) => (b.niveau || 0) - (a.niveau || 0) || a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));
}

function toggleTriJoueurs(tri) {
    const canViewNiveaux = window.AppCore.canViewNiveaux ? window.AppCore.canViewNiveaux() : true;

    if (!canViewNiveaux && tri === 'niveau') {
        window.AppCore.triJoueurs = 'alpha';
        document.querySelectorAll('.tri-btn').forEach(btn =>
            btn.classList.toggle('active', btn.dataset.tri === 'alpha')
        );
        return;
    }

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
    const canViewNiveaux = window.AppCore.canViewNiveaux ? window.AppCore.canViewNiveaux() : true;
    if (!canViewNiveaux) return;
    window.AppCore.afficherTotal = !window.AppCore.afficherTotal;
    if (window.afficherEquipes) window.afficherEquipes();
}

function appliquerPermissionsUI() {
    const canViewNiveaux = window.AppCore.canViewNiveaux ? window.AppCore.canViewNiveaux() : true;

    const niveauInput = document.getElementById('niveau');
    if (niveauInput) {
        const niveauGroup = niveauInput.closest('.input-group');
        niveauInput.disabled = !canViewNiveaux;
        niveauInput.required = canViewNiveaux;
        if (!canViewNiveaux) niveauInput.value = '';
        if (niveauGroup) niveauGroup.style.display = canViewNiveaux ? '' : 'none';
    }

    const triNiveauBtn = document.querySelector('.tri-btn[data-tri="niveau"]');
    if (triNiveauBtn) {
        triNiveauBtn.disabled = !canViewNiveaux;
        triNiveauBtn.style.opacity = canViewNiveaux ? '' : '0.45';
        triNiveauBtn.title = canViewNiveaux ? '' : 'Tri niveau reserve admin';
    }

    const statsTabBtn = document.querySelector('.tab-btn[data-tab="stats"]');
    if (statsTabBtn) {
        statsTabBtn.style.display = canViewNiveaux ? '' : 'none';
    }

    if (!canViewNiveaux && window.AppCore.triJoueurs === 'niveau') {
        window.AppCore.triJoueurs = 'alpha';
        document.querySelectorAll('.tri-btn').forEach(btn =>
            btn.classList.toggle('active', btn.dataset.tri === 'alpha')
        );
    }
}

// === NAVIGATION PAR ONGLETS ===
function switchTab(tabName) {
    if (tabName === 'stats' && window.AppCore.canViewNiveaux && !window.AppCore.canViewNiveaux()) {
        window.AppCore.showToast('Onglet stats reserve admin', true);
        tabName = 'gestion';
    }

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
    const canViewNiveaux = window.AppCore.canViewNiveaux ? window.AppCore.canViewNiveaux() : true;

    if (!carte || !liste || !statsElement) return;

    if (window.AppCore.joueurs.length === 0) {
        carte.style.display = 'none';
        return;
    }

    carte.style.display = 'block';
    liste.innerHTML = '';

    const joueursTries = trierJoueurs(window.AppCore.joueurs);
    const joueursFiltres = filtrerJoueurs(joueursTries);

    const totalJoueurs = window.AppCore.joueurs.length;
    const joueursActifs = window.AppCore.joueurs.filter(j => j.actif).length;
    const joueursAffiches = joueursFiltres.length;

    let statsText = `${totalJoueurs} joueur(s) total`;
    if (joueursActifs !== totalJoueurs) {
        statsText += ` (${joueursActifs} actifs)`;
    }
    if (window.AppCore.searchTerm) {
        statsText += ` - ${joueursAffiches} trouve(s)`;
    }
    statsElement.textContent = statsText;

    joueursFiltres.forEach((j) => {
        const originalIndex = window.AppCore.joueurs.indexOf(j);
        const playerCard = document.createElement('div');
        playerCard.className = `player-card ${!j.actif ? 'inactive' : ''}`;

        const nomSafe = window.AppCore.escapeHtml(j.nom);
        const niveauSafe = window.AppCore.escapeHtml(j.niveau);
        const groupeSafe = window.AppCore.escapeHtml(j.groupe || '');

        const niveauFieldHtml = canViewNiveaux
            ? `<div class="player-field">
                    <div class="niveau-wrapper">
                        <span class="niveau-label">Niv.</span>
                        <input type="number" value="${niveauSafe}" min="1" max="10" step="0.1"
                               onchange="window.AppPlayers.modifierJoueur(${originalIndex}, 'niveau', this.value)"
                               placeholder="1-10" title="Niveau de 1 a 10">
                    </div>
               </div>`
            : `<div class="player-field">
                    <div class="niveau-wrapper">
                        <span class="niveau-label">Niv.</span>
                        <span class="badge badge-pending">Masque</span>
                    </div>
               </div>`;

        playerCard.innerHTML = `
            <div class="checkbox-wrapper">
                <input type="checkbox" ${j.actif ? 'checked' : ''} onchange="window.AppPlayers.modifierJoueur(${originalIndex}, 'actif', this.checked)">
            </div>
            <div class="player-info">
                <div class="player-field">
                    <input type="text" value="${nomSafe}" class="player-name-input"
                           onchange="window.AppPlayers.modifierJoueur(${originalIndex}, 'nom', this.value)"
                           placeholder="Nom du joueur">
                </div>
                ${niveauFieldHtml}
                <div class="player-field">
<select onchange="window.AppPlayers.modifierJoueur(${originalIndex}, 'poste', this.value)" title="Position du joueur">
    <option value="indifferent" ${j.poste === 'indifferent' ? 'selected' : ''}>Indifferent</option>
    <option value="avant" ${j.poste === 'avant' ? 'selected' : ''}>Avant</option>
    <option value="arriere" ${j.poste === 'arriere' ? 'selected' : ''}>Arriere</option>
    <option value="ailier" ${j.poste === 'ailier' ? 'selected' : ''}>Ailier</option>
    <option value="centre" ${j.poste === 'centre' ? 'selected' : ''}>Centre</option>
    <option value="pivot" ${j.poste === 'pivot' ? 'selected' : ''}>Pivot</option>
    <option value="arr_centre" ${j.poste === 'arr_centre' ? 'selected' : ''}>Arr. Centre</option>
</select>
                </div>
                <div class="player-field">
                    <input type="number" value="${groupeSafe}" min="1"
                           onchange="window.AppPlayers.modifierJoueur(${originalIndex}, 'groupe', this.value)"
                           placeholder="Groupe" title="Numero de groupe (optionnel)">
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
    console.log('Attachement des event listeners...');

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    const clubSelect = document.getElementById('clubSelect');
    if (clubSelect) {
        clubSelect.addEventListener('change', function() {
            if (window.AppClubs && window.AppClubs.changerClub) {
                window.AppClubs.changerClub(this.value);
            }
        });
    }

    const ajouterBtn = document.getElementById('ajouterBtn');
    if (ajouterBtn) {
        ajouterBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (window.AppPlayers && window.AppPlayers.ajouterJoueur) {
                window.AppPlayers.ajouterJoueur();
            }
        });
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', rechercherJoueurs);
    }

    const clearSearchBtn = document.getElementById('clearSearch');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', effacerRecherche);
    }

    document.querySelectorAll('.tri-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleTriJoueurs(btn.dataset.tri));
        btn.classList.toggle('active', btn.dataset.tri === (window.AppCore.triJoueurs || 'alpha'));
    });

    const createTeamsBtn = document.getElementById('creerBtn');
    if (createTeamsBtn) {
        createTeamsBtn.addEventListener('click', function() {
            if (window.AppTeams && window.AppTeams.creerEquipes) {
                window.AppTeams.creerEquipes();
            }
        });
    }

    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            if (window.AppPlayers && window.AppPlayers.exporterJoueurs) {
                window.AppPlayers.exporterJoueurs();
            }
        });
    }

    const syncBtn = document.getElementById('syncBtn');
    if (syncBtn) {
        syncBtn.addEventListener('click', async function() {
            if (window.AppStorage && window.AppStorage.synchroniser) {
                await window.AppStorage.synchroniser();
            } else if (window.AppStorage && window.AppStorage.chargerJoueurs) {
                await window.AppStorage.chargerJoueurs();
                if (window.afficherJoueurs) window.afficherJoueurs();
                window.AppCore.showToast('Synchronisation effectuee');
            }
        });
    }

    const fichierJoueurs = document.getElementById('fichierJoueurs');
    if (fichierJoueurs) {
        fichierJoueurs.addEventListener('change', function() {
            if (window.AppPlayers && window.AppPlayers.importerJoueurs) {
                window.AppPlayers.importerJoueurs();
            }
        });
    }

    const exportMatchsBtn = document.getElementById('exportMatchsBtn');
    if (exportMatchsBtn) {
        exportMatchsBtn.addEventListener('click', function() {
            if (window.AppSessions && window.AppSessions.exporterMatchs) {
                window.AppSessions.exporterMatchs();
            }
        });
    }

    const fichierMatchs = document.getElementById('fichierMatchs');
    if (fichierMatchs) {
        fichierMatchs.addEventListener('change', function() {
            if (window.AppSessions && window.AppSessions.importerMatchs) {
                window.AppSessions.importerMatchs();
            }
        });
    }

    appliquerPermissionsUI();
    console.log('Tous les event listeners attaches avec succes');
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
    appliquerPermissionsUI,
    afficherJoueurs,
    attachEventListeners,
    switchTab
};

window.afficherJoueurs = afficherJoueurs;
window.attachEventListeners = attachEventListeners;
