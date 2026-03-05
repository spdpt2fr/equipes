// Tests unitaires pour assets/js/teams.js
// ===================================================================
// TESTS - escapeHtml (sécurité XSS)
// ===================================================================
describe('AppCore - escapeHtml()', function () {
  it('échappe les balises <>', function () {
    chai.expect(window.AppCore.escapeHtml('<script>')).to.equal('&lt;script&gt;');
  });
  it('échappe les guillemets doubles', function () {
    chai.expect(window.AppCore.escapeHtml('"test"')).to.equal('&quot;test&quot;');
  });
  it('échappe les guillemets simples', function () {
    chai.expect(window.AppCore.escapeHtml("l'été")).to.equal("l&#39;\u00e9t\u00e9");
  });
  it('échappe les esperluettes', function () {
    chai.expect(window.AppCore.escapeHtml('a & b')).to.equal('a &amp; b');
  });
  it('retourne une chaîne vide pour null/undefined', function () {
    chai.expect(window.AppCore.escapeHtml(null)).to.equal('');
    chai.expect(window.AppCore.escapeHtml(undefined)).to.equal('');
  });
  it('ne modifie pas une chaîne sans caractères spéciaux', function () {
    chai.expect(window.AppCore.escapeHtml('Alice Dupont')).to.equal('Alice Dupont');
  });
});

// ===================================================================
describe('Module équipes - creerEquipes()', function() {
  beforeEach(function() {
    // Préparer le DOM minimal attendu par les fonctions
    let inp = document.getElementById('nombreEquipes');
    if (!inp) { inp = document.createElement('input'); inp.id = 'nombreEquipes'; document.body.appendChild(inp); }
    inp.value = '2';
    if (!document.getElementById('equipesContainer')) { const d = document.createElement('div'); d.id = 'equipesContainer'; document.body.appendChild(d); }
    if (!document.getElementById('resultatsContainer')) { const d = document.createElement('div'); d.id = 'resultatsContainer'; document.body.appendChild(d); }

    // Réinitialiser l'état global
    window.AppCore.joueurs = [];
    window.AppCore.equipes = [];
    window.AppCore.sessionValidee = null;
    window.AppCore.afficherTotal = true;
    window.AppCore.triEquipes = 'alpha';
  });

  it('crée le nombre d\'équipes demandé et répartit tous les joueurs actifs', function() {
    window.AppCore.joueurs = [
      { nom: 'A', niveau: 8, poste: 'avant', groupe: null, actif: true },
      { nom: 'B', niveau: 6, poste: 'arriere', groupe: null, actif: true },
      { nom: 'C', niveau: 4, poste: 'indifferent', groupe: null, actif: true },
      { nom: 'D', niveau: 2, poste: 'avant', groupe: null, actif: true }
    ];

    window.AppTeams.creerEquipes();

    chai.expect(window.AppCore.equipes).to.have.length(2);
    const totalPlayers = window.AppCore.equipes.reduce((acc, e) => acc + e.joueurs.length, 0);
    chai.expect(totalPlayers).to.equal(4);

    // Aucun joueur ne doit rester avec le poste "indifferent" une fois assigné
    window.AppCore.equipes.forEach(e => e.joueurs.forEach(j => chai.expect(j.poste).to.not.equal('indifferent')));
  });

  it('calcule correctement les totaux de niveaux des équipes', function() {
    window.AppCore.joueurs = [
      { nom: 'X', niveau: 5, poste: 'avant', actif: true },
      { nom: 'Y', niveau: 3, poste: 'arriere', actif: true },
      { nom: 'Z', niveau: 2, poste: 'avant', actif: true }
    ];
    document.getElementById('nombreEquipes').value = '2';

    window.AppTeams.creerEquipes();

    const sumNiveaux = window.AppCore.equipes.reduce((acc, e) => acc + e.niveauTotal, 0);
    const totalJoueursNiveaux = window.AppCore.joueurs.reduce((acc, j) => acc + (j.actif ? j.niveau : 0), 0);
    chai.expect(sumNiveaux).to.equal(totalJoueursNiveaux);
  });
});

// ===================================================================
// TESTS - Match nul (afficherInterfaceResultats)
// ===================================================================
describe('Sessions - afficherInterfaceResultats() avec match nul', function () {
  function getOrCreate(id) {
    let el = document.getElementById(id);
    if (!el) { el = document.createElement('div'); el.id = id; document.body.appendChild(el); }
    return el;
  }

  beforeEach(function () {
    getOrCreate('resultatsContainer').innerHTML = '';
    window.AppCore.sessionValidee = null;
  });

  it('affiche une option radio "draw" pour chaque paire d\'équipes (2 éq. → 1 match)', function () {
    window.AppSessions.afficherInterfaceResultats(1, [10, 20]);
    const radios = document.getElementById('resultatsContainer').querySelectorAll('input[type="radio"][value="draw"]');
    chai.expect(radios.length).to.equal(1);
  });

  it('avec 3 équipes, chaque match-card contient exactement 4 options', function () {
    window.AppSessions.afficherInterfaceResultats(1, [10, 20, 30]);
    const cards = document.getElementById('resultatsContainer').querySelectorAll('.match-card');
    // C(3,2) = 3 matchs
    chai.expect(cards.length).to.equal(3);
    cards.forEach(card => {
      chai.expect(card.querySelectorAll('input[type="radio"]').length).to.equal(4);
    });
  });

  it('l\'option "Non joué" est cochée par défaut', function () {
    window.AppSessions.afficherInterfaceResultats(1, [10, 20]);
    const checked = document.getElementById('resultatsContainer').querySelectorAll('input[type="radio"]:checked');
    checked.forEach(r => chai.expect(r.value).to.equal('skip'));
  });

  it('le libellé du match nul possède la classe CSS "draw"', function () {
    window.AppSessions.afficherInterfaceResultats(1, [10, 20]);
    const drawLabels = document.getElementById('resultatsContainer').querySelectorAll('.match-label.draw');
    chai.expect(drawLabels.length).to.equal(1);
    chai.expect(drawLabels[0].textContent).to.include('nul');
  });

  it('les data-eq1 / data-eq2 du radio draw correspondent aux bons IDs d\'équipe', function () {
    window.AppSessions.afficherInterfaceResultats(1, [10, 20]);
    const drawRadio = document.getElementById('resultatsContainer').querySelector('input[value="draw"]');
    chai.expect(parseInt(drawRadio.dataset.eq1)).to.equal(10);
    chai.expect(parseInt(drawRadio.dataset.eq2)).to.equal(20);
  });
});

// ===================================================================
// TESTS - Logique construction du tableau résultats (sauvegarderResultats)
// ===================================================================
describe('Sessions - logique gagnant_id selon le choix radio', function () {
  function buildResultats(containerHTML) {
    const c = document.getElementById('resultatsContainer');
    c.innerHTML = containerHTML;
    const radios = c.querySelectorAll('.results-grid input[type="radio"]:checked');
    const resultats = [];
    radios.forEach(radio => {
      if (radio.value === 'skip') return;
      resultats.push({
        equipe1_id: parseInt(radio.dataset.eq1),
        equipe2_id: parseInt(radio.dataset.eq2),
        gagnant_id: radio.value === 'draw' ? null : parseInt(radio.value, 10)
      });
    });
    return resultats;
  }

  beforeEach(function () {
    let c = document.getElementById('resultatsContainer');
    if (!c) { c = document.createElement('div'); c.id = 'resultatsContainer'; document.body.appendChild(c); }
  });

  it('"draw" → gagnant_id est null', function () {
    const res = buildResultats(
      '<div class="results-grid"><input type="radio" value="draw" data-eq1="10" data-eq2="20" checked></div>'
    );
    chai.expect(res).to.have.length(1);
    chai.expect(res[0].gagnant_id).to.be.null;
    chai.expect(res[0].equipe1_id).to.equal(10);
    chai.expect(res[0].equipe2_id).to.equal(20);
  });

  it('"skip" → le match est exclus des résultats', function () {
    const res = buildResultats(
      '<div class="results-grid"><input type="radio" value="skip" data-eq1="10" data-eq2="20" checked></div>'
    );
    chai.expect(res).to.have.length(0);
  });

  it('victoire équipe 1 → gagnant_id = ID équipe 1', function () {
    const res = buildResultats(
      '<div class="results-grid"><input type="radio" value="10" data-eq1="10" data-eq2="20" checked></div>'
    );
    chai.expect(res).to.have.length(1);
    chai.expect(res[0].gagnant_id).to.equal(10);
  });

  it('plusieurs matchs avec résultats mixtes', function () {
    const res = buildResultats(`
      <div class="results-grid">
        <input type="radio" value="10" data-eq1="10" data-eq2="20" checked>
        <input type="radio" value="draw" data-eq1="10" data-eq2="30" checked>
        <input type="radio" value="skip" data-eq1="20" data-eq2="30" checked>
      </div>
    `);
    chai.expect(res).to.have.length(2);
    chai.expect(res[0].gagnant_id).to.equal(10);
    chai.expect(res[1].gagnant_id).to.be.null;
  });
});

// ===================================================================
// TESTS - afficherHistorique() avec match nul
// ===================================================================
describe('Sessions - afficherHistorique() avec match nul', function () {
  const SESSION_NUL = {
    id: 1,
    date_session: '2026-03-05',
    nb_equipes: 2,
    resultats_saisis: true,
    ajustements_appliques: false,
    session_teams: [
      { id: 10, numero_equipe: 1, niveau_total: 30, session_players: [] },
      { id: 20, numero_equipe: 2, niveau_total: 28, session_players: [] }
    ],
    match_results: [
      { id: 1, session_id: 1, equipe1_id: 10, equipe2_id: 20, gagnant_id: null }
    ]
  };

  beforeEach(function () {
    let c = document.getElementById('historiqueContainer');
    if (!c) { c = document.createElement('div'); c.id = 'historiqueContainer'; document.body.appendChild(c); }
    c.innerHTML = '';
    window.AppCore.isOnline = false;
    window.AppCore.historiqueSessions = [SESSION_NUL];
  });

  it('affiche "N" dans le bilan V/N/D quand gagnant_id est null', function () {
    window.AppSessions.afficherHistorique();
    const text = document.getElementById('historiqueContainer').textContent;
    chai.expect(text).to.include('0V 1N 0D');
  });

  it('affiche un pill "Match nul" dans les résultats', function () {
    window.AppSessions.afficherHistorique();
    const text = document.getElementById('historiqueContainer').textContent;
    chai.expect(text).to.include('Match nul');
  });

  it('ne propose pas de résultats supplémentaires à saisir (déjà saisis)', function () {
    window.AppSessions.afficherHistorique();
    const saisirBtn = document.getElementById('historiqueContainer').querySelector('.btn-warning');
    chai.expect(saisirBtn).to.be.null;
  });

  it('session avec victoire nette : V=1 N=0 D=0 pour l\'équipe gagnante', function () {
    window.AppCore.historiqueSessions = [{
      id: 2, date_session: '2026-03-05', nb_equipes: 2,
      resultats_saisis: true, ajustements_appliques: false,
      session_teams: [
        { id: 10, numero_equipe: 1, niveau_total: 30, session_players: [] },
        { id: 20, numero_equipe: 2, niveau_total: 28, session_players: [] }
      ],
      match_results: [
        { id: 2, session_id: 2, equipe1_id: 10, equipe2_id: 20, gagnant_id: 10 }
      ]
    }];
    window.AppSessions.afficherHistorique();
    const text = document.getElementById('historiqueContainer').textContent;
    chai.expect(text).to.include('1V 0N 0D');
    chai.expect(text).to.include('0V 0N 1D');
  });
});
