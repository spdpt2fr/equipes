// ===================================================================
// CORE.JS - Configuration et Variables Globales
// Module central de l'application equipes
// ===================================================================

// === CONFIGURATION SUPABASE ===
const SUPABASE_URL = 'https://vfowenxzpnexcymlruru.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qiyT6xSxc_ERIIQKQSyw9Q_X3Zdz2Ja';
const ADMIN_AUTH_KEY = 'hockeySub_adminAuth';

// === VARIABLES GLOBALES ===
let supabaseClient;
let joueurs = [];
let equipes = [];
let clubs = [];
let clubActuel = null;
let isOnline = false;
let afficherTotal = true;
let triJoueurs = 'alpha';
let triEquipes = 'alpha';
let searchTerm = '';
let sessionValidee = null;
let historiqueSessions = [];
let currentUser = null;
let currentRole = 'selecteur'; // Le role admin sera attribue par le flow auth dans init()

let levelSecurityEnforced = false;
let propositionOriginale = null;
let historiquePropositions = [];
let methodeConstitution = 'niveauTotal'; // 'niveauTotal' | 'scoreCompetitif'

// === FONCTIONS UTILITAIRES ===
function updateStatus(message, className) {
    const status = document.getElementById('status');
    if (!status) return;
    status.textContent = message;
    status.className = 'status ' + className;
}

function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

function isAdmin() {
    return window.AppCore.currentRole === 'admin';
}

function isSelecteur() {
    return window.AppCore.currentRole === 'selecteur';
}

function canViewNiveaux() {
    return isAdmin();
}

function canEditNiveaux() {
    return isAdmin();
}

function getClubSlug() {
    if (!window.AppCore.clubActuel || !window.AppCore.clubActuel.nom) return 'grenoble';
    return window.AppCore.clubActuel.nom.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_');
}

// Echapper les caracteres HTML pour eviter les injections XSS
function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// === EXPORT POUR AUTRES MODULES ===
window.AppCore = {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    ADMIN_AUTH_KEY,
    supabaseClient,
    joueurs,
    equipes,
    clubs,
    clubActuel,
    isOnline,
    afficherTotal,
    triJoueurs,
    triEquipes,
    searchTerm,
    sessionValidee,
    historiqueSessions,
    currentUser,
    currentRole,
    levelSecurityEnforced,
    propositionOriginale,
    historiquePropositions,
    methodeConstitution,
    updateStatus,
    showToast,
    isAdmin,
    isSelecteur,
    canViewNiveaux,
    canEditNiveaux,
    getClubSlug,
    escapeHtml
};
