// ===================================================================
// SESSIONS.JS - Historique des soirées et évolution des scores
// Module de gestion des sessions de jeu, résultats et ajustements
// ===================================================================

const DELTA_BASE = 0.15; // Ajustement de base par match

// Variables mémoire pour la re-notation
let _ancienDeltaRenotation = {};
let _dateSessionRenotation = '';

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
                        <input type="radio" name="match_${idx}" value="draw" 
                               data-eq1="${p.teamId1}" data-eq2="${p.teamId2}">
                        <span class="match-label draw">🤝 Match nul</span>
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
            const gagnantId = radio.value === 'draw' ? null : parseInt(radio.value, 10);
            resultats.push({
                session_id: sessionId,
                equipe1_id: parseInt(radio.dataset.eq1),
                equipe2_id: parseInt(radio.dataset.eq2),
                gagnant_id: gagnantId
            });
        });

        if (resultats.length === 0) {
            window.AppCore.showToast('Aucun résultat à sauvegarder (tout est "Non joué")', true);
            return;
        }

        // Supprimer d'éventuels anciens résultats pour cette session
        const { error: errDelete } = await window.AppCore.supabaseClient
            .from('match_results')
            .delete()
            .eq('session_id', sessionId);

        if (errDelete) throw errDelete;

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

                    if (result.gagnant_id == null) {
                        return; // Match nul : pas d'ajustement
                    }

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
                const nouveauNiveau = Math.max(1, Math.min(10, parseFloat((niveauActuel + totalDelta).toFixed(1))));

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
                <span class="ajustement-nom">${window.AppCore.escapeHtml(a.nom)}</span>
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
                    <span class="ajustement-nom">${window.AppCore.escapeHtml(a.nom)}</span>
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
            const nouveauNiveau = Math.max(1, Math.min(10, parseFloat((niveauActuelReel + a.delta).toFixed(1))));

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
            .order('date_session', { ascending: false });

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
            const matchsEquipe = results.filter(r => r.equipe1_id === team.id || r.equipe2_id === team.id);
            const victoires = matchsEquipe.filter(r => r.gagnant_id === team.id).length;
            const nuls = matchsEquipe.filter(r => r.gagnant_id == null).length;
            const defaites = matchsEquipe.filter(r => r.gagnant_id != null && r.gagnant_id !== team.id).length;

            html += `
                <div class="session-team-row">
                    <strong>Éq. ${team.numero_equipe}</strong>
                    ${results.length > 0 ? `<span class="session-record">${victoires}V ${nuls}N ${defaites}D</span>` : ''}
                    <span class="session-total">(${team.niveau_total} pts)</span>
                    <span class="session-players-list">
                        ${joueurs.map(j => `<span class="session-player">${window.AppCore.escapeHtml(j.player_name)}<sup>${j.niveau}</sup></span>`).join(' ')}
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
                } else if (eq1 && eq2) {
                    html += `<span class="result-pill draw">Éq.${eq1.numero_equipe} vs Éq.${eq2.numero_equipe} → 🤝 Match nul</span>`;
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

        if (window.AppCore.isOnline) {
            html += `
                <button onclick="window.AppSessions.renoterResultats(${session.id})" class="btn btn-edit-outline btn-sm" title="Modifier les résultats">
                    <span class="material-icons">edit_note</span>
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

// === EXPORTER LES MATCHS JOUÉS ===
async function exporterMatchs() {
    try {
        if (!window.AppCore.isOnline || !window.AppCore.clubActuel) {
            window.AppCore.showToast('Connexion requise pour exporter', true);
            return;
        }

        window.AppCore.showToast('Export en cours...');

        // Charger toutes les sessions du club avec données complètes
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
            .order('date_session', { ascending: true });

        if (error) throw error;

        if (!sessions || sessions.length === 0) {
            window.AppCore.showToast('Aucune soirée à exporter', true);
            return;
        }

        // Construire le JSON exportable (sans les IDs internes)
        const exportData = {
            version: 1,
            club: window.AppCore.clubActuel.nom,
            exported_at: new Date().toISOString(),
            sessions: sessions.map(s => ({
                date_session: s.date_session,
                nb_equipes: s.nb_equipes,
                resultats_saisis: s.resultats_saisis,
                ajustements_appliques: s.ajustements_appliques,
                teams: (s.session_teams || []).sort((a, b) => a.numero_equipe - b.numero_equipe).map(t => ({
                    numero_equipe: t.numero_equipe,
                    niveau_total: t.niveau_total,
                    players: (t.session_players || []).map(p => ({
                        player_name: p.player_name,
                        niveau: p.niveau,
                        poste: p.poste
                    }))
                })),
                results: (s.match_results || []).map(r => {
                    const eq1 = (s.session_teams || []).find(t => t.id === r.equipe1_id);
                    const eq2 = (s.session_teams || []).find(t => t.id === r.equipe2_id);
                    const gagnant = (s.session_teams || []).find(t => t.id === r.gagnant_id);
                    return {
                        equipe1_numero: eq1 ? eq1.numero_equipe : null,
                        equipe2_numero: eq2 ? eq2.numero_equipe : null,
                        gagnant_numero: gagnant ? gagnant.numero_equipe : null
                    };
                })
            }))
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `matchs_${window.AppCore.clubActuel.nom.toLowerCase()}_${new Date().toLocaleDateString('en-CA')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        window.AppCore.showToast(`${sessions.length} soirée(s) exportée(s)`);

    } catch (error) {
        console.error('Erreur export matchs:', error);
        window.AppCore.showToast('Erreur export: ' + error.message, true);
    }
}

// === IMPORTER LES MATCHS ===
async function importerMatchs() {
    const fichier = document.getElementById('fichierMatchs').files[0];
    if (!fichier) {
        window.AppCore.showToast('Aucun fichier sélectionné', true);
        return;
    }

    if (!window.AppCore.isOnline) {
        window.AppCore.showToast('Connexion requise pour importer', true);
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(event) {
        try {
            const importData = JSON.parse(event.target.result);

            if (!importData.version || !importData.sessions || !Array.isArray(importData.sessions)) {
                window.AppCore.showToast('Format de fichier invalide', true);
                return;
            }

            if (!confirm(`Importer ${importData.sessions.length} soirée(s) depuis "${importData.club || 'inconnu'}" ?\n\nLes soirées existantes ne seront pas dupliquées (vérification par date + nombre d\'équipes).`)) {
                return;
            }

            window.AppCore.showToast('Import en cours...');

            // Charger les sessions existantes pour éviter les doublons
            const { data: existantes } = await window.AppCore.supabaseClient
                .from('sessions')
                .select('date_session, nb_equipes')
                .eq('club_id', window.AppCore.clubActuel.id);

            const existSet = new Set((existantes || []).map(s => `${s.date_session}_${s.nb_equipes}`));

            let importees = 0;
            let ignorees = 0;

            for (const sessionData of importData.sessions) {
                const cleDedoublon = `${sessionData.date_session}_${sessionData.nb_equipes}`;
                if (existSet.has(cleDedoublon)) {
                    ignorees++;
                    continue;
                }

                // 1. Créer la session
                const { data: session, error: errSession } = await window.AppCore.supabaseClient
                    .from('sessions')
                    .insert([{
                        club_id: window.AppCore.clubActuel.id,
                        date_session: sessionData.date_session,
                        nb_equipes: sessionData.nb_equipes,
                        resultats_saisis: sessionData.resultats_saisis || false,
                        ajustements_appliques: sessionData.ajustements_appliques || false
                    }])
                    .select()
                    .single();

                if (errSession) { console.error('Erreur import session:', errSession); continue; }

                // Map numéro d'équipe → ID inséré
                const teamNumToId = {};

                // 2. Créer les équipes
                for (const teamData of (sessionData.teams || [])) {
                    const { data: team, error: errTeam } = await window.AppCore.supabaseClient
                        .from('session_teams')
                        .insert([{
                            session_id: session.id,
                            numero_equipe: teamData.numero_equipe,
                            niveau_total: teamData.niveau_total || 0
                        }])
                        .select()
                        .single();

                    if (errTeam) { console.error('Erreur import team:', errTeam); continue; }
                    teamNumToId[teamData.numero_equipe] = team.id;

                    // 3. Créer les joueurs
                    if (teamData.players && teamData.players.length > 0) {
                        const playersBatch = teamData.players.map(p => ({
                            session_team_id: team.id,
                            player_id: null,
                            player_name: p.player_name,
                            niveau: p.niveau,
                            poste: p.poste
                        }));

                        await window.AppCore.supabaseClient
                            .from('session_players')
                            .insert(playersBatch);
                    }
                }

                // 4. Créer les résultats
                for (const result of (sessionData.results || [])) {
                    const eq1Id = teamNumToId[result.equipe1_numero];
                    const eq2Id = teamNumToId[result.equipe2_numero];
                    const gagnantId = result.gagnant_numero ? teamNumToId[result.gagnant_numero] : null;

                    if (eq1Id && eq2Id) {
                        await window.AppCore.supabaseClient
                            .from('match_results')
                            .insert([{
                                session_id: session.id,
                                equipe1_id: eq1Id,
                                equipe2_id: eq2Id,
                                gagnant_id: gagnantId
                            }]);
                    }
                }

                importees++;
            }

            // Reset le champ fichier
            document.getElementById('fichierMatchs').value = '';

            // Recharger l'historique
            await chargerHistorique();

            let msg = `${importees} soirée(s) importée(s)`;
            if (ignorees > 0) msg += `, ${ignorees} ignorée(s) (doublons)`;
            window.AppCore.showToast(msg);

        } catch (error) {
            console.error('Erreur import matchs:', error);
            window.AppCore.showToast('Erreur import: ' + error.message, true);
        }
    };
    reader.readAsText(fichier, 'utf-8');
}

// === CALCULER DELTA D'UNE SESSION (depuis snapshots en mémoire) ===
function calculerDeltaSession(session) {
    const teams = session.session_teams || [];
    const results = session.match_results || [];

    if (results.length === 0) return {};

    const teamAvg = {};
    teams.forEach(t => {
        const players = t.session_players || [];
        teamAvg[t.id] = players.length > 0
            ? players.reduce((sum, p) => sum + p.niveau, 0) / players.length
            : 0;
    });

    const deltas = {};

    teams.forEach(team => {
        (team.session_players || []).forEach(player => {
            if (!player.player_id) return;

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
                    return;
                }

                const myAvg = teamAvg[myTeamId] || 5;
                const oppAvg = teamAvg[oppTeamId] || 5;
                const strengthDiff = (oppAvg - myAvg) / 10;

                if (result.gagnant_id == null) return; // nul : pas de delta

                if (result.gagnant_id === myTeamId) {
                    totalDelta += DELTA_BASE * (1 + strengthDiff);
                } else {
                    totalDelta -= DELTA_BASE * (1 - strengthDiff);
                }
                matchsJoues++;
            });

            if (matchsJoues === 0) return;

            deltas[player.player_id] = {
                player_id: player.player_id,
                player_name: player.player_name,
                delta: totalDelta
            };
        });
    });

    return deltas;
}

// === RE-NOTATION : AFFICHER L'INTERFACE ===
function renoterResultats(sessionId) {
    if (!window.AppCore.isOnline) {
        window.AppCore.showToast('Connexion requise pour modifier les résultats', true);
        return;
    }

    const session = (window.AppCore.historiqueSessions || []).find(s => s.id === sessionId);
    if (!session) {
        window.AppCore.showToast('Session introuvable', true);
        return;
    }

    // Mémoriser l'ancien delta avant toute modification
    _ancienDeltaRenotation = calculerDeltaSession(session);
    _dateSessionRenotation = session.date_session;

    // Préparer les équipes ordonnées
    const teams = (session.session_teams || []).sort((a, b) => a.numero_equipe - b.numero_equipe);
    const teamIds = teams.map(t => t.id);

    // Basculer vers l'onglet Gestion pour que #resultatsContainer soit visible
    if (window.AppUI && window.AppUI.switchTab) window.AppUI.switchTab('gestion');

    // Afficher l'interface de saisie dans resultatsContainer
    afficherInterfaceResultats(sessionId, teamIds);

    const container = document.getElementById('resultatsContainer');
    if (!container) return;

    // Remplacer le bouton de sauvegarde
    const saveBtn = container.querySelector(`button[onclick*="sauvegarderResultats"]`);
    if (saveBtn) {
        saveBtn.setAttribute('onclick', `window.AppSessions.sauvegarderRenotation(${sessionId})`);
        saveBtn.innerHTML = '<span class="material-icons">save</span> Corriger les résultats';
    }

    // Pré-cocher les résultats existants
    const existingResults = session.match_results || [];
    existingResults.forEach(r => {
        const radios = container.querySelectorAll('input[type="radio"][data-eq1][data-eq2]');
        radios.forEach(radio => {
            const eq1 = parseInt(radio.dataset.eq1);
            const eq2 = parseInt(radio.dataset.eq2);
            if ((eq1 === r.equipe1_id && eq2 === r.equipe2_id) ||
                (eq1 === r.equipe2_id && eq2 === r.equipe1_id)) {
                const target = r.gagnant_id === null ? 'draw' : String(r.gagnant_id);
                if (radio.value === target) radio.checked = true;
            }
        });
    });

    container.scrollIntoView({ behavior: 'smooth' });
}

// === RE-NOTATION : SAUVEGARDER ET CORRIGER ===
async function sauvegarderRenotation(sessionId) {
    try {
        if (!window.AppCore.isOnline) return;

        const supabase = window.AppCore.supabaseClient;
        const container = document.getElementById('resultatsContainer');
        const radios = container.querySelectorAll('.results-grid input[type="radio"]:checked');
        const resultats = [];

        radios.forEach(radio => {
            if (radio.value === 'skip') return;
            resultats.push({
                session_id: sessionId,
                equipe1_id: parseInt(radio.dataset.eq1),
                equipe2_id: parseInt(radio.dataset.eq2),
                gagnant_id: radio.value === 'draw' ? null : parseInt(radio.value, 10)
            });
        });

        // Supprimer anciens résultats et insérer nouveaux
        const { error: errDelete } = await supabase.from('match_results').delete().eq('session_id', sessionId);
        if (errDelete) throw errDelete;

        if (resultats.length > 0) {
            const { error: errInsert } = await supabase.from('match_results').insert(resultats);
            if (errInsert) throw errInsert;
        }

        // Mettre à jour l'état de la session
        await supabase.from('sessions').update({
            resultats_saisis: resultats.length > 0,
            ajustements_appliques: resultats.length > 0
        }).eq('id', sessionId);

        // Recharger la session depuis la DB pour calculer le nouveau delta
        const { data: updatedSession, error: errLoad } = await supabase
            .from('sessions')
            .select('*, session_teams(*, session_players(*)), match_results(*)')
            .eq('id', sessionId)
            .single();
        if (errLoad) throw errLoad;

        const nouveauDelta = calculerDeltaSession(updatedSession);
        const ancienDelta = _ancienDeltaRenotation;

        // Appliquer la correction nette (nouveau_delta - ancien_delta) sur le niveau actuel
        const tableName = window.AppStorage.getTableName();
        for (const playerId of Object.keys(nouveauDelta)) {
            const nv = nouveauDelta[playerId];
            const anc = ancienDelta[playerId] || { delta: 0 };
            const correction = nv.delta - anc.delta;

            if (Math.abs(correction) < 0.001) continue;
            if (!nv.player_id) continue;

            const joueurLocal = (window.AppCore.joueurs || []).find(j => j.id === nv.player_id);
            if (!joueurLocal) continue;

            const nouveauNiveau = Math.max(1, Math.min(10, parseFloat((joueurLocal.niveau + correction).toFixed(1))));
            const { error: errUpdate } = await supabase.from(tableName).update({ niveau: nouveauNiveau }).eq('id', nv.player_id);
            if (errUpdate) throw errUpdate;
        }

        // Cascade : remettre en attente les sessions ultérieures avec ajustements appliqués
        const { data: sessionsUlterieures, error: errCascade } = await supabase
            .from('sessions')
            .select('id')
            .eq('club_id', window.AppCore.clubActuel.id)
            .eq('ajustements_appliques', true)
            .gt('date_session', _dateSessionRenotation)
            .neq('id', sessionId);

        let nbCascade = 0;
        if (!errCascade && sessionsUlterieures && sessionsUlterieures.length > 0) {
            nbCascade = sessionsUlterieures.length;
            await supabase.from('sessions')
                .update({ ajustements_appliques: false })
                .in('id', sessionsUlterieures.map(s => s.id));
        }

        // Réinitialiser la mémoire
        _ancienDeltaRenotation = {};
        _dateSessionRenotation = '';

        let msg = '✅ Résultats corrigés !';
        if (nbCascade > 0) msg += ` ${nbCascade} session(s) ultérieure(s) remise(s) en attente.`;
        window.AppCore.showToast(msg);

        if (container) container.innerHTML = '';
        await window.AppStorage.chargerJoueurs();
        await chargerHistorique();

    } catch (error) {
        console.error('Erreur correction résultats:', error);
        window.AppCore.showToast('Erreur: ' + error.message, true);
    }
}

// === STATISTIQUES JOUEURS ===
function calculerStats() {
    const stats = {};

    (window.AppCore.historiqueSessions || []).forEach(session => {
        const teams = session.session_teams || [];
        const results = session.match_results || [];

        teams.forEach(team => {
            const matchsEquipe = results.filter(r =>
                r.equipe1_id === team.id || r.equipe2_id === team.id
            );

            (team.session_players || []).forEach(player => {
                const nom = player.player_name;
                if (!stats[nom]) {
                    stats[nom] = { nom, victoires: 0, nuls: 0, defaites: 0, matchs: 0, historiqueNiveau: [] };
                }

                // Snapshot de niveau pour cette session
                const dateExiste = stats[nom].historiqueNiveau.some(h => h.date === session.date_session);
                if (!dateExiste) {
                    stats[nom].historiqueNiveau.push({ date: session.date_session, niveau: player.niveau });
                }

                // V / N / D
                matchsEquipe.forEach(r => {
                    stats[nom].matchs++;
                    if (r.gagnant_id === null) {
                        stats[nom].nuls++;
                    } else if (r.gagnant_id === team.id) {
                        stats[nom].victoires++;
                    } else {
                        stats[nom].defaites++;
                    }
                });
            });
        });
    });

    return Object.values(stats)
        .map(s => ({
            ...s,
            pct: s.matchs > 0 ? Math.round(s.victoires / s.matchs * 100) : 0,
            historiqueNiveau: s.historiqueNiveau.sort((a, b) => a.date.localeCompare(b.date))
        }))
        .sort((a, b) => b.pct - a.pct || b.matchs - a.matchs || a.nom.localeCompare(b.nom, 'fr'));
}

function afficherStats() {
    const container = document.getElementById('statsContainer');
    if (!container) return;

    // Charger l'historique si pas encore fait
    if (!window.AppCore.historiqueSessions || window.AppCore.historiqueSessions.length === 0) {
        if (window.AppCore.isOnline) {
            chargerHistorique().then(() => afficherStats());
            container.innerHTML = '<div class="card"><p style="text-align:center;padding:24px;color:#666">Chargement...</p></div>';
            return;
        }
        container.innerHTML = '<div class="card"><p style="text-align:center;padding:24px;color:#666">Aucune soirée dans l\'historique.</p></div>';
        return;
    }

    const stats = calculerStats();
    if (stats.length === 0) {
        container.innerHTML = '<div class="card"><p style="text-align:center;padding:24px;color:#666">Aucun joueur trouvé dans l\'historique.</p></div>';
        return;
    }

    let html = `
        <div class="card">
            <h2 class="card-title">
                <span class="material-icons">bar_chart</span>
                Statistiques joueurs
                <button onclick="window.AppSessions.exporterStats()" class="btn btn-secondary" style="margin-left:auto;font-size:13px;padding:6px 14px;">
                    <span class="material-icons" style="font-size:16px;">download</span>
                    Exporter CSV
                </button>
            </h2>
            <div class="stats-table-wrapper">
                <table class="stats-table">
                    <thead>
                        <tr>
                            <th>Joueur</th>
                            <th>V</th><th>N</th><th>D</th>
                            <th>Matchs</th>
                            <th>%V</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    stats.forEach((s, idx) => {
        const rowClass = s.pct > 50 ? 'stats-win' : s.pct < 40 && s.matchs > 0 ? 'stats-lose' : '';
        const historiqueHtml = s.historiqueNiveau.map((h, i) => {
            const prev = s.historiqueNiveau[i - 1];
            const diff = prev ? (h.niveau - prev.niveau) : null;
            const arrow = diff === null ? '' : diff > 0 ? ' ⬆️' : diff < 0 ? ' ⬇️' : ' ↔️';
            const d = new Date(h.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
            return `<div class="niveau-history-row">${d} → <strong>${h.niveau}</strong>${arrow}</div>`;
        }).join('');

        html += `
                        <tr class="stats-row ${rowClass}" onclick="window._toggleHistorique(${idx})">
                            <td>${window.AppCore.escapeHtml(s.nom)} <span class="history-toggle" id="htoggle-${idx}">▼</span></td>
                            <td class="stats-v">${s.victoires}</td>
                            <td class="stats-n">${s.nuls}</td>
                            <td class="stats-d">${s.defaites}</td>
                            <td>${s.matchs}</td>
                            <td><strong>${s.pct}%</strong></td>
                        </tr>
                        <tr id="hrow-${idx}" class="history-row" style="display:none">
                            <td colspan="6">
                                <div class="niveau-history">
                                    ${historiqueHtml || '<em style="color:#aaa">Aucun snapshot de niveau disponible</em>'}
                                </div>
                            </td>
                        </tr>
        `;
    });

    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    container.innerHTML = html;

    window._toggleHistorique = function(idx) {
        const row = document.getElementById(`hrow-${idx}`);
        const toggle = document.getElementById(`htoggle-${idx}`);
        if (row) {
            const visible = row.style.display !== 'none';
            row.style.display = visible ? 'none' : 'table-row';
            if (toggle) toggle.textContent = visible ? '▼' : '▲';
        }
    };
}

function exporterStats() {
    const stats = calculerStats();
    if (stats.length === 0) {
        window.AppCore.showToast('Aucune statistique à exporter', true);
        return;
    }

    const lignes = [
        'Joueur,Victoires,Nuls,Defaites,Matchs,%Victoires,Historique niveau (date:valeur)',
        ...stats.map(s => {
            const historique = s.historiqueNiveau.map(h => `${h.date}:${h.niveau}`).join('|');
            return `${s.nom},${s.victoires},${s.nuls},${s.defaites},${s.matchs},${s.pct}%,"${historique}"`;
        })
    ].join('\n');

    const blob = new Blob(['\uFEFF' + lignes], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toLocaleDateString('en-CA');
    a.download = `stats_${window.AppCore.clubActuel.nom.toLowerCase().replace(/\s+/g, '_')}_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.AppCore.showToast('Statistiques exportées !');
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
    supprimerSession,
    exporterMatchs,
    importerMatchs,
    calculerStats,
    afficherStats,
    exporterStats,
    calculerDeltaSession,
    renoterResultats,
    sauvegarderRenotation
};
