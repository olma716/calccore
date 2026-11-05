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
    ? { today: "Today", clear: "Clear", prev: "Previous month", next: "Next month", ph: "mm/dd/yyyy", dialog: "Choose a date", month: "Month", year: "Year", yearList: "Choose a year from the list" }
    : { today: "Сьогодні", clear: "Очистити", prev: "Попередній місяць", next: "Наступний місяць", ph: "дд.мм.рррр", dialog: "Оберіть дату", month: "Місяць", year: "Рік", yearList: "Обрати рік зі списку" };

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
    if (openPicker.closeList) openPicker.closeList();
    openPicker.btn.setAttribute("aria-expanded", "false");
    openPicker = null;
  }

  function build(input) {
    const id = input.id;
    // data-default-label: пусте значення означає «сьогодні» і показується цим словом (наприклад, «Розрахувати на дату»)
    const defLabel = input.dataset.defaultLabel || "";
    const wrap = document.createElement("div");
    wrap.className = "dp";
    wrap.innerHTML =
      '<div class="dp__field"><input class="dp__text" id="' + id + '_txt" type="text" inputmode="numeric" autocomplete="off" maxlength="10" placeholder="' + T.ph + '"><button type="button" class="dp__btn" id="' + id + '_btn" aria-haspopup="dialog" aria-expanded="false" aria-label="' + T.dialog + '">' + ICON + "</button></div>" +
      '<div class="dp__pop" role="dialog" aria-label="' + T.dialog + '" hidden>' +
      '<div class="dp__hd"><button type="button" class="dp__nav" data-nav="-1" aria-label="' + T.prev + '">‹</button><div class="dp__ttl"><button type="button" class="dp__ms" aria-haspopup="true" aria-expanded="false" aria-label="' + T.month + '"><span class="dp__msv"></span><svg class="dp__chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button><span class="dp__yw"><input class="dp__ys" type="text" inputmode="numeric" maxlength="4" autocomplete="off" aria-label="' + T.year + '"><button type="button" class="dp__yb" aria-haspopup="listbox" aria-expanded="false" aria-label="' + T.yearList + '"><svg class="dp__chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button></span></div><button type="button" class="dp__nav" data-nav="1" aria-label="' + T.next + '">›</button></div>' +
      '<div class="dp__list" role="listbox" hidden></div>' +
      '<div class="dp__wd">' + WD.map((w) => "<span>" + w + "</span>").join("") + "</div>" +
      '<div class="dp__days" role="grid"></div>' +
      '<div class="dp__ft"><button type="button" data-act="today">' + T.today + '</button>' + (defLabel ? "" : '<button type="button" data-act="clear">' + T.clear + "</button>") + "</div></div>";
    input.classList.add("dp-native");
    input.setAttribute("tabindex", "-1");
    input.setAttribute("aria-hidden", "true");
    input.after(wrap);
    const lab = document.querySelector('label[for="' + id + '"]');
    if (lab) lab.setAttribute("for", id + "_txt");

    const btn = wrap.querySelector(".dp__btn"), txt = wrap.querySelector(".dp__text"), field = wrap.querySelector(".dp__field"), pop = wrap.querySelector(".dp__pop");
    const ms = wrap.querySelector(".dp__ms"), msv = wrap.querySelector(".dp__msv"), yw = wrap.querySelector(".dp__yw"), yb = wrap.querySelector(".dp__yb"), list = wrap.querySelector(".dp__list"), ys = wrap.querySelector(".dp__ys"), days = wrap.querySelector(".dp__days");
    let view = null, focusDn = null;

    const limits = () => {
      const mx = parseISO(input.getAttribute("max")), mn = parseISO(input.getAttribute("min"));
      return { max: mx == null ? dnOf(2100, 12, 31) : mx, min: mn == null ? dnOf(1990, 1, 1) : mn };
    };
    const current = () => parseISO(valueDesc.get.call(input));
    function syncLabel() {
      const n = current();
      txt.value = n == null ? defLabel : fmt(n);
      field.classList.remove("is-bad");
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
      msv.textContent = MONTHS[view.m];
      ys.value = String(view.y);
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
      tb.disabled = defLabel ? false : today > max || today < min;
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
      closeList();
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
      openPicker = { btn, pop, closeList };
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

    // ручне введення дати з клавіатури: маска дд.мм.рррр (EN: мм/дд/рррр), значення застосовується, коли дата повна й коректна
    const SEP = IS_EN ? "/" : ".";
    const maskText = (d) => d.slice(0, 2) + (d.length > 2 ? SEP + d.slice(2, 4) : "") + (d.length > 4 ? SEP + d.slice(4, 8) : "");
    const parseText = (d) => {
      if (d.length !== 8) return null;
      const a = +d.slice(0, 2), b = +d.slice(2, 4), y = +d.slice(4), dd = IS_EN ? b : a, mm = IS_EN ? a : b;
      const n = dnOf(y, mm, dd), p = parts(n);
      return p.y === y && p.m === mm - 1 && p.d === dd ? n : null;
    };
    function commit(n) {
      valueDesc.set.call(input, n == null ? "" : iso(n));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      if (n != null && view && !pop.hidden) {
        focusDn = n;
        setView(n);
        render();
      }
    }
    txt.addEventListener("input", () => {
      const digits = txt.value.replace(/\D/g, "").slice(0, 8), masked = maskText(digits);
      if (txt.value !== masked) txt.value = masked;
      field.classList.remove("is-bad");
      if (!digits.length) {
        if (current() != null) commit(null);
        return;
      }
      if (digits.length === 8) {
        const n = parseText(digits), lim = limits();
        if (n != null && n <= lim.max && n >= lim.min) {
          if (n !== current()) commit(n);
        } else field.classList.add("is-bad");
      }
    });
    if (defLabel) txt.addEventListener("focus", () => { if (current() == null) txt.select(); });
    txt.addEventListener("blur", () => {
      if (field.classList.contains("is-bad") || (txt.value && txt.value.replace(/\D/g, "").length < 8)) syncLabel();
    });
    txt.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" && pop.hidden) {
        e.preventDefault();
        open();
      } else if (e.key === "Enter") {
        e.preventDefault();
        txt.blur();
      }
    });
    // швидкий перехід: місяць зі списку, рік вводиться цифрами (4 цифри застосовуються одразу), стрілки змінюють рік
    const yearBounds = () => { const lim = limits(); return [parts(lim.min).y, parts(lim.max).y]; };
    const gotoYear = (y) => {
      const [lo, hi] = yearBounds();
      view = { y: Math.min(hi, Math.max(lo, y)), m: view.m };
      focusDn = null;
      render();
    };
    // списки місяця й року: один шар зі списком під кнопкою, вибраний пункт прокручується в центр
    let listFor = null;
    function closeList() {
      list.hidden = true;
      list.innerHTML = "";
      ms.setAttribute("aria-expanded", "false");
      yb.setAttribute("aria-expanded", "false");
      listFor = null;
    }
    function openList(kind) {
      if (!view) return;
      if (listFor === kind) {
        closeList();
        return;
      }
      closeList();
      const items = [];
      let cur;
      if (kind === "m") {
        MONTHS.forEach((n, i) => items.push([i, n]));
        cur = view.m;
      } else {
        const bounds = yearBounds();
        for (let y = bounds[0]; y <= bounds[1]; y++) items.push([y, String(y)]);
        cur = view.y;
      }
      list.className = "dp__list dp__list--" + kind;
      list.innerHTML = items.map((it) => '<button type="button" role="option" class="dp__li' + (it[0] === cur ? " is-sel" : "") + '" data-v="' + it[0] + '" aria-selected="' + (it[0] === cur) + '">' + it[1] + "</button>").join("");
      list.hidden = false;
      listFor = kind;
      (kind === "m" ? ms : yb).setAttribute("aria-expanded", "true");
      const anchor = kind === "m" ? ms : yw, pr = pop.getBoundingClientRect(), ar = anchor.getBoundingClientRect();
      list.style.minWidth = ar.width + "px";
      list.style.left = Math.max(6, Math.min(ar.left - pr.left, pr.width - list.offsetWidth - 6)) + "px";
      list.style.top = ar.bottom - pr.top + 4 + "px";
      const sel = list.querySelector(".is-sel");
      if (sel) {
        list.scrollTop = sel.offsetTop - list.clientHeight / 2 + sel.offsetHeight / 2;
        sel.focus({ preventScroll: true });
      }
    }
    ms.addEventListener("click", () => openList("m"));
    yb.addEventListener("click", () => openList("y"));
    list.addEventListener("click", (e) => {
      const li = e.target.closest(".dp__li");
      if (!li) return;
      const v = Number(li.dataset.v), kind = listFor;
      view = kind === "m" ? { y: view.y, m: v } : { y: v, m: view.m };
      focusDn = null;
      closeList();
      render();
      (kind === "m" ? ms : yb).focus();
    });
    list.addEventListener("keydown", (e) => {
      const li = e.target.closest(".dp__li");
      if (!li) return;
      const all = [...list.querySelectorAll(".dp__li")], i = all.indexOf(li);
      const t = { ArrowDown: i + 1, ArrowUp: i - 1, PageDown: i + 8, PageUp: i - 8, Home: 0, End: all.length - 1 }[e.key];
      if (t === undefined) return;
      e.preventDefault();
      all[Math.max(0, Math.min(all.length - 1, t))].focus();
    });
    ys.addEventListener("input", () => {
      closeList();
      ys.value = ys.value.replace(/\D/g, "").slice(0, 4);
      if (ys.value.length === 4) gotoYear(Number(ys.value));
    });
    ys.addEventListener("blur", () => {
      if (!view) return;
      if (ys.value.length === 4) gotoYear(Number(ys.value));
      else ys.value = String(view.y);
    });
    ys.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (ys.value.length === 4) gotoYear(Number(ys.value));
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        gotoYear(view.y + (e.key === "ArrowUp" ? 1 : -1));
      }
    });

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
      if (!list.hidden && !e.target.closest(".dp__list, .dp__ms, .dp__yb")) closeList();
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
      if (act.dataset.act === "today" && defLabel) {
        commit(null);
        closePicker();
        btn.focus();
      } else if (act.dataset.act === "today") choose(todayDn());
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
      if (e.key === "Escape" && !list.hidden) {
        e.preventDefault();
        e.stopPropagation();
        const kind = listFor;
        closeList();
        (kind === "m" ? ms : yb).focus();
        return;
      }
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
    // значення, змінене кодом сторінки (скидання, приклад, посилання), теж оновлює підпис кнопки
    input.addEventListener("change", syncLabel);
    input.addEventListener("input", syncLabel);
  }

  window.addEventListener("DOMContentLoaded", () => {
    const wrapAll = (root) => root.querySelectorAll('input[type="date"]:not(.dp-native)').forEach(build);
    wrapAll(document.querySelector("main") || document);
    // поля, які калькулятор створює пізніше (режими спільного рушія), теж отримують календар
    const mainEl = document.querySelector("main");
    if (mainEl && window.MutationObserver) new MutationObserver((list) => list.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) { if (n.matches && n.matches('input[type="date"]:not(.dp-native)')) build(n); wrapAll(n); } }))).observe(mainEl, { childList: true, subtree: true });
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
