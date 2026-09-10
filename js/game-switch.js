(function(){
  var btn = document.getElementById('gameSwitch');
  var crystalRoot = document.getElementById('crystalRoot');
  var curveRoot = document.getElementById('curveRoot');
  var politicianRoot = document.getElementById('politicianRoot');
  var crossingRoot = document.getElementById('crossingRoot');
  var getawayRoot = document.getElementById('getawayRoot');
  var corner = document.getElementById('corner');
  if(!btn || !crystalRoot || !curveRoot || !politicianRoot || !crossingRoot || !getawayRoot) return;

  // cycle order: each game's entry says which root/setActive it owns, what
  // the corner tech-credit should read while it's showing, and what the
  // switch button should say to invite the visitor to the NEXT game in
  // the cycle (not the one currently showing).
  var GAMES = [
    { root: crystalRoot,    setActive: function(v){ if(window.PSCrystal) window.PSCrystal.setActive(v); },
      corner: 'vlastní 3D scéna &middot; <b>WebGL</b>' },
    { root: curveRoot,      setActive: function(v){ if(window.PSCurve) window.PSCurve.setActive(v); },
      corner: 'vlastní herní engine &middot; <b>Canvas 2D</b>' },
    { root: politicianRoot, setActive: function(v){ if(window.PSPolitician) window.PSPolitician.setActive(v); },
      corner: 'vlastní herní engine &middot; <b>DOM/CSS</b>' },
    { root: crossingRoot,   setActive: function(v){ if(window.PSCrossing) window.PSCrossing.setActive(v); },
      corner: 'vlastní herní engine &middot; <b>DOM/CSS</b>' },
    { root: getawayRoot,    setActive: function(v){ if(window.PSGetaway) window.PSGetaway.setActive(v); },
      corner: 'vlastní herní engine &middot; <b>DOM/CSS</b>' }
  ];
  var NEXT_LABEL = ['🌀 Zatáčka', '🕴️ Politik', '🚦 Přejdi Americkou', '🚗 Únikovka', '🎲 Kostka'];

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
    btn.textContent = NEXT_LABEL[current];
    if(corner) corner.innerHTML = GAMES[current].corner;
  }

  btn.addEventListener('click', function(){
    current = (current + 1) % GAMES.length;
    apply();
  });

  apply();
})();
