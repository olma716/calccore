/* weight-gain-calculator.js — калькулятор набору ваги під час вагітності: коридор набору за тижнями (IOM 2009), статус, ціль до 40-го тижня, графік і таблиця (UK/EN, кг/lb)
   Коридор: до 13-го тижня набір росте від 0 до 0,5–2 кг, далі лінійно до загальної межі на 40-му тижні (діапазони IOM за ІМТ до вагітності).
   Темп 2–3 триместрів, що з цього виходить, збігається з темпами IOM (0,44–0,58 / 0,35–0,50 / 0,23–0,33 / 0,17–0,27 кг на тиждень).
   Двійня: тимчасові діапазони IOM, коридор по тижнях — та сама форма (темпів IOM для двійні немає). Недостатня вага + двійня та трійня: діапазону IOM немає (для трійні — лише довідковий орієнтир без коридору). */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const LOC = IS_EN ? "en-US" : "uk-UA";

  // діапазони IOM: загальний набір [мін, макс] у кг та у фунтах (офіційні значення IOM в lb), набір у 1-му триместрі
  const U = {
    kg: {
      single: { under: [12.5, 18], normal: [11.5, 16], over: [7, 11.5], obese: [5, 9] },
      twin: { normal: [17, 25], over: [14, 23], obese: [11, 19] },
      first: [0.5, 2], step: 5, pre: [30, 250], cur: [30, 300], diff: [-20, 50]
    },
    lb: {
      single: { under: [28, 40], normal: [25, 35], over: [15, 25], obese: [11, 20] },
      twin: { normal: [37, 54], over: [31, 50], obese: [25, 42] },
      first: [1.1, 4.4], step: 10, pre: [66, 550], cur: [66, 660], diff: [-44, 110]
    }
  };
  const LB = 0.45359237, IN = 2.54;
  const T1 = 13, TERM = 40;

  const T = IS_EN
    ? {
        enter: "Enter your data — the result will appear here.",
        missing: "Fill in: {list}.",
        errNum: "Enter a valid number in the field “{f}”.",
        errH: { kg: "Height must be between 120 and 220 cm.", lb: "Height must be between 3 ft 11 in and 7 ft 2 in." },
        errIn: "Inches must be between 0 and 11.9.",
        errPre: { kg: "Pre-pregnancy weight must be between 30 and 250 kg.", lb: "Pre-pregnancy weight must be between 66 and 550 lb." },
        errCur: { kg: "Current weight must be between 30 and 300 kg.", lb: "Current weight must be between 66 and 660 lb." },
        errWeek: "The week must be a whole number from 1 to 42.",
        errDiff: "The difference between the weights looks implausible — check the values.",
        errBmi: "The BMI before pregnancy is outside 13–60 — check the height and weight.",
        lblH: "Height", lblPre: "Pre-pregnancy weight", lblCur: "Current weight", lblWeek: "Week of pregnancy",
        cat: { under: "underweight", normal: "normal weight", over: "overweight", obese: "obesity" },
        nowTitle: "Weight gain now", nowMini: "{cur} − {pre} before pregnancy · BMI {bmi} ({cat})",
        weekN: "week {n}",
        corTitle: "Range for this week", corMini: "weight {a}–{b}",
        stTitle: "Status", stIn: "Within the range", stLow: "Below the range", stHigh: "Above the range",
        stInMini: "{a} to the lower limit, {b} to the upper",
        stLowMini: "{d} short of the lower limit",
        stHighMini: "{d} over the upper limit",
        goalTitle: "Goal by week 40", goalMini: "total gain by IOM · weight {a}–{b}",
        remTitle: "Left to gain", remMini: "≈ {a}–{b} per week over {n} wk", remDone: "goal reached", remEnd: "term of 40+ weeks",
        chartTitle: "Gain range by week", chartAria: "Chart of the recommended weight gain range by week of pregnancy with your current gain",
        legBand: "IOM range", legYou: "Your gain", axisW: "week of pregnancy",
        noRange: "For twins with an underweight BMI before pregnancy there is no official IOM range — the target gain is set by your doctor.",
        noRange3: "For triplets there is no official IOM range. Clinical sources usually name about {a} for the whole pregnancy (≈ {b} a week), but that rests on one small study — the target gain is set by your doctor.",
        thWeek: "Week", thMin: "Gain, from", thMax: "Gain, to", thW: "Weight",
        note: "IOM 2009 reference ranges, not a medical assessment: the individual pace is set by your doctor.",
        noteTwin: "For twins IOM gives provisional total ranges only; the weekly range is built proportionally.",
        linkCopied: "Link copied ✅", copyFailed: "Could not copy 😕", reset: "Reset ✅", example: "Example filled in ✅", tableCopied: "Table copied ✅", csvDone: "CSV downloaded ✅", resultCopied: "Result copied ✅",
        kg: "kg", lb: "lb"
      }
    : {
        enter: "Вкажіть дані — результат зʼявиться тут.",
        missing: "Заповніть: {list}.",
        errNum: "Вкажіть коректне число в полі «{f}».",
        errH: { kg: "Зріст має бути від 120 до 220 см.", lb: "Зріст має бути від 3 фт 11 дюйм до 7 фт 2 дюйм." },
        errIn: "Дюйми мають бути від 0 до 11,9.",
        errPre: { kg: "Вага до вагітності має бути від 30 до 250 кг.", lb: "Вага до вагітності має бути від 66 до 550 lb." },
        errCur: { kg: "Поточна вага має бути від 30 до 300 кг.", lb: "Поточна вага має бути від 66 до 660 lb." },
        errWeek: "Тиждень має бути цілим числом від 1 до 42.",
        errDiff: "Різниця між вагами виглядає неправдоподібною — перевірте значення.",
        errBmi: "ІМТ до вагітності поза межами 13–60 — перевірте зріст і вагу.",
        lblH: "Зріст", lblPre: "Вага до вагітності", lblCur: "Поточна вага", lblWeek: "Тиждень вагітності",
        cat: { under: "недостатня вага", normal: "норма", over: "надлишкова вага", obese: "ожиріння" },
        nowTitle: "Набір ваги зараз", nowMini: "{cur} − {pre} до вагітності · ІМТ {bmi} ({cat})",
        weekN: "{n}-й тиждень",
        corTitle: "Коридор на цей тиждень", corMini: "вага {a}–{b}",
        stTitle: "Статус", stIn: "У межах коридору", stLow: "Нижче коридору", stHigh: "Вище коридору",
        stInMini: "{a} до нижньої межі, {b} до верхньої",
        stLowMini: "Бракує {d} до нижньої межі",
        stHighMini: "Перевищення верхньої межі на {d}",
        goalTitle: "Ціль до 40-го тижня", goalMini: "загальний набір за IOM · вага {a}–{b}",
        remTitle: "Лишилось набрати", remMini: "≈ {a}–{b} на тиждень за {n} тиж", remDone: "ціль досягнуто", remEnd: "термін 40+ тижнів",
        chartTitle: "Коридор набору за тижнями", chartAria: "Графік рекомендованого коридору набору ваги за тижнями вагітності та вашого поточного набору",
        legBand: "Коридор IOM", legYou: "Ваш набір", axisW: "тиждень вагітності",
        noRange: "Для двійні при недостатній вазі до вагітності офіційного діапазону IOM немає — цільовий набір визначає лікар.",
        noRange3: "Для трійні офіційного діапазону IOM немає. У клінічних джерелах зазвичай називають близько {a} за всю вагітність (≈ {b} на тиждень), але це дані одного невеликого дослідження — цільовий набір визначає лікар.",
        thWeek: "Тиждень", thMin: "Набір, від", thMax: "Набір, до", thW: "Вага",
        note: "Орієнтири IOM 2009, а не медична оцінка: індивідуальний темп визначає лікар.",
        noteTwin: "Для двійні IOM дає лише тимчасові загальні діапазони; коридор по тижнях побудовано пропорційно.",
        linkCopied: "Посилання скопійовано ✅", copyFailed: "Не вдалось скопіювати 😕", reset: "Скинуто ✅", example: "Підставлено приклад ✅", tableCopied: "Таблицю скопійовано ✅", csvDone: "CSV завантажено ✅", resultCopied: "Результат скопійовано ✅",
        kg: "кг", lb: "lb"
      };

  // ===== helpers =====
  const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : ""));
  const r1 = (x) => Math.round(x * 10) / 10 + 0;
  const f1 = (x) => r1(x).toLocaleString(LOC, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const f2 = (x) => (Math.round(x * 100) / 100 + 0).toLocaleString(LOC, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sgn = (x) => (r1(x) > 0 ? "+" : "") + f1(x);
  const rng = (a, b) => f1(a) + "–" + f1(b);
  function toast(msg) {
    const n = el("toast");
    if (!n) return;
    n.textContent = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (n.textContent = ""), 2400);
  }

  let unit = IS_EN ? "lb" : "kg";
  const uName = () => T[unit];

  // ===== модель =====
  function corridor(w, tot, u) {
    const wc = Math.min(TERM, w), f = u.first;
    if (wc <= T1) return [(f[0] * wc) / T1, (f[1] * wc) / T1];
    const k = (wc - T1) / (TERM - T1);
    return [f[0] + (tot[0] - f[0]) * k, f[1] + (tot[1] - f[1]) * k];
  }
  const catOf = (bmiR) => (bmiR < 18.5 ? "under" : bmiR < 25 ? "normal" : bmiR < 30 ? "over" : "obese");

  // ===== читання полів =====
  const babies = () => (el("multi").value === "3" ? 3 : el("multi").value === "2" ? 2 : 1);
  const raw = (id) => (el(id).value || "").trim();
  function num(id) {
    const s = raw(id).replace(/\s+/g, "").replace(",", ".");
    if (s === "") return null;
    return /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
  }

  function compute() {
    const u = U[unit];
    const hMain = unit === "kg" ? "height" : "ft";
    const vals = { h: num(hMain), inch: unit === "lb" ? num("inch") : 0, pre: num("pre"), cur: num("cur"), week: num("week") };
    const miss = [];
    if (vals.h === null) miss.push(T.lblH);
    if (vals.pre === null) miss.push(T.lblPre);
    if (vals.cur === null) miss.push(T.lblCur);
    if (vals.week === null) miss.push(T.lblWeek);
    if (miss.length) return { ok: false, incomplete: true, none: miss.length === 4 && raw("inch") === "", msg: fill(T.missing, { list: miss.join(", ") }) };
    const bad = [[vals.h, T.lblH], [vals.inch === null ? 0 : vals.inch, T.lblH], [vals.pre, T.lblPre], [vals.cur, T.lblCur], [vals.week, T.lblWeek]].find(([v]) => Number.isNaN(v));
    if (bad) return { ok: false, msg: fill(T.errNum, { f: bad[1] }) };
    const inch = vals.inch === null ? 0 : vals.inch;
    let cm;
    if (unit === "kg") cm = vals.h;
    else {
      if (inch >= 12) return { ok: false, msg: T.errIn };
      cm = (vals.h * 12 + inch) * IN;
    }
    if (cm < 120 || cm > 220) return { ok: false, msg: T.errH[unit] };
    if (vals.pre < u.pre[0] || vals.pre > u.pre[1]) return { ok: false, msg: T.errPre[unit] };
    if (vals.cur < u.cur[0] || vals.cur > u.cur[1]) return { ok: false, msg: T.errCur[unit] };
    if (!Number.isInteger(vals.week) || vals.week < 1 || vals.week > 42) return { ok: false, msg: T.errWeek };
    const gain = r1(vals.cur) - r1(vals.pre);
    if (gain < u.diff[0] || gain > u.diff[1]) return { ok: false, msg: T.errDiff };
    const kgPre = unit === "kg" ? vals.pre : vals.pre * LB;
    const bmi = kgPre / ((cm / 100) * (cm / 100));
    if (bmi < 13 || bmi > 60) return { ok: false, msg: T.errBmi };
    const bmiR = r1(bmi), cat = catOf(bmiR);
    const n = babies();
    const tot = n === 3 ? null : (n === 2 ? u.twin : u.single)[cat] || null;
    const r = { ok: true, unit, u, cm, pre: vals.pre, cur: vals.cur, week: vals.week, gain, bmi: bmiR, cat, n, tot };
    if (!tot) return r;
    r.rows = [];
    for (let w = 1; w <= 42; w++) {
      const c = corridor(w, tot, u);
      r.rows.push({ w, lo: c[0], hi: c[1] });
    }
    const c = r.rows[vals.week - 1];
    r.lo = c.lo;
    r.hi = c.hi;
    const loR = r1(c.lo), hiR = r1(c.hi), gR = r1(gain);
    r.st = gR < loR - 1e-9 ? "low" : gR > hiR + 1e-9 ? "high" : "in";
    r.left = TERM - vals.week;
    r.remLo = Math.max(0, tot[0] - gain);
    r.remHi = Math.max(0, tot[1] - gain);
    return r;
  }

  // ===== відображення =====
  const tile = (title, value, mini, cls = "") =>
    '<div class="wg__kpi ' + cls + '"><div class="wg__kpiT">' + title + '</div><div class="wg__kpiV' + (String(value).length > 14 ? " wg__kpiV--s" : "") + '">' + value + "</div>" + (mini ? '<div class="wg__kpiM">' + mini + "</div>" : "") + "</div>";

  function chartSvg(r) {
    const W = 600, H = 244, L = 40, Rm = 14, Tp = 14, B = 34, XM = 42;
    const step = r.u.step;
    const yMax = Math.ceil(Math.max(r.tot[1], r.gain) / step) * step;
    const yMin = r.gain < 0 ? Math.floor(r.gain / step) * step : 0;
    const x = (w) => L + (w / XM) * (W - L - Rm);
    const y = (g) => Tp + ((yMax - g) / (yMax - yMin)) * (H - Tp - B);
    const f = r.u.first, t = r.tot;
    const up = [[0, 0], [T1, f[1]], [TERM, t[1]], [XM, t[1]]], dn = [[XM, t[0]], [TERM, t[0]], [T1, f[0]], [0, 0]];
    const pts = up.concat(dn).map(([w, g]) => x(w).toFixed(1) + "," + y(g).toFixed(1)).join(" ");
    let s = '<svg class="wg__chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + T.chartAria + '">';
    for (let g = yMin; g <= yMax + 1e-9; g += step) {
      s += '<line x1="' + L + '" y1="' + y(g).toFixed(1) + '" x2="' + (W - Rm) + '" y2="' + y(g).toFixed(1) + '" stroke="' + (g === 0 ? "#9aa6c0" : "#e6e8ef") + '"/>';
      s += '<text x="' + (L - 6) + '" y="' + (y(g) + 4).toFixed(1) + '" font-size="12" text-anchor="end" fill="#6b7280">' + g + "</text>";
    }
    [T1, 28, TERM].forEach((w) => {
      s += '<line x1="' + x(w).toFixed(1) + '" y1="' + Tp + '" x2="' + x(w).toFixed(1) + '" y2="' + y(yMin).toFixed(1) + '" stroke="#e6e8ef" stroke-dasharray="3 3"/>';
    });
    s += '<polygon points="' + pts + '" fill="#cfe0fb" fill-opacity=".85" stroke="#6f97dc" stroke-width="1.2"/>';
    [0, T1, 28, TERM].forEach((w) => {
      s += '<text x="' + x(w).toFixed(1) + '" y="' + (H - 14) + '" font-size="12" text-anchor="middle" fill="#6b7280">' + w + "</text>";
    });
    s += '<text x="' + ((L + W - Rm) / 2) + '" y="' + (H - 2) + '" font-size="12" text-anchor="middle" fill="#6b7280">' + T.axisW + "</text>";
    const col = r.st === "in" ? "#16a34a" : r.st === "low" ? "#2563eb" : "#d97706";
    const px = x(Math.min(r.week, XM)), py = y(r.gain), right = r.week > 30;
    s += '<line x1="' + px.toFixed(1) + '" y1="' + py.toFixed(1) + '" x2="' + px.toFixed(1) + '" y2="' + y(yMin).toFixed(1) + '" stroke="#283b69" stroke-dasharray="3 3"/>';
    s += '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="7" fill="' + col + '" stroke="#fff" stroke-width="2.5"/>';
    s += '<text x="' + (px + (right ? -12 : 12)).toFixed(1) + '" y="' + (py - 8).toFixed(1) + '" font-size="14" font-weight="700" text-anchor="' + (right ? "end" : "start") + '" fill="' + col + '">' + sgn(r.gain) + "</text>";
    return s + "</svg>";
  }

  function tableHtml(r) {
    const head = "<thead><tr><th>" + T.thWeek + "</th><th>" + T.thMin + "</th><th>" + T.thMax + "</th><th>" + T.thW + "</th></tr></thead>";
    const body = r.rows
      .map((x) => "<tr" + (x.w === r.week ? ' class="wg__total"' : "") + "><td>" + x.w + "</td><td>" + f1(x.lo) + "</td><td>" + f1(x.hi) + "</td><td>" + rng(r.pre + x.lo, r.pre + x.hi) + "</td></tr>")
      .join("");
    return '<table class="wg__tbl wg__tbl--sch" id="scheduleTable">' + head + "<tbody>" + body + "</tbody></table>";
  }

  let last = null;
  const stLabel = (r) => (r.st === "in" ? T.stIn : r.st === "low" ? T.stLow : T.stHigh);

  function render(r, strict) {
    const box = el("result");
    const sch = el("schedule");
    if (!r.ok) {
      last = null;
      box.innerHTML = r.none || (r.incomplete && !strict) || !r.msg ? T.enter : '<div class="wg__hintbox">' + r.msg + "</div>";
      sch.hidden = true;
      return;
    }
    last = r;
    const un = uName();
    const catTxt = T.cat[r.cat];
    let tiles = tile(T.nowTitle + " · " + fill(T.weekN, { n: r.week }), sgn(r.gain) + " " + un, fill(T.nowMini, { cur: f1(r.cur) + " " + un, pre: f1(r.pre) + " " + un, bmi: f1(r.bmi), cat: catTxt }), "wg__kpi--main wg__kpi--wide");
    if (!r.tot) {
      box.innerHTML = '<div class="wg__kpis">' + tiles + '</div><div class="wg__hintbox wg__mt12">' + (r.n === 3 ? fill(T.noRange3, { a: unit === "kg" ? "23 " + T.kg : "50 lb", b: unit === "kg" ? (IS_EN ? "0.7" : "0,7") + " " + T.kg : (IS_EN ? "1.5" : "1,5") + " lb" }) : T.noRange) + '</div>';
      el("schedule").hidden = true;
      return;
    }
    const lo = r1(r.lo), hi = r1(r.hi), g = r1(r.gain);
    let stMini;
    if (r.st === "in") stMini = fill(T.stInMini, { a: f1(g - lo) + " " + un, b: f1(hi - g) + " " + un });
    else if (r.st === "low") stMini = fill(T.stLowMini, { d: f1(lo - g) + " " + un });
    else stMini = fill(T.stHighMini, { d: f1(g - hi) + " " + un });
    tiles += tile(T.corTitle, rng(lo, hi) + " " + un, fill(T.corMini, { a: f1(r.pre + lo), b: f1(r.pre + hi) }) + " " + un);
    tiles += tile(T.stTitle, stLabel(r), stMini, r.st === "in" ? "is-win" : r.st === "low" ? "is-low" : "is-high");
    tiles += tile(T.goalTitle, rng(r.tot[0], r.tot[1]) + " " + un, fill(T.goalMini, { a: f1(r.pre + r.tot[0]), b: f1(r.pre + r.tot[1]) }) + " " + un);
    let rem;
    if (r.left <= 0) rem = tile(T.remTitle, "—", T.remEnd);
    else if (r.remHi <= 0) rem = tile(T.remTitle, "0 " + un, T.remDone);
    else rem = tile(T.remTitle, rng(r.remLo, r.remHi) + " " + un, fill(T.remMini, { a: f2(r.remLo / r.left), b: f2(r.remHi / r.left) + " " + un, n: r.left }));
    tiles += rem;
    const legend = '<div class="wg__legend"><span><i class="wg__sw wg__sw--band"></i>' + T.legBand + '</span><span><i class="wg__sw wg__sw--you wg__sw--' + r.st + '"></i>' + T.legYou + "</span></div>";
    box.innerHTML =
      '<div class="wg__kpis">' + tiles + "</div>" +
      '<div class="wg__sub">' + T.chartTitle + " (" + un + ")</div>" +
      '<div class="wg__chartScroll">' + chartSvg(r) + "</div>" + legend +
      '<div class="wg__note">' + T.note + (r.n === 2 ? " " + T.noteTwin : "") + "</div>";
    el("schedBody").innerHTML = tableHtml(r);
    sch.hidden = false;
  }

  function calc(strict) {
    render(compute(), strict === true);
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
    a.download = "pregnancy-weight-gain.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(T.csvDone);
  }
  async function copyResult() {
    if (!last) return;
    const un = uName();
    let txt = T.nowTitle + " (" + fill(T.weekN, { n: last.week }) + "): " + sgn(last.gain) + " " + un;
    if (last.tot) txt += "; " + T.corTitle + ": " + rng(last.lo, last.hi) + " " + un + "; " + T.stTitle + ": " + stLabel(last) + "; " + T.goalTitle + ": " + rng(last.tot[0], last.tot[1]) + " " + un;
    try {
      await navigator.clipboard.writeText(txt);
      toast(T.resultCopied);
    } catch {
      toast(T.copyFailed);
    }
  }

  // ===== одиниці =====
  function setUnit(next, convert) {
    if (next === unit) return;
    const prev = unit;
    if (convert) {
      ["pre", "cur"].forEach((id) => {
        const v = num(id);
        if (v !== null && !Number.isNaN(v)) el(id).value = String(r1(prev === "kg" ? v / LB : v * LB));
      });
      if (prev === "kg") {
        const c = num("height");
        if (c !== null && !Number.isNaN(c)) {
          let tot = Math.round((c / IN) * 10) / 10, ft = Math.floor(tot / 12), inch = r1(tot - ft * 12);
          if (inch >= 12) { ft += 1; inch = 0; }
          el("ft").value = String(ft);
          el("inch").value = inch ? String(inch) : "0";
        }
      } else {
        const ft = num("ft"), inch = num("inch") || 0;
        if (ft !== null && !Number.isNaN(ft) && !Number.isNaN(inch)) el("height").value = String(Math.round((ft * 12 + inch) * IN));
      }
    }
    unit = next;
    syncUnit();
  }
  function syncUnit() {
    document.querySelectorAll("[data-wu]").forEach((n) => (n.textContent = uName()));
    el("pre").placeholder = unit === "kg" ? "62" : "137";
    el("cur").placeholder = unit === "kg" ? (IS_EN ? "68.5" : "68,5") : "151";
    el("heightField").hidden = unit !== "kg";
    el("heightImpField").hidden = unit !== "lb";
    document.querySelectorAll(".wg__mode").forEach((b) => {
      const on = b.dataset.unit === unit;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  // ===== кнопки =====
  const IDS = ["height", "ft", "inch", "pre", "cur", "week"];

  // кількість плодів: власний випадний список (прихований input #multi зберігає значення 1/2/3)
  function syncBabies() {
    const v = String(babies());
    el("multi").value = v;
    document.querySelectorAll("#multi_list li").forEach((li) => {
      const on = li.dataset.v === v;
      li.setAttribute("aria-selected", on ? "true" : "false");
      if (on) el("multi_val").textContent = li.textContent;
    });
  }
  const setBabies = (n) => {
    el("multi").value = String(n);
    syncBabies();
  };
  function initBabiesDd() {
    const btn = el("multi_btn"), list = el("multi_list");
    const items = () => Array.from(list.querySelectorAll("li"));
    const close = (focusBtn) => {
      list.hidden = true;
      btn.setAttribute("aria-expanded", "false");
      if (focusBtn) btn.focus();
    };
    const open = () => {
      list.hidden = false;
      btn.setAttribute("aria-expanded", "true");
      (items().find((li) => li.getAttribute("aria-selected") === "true") || items()[0]).focus();
    };
    const pick = (li) => {
      setBabies(li.dataset.v);
      close(true);
      calc();
    };
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (list.hidden) open();
      else close();
    });
    btn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        open();
      }
    });
    list.addEventListener("click", (e) => {
      const li = e.target.closest("li[data-v]");
      if (li) pick(li);
    });
    list.addEventListener("keydown", (e) => {
      const all = items(), i = all.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); all[Math.min(all.length - 1, i + 1)].focus(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); all[Math.max(0, i - 1)].focus(); }
      else if (e.key === "Home") { e.preventDefault(); all[0].focus(); }
      else if (e.key === "End") { e.preventDefault(); all[all.length - 1].focus(); }
      else if ((e.key === "Enter" || e.key === " ") && i >= 0) { e.preventDefault(); pick(all[i]); }
      else if (e.key === "Escape") { e.preventDefault(); close(true); }
      else if (e.key === "Tab") close();
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#multi_dd")) close();
    });
    el("multi").addEventListener("change", () => {
      syncBabies();
      calc();
    });
  }

  function resetAll() {
    IDS.forEach((id) => (el(id).value = ""));
    setBabies(1);
    render({ ok: false, none: true });
  }

  function fillExample() {
    resetAll();
    if (unit === "kg") {
      el("height").value = "168";
      el("pre").value = "62";
      el("cur").value = IS_EN ? "68.5" : "68,5";
    } else {
      el("ft").value = "5";
      el("inch").value = "6";
      el("pre").value = "137";
      el("cur").value = "151";
    }
    el("week").value = "24";
    calc(true);
    toast(T.example);
  }

  function share() {
    const p = new URLSearchParams();
    p.set("u", unit === "kg" ? "m" : "i");
    IDS.forEach((id) => {
      const v = raw(id);
      if (v && ((unit === "kg" && id !== "ft" && id !== "inch") || (unit === "lb" && id !== "height"))) p.set(id, v);
    });
    if (babies() > 1) p.set("multi", String(babies()));
    const url = location.origin + location.pathname + "?" + p.toString();
    navigator.clipboard?.writeText(url).then(() => toast(T.linkCopied)).catch(() => toast(T.copyFailed));
  }

  function applyFromUrl() {
    const q = new URLSearchParams(location.search);
    let any = false;
    if (q.get("u") === "i") setUnit("lb", false);
    else if (q.get("u") === "m") setUnit("kg", false);
    IDS.forEach((id) => {
      if (q.has(id)) {
        el(id).value = q.get(id).slice(0, 12);
        any = true;
      }
    });
    if (q.get("multi") === "2" || q.get("multi") === "3") {
      setBabies(Number(q.get("multi")));
      any = true;
    }
    return any;
  }

  window.addEventListener("DOMContentLoaded", () => {
    IDS.forEach((id) => {
      el(id).addEventListener("input", () => calc());
      el(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") calc(true);
      });
    });
    initBabiesDd();
    document.querySelectorAll(".wg__mode").forEach((b) =>
      b.addEventListener("click", () => {
        setUnit(b.dataset.unit, true);
        calc();
      })
    );
    el("copyTbl").addEventListener("click", copyTable);
    el("csvBtn").addEventListener("click", downloadCsv);
    el("calcBtn").addEventListener("click", () => {
      const r = compute();
      render(r, true);
      if (!r.ok && r.msg) toast(r.msg);
    });
    el("copyBtn").addEventListener("click", copyResult);
    el("exampleBtn").addEventListener("click", fillExample);
    el("resetBtn").addEventListener("click", () => {
      resetAll();
      toast(T.reset);
    });
    el("shareBtn").addEventListener("click", share);

    syncUnit();
    if (applyFromUrl()) {
      syncUnit();
      syncBabies();
      calc();
    } else render({ ok: false, none: true });
  });
})();
