/* salary-calculator.js — зарплатний калькулятор (UK/EN)
   Брутто → на руки: ПДФО = брутто × ставка, військовий збір = брутто × ставка, на руки = брутто − ПДФО − ВЗ − утримання.
   На руки → брутто: брутто = (на руки + утримання) / (1 − (ПДФО + ВЗ)/100).
   ЄСВ сплачує роботодавець зверху: ставка × база; база не менша за мінімальну (мінімальна зарплата, для повної зайнятості)
   і, якщо задано, не більша за верхню межу. Вартість роботодавця = брутто + ЄСВ.
   Усі податки округлюються до копійок щомісяця. Параметри (ставки, мінімальна зарплата, межа бази) — редаговані:
   їх встановлює закон і вони можуть змінитися. Для валюти не UAH курс потрібен лише для мінімальної бази ЄСВ. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const LOCALE = IS_EN ? "en-US" : "uk-UA";

  const T = IS_EN
    ? {
        enter: "Enter the amount — the result will appear here.",
        missing: "To calculate, fill in: {list}.",
        lblAmount: "amount",
        errAmount: "The amount must be greater than 0 and not above 1 000 000 000.",
        errNum: "Check the value in the field “{f}”.",
        errMonth: "The month of the one-time bonus must be a whole number from 1 to 12.",
        errDate: "Enter a valid start date or leave the field empty.",
        errTaxes: "PIT and military levy together must be below 100%.",
        errDed: "Deductions are not below the net pay — reduce them.",
        errFx: "Enter a valid exchange rate (UAH per 1 {c}) or leave it empty.",
        lblBonus: "Monthly bonus", lblOne: "One-time bonus", lblDed: "Deductions", lblPit: "Income tax", lblVz: "Military levy", lblEsv: "ESV rate", lblMinw: "Minimum wage", lblMaxb: "ESV maximum base",
        cur: { UAH: "UAH", USD: "USD", EUR: "EUR" },
        amountGross: "Gross salary (before tax)", amountNet: "Desired net pay (in hand)",
        net: "Net pay (in hand)", netMini: "regular month, gross {g}",
        gross: "Gross salary", grossMini: "before taxes",
        pit: "Income tax (PIT)", pitMini: "{p}% of gross", vz: "Military levy", vzMini: "{p}% of gross",
        esv: "ESV (paid by the employer)", esvMini: "{p}% of the base {b}",
        employer: "Employer cost", employerMini: "gross + ESV",
        burden: "Tax burden", burdenMini: "PIT + levy + ESV of employer cost",
        yNet: "Net pay for the year", yNetMini: "with bonuses, 12 months", yEmp: "Employer cost for the year", yEmpMini: "gross {g} + ESV",
        warnMin: "Gross is below the minimum wage ({m}) — that is allowed only for part-time work.",
        warnFx: "No exchange rate: the minimum ESV base is not applied.",
        thMonth: "Month", thDate: "Date", thGross: "Gross", thPit: "PIT", thVz: "Levy", thDed: "Deductions", thNet: "Net", thEsv: "ESV", thEmp: "Employer cost", thTotal: "Total",
        tableCopied: "Table copied ✅", csvDone: "CSV downloaded ✅",
        chartTitle: "What the employer cost consists of", legNet: "Net pay", legDed: "Deductions", legPit: "Income tax", legVz: "Military levy", legEsv: "ESV", donutTotal: "in total",
        modelNote: "Estimate: rates, the minimum wage and the ESV base are set by law and may change — check them in the “Law parameters” block. Real payroll depends on the contract, the worked time and the employer's rules.",
        linkCopied: "Link copied ✅", copyFailed: "Could not copy 😕", reset: "Reset ✅", example: "Example filled in ✅"
      }
    : {
        enter: "Вкажіть суму — результат зʼявиться тут.",
        missing: "Щоб порахувати, заповніть: {list}.",
        lblAmount: "суму",
        errAmount: "Сума має бути більшою за 0 і не більшою за 1 000 000 000.",
        errNum: "Перевірте значення в полі «{f}».",
        errMonth: "Місяць одноразової премії — ціле число від 1 до 12.",
        errDate: "Вкажіть коректну дату старту або залиште поле порожнім.",
        errTaxes: "ПДФО і військовий збір разом мають бути менше 100%.",
        errDed: "Утримання не менші за суму на руки — зменшіть їх.",
        errFx: "Вкажіть коректний курс (грн за 1 {c}) або залиште поле порожнім.",
        lblBonus: "Премія щомісяця", lblOne: "Одноразова премія", lblDed: "Утримання", lblPit: "ПДФО", lblVz: "Військовий збір", lblEsv: "Ставка ЄСВ", lblMinw: "Мінімальна зарплата", lblMaxb: "Верхня межа бази ЄСВ",
        cur: { UAH: "грн", USD: "USD", EUR: "EUR" },
        amountGross: "Заробітна плата брутто (до податків)", amountNet: "Бажана сума «на руки»",
        net: "На руки", netMini: "звичайний місяць, брутто {g}",
        gross: "Брутто", grossMini: "до сплати податків",
        pit: "ПДФО", pitMini: "{p}% від брутто", vz: "Військовий збір", vzMini: "{p}% від брутто",
        esv: "ЄСВ (сплачує роботодавець)", esvMini: "{p}% від бази {b}",
        employer: "Вартість роботодавця", employerMini: "брутто + ЄСВ",
        burden: "Податкове навантаження", burdenMini: "ПДФО + ВЗ + ЄСВ від витрат роботодавця",
        yNet: "На руки за рік", yNetMini: "з преміями, 12 місяців", yEmp: "Витрати роботодавця за рік", yEmpMini: "брутто {g} + ЄСВ",
        warnMin: "Брутто менше за мінімальну зарплату ({m}) — це допустимо лише при неповному робочому часі.",
        warnFx: "Курс не вказано: мінімальна база ЄСВ не застосовується.",
        thMonth: "Місяць", thDate: "Дата", thGross: "Брутто", thPit: "ПДФО", thVz: "ВЗ", thDed: "Утримання", thNet: "На руки", thEsv: "ЄСВ", thEmp: "Вартість роботодавця", thTotal: "Разом",
        tableCopied: "Таблицю скопійовано ✅", csvDone: "CSV завантажено ✅",
        chartTitle: "З чого складаються витрати роботодавця", legNet: "На руки", legDed: "Утримання", legPit: "ПДФО", legVz: "Військовий збір", legEsv: "ЄСВ", donutTotal: "усього",
        modelNote: "Оцінка: ставки, мінімальну зарплату й базу ЄСВ встановлює закон, вони можуть змінитися — перевіряйте їх у блоці «Параметри законодавства». Реальна зарплата залежить від договору, відпрацьованого часу й правил роботодавця.",
        linkCopied: "Посилання скопійовано ✅", copyFailed: "Не вдалось скопіювати 😕", reset: "Скинуто ✅", example: "Підставлено приклад ✅"
      };

  // ===== helpers =====
  function num(v) {
    const raw = String(v ?? "").replace(/[\s ]+/g, "").replace(/−/g, "-");
    const s = IS_EN ? raw.replace(/,/g, "") : raw.replace(",", ".");
    if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }
  const blank = (id) => (el(id)?.value || "").trim() === "";
  const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : ""));
  const nf = (n, d) => n.toLocaleString(LOCALE, { minimumFractionDigits: d, maximumFractionDigits: d });
  const f0 = (n) => nf(n, 0);
  const f2 = (n) => nf(n, 2);
  const r2 = (x) => Math.round(x * 100) / 100;
  const state = { mode: "g2n", period: "month", cur: "UAH", bonusU: "pct" };
  const money = (n) => f0(n) + " " + T.cur[state.cur];
  const money2 = (n) => f2(n) + " " + T.cur[state.cur];
  const DEFAULTS = { pit: "18", vz: "5", esv: "22", minw: "8647", maxb: "" };

  // групування тисяч під час введення: 1000000 → 1 000 000 (EN: 1,000,000); курсор лишається біля тієї самої цифри
  const GROUP_SEP = IS_EN ? "," : " ";
  const MONEY_IDS = ["amount", "bonus", "one", "ded", "minw", "maxb"];
  function groupInput(inp) {
    const v = inp.value;
    if (!/^[\d\s .,-]*$/.test(v)) return;
    const pos = inp.selectionStart == null ? v.length : inp.selectionStart;
    const digitsBefore = (v.slice(0, pos).match(/\d/g) || []).length;
    let s = v.replace(/[\s ]/g, "");
    const neg = s.startsWith("-");
    if (neg) s = s.slice(1);
    let intPart, dec = "";
    if (IS_EN) {
      s = s.replace(/,/g, "");
      const i = s.indexOf(".");
      intPart = i < 0 ? s : s.slice(0, i);
      dec = i < 0 ? "" : "." + s.slice(i + 1).replace(/\./g, "");
    } else {
      const i = s.search(/[.,]/);
      intPart = i < 0 ? s : s.slice(0, i);
      dec = i < 0 ? "" : "," + s.slice(i + 1).replace(/[.,]/g, "");
    }
    intPart = intPart.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEP);
    const out = (neg ? "-" : "") + intPart + dec;
    if (out === v) return;
    inp.value = out;
    let idx = out.length;
    if (digitsBefore === 0) idx = neg ? 1 : 0;
    else {
      let c = 0;
      for (let k = 0; k < out.length; k++) {
        if (/\d/.test(out[k])) c++;
        if (c === digitsBefore) {
          idx = k + 1;
          break;
        }
      }
    }
    try {
      inp.setSelectionRange(idx, idx);
    } catch {}
  }
  const groupAll = () => MONEY_IDS.forEach((id) => el(id) && groupInput(el(id)));
  // у посиланні «Поділитись» суми без розділювачів груп; десятковий роздільник — крапка
  const plain = (v) => (IS_EN ? v.replace(/,/g, "") : v.replace(/[\s ]/g, "").replace(",", "."));

  function toast(msg) {
    const n = el("toast");
    if (!n) return;
    n.textContent = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (n.textContent = ""), 2400);
  }

  function opt(id, label, min, max) {
    if (blank(id)) return { v: 0, given: false };
    const v = num(el(id).value);
    if (!(v >= min && v <= max)) return { err: fill(T.errNum, { f: label }) };
    return { v, given: true };
  }

  function addMonths(d, m) {
    const x = new Date(d.getFullYear(), d.getMonth() + m, 1);
    x.setDate(Math.min(d.getDate(), new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate()));
    return x;
  }
  const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

  // ===== розрахунок =====
  function compute() {
    if (blank("amount")) return { ok: false, none: ["bonus", "one", "ded"].every(blank), msg: ["bonus", "one", "ded"].every(blank) ? "" : fill(T.missing, { list: T.lblAmount }) };
    let amt = num(el("amount").value);
    if (!(amt > 0 && amt <= 1e9)) return { ok: false, msg: T.errAmount };
    const monthlyBase = state.period === "year" ? r2(amt / 12) : amt;

    const pit = opt("pit", T.lblPit, 0, 50), vz = opt("vz", T.lblVz, 0, 50), esvR = opt("esv", T.lblEsv, 0, 50);
    const minw = opt("minw", T.lblMinw, 0, 1e7), maxb = opt("maxb", T.lblMaxb, 0, 1e10);
    for (const x of [pit, vz, esvR, minw, maxb]) if (x.err) return { ok: false, msg: x.err };
    const pitP = blank("pit") ? 18 : pit.v, vzP = blank("vz") ? 5 : vz.v, esvP = blank("esv") ? 22 : esvR.v;
    if (!(pitP + vzP < 100)) return { ok: false, msg: T.errTaxes };

    // мінімальна база ЄСВ у валюті розрахунку; для валюти не UAH потрібен курс
    let fx = 1, warnFx = false;
    if (state.cur !== "UAH") {
      if (blank("fx")) {
        fx = 0;
        warnFx = !blank("minw") && minw.v > 0;
      } else {
        fx = num(el("fx").value);
        if (!(fx > 0 && fx <= 1e6)) return { ok: false, msg: fill(T.errFx, { c: T.cur[state.cur] }) };
      }
    }
    const minwUAH = blank("minw") ? 0 : minw.v;
    const minBase = fx > 0 ? r2(minwUAH / fx) : 0;
    const maxBase = blank("maxb") ? Infinity : fx > 0 ? maxb.v / fx : maxb.v;

    const ded = opt("ded", T.lblDed, 0, 1e9);
    let start = null;
    if (!blank("start")) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(el("start").value.trim());
      start = m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
      if (!start || start.getFullYear() < 1990 || start.getFullYear() > 2100) return { ok: false, msg: T.errDate };
    }
    if (ded.err) return { ok: false, msg: ded.err };

    let bonusM = 0, oneAmt = 0, oneMonth = 1;
    let gross;
    const k = (pitP + vzP) / 100;
    if (state.mode === "n2g") {
      if (!(ded.v < monthlyBase)) return { ok: false, msg: T.errDed };
      gross = r2((monthlyBase + ded.v) / (1 - k));
      // податки округлюються до копійок, тому добираємо брутто так, щоб «на руки» збіглося точно
      const netOf = (g) => r2(g - r2((g * pitP) / 100) - r2((g * vzP) / 100) - ded.v);
      for (const dlt of [0, 0.01, -0.01, 0.02, -0.02]) {
        const g2 = r2(gross + dlt);
        if (Math.abs(netOf(g2) - monthlyBase) < 0.005) {
          gross = g2;
          break;
        }
      }
    } else {
      gross = monthlyBase;
      const bo = opt("bonus", T.lblBonus, 0, state.bonusU === "pct" ? 1000 : 1e9), on = opt("one", T.lblOne, 0, 1e9);
      for (const x of [bo, on]) if (x.err) return { ok: false, msg: x.err };
      bonusM = state.bonusU === "pct" ? r2((gross * bo.v) / 100) : bo.v;
      oneAmt = on.v;
      if (oneAmt > 0 && !blank("oneMonth")) {
        oneMonth = num(el("oneMonth").value);
        if (!(Number.isInteger(oneMonth) && oneMonth >= 1 && oneMonth <= 12)) return { ok: false, msg: T.errMonth };
      }
    }

    const rows = [];
    for (let m = 1; m <= 12; m++) {
      const taxable = r2(gross + bonusM + (m === oneMonth ? oneAmt : 0));
      const pitA = r2((taxable * pitP) / 100), vzA = r2((taxable * vzP) / 100);
      const dedA = ded.v;
      const net = r2(taxable - pitA - vzA - dedA);
      const base = Math.min(Math.max(taxable, minBase), maxBase);
      const esvA = r2((base * esvP) / 100);
      rows.push({ m, date: start ? addMonths(start, m - 1) : null, gross: taxable, pit: pitA, vz: vzA, ded: dedA, net, esv: esvA, employer: r2(taxable + esvA), base });
    }
    if (rows.some((x) => x.net < 0)) return { ok: false, msg: T.errDed };
    const regular = rows.find((x) => x.m !== oneMonth) || rows[0];
    const sum = (key) => r2(rows.reduce((s, x) => s + x[key], 0));
    return {
      ok: true, mode: state.mode, period: state.period, gross, bonusM, oneAmt, oneMonth, pitP, vzP, esvP, ded: ded.v, rows, regular, minBase, maxBase, fx, warnFx,
      warnMin: fx > 0 && minBase > 0 && gross < minBase, start,
      yGross: sum("gross"), yPit: sum("pit"), yVz: sum("vz"), yDed: sum("ded"), yNet: sum("net"), yEsv: sum("esv"), yEmployer: sum("employer"),
      burden: ((sum("pit") + sum("vz") + sum("esv")) / sum("employer")) * 100
    };
  }

  // ===== відображення =====
  const tile = (title, value, mini, cls = "") =>
    '<div class="sal__kpi ' + cls + '"><div class="sal__kpiT">' + title + '</div><div class="sal__kpiV">' + value + "</div>" + (mini ? '<div class="sal__kpiM">' + mini + "</div>" : "") + "</div>";

  // кільце: з чого складаються витрати роботодавця за рік
  function donut(r) {
    const parts = [
      [T.legNet, r.yNet, "#283b69"],
      [T.legDed, r.yDed, "#9aa6c2"],
      [T.legPit, r.yPit, "#0f8b8d"],
      [T.legVz, r.yVz, "#7c93c9"],
      [T.legEsv, r.yEsv, "#c4cde3"]
    ].filter((p) => p[1] > 0.5);
    const tot = parts.reduce((x, p) => x + p[1], 0);
    const cx = 75, cy = 75, rad = 52, rw = 22;
    let a0 = -Math.PI / 2;
    let svg = '<svg class="sal__chart sal__donutSvg" viewBox="0 0 150 150" role="img" aria-label="' + T.chartTitle + '">';
    parts.forEach((p) => {
      const frac = p[1] / tot;
      const a1 = a0 + Math.min(frac, 0.9999) * 2 * Math.PI;
      const x0 = cx + rad * Math.cos(a0), y0 = cy + rad * Math.sin(a0);
      const x1 = cx + rad * Math.cos(a1 - 0.015), y1 = cy + rad * Math.sin(a1 - 0.015);
      svg += '<path d="M' + x0.toFixed(2) + " " + y0.toFixed(2) + " A" + rad + " " + rad + " 0 " + (a1 - a0 > Math.PI ? 1 : 0) + " 1 " + x1.toFixed(2) + " " + y1.toFixed(2) + '" fill="none" stroke="' + p[2] + '" stroke-width="' + rw + '"/>';
      a0 = a1;
    });
    svg += '<text x="75" y="73" font-size="13" font-weight="800" fill="#1f2f55" text-anchor="middle">' + f0(tot) + "</text>";
    svg += '<text x="75" y="90" font-size="11" fill="#6b7280" text-anchor="middle">' + T.cur[state.cur] + " " + T.donutTotal + "</text></svg>";
    const list = parts
      .map((p) => '<li><i style="background:' + p[2] + '"></i><span>' + p[0] + "</span><b>" + f0(p[1]) + " · " + nf((p[1] / tot) * 100, 1) + "%</b></li>")
      .join("");
    return '<div class="sal__donut">' + svg + '<ul class="sal__dl">' + list + "</ul></div>";
  }

  function scheduleHtml(r) {
    const hasDate = !!r.start, hasDed = r.ded > 0;
    const head =
      "<thead><tr><th>" + T.thMonth + "</th>" + (hasDate ? "<th>" + T.thDate + "</th>" : "") + "<th>" + T.thGross + "</th><th>" + T.thPit + "</th><th>" + T.thVz + "</th>" + (hasDed ? "<th>" + T.thDed + "</th>" : "") + "<th>" + T.thNet + "</th><th>" + T.thEsv + "</th><th>" + T.thEmp + "</th></tr></thead>";
    const cells = (get) => "<td>" + f2(get("gross")) + "</td><td>" + f2(get("pit")) + "</td><td>" + f2(get("vz")) + "</td>" + (hasDed ? "<td>" + f2(get("ded")) + "</td>" : "") + "<td>" + f2(get("net")) + "</td><td>" + f2(get("esv")) + "</td><td>" + f2(get("employer")) + "</td>";
    const body = r.rows
      .map((x) => "<tr" + (x.m === r.oneMonth && r.oneAmt > 0 ? ' class="sal__hl"' : "") + "><td>" + x.m + "</td>" + (hasDate ? '<td data-iso="' + iso(x.date) + '">' + x.date.toLocaleDateString(LOCALE) + "</td>" : "") + cells((k) => x[k]) + "</tr>")
      .join("");
    const tot = (k) => r.rows.reduce((a, x) => a + x[k], 0);
    const totalRow = '<tr class="sal__total"><td>' + T.thTotal + "</td>" + (hasDate ? "<td>—</td>" : "") + cells(tot) + "</tr>";
    return '<table class="sal__tbl sal__tbl--sch" id="scheduleTable">' + head + "<tbody>" + body + totalRow + "</tbody></table>";
  }

  let last = null;

  function render(r) {
    const box = el("result");
    const sch = el("schedule");
    if (!r.ok) {
      last = null;
      box.innerHTML = r.none || !r.msg ? T.enter : '<div class="sal__hintbox">' + r.msg + "</div>";
      sch.hidden = true;
      return;
    }
    last = r;
    const g = r.regular;
    const warns = [];
    if (r.warnMin) warns.push(fill(T.warnMin, { m: money(r.minBase) }));
    if (r.warnFx) warns.push(T.warnFx);
    const tiles =
      tile(T.net, money2(g.net), fill(T.netMini, { g: money(g.gross) }), "sal__kpi--main sal__kpi--wide") +
      tile(T.gross, money2(g.gross), T.grossMini) +
      tile(T.employer, money2(g.employer), T.employerMini) +
      tile(T.pit, money2(g.pit), fill(T.pitMini, { p: nf(r.pitP, 1) })) +
      tile(T.vz, money2(g.vz), fill(T.vzMini, { p: nf(r.vzP, 1) })) +
      tile(T.esv, money2(g.esv), fill(T.esvMini, { p: nf(r.esvP, 1), b: money(g.base) })) +
      tile(T.burden, nf(r.burden, 1) + "%", T.burdenMini) +
      tile(T.yNet, money(r.yNet), T.yNetMini) +
      tile(T.yEmp, money(r.yEmployer), fill(T.yEmpMini, { g: money(r.yGross) }));
    const warnHtml = warns.map((w) => '<div class="sal__note sal__note--warn">' + w + "</div>").join("");
    box.innerHTML = '<div class="sal__kpis">' + tiles + "</div>" + warnHtml + '<div class="sal__sub">' + T.chartTitle + "</div>" + donut(r) + '<div class="sal__note">' + T.modelNote + "</div>";
    sch.hidden = false;
    el("schedBody").innerHTML = scheduleHtml(r);
  }

  function calc() {
    render(compute());
  }

  // ===== таблиця: копіювання й CSV =====
  const tableMatrix = () => {
    const t = el("scheduleTable");
    if (!t) return [];
    return Array.from(t.querySelectorAll("tr")).map((tr) => Array.from(tr.children).map((c) => (c.dataset.iso ? c.dataset.iso : c.textContent.trim())));
  };
  async function copyTable() {
    const t = el("scheduleTable");
    const m = (t ? Array.from(t.querySelectorAll("tr")).map((tr) => Array.from(tr.children).map((c) => c.textContent.trim()).join("\t")) : []).join("\n");
    try {
      await navigator.clipboard.writeText(m);
      toast(T.tableCopied);
    } catch {
      toast(T.copyFailed);
    }
  }
  function downloadCsv() {
    const t = el("scheduleTable");
    if (!t || !last) return;
    // числа без форматування (крапка, 2 знаки), роздільник «;» — Excel читає як числа
    const clean = (s) => {
      const x = s.replace(/[\s ]/g, "");
      if (/^[\d,.\-]+$/.test(x)) return IS_EN ? x.replace(/,/g, "") : x.replace(",", ".");
      return s;
    };
    const csv = "﻿" + tableMatrix().map((row) => row.map((c) => '"' + clean(c).replace(/"/g, '""') + '"').join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "salary-schedule.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(T.csvDone);
  }

  // ===== режими =====
  function applyState() {
    document.querySelectorAll("[data-mode]").forEach((b) => {
      const on = b.dataset.mode === state.mode;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", String(on));
    });
    document.querySelectorAll("[data-period]").forEach((b) => b.classList.toggle("is-on", b.dataset.period === state.period));
    document.querySelectorAll("[data-fu]").forEach((b) => {
      const on = b.dataset.u === state.bonusU;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", String(on));
      if (b.dataset.u === "abs") b.textContent = T.cur[state.cur];
    });
    el("amountLabelText").textContent = state.mode === "n2g" ? T.amountNet : T.amountGross;
    el("bonusBlock").hidden = state.mode === "n2g";
    el("fxWrap").hidden = state.cur === "UAH";
    if (state.cur !== "UAH") el("fxLabel").textContent = (IS_EN ? "UAH per 1 " : "Курс: грн за 1 ") + T.cur[state.cur];
    const flag = { UAH: "ua", USD: "us", EUR: "eu" }[state.cur];
    el("cur_flag").src = "/assets/flags/" + flag + ".png";
    el("cur_code").textContent = state.cur;
    document.querySelectorAll("#cur_list li").forEach((li) => li.setAttribute("aria-selected", String(li.dataset.code === state.cur)));
  }

  // ===== кнопки =====
  const IDS = ["amount", "bonus", "one", "oneMonth", "ded", "pit", "vz", "esv", "minw", "maxb", "fx", "start"];

  function setDefaults() {
    el("pit").value = DEFAULTS.pit;
    el("vz").value = DEFAULTS.vz;
    el("esv").value = DEFAULTS.esv;
    el("minw").value = DEFAULTS.minw;
    el("maxb").value = DEFAULTS.maxb;
    groupInput(el("minw"));
  }

  function resetAll() {
    IDS.forEach((id) => (el(id).value = ""));
    setDefaults();
    Object.assign(state, { mode: "g2n", period: "month", cur: "UAH", bonusU: "pct" });
    ["moreDetails", "legalDetails"].forEach((id) => (el(id).open = false));
    applyState();
    render({ ok: false, none: true });
  }

  function fillExample() {
    setDefaults();
    const v = { amount: "50000", bonus: "", one: "25000", oneMonth: "12", ded: "", fx: "", start: "" };
    Object.keys(v).forEach((id) => (el(id).value = v[id]));
    Object.assign(state, { mode: "g2n", period: "month", cur: "UAH", bonusU: "pct" });
    el("moreDetails").open = true;
    applyState();
    groupAll();
    calc();
    toast(T.example);
  }

  function share() {
    const p = new URLSearchParams();
    IDS.forEach((id) => {
      const v = plain((el(id).value || "").trim());
      if (v) p.set(id, v);
    });
    p.set("mode", state.mode);
    p.set("period", state.period);
    p.set("cur", state.cur);
    p.set("bonusU", state.bonusU);
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
    if (q.get("mode") === "n2g") state.mode = "n2g";
    if (q.get("period") === "year") state.period = "year";
    if (["USD", "EUR"].includes(q.get("cur"))) state.cur = q.get("cur");
    if (q.get("bonusU") === "abs") state.bonusU = "abs";
    if (["bonus", "one", "ded"].some((id) => !blank(id))) el("moreDetails").open = true;
    if (["pit", "vz", "esv", "minw", "maxb", "start", "fx"].some((id) => q.has(id))) el("legalDetails").open = true;
    return any || ["mode", "period", "cur"].some((k) => q.has(k));
  }

  window.addEventListener("DOMContentLoaded", () => {
    setDefaults();
    IDS.forEach((id) => {
      el(id).addEventListener("input", () => {
        if (MONEY_IDS.includes(id)) groupInput(el(id));
        calc();
      });
      el(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") calc();
      });
    });
    document.querySelectorAll("[data-mode]").forEach((b) =>
      b.addEventListener("click", () => {
        state.mode = b.dataset.mode;
        applyState();
        calc();
      })
    );
    document.querySelectorAll("[data-period]").forEach((b) =>
      b.addEventListener("click", () => {
        state.period = b.dataset.period;
        applyState();
        calc();
      })
    );
    document.querySelectorAll("[data-fu]").forEach((b) =>
      b.addEventListener("click", () => {
        state.bonusU = b.dataset.u;
        applyState();
        calc();
      })
    );
    el("copyTbl").addEventListener("click", copyTable);
    el("csvBtn").addEventListener("click", downloadCsv);

    // валюта: випадний список із прапорцем
    const curBtn = el("cur_btn");
    const curList = el("cur_list");
    const closeCur = () => {
      curList.hidden = true;
      curBtn.setAttribute("aria-expanded", "false");
    };
    curBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = curList.hidden;
      curList.hidden = !open;
      curBtn.setAttribute("aria-expanded", String(open));
    });
    curList.addEventListener("click", (e) => {
      const li = e.target.closest("li[data-code]");
      if (!li) return;
      closeCur();
      state.cur = li.dataset.code;
      applyState();
      calc();
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#cur_dd")) closeCur();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeCur();
    });

    el("calcBtn").addEventListener("click", () => {
      const r = compute();
      render(r);
      if (!r.ok && r.msg) toast(r.msg);
    });
    el("exampleBtn").addEventListener("click", fillExample);
    el("resetBtn").addEventListener("click", () => {
      resetAll();
      toast(T.reset);
    });
    el("shareBtn").addEventListener("click", share);

    const used = applyFromUrl();
    groupAll();
    applyState();
    if (used) calc();
    else render({ ok: false, none: true });
  });
})();
