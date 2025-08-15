// Año dinámico
document.getElementById('anio').textContent = new Date().getFullYear();

/* Scroll reveal con IntersectionObserver */
const reveals = document.querySelectorAll('.reveal');
const obs = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('inview'); });
}, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
reveals.forEach(r => obs.observe(r));

/* Parallax MUY suave (scroll) usando data-parallax-speed */
const parallaxEls = document.querySelectorAll('[data-parallax-speed]');
let ticking = false;
function onScroll(){
  if(!ticking){
    window.requestAnimationFrame(() => {
      const y = window.scrollY || window.pageYOffset;
      parallaxEls.forEach(el => {
        const speed = parseFloat(el.dataset.parallaxSpeed || '0.15');
        el.style.transform = `translate3d(0, ${y * speed * -0.2}px, 0)`;
      });
      ticking = false;
    });
    ticking = true;
  }
}
window.addEventListener('scroll', onScroll, { passive: true });

/* Tilt sutil con el mouse (opcional) */
document.querySelectorAll('.tilt').forEach(card => {
  let rAF;
  function handleMove(e){
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    cancelAnimationFrame(rAF);
    rAF = requestAnimationFrame(() => {
      card.style.transform = `rotateX(${y * -4}deg) rotateY(${x * 6}deg) translateY(-2px)`;
    });
  }
  function reset(){ card.style.transform = ''; }
  card.addEventListener('mousemove', handleMove);
  card.addEventListener('mouseleave', reset);
});

/* ===== Tema claro/oscuro con localStorage (sin emojis, accesible) ===== */
const themeBtn = document.getElementById('themeToggle');
const THEME_KEY = 'theme';
function applyTheme(t){
  document.body.classList.toggle('light', t === 'light');
  themeBtn?.setAttribute('aria-label', t === 'light' ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro');
}
const saved = localStorage.getItem(THEME_KEY) || 'dark';
applyTheme(saved);
themeBtn?.addEventListener('click', () => {
  const next = document.body.classList.contains('light') ? 'dark' : 'light';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

/* ===== Navegación: activo robusto + F5 al top ===== */
const nav = document.querySelector('.nav');
const navH = nav ? nav.offsetHeight : 0;
const navLinks = document.querySelectorAll('.nav__links a');

function setActiveLinkById(id){
  navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${id}`));
}

// click en links: scroll compensado + activo inmediato + URL limpia
navLinks.forEach(a => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const targetId = a.getAttribute('href').slice(1);
    const el = document.getElementById(targetId);
    if(!el) return;

    const y = el.getBoundingClientRect().top + window.pageYOffset - (navH + 8);
    window.scrollTo({ top: y, behavior: 'smooth' });
    setActiveLinkById(targetId);
    history.pushState(null, '', `#${targetId}`);
  });
});

// activo por scroll usando el área visible más grande
const groups = document.querySelectorAll('section[data-section]');
const io = new IntersectionObserver((entries) => {
  let best = null;
  entries.forEach(e => { if (e.isIntersecting && (!best || e.intersectionRatio > best.intersectionRatio)) best = e; });
  if (best) setActiveLinkById(best.target.id);
}, { rootMargin: `-${navH + 20}px 0px -55% 0px`, threshold: [0.1, 0.25, 0.5, 0.75] });
groups.forEach(s => io.observe(s));

// F5 con hash → subimos al inicio y limpiamos el hash
const navType = performance.getEntriesByType?.('navigation')?.[0]?.type || '';
if (navType === 'reload' && location.hash) {
  history.replaceState(null, '', location.pathname + location.search);
  window.scrollTo({ top: 0 });
}

/* ===== Collage robusto (con fixes y accesibilidad) ===== */
const collageModal  = document.getElementById('collageModal');
const collageGrid   = document.getElementById('collageGrid');
const collageClose  = document.getElementById('collageClose');
const collageBack   = document.getElementById('collageBackdrop');

/* Placeholder por si faltan imágenes */
const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
     <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
       <stop offset="0" stop-color="#1b2030"/><stop offset="1" stop-color="#0f1115"/></linearGradient></defs>
     <rect fill="url(#g)" width="100%" height="100%"/>
     <text x="50%" y="50%" fill="#9aa1a9" font-family="Inter, Arial" font-size="42"
           text-anchor="middle" dominant-baseline="middle">Sin foto</text>
   </svg>`
);

let lastFocus = null;
function openModal(){
  lastFocus = document.activeElement;
  collageModal.classList.add('show');
  collageModal.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
  collageClose?.focus();
}
function closeModal(){
  collageModal.classList.remove('show');
  collageModal.setAttribute('aria-hidden','true');
  document.body.style.overflow='';
  collageGrid.innerHTML='';
  lastFocus?.focus();
}

collageClose?.addEventListener('click', closeModal);
collageBack?.addEventListener('click', closeModal);
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeModal(); });

/* Construye lista principal + sufijos -2..-5 */
function buildSources(mainSrc){
  const q = mainSrc.split('?')[0];
  const ext = q.split('.').pop();
  const base = q.replace(/\.[^/.]+$/, '');
  const extras = [2,3,4,5].map(n => `${base}-${n}.${ext}`);
  return [q, ...extras];
}

function addTile(kind, src, idx){
  const d = document.createElement('div');
  d.className = `tile ${kind}`;
  d.style.setProperty('--d', `${0.06 * idx + 0.08}s`);

  const img = document.createElement('img');
  img.src = src;
  img.alt = '';
  img.onerror = () => { img.onerror = null; img.src = PLACEHOLDER; };

  d.appendChild(img);
  collageGrid.appendChild(d);

  // Failsafe: si la animación no corre (reduced motion), se ve igual
  requestAnimationFrame(() => { d.style.opacity = '1'; });
}

/* Render del collage */
function renderCollage(srcMain){
  collageGrid.innerHTML = '';
  const srcs = buildSources(srcMain);

  addTile('hero', srcs[0], 0);
  srcs.slice(1).forEach((s, i) => addTile(`t${i+1}`, s, i+1));

  if (!collageGrid.children.length) addTile('hero', PLACEHOLDER, 0);
  openModal();
}

/* Click en cualquier imagen dentro de .card -> abre collage */
document.addEventListener('click', (e) => {
  const img = e.target.closest('.card img');
  if(!img) return;
  renderCollage(img.getAttribute('src'));
});
