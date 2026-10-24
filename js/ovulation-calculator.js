/* ovulation-calculator.js — калькулятор овуляції: фертильне вікно, прогноз на кілька циклів, календар (UK/EN)
   Дати — цілі числа днів (UTC), тому перехід на літній/зимовий час не зсуває результат.
   Для циклу, що починається в день s: наступна менструація n = s + цикл; овуляція o = n − лютеїнова фаза (14 за замовчуванням);
   фертильне вікно = 6 днів, що закінчуються в день овуляції (o−5 … o); пік = o−2 … o.
   Нерегулярний цикл: діапазон овуляції = s + мін.цикл − лютеїнова … s + макс.цикл − лютеїнова (для найближчого циклу). */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");

  const MONTHS = IS_EN
    ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    : ["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"];
  const MONTHS_NOM = IS_EN ? MONTHS : ["січень", "лютий", "березень", "квітень", "травень", "червень", "липень", "серпень", "вересень", "жовтень", "листопад", "грудень"];
  const WEEKDAYS = IS_EN
    ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    : ["неділя", "понеділок", "вівторок", "середа", "четвер", "пʼятниця", "субота"];
  const WD_SHORT = IS_EN ? ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] : ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

  const T = IS_EN
    ? {
        enter: "Enter a date — the result will appear here.",
        missing: "To calculate, fill in: {list}.",
        lblLmp: "the first day of the last period",
        errDate: "Enter a valid date.",
        errFuture: "This date is in the future — check it.",
        errOld: "This date is more than 2 years ago — enter the first day of a more recent period.",
        errCycle: "Cycle length must be a whole number from 21 to 45 days.",
        errLuteal: "Luteal phase must be a whole number from 10 to 16 days.",
        errPeriod: "Period length must be a whole number from 2 to 10 days.",
        errEarly: "With this cycle and luteal phase ovulation would be too early (before cycle day 8) — check the numbers.",
        errRange: "Fill in both the shortest and the longest cycle (21–45 days, the shortest not above the longest).",
        errRangeCycle: "The typical cycle length must be between the shortest and the longest cycle.",
        ovTitle: "Next ovulation", ovMini: "cycle day {d} · accuracy ±1–2 days",
        winTitle: "Fertile window", winMini: "6 days ending on the ovulation day", winRangeMini: "covers every cycle in your range",
        peakTitle: "Highest chance", peakMini: "2 days before ovulation and the day itself",
        nextTitle: "Next period", nextMini: "in {n} d", nextToday: "today", nextPast: "{n} d ago",
        testOvTitle: "Ovulation tests from", testOvMini: "start 5 days before the expected ovulation",
        testPregTitle: "Pregnancy test from", testPregMini: "the day of the expected period",
        rangeTitle: "Ovulation range", rangeMini: "for cycles of {a}–{b} days",
        nowTitle: "Today", nowDay: "cycle day {d}",
        phPeriod: "period", phFollicular: "before the fertile window ({n} d)", phFertile: "fertile window (ovulation in {n} d)", phPeak: "highest chance (ovulation in {n} d)", phOv: "ovulation day", phLuteal: "after ovulation",
        calTitle: "Calendar", calPrev: "Previous month", calNext: "Next month", calAria: "Calendar by months, scroll sideways", legPeriod: "Period", legFertile: "Fertile window", legPeak: "Highest chance", legOv: "Ovulation", legToday: "Today",
        thNo: "Cycle", thPeriod: "Period", thWindow: "Fertile window", thOv: "Ovulation", thNext: "Next period",
        roll: "The entered date is older than the current cycle — the forecast starts from the current cycle.",
        far: "The further the forecast from the entered date, the less accurate it is.",
        irregular: "Only the nearest cycle uses the shortest–longest range; the later cycles are shown for a typical cycle.",
        note: "An estimate only: the calculator cannot be used as contraception. The real ovulation day varies with stress, illness and other factors; for exact timing use ovulation tests or temperature charting and ask your doctor.",
        linkCopied: "Link copied ✅", copyFailed: "Could not copy 😕", reset: "Reset ✅", example: "Example filled in ✅", tableCopied: "Table copied ✅", csvDone: "CSV downloaded ✅", resultCopied: "Result copied ✅"
      }
    : {
        enter: "Вкажіть дату — результат зʼявиться тут.",
        missing: "Щоб розрахувати, заповніть: {list}.",
        lblLmp: "перший день останньої менструації",
        errDate: "Вкажіть коректну дату.",
        errFuture: "Ця дата в майбутньому — перевірте її.",
        errOld: "Ця дата була понад 2 роки тому — вкажіть перший день більш свіжої менструації.",
        errCycle: "Довжина циклу — ціле число від 21 до 45 днів.",
        errLuteal: "Лютеїнова фаза — ціле число від 10 до 16 днів.",
        errPeriod: "Тривалість менструації — ціле число від 2 до 10 днів.",
        errEarly: "З таким циклом і лютеїновою фазою овуляція припала б надто рано (до 8-го дня циклу) — перевірте числа.",
        errRange: "Заповніть і найкоротший, і найдовший цикл (21–45 днів, найкоротший не більший за найдовший).",
        errRangeCycle: "Звичайна довжина циклу має бути між найкоротшим і найдовшим циклом.",
        ovTitle: "Найближча овуляція", ovMini: "{d}-й день циклу · точність ±1–2 дні",
        winTitle: "Фертильне вікно", winMini: "6 днів, що закінчуються в день овуляції", winRangeMini: "охоплює всі цикли у вашому діапазоні",
        peakTitle: "Найвищий шанс", peakMini: "2 дні до овуляції та день овуляції",
        nextTitle: "Наступна менструація", nextMini: "через {n} дн", nextToday: "сьогодні", nextPast: "{n} дн тому",
        testOvTitle: "Тести на овуляцію з", testOvMini: "починайте за 5 днів до очікуваної овуляції",
        testPregTitle: "Тест на вагітність з", testPregMini: "з дня очікуваної менструації",
        rangeTitle: "Діапазон овуляції", rangeMini: "для циклів {a}–{b} днів",
        nowTitle: "Сьогодні", nowDay: "{d}-й день циклу",
        phPeriod: "менструація", phFollicular: "до фертильного вікна ({n} дн)", phFertile: "фертильне вікно (овуляція через {n} дн)", phPeak: "найвищий шанс (овуляція через {n} дн)", phOv: "день овуляції", phLuteal: "після овуляції",
        calTitle: "Календар", calPrev: "Попередній місяць", calNext: "Наступний місяць", calAria: "Календар по місяцях, гортайте вбік", legPeriod: "Менструація", legFertile: "Фертильне вікно", legPeak: "Найвищий шанс", legOv: "Овуляція", legToday: "Сьогодні",
        thNo: "Цикл", thPeriod: "Менструація", thWindow: "Фертильне вікно", thOv: "Овуляція", thNext: "Наступна менструація",
        roll: "Введена дата давніша за поточний цикл — прогноз починається з поточного циклу.",
        far: "Чим далі прогноз від введеної дати, тим він менш точний.",
        irregular: "Діапазон «найкоротший–найдовший цикл» застосовано лише до найближчого циклу; наступні показано для звичайного циклу.",
        note: "Лише орієнтовна оцінка: калькулятор не можна використовувати як контрацепцію. Реальний день овуляції залежить від стресу, хвороб та інших факторів; для точності використовуйте тести на овуляцію або вимірювання температури й проконсультуйтеся з лікарем.",
        linkCopied: "Посилання скопійовано ✅", copyFailed: "Не вдалось скопіювати 😕", reset: "Скинуто ✅", example: "Підставлено приклад ✅", tableCopied: "Таблицю скопійовано ✅", csvDone: "CSV завантажено ✅", resultCopied: "Результат скопійовано ✅"
      };

  // ===== helpers =====
  const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : ""));
  const blank = (id) => (el(id)?.value || "").trim() === "";
  const wholeInt = (v) => {
    const s = String(v ?? "").trim();
    return /^\d{1,3}$/.test(s) ? Number(s) : NaN;
  };
  function toast(msg) {
    const n = el("toast");
    if (!n) return;
    n.textContent = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (n.textContent = ""), 2400);
  }

  // ===== дати як цілі числа днів (UTC) =====
  const DAY = 86400000;
  const dnOf = (y, m, d) => Math.round(Date.UTC(y, m - 1, d) / DAY);
  function parseISO(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || "").trim());
    if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3];
    if (y < 1990 || y > 2100) return null;
    const n = dnOf(y, mo, d), chk = new Date(n * DAY);
    return chk.getUTCFullYear() === y && chk.getUTCMonth() === mo - 1 && chk.getUTCDate() === d ? n : null;
  }
  const isoOf = (n) => new Date(n * DAY).toISOString().slice(0, 10);
  const todayDn = () => {
    const t = new Date();
    return dnOf(t.getFullYear(), t.getMonth() + 1, t.getDate());
  };
  const dparts = (n) => {
    const d = new Date(n * DAY);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), wd: d.getUTCDay() };
  };
  const fmtDate = (n) => {
    const p = dparts(n);
    return IS_EN ? MONTHS[p.m] + " " + p.d + ", " + p.y : p.d + " " + MONTHS[p.m] + " " + p.y;
  };
  const fmtDay = (n) => {
    const p = dparts(n);
    return IS_EN ? MONTHS[p.m] + " " + p.d : p.d + " " + MONTHS[p.m];
  };
  const fmtRange = (a, b) => {
    if (a === b) return fmtDate(a);
    const pa = dparts(a), pb = dparts(b);
    return pa.y === pb.y ? fmtDay(a) + " – " + fmtDate(b) : fmtDate(a) + " – " + fmtDate(b);
  };
  const weekdayOf = (n) => WEEKDAYS[dparts(n).wd];

  const state = { n: 6 };

  // ===== розрахунок =====
  function compute() {
    const today = todayDn();
    if (blank("lmpDate")) {
      const any = ["cycle", "luteal", "period", "cycMin", "cycMax"].some((id) => !blank(id));
      return { ok: false, none: !any, msg: any ? fill(T.missing, { list: T.lblLmp }) : "" };
    }
    const lmp = parseISO(el("lmpDate").value);
    if (lmp == null) return { ok: false, msg: T.errDate };
    if (lmp > today) return { ok: false, msg: T.errFuture };
    if (today - lmp > 730) return { ok: false, msg: T.errOld };

    let cycle = 28;
    if (!blank("cycle")) {
      cycle = wholeInt(el("cycle").value);
      if (!(cycle >= 21 && cycle <= 45)) return { ok: false, msg: T.errCycle };
    }
    let luteal = 14;
    if (!blank("luteal")) {
      luteal = wholeInt(el("luteal").value);
      if (!(luteal >= 10 && luteal <= 16)) return { ok: false, msg: T.errLuteal };
    }
    let period = 5;
    if (!blank("period")) {
      period = wholeInt(el("period").value);
      if (!(period >= 2 && period <= 10)) return { ok: false, msg: T.errPeriod };
    }
    let range = null;
    if (!blank("cycMin") || !blank("cycMax")) {
      const a = wholeInt(el("cycMin").value), b = wholeInt(el("cycMax").value);
      if (!(a >= 21 && b <= 45 && a <= b)) return { ok: false, msg: T.errRange };
      if (blank("cycle")) cycle = Math.round((a + b) / 2);
      else if (!(cycle >= a && cycle <= b)) return { ok: false, msg: T.errRangeCycle };
      range = { a, b };
    }
    if (cycle - luteal < 7 || (range && range.a - luteal < 7)) return { ok: false, msg: T.errEarly };

    // поточний цикл (що містить сьогодні) і прогноз на N циклів
    const k0 = Math.floor((today - lmp) / cycle);
    const cycles = [];
    for (let i = 0; i < state.n; i++) {
      const s = lmp + (k0 + i) * cycle, nx = s + cycle, o = nx - luteal;
      const c = { s, pe: s + period - 1, o, wa: o - 5, pk: o - 2, nx, no: i + 1 };
      if (i === 0 && range) {
        c.oMin = s + range.a - luteal;
        c.oMax = s + range.b - luteal;
      }
      cycles.push(c);
    }
    // цикл, до якого відносяться головні плитки: перший, де овуляція ще не минула
    let ti = cycles.findIndex((c) => (c.oMax != null ? c.oMax : c.o) >= today);
    if (ti < 0) ti = cycles.length - 1;
    const cur = cycles[0];
    const day = today - cur.s + 1;
    let phase;
    if (today <= cur.pe) phase = T.phPeriod;
    else if (today < cur.wa) phase = fill(T.phFollicular, { n: cur.wa - today });
    else if (today < cur.pk) phase = fill(T.phFertile, { n: cur.o - today });
    else if (today < cur.o) phase = fill(T.phPeak, { n: cur.o - today });
    else if (today === cur.o) phase = T.phOv;
    else phase = T.phLuteal;
    return { ok: true, today, lmp, cycle, luteal, period, range, k0, cycles, ti, day, phase };
  }

  // ===== відображення =====
  const tile = (title, value, mini, cls = "") =>
    '<div class="ovl__kpi ' + cls + '"><div class="ovl__kpiT">' + title + '</div><div class="ovl__kpiV' + (String(value).length > 14 ? " ovl__kpiV--s" : "") + '">' + value + "</div>" + (mini ? '<div class="ovl__kpiM">' + mini + "</div>" : "") + "</div>";

  function calendar(r) {
    const cls = new Map();
    const mark = (a, b, c) => {
      for (let d = a; d <= b; d++) cls.set(d, c);
    };
    r.cycles.forEach((c, i) => {
      mark(c.s, c.pe, "period");
      mark(c.wa, c.pk - 1, "fertile");
      mark(c.pk, c.o - 1, "peak");
      cls.set(c.o, "ov");
      if (i === r.cycles.length - 1) mark(c.nx, c.nx + r.period - 1, "period");
    });
    const first = r.cycles[0].s, last = r.cycles[r.cycles.length - 1].nx + r.period - 1;
    const pf = dparts(first), pl = dparts(last);
    const stName = { period: T.legPeriod, fertile: T.legFertile, peak: T.legPeak, ov: T.legOv };
    let html = "";
    const po = dparts(r.cycles[r.ti].o);
    let startIdx = 0, total = 0;
    for (let y = pf.y, m = pf.m; y < pl.y || (y === pl.y && m <= pl.m); m++) {
      if (m > 11) {
        m = 0;
        y++;
      }
      const d1 = dnOf(y, m + 1, 1), dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      let off = new Date(d1 * DAY).getUTCDay() - 1;
      if (off < 0) off = 6;
      let cells = WD_SHORT.map((w) => '<div class="ovl__wd">' + w + "</div>").join("");
      for (let i = 0; i < off; i++) cells += '<div class="ovl__day ovl__day--empty"></div>';
      for (let d = 1; d <= dim; d++) {
        const dn = d1 + d - 1, c = cls.get(dn);
        const extra = (c ? " ovl__day--" + c : "") + (dn === r.today ? " is-today" : "");
        cells += '<div class="ovl__day' + extra + '" title="' + fmtDate(dn) + (c ? " — " + stName[c] : "") + '">' + d + "</div>";
      }
      if (y === po.y && m === po.m) startIdx = total;
      total++;
      html += '<div class="ovl__month"><div class="ovl__mt">' + MONTHS_NOM[m] + " " + y + '</div><div class="ovl__cal">' + cells + "</div></div>";
      if (m === pl.m && y === pl.y) break;
    }
    const leg = [["period", T.legPeriod], ["fertile", T.legFertile], ["peak", T.legPeak], ["ov", T.legOv], ["today", T.legToday]]
      .map(([k, t]) => '<span class="ovl__legItem"><i class="ovl__dot ovl__dot--' + k + '"></i>' + t + "</span>")
      .join("");
    const nav = '<div class="ovl__calNav"><button type="button" class="ovl__calBtn" data-cal="-1" aria-label="' + T.calPrev + '">‹</button><span class="ovl__calPos" id="calPos" aria-live="polite">' + (startIdx + 1) + " / " + total + '</span><button type="button" class="ovl__calBtn" data-cal="1" aria-label="' + T.calNext + '">›</button></div>';
    return nav + '<div class="ovl__months" id="calScroll" data-start="' + startIdx + '" tabindex="0" role="region" aria-label="' + T.calAria + '">' + html + '</div><div class="ovl__legend">' + leg + "</div>";
  }

  function tableHtml(r) {
    const head = "<thead><tr><th>" + T.thNo + "</th><th>" + T.thPeriod + "</th><th>" + T.thWindow + "</th><th>" + T.thOv + "</th><th>" + T.thNext + "</th></tr></thead>";
    const body = r.cycles
      .map((c, i) => "<tr" + (i === r.ti ? ' class="ovl__total"' : "") + "><td>" + c.no + "</td><td>" + fmtRange(c.s, c.pe) + "</td><td>" + fmtRange(c.oMin != null ? c.oMin - 5 : c.wa, c.oMax != null ? c.oMax : c.o) + "</td><td>" + (c.oMin != null ? fmtRange(c.oMin, c.oMax) : fmtDate(c.o)) + "</td><td>" + fmtDate(c.nx) + "</td></tr>")
      .join("");
    return '<table class="ovl__tbl ovl__tbl--sch" id="scheduleTable">' + head + "<tbody>" + body + "</tbody></table>";
  }

  let last = null;

  function render(r) {
    const box = el("result");
    const sch = el("schedule");
    if (!r.ok) {
      last = null;
      box.innerHTML = r.none || !r.msg ? T.enter : '<div class="ovl__hintbox">' + r.msg + "</div>";
      sch.hidden = true;
      return;
    }
    last = r;
    const c = r.cycles[r.ti];
    const win = c.oMin != null ? fmtRange(c.oMin - 5, c.oMax) : fmtRange(c.wa, c.o);
    const dToNext = c.nx - r.today;
    const nextMini = dToNext > 0 ? fill(T.nextMini, { n: dToNext }) : dToNext === 0 ? T.nextToday : fill(T.nextPast, { n: -dToNext });
    const dayOfCycle = c.o - c.s + 1;
    let tiles =
      tile(T.ovTitle, fmtDate(c.o) + " · " + weekdayOf(c.o), fill(T.ovMini, { d: dayOfCycle }), "ovl__kpi--main ovl__kpi--wide") +
      tile(T.winTitle, win, c.oMin != null ? T.winRangeMini : T.winMini, "ovl__kpi--wide") +
      tile(T.peakTitle, fmtRange(c.pk, c.o), T.peakMini) +
      tile(T.nextTitle, fmtDate(c.nx), nextMini) +
      tile(T.testOvTitle, fmtDate(c.oMin != null ? c.oMin - 5 : c.wa), T.testOvMini) +
      tile(T.testPregTitle, fmtDate(c.nx), T.testPregMini);
    if (c.oMin != null) tiles += tile(T.rangeTitle, fmtRange(c.oMin, c.oMax), fill(T.rangeMini, { a: r.range.a, b: r.range.b }), "ovl__kpi--wide");
    tiles += tile(T.nowTitle, fill(T.nowDay, { d: r.day }), r.phase, "ovl__kpi--wide");
    let notes = "";
    if (r.k0 > 0) notes += '<div class="ovl__warn is-ok">' + T.roll + "</div>";
    if (r.range) notes += '<div class="ovl__warn is-ok">' + T.irregular + "</div>";
    if (r.k0 + r.cycles.length > 4) notes += '<div class="ovl__warn is-ok">' + T.far + "</div>";
    box.innerHTML = '<div class="ovl__kpis">' + tiles + "</div>" + notes + '<div class="ovl__sub">' + T.calTitle + "</div>" + calendar(r) + '<div class="ovl__note">' + T.note + "</div>";
    el("schedBody").innerHTML = tableHtml(r);
    sch.hidden = false;
    initCalendar();
  }

  // календар: один місяць у полі зору, решта — гортання вбік (свайп, колесо, стрілки)
  function initCalendar() {
    const sc = el("calScroll");
    if (!sc) return;
    const months = [...sc.children];
    const pos = el("calPos"), btns = [...document.querySelectorAll("[data-cal]")];
    const idxNow = () => {
      let best = 0, bd = Infinity;
      months.forEach((m, i) => {
        const d = Math.abs(m.offsetLeft - sc.scrollLeft);
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      return best;
    };
    const update = () => {
      const i = idxNow();
      pos.textContent = i + 1 + " / " + months.length;
      btns[0].disabled = i === 0;
      btns[1].disabled = i === months.length - 1;
    };
    const go = (i, smooth) => {
      i = Math.max(0, Math.min(months.length - 1, i));
      sc.scrollTo({ left: months[i].offsetLeft, behavior: smooth ? "smooth" : "auto" });
    };
    btns.forEach((b) =>
      b.addEventListener("click", () => {
        go(idxNow() + Number(b.dataset.cal), true);
        setTimeout(update, 500);
      })
    );
    let tm;
    sc.addEventListener("scroll", () => {
      clearTimeout(tm);
      tm = setTimeout(update, 60);
    });
    go(Number(sc.dataset.start) || 0, false);
    update();
  }

  function calc() {
    render(compute());
  }

  // ===== копіювання та CSV =====
  const tableMatrix = () => {
    const t = el("scheduleTable");
    if (!t) return [];
    return Array.from(t.querySelectorAll("tr")).map((tr) => Array.from(tr.children).map((c) => c.textContent.trim()));
  };
  async function copyTable() {
    const m = tableMatrix().map((r) => r.join("\t")).join("\n");
    try {
      await navigator.clipboard.writeText(m);
      toast(T.tableCopied);
    } catch {
      toast(T.copyFailed);
    }
  }
  function downloadCsv() {
    if (!el("scheduleTable") || !last) return;
    const csv = "﻿" + tableMatrix().map((row) => row.map((c) => '"' + c.replace(/"/g, '""') + '"').join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "ovulation.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(T.csvDone);
  }
  async function copyResult() {
    if (!last) return;
    const c = last.cycles[last.ti];
    const txt = T.ovTitle + ": " + fmtDate(c.o) + " (" + weekdayOf(c.o) + "); " + T.winTitle + ": " + fmtRange(c.wa, c.o);
    try {
      await navigator.clipboard.writeText(txt);
      toast(T.resultCopied);
    } catch {
      toast(T.copyFailed);
    }
  }

  // ===== кнопки =====
  const IDS = ["lmpDate", "cycle", "luteal", "period", "cycMin", "cycMax"];

  function applyState() {
    document.querySelectorAll("[data-n]").forEach((b) => {
      const on = Number(b.dataset.n) === state.n;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", String(on));
    });
  }

  function resetAll() {
    IDS.forEach((id) => (el(id).value = ""));
    state.n = 6;
    el("moreDet").open = false;
    applyState();
    render({ ok: false, none: true });
  }

  function fillExample() {
    IDS.forEach((id) => (el(id).value = ""));
    el("lmpDate").value = isoOf(todayDn() - 9);
    el("cycle").value = "28";
    state.n = 6;
    applyState();
    calc();
    toast(T.example);
  }

  function share() {
    const p = new URLSearchParams();
    IDS.forEach((id) => {
      const v = (el(id).value || "").trim();
      if (v) p.set(id, v);
    });
    p.set("n", String(state.n));
    const url = location.origin + location.pathname + "?" + p.toString();
    navigator.clipboard?.writeText(url).then(() => toast(T.linkCopied)).catch(() => toast(T.copyFailed));
  }

  function applyFromUrl() {
    const q = new URLSearchParams(location.search);
    let any = false;
    IDS.forEach((id) => {
      if (q.has(id)) {
        el(id).value = q.get(id);
        any = true;
      }
    });
    if (["3", "6", "12"].includes(q.get("n"))) state.n = Number(q.get("n"));
    if (["luteal", "period", "cycMin", "cycMax"].some((id) => !blank(id))) el("moreDet").open = true;
    return any;
  }

  window.addEventListener("DOMContentLoaded", () => {
    el("lmpDate").setAttribute("max", isoOf(todayDn()));
    IDS.forEach((id) => {
      ["input", "change"].forEach((ev) => el(id).addEventListener(ev, calc));
      el(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") calc();
      });
    });
    document.querySelectorAll("[data-n]").forEach((b) =>
      b.addEventListener("click", () => {
        state.n = Number(b.dataset.n);
        applyState();
        calc();
      })
    );
    el("copyTbl").addEventListener("click", copyTable);
    el("csvBtn").addEventListener("click", downloadCsv);
    el("calcBtn").addEventListener("click", () => {
      const r = compute();
      render(r);
      if (!r.ok && r.msg) toast(r.msg);
    });
    el("copyBtn").addEventListener("click", copyResult);
    el("exampleBtn").addEventListener("click", fillExample);
    el("resetBtn").addEventListener("click", () => {
      resetAll();
      toast(T.reset);
    });
    el("shareBtn").addEventListener("click", share);

    const used = applyFromUrl();
    applyState();
    if (used) calc();
    else render({ ok: false, none: true });
  });
})();
