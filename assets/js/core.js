// ===================================================================
// CORE.JS - Configuration et Variables Globales
// Module central de l'application équipes
// ===================================================================

// === CONFIGURATION SUPABASE ===
const SUPABASE_URL = 'https://qsbdzyhxppdbtsikhozp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzYmR6eWh4cHBkYnRzaWtob3pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0NzI5OTYsImV4cCI6MjA2NzA0ODk5Nn0.kanu7GfIr-qDtd3wcSmDbjEMK9VYX4o9HdG4cD0rcus';

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
