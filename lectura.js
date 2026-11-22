// la lectura: qué dice la carta en palabras, en modo tradicional o contemporáneo.
// los textos están en data/reading/*.json (se editan ahí, no aquí). carta.js llama a renderLectura() tras cada dibujo.
(function () {
  const BASE = new URL('data/reading/', document.currentScript.src);
  const KEY = { Sun: 'sun', Moon: 'moon', Mercury: 'mercury', Venus: 'venus', Mars: 'mars', Jupiter: 'jupiter', Saturn: 'saturn', Uranus: 'uranus', Neptune: 'neptune', Pluto: 'pluto' };
  const ORDER = Object.values(KEY);
  const SIGN_KEYS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
  const KIND = { 'conjunción': 'conj', 'sextil': 'easy', 'trígono': 'easy', 'cuadratura': 'hard', 'oposición': 'hard' };
  const SLOW = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']; // los que tardan meses o años en cruzar una casa
  const EPOCA = ['Uranus', 'Neptune', 'Pluto'];
  const HOY_ORB = 3, HOY_MAX = 6;

  let T = null, last = null;
  let modo = 'traditional';
  try { if (localStorage.getItem('astro-modo') === 'modern') modo = 'modern'; } catch (_) { }

  const cargar = Promise.all(['basics', 'signs', 'houses', 'aspects'].map(n =>
    fetch(new URL(n + '.json', BASE)).then(r => { if (!r.ok) throw new Error(n + '.json: ' + r.status); return r.json(); })
  )).then(([basics, signs, houses, aspects]) => { T = { basics, signs, houses, aspects }; if (last) pintar(last); })
    .catch(e => { const el = $('#lectura'); if (el) el.innerHTML = `<p class="mini">no se pudieron cargar los textos (${esc(e.message)}).</p>`; });

  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  // texto de un modo; si la tradición no lo tiene (urano, neptuno, plutón), el contemporáneo
  function txt(tabla, k1, k2) {
    const t = T[tabla][modo]?.[k1]?.[k2];
    if (t) return { t, prestado: false };
    const m = T[tabla].modern?.[k1]?.[k2];
    return m ? { t: m, prestado: modo === 'traditional' } : null;
  }

  function casaDe(lon, cusps) {
    if (!cusps) return null;
    for (let h = 0; h < 12; h++) { const span = norm(cusps[(h + 1) % 12] - cusps[h]); if (norm(lon - cusps[h]) < span) return h + 1; }
    return null;
  }

  function aspecto(A, B, r) { return r.aspectMode === 'degree' ? aspectByDegree(A.lon, B.lon, r.orbMax) : aspectBySigns(A.sign, B.sign); }

  function parejaTxt(kA, kB, tipo) {
    const [a, b] = ORDER.indexOf(kA) < ORDER.indexOf(kB) ? [kA, kB] : [kB, kA];
    return txt('aspects', `${a}-${b}`, KIND[tipo]);
  }

  function selector() {
    const b = T.basics.modes;
    return `<p class="modos">lectura <button type="button" data-modo="traditional" aria-pressed="${modo === 'traditional'}">${b.traditional.label}</button> · <button type="button" data-modo="modern" aria-pressed="${modo === 'modern'}">${b.modern.label}</button></p>
      <p class="mini">${esc(b[modo].about)}</p>`;
  }

  function pintar(r) {
    const box = $('#lectura'); if (!box) return;
    if (!T) { box.innerHTML = '<p class="mini">cargando la lectura…</p>'; return; }
    const out = [selector()];
    const planetas = r.planets.filter(p => KEY[p.key]);
    const hayPrestados = modo === 'traditional' && planetas.some(p => !T.signs.traditional[KEY[p.key]]);

    // ascendente
    const ascSign = r.ascDeg != null ? Math.floor(r.ascDeg / 30) : r.suspectAscSign;
    if (ascSign != null) {
      const s = txt('signs', 'asc', SIGN_KEYS[ascSign]);
      if (s) out.push(`<div class="item" id="lee-asc"><h3>asc en ${SIGN_NAMES[ascSign]}</h3><p>${esc(s.t)}</p></div>`);
    }

    // un bloque por planeta: signo (cómo, y en tradicional su dignidad) + casa (dónde)
    for (const p of planetas) {
      const k = KEY[p.key], h = casaDe(p.lon, r.cusps);
      const s = txt('signs', k, SIGN_KEYS[p.sign]);
      const c = h ? txt('houses', k, String(h)) : null;
      const que = T.basics.planets[k]?.[modo] || '';
      const casa = h ? ` · casa ${roman(h)}` : '';
      out.push(`<div class="item" id="lee-${k}">
        <h3>${p.glyph} ${p.name} en ${SIGN_NAMES[p.sign]}${casa}</h3>
        <p class="que">${esc(que)}</p>
        <p>${s ? esc(s.t) : ''}${c ? ' ' + esc(c.t) : ''}</p>
      </div>`);
    }

    // aspectos entre planetas
    const asp = [];
    for (let i = 0; i < planetas.length; i++) for (let j = i + 1; j < planetas.length; j++) {
      const A = planetas[i], B = planetas[j], a = aspecto(A, B, r); if (!a) continue;
      const t = parejaTxt(KEY[A.key], KEY[B.key], a.type); if (!t) continue;
      asp.push(`<div class="item"><h3>${A.glyph} ${A.name} y ${B.glyph} ${B.name} · ${a.type}</h3><p>${esc(t.t)}</p></div>`);
    }
    if (asp.length) out.push('<h3 class="sub">cómo se hablan</h3>', ...asp);
    if (hayPrestados) out.push(`<p class="mini">${esc(T.basics.notes.outer)}</p>`);
    out.push(`<p class="mini">${esc(T.basics.notes.about)}</p>`);
    box.innerHTML = out.join('');
    pintarHoy(r);
  }

  // hoy sobre tu carta: los planetas de ahora sobre una carta natal (no en "cielo ahora")
  function pintarHoy(r) {
    const box = $('#hoy'); if (!box) return;
    if (r.sky || !T || !window.Astronomy) { box.hidden = true; box.innerHTML = ''; return; }
    const t = new Astronomy.AstroTime(new Date());
    const ahora = getPlanetList().map(p => { const lon = eclipticLongitude(p.key, t); return { ...p, lon, sign: Math.floor(lon / 30) }; });
    const natal = r.planets.filter(p => KEY[p.key]);
    const out = ['<h2>hoy sobre tu carta</h2>'];

    // por qué casa pasan la luna (hoy) y los lentos (esta temporada)
    if (r.cusps) {
      for (const p of ahora.filter(p => p.key === 'Moon' || SLOW.includes(p.key))) {
        const h = casaDe(p.lon, r.cusps); if (!h) continue;
        const k = KEY[p.key], tr = T.basics.planets[k]?.transit?.[modo];
        if (modo === 'traditional' && !T.signs.traditional[k]) continue;
        const cuando = p.key === 'Moon' ? 'hoy' : 'esta temporada';
        out.push(`<div class="item"><h3>${p.glyph} ${p.name} pasa por tu casa ${roman(h)} <span class="muted">${cuando}</span></h3><p>${esc(T.basics.houses[modo][h])} — ${esc(tr || '')}.</p></div>`);
      }
    }

    // los aspectos más exactos de hoy (sin la luna, que cambia cada pocas horas)
    const lista = [];
    for (const tp of ahora) {
      if (tp.key === 'Moon') continue;
      if (modo === 'traditional' && !T.signs.traditional[KEY[tp.key]]) continue;
      for (const n of natal) {
        if (EPOCA.includes(tp.key) && EPOCA.includes(n.key)) continue; // urano-neptuno-plutón entre sí son fondo de época, no algo de hoy
        const a = aspectByDegree(tp.lon, n.lon, HOY_ORB); if (a) lista.push({ tp, n, a });
      }
    }
    lista.sort((x, y) => x.a.orb - y.a.orb);
    for (const { tp, n, a } of lista.slice(0, HOY_MAX)) {
      const tx = parejaTxt(KEY[tp.key], KEY[n.key], a.type); if (!tx) continue;
      out.push(`<div class="item"><h3>${tp.glyph} ${tp.name} de hoy · ${a.type} · tu ${n.glyph} ${n.name} <span class="muted">${a.orb.toFixed(1)}°</span></h3><p>${esc(tx.t)}</p></div>`);
    }
    if (out.length === 1) out.push('<p class="mini">hoy no hay tránsitos cerca de tus planetas.</p>');
    out.push('<p class="acciones"><button type="button" id="verHoy">ver los planetas de hoy en la rueda</button></p>');
    box.innerHTML = out.join(''); box.hidden = false;
  }

  window.renderLectura = function (r) {
    last = r; pintar(r);
    // la raíz reabre la última carta natal (no el cielo ahora)
    if (!r.sky) try { localStorage.setItem('astro-ultima', location.search); } catch (_) { }
  };

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-modo]');
    if (b && b.dataset.modo !== modo) {
      modo = b.dataset.modo;
      try { localStorage.setItem('astro-modo', modo); } catch (_) { }
      // contemporánea = diez planetas; tradicional = los siete visibles
      $('#chkVisible').checked = modo === 'traditional'; updateSwitchUI();
      if (last) computeAndDraw(last.sky ? { sky: true } : undefined);
      return;
    }
    if (e.target.closest('#verHoy')) { $('#chkTr').checked = true; setTransitNow(); updateSwitchUI(); applyTransits(); $('#chartBox').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    // tocar un planeta en la rueda lleva a su texto
    const nodo = e.target.closest('#chartSvg .node');
    if (nodo && !nodo.classList.contains('tr')) {
      const k = nodo.dataset.key === 'asc' ? 'asc' : KEY[nodo.dataset.key];
      const el = k && document.getElementById('lee-' + k);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('marcado'); setTimeout(() => el.classList.remove('marcado'), 1600); }
    }
  });
})();
