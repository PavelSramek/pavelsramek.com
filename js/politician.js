(function(){
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var avatar = document.getElementById('pzAvatar');
  var livesEl = document.getElementById('pzLives');
  var scoreValueEl = document.getElementById('pzScoreValue');
  var scoreBestEl = document.getElementById('pzScoreBest');
  var rankEl = document.getElementById('pzRank');
  var milestoneEl = document.getElementById('pzMilestone');
  var milestoneKickerEl = document.getElementById('pzMilestoneKicker');
  var milestoneNameEl = document.getElementById('pzMilestoneName');
  var milestonePartyEl = document.getElementById('pzMilestoneParty');
  var milestoneQuipEl = document.getElementById('pzMilestoneQuip');
  var startCard = document.getElementById('pzStartCard');
  var startTap = document.getElementById('pzStartTap');
  var overCard = document.getElementById('pzOverCard');
  var finalScoreEl = document.getElementById('pzFinalScore');
  var finalRankEl = document.getElementById('pzFinalRank');
  var retryTap = document.getElementById('pzRetryTap');

  // ---------- content: the "achievements" that fly in from all sides ----------
  var ICONS = [
    { emoji: '🏛️', label: 'Nové náměstí' },
    { emoji: '🚧', label: 'Oprava ulice' },
    { emoji: '🏫', label: 'Oprava školy' },
    { emoji: '🚒', label: 'Ocenění hasičům' },
    { emoji: '📱', label: 'Video o bezpečnosti' },
    { emoji: '🌳', label: 'Nový park' },
    { emoji: '🤝', label: 'Setkání s občany' },
    { emoji: '✂️', label: 'Slavnostní otevření' }
  ];

  // 50 levels = 50 skutečných čelních kandidátů stran do zastupitelstva města
  // Plzně (voby 2026). Pořadí kopíruje kandidátky strana po straně, jen Roman
  // Zarzycký (ANO, primátor) je vyjmutý ze své ANO řady a posazený jako
  // úplně poslední, 50. level — boss level, po jehož dosažení je tempo hry
  // už tak vysoké, že ho reálně nelze "vyhrát", jen se k němu dostat.
  // index 0 (Pavel Šrámek, score 0) je startovní úroveň — nikdy se pro ni
  // nezobrazuje banner, je to jen výchozí stav pod skóre boxem.
  var RANKS = [
    { score: 0,     name: 'Pavel Šrámek',        party: 'Piráti' },
    { score: 60,    name: 'Pavel Bosák',          party: 'Piráti', quip: 'Náměstek primátora. Tempo se pomalu rozjíždí.' },
    { score: 180,   name: 'Daniel Kůs',           party: 'Piráti', quip: 'Radní města Plzně. Agenda přibývá.' },
    { score: 360,   name: 'Jiří Rezek',           party: 'Piráti', quip: 'Místostarosta Plzně 1. Vědecký přístup ke všemu.' },
    { score: 600,   name: 'Marek Habruň',         party: 'Piráti', quip: 'Stavební projektant. Naplánováno do posledního detailu.' },
    { score: 900,   name: 'Tomáš Zalabák',        party: 'Piráti', quip: 'Kandidát na starostu Plzně 2 - Slovany. Tempo houstne.' },
    { score: 1260,  name: 'Martin Holzman',       party: 'Piráti', quip: 'Radní Plzně 1. Studuje i mezi kliknutími.' },
    { score: 1680,  name: 'Martin Kubin',         party: 'Piráti', quip: 'Kontrolní výbor Plzně 4. Logistika musí sedět.' },
    { score: 2160,  name: 'Jana Tomšíková',       party: 'Piráti', quip: 'Učitelka. Žádné dítě jí neuteče, žádná ikonka taky ne.' },
    { score: 2700,  name: 'Radek Krejčí',         party: 'Piráti', quip: 'Moderátor kvízů. Na všechno má odpověď, i na tuhle hru.' },
    { score: 3300,  name: 'Ivana Bubeníčková',    party: 'ANO',    quip: 'Starostka Plzně 1. Konkurence přituhuje.' },
    { score: 3960,  name: 'David Procházka',      party: 'ANO',    quip: 'Starosta Plzně 3. Sousední obvod nespí.' },
    { score: 4680,  name: 'Lucie Kantorová',      party: 'ANO',    quip: 'Radní pro školství. Teď zkouší ona tebe.' },
    { score: 5460,  name: 'Tomáš Soukup',         party: 'ANO',    quip: 'Starosta Plzně 4. Tempo dál roste.' },
    { score: 6300,  name: 'Eliška Bartáková',     party: 'ANO',    quip: 'Radní města Plzně. Agenda houstne.' },
    { score: 7200,  name: 'Vlastimil Gola',       party: 'ANO',    quip: 'Radní magistrátu. Blíž k centru moci.' },
    { score: 8160,  name: 'Jiří Šrámek',          party: 'ANO',    quip: 'Radní pro sociální oblast. Jiný Šrámek, stejné tempo.' },
    { score: 9180,  name: 'Michal Hausner',       party: 'ANO',    quip: 'Starosta Plzně 6 a dobrovolný hasič. Reflexy na místě.' },
    { score: 10260, name: 'Martin Složil',        party: 'ANO',    quip: 'Uvolněný zastupitel. Ty ale zpomalit nemůžeš.' },
    { score: 11400, name: 'Lukáš Hegner',         party: 'ODS',    quip: 'Advokát a zastupitel. Detaily rozhodují.' },
    { score: 12600, name: 'David Šlouf',          party: 'ODS',    quip: 'Vedoucí prodeje. Umí uzavřít i tuhle hru.' },
    { score: 13860, name: 'Martin Baxa',          party: 'ODS',    quip: 'Bývalý primátor. Ví, jak vysoko to jde.' },
    { score: 15180, name: 'Pavel Šindelář',       party: 'ODS',    quip: 'Advokát. Malá chybka, velký důsledek.' },
    { score: 16560, name: 'Lumír Aschenbrenner',  party: 'ODS',    quip: 'Senátor a starosta Slovan. Republiková liga.' },
    { score: 18000, name: 'Veronika Jilichová Nová', party: 'ODS', quip: 'Lékařka. Rychlá diagnóza, rychlé kliky.' },
    { score: 19500, name: 'Lucie Kužílková',      party: 'ODS',    quip: 'Živnostnice. Je na to sama, stejně jako ty teď.' },
    { score: 21060, name: 'Helena Řežábová',      party: 'ODS',    quip: 'Provozní ředitelka. Provoz nesmí stát.' },
    { score: 22680, name: 'Kristýna Nachtmann Švédová', party: 'ODS', quip: 'Ředitelka nadačního fondu. Tempo pro dobrou věc.' },
    { score: 24360, name: 'Zdeněk Mádr',          party: 'ODS',    quip: 'Místostarosta Plzně 4. Blíží se druhá polovina.' },
    { score: 26100, name: 'Tomáš Morávek',        party: 'PRO PLZEŇ', quip: 'Radní pro sport. Teď rozhoduje kondice.' },
    { score: 27900, name: 'Tomáš Kotora',         party: 'PRO PLZEŇ', quip: 'Radní pro bezpečnost. Bez chybičky.' },
    { score: 29760, name: 'Libuše Hubáčková',     party: 'PRO PLZEŇ', quip: 'Zastupitelka na dvou frontách. Stejně jako ty teď.' },
    { score: 31680, name: 'Jiří Uhlík',           party: 'PRO PLZEŇ', quip: 'Kraj i obvod najednou. Multitasking level.' },
    { score: 33660, name: 'Jiří Klečka',          party: 'PRO PLZEŇ', quip: 'Urolog. Přesná ruka, rychlý klik.' },
    { score: 35700, name: 'Jiří Lodr',            party: 'PRO PLZEŇ', quip: 'Emeritní ředitel charity. Trpělivost už tu nepomůže.' },
    { score: 37800, name: 'Štěpán Krňoul',        party: 'PRO PLZEŇ', quip: 'Učitel. Zkouší, jak zvládáš tempo.' },
    { score: 39960, name: 'Roman Andrlík',        party: 'PRO PLZEŇ', quip: 'Místostarosta Slovan. Skoro tři čtvrtiny hotovo.' },
    { score: 42180, name: 'Nikola Juhová',        party: 'PRO PLZEŇ', quip: 'Advokátka na dvou židlích. Přesnost nade vše.' },
    { score: 44460, name: 'Jan Havel',            party: 'PRO PLZEŇ', quip: 'Starosta Lhoty. Poslední zastávka před finišem.' },
    { score: 46800, name: 'Michal Vozobule',      party: 'Chceme Plzeň', quip: 'Učitel a zastupitel. Poslední kolo začíná.' },
    { score: 49200, name: 'Zuzana Buriánová',     party: 'Chceme Plzeň', quip: 'Ředitelka školy. Žádné vyrušování, jen tempo.' },
    { score: 51660, name: 'Ladislav Nový',        party: 'Chceme Plzeň', quip: 'Místostarosta Plzně 3. Skoro doma, skoro rychle jako ty.' },
    { score: 54180, name: 'Petr Suchý',           party: 'Chceme Plzeň', quip: 'Ředitel IT firmy. Rozumí systémům, i tomuhle.' },
    { score: 56760, name: 'Jitka Kylišová',       party: 'Chceme Plzeň', quip: 'Sociální pracovnice. Vytrvalost na prvním místě.' },
    { score: 59400, name: 'Radoslav Škarda',      party: 'Chceme Plzeň', quip: 'Manažer kvality. Žádná chybka neprojde.' },
    { score: 62100, name: 'Petr Šimon',           party: 'Chceme Plzeň', quip: 'Kulturní manažer. Umění je i v tomhle tempu.' },
    { score: 64860, name: 'Ilona Jehličková',     party: 'Chceme Plzeň', quip: 'Pedagožka. Zkouší tvoji pozornost naostro.' },
    { score: 67680, name: 'Jan Fluxa',            party: 'Chceme Plzeň', quip: 'Majitel startupu. Škáluje se i tahle hra.' },
    { score: 70560, name: 'Ondřej Ženíšek',       party: 'Chceme Plzeň', quip: 'Místostarosta Plzně 3. Poslední krok před magistrátem.' },
    { score: 73500, name: 'Roman Zarzycký', party: 'ANO', boss: true,
      quip: '🎥 Vyhrál jsi! Běž na magistrát, buď primátor. (A natoč aspoň 3 videa denně. O všem.)' }
  ];
  var MAX_TIER_SCORE = RANKS[RANKS.length - 1].score;

  var STORAGE_KEY = 'pspolitician_stats_v1';
  function loadHigh(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY);
      if(raw) return JSON.parse(raw).highScore || 0;
    }catch(e){}
    return 0;
  }
  function saveHigh(v){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify({ highScore: v })); }catch(e){}
  }

  var highScore = loadHigh();
  scoreBestEl.textContent = highScore;

  var DIRS = ['n', 'e', 's', 'w'];
  var zones = DIRS.map(function(dir){
    var el = document.getElementById('pzZone' + dir.toUpperCase());
    return {
      dir: dir,
      el: el,
      emojiEl: el.querySelector('.pz-icon-emoji'),
      labelEl: el.querySelector('.pz-icon-label'),
      state: 'idle',       // idle | active | pop | missed
      timeLeft: 0,          // ms remaining while active
      visibleDuration: 0,   // ms this spawn was given, for reference
      resetTimer: 0         // ms remaining in a pop/missed transition
    };
  });

  zones.forEach(function(z){
    z.el.addEventListener('pointerdown', function(e){
      e.preventDefault();
      hitZone(z);
    });
  });

  var active = true;   // host-controlled pause, same convention as the other games
  var playing = false;
  var lives = 3;
  var score = 0;
  var rankIndex = 0;
  var spawnCooldown = 900;
  var scoreBump = 0;

  function difficultyFactor(){
    return Math.min(score / MAX_TIER_SCORE, 1);
  }
  function lerp(a, b, t){ return a + (b - a) * t; }

  function spawnInterval(){ return lerp(1100, 480, difficultyFactor()); }
  function visibleDuration(){ return lerp(1500, 680, difficultyFactor()); }
  function maxConcurrent(){
    var f = difficultyFactor();
    if(f >= 0.6) return 3;
    if(f >= 0.2) return 2;
    return 1;
  }

  function activeCount(){
    var n = 0;
    zones.forEach(function(z){ if(z.state === 'active') n++; });
    return n;
  }

  // ---------- random full-screen placement ----------
  // Bubbles now land anywhere on the display rather than at the 4 compass
  // points. Keep them off the fixed chrome around the edges (backlink,
  // score box, lives HUD, tech-credit corner, the game-switch button) and
  // away from any bubble that's already on screen, retrying a handful of
  // times before just giving up and centering.
  function excludedRects(){
    var w = window.innerWidth, h = window.innerHeight;
    var cw = Math.min(190, w * 0.5);
    var chTop = Math.min(140, h * 0.22);
    var chBacklink = Math.min(70, h * 0.12);
    var chBottom = Math.min(140, h * 0.22);
    var chCorner = Math.min(70, h * 0.12);
    var midW = Math.min(180, w * 0.5);
    var midBand = Math.min(80, h * 0.14);
    return [
      { x1: 0, y1: 0, x2: cw, y2: chBacklink },                    // #backlink
      { x1: w - cw, y1: 0, x2: w, y2: chTop },                     // score box
      { x1: 0, y1: h - chBottom, x2: cw, y2: h },                  // lives HUD
      { x1: w - cw, y1: h - chCorner, x2: w, y2: h },              // tech-credit corner
      { x1: w - midW, y1: h / 2 - midBand, x2: w, y2: h / 2 + midBand } // game-switch button
    ];
  }

  function rectsOverlap(ax1, ay1, ax2, ay2, r){
    return ax1 < r.x2 && ax2 > r.x1 && ay1 < r.y2 && ay2 > r.y1;
  }

  function activeRects(exclude){
    var out = [];
    zones.forEach(function(z){
      if(z !== exclude && (z.state === 'active' || z.state === 'pop') && z.half){
        out.push({ x1: z.cx - z.half, y1: z.cy - z.half, x2: z.cx + z.half, y2: z.cy + z.half });
      }
    });
    return out;
  }

  function randomSpawnPos(size, exclude){
    var w = window.innerWidth, h = window.innerHeight;
    var half = size / 2;
    var pad = 12;
    var minX = pad + half, maxX = Math.max(minX, w - pad - half);
    var minY = pad + half, maxY = Math.max(minY, h - pad - half);
    var rects = excludedRects().concat(activeRects(exclude));
    for(var i = 0; i < 14; i++){
      var x = minX + Math.random() * (maxX - minX);
      var y = minY + Math.random() * (maxY - minY);
      var bad = rects.some(function(r){ return rectsOverlap(x - half, y - half, x + half, y + half, r); });
      if(!bad) return { x: x, y: y };
    }
    return { x: w / 2, y: h / 2 };
  }

  function renderLives(){
    var s = '';
    for(var i = 0; i < 3; i++){ s += i < lives ? '❤️' : '🖤'; }
    livesEl.textContent = s;
  }

  function levelLabel(idx){ return (idx + 1) + '/' + RANKS.length; }

  function renderRank(){
    rankEl.textContent = 'úroveň ' + levelLabel(rankIndex) + ' · ' + RANKS[rankIndex].name;
  }

  function showMilestone(rank){
    milestoneKickerEl.textContent = 'Milník · úroveň ' + levelLabel(rankIndex);
    milestoneNameEl.textContent = rank.name;
    milestonePartyEl.textContent = rank.party || '';
    milestoneQuipEl.textContent = rank.quip || '';
    milestoneQuipEl.classList.toggle('is-hidden', !rank.quip);
    milestoneEl.classList.toggle('boss', !!rank.boss);
    milestoneEl.classList.add('show');
    setTimeout(function(){ milestoneEl.classList.remove('show'); }, rank.boss ? 3200 : 2000);
  }

  function checkRankUp(){
    var newIndex = rankIndex;
    for(var i = RANKS.length - 1; i >= 0; i--){
      if(score >= RANKS[i].score){ newIndex = i; break; }
    }
    if(newIndex > rankIndex){
      rankIndex = newIndex;
      renderRank();
      showMilestone(RANKS[rankIndex]);
    }
  }

  function addScore(points){
    score += points;
    if(score > highScore){ highScore = score; saveHigh(highScore); }
    scoreValueEl.textContent = score;
    scoreBestEl.textContent = highScore;
    scoreBump = 1;
    checkRankUp();
  }

  function pulseAvatar(){
    avatar.classList.remove('hit');
    // restart the animation even if it's already mid-flight
    void avatar.offsetWidth;
    avatar.classList.add('hit');
  }

  function hitZone(z){
    if(z.state !== 'active') return;
    z.state = 'pop';
    z.el.classList.remove('active');
    z.el.classList.add('pop');
    z.resetTimer = 200;
    pulseAvatar();
    addScore(10 + rankIndex * 4);
  }

  function missZone(z){
    z.state = 'missed';
    z.el.classList.remove('active');
    z.el.classList.add('missed');
    z.resetTimer = 240;
    lives--;
    renderLives();
    if(lives <= 0) gameOver();
  }

  function settleZone(z){
    z.state = 'idle';
    z.el.classList.remove('pop', 'missed');
  }

  function trySpawn(){
    if(activeCount() >= maxConcurrent()) return;
    var idle = zones.filter(function(z){ return z.state === 'idle'; });
    if(idle.length === 0) return;
    var z = idle[Math.floor(Math.random() * idle.length)];
    var icon = ICONS[Math.floor(Math.random() * ICONS.length)];
    z.emojiEl.textContent = icon.emoji;
    z.labelEl.textContent = icon.label;

    var size = parseFloat(getComputedStyle(z.el).width) || 100;
    var pos = randomSpawnPos(size, z);
    z.cx = pos.x;
    z.cy = pos.y;
    z.half = size / 2;
    z.el.style.left = pos.x + 'px';
    z.el.style.top = pos.y + 'px';

    z.state = 'active';
    z.visibleDuration = visibleDuration();
    z.timeLeft = z.visibleDuration;
    z.el.classList.add('active');
  }

  function resetZones(){
    zones.forEach(function(z){
      z.state = 'idle';
      z.el.classList.remove('active', 'pop', 'missed');
    });
  }

  function startRound(){
    score = 0;
    lives = 3;
    rankIndex = 0;
    spawnCooldown = 700;
    scoreValueEl.textContent = 0;
    scoreBestEl.textContent = highScore;
    renderLives();
    renderRank();
    resetZones();
    startCard.classList.add('hidden');
    overCard.classList.add('hidden');
    playing = true;
  }

  function gameOver(){
    playing = false;
    resetZones();
    finalScoreEl.textContent = score;
    finalRankEl.textContent = 'dosažená úroveň: ' + levelLabel(rankIndex) + ' · ' + RANKS[rankIndex].name + ' (' + RANKS[rankIndex].party + ')';
    overCard.classList.remove('hidden');
  }

  startTap.addEventListener('click', startRound);
  retryTap.addEventListener('click', startRound);

  // ---------- main loop ----------
  var last = performance.now();
  function tick(){
    var now = performance.now();
    var dt = Math.min(now - last, 1000 / 30);
    last = now;

    if(active && playing){
      zones.forEach(function(z){
        if(z.state === 'active'){
          z.timeLeft -= dt;
          if(z.timeLeft <= 0) missZone(z);
        } else if(z.resetTimer > 0){
          z.resetTimer -= dt;
          if(z.resetTimer <= 0) settleZone(z);
        }
      });

      spawnCooldown -= dt;
      if(spawnCooldown <= 0){
        trySpawn();
        spawnCooldown = spawnInterval() * (0.85 + Math.random() * 0.3);
      }
    }

    if(scoreBump > 0){
      scoreValueEl.classList.add('bump');
      scoreBump -= dt / 250;
      if(scoreBump <= 0) scoreValueEl.classList.remove('bump');
    }

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  if(reduceMotion){
    // the appear/disappear timing is the whole game; without motion this
    // is still playable, just visually simpler — no extra handling needed
    // beyond what the reduced-motion CSS already strips.
  }

  renderLives();
  renderRank();

  window.PSPolitician = {
    setActive: function(v){ active = !!v; }
  };
})();
