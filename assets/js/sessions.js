// ===================================================================
// SESSIONS.JS - Historique des soirées et évolution des scores
// Module de gestion des sessions de jeu, résultats et ajustements
// ===================================================================

const DELTA_BASE = 0.15; // Ajustement de base par match

// === VALIDATION DE SESSION (sauvegarder les équipes comme soirée) ===
async function validerSession() {
    if (window.AppCore.equipes.length === 0) {
        window.AppCore.showToast('Aucune équipe à valider', true);
        return;
    }

    if (!window.AppCore.isOnline) {
        window.AppCore.showToast('Connexion requise pour valider une soirée', true);
        return;
    }

    if (window.AppCore.sessionValidee) {
        window.AppCore.showToast('Cette composition est déjà validée', true);
        return;
    }

    if (!confirm('Valider ces équipes comme soirée de jeu ?')) return;

    try {
        // 1. Créer la session
        const { data: session, error: errSession } = await window.AppCore.supabaseClient
            .from('sessions')
            .insert([{
                club_id: window.AppCore.clubActuel.id,
                date_session: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD en heure locale
                nb_equipes: window.AppCore.equipes.length
            }])
            .select()
            .single();

        if (errSession) throw errSession;

        const sessionTeamIds = [];

        // 2. Sauvegarder chaque équipe et ses joueurs
        for (let i = 0; i < window.AppCore.equipes.length; i++) {
            const equipe = window.AppCore.equipes[i];

            const { data: team, error: errTeam } = await window.AppCore.supabaseClient
                .from('session_teams')
                .insert([{
                    session_id: session.id,
                    numero_equipe: i + 1,
                    niveau_total: equipe.niveauTotal
                }])
                .select()
                .single();

            if (errTeam) throw errTeam;
            sessionTeamIds.push(team.id);

            // 3. Sauvegarder les joueurs de cette équipe
            const joueursBatch = equipe.joueurs.map(j => ({
                session_team_id: team.id,
                player_id: j.id || null,
                player_name: j.nom,
                niveau: j.niveau,
                poste: j.poste
            }));

            const { error: errPlayers } = await window.AppCore.supabaseClient
                .from('session_players')
                .insert(joueursBatch);

            if (errPlayers) throw errPlayers;
        }

        window.AppCore.sessionValidee = {
            id: session.id,
            teamIds: sessionTeamIds
        };

        window.AppCore.showToast('✅ Soirée validée et sauvegardée !');

        // Afficher l'interface de résultats
        afficherInterfaceResultats(session.id, sessionTeamIds);

        // Recharger l'historique
        await chargerHistorique();

    } catch (error) {
        console.error('Erreur validation session:', error);
        window.AppCore.showToast('Erreur: ' + error.message, true);
    }
}

// === INTERFACE DE SAISIE DES RÉSULTATS ===
function afficherInterfaceResultats(sessionId, teamIds) {
    const container = document.getElementById('resultatsContainer');
    if (!container) return;

    const nbEquipes = teamIds.length;
    const paires = [];

    for (let i = 0; i < nbEquipes; i++) {
        for (let j = i + 1; j < nbEquipes; j++) {
            paires.push({ i, j, teamId1: teamIds[i], teamId2: teamIds[j] });
        }
    }

    let html = `
        <div class="card">
            <h2 class="card-title">
                <span class="material-icons">scoreboard</span>
                Résultats de la soirée
            </h2>
            <div class="results-grid">
    `;

    paires.forEach((p, idx) => {
        html += `
            <div class="match-card">
                <div class="match-title">
                    <span class="material-icons">sports</span>
                    Match ${idx + 1} : Équipe ${p.i + 1} vs Équipe ${p.j + 1}
                </div>
                <div class="match-options">
                    <label class="match-option">
                        <input type="radio" name="match_${idx}" value="${p.teamId1}" 
                               data-eq1="${p.teamId1}" data-eq2="${p.teamId2}">
                        <span class="match-label win">🏆 Équipe ${p.i + 1}</span>
                    </label>
                    <label class="match-option">
                        <input type="radio" name="match_${idx}" value="${p.teamId2}" 
                               data-eq1="${p.teamId1}" data-eq2="${p.teamId2}">
                        <span class="match-label win">🏆 Équipe ${p.j + 1}</span>
                    </label>
                    <label class="match-option">
                        <input type="radio" name="match_${idx}" value="skip" checked 
                               data-eq1="${p.teamId1}" data-eq2="${p.teamId2}">
                        <span class="match-label skip">⏭️ Non joué</span>
                    </label>
                </div>
            </div>
        `;
    });

    html += `
            </div>
            <div style="text-align: center; margin-top: 20px;">
                <button onclick="window.AppSessions.sauvegarderResultats(${sessionId})" class="btn btn-primary">
                    <span class="material-icons">save</span>
                    Sauvegarder les résultats
                </button>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// === SAUVEGARDER LES RÉSULTATS ===
async function sauvegarderResultats(sessionId) {
    try {
        const container = document.getElementById('resultatsContainer');
        // Ne cibler que les radios de la grille de matchs (pas les ajustements)
        const radios = container.querySelectorAll('.results-grid input[type="radio"]:checked');
        const resultats = [];

        radios.forEach(radio => {
            if (radio.value === 'skip') return;
            resultats.push({
                session_id: sessionId,
                equipe1_id: parseInt(radio.dataset.eq1),
                equipe2_id: parseInt(radio.dataset.eq2),
                gagnant_id: parseInt(radio.value)
            });
        });

        if (resultats.length === 0) {
            window.AppCore.showToast('Aucun résultat à sauvegarder (tout est "Non joué")', true);
            return;
        }

        // Supprimer d'éventuels anciens résultats pour cette session
        await window.AppCore.supabaseClient
            .from('match_results')
            .delete()
            .eq('session_id', sessionId);

        // Insérer les nouveaux résultats
        const { error } = await window.AppCore.supabaseClient
            .from('match_results')
            .insert(resultats);

        if (error) throw error;

        // Marquer la session comme ayant des résultats
        await window.AppCore.supabaseClient
            .from('sessions')
            .update({ resultats_saisis: true })
            .eq('id', sessionId);

        window.AppCore.showToast('✅ Résultats sauvegardés !');

        // Calculer et proposer les ajustements
        const ajustements = await calculerAjustements(sessionId);
        afficherAjustements(sessionId, ajustements);

        // Rafraîchir l'historique
        await chargerHistorique();

    } catch (error) {
        console.error('Erreur sauvegarde résultats:', error);
        window.AppCore.showToast('Erreur: ' + error.message, true);
    }
}

// === CALCULER LES AJUSTEMENTS DE NIVEAU ===
async function calculerAjustements(sessionId) {
    try {
        // Charger les équipes avec leurs joueurs
        const { data: teams, error: errTeams } = await window.AppCore.supabaseClient
            .from('session_teams')
            .select('*, session_players(*)')
            .eq('session_id', sessionId);

        // Charger les résultats
        const { data: results, error: errResults } = await window.AppCore.supabaseClient
            .from('match_results')
            .select('*')
            .eq('session_id', sessionId);

        if (errTeams) throw errTeams;
        if (errResults) throw errResults;
        if (!teams || !results || results.length === 0) return [];

        // Calculer la moyenne de niveau par équipe
        const teamAvg = {};
        teams.forEach(t => {
            const players = t.session_players || [];
            teamAvg[t.id] = players.length > 0
                ? players.reduce((sum, p) => sum + p.niveau, 0) / players.length
                : 0;
        });

        // Pour chaque joueur, calculer le delta basé sur les résultats
        const ajustements = {};

        teams.forEach(team => {
            (team.session_players || []).forEach(player => {
                if (!player.player_id) return; // Pas de ref vers la table joueurs

                let totalDelta = 0;
                let matchsJoues = 0;

                results.forEach(result => {
                    let myTeamId = null;
                    let oppTeamId = null;

                    if (result.equipe1_id === team.id) {
                        myTeamId = team.id;
                        oppTeamId = result.equipe2_id;
                    } else if (result.equipe2_id === team.id) {
                        myTeamId = team.id;
                        oppTeamId = result.equipe1_id;
                    } else {
                        return; // Ce match ne concerne pas cette équipe
                    }

                    const myAvg = teamAvg[myTeamId] || 5;
                    const oppAvg = teamAvg[oppTeamId] || 5;
                    const strengthDiff = (oppAvg - myAvg) / 10;

                    if (result.gagnant_id === myTeamId) {
                        // Victoire : bonus ajusté par la force adverse
                        totalDelta += DELTA_BASE * (1 + strengthDiff);
                    } else {
                        // Défaite : malus ajusté par la force adverse
                        totalDelta -= DELTA_BASE * (1 - strengthDiff);
                    }
                    matchsJoues++;
                });

                if (matchsJoues === 0) return;

                const niveauActuel = player.niveau;
                const nouveauNiveau = Math.max(1, Math.min(10, Math.round((niveauActuel + totalDelta) * 10) / 10));

                ajustements[player.player_id] = {
                    player_id: player.player_id,
                    nom: player.player_name,
                    niveauActuel,
                    delta: totalDelta,
                    nouveauNiveau,
                    matchsJoues
                };
            });
        });

        return Object.values(ajustements);

    } catch (error) {
        console.error('Erreur calcul ajustements:', error);
        return [];
    }
}

// === AFFICHER LES AJUSTEMENTS PROPOSÉS ===
function afficherAjustements(sessionId, ajustements) {
    const container = document.getElementById('resultatsContainer');
    if (!container) return;

    if (ajustements.length === 0) {
        container.insertAdjacentHTML('beforeend', `
            <div class="card" style="margin-top: 16px;">
                <p style="text-align: center; color: #666;">Aucun ajustement à proposer pour cette soirée.</p>
            </div>`);
        return;
    }

    // Séparer les joueurs modifiés et non modifiés
    const modifies = ajustements.filter(a => a.nouveauNiveau !== a.niveauActuel);
    const inchanges = ajustements.filter(a => a.nouveauNiveau === a.niveauActuel);

    let html = `
        <div class="card" style="margin-top: 16px;">
            <h2 class="card-title">
                <span class="material-icons">trending_up</span>
                Ajustements proposés
            </h2>
            <p class="ajustements-info">
                Basé sur les résultats : victoire contre une équipe forte = plus gros bonus, 
                défaite contre une équipe faible = plus gros malus.
            </p>
            <div class="ajustements-list">
    `;

    // D'abord les joueurs dont le niveau change
    modifies.sort((a, b) => b.delta - a.delta);
    modifies.forEach(a => {
        const deltaStr = a.delta >= 0 ? `+${a.delta.toFixed(2)}` : a.delta.toFixed(2);
        const deltaClass = a.delta > 0 ? 'delta-positive' : 'delta-negative';
        const arrow = a.nouveauNiveau > a.niveauActuel ? '⬆️' : '⬇️';

        html += `
            <div class="ajustement-row ${deltaClass}">
                <span class="ajustement-nom">${a.nom}</span>
                <span class="ajustement-detail">
                    ${arrow} ${a.niveauActuel} → <strong>${a.nouveauNiveau}</strong>
                    <span class="ajustement-delta">(${deltaStr})</span>
                </span>
            </div>
        `;
    });

    // Puis les joueurs inchangés
    if (inchanges.length > 0) {
        html += `<div class="ajustement-separator">Inchangés</div>`;
        inchanges.forEach(a => {
            const deltaStr = a.delta >= 0 ? `+${a.delta.toFixed(2)}` : a.delta.toFixed(2);
            html += `
                <div class="ajustement-row delta-neutral">
                    <span class="ajustement-nom">${a.nom}</span>
                    <span class="ajustement-detail">
                        ${a.niveauActuel} (${deltaStr})
                    </span>
                </div>
            `;
        });
    }

    html += `
            </div>
            <div style="text-align: center; margin-top: 20px; display: flex; gap: 12px; justify-content: center;">
                <button onclick="window.AppSessions.appliquerAjustements(${sessionId})" class="btn btn-primary">
                    <span class="material-icons">check_circle</span>
                    Appliquer les ajustements
                </button>
                <button onclick="document.getElementById('resultatsContainer').innerHTML = ''" class="btn btn-secondary">
                    <span class="material-icons">cancel</span>
                    Ignorer
                </button>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', html);
}

// === APPLIQUER LES AJUSTEMENTS AUX JOUEURS ===
async function appliquerAjustements(sessionId) {
    try {
        const ajustements = await calculerAjustements(sessionId);
        const tableName = window.AppStorage.getTableName();

        let modifies = 0;
        for (const a of ajustements) {
            // Utiliser le niveau actuel du joueur (pas le snapshot)
            const joueurLocal = window.AppCore.joueurs.find(j => j.id === a.player_id);
            const niveauActuelReel = joueurLocal ? joueurLocal.niveau : a.niveauActuel;
            const nouveauNiveau = Math.max(1, Math.min(10, Math.round((niveauActuelReel + a.delta) * 10) / 10));

            if (nouveauNiveau === niveauActuelReel) continue;

            const { error } = await window.AppCore.supabaseClient
                .from(tableName)
                .update({ niveau: nouveauNiveau })
                .eq('id', a.player_id);

            if (error) {
                console.error(`Erreur MAJ ${a.nom}:`, error);
                continue;
            }

            // MAJ locale aussi
            if (joueurLocal) joueurLocal.niveau = nouveauNiveau;

            modifies++;
        }

        // Marquer session comme ajustements appliqués
        await window.AppCore.supabaseClient
            .from('sessions')
            .update({ ajustements_appliques: true })
            .eq('id', sessionId);

        // Vider le container résultats
        document.getElementById('resultatsContainer').innerHTML = '';

        // Rafraîchir l'affichage
        if (window.afficherJoueurs) window.afficherJoueurs();
        window.AppCore.showToast(`✅ ${modifies} niveau(x) de joueur(s) ajusté(s)`);

        // Recharger l'historique
        await chargerHistorique();

    } catch (error) {
        console.error('Erreur application ajustements:', error);
        window.AppCore.showToast('Erreur: ' + error.message, true);
    }
}

// === CHARGER L'HISTORIQUE DES SOIRÉES ===
async function chargerHistorique() {
    try {
        if (!window.AppCore.isOnline || !window.AppCore.clubActuel) return;

        const { data: sessions, error } = await window.AppCore.supabaseClient
            .from('sessions')
            .select(`
                *,
                session_teams (
                    *,
                    session_players (*)
                ),
                match_results (*)
            `)
            .eq('club_id', window.AppCore.clubActuel.id)
            .order('date_session', { ascending: false })
            .limit(10);

        if (error) throw error;

        window.AppCore.historiqueSessions = sessions || [];
        afficherHistorique();

    } catch (error) {
        console.error('Erreur chargement historique:', error);
    }
}

// === AFFICHER L'HISTORIQUE ===
function afficherHistorique() {
    const container = document.getElementById('historiqueContainer');
    if (!container) return;

    const sessions = window.AppCore.historiqueSessions || [];

    if (sessions.length === 0) {
        container.innerHTML = '';
        return;
    }

    let html = `
        <div class="card">
            <h2 class="card-title">
                <span class="material-icons">history</span>
                Historique des soirées (${sessions.length})
            </h2>
    `;

    sessions.forEach(session => {
        const date = new Date(session.date_session).toLocaleDateString('fr-FR', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        const teams = (session.session_teams || []).sort((a, b) => a.numero_equipe - b.numero_equipe);
        const results = session.match_results || [];

        // Map team ID → team object
        const teamMap = {};
        teams.forEach(t => { teamMap[t.id] = t; });

        html += `
            <div class="session-card">
                <div class="session-header">
                    <span class="session-date">📅 ${date}</span>
                    <div class="session-badges">
                        <span class="badge">${session.nb_equipes} éq.</span>
                        ${session.resultats_saisis ? '<span class="badge badge-success">Résultats ✓</span>' : '<span class="badge badge-pending">En attente</span>'}
                        ${session.ajustements_appliques ? '<span class="badge badge-success">Ajustements ✓</span>' : ''}
                    </div>
                </div>
                <div class="session-teams-list">
        `;

        teams.forEach(team => {
            const joueurs = (team.session_players || []).sort((a, b) => b.niveau - a.niveau);
            // Compter les victoires pour cette équipe
            const victoires = results.filter(r => r.gagnant_id === team.id).length;
            const defaites = results.filter(r =>
                (r.equipe1_id === team.id || r.equipe2_id === team.id) && r.gagnant_id !== team.id
            ).length;

            html += `
                <div class="session-team-row">
                    <strong>Éq. ${team.numero_equipe}</strong>
                    ${results.length > 0 ? `<span class="session-record">${victoires}V ${defaites}D</span>` : ''}
                    <span class="session-total">(${team.niveau_total} pts)</span>
                    <span class="session-players-list">
                        ${joueurs.map(j => `<span class="session-player">${j.player_name}<sup>${j.niveau}</sup></span>`).join(' ')}
                    </span>
                </div>
            `;
        });

        html += '</div>';

        // Détails des résultats
        if (results.length > 0) {
            html += '<div class="session-results">';
            results.forEach(r => {
                const eq1 = teamMap[r.equipe1_id];
                const eq2 = teamMap[r.equipe2_id];
                const gagnant = teamMap[r.gagnant_id];
                if (eq1 && eq2 && gagnant) {
                    html += `<span class="result-pill">Éq.${eq1.numero_equipe} vs Éq.${eq2.numero_equipe} → 🏆 Éq.${gagnant.numero_equipe}</span>`;
                }
            });
            html += '</div>';
        }

        // Boutons d'action selon l'état de la session
        html += '<div class="session-actions">';
        if (!session.resultats_saisis) {
            const teamIds = teams.map(t => t.id);
            html += `
                <button onclick="window.AppSessions.afficherInterfaceResultats(${session.id}, [${teamIds.join(',')}])" class="btn btn-warning btn-sm">
                    <span class="material-icons">edit</span>
                    Saisir résultats
                </button>
            `;
        } else if (!session.ajustements_appliques) {
            html += `
                <button onclick="window.AppSessions.recalculerEtAfficherAjustements(${session.id})" class="btn btn-secondary btn-sm">
                    <span class="material-icons">trending_up</span>
                    Appliquer ajustements
                </button>
            `;
        }

        html += `
                <button onclick="window.AppSessions.supprimerSession(${session.id})" class="btn btn-danger-outline btn-sm">
                    <span class="material-icons">delete</span>
                </button>
            </div>
        </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

// === RECALCULER ET AFFICHER AJUSTEMENTS (depuis historique) ===
async function recalculerEtAfficherAjustements(sessionId) {
    const container = document.getElementById('resultatsContainer');
    if (container) container.innerHTML = '';
    const ajustements = await calculerAjustements(sessionId);
    afficherAjustements(sessionId, ajustements);
    // Scroll vers le container
    if (container) container.scrollIntoView({ behavior: 'smooth' });
}

// === SUPPRIMER UNE SESSION ===
async function supprimerSession(sessionId) {
    if (!confirm('Supprimer cette soirée et tous ses résultats ?')) return;

    try {
        // Cascade supprimera session_teams, session_players, match_results
        const { error } = await window.AppCore.supabaseClient
            .from('sessions')
            .delete()
            .eq('id', sessionId);

        if (error) throw error;

        window.AppCore.showToast('Soirée supprimée');
        await chargerHistorique();

    } catch (error) {
        console.error('Erreur suppression session:', error);
        window.AppCore.showToast('Erreur: ' + error.message, true);
    }
}

// === EXPORT DES FONCTIONS ===
window.AppSessions = {
    validerSession,
    afficherInterfaceResultats,
    sauvegarderResultats,
    calculerAjustements,
    afficherAjustements,
    appliquerAjustements,
    chargerHistorique,
    afficherHistorique,
    recalculerEtAfficherAjustements,
    supprimerSession
};
