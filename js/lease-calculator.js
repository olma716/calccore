/* lease-calculator.js — калькулятор лізингу авто (UK/EN)
   Операційний лізинг (із залишковою вартістю), на місяць:
     амортизація = (ціна − аванс − залишкова) / термін
     фінансова частина = (ціна − аванс + залишкова) × ставка / 100 / 24   (відсотки на середню вартість)
   Фінансовий лізинг із викупом: анюїтет на (ціна − аванс) із кінцевим платежем-викупом B:
     платіж = (P − B / (1+r)^n) × r / (1 − (1+r)^−n),  r = ставка / 1200
   Додатково: комісія (% від ціни, разово), страхування (% від ціни на рік, рівномірно), ПДВ на платежі (%), інші разові витрати.
   Порівняння з кредитом: анюїтет на (ціна − аванс); чиста вартість = усі виплати − ринкова вартість авто в кінці
   (для операційного лізингу авто повертається — вартість у кінці не зараховується). */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const LOCALE = IS_EN ? "en-US" : "uk-UA";

  const T = IS_EN
    ? {
        enter: "Enter the car price, the term and the rate — the result will appear here.",
        missing: "To calculate, fill in: {list}.",
        lblPrice: "car price", lblTerm: "term", lblRate: "annual rate",
        errPrice: "Car price must be between 1 000 and 1 000 000 000.",
        errDown: "The down payment must be between 0 and the car price.",
        errTerm: "Term must be a whole number of months from 1 to 120.",
        errRate: "Annual rate must be between 0 and 100%.",
        errRes: "Residual value must be between 0 and 95%.",
        errBuy: "Buyout value must be between 0 and 100%.",
        errNum: "Check the value in the field “{f}”.",
        errCombo: "The down payment and the residual (buyout) value together cannot exceed the car price.",
        lblComm: "Commission", lblIns: "Insurance", lblVat: "VAT", lblOther: "Other one-time costs", lblLoanRate: "Loan rate", lblMarket: "Car value at the end",
        cur: { UAH: "UAH", USD: "USD", EUR: "EUR" },
        mo: "month", perMo: "/ month", months: "months",
        lblResidual: "Residual value (%)", lblBuyout: "Buyout value (%)",
        hintResidual: "The forecast value of the car at the end. The lessor builds it into the payment.",
        hintBuyout: "What you pay at the end to keep the car (often 1–20% or a nominal 1).",
        monthly: "Monthly payment", monthlyMini: "{n} months, down payment {d}",
        kDep: "Depreciation per month", kFin: "Interest per month (average)", kStart: "Paid at the start", kTotal: "Total over the term", kEnd: "Buyout at the end", kRes: "Residual value", kIns: "Insurance per month", kVat: "VAT per month",
        kResMini: "the car is returned", kEndMini: "you keep the car",
        tblItem: "Item", tblSum: "per month",
        rowDep: "Depreciation / principal", rowFin: "Interest", rowVat: "VAT", rowIns: "Insurance",
        cmpTitle: "Comparison with a car loan",
        cmpLine: "Net cost of using the car: lease {a} vs loan {b}.",
        cmpPay: "Monthly payment: lease {a}, loan {b}.",
        cmpLink: "Calculate the car loan in detail →",
        cmpNeed: "To compare with a car loan, enter the loan rate in the “Comparison with a car loan” block.",
        cmpAssume: "Loan: the same down payment and term, rate {r}%. Car value at the end: {m}% of the price.",
        cmpLeaseCheaper: "Lease is cheaper than a loan by {x} over the term.",
        cmpLoanCheaper: "A loan is cheaper than a lease by {x} over the term.",
        cmpSame: "The net cost is about the same.",
        cmpNoOwn: "An operating lease does not give you the car: its value at the end is not counted for the lease.",
        chartTitle: "What the monthly payment consists of",
        modelNote: "Estimate: real terms, fees, insurance and VAT are set by the lessor. Check the full contract before signing.",
        linkCopied: "Link copied ✅", copyFailed: "Could not copy 😕", reset: "Reset ✅", example: "Example filled in ✅"
      }
    : {
        enter: "Вкажіть ціну авто, термін і ставку — результат зʼявиться тут.",
        missing: "Щоб порахувати, заповніть: {list}.",
        lblPrice: "ціну авто", lblTerm: "термін", lblRate: "річну ставку",
        errPrice: "Ціна авто має бути від 1 000 до 1 000 000 000.",
        errDown: "Аванс має бути від 0 до ціни авто.",
        errTerm: "Термін — ціле число місяців від 1 до 120.",
        errRate: "Річна ставка має бути від 0 до 100%.",
        errRes: "Залишкова вартість має бути від 0 до 95%.",
        errBuy: "Викупна вартість має бути від 0 до 100%.",
        errNum: "Перевірте значення в полі «{f}».",
        errCombo: "Аванс і залишкова (викупна) вартість разом не можуть перевищувати ціну авто.",
        lblComm: "Комісія", lblIns: "Страхування", lblVat: "ПДВ", lblOther: "Інші разові витрати", lblLoanRate: "Ставка кредиту", lblMarket: "Вартість авто наприкінці",
        cur: { UAH: "грн", USD: "USD", EUR: "EUR" },
        mo: "міс", perMo: "/ міс", months: "міс",
        lblResidual: "Залишкова вартість (%)", lblBuyout: "Викупна вартість (%)",
        hintResidual: "Прогноз вартості авто наприкінці терміну. Лізингодавець закладає її в платіж.",
        hintBuyout: "Сума, яку платите наприкінці, щоб залишити авто (часто 1–20% або номінальна 1).",
        monthly: "Щомісячний платіж", monthlyMini: "{n} міс, аванс {d}",
        kDep: "Амортизація на місяць", kFin: "Відсотки на місяць (середнє)", kStart: "Сплата на старті", kTotal: "Всього за термін", kEnd: "Викуп наприкінці", kRes: "Залишкова вартість", kIns: "Страхування на місяць", kVat: "ПДВ на місяць",
        kResMini: "авто повертається", kEndMini: "авто залишається вам",
        tblItem: "Стаття", tblSum: "на місяць",
        rowDep: "Амортизація / тіло", rowFin: "Відсотки", rowVat: "ПДВ", rowIns: "Страхування",
        cmpTitle: "Порівняння з кредитом на авто",
        cmpLine: "Чиста вартість користування авто: лізинг {a} проти кредиту {b}.",
        cmpPay: "Щомісячний платіж: лізинг {a}, кредит {b}.",
        cmpLink: "Розрахувати автокредит детально →",
        cmpNeed: "Щоб порівняти з кредитом на авто, вкажіть ставку кредиту в блоці «Порівняння з кредитом».",
        cmpAssume: "Кредит: той самий аванс і термін, ставка {r}%. Вартість авто наприкінці: {m}% від ціни.",
        cmpLeaseCheaper: "Лізинг дешевший за кредит на {x} за термін.",
        cmpLoanCheaper: "Кредит дешевший за лізинг на {x} за термін.",
        cmpSame: "Чиста вартість приблизно однакова.",
        cmpNoOwn: "Операційний лізинг не дає вам авто: його вартість наприкінці для лізингу не зараховується.",
        chartTitle: "З чого складається щомісячний платіж",
        modelNote: "Оцінка: реальні умови, комісії, страхування й ПДВ задає лізингодавець. Перевіряйте повний договір перед підписанням.",
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
  const f1 = (n) => nf(n, 1);
  const state = { mode: "op", cur: "UAH" };
  const money = (n) => f0(n) + " " + T.cur[state.cur];

  // групування тисяч під час введення: 1000000 → 1 000 000 (EN: 1,000,000); курсор лишається біля тієї самої цифри
  const GROUP_SEP = IS_EN ? "," : " ";
  const MONEY_IDS = ["price","down","other"];
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

  function toast(msg) {
    const n = el("toast");
    if (!n) return;
    n.textContent = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (n.textContent = ""), 2400);
  }

  // анюїтет із кінцевим платежем B (B = 0 — звичайний анюїтет)
  function annuity(P, B, rateYear, n) {
    const r = rateYear / 1200;
    if (r === 0) return (P - B) / n;
    const g = Math.pow(1 + r, -n);
    return ((P - B * g) * r) / (1 - g);
  }

  // необовʼязкове поле: порожньо = 0 (або defVal), інакше число в межах
  function opt(id, label, min, max, defVal = 0) {
    if (blank(id)) return { v: defVal, given: false };
    const v = num(el(id).value);
    if (!(v >= min && v <= max)) return { err: fill(T.errNum, { f: label }) };
    return { v, given: true };
  }

  // ===== розрахунок =====
  function compute() {
    const miss = [];
    if (blank("price")) miss.push(T.lblPrice);
    if (blank("term")) miss.push(T.lblTerm);
    if (blank("rate")) miss.push(T.lblRate);
    if (miss.length) {
      const any = ["price", "term", "rate"].some((id) => !blank(id));
      return { ok: false, none: !any, msg: any ? fill(T.missing, { list: miss.join(", ") }) : "" };
    }
    const price = num(el("price").value);
    if (!(price >= 1000 && price <= 1e9)) return { ok: false, msg: T.errPrice };
    const down = blank("down") ? 0 : num(el("down").value);
    if (!(down >= 0 && down <= price)) return { ok: false, msg: T.errDown };
    const n = num(el("term").value);
    if (!(Number.isInteger(n) && n >= 1 && n <= 120)) return { ok: false, msg: T.errTerm };
    const rate = num(el("rate").value);
    if (!(rate >= 0 && rate <= 100)) return { ok: false, msg: T.errRate };

    const op = state.mode === "op";
    let resPct = 0;
    if (!blank("residual")) {
      resPct = num(el("residual").value);
      if (!(resPct >= 0 && resPct <= (op ? 95 : 100))) return { ok: false, msg: op ? T.errRes : T.errBuy };
    }
    const comm = opt("comm", T.lblComm, 0, 10), ins = opt("ins", T.lblIns, 0, 20), vat = opt("vat", T.lblVat, 0, 30), other = opt("other", T.lblOther, 0, 1e9);
    const loanRate = opt("loanRate", T.lblLoanRate, 0, 100, 0);
    const market = opt("market", T.lblMarket, 0, 200, resPct);
    for (const r of [comm, ins, vat, other, loanRate, market]) if (r.err) return { ok: false, msg: r.err };

    const P = price - down;
    const resAmt = (price * resPct) / 100;
    const k = 1 + vat.v / 100;
    if (P - resAmt < 0) return { ok: false, msg: T.errCombo };
    let dep, interest, base, buyout;
    if (op) {
      dep = (P - resAmt) / n;
      interest = ((P + resAmt) * rate) / 100 / 24;
      base = dep + interest;
      buyout = 0;
    } else {
      base = annuity(P, resAmt, rate, n);
      dep = (P - resAmt) / n;
      interest = base - dep;
      buyout = resAmt;
    }
    const vatM = base * (k - 1);
    const insM = (price * ins.v) / 100 / 12;
    const monthly = base * k + insM;
    const start = down + (price * comm.v) / 100 + other.v;
    const buyoutPaid = buyout * k;
    const total = start + monthly * n + buyoutPaid;
    const interestTotal = interest * n;

    // кредит — лише якщо вказано ставку кредиту
    let cmp = null;
    if (loanRate.given) {
      const loanPay = annuity(P, 0, loanRate.v, n);
      const loanTotal = down + loanPay * n;
      const mv = (price * market.v) / 100;
      cmp = { loanRate: loanRate.v, loanPay, loanTotal, market: market.v, mv, leaseNet: op ? total : total - mv, loanNet: loanTotal - mv };
    }

    return {
      ok: true, op, price, down, n, rate, resPct, resAmt, P,
      dep, interest, vatM, insM, base, monthly, start, buyout, buyoutPaid, total, interestTotal,
      comm: (price * comm.v) / 100, other: other.v, vatTotal: base * (k - 1) * n + buyout * (k - 1), insTotal: insM * n,
      cmp
    };
  }

  // ===== відображення =====
  const tile = (title, value, mini, cls = "") =>
    '<div class="lse__kpi ' + cls + '"><div class="lse__kpiT">' + title + '</div><div class="lse__kpiV">' + value + "</div>" + (mini ? '<div class="lse__kpiM">' + mini + "</div>" : "") + "</div>";

  // кільце щомісячного платежу: амортизація / тіло, відсотки, ПДВ, страхування
  function donut(r) {
    const parts = [
      [T.rowDep, r.dep, "#283b69"],
      [T.rowFin, r.interest, "#0f8b8d"],
      [T.rowVat, r.vatM, "#d64545"],
      [T.rowIns, r.insM, "#7c93c9"]
    ].filter((p) => p[1] > 0.5);
    const tot = parts.reduce((x, p) => x + p[1], 0);
    const cx = 75, cy = 75, rad = 52, rw = 22;
    let a0 = -Math.PI / 2;
    let svg = '<svg class="lse__chart lse__donutSvg" viewBox="0 0 150 150" role="img" aria-label="' + T.chartTitle + '">';
    parts.forEach((p) => {
      const frac = p[1] / tot;
      const a1 = a0 + Math.min(frac, 0.9999) * 2 * Math.PI;
      const x0 = cx + rad * Math.cos(a0), y0 = cy + rad * Math.sin(a0);
      const x1 = cx + rad * Math.cos(a1 - 0.015), y1 = cy + rad * Math.sin(a1 - 0.015);
      svg += '<path d="M' + x0.toFixed(2) + " " + y0.toFixed(2) + " A" + rad + " " + rad + " 0 " + (a1 - a0 > Math.PI ? 1 : 0) + " 1 " + x1.toFixed(2) + " " + y1.toFixed(2) + '" fill="none" stroke="' + p[2] + '" stroke-width="' + rw + '"/>';
      a0 = a1;
    });
    svg += '<text x="75" y="73" font-size="15" font-weight="800" fill="#1f2f55" text-anchor="middle">' + f0(r.monthly) + "</text>";
    svg += '<text x="75" y="90" font-size="11" fill="#6b7280" text-anchor="middle">' + T.cur[state.cur] + " " + T.perMo + "</text></svg>";
    const list = parts
      .map((p) => '<li><i style="background:' + p[2] + '"></i><span>' + p[0] + "</span><b>" + f0(p[1]) + " · " + Math.round((p[1] / tot) * 100) + "%</b></li>")
      .join("");
    return '<div class="lse__donut">' + svg + '<ul class="lse__dl">' + list + "</ul></div>";
  }

  function render(r) {
    const box = el("result");
    if (!r.ok) {
      if (r.none || !r.msg) box.innerHTML = T.enter;
      else box.innerHTML = '<div class="lse__hintbox">' + r.msg + "</div>";
      return;
    }
    const tiles =
      tile(T.monthly, money(r.monthly), fill(T.monthlyMini, { n: r.n, d: money(r.down) }), "lse__kpi--main lse__kpi--wide") +
      tile(T.kDep, money(r.dep), "") +
      tile(T.kFin, money(r.interest), "") +
      tile(T.kStart, money(r.start), "") +
      tile(T.kTotal, money(r.total), r.op ? T.kResMini : T.kEndMini) +
      tile(r.op ? T.kRes : T.kEnd, money(r.resAmt), r.op ? T.kResMini : T.kEndMini);

    // порівняння з кредитом — один вердикт; без ставки кредиту лише підказка
    let cmp = "";
    if (r.cmp) {
      const c = r.cmp;
      const diff = c.loanNet - c.leaseNet; // > 0: лізинг дешевший
      const same = Math.abs(diff) <= Math.max(c.loanNet, c.leaseNet, 1) * 0.01;
      const verdict = same ? T.cmpSame : diff > 0 ? fill(T.cmpLeaseCheaper, { x: money(Math.abs(diff)) }) : fill(T.cmpLoanCheaper, { x: money(Math.abs(diff)) });
      const vcls = same ? "" : diff > 0 ? "is-ok" : "is-warn";
      const loanUrl = (IS_EN ? "/en" : "") + "/auto/loan-amortization-calculator?" + new URLSearchParams({ amount: String(Math.round(r.P)), rate: String(c.loanRate), term: String(r.n) }).toString();
      cmp =
        '<div class="lse__sub">' + T.cmpTitle + "</div>" +
        '<div class="lse__verdict ' + vcls + '"><b>' + fill(T.cmpLine, { a: money(c.leaseNet), b: money(c.loanNet) }) + "</b><br>" + verdict + "</div>" +
        '<div class="lse__note">' + fill(T.cmpPay, { a: money(r.monthly), b: money(c.loanPay) }) + " " + fill(T.cmpAssume, { r: f1(c.loanRate), m: f1(c.market) }) + (r.op ? " " + T.cmpNoOwn : "") + "</div>" +
        '<a class="lse__link" href="' + loanUrl + '">' + T.cmpLink + "</a>";
    } else {
      cmp = '<div class="lse__note">' + T.cmpNeed + "</div>";
    }

    box.innerHTML =
      '<div class="lse__kpis">' + tiles + "</div>" + cmp +
      '<div class="lse__sub">' + T.chartTitle + "</div>" + donut(r) +
      '<div class="lse__note">' + T.modelNote + "</div>";
  }

  function calc() {
    render(compute());
  }

  // ===== режими =====
  function applyMode() {
    const op = state.mode === "op";
    el("modeOp").classList.toggle("is-active", op);
    el("modeFin").classList.toggle("is-active", !op);
    el("modeOp").setAttribute("aria-pressed", String(op));
    el("modeFin").setAttribute("aria-pressed", String(!op));
    el("lblResidual").firstChild.nodeValue = (op ? T.lblResidual : T.lblBuyout) + " ";
    el("hintResidual").textContent = op ? T.hintResidual : T.hintBuyout;
    el("residual").placeholder = IS_EN ? (op ? "e.g. 45" : "e.g. 10") : op ? "наприклад: 45" : "наприклад: 10";
    const flag = { UAH: "ua", USD: "us", EUR: "eu" }[state.cur];
    el("cur_flag").src = "/assets/flags/" + flag + ".png";
    el("cur_code").textContent = state.cur;
    document.querySelectorAll("#cur_list li").forEach((li) => li.setAttribute("aria-selected", String(li.dataset.code === state.cur)));
  }
  function setMode(v) {
    state.mode = v;
    applyMode();
    calc();
  }
  function setCur(v) {
    state.cur = v;
    applyMode();
    calc();
  }

  // ===== кнопки =====
  const IDS = ["price", "down", "term", "rate", "residual", "comm", "ins", "vat", "other", "loanRate", "market"];

  function resetAll() {
    IDS.forEach((id) => (el(id).value = ""));
    state.mode = "op";
    state.cur = "UAH";
    ["extraDetails", "cmpDetails"].forEach((id) => (el(id).open = false));
    applyMode();
    syncTermChips();
    render({ ok: false, none: true });
  }

  function fillExample() {
    const v = { price: "800000", down: "100000", term: "36", rate: "8", residual: "50", comm: "1", ins: "3", vat: "", other: "", loanRate: "12", market: "" };
    IDS.forEach((id) => (el(id).value = IS_EN ? v[id] : v[id].replace(".", ",")));
    state.mode = "op";
    state.cur = "UAH";
    ["extraDetails", "cmpDetails"].forEach((id) => (el(id).open = true));
    applyMode();
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
    if (q.get("mode") === "fin") state.mode = "fin";
    if (["USD", "EUR"].includes(q.get("cur"))) state.cur = q.get("cur");
    if (["comm", "ins", "vat", "other"].some((id) => !blank(id))) el("extraDetails").open = true;
    if (["loanRate", "market"].some((id) => !blank(id))) el("cmpDetails").open = true;
    return any || q.has("mode") || q.has("cur");
  }

  function syncTermChips() {
    const v = (el("term").value || "").trim();
    document.querySelectorAll("[data-term]").forEach((b) => b.classList.toggle("is-on", b.dataset.term === v));
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
    el("modeOp").addEventListener("click", () => setMode("op"));
    el("modeFin").addEventListener("click", () => setMode("fin"));
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
      setCur(li.dataset.code);
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
    applyMode();
    syncTermChips();
    if (used) calc();
    else render({ ok: false, none: true });
  });
})();
