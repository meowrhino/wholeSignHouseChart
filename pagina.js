// lo de la página (no de la carta): el menú, la cara día/noche, la barra de horas y la entrada.
// solo usa lo que ya da carta.js; no cambia su lógica.
(function () {
  const raiz = document.documentElement;
  const scrub = $('#scrub');

  // carta.js llama a computeAndDraw por su nombre global: lo envolvemos para saber si es "cielo ahora"
  // y mover la barra de horas tras cada dibujo
  let modo;
  const dibujarOriginal = computeAndDraw;
  computeAndDraw = function (mode) {
    modo = mode;
    const r = dibujarOriginal(mode);
    document.body.classList.toggle('es-cielo', !!(mode && mode.sky));
    if ($('#status').textContent === 'librería lista.') setStatus(''); // aviso de carga: ya no hace falta
    if (!arrastrando) ponerScrub();
    return r;
  };

  function ponerScrub() {
    const [h, m] = ($('#time').value || '12:00').split(':').map(Number);
    scrub.value = h * 60 + (m || 0);
    scrub.disabled = $('#chkUnknownTime').checked;
  }

  // ===== la cara: día o noche. solo cambian colores y letra; la rueda se vuelve a dibujar con los nuevos =====
  const btnCara = $('#btnCara');
  function ponerCara(cara) {
    raiz.dataset.cara = cara;
    btnCara.textContent = cara === 'dia' ? 'noche' : 'día';
    document.querySelector('meta[name="theme-color"]').content = cara === 'dia' ? '#ffffff' : '#000000';
  }
  ponerCara(raiz.dataset.cara === 'noche' ? 'noche' : 'dia');
  btnCara.addEventListener('click', () => {
    const cara = raiz.dataset.cara === 'dia' ? 'noche' : 'dia';
    ponerCara(cara);
    try { localStorage.setItem('astro-cara', cara); } catch (_) { }
    if (lastRender) computeAndDraw(modo);
  });

  // ===== el menú =====
  $('#irCarta').addEventListener('click', () => {
    $('#formZone').scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('#date').focus({ preventScroll: true });
  });
  const abrir = (btn, caja) => btn.addEventListener('click', () => {
    caja.hidden = !caja.hidden; btn.setAttribute('aria-expanded', String(!caja.hidden));
  });
  abrir($('#btnLib'), $('#libraryBox'));
  // al cargar una carta guardada, se cierra la lista
  $('#libraryList').addEventListener('click', e => {
    if (e.target.closest('.libLoad')) { $('#libraryBox').hidden = true; $('#btnLib').setAttribute('aria-expanded', 'false'); }
  });

  // ===== el gesto: deslizar la hora y ver moverse el cielo =====
  // un redibujo por fotograma; mientras se arrastra no se toca la url
  // (safari no deja llamar a history.replaceState más de 100 veces cada 10 s)
  let arrastrando = false, pendiente = false;
  const syncOriginal = syncURL;
  scrub.addEventListener('input', () => {
    if (!arrastrando) { arrastrando = true; syncURL = () => { }; }
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => {
      pendiente = false;
      const v = +scrub.value;
      $('#time').value = `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
      computeAndDraw(modo);
    });
  });
  scrub.addEventListener('change', () => {
    requestAnimationFrame(() => { arrastrando = false; syncURL = syncOriginal; syncURL(); });
  });

  // ===== la frase: enter en un campo = "dibujar mi carta" (carta.js busca el lugar si ha cambiado) =====
  $('.frase').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.matches('input')) { e.preventDefault(); $('#btnDraw').click(); }
  });

  // ===== al entrar: el cielo de ahora, salvo que la url traiga una carta =====
  const p = new URLSearchParams(location.search);
  const sinParametros = ![...p.keys()].length;
  const cieloGuardado = !sinParametros && p.get('d') && !(p.get('lat') && p.get('lon')); // un "cielo ahora" compartido
  if (sinParametros || cieloGuardado) {
    const t0 = Date.now();
    const espera = setInterval(() => {
      if (window.Astronomy) {
        clearInterval(espera);
        if (sinParametros) $('#btnSkyNow').click();
        else computeAndDraw({ sky: true });
      } else if (Date.now() - t0 > 15000) clearInterval(espera);
    }, 50);
  } else ponerScrub();
})();
