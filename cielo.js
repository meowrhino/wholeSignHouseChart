// ===== Fondo de estrellas (tomado y adaptado de tu index) =====
const sky = document.getElementById('estrellas-canvas');
const sctx = sky.getContext('2d');
const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// el campo de estrellas es más alto que la ventana: el sobrante se desplaza con el scroll
// (parallax dibujado dentro del canvas; un transform css sobre un fixed provoca glitches)
let FIELD_H = window.innerHeight;
function resizeSky() { sky.width = window.innerWidth; sky.height = window.innerHeight; FIELD_H = Math.floor(window.innerHeight * (REDUCE_MOTION ? 1 : 1.35)); }
resizeSky(); window.addEventListener('resize', () => { resizeSky(); stars = makeStars(); consts = makeConstellations(); skyParallax(); });

const CONSTELLATIONS = () => Math.floor(Math.random() * 4) + 10;
const GROUP_SIZES = [4, 5, 6, 7, 8, 9, 10];

function makeStars() { const arr = []; const count = Math.floor(sky.width * FIELD_H / 1500); for (let i = 0; i < count; i++) { arr.push({ x: Math.random() * sky.width, y: Math.random() * FIELD_H, r: Math.random() * 0.7 + 0.6, a: Math.random() * 0.7 + 0.3, ph: Math.random() * Math.PI * 2 }); } return arr; }

let skyShift = 0;
const mouse = { x: -1e4, y: -1e4 };
window.addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
function skyParallax() { if (REDUCE_MOTION) return; const extra = Math.max(0, FIELD_H - window.innerHeight); const doc = document.documentElement.scrollHeight - window.innerHeight; const f = doc > 0 ? Math.min(window.scrollY / doc, 1) : 0; skyShift = -f * extra; }
window.addEventListener('scroll', skyParallax, { passive: true });
function flicker(e, t) { return e.a * (0.93 + 0.07 * Math.sin(t * 0.37 + e.ph)); }

function makeConstellations() { const list = []; for (let i = 0; i < CONSTELLATIONS(); i++) { const num = GROUP_SIZES[Math.floor(Math.random() * GROUP_SIZES.length)]; const cx = Math.random() * (sky.width * 0.8) + sky.width * 0.1; const cy = Math.random() * (FIELD_H * 0.8) + FIELD_H * 0.1; const rg = Math.min(sky.width, FIELD_H) * (0.10 + Math.random() * 0.08); const used = new Set(); const nodes = []; let attempts = 0; while (nodes.length < num && attempts < 200) { const ang = Math.random() * 2 * Math.PI; const rr = Math.random() * rg * 0.85; const x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr; let best = null, bd = 1e9; for (let j = 0; j < stars.length; j++) { if (used.has(j)) continue; const e = stars[j]; const d = Math.hypot(e.x - x, e.y - y); if (d < bd) { bd = d; best = j; } } if (best !== null) { used.add(best); nodes.push(best); } attempts++; } const edges = []; if (nodes.length > 1) { let connected = [0]; let rest = Array.from({ length: nodes.length }, (_, i) => i).slice(1); while (rest.length) { let bd = 1e9, fi = null, ti = null; for (const i of connected) { for (const j of rest) { const A = stars[nodes[i]], B = stars[nodes[j]]; const d = Math.hypot(A.x - B.x, A.y - B.y); if (d < bd) { bd = d; fi = i; ti = j; } } } edges.push([fi, ti]); connected.push(ti); rest = rest.filter(x => x !== ti); } } if (nodes.length > 4 && Math.random() > 0.5) { const a = Math.floor(Math.random() * nodes.length); const b = (a + 2 + Math.floor(Math.random() * (nodes.length - 3))) % nodes.length; if (!edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) { edges.push([a, b]); } } let sx = 0, sy = 0; for (const i of nodes) { sx += stars[i].x; sy += stars[i].y; } list.push({ nodes, edges, cx: sx / (nodes.length || 1), cy: sy / (nodes.length || 1) }); } return list; }

let stars = makeStars();
let consts = makeConstellations();

const meteors = [];
function paintSky(t) {
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.clearRect(0, 0, sky.width, sky.height);
  sctx.translate(0, skyShift); // parallax: el campo se desliza dentro del lienzo
  for (const e of stars) { sctx.save(); sctx.beginPath(); sctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); sctx.globalAlpha = flicker(e, t / 1000); sctx.fillStyle = '#fff'; sctx.shadowColor = '#fff'; sctx.shadowBlur = 6 + e.a * 14; sctx.fill(); sctx.restore(); }
  // constelaciones: se iluminan cerca del cursor
  const my = mouse.y - skyShift;
  for (const c of consts) {
    const glow = Math.max(0, 1 - Math.hypot(c.cx - mouse.x, c.cy - my) / 300);
    sctx.save(); sctx.strokeStyle = `rgba(255,255,255,${(0.30 + 0.42 * glow).toFixed(3)})`; sctx.lineWidth = 1.2; sctx.setLineDash([1, 5]); sctx.beginPath();
    for (const [i1, i2] of c.edges) { const A = stars[c.nodes[i1]], B = stars[c.nodes[i2]]; sctx.moveTo(A.x, A.y); sctx.lineTo(B.x, B.y); }
    sctx.stroke(); sctx.setLineDash([]); sctx.restore();
  }
  // estrellas fugaces ocasionales
  if (!REDUCE_MOTION) {
    if (Math.random() < 0.0012 && meteors.length < 2) { const dir = Math.random() < 0.5 ? 1 : -1; meteors.push({ x: Math.random() * sky.width, y: Math.random() * FIELD_H * 0.5, vx: dir * (6 + Math.random() * 5), vy: 3 + Math.random() * 3, life: 0 }); }
    for (const m of meteors) { m.x += m.vx; m.y += m.vy; m.life += 0.022; const a = Math.sin(Math.PI * Math.min(m.life, 1)) * 0.85; sctx.save(); sctx.strokeStyle = `rgba(255,244,196,${a.toFixed(3)})`; sctx.lineWidth = 1.6; sctx.beginPath(); sctx.moveTo(m.x - m.vx * 9, m.y - m.vy * 9); sctx.lineTo(m.x, m.y); sctx.stroke(); sctx.restore(); }
    for (let i = meteors.length - 1; i >= 0; i--) { const m = meteors[i]; if (m.life >= 1 || m.x < -80 || m.x > sky.width + 80 || m.y > FIELD_H + 80) meteors.splice(i, 1); }
  }
  requestAnimationFrame(paintSky);
}
requestAnimationFrame(paintSky);
