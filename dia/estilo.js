// en el móvil el menú está arriba y lo que abre queda debajo de la rueda: lo acercamos a la vista
const verLo = (id) => { const el = document.getElementById(id); if (el && el.offsetParent) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); };
document.getElementById('btnAdv').addEventListener('click', () => verLo('advPanel'));
document.getElementById('verCartas').addEventListener('change', e => { if (e.target.checked) verLo('libraryBox'); });
document.getElementById('chkTr').addEventListener('change', e => { if (e.target.checked) verLo('transitBox'); });
