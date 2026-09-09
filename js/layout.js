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

/* ================= SEARCH ICON TOGGLE + REDIRECT ================= */

function initHeaderSearch() {
  const btn = document.getElementById('searchToggleBtn');
  const box = document.getElementById('headerSearchBox');
  const input = document.getElementById('hubSearch');

  if (!btn || !box) return;

  btn.addEventListener('click', () => {
    const isOpen = box.classList.toggle('is-open');
    if (isOpen && input) {
      setTimeout(() => input.focus(), 150);
    }
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!box.contains(e.target) && !btn.contains(e.target)) {
      box.classList.remove('is-open');
    }
  });

  // On non-home pages (no .hub-card present), redirect search to homepage
  if (input && !document.querySelector('.hub-card')) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        const isEn = location.pathname.startsWith('/en/');
        const target = isEn ? '/en/index' : '/index';
        window.location.href = `${target}?q=${encodeURIComponent(input.value.trim())}`;
      }
    });
  }
}

/* ================= LOAD PARTIALS ================= */

document.addEventListener("DOMContentLoaded", async () => {
  const isEn = location.pathname.startsWith("/en/");

  // підвантажуємо правильні partials
  await loadPartial("#header", isEn ? "/partials/en/header.html" : "/partials/header.html");
  await loadPartial("#footer", isEn ? "/partials/en/footer.html" : "/partials/footer.html");

  initHeaderUI();
  initHeaderSearch();
  // Notify other scripts that header is now loaded and ready
document.dispatchEvent(new CustomEvent('headerReady'));

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