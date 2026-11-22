const $ = sel => document.querySelector(sel);
function setStatus(msg, kind = 'info') { const el = $('#status'); if (!el) return; el.textContent = msg; el.style.color = (kind === 'error' ? 'var(--err)' : 'var(--muted)'); }
function roman(n) { const R = ['', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii']; return R[n] || String(n); }
const SIGN_NAMES = ['aries', 'tauro', 'géminis', 'cáncer', 'leo', 'virgo', 'libra', 'escorpio', 'sagitario', 'capricornio', 'acuario', 'piscis'];
const SIGN_GLYPHS = ['♈︎', '♉︎', '♊︎', '♋︎', '♌︎', '♍︎', '♎︎', '♏︎', '♐︎', '♑︎', '♒︎', '♓︎'];

// Loader Astronomy Engine
async function loadAstronomy() {
  if (window.Astronomy) return true; const urls = [
    'https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.0/astronomy.browser.min.js',
    'https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.0/astronomy.browser.js',
    'https://unpkg.com/astronomy-engine@2.1.0/astronomy.browser.js'];
  for (const url of urls) { try { await new Promise((res, rej) => { const s = document.createElement('script'); s.src = url; s.defer = true; s.onload = () => res(); s.onerror = () => rej(); document.head.appendChild(s); }); if (window.Astronomy) return true; } catch (e) { } } return false;
}

// Utilidades astro
const deg2rad = d => d * Math.PI / 180, rad2deg = r => (r * 180 / Math.PI), norm = d => ((d % 360) + 360) % 360;
function julianDayUTC(date) { let y = date.getUTCFullYear(); let m = date.getUTCMonth() + 1; const dayFrac = (date.getUTCHours() + date.getUTCMinutes() / 60) / 24; let d = date.getUTCDate() + dayFrac; if (m <= 2) { m += 12; y -= 1; } const A = Math.floor(y / 100); const B = 2 - A + Math.floor(A / 4); return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5; }
function julianCenturies(date) { return (julianDayUTC(date) - 2451545) / 36525; }
function obliquityEcliptic(date) { const T = julianCenturies(date); const arcsec = 21.448 - 46.8150 * T - 0.00059 * T * T + 0.001813 * T * T * T; return 23 + 26 / 60 + arcsec / 3600; }
function gmstHours(date) { const T = julianCenturies(date); let gmst = (67310.548 + (3155760000 + 8640184.812866) * T + 0.093104 * T * T - 6.2e-6 * T * T * T) / 3600; return ((gmst % 24) + 24) % 24; }

function partsToObj(parts) { const o = {}; for (const p of parts) { o[p.type] = p.value; } return o; }
function makeFormatter(tz) { return new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
function localToUTC(tz, Y, M, D, h, m) { let guess = Date.UTC(Y, M - 1, D, h, m, 0); const f = makeFormatter(tz); for (let i = 0; i < 4; i++) { const parts = partsToObj(f.formatToParts(new Date(guess))); const got = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, 0); const target = Date.UTC(Y, M - 1, D, h, m, 0); const diff = got - target; if (Math.abs(diff) < 1000) break; guess -= diff; } return new Date(guess); }

function ascendantLongitude(dateUTC, latDeg, lonDeg) { const eps = deg2rad(obliquityEcliptic(dateUTC)); const phi = deg2rad(latDeg); const thetaL = deg2rad(gmstHours(dateUTC) * 15 + lonDeg); const num = Math.cos(thetaL); const den = -(Math.sin(thetaL) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps)); return norm(rad2deg(Math.atan2(num, den))); }
function midheavenLongitude(dateUTC, lonDeg) { const eps = deg2rad(obliquityEcliptic(dateUTC)); const thetaL = deg2rad(gmstHours(dateUTC) * 15 + lonDeg); return norm(rad2deg(Math.atan2(Math.sin(thetaL), Math.cos(thetaL) * Math.cos(eps)))); }

function eclipticLongitude(bodyKey, astroTime) { let vec; if (bodyKey === 'Moon') vec = Astronomy.GeoMoon(astroTime); else vec = Astronomy.GeoVector(bodyKey, astroTime, true); const eps = deg2rad(obliquityEcliptic(astroTime.date)); const x = vec.x, y = vec.y, z = vec.z; const ye = y * Math.cos(eps) + z * Math.sin(eps); const xe = x; return norm(rad2deg(Math.atan2(ye, xe))); }
function formatZodiac(lon) { const s = Math.floor(lon / 30); const deg = Math.floor(lon - s * 30); const min = Math.floor((lon - s * 30 - deg) * 60); return `${deg}°${min.toString().padStart(2, '0')} ${SIGN_GLYPHS[s]} (${SIGN_NAMES[s]})`; }

// Dignidades tradicionales (clásicas)
const RULERS = { 0: 'Mars', 1: 'Venus', 2: 'Mercury', 3: 'Moon', 4: 'Sun', 5: 'Mercury', 6: 'Venus', 7: 'Mars', 8: 'Jupiter', 9: 'Saturn', 10: 'Saturn', 11: 'Jupiter' };
const EXALT_FULL = { 0: 'Sun', 1: 'Moon', 5: 'Mercury', 9: 'Mars', 3: 'Jupiter', 11: 'Venus', 6: 'Saturn' };
function dignityOf(planet, sign) { const trad = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']; if (!trad.includes(planet)) return 'pe'; if (RULERS[sign] === planet) return 'dom'; if (EXALT_FULL[sign] === planet) return 'ex'; const opp = (sign + 6) % 12; if (RULERS[opp] === planet) return 'det'; if (EXALT_FULL[opp] === planet) return 'fall'; return 'pe'; }
const DIG_TEXT = { dom: 'domicilio', ex: 'exaltación', det: 'detrimento', fall: 'caída', pe: 'peregrino' };

// Aspecto por signos (Whole Sign) usando distancia mínima entre signos.
function aspectBySigns(signA, signB) { const d = ((signB - signA) % 12 + 12) % 12; const md = Math.min(d, 12 - d); if (md === 2) return { type: 'sextil', colorName: 'darkblue' }; if (md === 3) return { type: 'cuadratura', colorName: 'burgundy' }; if (md === 4) return { type: 'trígono', colorName: 'blue' }; if (md === 6) return { type: 'oposición', colorName: 'red' }; return null; }

// ===== Avanzado: objetos, detalles y sistemas de casas =====
// Aspectos por grado (con orbe). Añade la conjunción, que "por signos" no puede expresar.
const ASPECT_DEFS = [
  { ang: 0, type: 'conjunción', colorName: 'gold' },
  { ang: 60, type: 'sextil', colorName: 'darkblue' },
  { ang: 90, type: 'cuadratura', colorName: 'burgundy' },
  { ang: 120, type: 'trígono', colorName: 'blue' },
  { ang: 180, type: 'oposición', colorName: 'red' }
];
function aspectByDegree(lonA, lonB, orbMax) {
  let d = Math.abs(norm(lonA - lonB)); if (d > 180) d = 360 - d;
  let best = null;
  for (const A of ASPECT_DEFS) { const orb = Math.abs(d - A.ang); if (orb <= orbMax && (!best || orb < best.orb)) best = { type: A.type, colorName: A.colorName, orb }; }
  return best;
}

// Nodo lunar medio (norte) y Lilith media (apogeo lunar). Fórmulas de Meeus, T = siglos julianos desde J2000.
function meanNodeLon(dateUTC) { const T = julianCenturies(dateUTC); return norm(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T * T * T / 467441 - T * T * T * T / 60616000); }
function meanLilithLon(dateUTC) { const T = julianCenturies(dateUTC); const peri = 83.3532465 + 4069.0137287 * T - 0.0103200 * T * T - T * T * T / 80053 + T * T * T * T / 18999000; return norm(peri + 180); }

// Quirón: propagación kepleriana de dos cuerpos desde elementos osculadores de JPL (aproximado, marcado con ≈).
const CHIRON_EL = { epoch: 2461200.5, a: 13.68426760850124, e: 0.3797656311453571, i: 6.930574468846328, om: 209.2961258613147, w: 339.2878326589729, M0: 216.7198966018106, n: 0.0194702593257484 };
function solveKepler(M, e) { M = ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); let E = M; for (let k = 0; k < 60; k++) { const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); E -= dE; if (Math.abs(dE) < 1e-10) break; } return E; }
function chironLon(astroTime) {
  const jd = astroTime.tt + 2451545.0; const el = CHIRON_EL;
  const M = deg2rad(el.M0 + el.n * (jd - el.epoch));
  const E = solveKepler(M, el.e);
  const xv = el.a * (Math.cos(E) - el.e), yv = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);
  const om = deg2rad(el.om), w = deg2rad(el.w), inc = deg2rad(el.i);
  const cosom = Math.cos(om), sinom = Math.sin(om), cosw = Math.cos(w), sinw = Math.sin(w), cosi = Math.cos(inc), sini = Math.sin(inc);
  // heliocéntrico eclíptico J2000
  const xh = (cosom * cosw - sinom * sinw * cosi) * xv + (-cosom * sinw - sinom * cosw * cosi) * yv;
  const yh = (sinom * cosw + cosom * sinw * cosi) * xv + (-sinom * sinw + cosom * cosw * cosi) * yv;
  // Tierra heliocéntrica del engine (ecuatorial J2000) → eclíptica J2000
  const earth = Astronomy.HelioVector(Astronomy.Body.Earth, astroTime);
  const eps0 = deg2rad(23.4392911);
  const exe = earth.x, eye = earth.y * Math.cos(eps0) + earth.z * Math.sin(eps0);
  // geocéntrico eclíptico J2000 → longitud, + precesión general a eclíptica de fecha (tropical)
  const gx = xh - exe, gy = yh - eye;
  const T = (jd - 2451545.0) / 36525;
  return norm(rad2deg(Math.atan2(gy, gx)) + 1.396971 * T);
}

// Retrogradación: la longitud eclíptica decrece un día después. Sol y Luna nunca retrogradan.
function isRetro(bodyKey, astroTime) { if (bodyKey === 'Sun' || bodyKey === 'Moon') return false; const l1 = eclipticLongitude(bodyKey, astroTime); const l2 = eclipticLongitude(bodyKey, astroTime.AddDays(1)); let d = l2 - l1; if (d > 180) d -= 360; if (d < -180) d += 360; return d < 0; }

// Secta: carta diurna si el Sol está sobre el horizonte (por encima del eje asc-dc).
function isDiurnal(sunLon, ascDeg) { return norm(sunLon - ascDeg) > 180; }

// Cúspides de casas por sistema. Devuelve 12 longitudes absolutas (cúspide de cada casa).
function equalCusps(ascDeg) { return Array.from({ length: 12 }, (_, i) => norm(ascDeg + 30 * i)); }
function wholeCusps(ascSign) { return Array.from({ length: 12 }, (_, i) => norm((ascSign + i) * 30)); }
function placidusCusps(dateUTC, latDeg, lonDeg, ascDeg, mcLon) {
  const eps = deg2rad(obliquityEcliptic(dateUTC)); const phi = deg2rad(latDeg);
  const ramc = deg2rad(norm(gmstHours(dateUTC) * 15 + lonDeg));
  const semiArc = ra => { const decl = Math.atan(Math.tan(eps) * Math.sin(ra)); let x = -Math.tan(phi) * Math.tan(decl); x = Math.max(-1, Math.min(1, x)); return Math.acos(x); };
  const raToLon = ra => norm(rad2deg(Math.atan2(Math.sin(ra), Math.cos(ra) * Math.cos(eps))));
  const upper = (m, off) => { let ra = ramc + deg2rad(off); for (let k = 0; k < 30; k++) ra = ramc + m * semiArc(ra); return raToLon(ra); };
  const lower = (m, off) => { let ra = ramc + deg2rad(off); for (let k = 0; k < 30; k++) ra = ramc + Math.PI - m * (Math.PI - semiArc(ra)); return raToLon(ra); };
  const c = new Array(12);
  c[0] = norm(ascDeg); c[9] = norm(mcLon); c[6] = norm(ascDeg + 180); c[3] = norm(mcLon + 180);
  c[10] = upper(1 / 3, 30); c[11] = upper(2 / 3, 60); // casas 11, 12
  c[1] = lower(2 / 3, 120); c[2] = lower(1 / 3, 150);  // casas 2, 3
  c[4] = norm(c[10] + 180); c[5] = norm(c[11] + 180);  // casas 5, 6 opuestas a 11, 12
  c[7] = norm(c[1] + 180); c[8] = norm(c[2] + 180);    // casas 8, 9 opuestas a 2, 3
  return c;
}
// Asigna puntos (planetas/objetos) a casas por cúspides: casa i si la longitud cae en [cusp[i], cusp[i+1]).
function assignHousesByCusps(points, cusps) {
  const houses = cusps.map(cl => ({ cuspLon: cl, planets: [] }));
  for (const p of points) { for (let h = 0; h < 12; h++) { const span = norm(cusps[(h + 1) % 12] - cusps[h]); const off = norm(p.lon - cusps[h]); if (off < span) { houses[h].planets.push(p); break; } } }
  return houses;
}

// ===== Rueda SVG interactiva =====
const CHART_UI = { nodeInfo: {}, houseInfo: [] };
let exportMeta = { line1: 'carta natal', line2: '' };

// colores de la rueda y del png: cada estilo los cambia con --w-<nombre> en su css; sin definir, salen los de siempre
const W = (k, d) => getComputedStyle(document.documentElement).getPropertyValue('--w-' + k).trim() || d;

function cssColor(name) { return (getComputedStyle(document.documentElement).getPropertyValue(`--${name}`) || '#fff').trim(); }

function renderChart(data) {
  const svg = $('#chartSvg');
  const CX = 560, CY = 560, R = 480, R_HOUSE = 410, R_PLAN = 330, R_SIGNS = 445, R_NUMS = 235;
  const toAng = rel => Math.PI - rel * Math.PI / 180; // CCW, casa i a la izquierda
  const PX = (r, a) => (CX + r * Math.cos(a)).toFixed(1);
  const PY = (r, a) => (CY + r * Math.sin(a)).toFixed(1);
  const SYM_FONT = "'Noto Sans Symbols 2','Segoe UI Symbol','DejaVu Sans','Symbola',sans-serif";
  const relOf = lon => norm(lon - data.house0);
  const out = [];
  CHART_UI.nodeInfo = {}; CHART_UI.houseInfo = [];
  const cusps = data.cusps; // 12 longitudes absolutas, o null si noHouses

  // fondo + estrellitas (dentro del svg → salen también en el png exportado)
  out.push('<defs><filter id="glowGold" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur in="SourceGraphic" stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>');
  out.push(`<rect x="0" y="0" width="1120" height="1120" fill="${W('bg', 'rgba(10,7,21,.55)')}"/>`);
  let bgStars = ''; const starCol = W('star', '#fff4c4');
  for (let i = 0; i < 130; i++) { bgStars += `<circle cx="${(Math.random() * 1120).toFixed(0)}" cy="${(Math.random() * 1120).toFixed(0)}" r="${(Math.random() * 1 + 0.3).toFixed(2)}" fill="${starCol}" opacity="${(Math.random() * 0.5 + 0.15).toFixed(2)}"/>`; }
  out.push(`<g>${bgStars}</g>`);

  // sectores de casas (desde cúspides; para whole sign coinciden con los signos)
  if (cusps) {
    for (let i = 0; i < 12; i++) {
      const a1 = toAng(relOf(cusps[i])), a2 = toAng(relOf(cusps[(i + 1) % 12]));
      out.push(`<path class="sector" data-house="${i}" style="--i:${i}" d="M ${CX} ${CY} L ${PX(R, a1)} ${PY(R, a1)} A ${R} ${R} 0 0 0 ${PX(R, a2)} ${PY(R, a2)} Z" fill="${i % 2 ? W('sector-b', 'rgba(18,12,38,.8)') : W('sector-a', 'rgba(13,10,26,.66)')}"/>`);
    }
    let spokes = '';
    for (let i = 0; i < 12; i++) { const a = toAng(relOf(cusps[i])); spokes += `<line x1="${CX}" y1="${CY}" x2="${PX(R, a)}" y2="${PY(R, a)}"/>`; }
    out.push(`<g stroke="${W('spoke', 'rgba(183,172,214,.25)')}" stroke-width="1.2">${spokes}</g>`);
  } else {
    out.push(`<circle cx="${CX}" cy="${CY}" r="${R}" fill="${W('disc', 'rgba(13,10,26,.72)')}"/>`);
  }

  // bisel interno
  out.push(`<circle cx="${CX}" cy="${CY}" r="${R_HOUSE}" fill="none" stroke="${W('ring', 'rgba(183,172,214,.18)')}" stroke-width="1"/>`);

  // borde exterior + ticks de grados (5°/10°/30°)
  out.push(`<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${W('rim', 'rgba(255,213,74,.30)')}" stroke-width="1.2"/>`);
  let ticks = '';
  for (let d = 0; d < 360; d++) { const a = toAng(relOf(d)); const len = d % 30 === 0 ? 13 : d % 10 === 0 ? 9 : d % 5 === 0 ? 6 : 3; const op = d % 10 === 0 ? '.55' : '.3'; ticks += `<line x1="${PX(R, a)}" y1="${PY(R, a)}" x2="${PX(R - len, a)}" y2="${PY(R - len, a)}" opacity="${op}"/>`; }
  out.push(`<g stroke="${W('tick', '#ffe9a6')}" stroke-width="0.8">${ticks}</g>`);

  // signos del zodiaco (siempre por posición absoluta) + números de casa (centro de cada arco)
  for (let k = 0; k < 12; k++) {
    const a = toAng(relOf(k * 30 + 15));
    out.push(`<text x="${PX(R_SIGNS, a)}" y="${(CY + R_SIGNS * Math.sin(a) + 4).toFixed(1)}" fill="${W('sign', '#ffe9a6')}" font-size="24" font-weight="600" text-anchor="middle" dominant-baseline="central" font-family="${SYM_FONT}">${SIGN_GLYPHS[k]}</text>`);
  }
  if (cusps && !data.noHouses) {
    for (let i = 0; i < 12; i++) {
      const span = norm(cusps[(i + 1) % 12] - cusps[i]);
      const a = toAng(relOf(norm(cusps[i] + span / 2)));
      out.push(`<text x="${PX(R_NUMS, a)}" y="${PY(R_NUMS, a)}" fill="${W('num', '#d9cef3')}" font-size="16" text-anchor="middle" dominant-baseline="central" font-family="${W('num-font', "'Spectral SC',Georgia,serif")}">${roman(i + 1)}</text>`);
    }
  }

  // ángulos reales (solo si hay hora)
  if (!data.unknownTime) {
    const axis = (label, lon) => {
      const a = toAng(relOf(lon));
      out.push(`<line class="angle" x1="${CX}" y1="${CY}" x2="${PX(R, a)}" y2="${PY(R, a)}" stroke="${W('angle', '#ffd54a')}" stroke-width="1.8" filter="${W('glow', 'url(#glowGold)')}"/>`);
      const lx = +(CX + (R + 16) * Math.cos(a)).toFixed(1), ly = +(CY + (R + 16) * Math.sin(a)).toFixed(1);
      const rot = ((a + Math.PI / 2) * 180 / Math.PI).toFixed(1);
      out.push(`<text class="angle" x="${lx}" y="${ly}" transform="rotate(${rot} ${lx} ${ly})" fill="${W('angle', '#ffd54a')}" font-size="12" font-weight="bold" text-anchor="middle" dominant-baseline="central" font-family="system-ui,sans-serif">${label}</text>`);
    };
    axis('mc', data.mc); axis('dc', norm(data.ascDeg + 180)); axis('ic', norm(data.mc + 180));
  }

  // nodos (planetas + objetos + asc) con anti-colisión radial
  const nodes = data.planets.map(p => ({ key: p.key, name: p.name, glyph: p.glyph, lon: p.lon, sign: p.sign, dig: p.dig, isObject: !!p.isObject, approx: !!p.approx, retro: !!p.retro, rel: relOf(p.lon), kind: p.isObject ? 'object' : 'planet' }));
  const canAsc = (!data.unknownTime) || (data.suspectAscSign != null);
  if (canAsc) {
    const ascSign = (!data.unknownTime) ? Math.floor(data.ascDeg / 30) : data.suspectAscSign;
    const ascLon = (!data.unknownTime) ? data.ascDeg : ascSign * 30;
    nodes.push({ key: 'asc', name: 'ascendente', glyph: 'asc', lon: ascLon, sign: ascSign, rel: relOf(ascLon), kind: 'asc' });
  }
  const sorted = [...nodes].sort((a, b) => a.rel - b.rel);
  const TH = 8; const clusters = []; let cur = [];
  for (const n of sorted) { if (cur.length && n.rel - cur[cur.length - 1].rel > TH) { clusters.push(cur); cur = []; } cur.push(n); }
  if (cur.length) clusters.push(cur);
  if (clusters.length > 1) { const first = clusters[0], last = clusters[clusters.length - 1]; if (first[0].rel + 360 - last[last.length - 1].rel <= TH) { clusters[0] = last.concat(first); clusters.pop(); } }
  for (const cl of clusters) { cl.forEach((n, idx) => { n.r = Math.max(R_PLAN - idx * 38, 170); const a = toAng(n.rel); n.x = CX + n.r * Math.cos(a); n.y = CY + n.r * Math.sin(a); }); }

  // tránsitos: anillo exterior con su propia anti-colisión (dos radios alternos)
  const trNodes = (data.transits || []).map(p => ({ ...p, rel: relOf(p.lon) })).sort((a, b) => a.rel - b.rel);
  if (trNodes.length) {
    const THT = 7, tcl = []; let tc = [];
    for (const n of trNodes) { if (tc.length && n.rel - tc[tc.length - 1].rel > THT) { tcl.push(tc); tc = []; } tc.push(n); }
    if (tc.length) tcl.push(tc);
    if (tcl.length > 1) { const f = tcl[0], l = tcl[tcl.length - 1]; if (f[0].rel + 360 - l[l.length - 1].rel <= THT) { tcl[0] = l.concat(f); tcl.pop(); } }
    const TR_R = [522, 547];
    for (const cl of tcl) { cl.forEach((n, idx) => { n.r = TR_R[idx % 2]; const a = toAng(n.rel); n.x = CX + n.r * Math.cos(a); n.y = CY + n.r * Math.sin(a); }); }
  }

  // líneas de aspectos (por signos o por grado)
  const isTr = n => n.key && String(n.key).startsWith('tr_');
  const lbl = n => n.kind === 'asc' ? 'asc' : `${n.glyph} ${n.name}${isTr(n) ? ' (tránsito)' : ''}`;
  const aspOf = (A, B) => data.aspectMode === 'degree' ? aspectByDegree(A.lon, B.lon, data.orbMax) : aspectBySigns(A.sign, B.sign);
  const pts = nodes.filter(n => n.kind !== 'asc');
  const ascNode = nodes.find(n => n.kind === 'asc');
  const asps = [];
  if (ascNode) { for (const p of pts) { const asp = aspOf(ascNode, p); if (asp) asps.push({ a: ascNode, b: p, asp, w: 2.2 }); } }
  for (let i = 0; i < pts.length; i++) { for (let j = i + 1; j < pts.length; j++) { const asp = aspOf(pts[i], pts[j]); if (asp) asps.push({ a: pts[i], b: pts[j], asp, w: 1.6 }); } }
  // aspectos tránsito→natal (siempre por grado, orbe fijo)
  const trTargets = ascNode ? pts.concat([ascNode]) : pts;
  for (const tn of trNodes) { for (const n of trTargets) { const asp = aspectByDegree(tn.lon, n.lon, TRANSIT_ORB); if (asp) asps.push({ a: tn, b: n, asp, w: 1.3, tr: true }); } }
  asps.forEach((L, i) => {
    const col = cssColor(L.asp.colorName);
    const orbTxt = (L.asp.orb != null) ? ` · orbe ${L.asp.orb.toFixed(1)}°` : '';
    const coords = `x1="${L.a.x.toFixed(1)}" y1="${L.a.y.toFixed(1)}" x2="${L.b.x.toFixed(1)}" y2="${L.b.y.toFixed(1)}"`;
    const line = L.tr
      ? `<line ${coords} stroke="${col}" stroke-width="${L.w}" stroke-dasharray="5 6" opacity=".8"/>`
      : `<line class="aspline" ${coords} stroke="${col}" stroke-width="${L.w}" pathLength="1"/>`;
    out.push(`<g class="${L.tr ? 'asp tr' : 'asp'}" data-k="${L.a.key}|${L.b.key}" data-type="${L.asp.type}" data-names="${lbl(L.a)} ↔ ${lbl(L.b)}${orbTxt}" style="--i:${i}">${line}<line class="asphit" ${coords} stroke="rgba(0,0,0,0)" stroke-width="16" pointer-events="stroke"/></g>`);
  });

  // dibujar nodos
  nodes.forEach((n, i) => {
    if (n.kind === 'asc') {
      out.push(`<g class="node" data-key="asc" style="--i:${i}"><rect x="${(n.x - 19).toFixed(1)}" y="${(n.y - 10).toFixed(1)}" width="38" height="20" rx="9" fill="${W('asc-fill', 'rgba(255,213,74,.12)')}" stroke="${W('angle', '#ffd54a')}" stroke-width="1.6"/><text x="${n.x.toFixed(1)}" y="${(n.y + 1).toFixed(1)}" fill="${W('angle', '#ffd54a')}" font-size="11" font-weight="bold" text-anchor="middle" dominant-baseline="central" font-family="system-ui,sans-serif">asc</text></g>`);
    } else {
      const cls = n.isObject ? 'node obj' : 'node';
      const ring = n.isObject ? W('obj-ring', 'rgba(183,172,214,.55)') : W('node-ring', 'rgba(255,233,166,.6)');
      const fill = n.isObject ? W('obj-fill', '#141026') : W('node-fill', '#1a1330');
      const retroMark = n.retro ? `<text x="${(n.x + 13).toFixed(1)}" y="${(n.y - 8).toFixed(1)}" fill="${W('retro', '#ff8fa3')}" font-size="11" font-weight="bold" text-anchor="middle" font-family="system-ui,sans-serif">℞</text>` : '';
      out.push(`<g class="${cls}" data-key="${n.key}" style="--i:${i}"><circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="12" fill="${fill}" stroke="${ring}" stroke-width="1.6"/><text x="${n.x.toFixed(1)}" y="${(n.y + 1).toFixed(1)}" fill="${W('glyph', '#fff3c2')}" font-size="20" font-weight="600" text-anchor="middle" dominant-baseline="central" font-family="${SYM_FONT}">${n.glyph}</text>${retroMark}</g>`);
    }
  });

  // nodos de tránsito (anillo exterior)
  trNodes.forEach((n, i) => {
    const retroMark = n.retro ? `<text x="${(n.x + 12).toFixed(1)}" y="${(n.y - 8).toFixed(1)}" fill="${W('retro', '#ff8fa3')}" font-size="10" font-weight="bold" text-anchor="middle" font-family="system-ui,sans-serif">℞</text>` : '';
    out.push(`<g class="node tr" data-key="${n.key}" style="--i:${nodes.length + i}"><circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="11" fill="${W('tr-fill', '#0e1a17')}" stroke="${W('tr-ring', 'rgba(124,255,182,.55)')}" stroke-width="1.4"/><text x="${n.x.toFixed(1)}" y="${(n.y + 1).toFixed(1)}" fill="${W('tr-glyph', '#c9f5dd')}" font-size="17" font-weight="600" text-anchor="middle" dominant-baseline="central" font-family="${SYM_FONT}">${n.glyph}</text>${retroMark}</g>`);
  });

  // anillo interior
  out.push(`<circle cx="${CX}" cy="${CY}" r="220" fill="none" stroke="${W('ring', 'rgba(183,172,214,.18)')}" stroke-width="1"/>`);

  svg.innerHTML = out.join('');

  // info para tooltips
  const houseOfLon = lon => { if (!cusps) return null; for (let h = 0; h < 12; h++) { const span = norm(cusps[(h + 1) % 12] - cusps[h]); if (norm(lon - cusps[h]) < span) return h + 1; } return null; };
  for (const n of nodes) {
    if (n.kind === 'asc') {
      const where = (!data.unknownTime) ? formatZodiac(data.ascDeg) : `sospechado: ${SIGN_NAMES[n.sign]}`;
      CHART_UI.nodeInfo.asc = `<b>ascendente</b><br>${where}<br><span class="muted">abre la casa i</span>`;
    } else {
      const hs = houseOfLon(n.lon); const houseTxt = hs ? `<br><span class="muted">casa ${roman(hs)}</span>` : '';
      const nm = n.approx ? `${n.name} ≈` : n.name;
      const digTxt = n.isObject ? '' : `<br>${DIG_TEXT[n.dig]}`;
      const retroTxt = n.retro ? ' <span style="color:var(--w-retro, #ff8fa3)">℞</span>' : '';
      CHART_UI.nodeInfo[n.key] = `<b>${n.glyph} ${nm}${retroTxt}</b><br>${formatZodiac(n.lon)}${digTxt}${houseTxt}`;
    }
  }
  for (const n of trNodes) {
    const hs = houseOfLon(n.lon); const houseTxt = hs ? `<br><span class="muted">casa ${roman(hs)} natal</span>` : '';
    const retroTxt = n.retro ? ' <span style="color:var(--w-retro, #ff8fa3)">℞</span>' : '';
    CHART_UI.nodeInfo[n.key] = `<b>${n.glyph} ${n.name}${retroTxt} — tránsito</b><br>${formatZodiac(n.lon)}${houseTxt}`;
  }
  if (cusps && !data.noHouses) {
    const houses = assignHousesByCusps(data.planets, cusps);
    for (let i = 0; i < 12; i++) {
      const h = houses[i];
      const pl = h.planets.length ? h.planets.map(p => `${p.glyph} ${p.name}`).join(' · ') : '—';
      const cuspTxt = (data.houseSystem === 'whole') ? SIGN_NAMES[Math.floor(h.cuspLon / 30)] : formatZodiac(h.cuspLon);
      CHART_UI.houseInfo[i] = `<b>casa ${roman(i + 1)} — ${cuspTxt}</b><br>${HOUSE_MEANINGS[i]}<br><span class="muted">planetas: ${pl}</span>`;
    }
  }

  // chips de capas
  const chips = $('#layerChips'); chips.innerHTML = '';
  const addChip = (layer, label) => { const c = document.createElement('button'); c.className = 'chip on'; c.dataset.layer = layer; c.textContent = label; chips.appendChild(c); };
  if (asps.length) addChip('asp', 'aspectos');
  if (nodes.some(n => n.kind === 'object')) addChip('obj', 'objetos');
  if (trNodes.length) addChip('tr', 'tránsitos');
  if (!data.unknownTime) addChip('ang', 'ángulos');
  svg.classList.remove('hide-asp', 'hide-obj', 'hide-ang', 'hide-tr');
}

// interacción de la rueda: tooltips + foco de aspectos
(function initChartInteraction() {
  const svg = $('#chartSvg'), tip = $('#tip'), box = $('#chartBox');
  const hideTip = () => { tip.hidden = true; };
  function showTip(html, e) {
    tip.innerHTML = html; tip.hidden = false;
    const r = box.getBoundingClientRect();
    let x = e.clientX - r.left + 14, y = e.clientY - r.top + 14;
    if (x + tip.offsetWidth > r.width - 6) x = Math.max(6, e.clientX - r.left - tip.offsetWidth - 14);
    if (y + tip.offsetHeight > r.height - 6) y = Math.max(6, e.clientY - r.top - tip.offsetHeight - 14);
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  const clearFocus = () => { svg.classList.remove('focus'); svg.querySelectorAll('.hot').forEach(el => el.classList.remove('hot')); };
  function focusNode(key) {
    clearFocus(); svg.classList.add('focus');
    const related = new Set([key]);
    svg.querySelectorAll('.asp').forEach(el => { const [a, b] = el.dataset.k.split('|'); if (a === key || b === key) { el.classList.add('hot'); related.add(a); related.add(b); } });
    svg.querySelectorAll('.node').forEach(el => { if (related.has(el.dataset.key)) el.classList.add('hot'); });
  }
  function focusAsp(el) {
    clearFocus(); svg.classList.add('focus'); el.classList.add('hot');
    const [a, b] = el.dataset.k.split('|');
    svg.querySelectorAll('.node').forEach(n => { if (n.dataset.key === a || n.dataset.key === b) n.classList.add('hot'); });
  }
  function onMove(e) {
    const t = e.target; if (!t.closest) return;
    const nodeEl = t.closest('.node'), aspEl = t.closest('.asp'), secEl = t.closest('.sector');
    if (nodeEl) { focusNode(nodeEl.dataset.key); showTip(CHART_UI.nodeInfo[nodeEl.dataset.key] || '', e); }
    else if (aspEl) { focusAsp(aspEl); showTip(`<b>${aspEl.dataset.type}</b><br>${aspEl.dataset.names}`, e); }
    else if (secEl && CHART_UI.houseInfo.length) { clearFocus(); showTip(CHART_UI.houseInfo[+secEl.dataset.house] || '', e); }
    else { clearFocus(); hideTip(); }
  }
  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('click', onMove);
  svg.addEventListener('pointerleave', () => { clearFocus(); hideTip(); });
})();

const PLANETS_ALL = [
  { key: 'Sun', glyph: '\u2609', name: 'sol' }, { key: 'Moon', glyph: '\u263D', name: 'luna' }, { key: 'Mercury', glyph: '\u263F', name: 'mercurio' }, { key: 'Venus', glyph: '\u2640', name: 'venus' }, { key: 'Mars', glyph: '\u2642', name: 'marte' }, { key: 'Jupiter', glyph: '\u2643', name: 'júpiter' }, { key: 'Saturn', glyph: '\u2644', name: 'saturno' }, { key: 'Uranus', glyph: '\u2645', name: 'urano' }, { key: 'Neptune', glyph: '\u2646', name: 'neptuno' }, { key: 'Pluto', glyph: '\u2647', name: 'plutón' }];
function getPlanetList() { return $('#chkVisible').checked ? PLANETS_ALL.slice(0, 7) : PLANETS_ALL; }

function computePlanets(utc, list) { const t = new Astronomy.AstroTime(utc); return list.map(p => { const lon = eclipticLongitude(p.key, t); const sign = Math.floor(lon / 30); const dig = dignityOf(p.key, sign); return { name: p.name, key: p.key, glyph: p.glyph, lon, sign, dig }; }); }

function assignHouses(planets, ascSign) { const houses = Array.from({ length: 12 }, () => ({ sign: null, planets: [] })); for (let i = 0; i < 12; i++) { houses[i].sign = (ascSign + i) % 12; } for (const p of planets) { const s = Math.floor(p.lon / 30); for (let h = 0; h < 12; h++) { if (houses[h].sign === s) { houses[h].planets.push(p); break; } } } return houses; }

const HOUSE_MEANINGS = [
  'vida, cuerpo, apariencia',
  'recursos, dinero, sustento',
  'hermanos, entorno cercano, viajes cortos',
  'hogar, raíces, padre/madre, fin de las cosas',
  'placer, creatividad, hijos',
  'esfuerzo, enfermedad, servicio',
  'pareja, acuerdos, aliados',
  'muerte, deudas, bienes compartidos',
  'dioses, fe, estudios, extranjero',
  'obra, rango, profesión, reputación',
  'amistades, grupos, dones',
  'lo oculto, retiro, enemigos, aflicciones'
];

const OBJ_DEFS = {
  nodes: [{ key: 'NNode', glyph: '☊', name: 'nodo norte' }, { key: 'SNode', glyph: '☋', name: 'nodo sur' }],
  lilith: { key: 'Lilith', glyph: '⚸', name: 'lilith' },
  chiron: { key: 'Chiron', glyph: '⚷', name: 'quirón', approx: true },
  fortune: { key: 'Fortune', glyph: '⊗', name: 'parte de la fortuna' }
};
const mkObj = (def, lon) => ({ key: def.key, glyph: def.glyph, name: def.name, lon: norm(lon), sign: Math.floor(norm(lon) / 30), isObject: true, dig: null, approx: !!def.approx });

function readOpts() {
  return {
    nodes: $('#objNodes').checked, lilith: $('#objLilith').checked, chiron: $('#objChiron').checked, fortune: $('#objFortune').checked,
    houseSystem: $('#houseSystem').value, aspectMode: $('#aspectMode').value, orbMax: parseFloat($('#orbMax').value) || 6,
    retro: $('#tradRetro').checked, sect: $('#tradSect').checked
  };
}

function computeAndDraw(mode) {
  const sky = !!(mode && mode.sky === true);
  if (!window.Astronomy) { setStatus('no se ha cargado astronomy engine.', 'error'); return; }
  const name = $('#name').value.trim(); const dateStr = $('#date').value; if (!dateStr) { setStatus('→ falta fecha.'); return; }
  const lat = parseFloat($('#lat').value), lon = parseFloat($('#lon').value);
  const skyOnly = sky && (isNaN(lat) || isNaN(lon)); // cielo ahora sin ubicación: sin casas ni asc
  if ((isNaN(lat) || isNaN(lon)) && !skyOnly) { setStatus('→ faltan coordenadas.'); return; }
  const tz = $('#tzSelect').value; const unknown = $('#chkUnknownTime').checked; const suspectStr = $('#suspectAsc').value; const suspectAscSign = (unknown && suspectStr !== '' ? parseInt(suspectStr, 10) : null);
  const [Y, M, D] = dateStr.split('-').map(Number); let utc;
  if (unknown) { utc = localToUTC(tz, Y, M, D, 12, 0); } else { const timeStr = $('#time').value || '12:00'; const [hh, mm] = timeStr.split(':').map(Number); utc = localToUTC(tz, Y, M, D, hh, mm || 0); }
  const opts = readOpts();
  const t = new Astronomy.AstroTime(utc);

  const plist = getPlanetList();
  const planets = computePlanets(utc, plist);
  if (opts.retro) for (const p of planets) p.retro = isRetro(p.key, t);

  let ascDeg = null, mc = null, ascSign, house0, noHouses = false;
  if (skyOnly) { ascSign = 0; house0 = 0; noHouses = true; }
  else if (unknown) { if (suspectAscSign != null) { ascSign = suspectAscSign; house0 = ascSign * 30; } else { ascSign = 0; house0 = 0; noHouses = true; } }
  else { ascDeg = ascendantLongitude(utc, lat, lon); mc = midheavenLongitude(utc, lon); ascSign = Math.floor(ascDeg / 30); house0 = ascSign * 30; }

  // secta (sólo con asc real)
  const sunLon = (planets.find(p => p.key === 'Sun') || {}).lon;
  const moonLon = (planets.find(p => p.key === 'Moon') || {}).lon;
  const diurnal = (!unknown && ascDeg != null && sunLon != null) ? isDiurnal(sunLon, ascDeg) : null;

  // objetos adicionales
  const objs = [];
  if (opts.nodes) { const nn = meanNodeLon(utc); objs.push(mkObj(OBJ_DEFS.nodes[0], nn)); objs.push(mkObj(OBJ_DEFS.nodes[1], nn + 180)); }
  if (opts.lilith) objs.push(mkObj(OBJ_DEFS.lilith, meanLilithLon(utc)));
  if (opts.chiron) objs.push(mkObj(OBJ_DEFS.chiron, chironLon(t)));
  if (opts.fortune && !unknown && ascDeg != null && sunLon != null && moonLon != null) { const fort = diurnal ? norm(ascDeg + moonLon - sunLon) : norm(ascDeg - moonLon + sunLon); objs.push(mkObj(OBJ_DEFS.fortune, fort)); }

  const points = planets.concat(objs);

  // cúspides por sistema
  let cusps = null;
  if (!noHouses) {
    if (opts.houseSystem === 'equal' && !unknown) cusps = equalCusps(ascDeg);
    else if (opts.houseSystem === 'placidus' && !unknown) cusps = placidusCusps(utc, lat, lon, ascDeg, mc);
    else cusps = wholeCusps(ascSign); // whole sign (o fallback si no hay hora exacta)
  }
  const effSystem = (noHouses || unknown || opts.houseSystem === 'whole') ? 'whole' : opts.houseSystem;

  lastRender = { planets: points, house0, ascSign, ascDeg, mc, unknownTime: unknown || skyOnly, noHouses, suspectAscSign, cusps, houseSystem: effSystem, aspectMode: opts.aspectMode, orbMax: opts.orbMax };
  renderChart(lastRender);

  // resumen + ángulos
  const summary = $('#summary'); const tzName = tz; const ts = unknown ? '— hora desconocida (asumimos 12:00)' : ($('#time').value || '12:00');
  const titleTxt = sky ? 'cielo ahora' : (name || 'carta natal');
  const locTxt = skyOnly ? 'sin ubicación (solo cielo)' : `lat ${lat.toFixed(4)}°, lon ${lon.toFixed(4)}°`;
  const ascText = skyOnly ? '<b>asc:</b> <i>— (sin ubicación)</i>' : unknown ? (suspectAscSign != null ? `<b>asc:</b> <i>sospechado</i> ${SIGN_NAMES[suspectAscSign]}` : '<b>asc:</b> <i>desconocido</i>') : `<b>asc:</b> ${formatZodiac(ascDeg)}`;
  const mcText = skyOnly ? '<b>mc:</b> <i>—</i>' : unknown ? '<b>mc:</b> <i>desconocido</i>' : `<b>mc:</b> ${formatZodiac(mc)}`;
  const sysText = (effSystem !== 'whole') ? ` · casas: ${effSystem}` : '';
  const sectText = (opts.sect && diurnal != null) ? ` · carta ${diurnal ? 'diurna' : 'nocturna'}` : '';
  summary.innerHTML = `<div><b>${titleTxt}</b> — ${dateStr} ${ts} ${tzName} · ${locTxt}</div>
                       <div class="mini">${ascText} · ${mcText}${sysText}${sectText}</div>`;

  const angles = $('#anglesInfo'); angles.innerHTML = `
    <div class="mini">
      <b>asc</b> une cielo y tierra en tu nacimiento (oriente), abre la casa i. <b>mc</b> es la culminación/obra.
      <b>dc</b> es el occidente y los vínculos (casa vii). <b>ic</b> habla del hogar, raíces y cierres.
    </div>`;

  // Planetas + objetos (leyenda)
  const ro = $('#readout'); ro.innerHTML = '';
  for (const p of planets) { const d = document.createElement('div'); const retro = p.retro ? ' <span style="color:var(--w-retro, #ff8fa3)">℞</span>' : ''; d.innerHTML = `<div><span>${p.glyph} ${p.name}${retro}</span> · <span class="muted">${formatZodiac(p.lon)}</span> · <span>${DIG_TEXT[p.dig]}</span></div>`; ro.appendChild(d); }
  for (const o of objs) { const d = document.createElement('div'); d.innerHTML = `<div><span>${o.glyph} ${o.name}${o.approx ? ' ≈' : ''}</span> · <span class="muted">${formatZodiac(o.lon)}</span></div>`; ro.appendChild(d); }

  const aspOf = (aLon, aSign, bLon, bSign) => opts.aspectMode === 'degree' ? aspectByDegree(aLon, bLon, opts.orbMax) : aspectBySigns(aSign, bSign);
  const colOf = cn => getComputedStyle(document.documentElement).getPropertyValue(`--${cn}`) || '#fff';
  const orbStr = a => a.orb != null ? ` <span class="muted">(orbe ${a.orb.toFixed(1)}°)</span>` : '';

  // Aspectos al asc
  const ascBox = $('#ascAspects'); ascBox.innerHTML = '';
  const canAspectsList = (!unknown && ascDeg != null) || (suspectAscSign != null);
  if (canAspectsList) {
    const ascSignEff = (!unknown) ? Math.floor(ascDeg / 30) : suspectAscSign;
    const ascLonEff = (!unknown) ? ascDeg : ascSignEff * 30;
    for (const p of points) { const asp = aspOf(ascLonEff, ascSignEff, p.lon, p.sign); if (asp) { const item = document.createElement('div'); item.innerHTML = `<div><span>${p.glyph} ${p.name}</span> — <b>${asp.type}</b>${orbStr(asp)}</div>`; item.style.color = colOf(asp.colorName); ascBox.appendChild(item); } }
    if (!ascBox.children.length) ascBox.innerHTML = '<div class="mini">no hay aspectos principales al ascendente.</div>';
  } else ascBox.innerHTML = '<div class="mini">no se calculan aspectos al asc sin hora ni ascendente sospechado.</div>';

  // Aspectos punto↔punto
  const pp = $('#ppAspects'); pp.innerHTML = '';
  for (let i = 0; i < points.length; i++) { for (let j = i + 1; j < points.length; j++) { const A = points[i], B = points[j]; const asp = aspOf(A.lon, A.sign, B.lon, B.sign); if (asp) { const row = document.createElement('div'); row.innerHTML = `<div>${A.glyph} ${A.name} ↔ ${B.glyph} ${B.name} — <b>${asp.type}</b>${orbStr(asp)}</div>`; row.style.color = colOf(asp.colorName); pp.appendChild(row); } } }
  if (!pp.children.length) pp.innerHTML = '<div class="mini">no hay aspectos entre los puntos seleccionados.</div>';

  // Casas
  const hs = $('#houses'); hs.innerHTML = '';
  if (!noHouses) {
    const houses = assignHousesByCusps(points, cusps);
    for (let i = 0; i < 12; i++) { const h = houses[i]; const div = document.createElement('div'); const plist = h.planets.length ? h.planets.map(pt => `${pt.glyph} ${pt.name}`).join(' · ') : '<span class="muted">—</span>'; const head = (effSystem === 'whole') ? SIGN_NAMES[Math.floor(h.cuspLon / 30)] : formatZodiac(h.cuspLon); div.innerHTML = `<b class="serif" style="font-size:18px">casa ${roman(i + 1)}</b> — ${head} · <span class="muted">${HOUSE_MEANINGS[i]}</span><br/><span class="muted">planetas:</span> ${plist}`; hs.appendChild(div); }
  } else hs.innerHTML = skyOnly ? '<div class="mini">casas: <i>no disponibles</i> (sin ubicación).</div>' : '<div class="mini">casas: <i>no disponibles</i> (hora desconocida y sin ascendente sospechado).</div>';

  exportMeta = { line1: titleTxt, line2: `${dateStr} ${ts} · ${tzName} · ${locTxt}` };
  syncURL();

  // si los tránsitos estaban activos, recalcularlos sobre la nueva carta
  if ($('#chkTr').checked) applyTransits();

  document.body.classList.add('presentation');
}

// Geocoder OSM
async function geocode() { const q = $('#q').value.trim(); if (!q) return; setStatus('buscando…'); try { const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`; const res = await fetch(url, { headers: { 'Accept-Language': 'es' } }); const arr = await res.json(); if (arr && arr.length) { $('#lat').value = parseFloat(arr[0].lat).toFixed(6); $('#lon').value = parseFloat(arr[0].lon).toFixed(6); setStatus(`📍 ${arr[0].display_name}`); } else setStatus('no encontrado.'); } catch (e) { setStatus('error de red al geocodificar.', 'error'); } }

// TZ selector (IANA)
function populateTZ() {
  const sel = $('#tzSelect'); sel.innerHTML = ''; let zones = []; if (Intl.supportedValuesOf) { try { zones = Intl.supportedValuesOf('timeZone'); } catch (_) { } } if (!zones || zones.length === 0) { zones = ['Europe/Madrid', 'Europe/Paris', 'Europe/London', 'Europe/Rome', 'Europe/Berlin', 'Europe/Lisbon', 'UTC', 'Africa/Casablanca', 'Africa/Johannesburg', 'America/Sao_Paulo', 'America/Argentina/Buenos_Aires', 'America/Mexico_City', 'America/Bogota', 'America/Lima', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Asia/Tokyo', 'Asia/Seoul', 'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Dubai', 'Australia/Sydney']; }
  const current = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; for (const z of zones) { const opt = document.createElement('option'); opt.value = z; opt.textContent = z; if (z === current) opt.selected = true; sel.appendChild(opt); }
}

function fillNow() { populateTZ(); const d = new Date(); $('#date').valueAsDate = new Date(d.getFullYear(), d.getMonth(), d.getDate()); $('#time').value = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; if (navigator.geolocation) { navigator.geolocation.getCurrentPosition(pos => { $('#lat').value = pos.coords.latitude.toFixed(6); $('#lon').value = pos.coords.longitude.toFixed(6); setStatus('coordenadas obtenidas del dispositivo.'); }, () => { }, { enableHighAccuracy: true, timeout: 4000 }); } }

function exportPNG() {
  const svg = $('#chartSvg'); const clone = svg.cloneNode(true);
  clone.removeAttribute('class');
  clone.setAttribute('width', '1120'); clone.setAttribute('height', '1120');
  const xml = new XMLSerializer().serializeToString(clone);
  const img = new Image();
  img.onload = () => {
    const S = 2, HEAD = 120;
    const c = document.createElement('canvas'); c.width = 1120 * S; c.height = (1120 + HEAD) * S;
    const ctx = c.getContext('2d');
    ctx.fillStyle = W('png-bg', '#07050a'); ctx.fillRect(0, 0, c.width, c.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = W('png-title', '#ffd54a'); ctx.font = `${34 * S}px ${W('png-title-font', '"Spectral SC", Georgia, serif')}`;
    ctx.fillText(exportMeta.line1, c.width / 2, 54 * S);
    ctx.fillStyle = W('png-text', '#b7acd6'); ctx.font = `${15 * S}px ${W('png-font', 'Inter, system-ui, sans-serif')}`;
    ctx.fillText(exportMeta.line2, c.width / 2, 88 * S);
    ctx.drawImage(img, 0, HEAD * S, 1120 * S, 1120 * S);
    const a = document.createElement('a'); a.download = 'carta_whole_sign.png'; a.href = c.toDataURL('image/png'); a.click();
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
}

// UI switches (genérico: sincroniza todos los toggles .on/off)
function updateSwitchUI() {
  document.querySelectorAll('.toggle').forEach(t => { const cb = t.querySelector('input[type="checkbox"]'); if (!cb) return; t.classList.toggle('on', cb.checked); const pill = t.querySelector('.pill'); if (pill) pill.textContent = cb.checked ? 'on' : 'off'; });
  const unk = $('#chkUnknownTime').checked;
  $('#unknownExtras').style.display = unk ? 'block' : 'none';
  const time = $('#time'); if (time) time.disabled = unk;
  const orbRow = $('#orbRow'); if (orbRow) orbRow.style.display = ($('#aspectMode').value === 'degree') ? 'block' : 'none';
}

// Autotest (igual + tests de aspectos)
function addTestLine(msg, ok) { const el = document.createElement('div'); el.innerHTML = `${ok ? '✅' : '❌'} <span class="${ok ? 'pass' : 'fail'}">${msg}</span>`; const box = $('#testout'); if (box) box.appendChild(el); }
function clearTests() { const box = $('#testout'); if (box) box.innerHTML = ''; }
function runTests() {
  clearTests();
  addTestLine('carga de astronomy engine', !!window.Astronomy);
  if (!window.Astronomy) { addTestLine('sin astronomy no se pueden calcular planetas.', false); return; }
  try { const utc = new Date(Date.UTC(2024, 0, 1, 12, 0, 0)); const t = new Astronomy.AstroTime(utc); const bodies = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']; let okAll = true; for (const b of bodies) { const lon = eclipticLongitude(b, t); if (!(isFinite(lon) && lon >= 0 && lon < 360)) okAll = false; } addTestLine('longitudes planetarias dentro de [0,360)', okAll); } catch (e) { addTestLine('error longitudes: ' + e.message, false); }
  try { const utc = new Date(Date.UTC(2024, 5, 1, 12, 0, 0)); const asc = ascendantLongitude(utc, 41.387, 2.170); const mc = midheavenLongitude(utc, 2.170); addTestLine('asc rango [0,360)', asc >= 0 && asc < 360); addTestLine('mc rango [0,360)', mc >= 0 && mc < 360); } catch (e) { addTestLine('error en asc/mc: ' + e.message, false); }
  const digsOK = dignityOf('Mars', 0) === 'dom' && dignityOf('Sun', 0) === 'ex' && dignityOf('Saturn', 6) === 'ex' && dignityOf('Saturn', 3) === 'det'; addTestLine('dignidades: reglas base', digsOK);
  try { const A = 0; const expect = (s, kind) => (aspectBySigns(A, s) || {}).type === kind; const okSxt = expect(2, 'sextil'); const okSqr = expect(3, 'cuadratura'); const okTri = expect(4, 'trígono'); const okOpp = expect(6, 'oposición'); addTestLine('aspectos por signos (2/3/4/6)', okSxt && okSqr && okTri && okOpp); const sym = (a, b) => { const x = aspectBySigns(a, b), y = aspectBySigns(b, a); return (!x && !y) || (x && y && x.type === y.type); }; addTestLine('aspectos por signos simétricos', sym(0, 4) && sym(0, 6) && sym(1, 3)); } catch (e) { addTestLine('error aspectos por signos: ' + e.message, false); }
  try { const utc = new Date(Date.UTC(1997, 1, 28, 14, 40, 0)); const nn = meanNodeLon(utc), li = meanLilithLon(utc), ch = chironLon(new Astronomy.AstroTime(utc)); const inRange = v => isFinite(v) && v >= 0 && v < 360; addTestLine('objetos (nodo/lilith/quirón) en [0,360)', inRange(nn) && inRange(li) && inRange(ch)); } catch (e) { addTestLine('error objetos: ' + e.message, false); }
  try { const okC = (aspectByDegree(0, 3, 6) || {}).type === 'conjunción'; const okT = (aspectByDegree(0, 122, 6) || {}).type === 'trígono'; const okNone = aspectByDegree(0, 45, 6) === null; addTestLine('aspectos por grado (conj/tríg/orbe)', okC && okT && okNone); } catch (e) { addTestLine('error aspectos por grado: ' + e.message, false); }
  try { const utc = new Date(Date.UTC(1997, 1, 28, 14, 40, 0)); const asc = ascendantLongitude(utc, 36.6, -6.216667), mc = midheavenLongitude(utc, -6.216667); const pc = placidusCusps(utc, 36.6, -6.216667, asc, mc); const angOK = Math.abs(norm(pc[0] - asc)) < 1e-6 && Math.abs(norm(pc[9] - mc)) < 1e-6; const oppOK = Math.abs(Math.abs(norm(pc[0] - pc[6])) - 180) < 1e-6; addTestLine('placidus: c1=asc, c10=mc, oposiciones', angOK && oppOK); } catch (e) { addTestLine('error placidus: ' + e.message, false); }
}

// ===== URL compartible (y serialización del formulario para la biblioteca) =====
function collectParams() {
  const p = new URLSearchParams();
  const put = (k, v) => { if (v !== '' && v != null) p.set(k, v); };
  put('n', $('#name').value.trim()); put('d', $('#date').value);
  const unk = $('#chkUnknownTime').checked;
  if (!unk) put('t', $('#time').value);
  put('tz', $('#tzSelect').value); put('lat', $('#lat').value); put('lon', $('#lon').value);
  if (unk) { p.set('u', '1'); if ($('#suspectAsc').value !== '') p.set('sa', $('#suspectAsc').value); }
  if (!$('#chkVisible').checked) p.set('all', '1');
  if ($('#objNodes').checked) p.set('no', '1');
  if ($('#objLilith').checked) p.set('li', '1');
  if ($('#objChiron').checked) p.set('ch', '1');
  if ($('#objFortune').checked) p.set('fo', '1');
  if ($('#houseSystem').value !== 'whole') p.set('hsy', $('#houseSystem').value);
  if ($('#aspectMode').value !== 'sign') { p.set('am', $('#aspectMode').value); p.set('orb', $('#orbMax').value); }
  if ($('#tradRetro').checked) p.set('re', '1');
  if ($('#tradSect').checked) p.set('se', '1');
  return p;
}
function syncURL() { history.replaceState(null, '', location.pathname + '?' + collectParams().toString()); }

function applyURLParams() {
  const p = new URLSearchParams(location.search);
  if (![...p.keys()].length) return false;
  applyParams(p);
  return !!(p.get('d') && p.get('lat') && p.get('lon'));
}

function applyParams(p) {
  if (p.get('n')) $('#name').value = p.get('n');
  if (p.get('d')) $('#date').value = p.get('d');
  if (p.get('t')) $('#time').value = p.get('t');
  if (p.get('tz')) { const sel = $('#tzSelect'); if ([...sel.options].some(o => o.value === p.get('tz'))) sel.value = p.get('tz'); }
  if (p.get('lat')) $('#lat').value = p.get('lat');
  if (p.get('lon')) $('#lon').value = p.get('lon');
  $('#chkUnknownTime').checked = p.get('u') === '1';
  const sa = p.get('sa'); if (sa != null && sa !== '') $('#suspectAsc').value = sa;
  $('#chkVisible').checked = p.get('all') !== '1';
  $('#objNodes').checked = p.get('no') === '1';
  $('#objLilith').checked = p.get('li') === '1';
  $('#objChiron').checked = p.get('ch') === '1';
  $('#objFortune').checked = p.get('fo') === '1';
  if (p.get('hsy')) $('#houseSystem').value = p.get('hsy');
  if (p.get('am')) $('#aspectMode').value = p.get('am');
  if (p.get('orb')) { $('#orbMax').value = p.get('orb'); const ov = $('#orbVal'); if (ov) ov.textContent = p.get('orb'); }
  $('#tradRetro').checked = p.get('re') === '1';
  $('#tradSect').checked = p.get('se') === '1';
  if ([p.get('no'), p.get('li'), p.get('ch'), p.get('fo'), p.get('hsy'), p.get('am'), p.get('re'), p.get('se')].some(Boolean)) { const ap = $('#advPanel'), ab = $('#btnAdv'); if (ap) ap.hidden = false; if (ab) ab.setAttribute('aria-expanded', 'true'); }
  updateSwitchUI();
}

// ===== Tránsitos (biwheel) =====
const TRANSIT_ORB = 3;
let lastRender = null;

function setTransitNow() { const d = new Date(); $('#trDate').valueAsDate = new Date(d.getFullYear(), d.getMonth(), d.getDate()); $('#trTime').value = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
function computeTransits() {
  const dStr = $('#trDate').value; if (!dStr) return null;
  const tm = $('#trTime').value || '12:00';
  const [Y, M, D] = dStr.split('-').map(Number); const [hh, mm] = tm.split(':').map(Number);
  const utc = localToUTC($('#tzSelect').value, Y, M, D, hh, mm || 0);
  const t = new Astronomy.AstroTime(utc);
  return getPlanetList().map(p => { const lon = eclipticLongitude(p.key, t); return { key: 'tr_' + p.key, name: p.name, glyph: p.glyph, lon, sign: Math.floor(lon / 30), retro: isRetro(p.key, t) }; });
}
function applyTransits() {
  if (!lastRender || !window.Astronomy) return;
  const on = $('#chkTr').checked;
  $('#trCtrl').style.display = on ? 'block' : 'none';
  if (!on) { renderChart(lastRender); $('#trAspects').innerHTML = ''; return; }
  if (!$('#trDate').value) setTransitNow();
  const tr = computeTransits(); if (!tr) return;
  renderChart({ ...lastRender, transits: tr });
  renderTransitAspects(tr);
}
function renderTransitAspects(tr) {
  const box = $('#trAspects'); box.innerHTML = '';
  const colOf = cn => getComputedStyle(document.documentElement).getPropertyValue(`--${cn}`) || '#fff';
  const targets = [...lastRender.planets];
  if (!lastRender.unknownTime && lastRender.ascDeg != null) targets.push({ glyph: '', name: 'ascendente', lon: lastRender.ascDeg });
  for (const tp of tr) {
    for (const n of targets) {
      const asp = aspectByDegree(tp.lon, n.lon, TRANSIT_ORB);
      if (asp) { const row = document.createElement('div'); row.innerHTML = `<div>${tp.glyph} ${tp.name} <span class="muted">(tránsito)</span> → ${n.glyph} ${n.name} — <b>${asp.type}</b> <span class="muted">(orbe ${asp.orb.toFixed(1)}°)</span></div>`; row.style.color = colOf(asp.colorName); box.appendChild(row); }
    }
  }
  if (!box.children.length) box.innerHTML = '<div class="mini">sin aspectos dentro del orbe de 3° en ese momento.</div>';
}

// ===== Cielo ahora =====
function skyNow() {
  populateTZ();
  const d = new Date();
  $('#date').valueAsDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  $('#time').value = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  $('#chkUnknownTime').checked = false; updateSwitchUI();
  const draw = () => computeAndDraw({ sky: true });
  if (navigator.geolocation) {
    // dibuja ya con lo que haya; si llega la geolocalización, redibuja con asc/casas del lugar
    navigator.geolocation.getCurrentPosition(
      pos => { $('#lat').value = pos.coords.latitude.toFixed(6); $('#lon').value = pos.coords.longitude.toFixed(6); draw(); },
      () => { }, { enableHighAccuracy: false, timeout: 3500 });
  }
  draw();
}

// ===== Biblioteca de cartas (localStorage) =====
const STORE_KEY = 'wshc_people';
function loadPeople() { try { const v = JSON.parse(localStorage.getItem(STORE_KEY)); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function savePeople(list) { try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch (e) { setStatus('no se pudo guardar (¿almacenamiento lleno?).', 'error'); } }
const escHTML = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function renderLibrary() {
  const list = loadPeople(); const ul = $('#libraryList');
  ul.innerHTML = '';
  if (!list.length) { ul.innerHTML = '<div class="mini">aún no hay cartas guardadas — rellena el formulario y pulsa «guardar carta».</div>'; return; }
  for (const rec of list) {
    const div = document.createElement('div'); div.className = 'libRow';
    const when = rec.params.u === '1' ? `${rec.params.d || ''} · hora desconocida` : `${rec.params.d || ''} ${rec.params.t || ''}`;
    div.innerHTML = `<button class="libLoad" data-id="${rec.id}"><b>${escHTML(rec.name)}</b> <span class="muted">— ${escHTML(when)}</span></button><button class="libDel" data-id="${rec.id}" title="borrar carta">×</button>`;
    ul.appendChild(div);
  }
}
function saveCurrent() {
  let name = $('#name').value.trim();
  if (!name) { name = (prompt('nombre para guardar la carta:') || '').trim(); if (!name) return false; $('#name').value = name; }
  if (!$('#date').value) { setStatus('→ falta fecha: no hay carta que guardar.'); return false; }
  const params = Object.fromEntries(collectParams());
  const list = loadPeople();
  const i = list.findIndex(r => (r.name || '').toLowerCase() === name.toLowerCase());
  const rec = { id: i >= 0 ? list[i].id : Date.now(), name, params, saved: new Date().toISOString() };
  if (i >= 0) list[i] = rec; else list.push(rec);
  savePeople(list); renderLibrary(); setStatus(`carta de «${name}» guardada en este navegador.`);
  return true;
}
function exportLibrary() {
  const payload = { app: 'wholeSignHouseChart', version: 1, charts: loadPeople() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.download = 'cartas_guardadas.json'; a.href = URL.createObjectURL(blob); a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
}
function importLibrary(file) {
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const data = JSON.parse(rd.result);
      const incoming = Array.isArray(data) ? data : (data && Array.isArray(data.charts) ? data.charts : null);
      if (!incoming) { setStatus('json no reconocido.', 'error'); return; }
      const list = loadPeople(); let added = 0, updated = 0;
      for (const rec of incoming) {
        if (!rec || !rec.name || !rec.params) continue;
        const i = list.findIndex(r => (r.name || '').toLowerCase() === String(rec.name).toLowerCase());
        const clean = { id: i >= 0 ? list[i].id : (rec.id || Date.now() + Math.floor(Math.random() * 1e6)), name: String(rec.name), params: rec.params, saved: rec.saved || new Date().toISOString() };
        if (i >= 0) { list[i] = clean; updated++; } else { list.push(clean); added++; }
      }
      savePeople(list); renderLibrary(); setStatus(`importadas: ${added} nuevas, ${updated} actualizadas.`);
    } catch (e) { setStatus('no se pudo leer el json.', 'error'); }
  };
  rd.readAsText(file);
}

// Listeners
$('#btnGeo').addEventListener('click', geocode);
$('#btnDraw').addEventListener('click', () => computeAndDraw());
$('#btnNow').addEventListener('click', () => { fillNow(); setStatus(''); });
$('#btnSkyNow').addEventListener('click', skyNow);

// Biblioteca
$('#btnSave').addEventListener('click', saveCurrent);
$('#btnSaveTop').addEventListener('click', () => { if (saveCurrent()) { const b = $('#btnSaveTop'); b.textContent = '¡guardada!'; setTimeout(() => { b.textContent = 'guardar'; }, 1600); } });
$('#libraryList').addEventListener('click', e => {
  const del = e.target.closest('.libDel'), load = e.target.closest('.libLoad');
  const list = loadPeople();
  if (del) { const rec = list.find(r => String(r.id) === del.dataset.id); if (rec && confirm(`¿borrar la carta de «${rec.name}»?`)) { savePeople(list.filter(r => String(r.id) !== del.dataset.id)); renderLibrary(); } return; }
  if (load) { const rec = list.find(r => String(r.id) === load.dataset.id); if (!rec) return; applyParams(new URLSearchParams(rec.params)); computeAndDraw(); }
});
$('#btnExportLib').addEventListener('click', exportLibrary);
$('#btnImportLib').addEventListener('click', () => $('#fileImport').click());
$('#fileImport').addEventListener('change', e => { if (e.target.files[0]) importLibrary(e.target.files[0]); e.target.value = ''; });

// Tránsitos
$('#chkTr').addEventListener('change', applyTransits);
$('#trDate').addEventListener('change', () => { if ($('#chkTr').checked) applyTransits(); });
$('#trTime').addEventListener('change', () => { if ($('#chkTr').checked) applyTransits(); });
$('#btnTrNow').addEventListener('click', () => { setTransitNow(); if ($('#chkTr').checked) applyTransits(); });
$('#btnTest').addEventListener('click', runTests);
$('#btnExample').addEventListener('click', () => { $('#name').value = 'ejemplo'; $('#date').value = '1997-02-28'; $('#time').value = '15:40'; $('#lat').value = '36.600000'; $('#lon').value = '-6.216667'; setStatus('ejemplo cargado.'); });
$('#chkUnknownTime').addEventListener('change', updateSwitchUI);
$('#chkVisible').addEventListener('change', updateSwitchUI);

// Modo avanzado: desplegable + controles
$('#btnAdv').addEventListener('click', () => { const ap = $('#advPanel'), ab = $('#btnAdv'); const open = ap.hidden; ap.hidden = !open; ab.setAttribute('aria-expanded', String(open)); });
document.addEventListener('change', e => { if (e.target.matches && e.target.matches('.toggle input, #aspectMode, #houseSystem')) updateSwitchUI(); });
$('#orbMax').addEventListener('input', () => { const ov = $('#orbVal'); if (ov) ov.textContent = $('#orbMax').value; });
// Chips de capas (mostrar/ocultar sin volver a editar)
$('#layerChips').addEventListener('click', e => { const c = e.target.closest('.chip'); if (!c) return; const on = c.classList.toggle('on'); $('#chartSvg').classList.toggle('hide-' + c.dataset.layer, !on); });

// Toolbar
$('#btnBack').addEventListener('click', () => { document.body.classList.remove('presentation'); });
$('#btnExport').addEventListener('click', exportPNG);
$('#btnShare').addEventListener('click', async () => { syncURL(); const b = $('#btnShare'); try { await navigator.clipboard.writeText(location.href); b.textContent = '\u00a1enlace copiado!'; setTimeout(() => { b.textContent = 'compartir enlace'; }, 1600); } catch (e) { prompt('copia el enlace:', location.href); } });

(async function init() {
  populateTZ();
  renderLibrary();
  const fromURL = applyURLParams();
  if (!fromURL) fillNow();
  updateSwitchUI();
  setStatus('cargando librer\u00eda astron\u00f3mica\u2026');
  const ok = await loadAstronomy();
  setStatus(ok ? 'librer\u00eda lista.' : 'no se pudo cargar astronomy engine.', (ok ? 'info' : 'error'));
  if (ok && fromURL) computeAndDraw();
})();

