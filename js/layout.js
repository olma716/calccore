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

  // sticky: висота верхнього рядка (логотип), який при скролі їде геть — для top у CSS
  const topRow = header && header.querySelector('.header-inner');
  const measureTopRow = () => {
    if (topRow) header.style.setProperty('--hdr-top-h', topRow.offsetHeight + 'px');
  };
  measureTopRow();
  window.addEventListener('resize', measureTopRow, { passive: true });
  window.addEventListener('load', measureTopRow);

  // десктоп: якщо випадаючий список не вміщається праворуч від пункту (останній пункт меню
  // біля краю вікна), вирівнюємо його по правому краю пункту. Без цього навіть прихований
  // список розтягував сторінку вшир і давав горизонтальну прокрутку.
  const flipSubmenus = () => {
    const vw = document.documentElement.clientWidth;
    const desktop = !window.matchMedia('(max-width: 900px)').matches;
    document.querySelectorAll('.main-menu > .has-submenu').forEach(li => {
      const sub = li.querySelector('.submenu');
      if (!sub) return;
      li.classList.remove('submenu-flip');
      // широка панель (меню «Освіта»): зсуваємо так, щоб вона повністю вміщалась у вікно
      if (li.classList.contains('has-mega')) {
        sub.style.left = '';
        if (!desktop) return;
        const r = li.getBoundingClientRect();
        const w = sub.offsetWidth;
        const shift = Math.max(16 - r.left, Math.min(0, vw - 16 - (r.left + w)));
        sub.style.left = Math.round(shift) + 'px';
        return;
      }
      if (!desktop) return;
      const r = li.getBoundingClientRect();
      const w = sub.offsetWidth;
      if (r.left + w > vw && r.right - w >= 0) li.classList.add('submenu-flip');
    });
  };
  flipSubmenus();
  window.addEventListener('resize', flipSubmenus, { passive: true });
  window.addEventListener('load', flipSubmenus);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(flipSubmenus);

  // burger
  if (toggle && header) {
    toggle.addEventListener('click', () => {
      const open = header.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // мобільне меню «Освіта»: теми й підтеми — акордеон (відкрите лише одне на рівні);
  // клас mega-js вмикає згортання в CSS, без JS усе лишається розкритим
  if (header) header.classList.add('mega-js');
  const isMobile = () => window.matchMedia('(max-width: 900px)').matches;
  const megaToggle = (head) => {
    if (!isMobile()) return;
    const item = head.parentElement;
    if (!item || item.classList.contains('is-empty')) return;
    const open = !item.classList.contains('is-open');
    Array.from(item.parentElement.children).forEach((sib) => {
      if (sib !== item) {
        sib.classList.remove('is-open');
        const h = sib.querySelector(':scope > .mega-title, :scope > .mega-subtitle');
        if (h) h.setAttribute('aria-expanded', 'false');
      }
    });
    item.classList.toggle('is-open', open);
    head.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  // role/tabindex лише на телефоні: на ПК заголовки колонок це звичайний текст
  const syncMegaA11y = () => {
    document.querySelectorAll('.mega-title, .mega-subtitle').forEach((head) => {
      const empty = head.parentElement && head.parentElement.classList.contains('is-empty');
      if (empty) return;
      if (isMobile()) {
        head.setAttribute('role', 'button');
        head.setAttribute('tabindex', '0');
        if (!head.hasAttribute('aria-expanded')) head.setAttribute('aria-expanded', 'false');
      } else {
        head.removeAttribute('role');
        head.removeAttribute('tabindex');
        head.removeAttribute('aria-expanded');
      }
    });
  };
  syncMegaA11y();
  window.addEventListener('resize', syncMegaA11y, { passive: true });
  document.querySelectorAll('.mega-title, .mega-subtitle').forEach((head) => {
    head.addEventListener('click', () => megaToggle(head));
    head.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && isMobile()) {
        e.preventDefault();
        megaToggle(head);
      }
    });
  });

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

/* ================= PWA: manifest, service worker, пропозиція встановлення ================= */

(function initPwa() {
  if (!document.querySelector('link[rel="manifest"]')) {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = '/site.webmanifest';
    document.head.appendChild(link);
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }

  const script = document.createElement('script');
  script.src = '/js/install-prompt.js?v=1';
  script.async = true;
  document.head.appendChild(script);
})();

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