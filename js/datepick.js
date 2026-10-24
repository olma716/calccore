/* datepick.js — власний календар замість системного вікна вибору дати (UK/EN).
   Перетворює кожен input[type=date] на кнопку з випадним календарем; сам input лишається джерелом значення
   (YYYY-MM-DD, події input/change), тому код сторінки працює без змін. Обмеження беремо з атрибутів min/max. */
(() => {
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const MONTHS = IS_EN
    ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    : ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"];
  const MONTHS_GEN = IS_EN ? MONTHS : ["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"];
  const WD = IS_EN ? ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] : ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
  const T = IS_EN
    ? { today: "Today", clear: "Clear", prev: "Previous month", next: "Next month", ph: "mm/dd/yyyy", dialog: "Choose a date" }
    : { today: "Сьогодні", clear: "Очистити", prev: "Попередній місяць", next: "Наступний місяць", ph: "дд.мм.рррр", dialog: "Оберіть дату" };

  const DAY = 86400000;
  const dnOf = (y, m, d) => Math.round(Date.UTC(y, m - 1, d) / DAY);
  const parts = (n) => {
    const d = new Date(n * DAY);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), wd: d.getUTCDay() };
  };
  function parseISO(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || "").trim());
    if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3];
    const n = dnOf(y, mo, d), p = parts(n);
    return p.y === y && p.m === mo - 1 && p.d === d ? n : null;
  }
  const iso = (n) => new Date(n * DAY).toISOString().slice(0, 10);
  const todayDn = () => {
    const t = new Date();
    return dnOf(t.getFullYear(), t.getMonth() + 1, t.getDate());
  };
  const pad = (x) => String(x).padStart(2, "0");
  const fmt = (n) => {
    const p = parts(n);
    return IS_EN ? pad(p.m + 1) + "/" + pad(p.d) + "/" + p.y : pad(p.d) + "." + pad(p.m + 1) + "." + p.y;
  };
  const fmtLong = (n) => {
    const p = parts(n);
    return p.d + " " + MONTHS_GEN[p.m] + " " + p.y;
  };
  const ICON = '<svg class="dp__ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/></svg>';

  const valueDesc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  let openPicker = null;
  function closePicker() {
    if (!openPicker) return;
    openPicker.pop.hidden = true;
    openPicker.btn.setAttribute("aria-expanded", "false");
    openPicker = null;
  }

  function build(input) {
    const id = input.id;
    const wrap = document.createElement("div");
    wrap.className = "dp";
    wrap.innerHTML =
      '<button type="button" class="dp__btn" id="' + id + '_btn" aria-haspopup="dialog" aria-expanded="false"><span class="dp__val"></span>' + ICON + "</button>" +
      '<div class="dp__pop" role="dialog" aria-label="' + T.dialog + '" hidden>' +
      '<div class="dp__hd"><button type="button" class="dp__nav" data-nav="-1" aria-label="' + T.prev + '">‹</button><div class="dp__ttl" aria-live="polite"></div><button type="button" class="dp__nav" data-nav="1" aria-label="' + T.next + '">›</button></div>' +
      '<div class="dp__wd">' + WD.map((w) => "<span>" + w + "</span>").join("") + "</div>" +
      '<div class="dp__days" role="grid"></div>' +
      '<div class="dp__ft"><button type="button" data-act="today">' + T.today + '</button><button type="button" data-act="clear">' + T.clear + "</button></div></div>";
    input.classList.add("dp-native");
    input.setAttribute("tabindex", "-1");
    input.setAttribute("aria-hidden", "true");
    input.after(wrap);
    const lab = document.querySelector('label[for="' + id + '"]');
    if (lab) lab.setAttribute("for", id + "_btn");

    const btn = wrap.querySelector(".dp__btn"), val = wrap.querySelector(".dp__val"), pop = wrap.querySelector(".dp__pop");
    const ttl = wrap.querySelector(".dp__ttl"), days = wrap.querySelector(".dp__days");
    let view = null, focusDn = null;

    const limits = () => {
      const mx = parseISO(input.getAttribute("max")), mn = parseISO(input.getAttribute("min"));
      return { max: mx == null ? dnOf(2100, 12, 31) : mx, min: mn == null ? dnOf(1990, 1, 1) : mn };
    };
    const current = () => parseISO(valueDesc.get.call(input));
    function syncLabel() {
      const n = current();
      val.textContent = n == null ? T.ph : fmt(n);
      val.classList.toggle("is-empty", n == null);
    }
    Object.defineProperty(input, "value", {
      configurable: true,
      get() {
        return valueDesc.get.call(input);
      },
      set(v) {
        valueDesc.set.call(input, v);
        syncLabel();
      }
    });

    function render() {
      const { max, min } = limits();
      const sel = current(), today = todayDn();
      ttl.textContent = MONTHS[view.m] + " " + view.y;
      const first = dnOf(view.y, view.m + 1, 1);
      let off = parts(first).wd - 1;
      if (off < 0) off = 6;
      const dim = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
      const rows = Math.ceil((off + dim) / 7);
      let html = "";
      for (let i = 0; i < rows * 7; i++) {
        const dn = first - off + i, p = parts(dn);
        const out = p.m !== view.m, dis = dn > max || dn < min;
        const cls = "dp__d" + (out ? " is-out" : "") + (dn === sel ? " is-sel" : "") + (dn === today ? " is-today" : "") + (dis ? " is-dis" : "");
        html += '<button type="button" class="' + cls + '" data-dn="' + dn + '" tabindex="' + (dn === focusDn ? 0 : -1) + '" aria-label="' + fmtLong(dn) + '"' + (dis ? ' disabled aria-disabled="true"' : "") + (dn === sel ? ' aria-selected="true"' : "") + ">" + p.d + "</button>";
      }
      days.innerHTML = html;
      const tb = wrap.querySelector('[data-act="today"]');
      tb.disabled = today > max || today < min;
    }
    function setView(dn) {
      const p = parts(dn);
      view = { y: p.y, m: p.m };
    }
    function focusCell() {
      const c = days.querySelector('[data-dn="' + focusDn + '"]');
      if (c && !c.disabled) c.focus();
    }
    function choose(dn) {
      valueDesc.set.call(input, iso(dn));
      syncLabel();
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      closePicker();
      btn.focus();
    }
    function open() {
      closePicker();
      const { max, min } = limits();
      const sel = current();
      let start = sel != null ? sel : todayDn();
      start = Math.min(max, Math.max(min, start));
      focusDn = start;
      setView(start);
      render();
      pop.hidden = false;
      // тримаємо календар у межах екрана (на вузьких екранах поле вужче за календар)
      pop.style.left = "0px";
      pop.style.right = "auto";
      const wr = wrap.getBoundingClientRect(), pw = pop.offsetWidth, vw = document.documentElement.clientWidth;
      let L = wr.left;
      if (L + pw > vw - 8) L = vw - 8 - pw;
      if (L < 8) L = 8;
      pop.style.left = L - wr.left + "px";
      btn.setAttribute("aria-expanded", "true");
      openPicker = { btn, pop };
      focusCell();
    }
    function moveFocus(dn) {
      const { max, min } = limits();
      dn = Math.min(max, Math.max(min, dn));
      focusDn = dn;
      const p = parts(dn);
      if (p.m !== view.m || p.y !== view.y) setView(dn);
      render();
      focusCell();
    }

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (pop.hidden) open();
      else closePicker();
    });
    btn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" && pop.hidden) {
        e.preventDefault();
        open();
      }
    });
    pop.addEventListener("click", (e) => {
      e.stopPropagation();
      const nav = e.target.closest("[data-nav]");
      if (nav) {
        if (!view) return;
        const step = Number(nav.dataset.nav);
        const m = view.m + step;
        view = { y: view.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 };
        focusDn = null;
        render();
        return;
      }
      const d = e.target.closest(".dp__d");
      if (d && !d.disabled) {
        choose(Number(d.dataset.dn));
        return;
      }
      const act = e.target.closest("[data-act]");
      if (!act || act.disabled) return;
      if (act.dataset.act === "today") choose(todayDn());
      else {
        valueDesc.set.call(input, "");
        syncLabel();
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        closePicker();
        btn.focus();
      }
    });
    pop.addEventListener("keydown", (e) => {
      const cell = e.target.closest(".dp__d");
      if (e.key === "Escape") {
        e.preventDefault();
        closePicker();
        btn.focus();
        return;
      }
      if (!cell) return;
      const dn = Number(cell.dataset.dn);
      const addMonths = (n, k) => {
        const p = parts(n), tm = p.m + k;
        const y = p.y + Math.floor(tm / 12), m = ((tm % 12) + 12) % 12;
        const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
        return dnOf(y, m + 1, Math.min(p.d, dim));
      };
      let t = null;
      if (e.key === "ArrowLeft") t = dn - 1;
      else if (e.key === "ArrowRight") t = dn + 1;
      else if (e.key === "ArrowUp") t = dn - 7;
      else if (e.key === "ArrowDown") t = dn + 7;
      else if (e.key === "Home") t = dn - ((parts(dn).wd + 6) % 7);
      else if (e.key === "End") t = dn + (6 - ((parts(dn).wd + 6) % 7));
      else if (e.key === "PageUp") t = addMonths(dn, e.shiftKey ? -12 : -1);
      else if (e.key === "PageDown") t = addMonths(dn, e.shiftKey ? 12 : 1);
      if (t != null) {
        e.preventDefault();
        moveFocus(t);
      }
    });
    pop.addEventListener("focusout", (e) => {
      if (e.relatedTarget && !wrap.contains(e.relatedTarget)) closePicker();
    });
    syncLabel();
  }

  window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('main input[type="date"]').forEach(build);
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".dp")) closePicker();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && openPicker) {
        const b = openPicker.btn;
        closePicker();
        b.focus();
      }
    });
  });
})();
