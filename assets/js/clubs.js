// ===================================================================
// CLUBS.JS - Gestion des Clubs
// Module de gestion du switch entre clubs
// ===================================================================

// === CHANGEMENT DE CLUB ===
async function changerClub(nomClub) {
    try {
        if (!nomClub) {
            const selectClub = document.getElementById('clubSelect');
            nomClub = selectClub ? selectClub.value : null;
        }

        window.AppCore.clubActuel = window.AppCore.clubs.find(c => c.nom.toLowerCase() === nomClub);

        if (!window.AppCore.clubActuel) {
            throw new Error(`Club "${nomClub}" non trouve`);
        }

        window.AppCore.equipes = [];
        window.AppCore.sessionValidee = null;

        const equipesContainer = document.getElementById('equipesContainer');
        if (equipesContainer) equipesContainer.innerHTML = '';

        const resultatsContainer = document.getElementById('resultatsContainer');
        if (resultatsContainer) resultatsContainer.innerHTML = '';

        window.AppStorage.sauvegarderClub(nomClub);

        await window.AppStorage.chargerJoueurs();

        if (window.AppUI && window.AppUI.appliquerPermissionsUI) {
            window.AppUI.appliquerPermissionsUI();
        }

        if (window.afficherJoueurs) window.afficherJoueurs();

        if (window.AppSessions && window.AppSessions.chargerHistorique) {
            await window.AppSessions.chargerHistorique();
        }

        window.AppCore.updateStatus(`Connecte (${window.AppCore.joueurs.length} joueurs - ${window.AppCore.clubActuel.nom})`, 'connected');
        window.AppCore.showToast(`Bascule vers le club ${window.AppCore.clubActuel.nom}`);
        console.log(`Club change vers ${window.AppCore.clubActuel.nom}`);
    } catch (error) {
        console.error('Erreur changement club:', error);
        window.AppCore.showToast('Erreur changement de club: ' + error.message, true);
    }
}

// === AUTHENTIFICATION ADMIN ===
function demanderAuthentification() {
    return new Promise((resolve) => {
        const modal = document.getElementById('loginModal');
        const loginStep = document.getElementById('loginStep');
        const resetStep = document.getElementById('resetStep');
        const passwordInput = document.getElementById('loginPassword');
        const submitBtn = document.getElementById('loginSubmitBtn');
        const cancelBtn = document.getElementById('loginCancelBtn');
        const forgotLink = document.getElementById('forgotPasswordLink');
        const resetCodeInput = document.getElementById('resetCode');
        const resetNewPwdInput = document.getElementById('resetNewPwd');
        const resetConfirmPwdInput = document.getElementById('resetConfirmPwd');
        const resetSubmitBtn = document.getElementById('resetSubmitBtn');
        const resetBackBtn = document.getElementById('resetBackBtn');
        const resetMessage = document.getElementById('resetMessage');

        if (!modal) { resolve('selecteur'); return; }

        modal.style.display = 'flex';
        loginStep.style.display = '';
        resetStep.style.display = 'none';
        passwordInput.value = '';
        passwordInput.focus();

        let isSubmitting = false;

        function cleanup() {
            modal.style.display = 'none';
            submitBtn.removeEventListener('click', handleSubmit);
            cancelBtn.removeEventListener('click', handleCancel);
            forgotLink.removeEventListener('click', handleForgot);
            passwordInput.removeEventListener('keydown', handleEnterLogin);
            if (resetSubmitBtn) resetSubmitBtn.removeEventListener('click', handleReset);
            if (resetBackBtn) resetBackBtn.removeEventListener('click', handleBack);
            if (resetCodeInput) resetCodeInput.removeEventListener('keydown', handleEnterReset);
            if (resetNewPwdInput) resetNewPwdInput.removeEventListener('keydown', handleEnterReset);
            if (resetConfirmPwdInput) resetConfirmPwdInput.removeEventListener('keydown', handleEnterReset);
        }

        async function handleSubmit() {
            if (isSubmitting) return;
            const pwd = passwordInput.value.trim();
            if (!pwd) { window.AppCore.showToast('Saisissez un mot de passe', true); return; }

            isSubmitting = true;
            submitBtn.disabled = true;
            try {
                const { data, error } = await window.AppCore.supabaseClient.rpc('check_admin_password', { pwd });
                if (error) throw error;
                if (data === true) {
                    localStorage.setItem(window.AppCore.ADMIN_AUTH_KEY, 'ok');
                    window.AppCore.currentRole = 'admin';
                    cleanup();
                    resolve('admin');
                } else {
                    window.AppCore.showToast('Mot de passe incorrect', true);
                    passwordInput.value = '';
                    passwordInput.focus();
                }
            } catch (err) {
                console.error('Erreur auth:', err);
                // Fallback offline : accepter localStorage
                if (localStorage.getItem(window.AppCore.ADMIN_AUTH_KEY) === 'ok') {
                    window.AppCore.currentRole = 'admin';
                    window.AppCore.showToast('Mode hors ligne, authentification locale', true);
                    cleanup();
                    resolve('admin');
                } else {
                    window.AppCore.showToast('Erreur de connexion', true);
                }
            } finally {
                isSubmitting = false;
                submitBtn.disabled = false;
            }
        }

        function handleCancel() {
            window.AppCore.currentRole = 'selecteur';
            cleanup();
            resolve('selecteur');
        }

        async function handleForgot(e) {
            e.preventDefault();
            if (isSubmitting) return;
            isSubmitting = true;
            try {
                const { data, error } = await window.AppCore.supabaseClient.rpc('request_password_reset');
                if (error) throw error;
                if (data === 'rate_limited') {
                    window.AppCore.showToast('Veuillez patienter 60 secondes avant de redemander', true);
                    return;
                }
                if (data === 'no_api_key') {
                    window.AppCore.showToast('Service email non configure', true);
                    return;
                }
                loginStep.style.display = 'none';
                resetStep.style.display = '';
                resetMessage.textContent = 'Un code a ete envoye a votre email.';
                resetCodeInput.value = '';
                resetNewPwdInput.value = '';
                resetConfirmPwdInput.value = '';
                resetCodeInput.focus();
                window.AppCore.showToast('Code envoye par email');
            } catch (err) {
                console.error('Erreur reset request:', err);
                window.AppCore.showToast('Erreur envoi du code', true);
            } finally {
                isSubmitting = false;
            }
        }

        async function handleReset() {
            if (isSubmitting) return;
            const code = (resetCodeInput.value || '').trim();
            const newPwd = (resetNewPwdInput.value || '').trim();
            const confirmPwd = (resetConfirmPwdInput.value || '').trim();

            if (!code || code.length !== 6) {
                window.AppCore.showToast('Saisissez le code a 6 chiffres', true);
                return;
            }
            if (newPwd.length < 6) {
                window.AppCore.showToast('Le mot de passe doit faire au moins 6 caracteres', true);
                return;
            }
            if (newPwd !== confirmPwd) {
                window.AppCore.showToast('Les mots de passe ne correspondent pas', true);
                return;
            }

            isSubmitting = true;
            resetSubmitBtn.disabled = true;
            try {
                const { data, error } = await window.AppCore.supabaseClient.rpc('reset_admin_password', { code, new_pwd: newPwd });
                if (error) throw error;
                if (data === true) {
                    window.AppCore.showToast('Mot de passe reinitialise avec succes');
                    // Auto-login
                    localStorage.setItem(window.AppCore.ADMIN_AUTH_KEY, 'ok');
                    window.AppCore.currentRole = 'admin';
                    cleanup();
                    resolve('admin');
                } else {
                    window.AppCore.showToast('Code invalide ou expire', true);
                }
            } catch (err) {
                console.error('Erreur reset:', err);
                window.AppCore.showToast('Erreur reinitialisation', true);
            } finally {
                isSubmitting = false;
                resetSubmitBtn.disabled = false;
            }
        }

        function handleBack() {
            resetStep.style.display = 'none';
            loginStep.style.display = '';
            passwordInput.value = '';
            passwordInput.focus();
        }

        function handleEnterLogin(e) {
            if (e.key === 'Enter') handleSubmit();
        }

        function handleEnterReset(e) {
            if (e.key === 'Enter') handleReset();
        }

        submitBtn.addEventListener('click', handleSubmit);
        cancelBtn.addEventListener('click', handleCancel);
        forgotLink.addEventListener('click', handleForgot);
        passwordInput.addEventListener('keydown', handleEnterLogin);
        if (resetSubmitBtn) resetSubmitBtn.addEventListener('click', handleReset);
        if (resetBackBtn) resetBackBtn.addEventListener('click', handleBack);
        if (resetCodeInput) resetCodeInput.addEventListener('keydown', handleEnterReset);
        if (resetNewPwdInput) resetNewPwdInput.addEventListener('keydown', handleEnterReset);
        if (resetConfirmPwdInput) resetConfirmPwdInput.addEventListener('keydown', handleEnterReset);
    });
}

// === INITIALISATION COMPLETE ===
async function init() {
    try {
        window.AppCore.updateStatus('Connexion...', 'connecting');
        console.log('Initialisation...');

        window.AppCore.supabaseClient = supabase.createClient(window.AppCore.SUPABASE_URL, window.AppCore.SUPABASE_ANON_KEY);
        console.log('Client Supabase cree');

        // Déterminer le rôle
        const urlMode = new URLSearchParams(window.location.search).get('mode');
        if (urlMode === 'selecteur') {
            window.AppCore.currentRole = 'selecteur';
        } else if (localStorage.getItem(window.AppCore.ADMIN_AUTH_KEY) === 'ok') {
            window.AppCore.currentRole = 'admin';
        } else {
            await demanderAuthentification();
        }

        await window.AppStorage.chargerProfilUtilisateur();
        await window.AppStorage.chargerClubs();
        await window.AppStorage.chargerJoueurs();

        window.AppCore.isOnline = true;

        // Sélectionneur : forcer le score compétitif
        if (!window.AppCore.isAdmin()) {
            window.AppCore.methodeConstitution = 'scoreCompetitif';
        }

        if (window.AppUI && window.AppUI.appliquerPermissionsUI) {
            window.AppUI.appliquerPermissionsUI();
        }

        const roleTag = window.AppCore.currentRole === 'admin' ? 'admin'
            : (window.AppCore.currentRole === 'selecteur' ? 'selecteur' : 'operateur');
        window.AppCore.updateStatus(`Connecte (${window.AppCore.joueurs.length} joueurs - ${window.AppCore.clubActuel.nom} - ${roleTag})`, 'connected');
        console.log('Connexion OK, joueurs charges:', window.AppCore.joueurs.length);

        if (window.afficherJoueurs) window.afficherJoueurs();
        window.AppCore.showToast(`Connexion reussie ! Club: ${window.AppCore.clubActuel.nom} (${roleTag})`);

        if (window.AppSessions && window.AppSessions.chargerHistorique) {
            await window.AppSessions.chargerHistorique();
        }
    } catch (error) {
        console.error('Erreur connexion:', error);
        window.AppCore.isOnline = false;
        window.AppCore.updateStatus('Hors ligne', 'offline');
        window.AppCore.showToast('Mode hors ligne - ' + (error.message || 'Connexion impossible'), true);
    }
}

// === EXPORT DES FONCTIONS ===
window.AppClubs = {
    changerClub,
    demanderAuthentification,
    init
};
