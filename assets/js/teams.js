// ===================================================================
// TEAMS.JS - Gestion des Equipes
// Module de creation et affichage des equipes
// ===================================================================

// === SIGNATURE UNIQUE D'UNE CONFIGURATION D'EQUIPES ===
function _signatureEquipes(equipes) {
    return equipes
        .map(e => e.joueurs.map(j => j.id).sort((a, b) => a - b).join(','))
        .sort()
        .join('|');
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
        window.AppCore.equipes.sort((a, b) => a.niveauTotal - b.niveauTotal);

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
        window.AppCore.equipes.sort((a, b) => a.niveauTotal - b.niveauTotal);
        let poste = joueur.poste;
        if (poste === 'indifferent') {
            poste = window.AppCore.equipes[0].avant <= window.AppCore.equipes[0].arriere ? 'avant' : 'arriere';
        }

        window.AppCore.equipes[0].joueurs.push({ ...joueur, poste });
        window.AppCore.equipes[0].niveauTotal += (joueur.niveau || 0);
        window.AppCore.equipes[0].meilleurNiveau = Math.max(window.AppCore.equipes[0].meilleurNiveau, joueur.niveau || 0);
        window.AppCore.equipes[0][poste]++;
    });

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

    function scoreEquipe(equipe) {
        const joueursOrdonnes = [...equipe.joueurs].sort((a, b) => (b.niveau || 0) - (a.niveau || 0));
        if (joueursOrdonnes.length > 6) {
            const joueursPrisEnCompte = joueursOrdonnes.slice(0, 6);
            const joueursIgnores = joueursOrdonnes.slice(6);
            const meilleur = joueursPrisEnCompte[0] ? joueursPrisEnCompte[0].niveau || 0 : 0;
            const second = joueursPrisEnCompte[1] ? joueursPrisEnCompte[1].niveau || 0 : 0;
            const total = joueursPrisEnCompte.reduce((acc, j) => acc + (j.niveau || 0), 0);
            return {
                score: total * 0.6 + meilleur * 0.25 + second * 0.15,
                meilleur,
                second,
                joueursIgnores
            };
        }

        const meilleur = joueursOrdonnes[0] ? joueursOrdonnes[0].niveau || 0 : 0;
        const second = joueursOrdonnes[1] ? joueursOrdonnes[1].niveau || 0 : 0;
        const total = equipe.niveauTotal || 0;

        return {
            score: total * 0.6 + meilleur * 0.25 + second * 0.15,
            meilleur,
            second,
            joueursIgnores: []
        };
    }

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
            html += `<div class="team-total">Score competitif : ${scoresObj[idx].score.toFixed(2)}<br>
                <span style="font-size:12px;">
                (Somme x 0.6 : ${(e.joueurs.length > 6
                    ? [...e.joueurs].sort((a, b) => (b.niveau || 0) - (a.niveau || 0)).slice(0, 6).reduce((acc, j) => acc + (j.niveau || 0), 0)
                    : e.niveauTotal
                ).toFixed(2)}
                , meilleur x 0.25 : ${(scoresObj[idx].meilleur * 0.25).toFixed(2)}
                , 2e meilleur x 0.15 : ${(scoresObj[idx].second * 0.15).toFixed(2)})
                </span>`;

            if (scoresObj[idx].joueursIgnores.length > 0) {
                html += `<br><span style="color:#d32f2f; font-size:12px;">(Joueur(s) non pris en compte : ${scoresObj[idx].joueursIgnores.map(j => window.AppCore.escapeHtml(j.nom)).join(', ')})</span>`;
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

    // Calcul des moyennes originales par equipe
    const moyennesOriginales = window.AppCore.propositionOriginale.map(e => {
        if (e.joueurs.length === 0) return 0;
        return e.joueurs.reduce((acc, j) => acc + (j.niveau || 0), 0) / e.joueurs.length;
    });

    for (let tentative = 0; tentative < 10; tentative++) {
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

                        // Simuler le swap et verifier variation de moyenne
                        const totalI = candidat[i].joueurs.reduce((acc, x) => acc + (x.niveau || 0), 0);
                        const totalJ = candidat[j].joueurs.reduce((acc, x) => acc + (x.niveau || 0), 0);
                        const nbI = candidat[i].joueurs.length;
                        const nbJ = candidat[j].joueurs.length;

                        const newTotalI = totalI - (a.niveau || 0) + (b.niveau || 0);
                        const newTotalJ = totalJ - (b.niveau || 0) + (a.niveau || 0);
                        const newMoyI = nbI > 0 ? newTotalI / nbI : 0;
                        const newMoyJ = nbJ > 0 ? newTotalJ / nbJ : 0;

                        if (Math.abs(newMoyI - moyennesOriginales[i]) > 0.2) continue;
                        if (Math.abs(newMoyJ - moyennesOriginales[j]) > 0.2) continue;

                        const deltaMoyenne = Math.abs(newMoyI - moyennesOriginales[i]) + Math.abs(newMoyJ - moyennesOriginales[j]);
                        swaps.push({ i, j, idxA, idxB, deltaMoyenne });
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

        // Validation cumulative : toutes les moyennes doivent rester dans ±0.2
        let moyennesOk = true;
        for (let e = 0; e < candidat.length; e++) {
            const moy = candidat[e].joueurs.length > 0
                ? candidat[e].joueurs.reduce((acc, j) => acc + (j.niveau || 0), 0) / candidat[e].joueurs.length
                : 0;
            if (Math.abs(moy - moyennesOriginales[e]) > 0.2) {
                moyennesOk = false;
                break;
            }
        }
        if (!moyennesOk) continue;

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
    autreProposition
};

window.afficherEquipes = afficherEquipes;
