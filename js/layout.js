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

// плавне розкриття / згортання списків у мобільному меню (висота, відступи, прозорість).
// Викликається ПІСЛЯ зміни класу-стану: при відкритті клас уже додано, при закритті вже знято
// (тимчасовий slide-closing тримає список видимим, поки грає анімація).
const SLIDE_PROPS = ['height', 'paddingTop', 'paddingBottom', 'marginTop', 'marginBottom', 'borderTopWidth', 'borderBottomWidth'];
function slideList(el, open) {
  if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  clearTimeout(el._slideTimer);
  const clear = () => {
    SLIDE_PROPS.concat(['overflow', 'opacity', 'transition']).forEach((p) => { el.style[p] = ''; });
    el.classList.remove('slide-closing');
  };
  clear();
  if (!open) el.classList.add('slide-closing');
  const cs = getComputedStyle(el), natural = {};
  SLIDE_PROPS.forEach((p) => { natural[p] = cs[p]; });
  const apply = (v) => SLIDE_PROPS.forEach((p) => { el.style[p] = v ? v[p] : '0px'; });
  el.style.overflow = 'hidden';
  apply(open ? null : natural);
  el.style.opacity = open ? '0' : '1';
  void el.offsetHeight;
  el.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
  apply(open ? natural : null);
  el.style.opacity = open ? '1' : '0';
  el._slideTimer = setTimeout(clear, 460);
}

// шапка випадного списку на ПК: назва розділу й кількість калькуляторів
function addSubmenuCaps() {
  const isEn = location.pathname.startsWith('/en/');
  const plural = (n) => {
    if (isEn) return n + (n === 1 ? ' calculator' : ' calculators');
    const m10 = n % 10, m100 = n % 100;
    const w = m10 === 1 && m100 !== 11 ? 'калькулятор' : (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'калькулятори' : 'калькуляторів');
    return n + ' ' + w;
  };
  document.querySelectorAll('.main-menu > .has-submenu > .submenu:not(.submenu--mega)').forEach((ul) => {
    if (ul.querySelector(':scope > .submenu-cap')) return;
    const toggle = ul.parentElement.querySelector(':scope > .submenu-toggle');
    const count = ul.querySelectorAll(':scope > li > a').length;
    if (!toggle || !count) return;
    const cap = document.createElement('li');
    cap.className = 'submenu-cap';
    cap.setAttribute('aria-hidden', 'true');
    const name = document.createElement('b');
    name.textContent = toggle.textContent.replace('▾', '').trim();
    const num = document.createElement('span');
    num.textContent = plural(count);
    cap.append(name, num);
    ul.insertBefore(cap, ul.firstChild);
  });
}

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
    const panel = header.querySelector('.nav-panel');
    let closeTimer = 0;
    const finishClose = () => {
      clearTimeout(closeTimer);
      header.classList.remove('nav-open', 'nav-closing');
    };
    toggle.addEventListener('click', () => {
      // повторний клик під час закриття — відкриваємо знову
      if (header.classList.contains('nav-closing')) {
        clearTimeout(closeTimer);
        header.classList.remove('nav-closing');
        toggle.setAttribute('aria-expanded', 'true');
        return;
      }
      if (!header.classList.contains('nav-open')) {
        header.classList.add('nav-open');
        toggle.setAttribute('aria-expanded', 'true');
        return;
      }
      toggle.setAttribute('aria-expanded', 'false');
      // закриття так само плавно, як відкриття: панель виїжджає назад ліворуч, потім ховається
      const animated = panel && getComputedStyle(panel).animationName !== 'none';
      if (!animated) { finishClose(); return; }
      header.classList.add('nav-closing');
      closeTimer = setTimeout(finishClose, 950);
    });
    if (panel) panel.addEventListener('animationend', (e) => {
      if (e.target === panel && header.classList.contains('nav-closing')) finishClose();
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
        if (sib.classList.contains('is-open')) slideList(sib.querySelector(':scope > .mega-sub, :scope > .mega-links'), false);
        sib.classList.remove('is-open');
        const h = sib.querySelector(':scope > .mega-title, :scope > .mega-subtitle');
        if (h) h.setAttribute('aria-expanded', 'false');
      }
    });
    item.classList.toggle('is-open', open);
    head.setAttribute('aria-expanded', open ? 'true' : 'false');
    slideList(item.querySelector(':scope > .mega-sub, :scope > .mega-links'), open);
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
      const sub = li.querySelector(':scope > .submenu');
      const willOpen = !li.classList.contains('submenu-open');
      // плитки: відкритий лише один розділ, решта згортаються
      if (willOpen) {
        document.querySelectorAll('.main-menu > .has-submenu.submenu-open').forEach((o) => {
          if (o === li) return;
          o.classList.remove('submenu-open');
          slideList(o.querySelector(':scope > .submenu'), false);
        });
      }
      slideList(sub, li.classList.toggle('submenu-open'));
      if (willOpen && sub) {
        // якщо список виходить за видиму частину панелі — трохи прокручуємо її
        setTimeout(() => {
          const panel = document.getElementById('navPanel');
          if (!panel) return;
          const r = sub.getBoundingClientRect(), pr = panel.getBoundingClientRect();
          if (r.bottom > pr.bottom) panel.scrollBy({ top: Math.min(r.bottom - pr.bottom + 8, r.top - pr.top - 8), behavior: 'smooth' });
        }, 450);
      }
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

  addSubmenuCaps();
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