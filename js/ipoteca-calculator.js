/* ipoteca-calculator.js — іпотечний калькулятор із графіком платежів (UK/EN)
   Кредит = вартість − перший внесок (₴ або %). Ануїтет: платіж = P × r / (1 − (1+r)^−n), r = ставка / 1200;
   диференційований: тіло = P / n, відсотки = залишок × r. Усі суми округлюються до копійок щомісяця,
   останній платіж закриває залишок боргу. Дострокове погашення: щомісячна додаткова сума та/або одноразова в обраний місяць;
   платіж незмінний, термін скорочується.
   Комісія банку (разово), страхування й інші щомісячні витрати входять до повної вартості кредиту та до орієнтовної реальної
   річної ставки: IRR грошового потоку (отримано P − комісія, далі −платіж −страхування −витрати) × 12.
   Разові витрати при купівлі (нотаріус, оцінка, збори) сплачуються не кредитору: вони входять до «стартових витрат»
   та до загальної вартості покупки, але не до ЕПС. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const LOCALE = IS_EN ? "en-US" : "uk-UA";

  const T = IS_EN
    ? {
        enter: "Enter the property price, the rate and the term — the result will appear here.",
        missing: "To calculate, fill in: {list}.",
        lblPrice: "property price", lblRate: "annual rate", lblTerm: "term",
        errPrice: "Property price must be between 1 000 and 10 000 000 000.",
        errDownAbs: "The down payment must be from 0 to less than the property price.",
        errDownPct: "The down payment must be from 0 to less than 100%.",
        errLoan: "The loan amount must be at least 100.",
        errTerm: "Term must be a whole number of years from 1 to 40.",
        errRate: "Annual rate must be between 0 and 100%.",
        errNum: "Check the value in the field “{f}”.",
        errDate: "Enter a valid start date or leave the field empty.",
        errLumpMonth: "The month of the one-time payment must be a whole number from 1 to the loan term in months.",
        lblBank: "Bank fee", lblBuy: "One-time purchase costs", lblIns: "Insurance", lblOther: "Other monthly costs", lblIncome: "Monthly income", lblExtra: "Extra payment per month", lblLump: "One-time payment",
        cur: { UAH: "UAH", USD: "USD", EUR: "EUR" },
        loanInfo: "Loan: {l} ({p}% of the price).", loanInfoDefault: "The loan amount = property price − down payment.",
        pay: "Monthly payment", payDiffMini: "first {a}, last {b}", payAnnMini: "{y} yr ({n} mo), loan {l} ({p}% of the price)",
        payFees: "Payment with insurance and costs", payFeesMini: "first month",
        kShare: "Payment share of income", kShareMini: "payment with costs ÷ income",
        kInt: "Total interest", kTotal: "Total to pay on the loan", kTotalMini: "loan, interest, fees and insurance",
        kCost: "Total cost of credit", kCostMini: "{p}% of the loan amount", kApr: "Real annual rate (approx.)", kAprMini: "with fees and insurance",
        kUp: "Needed at the start", kUpMini: "down payment + one-time costs",
        kBuy: "Total cost of the purchase", kBuyMini: "{x}× the property price",
        earlyTitle: "Early repayment", earlySaved: "You save {x} on interest and finish {m} months earlier ({t} instead of {n}).",
        earlyNone: "Early repayment does not shorten the loan with these amounts.",
        thMonth: "Month", thDate: "Date", thYear: "Year", thPay: "Payment", thInt: "Interest", thPrin: "Principal", thFees: "Insurance and costs", thExtra: "Early", thBal: "Balance", thTotal: "Total",
        oneFeeNote: "Bank fee at issue: {x} (not included in the table).",
        tableCopied: "Table copied ✅", csvDone: "CSV downloaded ✅",
        chartTitle: "What the purchase consists of", legDown: "Down payment", legPrin: "Loan principal", legInt: "Interest", legFee: "Fees and costs", legIns: "Insurance", donutTotal: "in total",
        modelNote: "Estimate: real terms, fees and insurance are set by the bank. The real annual rate is approximate; the share of income that banks allow is set by the bank — check it before applying.",
        linkCopied: "Link copied ✅", copyFailed: "Could not copy 😕", reset: "Reset ✅", example: "Example filled in ✅"
      }
    : {
        enter: "Вкажіть вартість нерухомості, ставку й термін — результат зʼявиться тут.",
        missing: "Щоб порахувати, заповніть: {list}.",
        lblPrice: "вартість нерухомості", lblRate: "річну ставку", lblTerm: "термін",
        errPrice: "Вартість нерухомості має бути від 1 000 до 10 000 000 000.",
        errDownAbs: "Перший внесок має бути від 0 і менший за вартість нерухомості.",
        errDownPct: "Перший внесок має бути від 0 до менше ніж 100%.",
        errLoan: "Сума кредиту має бути не менше 100.",
        errTerm: "Термін — ціле число років від 1 до 40.",
        errRate: "Річна ставка має бути від 0 до 100%.",
        errNum: "Перевірте значення в полі «{f}».",
        errDate: "Вкажіть коректну дату старту або залиште поле порожнім.",
        errLumpMonth: "Місяць одноразового платежу — ціле число від 1 до терміну кредиту в місяцях.",
        lblBank: "Комісія банку", lblBuy: "Разові витрати при купівлі", lblIns: "Страхування", lblOther: "Інші щомісячні витрати", lblIncome: "Дохід на місяць", lblExtra: "Додатковий платіж на місяць", lblLump: "Одноразовий платіж",
        cur: { UAH: "грн", USD: "USD", EUR: "EUR" },
        loanInfo: "Кредит: {l} ({p}% вартості).", loanInfoDefault: "Сума кредиту = вартість нерухомості − перший внесок.",
        pay: "Щомісячний платіж", payDiffMini: "перший {a}, останній {b}", payAnnMini: "{y} р. ({n} міс), кредит {l} ({p}% вартості)",
        payFees: "Платіж зі страхуванням і витратами", payFeesMini: "перший місяць",
        kShare: "Частка платежу в доході", kShareMini: "платіж із витратами ÷ дохід",
        kInt: "Всього відсотків", kTotal: "Загалом до сплати за кредитом", kTotalMini: "кредит, відсотки, комісії й страхування",
        kCost: "Повна вартість кредиту", kCostMini: "{p}% від суми кредиту", kApr: "Реальна річна ставка (орієнтовно)", kAprMini: "з комісіями та страхуванням",
        kUp: "Потрібно на старті", kUpMini: "внесок + разові витрати",
        kBuy: "Загальна вартість покупки", kBuyMini: "у {x} раза від ціни",
        earlyTitle: "Дострокове погашення", earlySaved: "Ви заощадите {x} на відсотках і закриєте кредит на {m} міс раніше ({t} замість {n}).",
        earlyNone: "За таких сум дострокове погашення не скорочує кредит.",
        thMonth: "Місяць", thDate: "Дата", thYear: "Рік", thPay: "Платіж", thInt: "Відсотки", thPrin: "Тіло", thFees: "Страхування і витрати", thExtra: "Достроково", thBal: "Залишок", thTotal: "Разом",
        oneFeeNote: "Комісія банку при видачі: {x} (у таблиці не враховано).",
        tableCopied: "Таблицю скопійовано ✅", csvDone: "CSV завантажено ✅",
        chartTitle: "З чого складається покупка", legDown: "Перший внесок", legPrin: "Тіло кредиту", legInt: "Відсотки", legFee: "Комісії й витрати", legIns: "Страхування", donutTotal: "усього",
        modelNote: "Оцінка: реальні умови, комісії й страхування задає банк. Реальна річна ставка орієнтовна; яку частку доходу банк дозволяє під платіж, визначає банк — уточніть це до подання заявки.",
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
  const state = { type: "ann", cur: "UAH", view: "month", downU: "abs", bankU: "pct", buyU: "pct", insU: "pct" };
  const money = (n) => f0(n) + " " + T.cur[state.cur];
  const money2 = (n) => f2(n) + " " + T.cur[state.cur];

  // групування тисяч під час введення: 1000000 → 1 000 000 (EN: 1,000,000); курсор лишається біля тієї самої цифри
  const GROUP_SEP = IS_EN ? "," : " ";
  const MONEY_IDS = ["price", "down", "bankFee", "buyCosts", "ins", "other", "income", "extra", "lump"];
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
  const plain = (v) => (IS_EN ? v.replace(/,/g, "") : v.replace(/[\s ]/g, ""));
  const toField = (n) => String(n).replace(".", IS_EN ? "." : ",");

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

  // ===== модель =====
  function buildSchedule(P, r, n, type, extraM, lump, lumpMonth) {
    const pmt = type === "ann" ? (r === 0 ? r2(P / n) : r2((P * r) / (1 - Math.pow(1 + r, -n)))) : 0;
    const pBase = r2(P / n);
    const rows = [];
    let bal = P;
    for (let m = 1; m <= n && bal > 0.004; m++) {
      const interest = r2(bal * r);
      let principal = type === "ann" ? r2(pmt - interest) : pBase;
      if (m === n || principal > bal) principal = bal;
      let extra = extraM + (m === lumpMonth ? lump : 0);
      extra = Math.max(0, Math.min(extra, r2(bal - principal)));
      const payment = r2(interest + principal);
      bal = r2(bal - principal - extra);
      if (m === n || bal < 0.005) bal = 0;
      rows.push({ m, payment, interest, principal, extra, balance: bal });
    }
    return rows;
  }

  // IRR грошового потоку (місячна ставка) бісекцією
  function irrMonthly(cf0, flows) {
    const f = (i) => cf0 - flows.reduce((s, c, k) => s + c / Math.pow(1 + i, k + 1), 0);
    let lo = 0, hi = 0.5;
    if (f(lo) >= 0) return 0; // платежі не більші за отримане: ставка нульова
    while (f(hi) < 0 && hi < 1e4) hi *= 2;
    for (let k = 0; k < 200; k++) {
      const mid = (lo + hi) / 2;
      if (f(mid) < 0) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  }

  function addMonths(d, m) {
    const x = new Date(d.getFullYear(), d.getMonth() + m, 1);
    x.setDate(Math.min(d.getDate(), new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate()));
    return x;
  }
  const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

  // перший внесок: сума та відсоток; null — якщо вартість або внесок некоректні
  function downParts() {
    if (blank("price")) return null;
    const price = num(el("price").value);
    if (!(price >= 1000 && price <= 1e10)) return null;
    let v = 0;
    if (!blank("down")) {
      v = num(el("down").value);
      if (!(v >= 0)) return null;
    }
    const amt = state.downU === "pct" ? r2((price * v) / 100) : v;
    if (!(amt < price)) return null;
    return { price, amt, pct: (amt / price) * 100 };
  }

  function updateLoanInfo() {
    const box = el("loanInfo");
    if (!box) return;
    const p = downParts();
    box.textContent = p ? fill(T.loanInfo, { l: money(r2(p.price - p.amt)), p: nf(((p.price - p.amt) / p.price) * 100, 1) }) : T.loanInfoDefault;
  }

  // ===== розрахунок =====
  function compute() {
    const miss = [];
    if (blank("price")) miss.push(T.lblPrice);
    if (blank("rate")) miss.push(T.lblRate);
    if (blank("term")) miss.push(T.lblTerm);
    if (miss.length) {
      const any = ["price", "down", "rate", "term"].some((id) => !blank(id));
      return { ok: false, none: !any, msg: any ? fill(T.missing, { list: miss.join(", ") }) : "" };
    }
    const price = num(el("price").value);
    if (!(price >= 1000 && price <= 1e10)) return { ok: false, msg: T.errPrice };
    let dv = 0;
    if (!blank("down")) {
      dv = num(el("down").value);
      if (!(dv >= 0 && (state.downU === "pct" ? dv < 100 : dv < price))) return { ok: false, msg: state.downU === "pct" ? T.errDownPct : T.errDownAbs };
    }
    const downAmt = state.downU === "pct" ? r2((price * dv) / 100) : dv;
    if (!(downAmt < price)) return { ok: false, msg: T.errDownPct };
    const P = r2(price - downAmt);
    if (!(P >= 100)) return { ok: false, msg: T.errLoan };
    const rate = num(el("rate").value);
    if (!(rate >= 0 && rate <= 100)) return { ok: false, msg: T.errRate };
    const years = num(el("term").value);
    if (!(Number.isInteger(years) && years >= 1 && years <= 40)) return { ok: false, msg: T.errTerm };
    const n = years * 12;

    let start = null;
    if (!blank("start")) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(el("start").value.trim());
      start = m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
      if (!start || start.getFullYear() < 1990 || start.getFullYear() > 2100) return { ok: false, msg: T.errDate };
    }

    const bank = opt("bankFee", T.lblBank, 0, state.bankU === "pct" ? 10 : P);
    const buy = opt("buyCosts", T.lblBuy, 0, state.buyU === "pct" ? 20 : price);
    const ins = opt("ins", T.lblIns, 0, state.insU === "pct" ? 20 : P);
    const other = opt("other", T.lblOther, 0, P);
    const income = opt("income", T.lblIncome, 0.01, 1e9);
    const extra = opt("extra", T.lblExtra, 0, 1e9), lump = opt("lump", T.lblLump, 0, 1e9);
    for (const x of [bank, buy, ins, other, income, extra, lump]) if (x.err) return { ok: false, msg: x.err };
    let lumpMonth = 1;
    if (lump.v > 0 && !blank("lumpMonth")) {
      lumpMonth = num(el("lumpMonth").value);
      if (!(Number.isInteger(lumpMonth) && lumpMonth >= 1 && lumpMonth <= n)) return { ok: false, msg: T.errLumpMonth };
    }

    const type = state.type;
    const rm = rate / 1200;
    const base = buildSchedule(P, rm, n, type, 0, 0, 0);
    const early = extra.v > 0 || lump.v > 0;
    const rows = early ? buildSchedule(P, rm, n, type, extra.v, lump.v, lumpMonth) : base;
    const sum = (arr, k) => arr.reduce((s, x) => s + x[k], 0);
    const interestTotal = r2(sum(rows, "interest"));
    const baseInterest = r2(sum(base, "interest"));
    const months = rows.length;
    const bankAmt = state.bankU === "pct" ? r2((P * bank.v) / 100) : bank.v;
    const buyAmt = state.buyU === "pct" ? r2((price * buy.v) / 100) : buy.v;
    const insM = state.insU === "pct" ? r2((P * ins.v) / 100 / 12) : ins.v;
    const feeM = r2(insM + other.v);
    const insTotal = r2(insM * months), otherTotal = r2(other.v * months);
    const feesTotal = r2(bankAmt + otherTotal);
    const paidLoan = r2(sum(rows, "payment") + sum(rows, "extra"));
    const cost = r2(interestTotal + feesTotal + insTotal);
    const total = r2(paidLoan + feesTotal + insTotal);
    const flows = rows.map((x) => x.payment + x.extra + feeM);
    const apr = irrMonthly(P - bankAmt, flows) * 12 * 100;
    const upfront = r2(downAmt + bankAmt + buyAmt);
    const purchase = r2(downAmt + total + buyAmt);
    const dated = rows.map((x) => ({ ...x, date: start ? addMonths(start, x.m) : null, fees: feeM }));

    return {
      ok: true, type, price, downAmt, P, ltv: (P / price) * 100, rate, years, n, months, rows: dated, early, start,
      pay0: rows[0].payment, payLast: rows[rows.length - 1].payment, feeM, insM, bankAmt, buyAmt, hasFees: feeM > 0,
      interestTotal, baseInterest, feesTotal, insTotal, paidLoan, total, cost, over: (cost / P) * 100, apr, upfront, purchase,
      income: income.given ? income.v : 0, saved: r2(baseInterest - interestTotal), monthsSaved: n - months
    };
  }

  // ===== відображення =====
  const tile = (title, value, mini, cls = "") =>
    '<div class="ipt__kpi ' + cls + '"><div class="ipt__kpiT">' + title + '</div><div class="ipt__kpiV">' + value + "</div>" + (mini ? '<div class="ipt__kpiM">' + mini + "</div>" : "") + "</div>";

  // кільце: з чого складається покупка — внесок, тіло, відсотки, комісії й витрати, страхування
  function donut(r) {
    const parts = [
      [T.legDown, r.downAmt, "#9aa6c2"],
      [T.legPrin, r.P, "#283b69"],
      [T.legInt, r.interestTotal, "#0f8b8d"],
      [T.legFee, r2(r.feesTotal + r.buyAmt), "#7c93c9"],
      [T.legIns, r.insTotal, "#c4cde3"]
    ].filter((p) => p[1] > 0.5);
    const tot = parts.reduce((x, p) => x + p[1], 0);
    const cx = 75, cy = 75, rad = 52, rw = 22;
    let a0 = -Math.PI / 2;
    let svg = '<svg class="ipt__chart ipt__donutSvg" viewBox="0 0 150 150" role="img" aria-label="' + T.chartTitle + '">';
    parts.forEach((p) => {
      const frac = p[1] / tot;
      const a1 = a0 + Math.min(frac, 0.9999) * 2 * Math.PI;
      const x0 = cx + rad * Math.cos(a0), y0 = cy + rad * Math.sin(a0);
      const x1 = cx + rad * Math.cos(a1 - 0.015), y1 = cy + rad * Math.sin(a1 - 0.015);
      svg += '<path d="M' + x0.toFixed(2) + " " + y0.toFixed(2) + " A" + rad + " " + rad + " 0 " + (a1 - a0 > Math.PI ? 1 : 0) + " 1 " + x1.toFixed(2) + " " + y1.toFixed(2) + '" fill="none" stroke="' + p[2] + '" stroke-width="' + rw + '"/>';
      a0 = a1;
    });
    svg += '<text x="75" y="73" font-size="14" font-weight="800" fill="#1f2f55" text-anchor="middle">' + f0(tot) + "</text>";
    svg += '<text x="75" y="90" font-size="11" fill="#6b7280" text-anchor="middle">' + T.cur[state.cur] + " " + T.donutTotal + "</text></svg>";
    const list = parts
      .map((p) => '<li><i style="background:' + p[2] + '"></i><span>' + p[0] + "</span><b>" + f0(p[1]) + " · " + Math.round((p[1] / tot) * 100) + "%</b></li>")
      .join("");
    return '<div class="ipt__donut">' + svg + '<ul class="ipt__dl">' + list + "</ul></div>";
  }

  function scheduleHtml(r) {
    const hasEx = r.early, hasFee = r.hasFees, month = state.view === "month", hasDate = month && !!r.start;
    const head = () =>
      "<thead><tr><th>" + (month ? T.thMonth : T.thYear) + "</th>" + (hasDate ? "<th>" + T.thDate + "</th>" : "") + "<th>" + T.thPay + "</th><th>" + T.thInt + "</th><th>" + T.thPrin + "</th>" +
      (hasFee ? "<th>" + T.thFees + "</th>" : "") + (hasEx ? "<th>" + T.thExtra + "</th>" : "") + "<th>" + T.thBal + "</th></tr></thead>";
    const cells = (get, bal) =>
      "<td>" + f2(get("payment")) + "</td><td>" + f2(get("interest")) + "</td><td>" + f2(get("principal")) + "</td>" + (hasFee ? "<td>" + f2(get("fees")) + "</td>" : "") + (hasEx ? "<td>" + f2(get("extra")) + "</td>" : "") + "<td>" + bal + "</td>";
    let rows;
    if (month) {
      rows = r.rows
        .map((x) => "<tr><td>" + x.m + "</td>" + (hasDate ? '<td data-iso="' + iso(x.date) + '">' + x.date.toLocaleDateString(LOCALE) + "</td>" : "") + cells((k) => x[k], f2(x.balance)) + "</tr>")
        .join("");
    } else {
      const years = [];
      for (let i = 0; i < r.rows.length; i += 12) years.push(r.rows.slice(i, i + 12));
      rows = years
        .map((part, i) => "<tr><td>" + (i + 1) + "</td>" + cells((k) => part.reduce((a, x) => a + x[k], 0), f2(part[part.length - 1].balance)) + "</tr>")
        .join("");
    }
    const tot = (k) => r.rows.reduce((a, x) => a + x[k], 0);
    const totalRow = '<tr class="ipt__total"><td>' + T.thTotal + "</td>" + (hasDate ? "<td>—</td>" : "") + cells(tot, "—") + "</tr>";
    const note = r.bankAmt > 0 ? '<div class="ipt__hint ipt__mt10">' + fill(T.oneFeeNote, { x: money2(r.bankAmt) }) + "</div>" : "";
    return '<table class="ipt__tbl ipt__tbl--sch" id="scheduleTable">' + head() + "<tbody>" + rows + totalRow + "</tbody></table>" + note;
  }

  let last = null;

  function render(r) {
    updateLoanInfo();
    const box = el("result");
    const sch = el("schedule");
    if (!r.ok) {
      last = null;
      box.innerHTML = r.none || !r.msg ? T.enter : '<div class="ipt__hintbox">' + r.msg + "</div>";
      sch.hidden = true;
      updateLinks();
      return;
    }
    last = r;
    const diff = r.type === "diff";
    const mainMini = diff ? fill(T.payDiffMini, { a: money2(r.pay0), b: money2(r.payLast) }) : fill(T.payAnnMini, { y: r.years, n: r.n, l: money(r.P), p: nf(r.ltv, 1) });
    const share = r.income > 0 ? ((r.pay0 + r.feeM) / r.income) * 100 : 0;
    const tiles =
      tile(T.pay, money2(r.pay0), mainMini, "ipt__kpi--main ipt__kpi--wide") +
      (r.hasFees ? tile(T.payFees, money2(r.pay0 + r.feeM), T.payFeesMini, "ipt__kpi--wide") : "") +
      (r.income > 0 ? tile(T.kShare, nf(share, 1) + "%", T.kShareMini, "ipt__kpi--wide") : "") +
      tile(T.kInt, money(r.interestTotal), "") +
      tile(T.kTotal, money(r.total), T.kTotalMini) +
      tile(T.kCost, money(r.cost), fill(T.kCostMini, { p: nf(r.over, 1) })) +
      tile(T.kApr, nf(r.apr, 2) + "%", T.kAprMini) +
      tile(T.kUp, money(r.upfront), T.kUpMini) +
      tile(T.kBuy, money(r.purchase), fill(T.kBuyMini, { x: nf(r.purchase / r.price, 2) }));
    let early = "";
    if (r.early) {
      early = '<div class="ipt__sub">' + T.earlyTitle + "</div>" +
        (r.monthsSaved > 0 || r.saved > 0.5
          ? '<div class="ipt__verdict is-ok"><b>' + fill(T.earlySaved, { x: money(r.saved), m: r.monthsSaved, t: r.months, n: r.n }) + "</b></div>"
          : '<div class="ipt__note">' + T.earlyNone + "</div>");
    }
    box.innerHTML = '<div class="ipt__kpis">' + tiles + "</div>" + early + '<div class="ipt__sub">' + T.chartTitle + "</div>" + donut(r) + '<div class="ipt__note">' + T.modelNote + "</div>";
    sch.hidden = false;
    el("schedBody").innerHTML = scheduleHtml(r);
    updateLinks();
  }

  // посилання «Споживчий кредит?» підставляє суму, ставку й термін (у місяцях) у кредитний калькулятор
  const credLink = el("credLink");
  const credBase = credLink ? credLink.getAttribute("href").split("?")[0] : "";
  function updateLinks() {
    if (!credLink) return;
    const r = last;
    if (!r) {
      credLink.setAttribute("href", credBase);
      return;
    }
    const q = new URLSearchParams({ amount: String(Math.round(r.P)), rate: String(r.rate) });
    if (r.n <= 360) q.set("term", String(r.n));
    credLink.setAttribute("href", credBase + "?" + q.toString());
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
    a.download = "mortgage-schedule.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(T.csvDone);
  }

  // ===== режими =====
  const DOWN_PH = IS_EN ? { abs: "e.g. 400,000", pct: "e.g. 20" } : { abs: "наприклад: 400 000", pct: "наприклад: 20" };
  function applyState() {
    el("typeAnn").classList.toggle("is-active", state.type === "ann");
    el("typeDiff").classList.toggle("is-active", state.type === "diff");
    el("typeAnn").setAttribute("aria-pressed", String(state.type === "ann"));
    el("typeDiff").setAttribute("aria-pressed", String(state.type === "diff"));
    el("viewMonth").classList.toggle("is-on", state.view === "month");
    el("viewYear").classList.toggle("is-on", state.view === "year");
    el("down").placeholder = DOWN_PH[state.downU];
    const fu = { down: state.downU, bankFee: state.bankU, buyCosts: state.buyU, ins: state.insU };
    document.querySelectorAll("[data-fu]").forEach((b) => {
      const on = fu[b.dataset.fu] === b.dataset.u;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", String(on));
      if (b.dataset.u === "abs") b.textContent = T.cur[state.cur];
    });
    const flag = { UAH: "ua", USD: "us", EUR: "eu" }[state.cur];
    el("cur_flag").src = "/assets/flags/" + flag + ".png";
    el("cur_code").textContent = state.cur;
    document.querySelectorAll("#cur_list li").forEach((li) => li.setAttribute("aria-selected", String(li.dataset.code === state.cur)));
  }

  // ===== кнопки =====
  const IDS = ["price", "down", "rate", "term", "start", "bankFee", "buyCosts", "ins", "other", "income", "extra", "lump", "lumpMonth"];
  const UKEY = { down: "downU", bankFee: "bankU", buyCosts: "buyU", ins: "insU" };

  function syncTermChips() {
    const v = (el("term").value || "").trim();
    document.querySelectorAll("[data-term]").forEach((b) => b.classList.toggle("is-on", b.dataset.term === v));
  }

  function resetAll() {
    IDS.forEach((id) => (el(id).value = ""));
    Object.assign(state, { type: "ann", cur: "UAH", view: "month", downU: "abs", bankU: "pct", buyU: "pct", insU: "pct" });
    ["extraDetails", "earlyDetails", "incomeDetails"].forEach((id) => (el(id).open = false));
    applyState();
    syncTermChips();
    render({ ok: false, none: true });
  }

  function fillExample() {
    const v = { price: "2000000", down: "20", rate: "18", term: "20", start: "", bankFee: "1", buyCosts: "2", ins: "0.5", other: "", income: "", extra: "5000", lump: "", lumpMonth: "" };
    IDS.forEach((id) => (el(id).value = IS_EN ? v[id] : v[id].replace(".", ",")));
    Object.assign(state, { type: "ann", cur: "UAH", view: "month", downU: "pct", bankU: "pct", buyU: "pct", insU: "pct" });
    el("extraDetails").open = true;
    el("earlyDetails").open = true;
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
    p.set("type", state.type);
    p.set("cur", state.cur);
    p.set("downU", state.downU);
    p.set("bankU", state.bankU);
    p.set("buyU", state.buyU);
    p.set("insU", state.insU);
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
    if (q.get("type") === "diff") state.type = "diff";
    if (["USD", "EUR"].includes(q.get("cur"))) state.cur = q.get("cur");
    if (q.get("downU") === "pct") state.downU = "pct";
    if (q.get("bankU") === "abs") state.bankU = "abs";
    if (q.get("buyU") === "abs") state.buyU = "abs";
    if (q.get("insU") === "abs") state.insU = "abs";
    if (["bankFee", "buyCosts", "ins", "other"].some((id) => !blank(id))) el("extraDetails").open = true;
    if (["extra", "lump"].some((id) => !blank(id))) el("earlyDetails").open = true;
    if (!blank("income")) el("incomeDetails").open = true;
    return any || ["type", "cur", "downU"].some((k) => q.has(k));
  }

  // перемикання ₴/% у внеску перераховує значення, щоб сума лишилась тією самою
  function switchDown(u) {
    if (u === state.downU) return;
    const price = blank("price") ? NaN : num(el("price").value);
    const cur = blank("down") ? NaN : num(el("down").value);
    state.downU = u;
    if (price >= 1000 && cur >= 0) {
      if (u === "pct") el("down").value = toField(Math.round(((cur / price) * 100) * 100) / 100);
      else el("down").value = toField(r2((price * cur) / 100));
      groupInput(el("down"));
    }
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
    document.querySelectorAll("[data-fu]").forEach((b) =>
      b.addEventListener("click", () => {
        if (b.dataset.fu === "down") switchDown(b.dataset.u);
        else state[UKEY[b.dataset.fu]] = b.dataset.u;
        applyState();
        calc();
      })
    );
    el("typeAnn").addEventListener("click", () => {
      state.type = "ann";
      applyState();
      calc();
    });
    el("typeDiff").addEventListener("click", () => {
      state.type = "diff";
      applyState();
      calc();
    });
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
