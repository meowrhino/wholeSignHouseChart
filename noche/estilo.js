// camino b · cielo ahora. Solo usa lo que ya da ../../carta.js; no cambia su lógica.
(function () {
  const scrub = $('#scrub');

  // envolvemos computeAndDraw (los listeners de carta.js lo buscan por nombre global)
  // para recordar si la vista es "cielo ahora" y mover la hora del borde tras cada dibujo
  let modo;
  const dibujarOriginal = computeAndDraw;
  computeAndDraw = function (mode) {
    modo = mode;
    const r = dibujarOriginal(mode);
    if (!arrastrando) ponerScrub();
    return r;
  };

  function ponerScrub() {
    const [h, m] = ($('#time').value || '12:00').split(':').map(Number);
    scrub.value = h * 60 + (m || 0);
    scrub.disabled = $('#chkUnknownTime').checked;
  }

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

  // ===== la frase: enter en un campo = "dibujar" (carta.js busca el lugar si ha cambiado) =====
  $('.frase').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.matches('input')) { e.preventDefault(); $('#btnDraw').click(); }
  });

  // ===== enlaces de texto que abren y cierran =====
  const abrir = (btn, caja) => btn.addEventListener('click', () => {
    caja.hidden = !caja.hidden; btn.setAttribute('aria-expanded', String(!caja.hidden));
  });
  abrir($('#btnMas'), $('#mas'));
  abrir($('#btnLib'), $('#libraryBox'));
  // si la url trae opciones avanzadas, carta.js abre #advPanel: que se vea también "detalles"
  if (!$('#advPanel').hidden) { $('#mas').hidden = false; $('#btnMas').setAttribute('aria-expanded', 'true'); }

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
