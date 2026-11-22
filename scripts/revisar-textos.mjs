// revisa que los textos de la lectura (data/reading/*.json) estén completos y bien escritos.
// uso: node scripts/revisar-textos.mjs   → "todo bien" o la lista de lo que falta, en castellano.
import { readFileSync } from 'node:fs';

const DIR = new URL('../data/reading/', import.meta.url);
const SIETE = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
const DIEZ = [...SIETE, 'uranus', 'neptune', 'pluto'];
const SIGNOS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const CASAS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const fallos = [];

function leer(nombre) {
  try { return JSON.parse(readFileSync(new URL(nombre, DIR), 'utf8')); }
  catch (e) {
    if (e.code === 'ENOENT') { fallos.push(`${nombre}: no existe en data/reading/.`); return null; }
    fallos.push(`${nombre}: no se puede leer (${e.message}). casi siempre es una coma de más o de menos, o unas comillas sin cerrar.`); return null; }
}
const hay = (v, donde) => { if (typeof v !== 'string' || !v.trim()) fallos.push(`falta el texto de ${donde}`); };

const basics = leer('basics.json');
if (basics) {
  for (const m of ['traditional', 'modern']) { hay(basics.modes?.[m]?.label, `basics.json → modes → ${m} → label`); for (const h of CASAS) hay(basics.houses?.[m]?.[h], `basics.json → houses → ${m} → ${h}`); }
  for (const p of DIEZ) for (const m of ['traditional', 'modern']) { hay(basics.planets?.[p]?.[m], `basics.json → planets → ${p} → ${m}`); hay(basics.planets?.[p]?.transit?.[m], `basics.json → planets → ${p} → transit → ${m}`); }
}
const signs = leer('signs.json');
if (signs) for (const [m, lista] of [['traditional', [...SIETE, 'asc']], ['modern', [...DIEZ, 'asc']]]) for (const p of lista) for (const s of SIGNOS) hay(signs[m]?.[p]?.[s], `signs.json → ${m} → ${p} → ${s}`);
const houses = leer('houses.json');
if (houses) for (const [m, lista] of [['traditional', SIETE], ['modern', DIEZ]]) for (const p of lista) for (const h of CASAS) hay(houses[m]?.[p]?.[h], `houses.json → ${m} → ${p} → ${h}`);
const aspects = leer('aspects.json');
if (aspects) for (const [m, lista] of [['traditional', SIETE], ['modern', DIEZ]]) for (let i = 0; i < lista.length; i++) for (let j = i + 1; j < lista.length; j++) for (const t of ['conj', 'easy', 'hard']) hay(aspects[m]?.[`${lista[i]}-${lista[j]}`]?.[t], `aspects.json → ${m} → ${lista[i]}-${lista[j]} → ${t}`);

if (fallos.length) { console.error(`hay ${fallos.length} cosa(s) que arreglar:\n- ` + fallos.slice(0, 30).join('\n- ')); process.exit(1); }
console.log('todo bien: los textos de la lectura están completos.');
