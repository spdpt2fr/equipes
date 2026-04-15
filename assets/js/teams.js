// ===================================================================
// TEAMS.JS - Gestion des Equipes
// Module de creationn et affichage des equipes
// ===================================================================

// === SIGNATURE UNIQUE D'UNE CONFIGURATION D'EQUIPES ===
function _signatureEquipes(equipes) {
    return equipes
        .map(e => e.joueurs.map(j => j.id).sort((a, b) => a - b).join(','))
        .sort()
        .join('|');
}

// === SCORE COMPÉTITIF D'UNE ÉQUIPE (partagé) ===
function scoreEquipe(equipe) {
    const joueursOrdonnes = [...equipe.joueurs].sort((a, b) => (b.niveau || 0) - (a.niveau || 0));
    if (joueursOrdonnes.length > 6) {
        const joueursPrisEnCompte = joueursOrdonnes.slice(0, 6);
        const joueursIgnores = joueursOrdonnes.slice(6);
        const meilleur = joueursPrisEnCompte[0] ? joueursPrisEnCompte[0].niveau || 0 : 0;
        const second   = joueursPrisEnCompte[1] ? joueursPrisEnCompte[1].niveau || 0 : 0;
        const total    = joueursPrisEnCompte.reduce((acc, j) => acc + (j.niveau || 0), 0);
        return { score: total * 0.6 + meilleur * 0.25 + second * 0.15, meilleur, second, joueursIgnores };
    }
    const meilleur = joueursOrdonnes[0] ? joueursOrdonnes[0].niveau || 0 : 0;
    const second   = joueursOrdonnes[1] ? joueursOrdonnes[1].niveau || 0 : 0;
    const total    = equipe.niveauTotal || 0;
    return { score: total * 0.6 + meilleur * 0.25 + second * 0.15, meilleur, second, joueursIgnores: [] };
}

// === UTILITAIRES OPTIMISATION ===

// Écart-type des scores compétitifs — mesure le déséquilibre global entre équipes.
function _ecartTypeScores(equipes) {
    const scores = equipes.map(e => scoreEquipe(e).score);
    const moy = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.sqrt(scores.reduce((acc, s) => acc + (s - moy) ** 2, 0) / scores.length);
}

// Post-greedy : optimisation par recuit simulé (Simulated Annealing).
function _optimiserEquipes(equipes) {
    let config = JSON.parse(JSON.stringify(equipes));
    let ecart  = _ecartTypeScores(config);
    let T = 1.0;

    for (let iter = 0; iter < 400; iter++) {
        const nbEq = config.length;
        const i = Math.floor(Math.random() * nbEq);
        let j = Math.floor(Math.random() * (nbEq - 1));
        if (j >= i) j++;

        if (!config[i].joueurs.length || !config[j].joueurs.length) continue;

        const idxA = Math.floor(Math.random() * config[i].joueurs.length);
        const idxB = Math.floor(Math.random() * config[j].joueurs.length);

        if (config[i].joueurs[idxA].groupe || config[j].joueurs[idxB].groupe) continue;

        const candidat = JSON.parse(JSON.stringify(config));
        const tmp = candidat[i].joueurs[idxA];
        candidat[i].joueurs[idxA] = candidat[j].joueurs[idxB];
        candidat[j].joueurs[idxB] = tmp;

        const origA = window.AppCore.joueurs.find(x => x.id === candidat[i].joueurs[idxA].id);
        const origB = window.AppCore.joueurs.find(x => x.id === candidat[j].joueurs[idxB].id);

        if (origA && origA.poste === 'indifferent') {
            const nbAv = candidat[i].joueurs.filter((x, k) => k !== idxA && x.poste === 'avant').length;
            const nbAr = candidat[i].joueurs.filter((x, k) => k !== idxA && x.poste === 'arriere').length;
            candidat[i].joueurs[idxA].poste = nbAv <= nbAr ? 'avant' : 'arriere';
        }
        if (origB && origB.poste === 'indifferent') {
            const nbAv = candidat[j].joueurs.filter((x, k) => k !== idxB && x.poste === 'avant').length;
            const nbAr = candidat[j].joueurs.filter((x, k) => k !== idxB && x.poste === 'arriere').length;
            candidat[j].joueurs[idxB].poste = nbAv <= nbAr ? 'avant' : 'arriere';
        }

        [i, j].forEach(idx => {
            candidat[idx].niveauTotal = candidat[idx].joueurs
                .reduce((acc, p) => acc + (p.niveau || 0), 0);
            candidat[idx].meilleurNiveau = candidat[idx].joueurs
                .reduce((max, p) => Math.max(max, p.niveau || 0), 0);
        });

        const ecartCandidat = _ecartTypeScores(candidat);
        const delta = ecartCandidat - ecart;

        if (delta < 0 || Math.random() < Math.exp(-delta / T)) {
            config = candidat;
            ecart  = ecartCandidat;
        }
        T *= 0.985;
    }
    return config;
}

// === CREATION DES EQUIPES ===
function creerEquipes() {
    const nbEquipes = parseInt(document.getElementById('nombreEquipes').value, 10);
    if (isNaN(nbEquipes) || nbEquipes <= 0) {
        window.AppCore.showToast('Nombre d\'equipes invalide', true);
        return;
    }

    window.AppCore.sessionValidee = null;
    const resultatsContainer = document.getElementById('resultatsContainer');
    if (resultatsContainer) resultatsContainer.innerHTML = '';

    const joueursActifs = window.AppCore.joueurs.filter(j => j.actif);
    if (joueursActifs.length === 0) {
        window.AppCore.showToast('Aucun joueur actif disponible', true);
        return;
    }

    window.AppCore.equipes = Array.from({ length: nbEquipes }, () => ({
        joueurs: [],
        niveauTotal: 0,
        meilleurNiveau: 0,
        avant: 0,
        arriere: 0,
        ailier: 0,
        centre: 0,
        pivot: 0,
        arr_centre: 0,
        indifferent: 0
    }));

    const groupes = {};
    const sansGroupe = [];

    joueursActifs.forEach(j => {
        if (j.groupe) {
            if (!groupes[j.groupe]) groupes[j.groupe] = [];
            groupes[j.groupe].push(j);
        } else {
            sansGroupe.push(j);
        }
    });

    Object.values(groupes).forEach(groupe => {
        groupe.sort((a, b) => (b.niveau || 0) - (a.niveau || 0));
        if ((window.AppCore.methodeConstitution || 'scoreCompetitif') === 'scoreCompetitif') {
            const cache = new Map(window.AppCore.equipes.map(e => [e, scoreEquipe(e).score]));
            window.AppCore.equipes.sort((a, b) => cache.get(a) - cache.get(b));
        } else {
            window.AppCore.equipes.sort((a, b) => a.niveauTotal - b.niveauTotal);
        }

        groupe.forEach(j => {
            let poste = j.poste;
            if (poste === 'indifferent') {
                poste = window.AppCore.equipes[0].avant <= window.AppCore.equipes[0].arriere ? 'avant' : 'arriere';
            }
            window.AppCore.equipes[0].joueurs.push({ ...j, poste });
            window.AppCore.equipes[0].niveauTotal += (j.niveau || 0);
            window.AppCore.equipes[0].meilleurNiveau = Math.max(window.AppCore.equipes[0].meilleurNiveau, j.niveau || 0);
            window.AppCore.equipes[0][poste]++;
        });
    });

    sansGroupe.sort((a, b) => (b.niveau || 0) - (a.niveau || 0));
    sansGroupe.forEach(joueur => {
        if ((window.AppCore.methodeConstitution || 'scoreCompetitif') === 'scoreCompetitif') {
            const cache = new Map(window.AppCore.equipes.map(e => [e, scoreEquipe(e).score]));
            window.AppCore.equipes.sort((a, b) => cache.get(a) - cache.get(b));
        } else {
            window.AppCore.equipes.sort((a, b) => a.niveauTotal - b.niveauTotal);
        }
        let poste = joueur.poste;
        if (poste === 'indifferent') {
            poste = window.AppCore.equipes[0].avant <= window.AppCore.equipes[0].arriere ? 'avant' : 'arriere';
        }

        window.AppCore.equipes[0].joueurs.push({ ...joueur, poste });
        window.AppCore.equipes[0].niveauTotal += (joueur.niveau || 0);
        window.AppCore.equipes[0].meilleurNiveau = Math.max(window.AppCore.equipes[0].meilleurNiveau, joueur.niveau || 0);
        window.AppCore.equipes[0][poste]++;
    });

    // Passe d'optimisation SA — uniquement en mode score compétitif
    if ((window.AppCore.methodeConstitution || 'scoreCompetitif') === 'scoreCompetitif') {
        window.AppCore.equipes = _optimiserEquipes(window.AppCore.equipes);
    }

    window.AppCore.propositionOriginale = JSON.parse(JSON.stringify(window.AppCore.equipes));
    window.AppCore.historiquePropositions = [_signatureEquipes(window.AppCore.equipes)];

    afficherEquipes();
    window.AppCore.showToast('Equipes creees avec succes');
}

// === AFFICHAGE DES EQUIPES ===
function afficherEquipes() {
    const container = document.getElementById('equipesContainer');
    if (!container) return;

    if (window.AppCore.equipes.length === 0) {
        container.innerHTML = '';
        return;
    }

    const canViewNiveaux = window.AppCore.canViewNiveaux ? window.AppCore.canViewNiveaux() : true;

    const scoresObj = window.AppCore.equipes.map(e => scoreEquipe(e));
    const scores = scoresObj.map(e => e.score);

    let html = `
        <div class="card">
            <h2 class="card-title">
                <span class="material-icons">groups</span>
                Equipes constituees
    `;

    if (canViewNiveaux) {
        html += `
                <button onclick="window.AppUI.toggleTotalNiveaux()" class="btn btn-secondary" style="margin-left: auto;">
                    ${window.AppCore.afficherTotal ? 'Cacher' : 'Afficher'} totaux
                </button>
                <button onclick="window.AppUI.toggleTriEquipes()" class="btn btn-secondary" style="margin-left: 8px;">
                    Trier : ${window.AppCore.triEquipes === 'niveau' ? 'par niveau' : 'alphabetique'}
                </button>
        `;
    }

    html += `
            </h2>
            <div class="teams-grid">
    `;

    window.AppCore.equipes.forEach((e, idx) => {
        const teamColors = ['#1976d2', '#388e3c', '#f57c00', '#d32f2f'];
        const color = teamColors[idx % teamColors.length];

        html += `
            <div class="team-card">
                <div class="team-title" style="color: ${color}">
                    <span class="material-icons">group</span>
                    Equipe ${idx + 1}
                </div>
                <ul class="team-players">
        `;

        let joueursAffiches = [...e.joueurs];
        if (canViewNiveaux && window.AppCore.triEquipes === 'niveau') {
            joueursAffiches.sort((a, b) => (b.niveau || 0) - (a.niveau || 0));
        } else {
            joueursAffiches.sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));
        }

        joueursAffiches.forEach(j => {
            html += `
                <li class="team-player" onclick="window.AppTeams.changerEquipe(${idx}, ${e.joueurs.indexOf(j)})">
                    <span class="material-icons">person</span>
                    ${window.AppCore.escapeHtml(j.nom)} - ${window.AppCore.escapeHtml(j.poste)}${(canViewNiveaux && window.AppCore.afficherTotal) ? ' (' + j.niveau + ')' : ''}
                </li>
            `;
        });

        html += '</ul>';

        if (canViewNiveaux && window.AppCore.afficherTotal) {
            html += `<div class="team-total">
                Niveau total : ${(+e.niveauTotal).toFixed(1)} (moy. ${e.joueurs.length > 0 ? (e.niveauTotal / e.joueurs.length).toFixed(1) : '0'})
                &nbsp;|&nbsp; Score compétitif : ${scoresObj[idx].score.toFixed(2)}
                <br><span style="font-size:12px; color:#666;">
                (Top6×0.6 : ${(e.joueurs.length > 6
                    ? [...e.joueurs].sort((a, b) => (b.niveau || 0) - (a.niveau || 0)).slice(0, 6).reduce((acc, j) => acc + (j.niveau || 0), 0)
                    : e.niveauTotal
                ).toFixed(1)}
                , 1er×0.25 : ${(scoresObj[idx].meilleur * 0.25).toFixed(2)}
                , 2e×0.15 : ${(scoresObj[idx].second * 0.15).toFixed(2)})
                </span>`;

            if (scoresObj[idx].joueursIgnores.length > 0) {
                html += `<br><span style="color:#d32f2f; font-size:12px;">(Joueur(s) hors top 6 : ${scoresObj[idx].joueursIgnores.map(j => window.AppCore.escapeHtml(j.nom)).join(', ')})</span>`;
            }
            html += `</div>`;
        }

        html += '</div>';
    });

    html += '</div>';

    if (canViewNiveaux) {
        html += `
            <div class="vs-stats">
                <h3><span class="material-icons">bar_chart</span> Rapport de force entre equipes</h3>
        `;

        window.AppCore.equipes.forEach((e1, i) => {
            window.AppCore.equipes.forEach((e2, j) => {
                if (i < j) {
                    const ratio = Number((scores[i] / scores[j]).toFixed(2));
                    const part1 = (ratio * 100 / (1 + Number(ratio))).toFixed(1);
                    const part2 = (100 / (1 + Number(ratio))).toFixed(1);
                    html += `<div class="vs-row">Equipe ${i + 1} vs Equipe ${j + 1} : ${part1}% / ${part2}%</div>`;
                }
            });
        });

        html += '</div>';
    }

    if (!window.AppCore.sessionValidee) {
        html += `
            <div class="equipes-actions">
                <button onclick="window.AppSessions.validerSession()" class="btn btn-primary" style="font-size: 16px; padding: 14px 32px;">
                    <span class="material-icons">check_circle</span>
                    Valider cette soiree
                </button>`;
        if (window.AppCore.propositionOriginale) {
            html += `
                <button onclick="window.AppTeams.autreProposition()" class="btn btn-secondary" style="font-size: 16px; padding: 14px 32px;">
                    <span class="material-icons">shuffle</span>
                    Autre proposition
                </button>`;
        }
        html += `
            </div>
        `;
    } else {
        html += `
            <div style="text-align: center; margin-top: 20px;">
                <span class="badge badge-success" style="font-size: 16px; padding: 10px 20px;">Soiree validee</span>
            </div>
        `;
    }

    html += '</div>';
    container.innerHTML = html;
}

// === CHANGER EQUIPE ===
function changerEquipe(equipeIdx, joueurIdx) {
    const nouvelleEquipe = prompt('Numero de la nouvelle equipe pour ce joueur (commence a 1) :');
    const numEquipe = parseInt(nouvelleEquipe, 10) - 1;

    if (numEquipe >= 0 && numEquipe < window.AppCore.equipes.length && numEquipe !== equipeIdx) {
        const joueur = window.AppCore.equipes[equipeIdx].joueurs.splice(joueurIdx, 1)[0];
        window.AppCore.equipes[numEquipe].joueurs.push(joueur);

        window.AppCore.equipes.forEach(e => {
            e.niveauTotal = e.joueurs.reduce((acc, j) => acc + (j.niveau || 0), 0);
        });

        window.AppCore.propositionOriginale = null;
        window.AppCore.historiquePropositions = [];

        if (window.AppCore.sessionValidee) {
            window.AppCore.sessionValidee = null;
            window.AppCore.showToast('Session invalidee (composition modifiee)');
            const resultatsContainer = document.getElementById('resultatsContainer');
            if (resultatsContainer) resultatsContainer.innerHTML = '';
        }

        afficherEquipes();
        window.AppCore.showToast('Joueur deplace avec succes');
    }
}

// === AUTRE PROPOSITION ===
function autreProposition() {
    if (!window.AppCore.propositionOriginale || window.AppCore.propositionOriginale.length < 2) {
        window.AppCore.showToast('Aucune alternative disponible', true);
        return;
    }

    // Ecart-type de reference pour validation globale
    const ecartOriginal = _ecartTypeScores(window.AppCore.propositionOriginale);

    for (let tentative = 0; tentative < 30; tentative++) {
        const candidat = JSON.parse(JSON.stringify(window.AppCore.propositionOriginale));

        // Construire la liste de swaps candidats
        const swaps = [];
        for (let i = 0; i < candidat.length; i++) {
            for (let j = i + 1; j < candidat.length; j++) {
                for (let idxA = 0; idxA < candidat[i].joueurs.length; idxA++) {
                    for (let idxB = 0; idxB < candidat[j].joueurs.length; idxB++) {
                        const a = candidat[i].joueurs[idxA];
                        const b = candidat[j].joueurs[idxB];

                        // Exclure joueurs avec groupe
                        if (a.groupe || b.groupe) continue;

                        // Verifier ecart de niveau <= 1
                        if (Math.abs((a.niveau || 0) - (b.niveau || 0)) > 1) continue;

                        swaps.push({ i, j, idxA, idxB });
                    }
                }
            }
        }

        if (swaps.length === 0) {
            window.AppCore.showToast('Aucune alternative disponible', true);
            return;
        }

        // Melanger les candidats aleatoirement
        for (let k = swaps.length - 1; k > 0; k--) {
            const r = Math.floor(Math.random() * (k + 1));
            [swaps[k], swaps[r]] = [swaps[r], swaps[k]];
        }

        // Selectionner 1 a 3 swaps non conflictuels
        const nbSwaps = Math.min(1 + Math.floor(Math.random() * 3), swaps.length);
        const choisis = [];
        const joueursDeja = new Set();

        for (const swap of swaps) {
            if (choisis.length >= nbSwaps) break;

            const idA = candidat[swap.i].joueurs[swap.idxA].id;
            const idB = candidat[swap.j].joueurs[swap.idxB].id;

            if (joueursDeja.has(idA) || joueursDeja.has(idB)) continue;

            choisis.push(swap);
            joueursDeja.add(idA);
            joueursDeja.add(idB);
        }

        if (choisis.length === 0) continue;

        // Appliquer les swaps
        for (const swap of choisis) {
            const joueurA = candidat[swap.i].joueurs[swap.idxA];
            const joueurB = candidat[swap.j].joueurs[swap.idxB];

            // Resoudre le poste 'indifferent' pour l'equipe cible
            // On regarde le poste original du joueur dans AppCore.joueurs (avant resolution)
            const origA = window.AppCore.joueurs.find(x => x.id === joueurA.id);
            const origPosteA = origA ? origA.poste : joueurA.poste;
            const origB = window.AppCore.joueurs.find(x => x.id === joueurB.id);
            const origPosteB = origB ? origB.poste : joueurB.poste;

            candidat[swap.i].joueurs[swap.idxA] = { ...joueurB };
            candidat[swap.j].joueurs[swap.idxB] = { ...joueurA };

            // Resoudre indifferent dans les equipes cibles
            if (origPosteB === 'indifferent') {
                const nbAvant = candidat[swap.i].joueurs.filter((x, idx) => idx !== swap.idxA && x.poste === 'avant').length;
                const nbArriere = candidat[swap.i].joueurs.filter((x, idx) => idx !== swap.idxA && x.poste === 'arriere').length;
                candidat[swap.i].joueurs[swap.idxA].poste = nbAvant <= nbArriere ? 'avant' : 'arriere';
            }
            if (origPosteA === 'indifferent') {
                const nbAvant = candidat[swap.j].joueurs.filter((x, idx) => idx !== swap.idxB && x.poste === 'avant').length;
                const nbArriere = candidat[swap.j].joueurs.filter((x, idx) => idx !== swap.idxB && x.poste === 'arriere').length;
                candidat[swap.j].joueurs[swap.idxB].poste = nbAvant <= nbArriere ? 'avant' : 'arriere';
            }
        }

        // Validation globale : le déséquilibre post-swaps ne doit pas dépasser 110% de l'original
        if (_ecartTypeScores(candidat) > Math.max(ecartOriginal * 1.1, 0.1)) continue;

        // Verifier unicite
        const sig = _signatureEquipes(candidat);
        if (window.AppCore.historiquePropositions.indexOf(sig) !== -1) continue;

        // Configuration unique trouvee — recalculer les stats par equipe
        const postes = ['avant', 'arriere', 'ailier', 'centre', 'pivot', 'arr_centre', 'indifferent'];
        candidat.forEach(e => {
            e.niveauTotal = e.joueurs.reduce((acc, j) => acc + (j.niveau || 0), 0);
            e.meilleurNiveau = e.joueurs.reduce((max, j) => Math.max(max, j.niveau || 0), 0);
            postes.forEach(p => { e[p] = 0; });
            e.joueurs.forEach(j => {
                if (e[j.poste] !== undefined) e[j.poste]++;
            });
        });

        window.AppCore.equipes = candidat;
        window.AppCore.historiquePropositions.push(sig);
        window.AppCore.sessionValidee = null;
        const resultatsContainer = document.getElementById('resultatsContainer');
        if (resultatsContainer) resultatsContainer.innerHTML = '';
        afficherEquipes();
        window.AppCore.showToast('Nouvelle proposition generee');
        return;
    }

    window.AppCore.showToast('Toutes les variantes proches ont ete explorees', true);
}

// === EXPORT DES FONCTIONS ===
window.AppTeams = {
    creerEquipes,
    afficherEquipes,
    changerEquipe,
    autreProposition,
    scoreEquipe
};

window.afficherEquipes = afficherEquipes;
