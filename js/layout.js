async function loadPartial(selector, url) {
  const el = document.querySelector(selector);
  if (!el) return;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to load " + url);
    el.innerHTML = await res.text();
  } catch (err) {
    console.error(err);
  }
}

/* ================= INIT FUNCTIONS (те, що раніше було в <script> хедера) ================= */

function initHeaderUI() {
  const header = document.getElementById('siteHeader');
  const toggle = document.getElementById('navToggle');
  const submenuToggles = document.querySelectorAll('.submenu-toggle');

  // sticky shadow
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 6);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // burger
  if (toggle && header) {
    toggle.addEventListener('click', () => {
      const open = header.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // mobile submenu
  submenuToggles.forEach(a => {
    a.addEventListener('click', (e) => {
      if (!window.matchMedia('(max-width: 900px)').matches) return;
      e.preventDefault();
      const li = a.closest('.has-submenu');
      if (!li) return;
      li.classList.toggle('submenu-open');
    });
  });
}

/* ================= LOAD PARTIALS ================= */

document.addEventListener("DOMContentLoaded", async () => {
  const isEn = location.pathname.startsWith("/en/");

  // підвантажуємо правильні partials
  await loadPartial("#header", isEn ? "/partials/en/header.html" : "/partials/header.html");
  await loadPartial("#footer", isEn ? "/partials/en/footer.html" : "/partials/footer.html");

  initHeaderUI();

  // 🔁 правильні лінки перемикача мов
  const ukLink = document.querySelector('.lang-switch a[data-lang="uk"]');
  const enLink = document.querySelector('.lang-switch a[data-lang="en"]');

  const path = location.pathname; // /auto/x.html або /en/auto/x.html

  const ukPath = isEn ? path.replace(/^\/en\//, "/") : path;
  const enPath = isEn ? path : (path === "/" ? "/en/" : ("/en" + path));

  if (ukLink) ukLink.href = ukPath;
  if (enLink) enLink.href = enPath;

  if (ukLink) ukLink.classList.toggle("is-active", !isEn);
  if (enLink) enLink.classList.toggle("is-active", isEn);
});