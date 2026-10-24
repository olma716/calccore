/* roi-calculator.js — калькулятор ROI інвестицій: ROI за фактом, потрібна дохідність, порівняння (UK/EN)
   ROI за фактом: прибуток до податку = вартість продажу × (1 − комісія) + доходи − вкладено − витрати;
   податок лише з додатного прибутку; чистий ROI = чистий прибуток ÷ (вкладено + витрати).
   Річна дохідність (CAGR) = (1 + ROI)^(12/місяців) − 1; проміжні доходи вважаються отриманими в кінці (без IRR за датами).
   Реальна дохідність = (1 + річна)/(1 + інфляція) − 1.
   Потрібна дохідність: внесок на початку місяця, нарахування щомісяця за ставкою m = r/12; m шукаємо бісекцією, ефективна
   річна = (1 + m)^12 − 1. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const LOCALE = IS_EN ? "en-US" : "uk-UA";

  const T = IS_EN
    ? {
        enter: "Fill in the fields — the result will appear here.",
        missing: "To calculate, fill in: {list}.",
        lblInvest: "invested amount", lblValue: "current or final value", lblPeriod: "period", lblIncome: "income", lblCosts: "costs", lblFee: "fee", lblTax: "tax", lblInfl: "inflation",
        lblNi: "initial amount", lblNc: "monthly contribution", lblTarget: "target amount", lblRoi: "target ROI", lblRow: "investment {k}: invested, final value and period",
        errInvest: "Invested amount must be above 0 and up to 1,000,000,000,000.",
        errValue: "Value must be from 0 to 10,000,000,000,000.",
        errPeriod: "Period is from 1 month to 100 years (months 0–11, whole numbers).",
        errNum: "{f}: enter a valid number.",
        errPct: "{f} must be from {a}% to {b}%.",
        errSum: "Enter the initial amount or the monthly contribution.",
        errTarget: "The target must be above 0.",
        errRoiMin: "Target ROI must be above −100%.",
        errUnreach: "Such a return is outside the supported range — check the target and the period.",
        errRowNum: "Investment {k}: invested amount and final value must be numbers (value from 0), the period from 0.1 to 100 years.",
        errRows: "Fill in at least two investments (A and B).",
        sMain: "Net profit", sMainMini: "after costs and tax",
        sRoi: "ROI before costs and tax", sRoiMini: "(value + income − invested) ÷ invested",
        sNet: "Net ROI", sNetMini: "net profit ÷ (invested + costs)",
        sCagr: "Annual return (CAGR)", sCagrMini: "net, over {t}",
        sReal: "Real annual return", sRealMini: "after inflation {i}% per year",
        sMult: "Multiplier", sMultMini: "of all outlays",
        sBe: "Break-even sale price", sBeMini: "profit before tax is zero",
        sPeriod: "gross: {g}%", wfSale: "Sale", wfIncome: "Income", wfInvested: "Invested", wfCosts: "Costs", wfTax: "Tax", wfProfit: "Profit",
        nMain: "Required annual return", nMainMini: "effective, compounded monthly",
        nNom: "Nominal rate", nNomMini: "per year, monthly compounding",
        nRoi: "ROI of the goal", nRoiMini: "(goal − invested) ÷ invested",
        nInv: "Invested in total", nInvMini: "initial amount + contributions",
        nProfit: "Profit", nProfitMini: "goal − invested",
        nDouble: "Doubling time", nDoubleMini: "at this return",
        chartRoi: "From sale to net profit", chartNeed: "Growth to the goal by year", chartCmp: "ROI and annual return",
        legIn: "Invested", legEarn: "Earned", legRoi: "ROI", legCagr: "Annual return",
        cMain: "Best annual return", cMainMini: "investment {k}",
        cTile: "Investment {k}", cTileMini: "ROI {r}% · profit {p}", cBest: "best",
        thItem: "Item", thAmount: "Amount",
        rowInvest: "Invested", rowCosts: "Costs", rowValue: "Value at sale", rowFee: "Sale fee", rowIncome: "Income", rowPBT: "Profit before tax", rowTax: "Tax", rowNet: "Net profit", rowRoi: "ROI before costs and tax, %", rowNetRoi: "Net ROI, %", rowCagr: "Annual return, %",
        thYear: "Year", thTInvest: "Invested in total", thEarn: "Earned", thBal: "Balance",
        thName: "Investment", thInvested: "Invested", thFinal: "Final value", thYears: "Years", thProfit: "Profit", thR: "ROI, %", thC: "Annual return, %", thMult: "Multiplier",
        modelRoi: "A simple model: income is counted at the end of the period, so the annual return is an approximation (for exact timing of payments use IRR). Taxes and fees are as you set them.",
        modelNeed: "The return is solved for monthly compounding with contributions at the start of each month; it is the average return you need, not a guarantee.",
        modelCmp: "ROI does not account for time or risk, so compare investments by the annual return and consider the risk separately.",
        yr: "{n} yr", mo: "{n} mo",
        cur: { UAH: "UAH", USD: "USD", EUR: "EUR" },
        linkCopied: "Link copied ✅", copyFailed: "Could not copy 😕", reset: "Reset ✅", example: "Example filled in ✅", tableCopied: "Table copied ✅", csvDone: "CSV downloaded ✅"
      }
    : {
        enter: "Заповніть поля — результат зʼявиться тут.",
        missing: "Щоб розрахувати, заповніть: {list}.",
        lblInvest: "вкладено", lblValue: "поточну або кінцеву вартість", lblPeriod: "період", lblIncome: "доходи", lblCosts: "витрати", lblFee: "комісія", lblTax: "податок", lblInfl: "інфляція",
        lblNi: "початкова сума", lblNc: "щомісячний внесок", lblTarget: "цільова сума", lblRoi: "цільовий ROI", lblRow: "інвестиція {k}: вкладено, кінцеву вартість і період",
        errInvest: "Вкладена сума — більше 0 і до 1 000 000 000 000.",
        errValue: "Вартість — від 0 до 10 000 000 000 000.",
        errPeriod: "Період — від 1 місяця до 100 років (місяці 0–11, цілі числа).",
        errNum: "{f}: вкажіть коректне число.",
        errPct: "{f} має бути від {a}% до {b}%.",
        errSum: "Вкажіть початкову суму або щомісячний внесок.",
        errTarget: "Ціль має бути більше 0.",
        errRoiMin: "Цільовий ROI має бути більше −100%.",
        errUnreach: "Така дохідність поза підтримуваним діапазоном — перевірте ціль і період.",
        errRowNum: "Інвестиція {k}: вкладена сума й кінцева вартість — числа (вартість від 0), термін від 0,1 до 100 років.",
        errRows: "Заповніть щонайменше дві інвестиції (A і B).",
        sMain: "Чистий прибуток", sMainMini: "після витрат і податку",
        sRoi: "ROI до витрат і податку", sRoiMini: "(вартість + доходи − вкладено) ÷ вкладено",
        sNet: "Чистий ROI", sNetMini: "чистий прибуток ÷ (вкладено + витрати)",
        sCagr: "Річна дохідність (CAGR)", sCagrMini: "чиста, за {t}",
        sReal: "Реальна річна дохідність", sRealMini: "після інфляції {i}% на рік",
        sMult: "Множник", sMultMini: "усіх витрат",
        sBe: "Ціна продажу в нуль", sBeMini: "прибуток до податку дорівнює нулю",
        sPeriod: "валова: {g}%", wfSale: "Продаж", wfIncome: "Доходи", wfInvested: "Вкладено", wfCosts: "Витрати", wfTax: "Податок", wfProfit: "Прибуток",
        nMain: "Потрібна річна дохідність", nMainMini: "ефективна, нарахування щомісяця",
        nNom: "Номінальна ставка", nNomMini: "на рік, нарахування щомісяця",
        nRoi: "ROI цілі", nRoiMini: "(ціль − вкладено) ÷ вкладено",
        nInv: "Вкладено разом", nInvMini: "початкова сума + внески",
        nProfit: "Прибуток", nProfitMini: "ціль − вкладено",
        nDouble: "Час подвоєння", nDoubleMini: "за такої дохідності",
        chartRoi: "Від продажу до чистого прибутку", chartNeed: "Ріст до цілі по роках", chartCmp: "ROI і річна дохідність",
        legIn: "Вкладено", legEarn: "Заробили", legRoi: "ROI", legCagr: "Річна дохідність",
        cMain: "Найкраща річна дохідність", cMainMini: "інвестиція {k}",
        cTile: "Інвестиція {k}", cTileMini: "ROI {r}% · прибуток {p}", cBest: "краща",
        thItem: "Показник", thAmount: "Сума",
        rowInvest: "Вкладено", rowCosts: "Витрати", rowValue: "Вартість при продажу", rowFee: "Комісія при продажу", rowIncome: "Доходи", rowPBT: "Прибуток до податку", rowTax: "Податок", rowNet: "Чистий прибуток", rowRoi: "ROI до витрат і податку, %", rowNetRoi: "Чистий ROI, %", rowCagr: "Річна дохідність, %",
        thYear: "Рік", thTInvest: "Вкладено всього", thEarn: "Заробили", thBal: "Баланс",
        thName: "Інвестиція", thInvested: "Вкладено", thFinal: "Кінцева вартість", thYears: "Років", thProfit: "Прибуток", thR: "ROI, %", thC: "Річна дохідність, %", thMult: "Множник",
        modelRoi: "Проста модель: доходи рахуються наприкінці періоду, тому річна дохідність наближена (для точних дат платежів потрібен IRR). Податки й комісії — як ви їх задали.",
        modelNeed: "Дохідність підбирається для щомісячного нарахування з внесками на початку місяця; це середня дохідність, яка потрібна, а не гарантія.",
        modelCmp: "ROI не враховує час і ризик, тому порівнюйте інвестиції за річною дохідністю, а ризик оцінюйте окремо.",
        yr: "{n} р.", mo: "{n} міс.",
        cur: { UAH: "грн", USD: "USD", EUR: "EUR" },
        linkCopied: "Посилання скопійовано ✅", copyFailed: "Не вдалось скопіювати 😕", reset: "Скинуто ✅", example: "Підставлено приклад ✅", tableCopied: "Таблицю скопійовано ✅", csvDone: "CSV завантажено ✅"
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
  const nf = (n, d) => n.toLocaleString(LOCALE, { minimumFractionDigits: d, maximumFractionDigits: d }).replace("-", "−");
  const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
  const f0 = (n) => nf(n, 0);
  const f2 = (n) => nf(n, 2);
  const r2 = (x) => Math.round(x * 100) / 100;
  const state = { mode: "roi", cur: "UAH", tgt: "amount" };
  const money = (n) => f0(n) + " " + T.cur[state.cur];
  const money2 = (n) => f2(n) + " " + T.cur[state.cur];
  const mAuto = (n) => (Math.abs(n) >= 1e5 ? money(n) : money2(n));
  const termText = (m) => {
    const y = Math.floor(m / 12), mo = m % 12;
    return [y ? fill(T.yr, { n: y }) : "", mo ? fill(T.mo, { n: mo }) : ""].filter(Boolean).join(" ");
  };
  const signed = (n, d) => (n > 0 ? "+" : n < 0 ? "−" : "") + nf(Math.abs(n), d);

  // групування тисяч під час введення: 1000000 → 1 000 000 (EN: 1,000,000); курсор лишається біля тієї самої цифри
  const GROUP_SEP = IS_EN ? "," : " ";
  const MONEY_IDS = ["invest", "value", "income", "costs", "ni", "nc", "ng", "ciA", "cfA", "ciB", "cfB", "ciC", "cfC"];
  function groupInput(inp) {
    const v = inp.value;
    if (!/^[\d\s .,-]*$/.test(v)) return;
    const pos = inp.selectionStart == null ? v.length : inp.selectionStart;
    const digitsBefore = (v.slice(0, pos).match(/\d/g) || []).length;
    let s = v.replace(/[\s ]/g, "");
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
  const plain = (v) => (IS_EN ? v.replace(/,/g, "") : v.replace(/[\s ]/g, "").replace(",", "."));

  function toast(msg) {
    const n = el("toast");
    if (!n) return;
    n.textContent = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (n.textContent = ""), 2400);
  }

  // необовʼязкове число з межами; порожнє — значення за замовчуванням
  function opt(id, label, min, max, def) {
    if (blank(id)) return { v: def, given: false };
    const v = num(el(id).value);
    if (!(v >= min && v <= max)) return { err: cap(fill(T.errNum, { f: label })) };
    return { v, given: true };
  }
  const optPct = (id, label, min, max) => {
    const x = opt(id, label, min, max, 0);
    if (x.err) return { err: cap(fill(T.errPct, { f: label, a: nf(min, 0), b: nf(max, 0) })) };
    return x;
  };

  // період з полів «роки» та «місяці»
  function readPeriod() {
    if (blank("years") && blank("months")) return { miss: true };
    const y = blank("years") ? 0 : num(el("years").value), mo = blank("months") ? 0 : num(el("months").value);
    if (!(Number.isInteger(y) && y >= 0 && y <= 100) || !(Number.isInteger(mo) && mo >= 0 && mo <= 11)) return { err: T.errPeriod };
    const n = y * 12 + mo;
    if (!(n >= 1 && n <= 1200)) return { err: T.errPeriod };
    return { n };
  }

  // ===== режим 1: ROI за фактом =====
  function computeRoi() {
    const miss = [];
    if (blank("invest")) miss.push(T.lblInvest);
    if (blank("value")) miss.push(T.lblValue);
    const per = readPeriod();
    if (per.miss) miss.push(T.lblPeriod);
    if (miss.length) {
      const any = ["invest", "value", "years", "months", "income", "costs", "fee", "tax", "infl"].some((id) => !blank(id));
      return { ok: false, none: !any, msg: any ? fill(T.missing, { list: miss.join(", ") }) : "" };
    }
    const invest = num(el("invest").value);
    if (!(invest > 0 && invest <= 1e12)) return { ok: false, msg: T.errInvest };
    const value = num(el("value").value);
    if (!(value >= 0 && value <= 1e13)) return { ok: false, msg: T.errValue };
    if (per.err) return { ok: false, msg: per.err };
    const income = opt("income", T.lblIncome, 0, 1e13, 0), costs = opt("costs", T.lblCosts, 0, 1e13, 0);
    const fee = optPct("fee", T.lblFee, 0, 100), tax = optPct("tax", T.lblTax, 0, 100), infl = optPct("infl", T.lblInfl, -50, 100);
    for (const x of [income, costs, fee, tax, infl]) if (x.err) return { ok: false, msg: x.err };
    const n = per.n;
    const feeAmt = (value * fee.v) / 100;
    const sell = value - feeAmt;
    const base = invest + costs.v;
    const pbt = sell + income.v - base;
    const taxAmt = pbt > 0 ? (pbt * tax.v) / 100 : 0;
    const net = pbt - taxAmt;
    const grossRoi = ((value + income.v - invest) / invest) * 100;
    const netRoi = (net / base) * 100;
    const ann = (ratio) => (ratio > 0 ? Math.pow(ratio, 12 / n) - 1 : -1) * 100;
    const cagrGross = ann((value + income.v) / invest);
    const cagrNet = ann(1 + net / base);
    const realAnn = ((1 + cagrNet / 100) / (1 + infl.v / 100) - 1) * 100;
    const realRoi = ((1 + netRoi / 100) / Math.pow(1 + infl.v / 100, n / 12) - 1) * 100;
    const fk = 1 - fee.v / 100;
    const breakEven = fk > 0 ? Math.max(0, (base - income.v) / fk) : NaN;
    return {
      ok: true, mode: "roi", n, invest, value, income: income.v, costs: costs.v, fee: fee.v, tax: tax.v, infl: infl.v, feeAmt, sell, base, pbt, taxAmt, net,
      grossRoi, netRoi, cagrGross, cagrNet, realAnn, realRoi, mult: 1 + net / base, breakEven
    };
  }

  // ===== режим 2: потрібна дохідність =====
  const fvM = (ni, nc, m, n) => {
    if (Math.abs(m) < 1e-12) return ni + nc * n;
    const g = Math.pow(1 + m, n);
    return ni * g + nc * (1 + m) * ((g - 1) / m);
  };
  function computeNeed() {
    const miss = [];
    if (blank("ni") && blank("nc")) miss.push(T.lblNi);
    const tgtId = state.tgt === "amount" ? "ng" : "nr";
    if (blank(tgtId)) miss.push(state.tgt === "amount" ? T.lblTarget : T.lblRoi);
    const per = readPeriod();
    if (per.miss) miss.push(T.lblPeriod);
    if (miss.length) {
      const any = ["ni", "nc", "ng", "nr", "years", "months"].some((id) => !blank(id));
      return { ok: false, none: !any, msg: any ? fill(T.missing, { list: miss.join(", ") }) : "" };
    }
    const ni = opt("ni", T.lblNi, 0, 1e12, 0), nc = opt("nc", T.lblNc, 0, 1e10, 0);
    for (const x of [ni, nc]) if (x.err) return { ok: false, msg: x.err };
    if (!(ni.v > 0 || nc.v > 0)) return { ok: false, msg: T.errSum };
    if (per.err) return { ok: false, msg: per.err };
    const n = per.n;
    const inv = ni.v + nc.v * n;
    let F;
    if (state.tgt === "amount") {
      F = num(el("ng").value);
      if (!(F > 0 && F <= 1e14)) return { ok: false, msg: Number.isNaN(F) ? fill(T.errNum, { f: T.lblTarget }) : T.errTarget };
    } else {
      const roi = num(el("nr").value);
      if (Number.isNaN(roi)) return { ok: false, msg: fill(T.errNum, { f: T.lblRoi }) };
      if (!(roi > -100)) return { ok: false, msg: T.errRoiMin };
      F = inv * (1 + roi / 100);
      if (!(F > 0 && F <= 1e14)) return { ok: false, msg: T.errTarget };
    }
    let m;
    if (nc.v === 0) m = Math.pow(F / ni.v, 1 / n) - 1;
    else {
      let lo = -0.5, hi = 0.5;
      if (!(fvM(ni.v, nc.v, lo, n) <= F && F <= fvM(ni.v, nc.v, hi, n))) return { ok: false, msg: T.errUnreach };
      for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        if (fvM(ni.v, nc.v, mid, n) < F) lo = mid;
        else hi = mid;
      }
      m = (lo + hi) / 2;
    }
    if (!(m > -0.5 && m < 0.5) || !Number.isFinite(m)) return { ok: false, msg: T.errUnreach };
    const eff = (Math.pow(1 + m, 12) - 1) * 100;
    const rows = [];
    let bal = ni.v, tc = ni.v;
    for (let k = 1; k <= n; k++) {
      bal += nc.v;
      tc += nc.v;
      bal *= 1 + m;
      if (k % 12 === 0 || k === n) rows.push({ y: k / 12, tc, bal });
    }
    return { ok: true, mode: "need", n, ni: ni.v, nc: nc.v, F, inv, m, eff, nom: m * 1200, roi: ((F - inv) / inv) * 100, profit: F - inv, dbl: eff > 0 ? Math.log(2) / Math.log(1 + eff / 100) : null, rows };
  }

  // ===== режим 3: порівняння =====
  const KEYS = ["A", "B", "C"];
  function computeCmp() {
    const items = [];
    for (const k of KEYS) {
      const ids = ["ci" + k, "cf" + k, "cy" + k];
      const filled = ids.filter((id) => !blank(id)).length;
      if (filled === 0) {
        if (k !== "C") items.push({ k, empty: true });
        continue;
      }
      if (filled < 3) return { ok: false, msg: fill(T.missing, { list: fill(T.lblRow, { k }) }) };
      const inv = num(el(ids[0]).value), fin = num(el(ids[1]).value), yrs = num(el(ids[2]).value);
      if (!(inv > 0 && inv <= 1e12 && fin >= 0 && fin <= 1e13 && yrs >= 0.1 && yrs <= 100)) return { ok: false, msg: fill(T.errRowNum, { k }) };
      const ratio = fin / inv;
      items.push({ k, inv, fin, yrs, profit: fin - inv, roi: (ratio - 1) * 100, cagr: (ratio > 0 ? Math.pow(ratio, 1 / yrs) - 1 : -1) * 100, mult: ratio });
    }
    const done = items.filter((x) => !x.empty);
    if (items.some((x) => x.empty && x.k !== "C") || done.length < 2) {
      const any = KEYS.some((k) => ["ci", "cf", "cy"].some((p) => !blank(p + k)));
      return { ok: false, none: !any, msg: any ? T.errRows : "" };
    }
    let best = done[0];
    for (const x of done) if (x.cagr > best.cagr) best = x;
    return { ok: true, mode: "cmp", items: done, best };
  }

  // ===== відображення =====
  const tile = (title, value, mini, cls = "") =>
    '<div class="roi__kpi ' + cls + '"><div class="roi__kpiT">' + title + '</div><div class="roi__kpiV' + (String(value).length > 12 ? " roi__kpiV--s" : "") + '">' + value + "</div>" + (mini ? '<div class="roi__kpiM">' + mini + "</div>" : "") + "</div>";

  const compact = (v) => (Math.abs(v) >= 1e6 ? nf(v / 1e6, Math.abs(v) % 1e6 ? 1 : 0) + "M" : Math.abs(v) >= 1000 ? f0(v / 1000) + "k" : String(Math.round(v)));
  const niceStep = (range, want = 5) => {
    const raw = range / want, p = Math.pow(10, Math.floor(Math.log10(raw || 1)));
    return [1, 2, 2.5, 5, 10].map((q) => q * p).find((q) => range / q <= want + 0.5) || p;
  };
  const GRN = "#0f8b8d", NAVY = "#283b69", RED = "#c8534f";

  // загальна сітка осі Y (допускає від'ємні значення); повертає {py, svg}
  function axis(lo0, hi0, W, H, L, Rr, Tp, B, fmt) {
    const lo = Math.min(0, lo0), hi = Math.max(0, hi0);
    const step = niceStep(hi - lo || 1);
    const top = Math.ceil(hi / step) * step, bot = Math.floor(lo / step) * step;
    const py = (v) => Tp + (1 - (v - bot) / (top - bot || 1)) * (H - Tp - B);
    let svg = "";
    for (let v = bot; v <= top + 1e-9; v += step) {
      const z = Math.abs(v) < 1e-9;
      svg += '<line x1="' + L + '" y1="' + py(v).toFixed(1) + '" x2="' + (W - Rr) + '" y2="' + py(v).toFixed(1) + '" stroke="' + (z ? "#9aa6c2" : "#e6ebf5") + '"/>';
      svg += '<text x="' + (L - 8) + '" y="' + (py(v) + 4).toFixed(1) + '" font-size="11" fill="#6b7280" text-anchor="end">' + (z ? "0" : fmt(v)) + "</text>";
    }
    return { py, svg };
  }

  // «водоспад»: від продажу до чистого прибутку
  function chartRoi(r) {
    const steps = [
      [T.wfSale, r.sell, "up"],
      [T.wfIncome, r.income, "up"],
      [T.wfInvested, -r.invest, "down"],
      [T.wfCosts, -r.costs, "down"],
      [T.wfTax, -r.taxAmt, "down"]
    ].filter((x) => Math.abs(x[1]) > 0);
    let run = 0;
    const bars = steps.map(([lab, v, t]) => {
      const from = run;
      run += v;
      return { lab, v, t, from, to: run };
    });
    bars.push({ lab: T.wfProfit, v: run, t: "total", from: 0, to: run });
    const all = bars.flatMap((b) => [b.from, b.to]);
    const W = 480, H = 270, L = 56, Rr = 14, Tp = 36, B = 34;
    const ax = axis(Math.min(...all), Math.max(...all), W, H, L, Rr, Tp, B, compact);
    let svg = '<svg class="roi__chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + T.chartRoi + '">' + ax.svg;
    svg += '<text x="' + L + '" y="18" font-size="11" fill="#5b6b8c">' + T.chartRoi + ", " + T.cur[state.cur] + "</text>";
    const slot = (W - L - Rr) / bars.length, bw = Math.min(46, slot * 0.64);
    bars.forEach((b, k) => {
      const cx = L + slot * k + slot / 2;
      const y1 = ax.py(Math.max(b.from, b.to)), y2 = ax.py(Math.min(b.from, b.to));
      const col = b.t === "total" ? (b.v >= 0 ? NAVY : RED) : b.t === "up" ? GRN : RED;
      svg += '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + y1.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(1.5, y2 - y1).toFixed(1) + '" fill="' + col + '"/>';
      const top = b.v >= 0 || b.t !== "total" ? y1 - 5 : y2 + 13;
      svg += '<text x="' + cx.toFixed(1) + '" y="' + (b.t === "down" ? y2 + 13 : top).toFixed(1) + '" font-size="10.5" font-weight="700" fill="' + col + '" text-anchor="middle">' + (b.t === "total" ? (b.v < 0 ? "−" : "") : b.v >= 0 ? "+" : "−") + compact(Math.abs(b.v)) + "</text>";
      svg += '<text x="' + cx.toFixed(1) + '" y="' + (H - B + 16) + '" font-size="10.5" fill="#6b7280" text-anchor="middle">' + b.lab + "</text>";
    });
    return svg + "</svg>";
  }

  // ріст до цілі: стовпці «вкладено / заробили» по роках
  function chartNeed(r) {
    const rows = r.rows;
    const maxV = Math.max(...rows.map((x) => Math.max(x.bal, x.tc)), 1);
    const W = 480, H = 270, L = 56, Rr = 14, Tp = 36, B = 34;
    const ax = axis(0, maxV, W, H, L, Rr, Tp, B, compact);
    let svg = '<svg class="roi__chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + T.chartNeed + '">' + ax.svg;
    svg += '<rect x="' + L + '" y="9" width="10" height="10" rx="2" fill="' + NAVY + '"/><text x="' + (L + 15) + '" y="18" font-size="11" fill="#5b6b8c">' + T.legIn + "</text>";
    const lx = L + 28 + T.legIn.length * 5.9;
    svg += '<rect x="' + lx + '" y="9" width="10" height="10" rx="2" fill="' + GRN + '"/><text x="' + (lx + 15) + '" y="18" font-size="11" fill="#5b6b8c">' + T.legEarn + "</text>";
    const n = rows.length, slot = (W - L - Rr) / n, bw = Math.min(40, slot * 0.72), every = Math.ceil(n / 12);
    rows.forEach((x, k) => {
      const cx = L + slot * k + slot / 2, y0 = ax.py(0), yc = ax.py(Math.min(x.tc, x.bal)), yb = ax.py(x.bal);
      svg += '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + yc.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0, y0 - yc).toFixed(1) + '" fill="' + NAVY + '"/>';
      svg += '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + yb.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0, yc - yb).toFixed(1) + '" fill="' + GRN + '"/>';
      if (k % every === 0 || k === n - 1) svg += '<text x="' + cx.toFixed(1) + '" y="' + (H - B + 16) + '" font-size="11" fill="#6b7280" text-anchor="middle">' + (Number.isInteger(x.y) ? x.y : nf(x.y, 1)) + "</text>";
    });
    return svg + "</svg>";
  }

  // порівняння: ROI та річна дохідність поруч для кожної інвестиції
  function chartCmp(r) {
    const vals = r.items.flatMap((x) => [x.roi, x.cagr]);
    const W = 480, H = 270, L = 56, Rr = 14, Tp = 36, B = 34;
    const ax = axis(Math.min(...vals), Math.max(...vals), W, H, L, Rr, Tp, B, (v) => nf(v, Math.abs(v) < 10 ? 1 : 0) + "%");
    let svg = '<svg class="roi__chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + T.chartCmp + '">' + ax.svg;
    svg += '<rect x="' + L + '" y="9" width="10" height="10" rx="2" fill="' + NAVY + '"/><text x="' + (L + 15) + '" y="18" font-size="11" fill="#5b6b8c">' + T.legRoi + "</text>";
    const lx = L + 28 + T.legRoi.length * 5.9;
    svg += '<rect x="' + lx + '" y="9" width="10" height="10" rx="2" fill="' + GRN + '"/><text x="' + (lx + 15) + '" y="18" font-size="11" fill="#5b6b8c">' + T.legCagr + "</text>";
    const slot = (W - L - Rr) / r.items.length, bw = Math.min(46, slot * 0.34);
    r.items.forEach((x, k) => {
      const cx = L + slot * k + slot / 2, y0 = ax.py(0);
      [[cx - bw, x.roi, NAVY], [cx, x.cagr, GRN]].forEach(([bx, v, col]) => {
        const y1 = ax.py(v);
        svg += '<rect x="' + bx.toFixed(1) + '" y="' + Math.min(y0, y1).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(1.5, Math.abs(y1 - y0)).toFixed(1) + '" fill="' + col + '"/>';
        svg += '<text x="' + (bx + bw / 2).toFixed(1) + '" y="' + (v >= 0 ? y1 - 5 : y1 + 13).toFixed(1) + '" font-size="10.5" font-weight="700" fill="' + col + '" text-anchor="middle">' + nf(v, 1) + "</text>";
      });
      svg += '<text x="' + cx.toFixed(1) + '" y="' + (H - B + 16) + '" font-size="12" font-weight="700" fill="#283b69" text-anchor="middle">' + x.k + "</text>";
    });
    return svg + "</svg>";
  }

  function tableRoi(r) {
    const rows = [
      [T.rowInvest, f2(r.invest)], [T.rowCosts, f2(r.costs)], [T.rowValue, f2(r.value)], [T.rowFee, f2(r.feeAmt)], [T.rowIncome, f2(r.income)],
      [T.rowPBT, f2(r.pbt)], [T.rowTax, f2(r.taxAmt)], [T.rowNet, f2(r.net)], [T.rowRoi, f2(r.grossRoi)], [T.rowNetRoi, f2(r.netRoi)], [T.rowCagr, f2(r.cagrNet)]
    ];
    const head = "<thead><tr><th>" + T.thItem + "</th><th>" + T.thAmount + "</th></tr></thead>";
    const body = rows.map(([a, b], i) => "<tr" + (i === 7 ? ' class="roi__total"' : "") + "><td>" + a + "</td><td>" + b + "</td></tr>").join("");
    return '<table class="roi__tbl" id="scheduleTable">' + head + "<tbody>" + body + "</tbody></table>";
  }
  function tableNeed(r) {
    const head = "<thead><tr><th>" + T.thYear + "</th><th>" + T.thTInvest + "</th><th>" + T.thEarn + "</th><th>" + T.thBal + "</th></tr></thead>";
    const body = r.rows.map((x) => "<tr><td>" + (Number.isInteger(x.y) ? x.y : nf(x.y, 2)) + "</td><td>" + f2(x.tc) + "</td><td>" + f2(x.bal - x.tc) + "</td><td>" + f2(x.bal) + "</td></tr>").join("");
    return '<table class="roi__tbl roi__tbl--sch" id="scheduleTable">' + head + "<tbody>" + body + "</tbody></table>";
  }
  function tableCmp(r) {
    const head = "<thead><tr><th>" + T.thName + "</th><th>" + T.thInvested + "</th><th>" + T.thFinal + "</th><th>" + T.thYears + "</th><th>" + T.thProfit + "</th><th>" + T.thR + "</th><th>" + T.thC + "</th><th>" + T.thMult + "</th></tr></thead>";
    const body = r.items
      .map((x) => "<tr" + (x === r.best ? ' class="roi__total"' : "") + "><td>" + x.k + "</td><td>" + f2(x.inv) + "</td><td>" + f2(x.fin) + "</td><td>" + nf(x.yrs, 2) + "</td><td>" + f2(x.profit) + "</td><td>" + nf(x.roi, 2) + "</td><td>" + nf(x.cagr, 2) + "</td><td>" + nf(x.mult, 4) + "</td></tr>")
      .join("");
    return '<table class="roi__tbl roi__tbl--sch" id="scheduleTable">' + head + "<tbody>" + body + "</tbody></table>";
  }

  let last = null;

  function render(r) {
    const box = el("result");
    const sch = el("schedule");
    if (!r.ok) {
      last = null;
      box.innerHTML = r.none || !r.msg ? T.enter : '<div class="roi__hintbox">' + r.msg + "</div>";
      sch.hidden = true;
      return;
    }
    last = r;
    let tiles, chart, note, title;
    if (r.mode === "roi") {
      const t = termText(r.n);
      tiles =
        tile(T.sMain, signed(r.net, 2) + " " + T.cur[state.cur], T.sMainMini, "roi__kpi--main roi__kpi--wide") +
        tile(T.sNet, signed(r.netRoi, 2) + "%", T.sNetMini) +
        tile(T.sRoi, signed(r.grossRoi, 2) + "%", T.sRoiMini) +
        tile(T.sCagr, signed(r.cagrNet, 2) + "%", fill(T.sCagrMini, { t }) + " · " + fill(T.sPeriod, { g: nf(r.cagrGross, 2) })) +
        tile(T.sReal, signed(r.realAnn, 2) + "%", fill(T.sRealMini, { i: nf(r.infl, 2) })) +
        tile(T.sMult, nf(r.mult, 4), T.sMultMini) +
        (Number.isFinite(r.breakEven) ? tile(T.sBe, mAuto(r.breakEven), T.sBeMini) : "");
      chart = chartRoi(r);
      title = T.chartRoi;
      note = T.modelRoi;
      el("schedBody").innerHTML = tableRoi(r);
    } else if (r.mode === "need") {
      tiles =
        tile(T.nMain, nf(r.eff, 2) + "%", T.nMainMini, "roi__kpi--main roi__kpi--wide") +
        tile(T.nNom, nf(r.nom, 2) + "%", T.nNomMini) +
        tile(T.nRoi, signed(r.roi, 2) + "%", T.nRoiMini) +
        tile(T.nInv, mAuto(r.inv), T.nInvMini) +
        tile(T.nProfit, mAuto(r.profit), T.nProfitMini) +
        (r.dbl != null ? tile(T.nDouble, fill(T.yr, { n: nf(r.dbl, 1) }), T.nDoubleMini, "roi__kpi--wide") : "");
      chart = chartNeed(r);
      title = T.chartNeed;
      note = T.modelNeed;
      el("schedBody").innerHTML = tableNeed(r);
    } else {
      tiles = tile(T.cMain, nf(r.best.cagr, 2) + "%", fill(T.cMainMini, { k: r.best.k }), "roi__kpi--main roi__kpi--wide");
      r.items.forEach((x) => {
        tiles += tile(fill(T.cTile, { k: x.k }) + (x === r.best ? " · " + T.cBest : ""), nf(x.cagr, 2) + "%", fill(T.cTileMini, { r: nf(x.roi, 1), p: mAuto(x.profit) }), x === r.best ? "roi__kpi--best" : "");
      });
      chart = chartCmp(r);
      title = T.chartCmp;
      note = T.modelCmp;
      el("schedBody").innerHTML = tableCmp(r);
    }
    box.innerHTML = '<div class="roi__kpis">' + tiles + '</div><div class="roi__sub" id="chartTitle">' + title + "</div>" + '<div class="roi__chartScroll">' + chart + "</div>" + '<div class="roi__note">' + note + "</div>";
    sch.hidden = false;
  }

  const compute = () => (state.mode === "roi" ? computeRoi() : state.mode === "need" ? computeNeed() : computeCmp());
  function calc() {
    render(compute());
  }

  // ===== таблиця: копіювання й CSV =====
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
    // числа без форматування (крапка), роздільник «;» — Excel читає як числа
    const clean = (s) => {
      const x = s.replace(/[\s ]/g, "").replace(/−/g, "-");
      if (/^[\d,.\-]+$/.test(x)) return IS_EN ? x.replace(/,/g, "") : x.replace(",", ".");
      return s;
    };
    const csv = "﻿" + tableMatrix().map((row) => row.map((c) => '"' + clean(c).replace(/"/g, '""') + '"').join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "roi-" + last.mode + ".csv";
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
    el("roiWrap").hidden = state.mode !== "roi";
    el("needWrap").hidden = state.mode !== "need";
    el("perWrap").hidden = state.mode === "cmp";
    el("moreWrap").hidden = state.mode !== "roi";
    el("cmpWrap").hidden = state.mode !== "cmp";
    document.querySelectorAll("[data-tgt]").forEach((b) => {
      const on = b.dataset.tgt === state.tgt;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", String(on));
    });
    el("ngField").hidden = state.tgt !== "amount";
    el("nrField").hidden = state.tgt !== "roi";
    const flag = { UAH: "ua", USD: "us", EUR: "eu" }[state.cur];
    el("cur_flag").src = "/assets/flags/" + flag + ".png";
    el("cur_code").textContent = state.cur;
    document.querySelectorAll("#cur_list li").forEach((li) => li.setAttribute("aria-selected", String(li.dataset.code === state.cur)));
  }

  // ===== кнопки =====
  const IDS = ["invest", "value", "years", "months", "income", "costs", "fee", "tax", "infl", "ni", "nc", "ng", "nr", "ciA", "cfA", "cyA", "ciB", "cfB", "cyB", "ciC", "cfC", "cyC"];

  function resetAll() {
    IDS.forEach((id) => (el(id).value = ""));
    Object.assign(state, { mode: "roi", cur: "UAH", tgt: "amount" });
    el("moreDet").open = false;
    applyState();
    render({ ok: false, none: true });
  }

  function fillExample() {
    IDS.forEach((id) => (el(id).value = ""));
    if (state.mode === "roi") {
      Object.entries({ invest: "100000", value: "150000", years: "3", months: "0", income: "5000", costs: "1000", fee: "1", tax: "23", infl: "8" }).forEach(([k, v]) => (el(k).value = v));
      el("moreDet").open = true;
    } else if (state.mode === "need") {
      Object.entries({ ni: "100000", nc: "3000", ng: "1000000", years: "10", months: "0" }).forEach(([k, v]) => (el(k).value = v));
      state.tgt = "amount";
    } else {
      Object.entries({ ciA: "100000", cfA: "130000", cyA: "2", ciB: "100000", cfB: "150000", cyB: "5", ciC: "100000", cfC: "118000", cyC: "1" }).forEach(([k, v]) => (el(k).value = v));
    }
    state.cur = "UAH";
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
    p.set("cur", state.cur);
    p.set("tgt", state.tgt);
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
    if (["need", "cmp"].includes(q.get("mode"))) state.mode = q.get("mode");
    if (["USD", "EUR"].includes(q.get("cur"))) state.cur = q.get("cur");
    if (q.get("tgt") === "roi") state.tgt = "roi";
    if (["income", "costs", "fee", "tax", "infl"].some((id) => !blank(id))) el("moreDet").open = true;
    return any || ["mode", "cur", "tgt"].some((k) => q.has(k));
  }

  window.addEventListener("DOMContentLoaded", () => {
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
    document.querySelectorAll("[data-tgt]").forEach((b) =>
      b.addEventListener("click", () => {
        state.tgt = b.dataset.tgt;
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
