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

  // cycle order: each game's entry says which root/setActive it owns, what
  // the corner tech-credit should read while it's showing, and its own
  // label. The switch button always invites the visitor to the NEXT game in
  // the cycle, so the label is read from the following entry — that keeps
  // the cycle correct on pages that carry a different number of games
  // (laboratory.html has all of them, 404.html does not have #sodaRoot).
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
    btn.textContent = GAMES[(current + 1) % GAMES.length].label;
    if(corner) corner.innerHTML = GAMES[current].corner;
  }

  btn.addEventListener('click', function(){
    current = (current + 1) % GAMES.length;
    apply();
  });

  apply();
})();
