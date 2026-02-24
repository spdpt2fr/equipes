// ===================================================================
// PLAYERS.JS - CRUD Joueurs
// Module de gestion des joueurs (Create, Read, Update, Delete)
// ===================================================================

// === AJOUTER JOUEUR ===
async function ajouterJoueur() {
    const nom = document.getElementById('nom').value.trim();
    const niveau = parseInt(document.getElementById('niveau').value);
    const poste = document.getElementById('poste').value;
    const groupe = parseInt(document.getElementById('groupe').value) || null;

    if (!nom) {
        window.AppCore.showToast('Veuillez saisir un nom de joueur', true);
        return;
    }

    if (!niveau || niveau < 1 || niveau > 10) {
        window.AppCore.showToast('Le niveau doit être entre 1 et 10', true);
        return;
    }

    // Vérifier si le joueur existe déjà
    if (window.AppCore.joueurs.find(j => j.nom.toLowerCase() === nom.toLowerCase())) {
        window.AppCore.showToast('Ce joueur existe déjà', true);
        return;
    }

    const nouveauJoueur = { nom, niveau, poste, groupe, actif: true };

    try {
        if (window.AppCore.isOnline) {
            const tableName = window.AppStorage.getTableName();
            console.log(`Ajout dans la table: ${tableName}`);
            
            const { data, error } = await window.AppCore.supabaseClient
                .from(tableName)
                .insert([nouveauJoueur])
                .select();
            
            if (error) throw error;
            
            nouveauJoueur.id = data[0].id;
            window.AppCore.showToast(`Joueur ${nom} ajouté et synchronisé !`);
        } else {
            nouveauJoueur.id = Date.now();
            window.AppCore.showToast(`Joueur ${nom} ajouté (mode hors ligne)`);
        }

        window.AppCore.joueurs.push(nouveauJoueur);
        if (window.afficherJoueurs) window.afficherJoueurs();
        window.AppCore.updateStatus(`🟢 Connecté (${window.AppCore.joueurs.length} joueurs - ${window.AppCore.clubActuel.nom})`, 'connected');

        // Reset form
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
    if (!confirm("Supprimer ce joueur ?")) return;
    
    const joueur = window.AppCore.joueurs[index];
    const nom = joueur.nom;

    try {
        if (window.AppCore.isOnline && joueur.id) {
            const tableName = window.AppStorage.getTableName();
            console.log(`Suppression de la table: ${tableName}`);
            
            const { error } = await window.AppCore.supabaseClient
                .from(tableName)
                .delete()
                .eq('id', joueur.id);
            
            if (error) throw error;
            window.AppCore.showToast(`Joueur ${nom} supprimé de la base !`);
        } else {
            window.AppCore.showToast(`Joueur ${nom} supprimé (mode hors ligne)`);
        }
        
        window.AppCore.joueurs.splice(index, 1);
        if (window.afficherJoueurs) window.afficherJoueurs();
        window.AppCore.updateStatus(`🟢 Connecté (${window.AppCore.joueurs.length} joueurs - ${window.AppCore.clubActuel.nom})`, 'connected');
        
    } catch (error) {
        console.error('Erreur suppression:', error);
        window.AppCore.showToast('Erreur: ' + error.message, true);
    }
}

// === MODIFIER JOUEUR ===
async function modifierJoueur(index, champ, valeur) {
    const joueur = window.AppCore.joueurs[index];
    const ancienneValeur = joueur[champ];

    if (champ === 'nom') {
        const nouveauNom = valeur.trim();
        if (!nouveauNom) {
            window.AppCore.showToast('Le nom ne peut pas être vide', true);
            if (window.afficherJoueurs) window.afficherJoueurs();
            return;
        }
        const nomExiste = window.AppCore.joueurs.some((j, i) => i !== index && j.nom.toLowerCase() === nouveauNom.toLowerCase());
        if (nomExiste) {
            window.AppCore.showToast('Ce nom existe déjà', true);
            if (window.afficherJoueurs) window.afficherJoueurs();
            return;
        }
        joueur[champ] = nouveauNom;
        window.AppCore.showToast(`Nom modifié : ${ancienneValeur} → ${nouveauNom}`);
    } else if (champ === 'niveau') {
        const niveau = parseInt(valeur);
        if (niveau < 1 || niveau > 10) {
            window.AppCore.showToast('Le niveau doit être entre 1 et 10', true);
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

    // Synchroniser avec Supabase si en ligne
    try {
        if (window.AppCore.isOnline && joueur.id) {
            const tableName = window.AppStorage.getTableName();
            console.log(`Modification dans la table: ${tableName}`);
            
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
    } catch (error) {
        console.error('Erreur synchronisation modification:', error);
        window.AppCore.showToast('Modification locale OK, sync échouée', true);
    }

    if (window.afficherJoueurs) window.afficherJoueurs();
    
    // Si des équipes existent, les mettre à jour aussi
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
        window.AppCore.showToast("Aucun joueur à exporter", true);
        return;
    }

    const header = 'nom,niveau,poste,groupe,actif';
    const contenu = [
        header,
        ...window.AppCore.joueurs.map(j => `${j.nom},${j.niveau},${j.poste},${j.groupe ?? ''},${j.actif ? 'true' : 'false'}`)
    ].join('\n');
    const blob = new Blob([contenu], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = "joueurs_exportes.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    window.AppCore.showToast("Joueurs exportés avec succès");
}

// === IMPORT JOUEURS ===
async function importerJoueurs() {
    const fichier = document.getElementById('fichierJoueurs').files[0];
    if (!fichier) {
        window.AppCore.showToast("Aucun fichier sélectionné", true);
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(event) {
        let ajouts = 0;
        const lignes = event.target.result.replace(/\r/g, '').split('\n');
        
        for (const ligne of lignes) {
            const cleanLine = ligne.replace(/^\uFEFF/, '').trim();
            if (!cleanLine) continue;

            const sep = cleanLine.includes(';') ? ';' : ',';
            const [nom, niveauStr, posteStr] = cleanLine.split(sep).map(x => x.trim());

            if (!nom) continue;
            
            if (window.AppCore.joueurs.find(j => j.nom.toLowerCase() === nom.toLowerCase())) {
                console.log(`Joueur ${nom} existe déjà, ignoré`);
                continue;
            }
            
            const niveau = parseInt(niveauStr);
            const posteRaw = (posteStr || "").toLowerCase().trim();
            const posteNormalise = posteRaw
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '_');
            const aliasPoste = {
                'arriere': 'arriere',
                'arriere_def': 'arriere',
                'defenseur': 'arriere',
                'defense': 'arriere',
                'avant': 'avant',
                'attaque': 'avant',
                'attaquant': 'avant',
                'ailier': 'ailier',
                'wing': 'ailier',
                'centre': 'centre',
                'center': 'centre',
                'pivot': 'pivot',
                'piv': 'pivot',
                'arr_centre': 'arr_centre',
                'arrcentre': 'arr_centre',
                'arriere_centre': 'arr_centre',
                'arrierecentre': 'arr_centre',
                'indifferent': 'indifferent',
                'polyvalent': 'indifferent',
                '': 'indifferent'
            };
            const posteValide = aliasPoste[posteNormalise] || 'indifferent';
            const niveauValide = (niveau >= 1 && niveau <= 10) ? niveau : 5;

            const nouveauJoueur = { nom, niveau: niveauValide, poste: posteValide, actif: true };

            try {
                if (window.AppCore.isOnline) {
                    const tableName = window.AppStorage.getTableName();
                    const { data, error } = await window.AppCore.supabaseClient
                        .from(tableName)
                        .insert([nouveauJoueur])
                        .select();
                    
                    if (error) throw error;
                    nouveauJoueur.id = data[0].id;
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
        window.AppCore.updateStatus(`🟢 Connecté (${window.AppCore.joueurs.length} joueurs)`, 'connected');
        window.AppCore.showToast(`${ajouts} joueur(s) importé(s) avec succès`);
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
