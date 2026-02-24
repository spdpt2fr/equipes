// ===================================================================
// CORE.JS - Configuration et Variables Globales
// Module central de l'application équipes
// ===================================================================

// === CONFIGURATION SUPABASE ===
const SUPABASE_URL = 'https://vfowenxzpnexcymlruru.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qiyT6xSxc_ERIIQKQSyw9Q_X3Zdz2Ja';
// === VARIABLES GLOBALES ===
let supabaseClient;
let joueurs = [];
let equipes = [];
let clubs = [];
let clubActuel = null;
let isOnline = false;
let afficherTotal = true;
let triJoueurs = 'alpha'; // Par défaut alphabétique
let triEquipes = 'alpha'; // Tri pour les équipes
let searchTerm = '';

// === FONCTIONS UTILITAIRES ===
function updateStatus(message, className) {
    const status = document.getElementById('status');
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
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
}

// === EXPORT POUR AUTRES MODULES ===
// Variables globales disponibles via window
window.AppCore = {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
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
    updateStatus,
    showToast
};
