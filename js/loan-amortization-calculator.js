/* loan-amortization-calculator.js — калькулятор автокредиту з графіком платежів (UK/EN)
   Ануїтет: платіж = P × r / (1 − (1+r)^−n), r = ставка / 1200; диференційований: тіло = P / n, відсотки = залишок × r.
   Усі суми округлюються до копійок щомісяця, останній платіж закриває залишок борг.
   Дострокове погашення: щомісячна додаткова сума та/або одноразова в обраний місяць; платіж незмінний, термін скорочується.
   Комісія (разово, % від суми кредиту) і страхування (% від суми кредиту на рік) входять до повної вартості та до орієнтовної
   реальної річної ставки: IRR грошового потоку (отримано P − комісія, далі −платіж − страхування) × 12. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const LOCALE = IS_EN ? "en-US" : "uk-UA";

  const T = IS_EN
    ? {
        enter: "Enter the loan amount, the rate and the term — the result will appear here.",
        missing: "To calculate, fill in: {list}.",
        lblAmount: "loan amount", lblRate: "annual rate", lblTerm: "term",
        errAmount: "Loan amount must be between 1 000 and 1 000 000 000.",
        errDown: "The down payment must be between 0 and the car price.",
        errTerm: "Term must be a whole number of months from 1 to 360.",
        errRate: "Annual rate must be between 0 and 100%.",
        errNum: "Check the value in the field “{f}”.",
        errLumpMonth: "The month of the one-time payment must be a whole number from 1 to the loan term.",
        lblComm: "Commission", lblIns: "Insurance", lblExtra: "Extra payment per month", lblLump: "One-time payment",
        cur: { UAH: "UAH", USD: "USD", EUR: "EUR" },
                pay: "Monthly payment", payDiffMini: "first {a}, last {b}", payAnnMini: "{n} months, loan {l}",
        kInt: "Total interest", kPaid: "Total paid on the loan", kCost: "Total cost of credit", kOver: "Overpayment", kApr: "Real annual rate (approx.)",
        kCostMini: "interest + fees + insurance", kOverMini: "of the loan amount", kAprMini: "with commission and insurance",
        earlyTitle: "Early repayment", earlySaved: "You save {x} on interest and finish {m} months earlier ({t} instead of {n}).",
        earlyNone: "Early repayment does not shorten the loan with these amounts.",
                thMonth: "Month", thYear: "Year", thPay: "Payment", thInt: "Interest", thPrin: "Principal", thExtra: "Early", thBal: "Balance", thTotal: "Total",
        tableCopied: "Table copied ✅", csvDone: "CSV downloaded ✅",
        chartTitle: "What all payments consist of", legPrin: "Principal", legInt: "Interest", legComm: "Fee", legIns: "Insurance", donutTotal: "in total",
        modelNote: "Estimate: real terms, fees and insurance are set by the bank. The real annual rate is approximate — check it in the loan agreement.",
        linkCopied: "Link copied ✅", copyFailed: "Could not copy 😕", reset: "Reset ✅", example: "Example filled in ✅"
      }
    : {
        enter: "Вкажіть суму кредиту, ставку й термін — результат зʼявиться тут.",
        missing: "Щоб порахувати, заповніть: {list}.",
        lblAmount: "суму кредиту", lblRate: "річну ставку", lblTerm: "термін",
        errAmount: "Сума кредиту має бути від 1 000 до 1 000 000 000.",
        errDown: "Аванс має бути від 0 до ціни авто.",
        errTerm: "Термін — ціле число місяців від 1 до 360.",
        errRate: "Річна ставка має бути від 0 до 100%.",
        errNum: "Перевірте значення в полі «{f}».",
        errLumpMonth: "Місяць одноразового платежу — ціле число від 1 до терміну кредиту.",
        lblComm: "Комісія", lblIns: "Страхування", lblExtra: "Додатковий платіж на місяць", lblLump: "Одноразовий платіж",
        cur: { UAH: "грн", USD: "USD", EUR: "EUR" },
                pay: "Щомісячний платіж", payDiffMini: "перший {a}, останній {b}", payAnnMini: "{n} міс, кредит {l}",
        kInt: "Всього відсотків", kPaid: "Всього сплачено за кредитом", kCost: "Повна вартість кредиту", kOver: "Переплата", kApr: "Реальна річна ставка (орієнтовно)",
        kCostMini: "відсотки + комісія + страхування", kOverMini: "від суми кредиту", kAprMini: "з комісією та страхуванням",
        earlyTitle: "Дострокове погашення", earlySaved: "Ви заощадите {x} на відсотках і закриєте кредит на {m} міс раніше ({t} замість {n}).",
        earlyNone: "За таких сум дострокове погашення не скорочує кредит.",
                thMonth: "Місяць", thYear: "Рік", thPay: "Платіж", thInt: "Відсотки", thPrin: "Тіло", thExtra: "Достроково", thBal: "Залишок", thTotal: "Разом",
        tableCopied: "Таблицю скопійовано ✅", csvDone: "CSV завантажено ✅",
        chartTitle: "З чого складаються всі виплати", legPrin: "Тіло кредиту", legInt: "Відсотки", legComm: "Комісія", legIns: "Страхування", donutTotal: "усього",
        modelNote: "Оцінка: реальні умови, комісії й страхування задає банк. Реальна річна ставка орієнтовна — звіряйте її з кредитним договором.",
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
  const state = { type: "ann", cur: "UAH", view: "month" };
  const money = (n) => f0(n) + " " + T.cur[state.cur];
  const money2 = (n) => f2(n) + " " + T.cur[state.cur];

  // групування тисяч під час введення: 1000000 → 1 000 000 (EN: 1,000,000); курсор лишається біля тієї самої цифри
  const GROUP_SEP = IS_EN ? "," : " ";
  const MONEY_IDS = ["price", "down", "amount", "extra", "lump"];
  function groupInput(inp) {
    const v = inp.value;
    if (!/^[\d\s\u00a0.,-]*$/.test(v)) return;
    const pos = inp.selectionStart == null ? v.length : inp.selectionStart;
    const digitsBefore = (v.slice(0, pos).match(/\d/g) || []).length;
    let s = v.replace(/[\s\u00a0]/g, "");
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
  const plain = (v) => (IS_EN ? v.replace(/,/g, "") : v.replace(/[\s\u00a0]/g, "").replace(",", "."));

  // сума підставляється, коли вказано і ціну, і аванс (0 — без авансу), інакше не дублює ціну;
  // якщо потім змінити суму вручну, діє ваше значення
  function syncAmount() {
    if (blank("price") || blank("down")) return;
    const price = num(el("price").value);
    const down = num(el("down").value);
    if (!(price >= 0) || !(down >= 0) || down > price) return;
    el("amount").value = String(Math.round((price - down) * 100) / 100);
    groupInput(el("amount"));
  }

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
  function buildSchedule(P, rateYear, n, type, extraM, lump, lumpMonth) {
    const r = rateYear / 1200;
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
    // f(i) = отримано − Σ платежі / (1+i)^k; зростає з i, шукаємо нуль
    const f = (i) => cf0 - flows.reduce((s, c, k) => s + c / Math.pow(1 + i, k + 1), 0);
    let lo = 0, hi = 0.5;
    if (f(lo) >= 0) return 0; // платежі не більші за отримане: ставка нульова
    for (let k = 0; k < 200; k++) {
      const mid = (lo + hi) / 2;
      if (f(mid) < 0) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  }

  // ===== розрахунок =====
  function compute() {
    const hasPrice = !blank("price");
    const miss = [];
    if (blank("amount")) miss.push(T.lblAmount);
    if (blank("rate")) miss.push(T.lblRate);
    if (blank("term")) miss.push(T.lblTerm);
    if (miss.length) {
      const any = ["amount", "price", "rate", "term"].some((id) => !blank(id));
      return { ok: false, none: !any, msg: any ? fill(T.missing, { list: miss.join(", ") }) : "" };
    }
    let price = 0, down = 0;
    if (hasPrice) {
      price = num(el("price").value);
      if (!(price >= 1000 && price <= 1e9)) return { ok: false, msg: T.errAmount };
    }
    if (!blank("down")) {
      down = num(el("down").value);
      if (!(down >= 0 && (hasPrice ? down <= price : down <= 1e9))) return { ok: false, msg: T.errDown };
    }
    const P = num(el("amount").value);
    if (!(P >= 1000 && P <= 1e9)) return { ok: false, msg: T.errAmount };
    const rate = num(el("rate").value);
    if (!(rate >= 0 && rate <= 100)) return { ok: false, msg: T.errRate };
    const n = num(el("term").value);
    if (!(Number.isInteger(n) && n >= 1 && n <= 360)) return { ok: false, msg: T.errTerm };

    const comm = opt("comm", T.lblComm, 0, 10), ins = opt("ins", T.lblIns, 0, 20);
    const extra = opt("extra", T.lblExtra, 0, 1e9), lump = opt("lump", T.lblLump, 0, 1e9);
    for (const x of [comm, ins, extra, lump]) if (x.err) return { ok: false, msg: x.err };
    let lumpMonth = 1;
    if (lump.v > 0 && !blank("lumpMonth")) {
      lumpMonth = num(el("lumpMonth").value);
      if (!(Number.isInteger(lumpMonth) && lumpMonth >= 1 && lumpMonth <= n)) return { ok: false, msg: T.errLumpMonth };
    }

    const type = state.type;
    const base = buildSchedule(P, rate, n, type, 0, 0, 0);
    const early = extra.v > 0 || lump.v > 0;
    const rows = early ? buildSchedule(P, rate, n, type, extra.v, lump.v, lumpMonth) : base;
    const sum = (arr, k) => arr.reduce((s, x) => s + x[k], 0);
    const interestTotal = r2(sum(rows, "interest"));
    const baseInterest = r2(sum(base, "interest"));
    const months = rows.length;
    const commAmt = r2((P * comm.v) / 100);
    const insM = r2((P * ins.v) / 100 / 12);
    const insTotal = r2(insM * months);
    const paidLoan = r2(sum(rows, "payment") + sum(rows, "extra"));
    const cost = r2(interestTotal + commAmt + insTotal);
    const flows = rows.map((x) => x.payment + x.extra + insM);
    const apr = irrMonthly(P - commAmt, flows) * 12 * 100;

    return {
      ok: true, type, P, price, down, rate, n, months, rows, base, early,
      pay0: rows[0].payment, payLast: rows[rows.length - 1].payment, interestTotal, baseInterest, commAmt, insM, insTotal, paidLoan, cost,
      over: (cost / P) * 100, apr, saved: r2(baseInterest - interestTotal), monthsSaved: n - months, extra: extra.v, lump: lump.v, lumpMonth
    };
  }

  // ===== відображення =====
  const tile = (title, value, mini, cls = "") =>
    '<div class="lan__kpi ' + cls + '"><div class="lan__kpiT">' + title + '</div><div class="lan__kpiV">' + value + "</div>" + (mini ? '<div class="lan__kpiM">' + mini + "</div>" : "") + "</div>";

  // кільце: з чого складаються всі виплати — тіло, відсотки, комісія, страхування
  function donut(r) {
    const parts = [
      [T.legPrin, r.P, "#283b69"],
      [T.legInt, r.interestTotal, "#0f8b8d"],
      [T.legComm, r.commAmt, "#9aa6c2"],
      [T.legIns, r.insTotal, "#7c93c9"]
    ].filter((p) => p[1] > 0.5);
    const tot = parts.reduce((x, p) => x + p[1], 0);
    const cx = 75, cy = 75, rad = 52, rw = 22;
    let a0 = -Math.PI / 2;
    let svg = '<svg class="lan__chart lan__donutSvg" viewBox="0 0 150 150" role="img" aria-label="' + T.chartTitle + '">';
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
    return '<div class="lan__donut">' + svg + '<ul class="lan__dl">' + list + "</ul></div>";
  }

  function scheduleHtml(r) {
    const hasEx = r.early;
    const head = (first) => "<thead><tr><th>" + first + "</th><th>" + T.thPay + "</th><th>" + T.thInt + "</th><th>" + T.thPrin + "</th>" + (hasEx ? "<th>" + T.thExtra + "</th>" : "") + "<th>" + T.thBal + "</th></tr></thead>";
    let rows, totalRow;
    if (state.view === "month") {
      rows = r.rows.map((x) => "<tr><td>" + x.m + "</td><td>" + f2(x.payment) + "</td><td>" + f2(x.interest) + "</td><td>" + f2(x.principal) + "</td>" + (hasEx ? "<td>" + f2(x.extra) + "</td>" : "") + "<td>" + f2(x.balance) + "</td></tr>").join("");
    } else {
      const years = [];
      for (let i = 0; i < r.rows.length; i += 12) years.push(r.rows.slice(i, i + 12));
      rows = years
        .map((part, i) => {
          const s = (k) => part.reduce((a, x) => a + x[k], 0);
          return "<tr><td>" + (i + 1) + "</td><td>" + f2(s("payment")) + "</td><td>" + f2(s("interest")) + "</td><td>" + f2(s("principal")) + "</td>" + (hasEx ? "<td>" + f2(s("extra")) + "</td>" : "") + "<td>" + f2(part[part.length - 1].balance) + "</td></tr>";
        })
        .join("");
    }
    const sum = (k) => r.rows.reduce((a, x) => a + x[k], 0);
    totalRow = '<tr class="lan__total"><td>' + T.thTotal + "</td><td>" + f2(sum("payment")) + "</td><td>" + f2(sum("interest")) + "</td><td>" + f2(sum("principal")) + "</td>" + (hasEx ? "<td>" + f2(sum("extra")) + "</td>" : "") + "<td>—</td></tr>";
    return "<table class=\"lan__tbl lan__tbl--sch\" id=\"scheduleTable\">" + head(state.view === "month" ? T.thMonth : T.thYear) + "<tbody>" + rows + totalRow + "</tbody></table>";
  }

  let last = null;

  function render(r) {
    const box = el("result");
    const sch = el("schedule");
    if (!r.ok) {
      last = null;
      box.innerHTML = r.none || !r.msg ? T.enter : '<div class="lan__hintbox">' + r.msg + "</div>";
      sch.hidden = true;
      updateLeaseLink();
      return;
    }
    last = r;
    const diff = r.type === "diff";
    const mainMini = diff ? fill(T.payDiffMini, { a: money2(r.pay0), b: money2(r.payLast) }) : fill(T.payAnnMini, { n: r.months, l: money(r.P) });
    const tiles =
      tile(T.pay, money2(r.pay0), mainMini, "lan__kpi--main lan__kpi--wide") +
      tile(T.kInt, money(r.interestTotal), "") +
      tile(T.kPaid, money(r.paidLoan), "") +
      tile(T.kCost, money(r.cost), T.kCostMini) +
      tile(T.kOver, nf(r.over, 1) + "%", T.kOverMini) +
      tile(T.kApr, nf(r.apr, 2) + "%", T.kAprMini, "lan__kpi--wide");
    let early = "";
    if (r.early) {
      early = '<div class="lan__sub">' + T.earlyTitle + "</div>" +
        (r.monthsSaved > 0 || r.saved > 0.5
          ? '<div class="lan__verdict is-ok"><b>' + fill(T.earlySaved, { x: money(r.saved), m: r.monthsSaved, t: r.months, n: r.n }) + "</b></div>"
          : '<div class="lan__note">' + T.earlyNone + "</div>");
    }
    box.innerHTML = '<div class="lan__kpis">' + tiles + "</div>" + early + '<div class="lan__sub">' + T.chartTitle + "</div>" + donut(r) + '<div class="lan__note">' + T.modelNote + "</div>";
    sch.hidden = false;
    el("schedBody").innerHTML = scheduleHtml(r);
    updateLeaseLink();
  }

  // посилання «Або лізинг?» підставляє ціну, аванс, термін, ставку й ставку кредиту
  const leaseLink = el("leaseLink");
  const leaseBase = leaseLink ? leaseLink.getAttribute("href").split("?")[0] : "";
  function updateLeaseLink() {
    if (!leaseLink) return;
    const r = last;
    if (!r) {
      leaseLink.setAttribute("href", leaseBase);
      return;
    }
    const q = new URLSearchParams({ price: String(Math.round(r.price > 0 ? r.price : r.P + r.down)), term: String(r.n), rate: String(r.rate), loanRate: String(r.rate) });
    if (r.down > 0) q.set("down", String(Math.round(r.down)));
    leaseLink.setAttribute("href", leaseBase + "?" + q.toString());
  }

  function calc() {
    render(compute());
  }

  // ===== таблиця: копіювання й CSV =====
  const tableMatrix = (raw) => {
    const t = el("scheduleTable");
    if (!t) return [];
    return Array.from(t.querySelectorAll("tr")).map((tr) => Array.from(tr.children).map((c) => c.textContent.trim()));
  };
  async function copyTable() {
    const m = tableMatrix().map((row) => row.join("\t")).join("\n");
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
    a.download = "loan-schedule.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(T.csvDone);
  }

  // ===== режими =====
  function applyState() {
    el("typeAnn").classList.toggle("is-active", state.type === "ann");
    el("typeDiff").classList.toggle("is-active", state.type === "diff");
    el("typeAnn").setAttribute("aria-pressed", String(state.type === "ann"));
    el("typeDiff").setAttribute("aria-pressed", String(state.type === "diff"));
    el("viewMonth").classList.toggle("is-on", state.view === "month");
    el("viewYear").classList.toggle("is-on", state.view === "year");
    const flag = { UAH: "ua", USD: "us", EUR: "eu" }[state.cur];
    el("cur_flag").src = "/assets/flags/" + flag + ".png";
    el("cur_code").textContent = state.cur;
    document.querySelectorAll("#cur_list li").forEach((li) => li.setAttribute("aria-selected", String(li.dataset.code === state.cur)));
  }

  // ===== кнопки =====
  const IDS = ["price", "down", "amount", "rate", "term", "comm", "ins", "extra", "lump", "lumpMonth"];

  function syncTermChips() {
    const v = (el("term").value || "").trim();
    document.querySelectorAll("[data-term]").forEach((b) => b.classList.toggle("is-on", b.dataset.term === v));
  }

  function resetAll() {
    IDS.forEach((id) => (el(id).value = ""));
    state.type = "ann";
    state.cur = "UAH";
    state.view = "month";
    ["extraDetails", "earlyDetails", "priceDetails"].forEach((id) => (el(id).open = false));
    applyState();
    syncTermChips();
    render({ ok: false, none: true });
  }

  function fillExample() {
    const v = { price: "800000", down: "100000", amount: "700000", rate: "12", term: "36", comm: "1", ins: "", extra: "5000", lump: "", lumpMonth: "" };
    IDS.forEach((id) => (el(id).value = IS_EN ? v[id] : v[id].replace(".", ",")));
    state.type = "ann";
    state.cur = "UAH";
    state.view = "month";
    el("extraDetails").open = true;
    el("earlyDetails").open = true;
    el("priceDetails").open = true;
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
    if (blank("amount") && !blank("price")) {
      const price = num(el("price").value);
      const down = blank("down") ? 0 : num(el("down").value);
      if (price >= 0 && down >= 0 && down <= price) el("amount").value = String(Math.round((price - down) * 100) / 100);
    }
    if (["price", "down"].some((id) => !blank(id))) el("priceDetails").open = true;
    if (["comm", "ins"].some((id) => !blank(id))) el("extraDetails").open = true;
    if (["extra", "lump"].some((id) => !blank(id))) el("earlyDetails").open = true;
    return any || q.has("type") || q.has("cur");
  }

  window.addEventListener("DOMContentLoaded", () => {
    IDS.forEach((id) => {
      el(id).addEventListener("input", () => {
        if (MONEY_IDS.includes(id)) groupInput(el(id));
        if (id === "price" || id === "down") syncAmount();
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

    // параметри з посилання: amount (price), rate, term + власні (type, cur, down тощо)
    const used = applyFromUrl();
    groupAll();
    applyState();
    syncTermChips();
    if (used) calc();
    else render({ ok: false, none: true });
  });
})();
