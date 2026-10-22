/* deposit-calculator.js — депозитний калькулятор із графіком і діаграмою росту (UK/EN)
   Відсотки нараховуються щомісяця: ставка/12 або (режим «за днями») ставка/365 × фактична кількість днів місяця.
   Податок (за замовчуванням 23% = ПДФО 18% + військовий збір 5%) утримується банком із відсотків щомісяця;
   відсотки й податок округлюються до копійок. Поповнення додається на початку місяця, починаючи з другого.
   Режими: «капіталізація» — нетто-відсотки додаються до балансу щомісяця; «виплата щомісяця» — нетто-відсотки
   виплачуються на картку, баланс не росте; «у кінці строку» — прості відсотки, виплата одним платежем у кінці.
   Ефективна річна дохідність — IRR грошового потоку (внески, остаточна сума) у річному обчисленні. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const LOCALE = IS_EN ? "en-US" : "uk-UA";

  const T = IS_EN
    ? {
        enter: "Enter the deposit amount, the rate and the term — the result will appear here.",
        missing: "To calculate, fill in: {list}.",
        lblAmount: "deposit amount", lblRate: "annual rate", lblTerm: "term",
        errAmount: "Deposit amount must be between 100 and 10 000 000 000.",
        errRate: "Annual rate must be between 0 and 100%.",
        errTerm: "Term must be a whole number of months from 1 to 120.",
        errNum: "Check the value in the field “{f}”.",
        errDate: "Enter a valid start date or leave the field empty.",
        lblTop: "Monthly top-up", lblTax: "Tax rate", lblTaxMissing: "tax rate", lblInfl: "Expected inflation",
        cur: { UAH: "UAH", USD: "USD", EUR: "EUR" },
        income: "Net income", incomeMini: "after tax, over {n} months",
        kFinal: "You will receive at the end", kFinalMini: "deposit, top-ups and net interest",
        kGross: "Interest (gross)", kTax: "Tax", kTaxMini: "{p}% of the interest",
        kInvested: "You put in", kInvestedMini: "deposit and top-ups",
        kEff: "Effective annual yield", kEffMini: "after tax; before tax {g}%",
        kReal: "Real yield after inflation", kRealMini: "at {i}% inflation per year",
        kPaid: "Interest paid out", kPaidMini: "monthly, to the card, after tax",
        modeCap: "interest is added to the deposit every month", modeMonthly: "net interest is paid out every month", modeEnd: "interest is paid at the end of the term",
        thMonth: "Month", thDate: "Date", thYear: "Year", thTop: "Top-up", thInt: "Interest", thTax: "Tax", thNet: "Net", thBal: "Balance", thTotal: "Total",
        tableCopied: "Table copied ✅", csvDone: "CSV downloaded ✅",
        chartTitle: "How the money grows", legInv: "Put in", legInt: "Interest (net)",
        modelNote: "Estimate: the bank sets the real accrual rules, rounding and rate. The tax rate is a parameter you should check: it is set by law and may change.",
        linkCopied: "Link copied ✅", copyFailed: "Could not copy 😕", reset: "Reset ✅", example: "Example filled in ✅"
      }
    : {
        enter: "Вкажіть суму депозиту, ставку й термін — результат зʼявиться тут.",
        missing: "Щоб порахувати, заповніть: {list}.",
        lblAmount: "суму депозиту", lblRate: "річну ставку", lblTerm: "термін",
        errAmount: "Сума депозиту має бути від 100 до 10 000 000 000.",
        errRate: "Річна ставка має бути від 0 до 100%.",
        errTerm: "Термін — ціле число місяців від 1 до 120.",
        errNum: "Перевірте значення в полі «{f}».",
        errDate: "Вкажіть коректну дату старту або залиште поле порожнім.",
        lblTop: "Щомісячне поповнення", lblTax: "Ставка податку", lblTaxMissing: "ставку податку", lblInfl: "Очікувана інфляція",
        cur: { UAH: "грн", USD: "USD", EUR: "EUR" },
        income: "Дохід нетто", incomeMini: "після податку за {n} міс",
        kFinal: "Ви отримаєте в кінці", kFinalMini: "депозит, поповнення й відсотки нетто",
        kGross: "Відсотки брутто", kTax: "Податок", kTaxMini: "{p}% від відсотків",
        kInvested: "Ви вкладете", kInvestedMini: "депозит і поповнення",
        kEff: "Ефективна річна дохідність", kEffMini: "після податку; до податку {g}%",
        kReal: "Реальна дохідність після інфляції", kRealMini: "при інфляції {i}% на рік",
        kPaid: "Виплачено відсотків", kPaidMini: "щомісяця на картку, після податку",
        modeCap: "відсотки щомісяця додаються до депозиту", modeMonthly: "відсотки нетто щомісяця виплачуються", modeEnd: "відсотки виплачуються в кінці строку",
        thMonth: "Місяць", thDate: "Дата", thYear: "Рік", thTop: "Поповнення", thInt: "Відсотки", thTax: "Податок", thNet: "Нетто", thBal: "Баланс", thTotal: "Разом",
        tableCopied: "Таблицю скопійовано ✅", csvDone: "CSV завантажено ✅",
        chartTitle: "Як зростають гроші", legInv: "Вкладено", legInt: "Відсотки (нетто)",
        modelNote: "Оцінка: реальні правила нарахування, округлення й ставку задає банк. Ставка податку — параметр, який варто перевірити: її визначає закон і вона може змінитися.",
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
  const state = { mode: "cap", basis: "month", tax: "std", cur: "UAH", view: "month" };
  const money = (n) => f0(n) + " " + T.cur[state.cur];
  const money2 = (n) => f2(n) + " " + T.cur[state.cur];
  const TAX_STD = 23;

  // групування тисяч під час введення: 1000000 → 1 000 000 (EN: 1,000,000); курсор лишається біля тієї самої цифри
  const GROUP_SEP = IS_EN ? "," : " ";
  const MONEY_IDS = ["amount", "top"];
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
  // у посиланні «Поділитись» суми без розділювачів груп
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

  // IRR місячного потоку: flows[0] — на початку (від'ємні вклади), останній елемент — кінець; шукаємо i, що NPV = 0
  function irrMonthly(flows) {
    const f = (i) => flows.reduce((s, c, k) => s + c / Math.pow(1 + i, k), 0);
    let lo = -0.5, hi = 1;
    if (f(lo) * f(hi) > 0) return 0;
    for (let k = 0; k < 200; k++) {
      const mid = (lo + hi) / 2;
      if (f(lo) * f(mid) <= 0) hi = mid;
      else lo = mid;
    }
    return (lo + hi) / 2;
  }

  // симуляція депозиту: повертає рядки графіка, підсумки та грошовий потік (для IRR)
  function simulate({ P, n, rate, top, mode, basis, start, taxPct }) {
    
    let bal = P, invested = P, grossTotal = 0, paidOut = 0, accrued = 0, balSum = 0;
    const rows = [];
    for (let m = 1; m <= n; m++) {
      const tp = m >= 2 ? top : 0;
      if (tp > 0) {
        bal = r2(bal + tp);
        invested = r2(invested + tp);
      }
      balSum += bal;
      let interest;
      if (basis === "days") {
        const days = Math.round((addMonths(start, m) - addMonths(start, m - 1)) / 86400000);
        interest = r2((bal * rate * days) / 36500);
      } else interest = r2((bal * rate) / 1200);
      let tax = 0, net = 0;
      if (mode === "end") accrued = r2(accrued + interest); // податок утримується одним платежем у кінці
      else {
        tax = r2((interest * taxPct) / 100);
        net = r2(interest - tax);
      }
      grossTotal = r2(grossTotal + interest);
      if (mode === "cap") bal = r2(bal + net);
      if (mode === "monthly") paidOut = r2(paidOut + net);
      rows.push({ m, date: addMonths(start, m), top: tp, interest, tax, net, balance: mode === "end" ? r2(bal + (accrued * (100 - taxPct)) / 100) : bal });
    }
    let taxTotal, netTotal;
    if (mode === "end") {
      taxTotal = r2((grossTotal * taxPct) / 100);
      netTotal = r2(grossTotal - taxTotal);
      const last = rows[rows.length - 1];
      last.tax = taxTotal;
      last.net = netTotal;
      last.balance = r2(bal + netTotal);
    } else {
      taxTotal = r2(rows.reduce((x, y) => x + y.tax, 0));
      netTotal = r2(rows.reduce((x, y) => x + y.net, 0));
    }
    const finalAmount = mode === "cap" ? bal : mode === "end" ? r2(bal + netTotal) : r2(invested + paidOut);
    // потік: −вклад на початку, −поповнення на початку місяця, +виплати щомісяця, +підсумок наприкінці
    const flows = new Array(n + 1).fill(0);
    flows[0] -= P;
    rows.forEach((x, i) => {
      if (x.top > 0) flows[i] -= x.top;
      if (mode === "monthly") flows[i + 1] += x.net;
    });
    flows[n] += mode === "monthly" ? invested : finalAmount;
    return { rows, invested, grossTotal, taxTotal, netTotal, paidOut, finalAmount, flows, balSum };
  }

  // ===== розрахунок =====
  function compute() {
    const miss = [];
    if (blank("amount")) miss.push(T.lblAmount);
    if (blank("rate")) miss.push(T.lblRate);
    if (blank("term")) miss.push(T.lblTerm);
    if (miss.length) {
      const any = ["amount", "rate", "term"].some((id) => !blank(id));
      return { ok: false, none: !any, msg: any ? fill(T.missing, { list: miss.join(", ") }) : "" };
    }
    const P = num(el("amount").value);
    if (!(P >= 100 && P <= 1e10)) return { ok: false, msg: T.errAmount };
    const rate = num(el("rate").value);
    if (!(rate >= 0 && rate <= 100)) return { ok: false, msg: T.errRate };
    const n = num(el("term").value);
    if (!(Number.isInteger(n) && n >= 1 && n <= 120)) return { ok: false, msg: T.errTerm };
    let start = new Date();
    start = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    let startGiven = false;
    if (!blank("start")) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(el("start").value.trim());
      const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
      if (!d || d.getFullYear() < 1990 || d.getFullYear() > 2100) return { ok: false, msg: T.errDate };
      start = d;
      startGiven = true;
    }
    const top = opt("top", T.lblTop, 0, 1e9);
    let taxPct = TAX_STD;
    if (state.tax === "none") taxPct = 0;
    else if (state.tax === "custom") {
      if (blank("taxRate")) return { ok: false, msg: fill(T.missing, { list: T.lblTaxMissing }) };
      const t = opt("taxRate", T.lblTax, 0, 100);
      if (t.err) return { ok: false, msg: t.err };
      taxPct = t.v;
    }
    const infl = opt("infl", T.lblInfl, -50, 200);
    for (const x of [top, infl]) if (x.err) return { ok: false, msg: x.err };

    const mode = state.mode;
    const sim = simulate({ P, n, rate, top: top.v, mode, basis: state.basis, start, taxPct });
    const sim0 = taxPct === 0 ? sim : simulate({ P, n, rate, top: top.v, mode, basis: state.basis, start, taxPct: 0 });
    // виплата щомісяця на картку без реінвестування: річна дохідність = нетто-відсотки на середній капітал; інакше IRR потоку
    const effOf = (x) => (mode === "monthly" ? (x.netTotal / x.balSum) * 1200 : (Math.pow(1 + irrMonthly(x.flows), 12) - 1) * 100);
    const effNet = effOf(sim);
    const effGross = effOf(sim0);
    const real = infl.given ? ((1 + effNet / 100) / (1 + infl.v / 100) - 1) * 100 : null;
    const { rows, invested, grossTotal, taxTotal, netTotal, paidOut, finalAmount } = sim;
    return {
      ok: true, mode, P, rate, n, rows, start, startGiven, taxPct, top: top.v, invested, grossTotal, taxTotal, netTotal, paidOut, finalAmount,
      effNet, effGross, real, infl: infl.given ? infl.v : null
    };
  }

  // ===== відображення =====
  const tile = (title, value, mini, cls = "") =>
    '<div class="dep__kpi ' + cls + '"><div class="dep__kpiT">' + title + '</div><div class="dep__kpiV">' + value + "</div>" + (mini ? '<div class="dep__kpiM">' + mini + "</div>" : "") + "</div>";

  // діаграма росту: стовпці «вкладено + відсотки нетто» з осями, сіткою й підписами; до 23 міс — по місяцях, далі — по роках
  function chart(r) {
    const n = r.n, rows = r.rows;
    const cumInv = [], cumInt = [];
    let inv = r.P, intr = 0, gross = 0;
    rows.forEach((x, i) => {
      inv = Math.round((inv + x.top) * 100) / 100;
      if (r.mode === "end") {
        gross += x.interest;
        intr = (gross * (100 - r.taxPct)) / 100;
      } else intr += x.net;
      cumInv[i] = inv;
      cumInt[i] = intr;
    });
    // точки діаграми: індекси рядків
    const idx = [];
    if (n < 24) for (let m = 1; m <= n; m++) idx.push(m - 1);
    else {
      for (let m = 12; m <= n; m += 12) idx.push(m - 1);
      if (n % 12 !== 0) idx.push(n - 1);
    }
    const byMonth = n < 24;
    const maxV = Math.max(...idx.map((i) => cumInv[i] + cumInt[i]));
    const W = 480, H = 270, L = 56, Rr = 14, Tp = 36, B = 34;
    const raw = maxV / 5, p = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((q) => q * p).find((q) => maxV / q <= 5.5);
    const top = Math.ceil(maxV / step) * step;
    const py = (v) => Tp + (1 - v / top) * (H - Tp - B);
    const compact = (v) => (v >= 1e6 ? nf(v / 1e6, v % 1e6 ? 1 : 0) + "M" : v >= 1000 ? f0(v / 1000) + "k" : String(Math.round(v)));
    let svg = '<svg class="dep__chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + T.chartTitle + ": " + T.legInv + " " + f0(cumInv[n - 1]) + ", " + T.legInt + " " + f0(cumInt[n - 1]) + '">';
    for (let v = 0; v <= top + 1e-6; v += step) {
      svg += '<line x1="' + L + '" y1="' + py(v).toFixed(1) + '" x2="' + (W - Rr) + '" y2="' + py(v).toFixed(1) + '" stroke="' + (v === 0 ? "#c9d3e6" : "#e6ebf5") + '"/>';
      svg += '<text x="' + (L - 8) + '" y="' + (py(v) + 4).toFixed(1) + '" font-size="11" fill="#6b7280" text-anchor="end">' + (v === 0 ? "0" : compact(v)) + "</text>";
    }
    // легенда зверху
    svg += '<rect x="' + L + '" y="9" width="10" height="10" rx="2" fill="#283b69"/><text x="' + (L + 15) + '" y="18" font-size="11" fill="#5b6b8c">' + T.legInv + "</text>";
    const lx = L + 28 + T.legInv.length * 5.9;
    svg += '<rect x="' + lx + '" y="9" width="10" height="10" rx="2" fill="#0f8b8d"/><text x="' + (lx + 15) + '" y="18" font-size="11" fill="#5b6b8c">' + T.legInt + "</text>";
    const slot = (W - L - Rr) / idx.length;
    const bw = Math.min(70, slot * 0.66);
    const wide = bw >= 46, many = idx.length > 8;
    idx.forEach((i, k) => {
      const cx = L + slot * k + slot / 2;
      const vI = cumInv[i], vT = cumInt[i];
      const y0 = py(0), yI = py(vI), yT = py(vI + vT);
      svg += '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + yI.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (y0 - yI).toFixed(1) + '" fill="#283b69"/>';
      if (vT > 0.005) svg += '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + yT.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0, yI - yT).toFixed(1) + '" fill="#0f8b8d"/>';
      if (wide && !many) {
        if (y0 - yI > 18) svg += '<text x="' + cx.toFixed(1) + '" y="' + ((y0 + yI) / 2 + 4).toFixed(1) + '" font-size="12" font-weight="700" fill="#fff" text-anchor="middle">' + (vI >= 1000 ? f0(vI / 1000) + (IS_EN ? "k" : " тис.") : f0(vI)) + "</text>";
        if (yI - yT > 18) svg += '<text x="' + cx.toFixed(1) + '" y="' + ((yI + yT) / 2 + 4).toFixed(1) + '" font-size="11" font-weight="700" fill="#fff" text-anchor="middle">+' + (vT >= 1000 ? f0(vT / 1000) + (IS_EN ? "k" : " тис.") : f0(vT)) + "</text>";
      }
      const showTop = !many || k === idx.length - 1 || k % 2 === 0;
      if (showTop) svg += '<text x="' + cx.toFixed(1) + '" y="' + (yT - 7).toFixed(1) + '" font-size="' + (many ? 11 : 12) + '" font-weight="700" fill="#283b69" text-anchor="middle">' + (many ? compact(vI + vT) : f0(vI + vT)) + "</text>";
      const m = i + 1;
      const showX = idx.length <= 12 || k % 2 === 0 || k === idx.length - 1;
      if (showX) svg += '<text x="' + cx.toFixed(1) + '" y="' + (H - B + 18) + '" font-size="11" fill="#6b7280" text-anchor="middle">' + (byMonth ? m : m % 12 === 0 ? m / 12 + (IS_EN ? " yr" : " р.") : m + (IS_EN ? " mo" : " міс")) + "</text>";
    });
    svg += '<text x="' + (W - Rr) + '" y="' + (H - 4) + '" font-size="10" fill="#6b7280" text-anchor="end">' + (byMonth ? (IS_EN ? "months" : "місяці") : (IS_EN ? "end of year" : "кінець року")) + "</text></svg>";
    return svg;
  }

  function scheduleHtml(r) {
    const month = state.view === "month", hasDate = month;
    const hasTop = r.top > 0;
    const head = () =>
      "<thead><tr><th>" + (month ? T.thMonth : T.thYear) + "</th>" + (hasDate ? "<th>" + T.thDate + "</th>" : "") + (hasTop ? "<th>" + T.thTop + "</th>" : "") + "<th>" + T.thInt + "</th><th>" + T.thTax + "</th><th>" + T.thNet + "</th><th>" + T.thBal + "</th></tr></thead>";
    const cells = (get, bal) => (hasTop ? "<td>" + f2(get("top")) + "</td>" : "") + "<td>" + f2(get("interest")) + "</td><td>" + f2(get("tax")) + "</td><td>" + f2(get("net")) + "</td><td>" + bal + "</td>";
    let rows;
    if (month) {
      rows = r.rows.map((x) => "<tr><td>" + x.m + '</td><td data-iso="' + iso(x.date) + '">' + x.date.toLocaleDateString(LOCALE) + "</td>" + cells((k) => x[k], f2(x.balance)) + "</tr>").join("");
    } else {
      const years = [];
      for (let i = 0; i < r.rows.length; i += 12) years.push(r.rows.slice(i, i + 12));
      rows = years.map((part, i) => "<tr><td>" + (i + 1) + "</td>" + cells((k) => part.reduce((a, x) => a + x[k], 0), f2(part[part.length - 1].balance)) + "</tr>").join("");
    }
    const tot = (k) => r.rows.reduce((a, x) => a + x[k], 0);
    const totalRow = '<tr class="dep__total"><td>' + T.thTotal + "</td>" + (hasDate ? "<td>—</td>" : "") + cells(tot, "—") + "</tr>";
    return '<table class="dep__tbl dep__tbl--sch" id="scheduleTable">' + head() + "<tbody>" + rows + totalRow + "</tbody></table>";
  }

  let last = null;

  function render(r) {
    const box = el("result");
    const sch = el("schedule");
    if (!r.ok) {
      last = null;
      box.innerHTML = r.none || !r.msg ? T.enter : '<div class="dep__hintbox">' + r.msg + "</div>";
      sch.hidden = true;
      return;
    }
    last = r;
    const modeText = r.mode === "cap" ? T.modeCap : r.mode === "monthly" ? T.modeMonthly : T.modeEnd;
    const tiles =
      tile(T.income, money2(r.netTotal), fill(T.incomeMini, { n: r.n }) + " · " + modeText, "dep__kpi--main dep__kpi--wide") +
      tile(T.kFinal, money2(r.finalAmount), T.kFinalMini, "dep__kpi--wide") +
      tile(T.kGross, money(r.grossTotal), "") +
      tile(T.kTax, money(r.taxTotal), fill(T.kTaxMini, { p: nf(r.taxPct, 1) })) +
      tile(T.kInvested, money(r.invested), T.kInvestedMini) +
      tile(T.kEff, nf(r.effNet, 2) + "%", fill(T.kEffMini, { g: nf(r.effGross, 2) })) +
      (r.real != null ? tile(T.kReal, nf(r.real, 2) + "%", fill(T.kRealMini, { i: nf(r.infl, 1) }), "dep__kpi--wide") : "") +
      (r.mode === "monthly" ? tile(T.kPaid, money(r.paidOut), T.kPaidMini) : "");
    box.innerHTML = '<div class="dep__kpis">' + tiles + "</div>" + '<div class="dep__sub">' + T.chartTitle + "</div>" + chart(r) + '<div class="dep__note">' + T.modelNote + "</div>";
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
    a.download = "deposit-schedule.csv";
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
    document.querySelectorAll("[data-basis]").forEach((b) => b.classList.toggle("is-on", b.dataset.basis === state.basis));
    document.querySelectorAll("[data-tax]").forEach((b) => b.classList.toggle("is-on", b.dataset.tax === state.tax));
    el("taxRateWrap").hidden = state.tax !== "custom";
    el("viewMonth").classList.toggle("is-on", state.view === "month");
    el("viewYear").classList.toggle("is-on", state.view === "year");
    const flag = { UAH: "ua", USD: "us", EUR: "eu" }[state.cur];
    el("cur_flag").src = "/assets/flags/" + flag + ".png";
    el("cur_code").textContent = state.cur;
    document.querySelectorAll("#cur_list li").forEach((li) => li.setAttribute("aria-selected", String(li.dataset.code === state.cur)));
  }

  // ===== кнопки =====
  const IDS = ["amount", "rate", "term", "top", "start", "taxRate", "infl"];

  function syncTermChips() {
    const v = (el("term").value || "").trim();
    document.querySelectorAll("[data-term]").forEach((b) => b.classList.toggle("is-on", b.dataset.term === v));
  }

  function resetAll() {
    IDS.forEach((id) => (el(id).value = ""));
    Object.assign(state, { mode: "cap", basis: "month", tax: "std", cur: "UAH", view: "month" });
    el("moreDetails").open = false;
    applyState();
    syncTermChips();
    render({ ok: false, none: true });
  }

  function fillExample() {
    const v = { amount: "100000", rate: "16", term: "36", top: "2000", start: "", taxRate: "", infl: "" };
    IDS.forEach((id) => (el(id).value = v[id]));
    Object.assign(state, { mode: "cap", basis: "month", tax: "std", cur: "UAH", view: "month" });
    applyState();
    syncTermChips();
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
    p.set("basis", state.basis);
    p.set("tax", state.tax);
    p.set("cur", state.cur);
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
    if (["monthly", "end"].includes(q.get("mode"))) state.mode = q.get("mode");
    if (q.get("basis") === "days") state.basis = "days";
    if (["none", "custom"].includes(q.get("tax"))) state.tax = q.get("tax");
    if (["USD", "EUR"].includes(q.get("cur"))) state.cur = q.get("cur");
    if (["top", "start", "taxRate", "infl"].some((id) => !blank(id)) || state.basis === "days" || state.tax !== "std") el("moreDetails").open = true;
    return any || ["mode", "basis", "tax", "cur"].some((k) => q.has(k));
  }

  window.addEventListener("DOMContentLoaded", () => {
    IDS.forEach((id) => {
      el(id).addEventListener("input", () => {
        if (MONEY_IDS.includes(id)) groupInput(el(id));
        if (id === "term") syncTermChips();
        calc();
      });
      el(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") calc();
      });
    });
    document.querySelectorAll("[data-term]").forEach((b) =>
      b.addEventListener("click", () => {
        el("term").value = b.dataset.term;
        syncTermChips();
        calc();
      })
    );
    document.querySelectorAll("[data-mode]").forEach((b) =>
      b.addEventListener("click", () => {
        state.mode = b.dataset.mode;
        applyState();
        calc();
      })
    );
    document.querySelectorAll("[data-basis]").forEach((b) =>
      b.addEventListener("click", () => {
        state.basis = b.dataset.basis;
        applyState();
        calc();
      })
    );
    document.querySelectorAll("[data-tax]").forEach((b) =>
      b.addEventListener("click", () => {
        state.tax = b.dataset.tax;
        applyState();
        calc();
      })
    );
    el("viewMonth").addEventListener("click", () => {
      state.view = "month";
      applyState();
      if (last) el("schedBody").innerHTML = scheduleHtml(last);
    });
    el("viewYear").addEventListener("click", () => {
      state.view = "year";
      applyState();
      if (last) el("schedBody").innerHTML = scheduleHtml(last);
    });
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
    syncTermChips();
    if (used) calc();
    else render({ ok: false, none: true });
  });
})();
