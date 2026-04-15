// ===================================================================
// PLAYERS.JS - CRUD Joueurs
// Module de gestion des joueurs
// ===================================================================

function _canEditNiveaux() {
    return window.AppCore.canEditNiveaux ? window.AppCore.canEditNiveaux() : true;
}

function _clubSlug() {
    return window.AppCore.getClubSlug ? window.AppCore.getClubSlug() : 'grenoble';
}

function _safeModeEnabled() {
    return !_canEditNiveaux() && !!window.AppCore.levelSecurityEnforced;
}

// === AJOUTER JOUEUR ===
async function ajouterJoueur() {
    if (!window.AppCore.isAdmin()) {
        window.AppCore.showToast('Ajout reserve admin', true);
        return;
    }

    const nom = (document.getElementById('nom').value || '').trim();
    const canEditNiveaux = _canEditNiveaux();

    let niveau = parseFloat(document.getElementById('niveau').value);
    const poste = document.getElementById('poste').value;
    const groupe = parseInt(document.getElementById('groupe').value) || null;

    if (!nom) {
        window.AppCore.showToast('Veuillez saisir un nom de joueur', true);
        return;
    }

    if (!canEditNiveaux) {
        niveau = 5;
    }

    if (canEditNiveaux && (isNaN(niveau) || niveau < 1 || niveau > 10)) {
        window.AppCore.showToast('Le niveau doit etre entre 1 et 10', true);
        return;
    }

    if (window.AppCore.joueurs.find(j => j.nom.toLowerCase() === nom.toLowerCase())) {
        window.AppCore.showToast('Ce joueur existe deja', true);
        return;
    }

    const nouveauJoueur = { nom, niveau, poste, groupe, actif: true };

    try {
        if (window.AppCore.isOnline) {
            if (_safeModeEnabled()) {
                const { data, error } = await window.AppCore.supabaseClient.rpc('api_players_insert_safe', {
                    p_club: _clubSlug(),
                    p_nom: nom,
                    p_poste: poste,
                    p_groupe: groupe,
                    p_actif: true
                });
                if (error) throw error;
                nouveauJoueur.id = typeof data === 'number' ? data : null;
                window.AppCore.showToast(`Joueur ${nom} ajoute (mode operateur)`);
            } else {
                const tableName = window.AppStorage.getTableName();
                const { data, error } = await window.AppCore.supabaseClient
                    .from(tableName)
                    .insert([nouveauJoueur])
                    .select();

                if (error) throw error;
                nouveauJoueur.id = data[0].id;
                window.AppCore.showToast(`Joueur ${nom} ajoute et synchronise !`);
            }
        } else {
            nouveauJoueur.id = Date.now();
            window.AppCore.showToast(`Joueur ${nom} ajoute (mode hors ligne)`);
        }

        window.AppCore.joueurs.push(nouveauJoueur);
        if (window.afficherJoueurs) window.afficherJoueurs();
        window.AppCore.updateStatus(`Connecte (${window.AppCore.joueurs.length} joueurs - ${window.AppCore.clubActuel.nom})`, 'connected');

        document.getElementById('nom').value = '';
        document.getElementById('niveau').value = '';
        document.getElementById('groupe').value = '';
        document.getElementById('nom').focus();
    } catch (error) {
        console.error('Erreur ajout joueur:', error);
        window.AppCore.showToast('Erreur: ' + error.message, true);
    }
}

// === SUPPRIMER JOUEUR ===
async function supprimerJoueur(index) {
    if (!window.AppCore.isAdmin()) {
        window.AppCore.showToast('Suppression reservee admin', true);
        return;
    }

    if (!confirm('Supprimer ce joueur ?')) return;

    const joueur = window.AppCore.joueurs[index];
    if (!joueur) {
        window.AppCore.showToast('Joueur introuvable, rechargez la liste', true);
        if (window.afficherJoueurs) window.afficherJoueurs();
        return;
    }

    const nom = joueur.nom;

    try {
        if (window.AppCore.isOnline && joueur.id) {
            if (_safeModeEnabled()) {
                const { error } = await window.AppCore.supabaseClient.rpc('api_players_delete_safe', {
                    p_club: _clubSlug(),
                    p_id: joueur.id
                });
                if (error) throw error;
                window.AppCore.showToast(`Joueur ${nom} supprime (mode operateur)`);
            } else {
                const tableName = window.AppStorage.getTableName();
                const { error } = await window.AppCore.supabaseClient
                    .from(tableName)
                    .delete()
                    .eq('id', joueur.id);

                if (error) throw error;
                window.AppCore.showToast(`Joueur ${nom} supprime de la base !`);
            }
        } else {
            window.AppCore.showToast(`Joueur ${nom} supprime (mode hors ligne)`);
        }

        window.AppCore.joueurs.splice(index, 1);
        if (window.afficherJoueurs) window.afficherJoueurs();
        window.AppCore.updateStatus(`Connecte (${window.AppCore.joueurs.length} joueurs - ${window.AppCore.clubActuel.nom})`, 'connected');
    } catch (error) {
        console.error('Erreur suppression:', error);
        window.AppCore.showToast('Erreur: ' + error.message, true);
    }
}

// === MODIFIER JOUEUR ===
async function modifierJoueur(index, champ, valeur) {
    const joueur = window.AppCore.joueurs[index];
    if (!joueur) {
        window.AppCore.showToast('Joueur introuvable, rechargez la liste', true);
        if (window.afficherJoueurs) window.afficherJoueurs();
        return;
    }

    // Sélectionneur : seul le champ 'actif' est modifiable
    if (!window.AppCore.isAdmin() && champ !== 'actif') {
        window.AppCore.showToast('Modification reservee admin', true);
        if (window.afficherJoueurs) window.afficherJoueurs();
        return;
    }

    const canEditNiveaux = _canEditNiveaux();
    const ancienneValeur = joueur[champ];

    if (champ === 'niveau' && !canEditNiveaux) {
        window.AppCore.showToast('Modification du niveau reservee admin', true);
        if (window.afficherJoueurs) window.afficherJoueurs();
        return;
    }

    if (champ === 'nom') {
        const nouveauNom = valeur.trim();
        if (!nouveauNom) {
            window.AppCore.showToast('Le nom ne peut pas etre vide', true);
            if (window.afficherJoueurs) window.afficherJoueurs();
            return;
        }
        const nomExiste = window.AppCore.joueurs.some((j, i) => i !== index && j.nom.toLowerCase() === nouveauNom.toLowerCase());
        if (nomExiste) {
            window.AppCore.showToast('Ce nom existe deja', true);
            if (window.afficherJoueurs) window.afficherJoueurs();
            return;
        }
        joueur[champ] = nouveauNom;
    } else if (champ === 'niveau') {
        const niveau = parseFloat(valeur);
        if (isNaN(niveau) || niveau < 1 || niveau > 10) {
            window.AppCore.showToast('Le niveau doit etre entre 1 et 10', true);
            if (window.afficherJoueurs) window.afficherJoueurs();
            return;
        }
        joueur[champ] = niveau;
    } else if (champ === 'actif') {
        joueur[champ] = valeur;
    } else if (champ === 'groupe') {
        joueur[champ] = valeur ? parseInt(valeur) : null;
    } else {
        joueur[champ] = valeur;
    }

    try {
        if (window.AppCore.isOnline && joueur.id) {
            if (_safeModeEnabled()) {
                const { error } = await window.AppCore.supabaseClient.rpc('api_players_update_safe', {
                    p_club: _clubSlug(),
                    p_id: joueur.id,
                    p_nom: joueur.nom,
                    p_poste: joueur.poste,
                    p_groupe: joueur.groupe,
                    p_actif: joueur.actif
                });
                if (error) throw error;
            } else {
                const tableName = window.AppStorage.getTableName();
                const updateData = {
                    nom: joueur.nom,
                    niveau: joueur.niveau,
                    poste: joueur.poste,
                    groupe: joueur.groupe,
                    actif: joueur.actif
                };

                const { error } = await window.AppCore.supabaseClient
                    .from(tableName)
                    .update(updateData)
                    .eq('id', joueur.id);

                if (error) throw error;
            }
        }
    } catch (error) {
        console.error('Erreur synchronisation modification:', error);
        window.AppCore.showToast('Modification locale OK, sync echouee', true);
    }

    if (window.afficherJoueurs) window.afficherJoueurs();

    if (window.AppCore.equipes.length > 0) {
        window.AppCore.equipes.forEach(equipe => {
            const joueurDansEquipe = equipe.joueurs.find(j => j.id === joueur.id || j.nom === ancienneValeur);
            if (joueurDansEquipe && champ === 'nom') {
                joueurDansEquipe.nom = valeur.trim();
            }
        });
        if (window.afficherEquipes) window.afficherEquipes();
    }
}

// === EXPORT JOUEURS ===
function exporterJoueurs() {
    if (window.AppCore.joueurs.length === 0) {
        window.AppCore.showToast('Aucun joueur a exporter', true);
        return;
    }

    const canViewNiveaux = window.AppCore.canViewNiveaux ? window.AppCore.canViewNiveaux() : true;
    const header = canViewNiveaux ? 'nom,niveau,poste,groupe,actif' : 'nom,poste,groupe,actif';

    const contenu = [
        header,
        ...window.AppCore.joueurs.map(j => {
            if (canViewNiveaux) {
                return `${j.nom},${j.niveau},${j.poste},${j.groupe ?? ''},${j.actif ? 'true' : 'false'}`;
            }
            return `${j.nom},${j.poste},${j.groupe ?? ''},${j.actif ? 'true' : 'false'}`;
        })
    ].join('\n');

    const blob = new Blob([contenu], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'joueurs_exportes.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    window.AppCore.showToast('Joueurs exportes avec succes');
}

// === IMPORT JOUEURS ===
async function importerJoueurs() {
    const fichier = document.getElementById('fichierJoueurs').files[0];
    if (!fichier) {
        window.AppCore.showToast('Aucun fichier selectionne', true);
        return;
    }

    const canEditNiveaux = _canEditNiveaux();

    const reader = new FileReader();
    reader.onload = async function(event) {
        let ajouts = 0;
        const lignes = event.target.result.replace(/\r/g, '').split('\n');

        for (const ligne of lignes) {
            const cleanLine = ligne.replace(/^\uFEFF/, '').trim();
            if (!cleanLine) continue;

            if (cleanLine.toLowerCase().startsWith('nom,') || cleanLine.toLowerCase().startsWith('nom;')) continue;

            const sep = cleanLine.includes(';') ? ';' : ',';
            const colonnes = cleanLine.split(sep).map(x => x.trim());

            const nom = colonnes[0];
            const niveauStr = canEditNiveaux ? colonnes[1] : null;
            const posteStr = canEditNiveaux ? colonnes[2] : colonnes[1];

            if (!nom) continue;

            if (window.AppCore.joueurs.find(j => j.nom.toLowerCase() === nom.toLowerCase())) {
                continue;
            }

            const niveau = canEditNiveaux ? parseFloat(niveauStr) : 5;
            const posteRaw = (posteStr || '').toLowerCase().trim();
            const posteNormalise = posteRaw
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '_');

            const aliasPoste = {
                arriere: 'arriere',
                arriere_def: 'arriere',
                defenseur: 'arriere',
                defense: 'arriere',
                avant: 'avant',
                attaque: 'avant',
                attaquant: 'avant',
                ailier: 'ailier',
                wing: 'ailier',
                centre: 'centre',
                center: 'centre',
                pivot: 'pivot',
                piv: 'pivot',
                arr_centre: 'arr_centre',
                arrcentre: 'arr_centre',
                arriere_centre: 'arr_centre',
                arrierecentre: 'arr_centre',
                indifferent: 'indifferent',
                polyvalent: 'indifferent',
                '': 'indifferent'
            };

            const posteValide = aliasPoste[posteNormalise] || 'indifferent';
            const niveauValide = (niveau >= 1 && niveau <= 10) ? niveau : 5;

            const nouveauJoueur = { nom, niveau: niveauValide, poste: posteValide, actif: true };

            try {
                if (window.AppCore.isOnline) {
                    if (_safeModeEnabled()) {
                        const { data, error } = await window.AppCore.supabaseClient.rpc('api_players_insert_safe', {
                            p_club: _clubSlug(),
                            p_nom: nom,
                            p_poste: posteValide,
                            p_groupe: null,
                            p_actif: true
                        });
                        if (error) throw error;
                        nouveauJoueur.id = typeof data === 'number' ? data : (Date.now() + ajouts);
                    } else {
                        const tableName = window.AppStorage.getTableName();
                        const { data, error } = await window.AppCore.supabaseClient
                            .from(tableName)
                            .insert([nouveauJoueur])
                            .select();

                        if (error) throw error;
                        nouveauJoueur.id = data[0].id;
                    }
                } else {
                    nouveauJoueur.id = Date.now() + ajouts;
                }

                window.AppCore.joueurs.push(nouveauJoueur);
                ajouts++;
            } catch (error) {
                console.error('Erreur import joueur:', nom, error);
            }
        }

        if (window.afficherJoueurs) window.afficherJoueurs();
        window.AppCore.updateStatus(`Connecte (${window.AppCore.joueurs.length} joueurs)`, 'connected');
        window.AppCore.showToast(`${ajouts} joueur(s) importe(s) avec succes`);
    };
    reader.readAsText(fichier, 'utf-8');
}

// === EXPORT DES FONCTIONS ===
window.AppPlayers = {
    ajouterJoueur,
    supprimerJoueur,
    modifierJoueur,
    exporterJoueurs,
    importerJoueurs
};
