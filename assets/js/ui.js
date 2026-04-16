// ===================================================================
// UI.JS - Interface et Affichage
// Module de gestion de l'interface utilisateur
// ===================================================================

let _langAlgo = 'fr'; // Langue de l'onglet "Comment ça marche" : 'fr' | 'en'

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
        triNiveauBtn.style.display = canViewNiveaux ? '' : 'none';
    }

    const statsTabBtn = document.querySelector('.tab-btn[data-tab="stats"]');
    if (statsTabBtn) {
        statsTabBtn.style.display = (window.AppCore.isAdmin() || window.AppCore.isSelecteur()) ? '' : 'none';
    }

    if (!canViewNiveaux && window.AppCore.triJoueurs === 'niveau') {
        window.AppCore.triJoueurs = 'alpha';
        document.querySelectorAll('.tri-btn').forEach(btn =>
            btn.classList.toggle('active', btn.dataset.tri === 'alpha')
        );
    }

    const methodeSelect = document.getElementById('methodeConstitution');
    if (methodeSelect) methodeSelect.style.display = canViewNiveaux ? '' : 'none';

    // Vue sélectionneur : masquer carte ajout joueur
    const saisieCard = document.getElementById('saisieJoueursCard');
    if (saisieCard) saisieCard.style.display = window.AppCore.isAdmin() ? '' : 'none';

    // Vue sélectionneur : masquer carte import/export
    const importExportCard = document.getElementById('importExportCard');
    if (importExportCard) importExportCard.style.display = window.AppCore.isAdmin() ? '' : 'none';

    // Bouton logout : visible admin uniquement
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.style.display = window.AppCore.isAdmin() ? '' : 'none';
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
    if (tabName === 'algorithme') {
        window.AppUI.afficherAlgorithme();
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
        const isAdminUser = window.AppCore.isAdmin();

        // Niveau : visible uniquement admin
        let niveauFieldHtml = '';
        if (isAdminUser) {
            niveauFieldHtml = `<div class="player-field">
                    <div class="niveau-wrapper">
                        <span class="niveau-label">Niv.</span>
                        <input type="number" value="${niveauSafe}" min="1" max="10" step="0.1"
                               onchange="window.AppPlayers.modifierJoueur(${originalIndex}, 'niveau', this.value)"
                               placeholder="1-10" title="Niveau de 1 a 10">
                    </div>
               </div>`;
        }

        // Nom : editable input (admin) ou span (selecteur)
        const nomHtml = isAdminUser
            ? `<div class="player-field">
                    <input type="text" value="${nomSafe}" class="player-name-input"
                           onchange="window.AppPlayers.modifierJoueur(${originalIndex}, 'nom', this.value)"
                           placeholder="Nom du joueur">
               </div>`
            : `<div class="player-field">
                    <span class="player-name-input" style="display:inline-block;padding:4px 0;">${nomSafe}</span>
               </div>`;

        // Poste : select pour tous (admin et selecteur)
        const posteHtml = `<div class="player-field">
<select onchange="window.AppPlayers.modifierJoueur(${originalIndex}, 'poste', this.value)" title="Position du joueur">
    <option value="indifferent" ${j.poste === 'indifferent' ? 'selected' : ''}>Indifferent</option>
    <option value="avant" ${j.poste === 'avant' ? 'selected' : ''}>Avant</option>
    <option value="arriere" ${j.poste === 'arriere' ? 'selected' : ''}>Arriere</option>
    <option value="ailier" ${j.poste === 'ailier' ? 'selected' : ''}>Ailier</option>
    <option value="centre" ${j.poste === 'centre' ? 'selected' : ''}>Centre</option>
    <option value="pivot" ${j.poste === 'pivot' ? 'selected' : ''}>Pivot</option>
    <option value="arr_centre" ${j.poste === 'arr_centre' ? 'selected' : ''}>Arr. Centre</option>
</select>
               </div>`;

        // Groupe : input pour tous (admin et selecteur)
        const groupeHtml = `<div class="player-field">
                    <input type="number" value="${groupeSafe}" min="1"
                           onchange="window.AppPlayers.modifierJoueur(${originalIndex}, 'groupe', this.value)"
                           placeholder="Groupe" title="Numero de groupe (optionnel)">
               </div>`;

        // Bouton supprimer : admin uniquement
        const deleteHtml = isAdminUser
            ? `<button onclick="window.AppPlayers.supprimerJoueur(${originalIndex})" class="btn btn-danger">
                <span class="material-icons">delete</span>
               </button>`
            : '';

        playerCard.innerHTML = `
            <div class="checkbox-wrapper">
                <input type="checkbox" ${j.actif ? 'checked' : ''} onchange="window.AppPlayers.modifierJoueur(${originalIndex}, 'actif', this.checked)">
            </div>
            <div class="player-info">
                ${nomHtml}
                ${niveauFieldHtml}
                ${posteHtml}
                ${groupeHtml}
            </div>
            ${deleteHtml}
        `;

        liste.appendChild(playerCard);
    });
}

// === ONGLET "COMMENT ÇA MARCHE" ===
function afficherAlgorithme() {
    const container = document.getElementById('algorithmeContainer');
    if (!container) return;

    const isFr = _langAlgo === 'fr';

    const contenus = {
        fr: {
            titre: 'Comment les équipes sont-elles construites ?',
            s1titre: '1. Choix de la méthode',
            s1score: `<strong>Score compétitif (recommandé)</strong><br>
                Chaque équipe reçoit un score qui tient compte de la force collective et des meilleurs joueurs :
                <div class="algo-formula">Score = Σ top 6 × 0,30 + 1er joueur × 0,33 + 2e × 0,20 + 3e × 0,11 + 4e × 0,06</div>
                Une "star" compte davantage qu'un joueur moyen — ce qui reflète mieux la réalité d'un match.
                Les équipes sont constituées en minimisant l'écart entre ces scores.`,
            s1total: `<strong>Niveau total</strong><br>
                L'algorithme équilibre uniquement la somme des niveaux. Plus simple, mais une équipe
                avec un très bon joueur et plusieurs faibles sera traitée comme identique à une
                équipe homogène de même somme.`,
            s2titre: '2. Distribution des joueurs (greedy)',
            s2texte: `Les joueurs sont triés du plus fort au plus faible. Un par un, chaque joueur est affecté
                à l'équipe la plus "faible" à cet instant (selon la méthode choisie).
                Les joueurs d'un même <strong>groupe</strong> sont toujours placés ensemble dans la même équipe.`,
            s3titre: '3. Optimisation (méthode Score compétitif uniquement)',
            s3texte: `Après la distribution initiale, l'algorithme effectue jusqu'à 400 échanges aléatoires
                de joueurs entre équipes. Il accepte un échange s'il réduit le déséquilibre global,
                et peut temporairement accepter un léger déséquilibre pour explorer d'autres configurations.
                Ce processus s'exécute en moins de 3 millisecondes.`,
            s4titre: '4. "Autre proposition"',
            s4texte: `Ce bouton propose une composition différente en échangeant 1 à 3 paires de joueurs
                (sans groupe) entre équipes. Seuls les échanges qui ne dégradent pas l'équilibre
                global de plus de 10 % sont retenus. Chaque composition est mémorisée pour ne jamais
                répéter la même.`,
            s5titre: '5. Évolution des niveaux (Elo)',
            s5texte: `Après chaque soirée validée, les niveaux sont ajustés selon les résultats.
                Une victoire contre une équipe plus forte rapporte davantage qu'une victoire facile.
                Les ajustements restent discrets (facteur K = 0,3) pour ne pas perturber l'équilibre
                sur une soirée atypique. L'administrateur confirme les ajustements depuis l'onglet Historique.`
        },
        en: {
            titre: 'How are teams built?',
            s1titre: '1. Method selection',
            s1score: `<strong>Competitive score (recommended)</strong><br>
                Each team receives a score that accounts for both collective strength and top players:
                <div class="algo-formula">Score = Σ top 6 × 0.30 + 1st player × 0.33 + 2nd × 0.20 + 3rd × 0.11 + 4th × 0.06</div>
                A "star player" carries more weight than an average player — better reflecting match reality.
                Teams are built by minimising the gap between these scores.`,
            s1total: `<strong>Total level</strong><br>
                The algorithm only balances the sum of levels. Simpler, but a team with one very strong
                player and several weak ones is treated identically to a homogeneous team with the same sum.`,
            s2titre: '2. Player distribution (greedy)',
            s2texte: `Players are sorted from strongest to weakest. One by one, each player is assigned
                to the "weakest" team at that moment (according to the chosen method).
                Players in the same <strong>group</strong> are always placed together in the same team.`,
            s3titre: '3. Optimisation (Competitive score method only)',
            s3texte: `After the initial distribution, the algorithm performs up to 400 random player swaps
                between teams. It accepts a swap if it reduces the overall imbalance, and may temporarily
                accept a slight degradation to explore other configurations.
                This runs in under 3 milliseconds.`,
            s4titre: '4. "Another suggestion"',
            s4texte: `This button proposes a different composition by swapping 1 to 3 pairs of players
                (without groups) between teams. Only swaps that do not degrade the overall balance
                by more than 10% are kept. Each composition is memorised so the same one is never repeated.`,
            s5titre: '5. Level evolution (Elo)',
            s5texte: `After each validated session, levels are automatically adjusted based on results.
                Winning against a stronger team earns more than an easy win.
                Adjustments remain subtle (K factor = 0.3) to avoid disrupting balance over a single
                atypical session. The administrator confirms adjustments from the History tab.`
        }
    };

    const c = contenus[_langAlgo];

    container.innerHTML = `
        <div class="card">
            <h2 class="card-title">
                <span class="material-icons">help_outline</span>
                ${c.titre}
                <div style="margin-left:auto; display:flex; align-items:center; gap:8px;
                            font-size:13px; font-weight:400;">
                    <span style="color:${isFr ? '#1976d2' : '#999'};
                                 font-weight:${isFr ? '700' : '400'};">FR</span>
                    <label class="lang-switch">
                        <input type="checkbox" ${isFr ? '' : 'checked'}
                               onchange="window.AppUI.toggleLangAlgo()">
                        <span class="lang-switch__slider"></span>
                    </label>
                    <span style="color:${isFr ? '#999' : '#1976d2'};
                                 font-weight:${isFr ? '400' : '700'};">EN</span>
                </div>
            </h2>

            <div class="algo-section">
                <h3>${c.s1titre}</h3>
                <div class="algo-block">${c.s1score}</div>
                <div class="algo-block algo-block--alt">${c.s1total}</div>
            </div>
            <div class="algo-section">
                <h3>${c.s2titre}</h3>
                <div class="algo-block">${c.s2texte}</div>
            </div>
            <div class="algo-section">
                <h3>${c.s3titre}</h3>
                <div class="algo-block">${c.s3texte}</div>
            </div>
            <div class="algo-section">
                <h3>${c.s4titre}</h3>
                <div class="algo-block">${c.s4texte}</div>
            </div>
            <div class="algo-section">
                <h3>${c.s5titre}</h3>
                <div class="algo-block">${c.s5texte}</div>
            </div>
        </div>
    `;
}

function toggleLangAlgo() {
    _langAlgo = _langAlgo === 'fr' ? 'en' : 'fr';
    afficherAlgorithme();
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

    // Custom dropdown - méthode de constitution
    const dropdownBtn = document.getElementById('methodeDropdownBtn');
    const dropdownList = document.getElementById('methodeDropdownList');
    const dropdownLabel = document.getElementById('methodeDropdownLabel');

    if (dropdownBtn && dropdownList) {
        dropdownBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const isOpen = dropdownList.style.display !== 'none';
            dropdownList.style.display = isOpen ? 'none' : 'block';
        });

        dropdownList.querySelectorAll('.custom-dropdown-item').forEach(function(item) {
            item.addEventListener('click', function(e) {
                e.stopPropagation();
                const value = this.dataset.value;
                window.AppCore.methodeConstitution = value;
                if (dropdownLabel) dropdownLabel.textContent = this.textContent;
                dropdownList.querySelectorAll('.custom-dropdown-item').forEach(function(el) {
                    el.classList.toggle('custom-dropdown-item-active', el.dataset.value === value);
                });
                dropdownList.style.display = 'none';
            });
        });

        // Fermer le dropdown en cliquant ailleurs
        document.addEventListener('click', function() {
            dropdownList.style.display = 'none';
        });
    }

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

    const fichierTout = document.getElementById('fichierTout');
    if (fichierTout) {
        fichierTout.addEventListener('change', function() {
            if (window.AppSessions && window.AppSessions.importerTout) {
                window.AppSessions.importerTout();
            }
        });
    }

    appliquerPermissionsUI();

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem(window.AppCore.ADMIN_AUTH_KEY);
            location.reload();
        });
    }

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
    switchTab,
    afficherAlgorithme,
    toggleLangAlgo
};

window.afficherJoueurs = afficherJoueurs;
window.attachEventListeners = attachEventListeners;
