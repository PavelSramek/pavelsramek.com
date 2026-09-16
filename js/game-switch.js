(function(){
  var btn = document.getElementById('gameSwitch');
  var crystalRoot = document.getElementById('crystalRoot');
  var curveRoot = document.getElementById('curveRoot');
  var politicianRoot = document.getElementById('politicianRoot');
  var crossingRoot = document.getElementById('crossingRoot');
  var getawayRoot = document.getElementById('getawayRoot');
  var sodaRoot = document.getElementById('sodaRoot');
  var corner = document.getElementById('corner');
  if(!btn || !crystalRoot || !curveRoot || !politicianRoot || !crossingRoot || !getawayRoot) return;

  // Každá hra: který root/setActive ovládá, co má ukazovat tech-credit
  // v rohu, a vlastní popisek (ikona + jméno) pro dlaždici v menu.
  var GAMES = [
    { root: crystalRoot,    label: '🎲 Kostka',
      setActive: function(v){ if(window.PSCrystal) window.PSCrystal.setActive(v); },
      corner: 'vlastní 3D scéna &middot; <b>WebGL</b>' },
    { root: curveRoot,      label: '🌀 Zatáčka',
      setActive: function(v){ if(window.PSCurve) window.PSCurve.setActive(v); },
      corner: 'vlastní herní engine &middot; <b>Canvas 2D</b>' },
    { root: politicianRoot, label: '🕴️ Politik',
      setActive: function(v){ if(window.PSPolitician) window.PSPolitician.setActive(v); },
      corner: 'vlastní herní engine &middot; <b>DOM/CSS</b>' },
    { root: crossingRoot,   label: '🚦 Přejdi Americkou',
      setActive: function(v){ if(window.PSCrossing) window.PSCrossing.setActive(v); },
      corner: 'vlastní herní engine &middot; <b>DOM/CSS</b>' },
    { root: getawayRoot,    label: '🚗 Únikovka',
      setActive: function(v){ if(window.PSGetaway) window.PSGetaway.setActive(v); },
      corner: 'vlastní herní engine &middot; <b>DOM/CSS</b>' }
  ];

  if(sodaRoot){
    GAMES.push({ root: sodaRoot, label: '📰 Česká sodovka',
      setActive: function(v){ if(window.PSSoda) window.PSSoda.setActive(v); },
      corner: 'satirický generátor &middot; <b>DOM/CSS</b>' });
  }

  var current = 0;

  function apply(){
    GAMES.forEach(function(g, i){
      if(i === current){
        g.root.classList.remove('game-hidden');
        g.setActive(true);
      } else {
        g.root.classList.add('game-hidden');
        g.setActive(false);
      }
    });
    if(corner) corner.innerHTML = GAMES[current].corner;
    updateMenuHighlight();
  }

  // --- Menu se seznamem her (16. 9. 2026) -----------------------------
  // Dřív tlačítko cyklovalo na DALŠÍ hru v pořadí — se 6 hrami se k
  // poslední ne každý doklikal a nebylo hned vidět, kolik her vlastně je.
  // Teď je tlačítko statické ("Seznam her") a otevírá overlay s dlaždicí
  // pro každou hru (ikona + jméno), klik na dlaždici tu hru rovnou spustí.
  // Celé menu (CSS i markup) je postavené čistě z JS, takže nevyžaduje
  // žádnou změnu v laboratory.html/404.html a nemůže se mezi nimi rozejít.
  btn.textContent = '📋 Seznam her';
  btn.setAttribute('aria-haspopup', 'true');
  btn.setAttribute('aria-expanded', 'false');

  var style = document.createElement('style');
  style.textContent =
    '.gs-backdrop{position:fixed;inset:0;background:rgba(8,8,14,0.72);' +
    'backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);z-index:30;' +
    'display:none;align-items:center;justify-content:center;padding:24px;}' +
    '.gs-panel{position:relative;background:#15151f;border:1px solid rgba(255,255,255,0.08);' +
    'border-radius:20px;padding:22px;max-width:480px;width:100%;' +
    'max-height:86vh;overflow:auto;box-shadow:0 30px 70px -20px rgba(0,0,0,0.6);}' +
    '.gs-panel h2{margin:0 0 4px;font-size:1.05rem;color:#fff;font-family:inherit;}' +
    '.gs-panel p{margin:0 0 16px;font-size:.82rem;color:rgba(255,255,255,0.6);}' +
    '.gs-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}' +
    '@media (max-width:420px){.gs-grid{grid-template-columns:repeat(2,1fr);}}' +
    '.gs-item{display:flex;flex-direction:column;align-items:center;gap:6px;' +
    'background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);' +
    'border-radius:14px;padding:14px 8px;cursor:pointer;color:#fff;' +
    'font:inherit;text-align:center;transition:background .15s ease,border-color .15s ease;}' +
    '.gs-item:hover,.gs-item:focus-visible{background:rgba(255,255,255,0.09);outline:none;}' +
    '.gs-item.is-active{border-color:var(--pink,#e0498a);background:rgba(224,73,138,0.16);}' +
    '.gs-icon{font-size:1.9rem;line-height:1;}' +
    '.gs-name{font-size:.74rem;font-weight:600;letter-spacing:.01em;}' +
    '.gs-close{position:absolute;top:10px;right:14px;background:none;border:none;' +
    'color:rgba(255,255,255,0.5);font-size:1.3rem;cursor:pointer;line-height:1;padding:4px;}';
  document.head.appendChild(style);

  var backdrop = document.createElement('div');
  backdrop.className = 'gs-backdrop';
  backdrop.innerHTML =
    '<div class="gs-panel" role="dialog" aria-modal="true" aria-label="Seznam her">' +
      '<button type="button" class="gs-close" aria-label="Zavřít">&times;</button>' +
      '<h2>Mini hry</h2>' +
      '<p>' + GAMES.length + ' her &middot; klepni na jednu a hraj</p>' +
      '<div class="gs-grid"></div>' +
    '</div>';
  document.body.appendChild(backdrop);

  var grid = backdrop.querySelector('.gs-grid');
  var items = GAMES.map(function(g, i){
    var parts = g.label.split(' ');
    var icon = parts.shift();
    var name = parts.join(' ');
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'gs-item';
    el.innerHTML = '<span class="gs-icon">' + icon + '</span><span class="gs-name">' + name + '</span>';
    el.addEventListener('click', function(){
      current = i;
      apply();
      closeMenu();
    });
    grid.appendChild(el);
    return el;
  });

  function updateMenuHighlight(){
    items.forEach(function(el, i){
      el.classList.toggle('is-active', i === current);
    });
  }

  function openMenu(){
    backdrop.style.display = 'flex';
    btn.setAttribute('aria-expanded', 'true');
    updateMenuHighlight();
  }
  function closeMenu(){
    backdrop.style.display = 'none';
    btn.setAttribute('aria-expanded', 'false');
  }

  btn.addEventListener('click', function(){
    if(backdrop.style.display === 'flex'){ closeMenu(); } else { openMenu(); }
  });
  backdrop.addEventListener('click', function(e){
    if(e.target === backdrop) closeMenu();
  });
  backdrop.querySelector('.gs-close').addEventListener('click', closeMenu);
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && backdrop.style.display === 'flex') closeMenu();
  });

  apply();
})();
