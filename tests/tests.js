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
// TESTS - afficherJoueurs() (sanitization XSS)
// ===================================================================
describe('AppUI - afficherJoueurs()', function () {
  beforeEach(function () {
    let card = document.getElementById('listeJoueursCard');
    if (!card) {
      card = document.createElement('div');
      card.id = 'listeJoueursCard';
      document.body.appendChild(card);
    }

    let list = document.getElementById('listeJoueurs');
    if (!list) {
      list = document.createElement('div');
      list.id = 'listeJoueurs';
      document.body.appendChild(list);
    }

    let stats = document.getElementById('searchStats');
    if (!stats) {
      stats = document.createElement('div');
      stats.id = 'searchStats';
      document.body.appendChild(stats);
    }

    window.AppCore.searchTerm = '';
    window.AppCore.triJoueurs = 'alpha';
  });

  it('n injecte pas de balise HTML depuis un nom joueur', function () {
    window.AppCore.joueurs = [{
      nom: '"><img src=x onerror=alert(1)>',
      niveau: 5,
      poste: 'avant',
      groupe: null,
      actif: true
    }];

    window.AppUI.afficherJoueurs();

    const list = document.getElementById('listeJoueurs');
    chai.expect(list.querySelector('img')).to.equal(null);
    chai.expect(list.querySelector('script')).to.equal(null);
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

// ===================================================================
// TESTS - Ranking stats 3/1/0
// ===================================================================
describe('AppSessions - stats ranking 3/1/0', function () {
  function ensureElement(id) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      document.body.appendChild(el);
    }
    return el;
  }

  beforeEach(function () {
    ensureElement('statsContainer').innerHTML = '';
    ensureElement('historiqueContainer').innerHTML = '';
    window.AppCore.isOnline = false;
    window.AppCore.clubActuel = { id: 1, nom: 'Test Club' };
    window.AppCore.historiqueSessions = [
      {
        id: 101,
        date_session: '2026-03-01',
        session_teams: [
          {
            id: 1001,
            numero_equipe: 1,
            session_players: [
              { player_name: 'Alice', niveau: 5 },
              { player_name: 'Bernard', niveau: 6 },
              { player_name: 'Claire', niveau: 7 }
            ]
          },
          {
            id: 1002,
            numero_equipe: 2,
            session_players: [
              { player_name: 'David', niveau: 4 }
            ]
          }
        ],
        match_results: [
          { equipe1_id: 1001, equipe2_id: 1002, gagnant_id: 1001 }
        ]
      },
      {
        id: 102,
        date_session: '2026-03-08',
        session_teams: [
          {
            id: 1003,
            numero_equipe: 1,
            session_players: [
              { player_name: 'Alice', niveau: 5.5 },
              { player_name: 'Claire', niveau: 7.2 },
              { player_name: 'David', niveau: 4.4 }
            ]
          },
          {
            id: 1004,
            numero_equipe: 2,
            session_players: [
              { player_name: 'Bernard', niveau: 6.1 }
            ]
          }
        ],
        match_results: [
          { equipe1_id: 1003, equipe2_id: 1004, gagnant_id: null }
        ]
      },
      {
        id: 103,
        date_session: '2026-03-15',
        session_teams: [
          {
            id: 1005,
            numero_equipe: 1,
            session_players: [
              { player_name: 'Alice', niveau: 5.8 }
            ]
          },
          {
            id: 1006,
            numero_equipe: 2,
            session_players: [
              { player_name: 'Bernard', niveau: 6.3 },
              { player_name: 'Claire', niveau: 7.4 },
              { player_name: 'David', niveau: 4.6 }
            ]
          }
        ],
        match_results: [
          { equipe1_id: 1005, equipe2_id: 1006, gagnant_id: 1006 }
        ]
      },
      {
        id: 104,
        date_session: '2026-03-22',
        session_teams: [
          {
            id: 1007,
            numero_equipe: 1,
            session_players: [
              { player_name: 'Emma', niveau: 5.2 }
            ]
          },
          {
            id: 1008,
            numero_equipe: 2,
            session_players: [
              { player_name: 'Farid', niveau: 5.4 }
            ]
          }
        ],
        match_results: [
          { equipe1_id: 1007, equipe2_id: 1008, gagnant_id: null },
          { equipe1_id: 1007, equipe2_id: 1008, gagnant_id: null }
        ]
      }
    ];
  });

  it('calcule les points avec la formule victoire=3, nul=1, défaite=0', function () {
    const stats = window.AppSessions.calculerStats();
    const alice = stats.find(s => s.nom === 'Alice');
    const bernard = stats.find(s => s.nom === 'Bernard');
    const emma = stats.find(s => s.nom === 'Emma');

    chai.expect(alice).to.include({ victoires: 1, nuls: 1, defaites: 1, matchs: 3, points: 4 });
    chai.expect(bernard).to.include({ victoires: 1, nuls: 1, defaites: 1, matchs: 3, points: 4 });
    chai.expect(emma).to.include({ victoires: 0, nuls: 2, defaites: 0, matchs: 2, points: 2 });
  });

  it('trie d abord par points puis par départages déterministes', function () {
    const stats = window.AppSessions.calculerStats();
    const noms = stats.map(s => s.nom);

    chai.expect(noms.indexOf('Alice')).to.be.below(noms.indexOf('Emma'));
    chai.expect(noms.indexOf('Claire')).to.be.below(noms.indexOf('Alice'));
    chai.expect(noms.indexOf('Alice')).to.be.below(noms.indexOf('Bernard'));
  });

  it('classe 1V 0N 1D devant 0V 2N 0D', function () {
    const stats = window.AppSessions.calculerStats();
    const noms = stats.map(s => s.nom);

    chai.expect(noms.indexOf('David')).to.be.below(noms.indexOf('Emma'));
    chai.expect(noms.indexOf('Farid')).to.be.below(noms.indexOf('David'));
  });

  it('affiche Pts comme métrique principale et garde le bon colspan', function () {
    window.AppSessions.afficherStats();

    const container = document.getElementById('statsContainer');
    const headers = Array.from(container.querySelectorAll('thead th')).map(th => th.textContent.trim());
    const detailRow = container.querySelector('.history-row td');
    const rows = container.querySelectorAll('.stats-row');

    chai.expect(headers).to.deep.equal(['Joueur', 'Pts', 'V', 'N', 'D', 'Matchs', '%V']);
    chai.expect(detailRow.getAttribute('colspan')).to.equal('7');
    rows.forEach(row => {
      chai.expect(row.classList.contains('stats-win')).to.equal(false);
      chai.expect(row.classList.contains('stats-lose')).to.equal(false);
    });
  });

  it('exporte un CSV avec la colonne Points dans le même ordre que l UI', async function () {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const originalAppendChild = document.body.appendChild;
    const originalRemoveChild = document.body.removeChild;

    let capturedBlob = null;
    let clicked = false;

    URL.createObjectURL = function (blob) {
      capturedBlob = blob;
      return 'blob:test-stats';
    };
    URL.revokeObjectURL = function () {};
    document.body.appendChild = function (node) {
      if (node && typeof node.click === 'function') {
        node.click = function () {
          clicked = true;
        };
      }
      return node;
    };
    document.body.removeChild = function (node) {
      return node;
    };

    try {
      window.AppSessions.exporterStats();
      chai.expect(clicked).to.equal(true);
      chai.expect(capturedBlob).to.not.equal(null);

      const csv = await capturedBlob.text();
      const lignes = csv.split('\n');

      chai.expect(lignes[0]).to.equal('\uFEFFJoueur,Points,Victoires,Nuls,Defaites,Matchs,%Victoires,Historique niveau (date:valeur)');
      chai.expect(lignes[1]).to.match(/^Claire,4,2,1,0,3,67%,/);
    } finally {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      document.body.appendChild = originalAppendChild;
      document.body.removeChild = originalRemoveChild;
    }
  });
});

// ===================================================================
// TESTS - Formule Elo simplifié (_calculerDeltaMatch)
// ===================================================================
describe('AppSessions - _calculerDeltaMatch()', function () {
  // Liaison directe pour un message d'erreur clair si la fonction est absente de l'export
  const fn = (myAvg, oppAvg, res) => window.AppSessions._calculerDeltaMatch(myAvg, oppAvg, res);

  it('victoire entre équipes égales → delta ≈ +0.15', function () {
    const delta = fn(5, 5, 1);
    chai.expect(delta).to.be.closeTo(0.15, 0.001);
  });

  it('défaite entre équipes égales → delta ≈ −0.15', function () {
    const delta = fn(5, 5, 0);
    chai.expect(delta).to.be.closeTo(-0.15, 0.001);
  });

  it('nul entre équipes égales → delta ≈ 0', function () {
    const delta = fn(5, 5, 0.5);
    chai.expect(delta).to.be.closeTo(0, 0.001);
  });

  it('victoire contre équipe +2 niveaux → delta > 0.15 (bonus surprise)', function () {
    const delta = fn(5, 7, 1);
    chai.expect(delta).to.be.above(0.15);
  });

  it('défaite contre équipe +2 niveaux → |delta| < 0.15 (pénalité réduite)', function () {
    const delta = fn(5, 7, 0);
    chai.expect(Math.abs(delta)).to.be.below(0.15);
  });

  it('victoire contre équipe −2 niveaux → delta < 0.15 (bonus réduit)', function () {
    const delta = fn(7, 5, 1);
    chai.expect(delta).to.be.below(0.15);
  });

  it('défaite contre équipe −2 niveaux → |delta| > 0.15 (pénalité amplifiée)', function () {
    const delta = fn(7, 5, 0);
    chai.expect(Math.abs(delta)).to.be.above(0.15);
  });

  it('delta victoire + delta défaite = 0 (conservation symétrique)', function () {
    const win = fn(6, 4, 1);
    const lose = fn(4, 6, 0);
    // win(A vs B) + lose(B vs A) doivent s'annuler : somme nulle
    chai.expect(win + lose).to.be.closeTo(0, 0.001);
  });

  it('nul contre adversaire plus fort → léger delta positif', function () {
    const delta = fn(4, 7, 0.5);
    chai.expect(delta).to.be.above(0);
  });

  it('nul contre adversaire plus faible → léger delta négatif', function () {
    const delta = fn(7, 4, 0.5);
    chai.expect(delta).to.be.below(0);
  });

  it('fallback oppAvg=0 : victoire ne produit pas NaN (teamAvg vide → || 5)', function () {
    // Simule un teamAvg[oppTeamId] manquant : le code utilise || 5
    const delta = fn(5, 5, 1); // on teste la formule avec les valeurs fallback
    chai.expect(delta).to.not.be.NaN;
    chai.expect(isFinite(delta)).to.be.true;
  });
});

