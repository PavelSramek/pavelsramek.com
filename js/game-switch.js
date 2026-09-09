(function(){
  var btn = document.getElementById('gameSwitch');
  var crystalRoot = document.getElementById('crystalRoot');
  var curveRoot = document.getElementById('curveRoot');
  var corner = document.getElementById('corner');
  if(!btn || !crystalRoot || !curveRoot) return;

  var current = 'crystal';

  function apply(){
    if(current === 'crystal'){
      crystalRoot.classList.remove('game-hidden');
      curveRoot.classList.add('game-hidden');
      btn.textContent = '🌀 Zatáčka';
      if(corner) corner.innerHTML = 'vlastní 3D scéna &middot; <b>WebGL</b>';
      if(window.PSCrystal) window.PSCrystal.setActive(true);
      if(window.PSCurve) window.PSCurve.setActive(false);
    } else {
      curveRoot.classList.remove('game-hidden');
      crystalRoot.classList.add('game-hidden');
      btn.textContent = '🎲 Kostka';
      if(corner) corner.innerHTML = 'vlastní herní engine &middot; <b>Canvas 2D</b>';
      if(window.PSCurve) window.PSCurve.setActive(true);
      if(window.PSCrystal) window.PSCrystal.setActive(false);
    }
  }

  btn.addEventListener('click', function(){
    current = (current === 'crystal') ? 'curve' : 'crystal';
    apply();
  });

  apply();
})();
