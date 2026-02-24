// ===================================================================
// TEAMS.JS - Gestion des Équipes
// Module de création et affichage des équipes
// ===================================================================

// === CRÉATION DES ÉQUIPES ===
function creerEquipes() {
    const nbEquipes = parseInt(document.getElementById('nombreEquipes').value);
    if (isNaN(nbEquipes) || nbEquipes <= 0) {
        window.AppCore.showToast('Nombre d\'équipes invalide', true);
        return;
    }
    // Reset la validation de session précédente
    window.AppCore.sessionValidee = null;
    const resultatsContainer = document.getElementById('resultatsContainer');
    if (resultatsContainer) resultatsContainer.innerHTML = '';
    const joueursActifs = window.AppCore.joueurs.filter(j => j.actif);
    if (joueursActifs.length === 0) {
        window.AppCore.showToast('Aucun joueur actif disponible', true);
        return;
    }

    window.AppCore.equipes = Array.from({length: nbEquipes}, () => ({
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

    // Assigner les groupes ensemble
    Object.values(groupes).forEach(groupe => {
        groupe.sort((a,b) => b.niveau - a.niveau);
        window.AppCore.equipes.sort((a,b) => a.niveauTotal - b.niveauTotal);
        groupe.forEach(j => {
            let poste = j.poste;
            if (poste === 'indifferent') poste = window.AppCore.equipes[0].avant <= window.AppCore.equipes[0].arriere ? 'avant' : 'arriere';
            window.AppCore.equipes[0].joueurs.push({...j, poste});
            window.AppCore.equipes[0].niveauTotal += j.niveau;
            window.AppCore.equipes[0].meilleurNiveau = Math.max(window.AppCore.equipes[0].meilleurNiveau, j.niveau);
            window.AppCore.equipes[0][poste]++;
        });
    });

    // Ajouter les joueurs seuls
    sansGroupe.sort((a,b) => b.niveau - a.niveau);
    sansGroupe.forEach(joueur => {
        window.AppCore.equipes.sort((a,b) => a.niveauTotal - b.niveauTotal);
        let poste = joueur.poste;
        if (poste === 'indifferent') poste = window.AppCore.equipes[0].avant <= window.AppCore.equipes[0].arriere ? 'avant' : 'arriere';
        window.AppCore.equipes[0].joueurs.push({...joueur, poste});
        window.AppCore.equipes[0].niveauTotal += joueur.niveau;
        window.AppCore.equipes[0].meilleurNiveau = Math.max(window.AppCore.equipes[0].meilleurNiveau, joueur.niveau);
        window.AppCore.equipes[0][poste]++;
    });

    afficherEquipes();
    window.AppCore.showToast('Équipes créées avec succès');
}

// === AFFICHAGE DES ÉQUIPES ===
function afficherEquipes() {
    const container = document.getElementById('equipesContainer');
    if (window.AppCore.equipes.length === 0) {
        container.innerHTML = '';
        return;
    }

    // Calcul des scores "compétitifs" (6 meilleurs joueurs max) + 2ème meilleur joueur
    function scoreEquipe(equipe) {
        let joueursOrdonnes = [...equipe.joueurs].sort((a, b) => b.niveau - a.niveau);
        if (joueursOrdonnes.length > 6) {
            const joueursPrisEnCompte = joueursOrdonnes.slice(0, 6);
            const joueursIgnorés = joueursOrdonnes.slice(6);
            const meilleur = joueursPrisEnCompte[0]?.niveau || 0;
            const second = joueursPrisEnCompte[1]?.niveau || 0;
            const total = joueursPrisEnCompte.reduce((acc, j) => acc + j.niveau, 0);
            return {
                score: total * 0.6 + meilleur * 0.25 + second * 0.15,
                meilleur,
                second,
                joueursIgnorés
            };
        } else {
            const meilleur = joueursOrdonnes[0]?.niveau || 0;
            const second = joueursOrdonnes[1]?.niveau || 0;
            const total = equipe.niveauTotal;
            return {
                score: total * 0.6 + meilleur * 0.25 + second * 0.15,
                meilleur,
                second,
                joueursIgnorés: []
            };
        }
    }
    
    // Calcul des scores compétitifs pour chaque équipe
    const scoresObj = window.AppCore.equipes.map(e => scoreEquipe(e));
    const scores = scoresObj.map(e => e.score);

    let html = `
        <div class="card">
            <h2 class="card-title">
                <span class="material-icons">groups</span>
                Équipes Constituées
                <button onclick="window.AppUI.toggleTotalNiveaux()" class="btn btn-secondary" style="margin-left: auto;">
                    ${window.AppCore.afficherTotal ? 'Cacher' : 'Afficher'} totaux
                </button>
                <button onclick="window.AppUI.toggleTriEquipes()" class="btn btn-secondary" style="margin-left: 8px;">
                    Trier : ${window.AppCore.triEquipes === 'niveau' ? 'par niveau' : 'alphabétique'}
                </button>
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
                    Équipe ${idx + 1}
                </div>
                <ul class="team-players">
        `;

        // Tri dynamique des joueurs dans les équipes
        let joueursAffiches = [...e.joueurs];
        if (window.AppCore.triEquipes === 'niveau') {
            joueursAffiches.sort((a, b) => b.niveau - a.niveau);
        } else if (window.AppCore.triEquipes === 'alpha') {
            joueursAffiches.sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));
        }

        joueursAffiches.forEach((j, joueurIdx) => {
            html += `
                <li class="team-player" onclick="window.AppTeams.changerEquipe(${idx}, ${e.joueurs.indexOf(j)})">
                    <span class="material-icons">person</span>
                    ${j.nom} - ${j.poste}${window.AppCore.afficherTotal ? ' (' + j.niveau + ')' : ''}
                </li>
            `;
        });

        html += '</ul>';
        if (window.AppCore.afficherTotal) {
            html += `<div class="team-total">Score compétitif : ${scoresObj[idx].score.toFixed(2)}<br>
                <span style="font-size:12px;">
                (Somme × 0.6 : ${(e.joueurs.length > 6 
                    ? [...e.joueurs].sort((a,b) => b.niveau-a.niveau).slice(0,6).reduce((acc, j) => acc+j.niveau,0)
                    : e.niveauTotal
                ).toFixed(2)}
                , meilleur × 0.25 : ${(scoresObj[idx].meilleur*0.25).toFixed(2)}
                , 2e meilleur × 0.15 : ${(scoresObj[idx].second*0.15).toFixed(2)})
                </span>`;
            if (scoresObj[idx].joueursIgnorés.length > 0) {
                html += `<br><span style="color:#d32f2f; font-size:12px;">(Le(s) joueur(s) non pris en compte : ${scoresObj[idx].joueursIgnorés.map(j => j.nom).join(', ')})</span>`;
            }
            html += `</div>`;
        }
        html += '</div>';
    });

    html += '</div>';
    // Rapport de force (calcul sur base des scores compétitifs)
    html += `
        <div class="vs-stats">
            <h3><span class="material-icons">bar_chart</span> Rapport de force entre équipes</h3>
    `;

    window.AppCore.equipes.forEach((e1, i) => {
        window.AppCore.equipes.forEach((e2, j) => {
            if (i < j) {
                // Utiliser les scores compétitifs
                const ratio = (scores[i] / scores[j]).toFixed(2);
                const part1 = (ratio * 100 / (1 + Number(ratio))).toFixed(1);
                const part2 = (100 / (1 + Number(ratio))).toFixed(1);
                html += `<div class="vs-row">Équipe ${i + 1} vs Équipe ${j + 1} : ${part1}% / ${part2}%</div>`;
            }
        });
    });

    html += '</div>';

    // Bouton de validation de la soirée
    if (!window.AppCore.sessionValidee) {
        html += `
            <div style="text-align: center; margin-top: 20px;">
                <button onclick="window.AppSessions.validerSession()" class="btn btn-primary" style="font-size: 16px; padding: 14px 32px;">
                    <span class="material-icons">check_circle</span>
                    \u2705 Valider cette soir\u00e9e
                </button>
            </div>
        `;
    } else {
        html += `
            <div style="text-align: center; margin-top: 20px;">
                <span class="badge badge-success" style="font-size: 16px; padding: 10px 20px;">\u2705 Soir\u00e9e valid\u00e9e</span>
            </div>
        `;
    }

    html += '</div>'; // ferme .card
    container.innerHTML = html;
}

// === CHANGER ÉQUIPE ===
function changerEquipe(equipeIdx, joueurIdx) {
    const nouvelleEquipe = prompt('Numéro de la nouvelle équipe pour ce joueur (commence à 1) :');
    const numEquipe = parseInt(nouvelleEquipe) - 1;
    if (numEquipe >= 0 && numEquipe < window.AppCore.equipes.length && numEquipe !== equipeIdx) {
        const joueur = window.AppCore.equipes[equipeIdx].joueurs.splice(joueurIdx, 1)[0];
        window.AppCore.equipes[numEquipe].joueurs.push(joueur);

        // Recalculer les totaux
        window.AppCore.equipes.forEach(e => {
            e.niveauTotal = e.joueurs.reduce((acc, j) => acc + j.niveau, 0);
        });

        // Invalidation : composition modifiée, session plus cohérente
        if (window.AppCore.sessionValidee) {
            window.AppCore.sessionValidee = null;
            window.AppCore.showToast('⚠️ Session invalidée (composition modifiée)');
            const resultatsContainer = document.getElementById('resultatsContainer');
            if (resultatsContainer) resultatsContainer.innerHTML = '';
        }

        afficherEquipes();
        window.AppCore.showToast('Joueur déplacé avec succès');
    }
}

// === EXPORT DES FONCTIONS ===
window.AppTeams = {
    creerEquipes,
    afficherEquipes,
    changerEquipe
};

// Rendre afficherEquipes globale pour compatibilité
window.afficherEquipes = afficherEquipes;
