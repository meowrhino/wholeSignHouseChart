// el enlace día/noche: se lleva la carta dibujada (va en la url) y recuerda la elección para la próxima vez
document.querySelectorAll('[data-cara]').forEach(a => a.addEventListener('click', () => {
  a.href = a.getAttribute('href').split('?')[0] + location.search;
  try { localStorage.setItem('astro-cara', a.dataset.cara); } catch (_) { }
}));
