/* compound-interest.js — калькулятор складних відсотків (UK/EN)
   Відсотки нараховуються щомісяця від фактичного балансу: для частот ≥ 12 на рік — з ефективним місячним множником
   (щомісяця: 1 + ставка/1200; щодня: (1 + ставка/36500)^(365/12)); для рідших капіталізацій (щороку, раз на пів року,
   щокварталу) нараховані за місяці прості відсотки капіталізуються в кінці періоду, тож внесок усередині періоду
   отримує відсотки лише з місяця внеску. Податок (необовʼязково) утримується з відсотків під час капіталізації.
   Відсотки й податок округлюються до копійок. Ефективна річна дохідність — IRR грошового потоку (внески, підсумок).
   Режими: підсумкова сума; за скільки місяців досягнути цілі; який щомісячний внесок потрібен для цілі. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const LOCALE = IS_EN ? "en-US" : "uk-UA";

  const T = IS_EN
    ? {
        enter: "Enter the rate and the term — the result will appear here.",
        missing: "To calculate, fill in: {list}.",
        lblRate: "annual rate", lblTerm: "term", lblGoal: "target amount",
        errMoney: "Enter the initial amount or a monthly top-up (above 0).",
        errRate: "Annual rate must be between 0 and 100%.",
        errTerm: "The term must be from 1 month to 50 years.",
        errNum: "Check the value in the field “{f}”.",
        errDate: "Enter a valid start date or leave the field empty.",
        errGoalLow: "The target amount is already reached by the initial amount.",
        errGoalSelf: "Over this term the initial amount alone grows to {a}, which is above the target {g} — no contribution is needed.",
        errGoalFar: "With these numbers the target is not reached within 100 years.",
        errGoalNoGrowth: "With a zero rate and no top-ups the target cannot be reached.",
        lblInitial: "Initial amount", lblTop: "Monthly top-up", lblGrow: "Top-up growth per year", lblTax: "Tax rate", lblInfl: "Expected inflation",
        cur: { UAH: "UAH", USD: "USD", EUR: "EUR" },
        yr: "{n} yr", mo: "{n} mo",
        mainFv: "Final amount", mainFvMini: "after {t}",
        mainTime: "Time to reach the target", mainTimeMini: "final amount {f}",
        mainContrib: "Required top-up per month", mainContribMini: "to reach {g} in {t}",
        kFinal: "Final amount", kFinalMini: "target {g}",
        kInv: "Put in", kInvMini: "initial amount and top-ups",
        kEarn: "Earned (net)", kEarnMini: "{p}% of the amount put in",
        kEff: "Effective annual yield", kEffMini: "nominal rate {r}%",
        kBenefit: "Gain from compounding", kBenefitMini: "compared with simple interest",
        kDouble: "Capital doubles in", kDoubleMini: "rule of 72: ≈ {r} years",
        kReal: "Real value after inflation", kRealMini: "in today's money, inflation {i}%",
        kTax: "Tax paid", kTaxMini: "{p}% of the interest",
        thMonth: "Month", thDate: "Date", thYear: "Year", thTop: "Top-up", thInt: "Interest (net)", thIntCum: "Interest, total", thInv: "Put in, total", thBal: "Balance", thTotal: "Total",
        tableCopied: "Table copied ✅", csvDone: "CSV downloaded ✅",
        chartTitle: "How the money grows", legInv: "Put in", legInt: "Interest (net)", months: "months", endYear: "end of year",
        modelNote: "Estimate: a bank or a broker may accrue interest and round differently, and real returns on investments are not guaranteed. The tax rate is your parameter: check it.",
        linkCopied: "Link copied ✅", copyFailed: "Could not copy 😕", reset: "Reset ✅", example: "Example filled in ✅"
      }
    : {
        enter: "Вкажіть ставку й термін — результат зʼявиться тут.",
        missing: "Щоб порахувати, заповніть: {list}.",
        lblRate: "річну ставку", lblTerm: "термін", lblGoal: "цільову суму",
        errMoney: "Вкажіть початкову суму або щомісячний внесок (більше 0).",
        errRate: "Річна ставка має бути від 0 до 100%.",
        errTerm: "Термін — від 1 місяця до 50 років.",
        errNum: "Перевірте значення в полі «{f}».",
        errDate: "Вкажіть коректну дату старту або залиште поле порожнім.",
        errGoalLow: "Цільова сума вже досягнута початковою сумою.",
        errGoalSelf: "За цей термін сама початкова сума виросте до {a}, що вище за ціль {g}: внесок не потрібен.",
        errGoalFar: "За таких вхідних даних ціль не досягається за 100 років.",
        errGoalNoGrowth: "За нульової ставки й без внесків ціль недосяжна.",
        lblInitial: "Початкова сума", lblTop: "Щомісячний внесок", lblGrow: "Зростання внеску на рік", lblTax: "Ставка податку", lblInfl: "Очікувана інфляція",
        cur: { UAH: "грн", USD: "USD", EUR: "EUR" },
        yr: "{n} р.", mo: "{n} міс",
        mainFv: "Підсумкова сума", mainFvMini: "через {t}",
        mainTime: "Час до досягнення цілі", mainTimeMini: "підсумкова сума {f}",
        mainContrib: "Потрібний внесок щомісяця", mainContribMini: "щоб за {t} досягти {g}",
        kFinal: "Підсумкова сума", kFinalMini: "ціль {g}",
        kInv: "Ви вкладете", kInvMini: "початкова сума й внески",
        kEarn: "Зароблено (нетто)", kEarnMini: "{p}% від вкладеного",
        kEff: "Ефективна річна дохідність", kEffMini: "номінальна ставка {r}%",
        kBenefit: "Користь складних відсотків", kBenefitMini: "порівняно з простими відсотками",
        kDouble: "Капітал подвоїться за", kDoubleMini: "правило 72: ≈ {r} р.",
        kReal: "Реальна вартість після інфляції", kRealMini: "у сьогоднішніх грошах, інфляція {i}%",
        kTax: "Сплачено податку", kTaxMini: "{p}% від відсотків",
        thMonth: "Місяць", thDate: "Дата", thYear: "Рік", thTop: "Внесок", thInt: "Відсотки (нетто)", thIntCum: "Відсотки, разом", thInv: "Вкладено, разом", thBal: "Баланс", thTotal: "Разом",
        tableCopied: "Таблицю скопійовано ✅", csvDone: "CSV завантажено ✅",
        chartTitle: "Як зростають гроші", legInv: "Вкладено", legInt: "Відсотки (нетто)", months: "місяці", endYear: "кінець року",
        modelNote: "Оцінка: банк чи брокер можуть нараховувати відсотки й округлювати інакше, а реальна дохідність інвестицій не гарантована. Ставка податку — ваш параметр, перевіряйте її.",
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
  const state = { mode: "fv", freq: 12, timing: "start", tax: "none", cur: "UAH", view: "year" };
  const money = (n) => f0(n) + " " + T.cur[state.cur];
  const money2 = (n) => f2(n) + " " + T.cur[state.cur];
  const termText = (m) => {
    const y = Math.floor(m / 12), mo = m % 12;
    return [y ? fill(T.yr, { n: y }) : "", mo ? fill(T.mo, { n: mo }) : ""].filter(Boolean).join(" ") || fill(T.mo, { n: 0 });
  };

  // групування тисяч під час введення: 1000000 → 1 000 000 (EN: 1,000,000); курсор лишається біля тієї самої цифри
  const GROUP_SEP = IS_EN ? "," : " ";
  const MONEY_IDS = ["amount", "top", "goal"];
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

  // ===== модель =====
  // симуляція по місяцях; stopAt — досягнення цілі (режим «час до цілі»): повертає перше n, де баланс ≥ stopAt
  function simulate(o) {
    const { P, top, grow, rate, n, freq, timing, taxPct, stopAt } = o;
    const factor = freq === 12 ? 1 + rate / 1200 : freq === 365 ? Math.pow(1 + rate / 36500, 365 / 12) : 0;
    const per = freq >= 12 ? 1 : 12 / freq; // кількість місяців у періоді капіталізації (для рідших)
    let bal = P, inv = P, pending = 0, taxTotal = 0, grossTotal = 0, netTotal = 0;
    const rows = [];
    const flows = [-P];
    const capitalize = () => {
      const gross = r2(pending);
      const tax = r2((gross * taxPct) / 100);
      const net = r2(gross - tax);
      bal = r2(bal + net);
      taxTotal = r2(taxTotal + tax);
      grossTotal = r2(grossTotal + gross);
      netTotal = r2(netTotal + net);
      pending = 0;
      return net;
    };
    let reachedAt = 0;
    for (let m = 1; m <= n; m++) {
      const topM = top > 0 ? r2(top * Math.pow(1 + grow / 100, Math.floor((m - 1) / 12))) : 0;
      if (timing === "start" && topM > 0) {
        bal = r2(bal + topM);
        inv = r2(inv + topM);
      }
      let netM = 0;
      if (freq >= 12) {
        const gross = r2(bal * (factor - 1));
        const tax = r2((gross * taxPct) / 100);
        netM = r2(gross - tax);
        bal = r2(bal + netM);
        grossTotal = r2(grossTotal + gross);
        taxTotal = r2(taxTotal + tax);
        netTotal = r2(netTotal + netM);
      } else {
        pending += (bal * rate) / 1200;
        if (m % per === 0 || m === n) netM = capitalize();
      }
      if (timing === "end" && topM > 0) {
        bal = r2(bal + topM);
        inv = r2(inv + topM);
      }
      rows.push({ m, top: topM, interest: netM, inv, balance: bal, cumInt: r2(bal - inv) });
      // грошовий потік для IRR: внесок на початку місяця (індекс m−1) або в кінці (індекс m)
      const idx = timing === "start" ? m - 1 : m;
      while (flows.length <= Math.max(idx, m)) flows.push(0);
      flows[idx] -= topM;
      if (stopAt && !reachedAt && bal >= stopAt) {
        reachedAt = m;
        break;
      }
    }
    const nUsed = rows.length;
    while (flows.length <= nUsed) flows.push(0);
    flows[nUsed] += bal;
    return { rows, bal, inv, taxTotal, grossTotal, netTotal, flows, n: nUsed, reachedAt };
  }

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

  // ===== розрахунок =====
  function compute() {
    const mode = state.mode;
    // обовʼязкові поля залежно від режиму
    const miss = [];
    if (blank("rate")) miss.push(T.lblRate);
    if (mode !== "time" && blank("years") && blank("months")) miss.push(T.lblTerm);
    if (mode !== "fv" && blank("goal")) miss.push(T.lblGoal);
    if (miss.length) {
      const any = ["amount", "top", "rate", "years", "months", "goal"].some((id) => !blank(id));
      return { ok: false, none: !any, msg: any ? fill(T.missing, { list: miss.join(", ") }) : "" };
    }
    const rate = num(el("rate").value);
    if (!(rate >= 0 && rate <= 100)) return { ok: false, msg: T.errRate };
    const P = opt("amount", T.lblInitial, 0, 1e10), top = mode === "contrib" ? { v: 0, given: false } : opt("top", T.lblTop, 0, 1e9), grow = opt("topG", T.lblGrow, 0, 100);
    const goal = mode === "fv" ? { v: 0 } : opt("goal", T.lblGoal, 0.01, 1e12);
    for (const x of [P, top, grow, goal]) if (x.err) return { ok: false, msg: x.err };
    let taxPct = 0;
    if (state.tax === "std") taxPct = 23;
    else if (state.tax === "custom") {
      if (blank("taxRate")) return { ok: false, msg: fill(T.missing, { list: T.lblTax.toLowerCase() }) };
      const t = opt("taxRate", T.lblTax, 0, 100);
      if (t.err) return { ok: false, msg: t.err };
      taxPct = t.v;
    }
    const infl = opt("infl", T.lblInfl, -50, 200);
    if (infl.err) return { ok: false, msg: infl.err };
    let start = null;
    if (!blank("start")) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(el("start").value.trim());
      start = m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
      if (!start || start.getFullYear() < 1990 || start.getFullYear() > 2100) return { ok: false, msg: T.errDate };
    }

    let n = 0;
    if (mode !== "time") {
      const y = blank("years") ? 0 : num(el("years").value), mo = blank("months") ? 0 : num(el("months").value);
      if (!(Number.isInteger(y) && y >= 0 && y <= 50) || !(Number.isInteger(mo) && mo >= 0 && mo <= 11)) return { ok: false, msg: T.errTerm };
      n = y * 12 + mo;
      if (!(n >= 1 && n <= 600)) return { ok: false, msg: T.errTerm };
    }
    const base = { P: P.v, top: top.v, grow: grow.v, rate, freq: state.freq, timing: state.timing, taxPct };

    let sim, topUsed = top.v, hitMonths = 0;
    if (mode === "fv") {
      if (!(P.v > 0 || top.v > 0)) return { ok: false, msg: T.errMoney };
      sim = simulate({ ...base, n });
    } else if (mode === "time") {
      if (!(P.v > 0 || top.v > 0)) return { ok: false, msg: T.errMoney };
      if (P.v >= goal.v) return { ok: false, msg: T.errGoalLow };
      if (rate === 0 && top.v === 0) return { ok: false, msg: T.errGoalNoGrowth };
      sim = simulate({ ...base, n: 1200, stopAt: goal.v });
      if (!sim.reachedAt) return { ok: false, msg: T.errGoalFar };
      hitMonths = sim.reachedAt;
      n = hitMonths;
    } else {
      // потрібний внесок: баланс лінійний за внеском → розвʼязуємо за двома прогонами та уточнюємо
      const A = simulate({ ...base, top: 0, n }).bal;
      if (A >= goal.v) return { ok: false, msg: fill(P.v >= goal.v ? T.errGoalLow : T.errGoalSelf, { a: money(A), g: money(goal.v) }) };
      const B = simulate({ ...base, top: 1, n }).bal - A;
      if (!(B > 0)) return { ok: false, msg: T.errGoalFar };
      let t = Math.max(0, (goal.v - A) / B);
      t = Math.ceil(t * 100) / 100;
      for (let k = 0; k < 6; k++) {
        const s = simulate({ ...base, top: t, n });
        if (s.bal >= goal.v) break;
        t = Math.ceil((t + Math.max(0.01, (goal.v - s.bal) / B)) * 100) / 100;
      }
      topUsed = t;
      sim = simulate({ ...base, top: t, n });
    }

    // порівняння з простими відсотками: відсотки лише на внесене, без капіталізації, з тим самим податком
    let simple = 0, invRun = P.v;
    for (let m = 1; m <= sim.n; m++) {
      const topM = topUsed > 0 ? r2(topUsed * Math.pow(1 + grow.v / 100, Math.floor((m - 1) / 12))) : 0;
      if (state.timing === "start") invRun += topM;
      simple += (invRun * rate) / 1200;
      if (state.timing === "end") invRun += topM;
    }
    const simpleNet = r2(simple * (1 - taxPct / 100));
    const earned = r2(sim.bal - sim.inv);
    const eff = (Math.pow(1 + irrMonthly(sim.flows), 12) - 1) * 100;
    const years = sim.n / 12;
    const real = infl.given ? r2(sim.bal / Math.pow(1 + infl.v / 100, years)) : null;
    const doubling = eff > 0 ? Math.log(2) / Math.log(1 + eff / 100) : null;
    return {
      ok: true, mode, P: P.v, top: topUsed, grow: grow.v, rate, n: sim.n, rows: sim.rows.map((x) => ({ ...x, date: start ? addMonths(start, x.m - 1) : null })), start, taxPct,
      final: sim.bal, inv: sim.inv, earned, taxTotal: sim.taxTotal, eff, doubling, rule72: rate > 0 ? 72 / rate : null,
      benefit: r2(earned - simpleNet), real, infl: infl.given ? infl.v : null, goal: goal.v, hitMonths
    };
  }

  // ===== відображення =====
  const tile = (title, value, mini, cls = "") =>
    '<div class="cmp__kpi ' + cls + '"><div class="cmp__kpiT">' + title + '</div><div class="cmp__kpiV">' + value + "</div>" + (mini ? '<div class="cmp__kpiM">' + mini + "</div>" : "") + "</div>";

  // діаграма росту: стовпці «вкладено + відсотки нетто» з осями, сіткою й підписами; до 23 міс — по місяцях, далі — по роках
  function chart(r) {
    const n = r.n, rows = r.rows;
    const idx = [];
    if (n < 24) for (let m = 1; m <= n; m++) idx.push(m - 1);
    else {
      for (let m = 12; m <= n; m += 12) idx.push(m - 1);
      if (n % 12 !== 0) idx.push(n - 1);
    }
    const byMonth = n < 24;
    const maxV = Math.max(...idx.map((i) => rows[i].balance));
    const W = 480, H = 270, L = 56, Rr = 14, Tp = 36, B = 34;
    const raw = maxV / 5, p = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((q) => q * p).find((q) => maxV / q <= 5.5);
    const top = Math.ceil(maxV / step) * step;
    const py = (v) => Tp + (1 - v / top) * (H - Tp - B);
    const compact = (v) => (v >= 1e6 ? nf(v / 1e6, v % 1e6 ? 1 : 0) + "M" : v >= 1000 ? f0(v / 1000) + "k" : String(Math.round(v)));
    let svg = '<svg class="cmp__chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + T.chartTitle + ": " + T.legInv + " " + f0(r.inv) + ", " + T.legInt + " " + f0(r.earned) + '">';
    for (let v = 0; v <= top + 1e-6; v += step) {
      svg += '<line x1="' + L + '" y1="' + py(v).toFixed(1) + '" x2="' + (W - Rr) + '" y2="' + py(v).toFixed(1) + '" stroke="' + (v === 0 ? "#c9d3e6" : "#e6ebf5") + '"/>';
      svg += '<text x="' + (L - 8) + '" y="' + (py(v) + 4).toFixed(1) + '" font-size="11" fill="#6b7280" text-anchor="end">' + (v === 0 ? "0" : compact(v)) + "</text>";
    }
    svg += '<rect x="' + L + '" y="9" width="10" height="10" rx="2" fill="#283b69"/><text x="' + (L + 15) + '" y="18" font-size="11" fill="#5b6b8c">' + T.legInv + "</text>";
    const lx = L + 28 + T.legInv.length * 5.9;
    svg += '<rect x="' + lx + '" y="9" width="10" height="10" rx="2" fill="#0f8b8d"/><text x="' + (lx + 15) + '" y="18" font-size="11" fill="#5b6b8c">' + T.legInt + "</text>";
    const slot = (W - L - Rr) / idx.length;
    const bw = Math.min(70, slot * 0.66);
    const wide = bw >= 46, many = idx.length > 8;
    idx.forEach((i, k) => {
      const cx = L + slot * k + slot / 2;
      const vI = rows[i].inv, vT = Math.max(0, rows[i].balance - rows[i].inv);
      const y0 = py(0), yI = py(vI), yT = py(vI + vT);
      svg += '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + yI.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (y0 - yI).toFixed(1) + '" fill="#283b69"/>';
      if (vT > 0.005) svg += '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + yT.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0, yI - yT).toFixed(1) + '" fill="#0f8b8d"/>';
      if (wide && !many) {
        if (y0 - yI > 18) svg += '<text x="' + cx.toFixed(1) + '" y="' + ((y0 + yI) / 2 + 4).toFixed(1) + '" font-size="12" font-weight="700" fill="#fff" text-anchor="middle">' + (vI >= 1000 ? f0(vI / 1000) + (IS_EN ? "k" : " тис.") : f0(vI)) + "</text>";
        if (yI - yT > 18) svg += '<text x="' + cx.toFixed(1) + '" y="' + ((yI + yT) / 2 + 4).toFixed(1) + '" font-size="11" font-weight="700" fill="#fff" text-anchor="middle">+' + (vT >= 1000 ? f0(vT / 1000) + (IS_EN ? "k" : " тис.") : f0(vT)) + "</text>";
      }
      const showTop = !many || k === idx.length - 1 || k % 2 === 0;
      if (showTop) svg += '<text x="' + cx.toFixed(1) + '" y="' + (yT - 7).toFixed(1) + '" font-size="' + (many ? 10 : 12) + '" font-weight="700" fill="#283b69" text-anchor="middle">' + (many ? compact(vI + vT) : f0(vI + vT)) + "</text>";
      const m = i + 1;
      const showX = idx.length <= 12 || k % Math.ceil(idx.length / 12) === 0 || k === idx.length - 1;
      if (showX) svg += '<text x="' + cx.toFixed(1) + '" y="' + (H - B + 18) + '" font-size="11" fill="#6b7280" text-anchor="middle">' + (byMonth ? m : m % 12 === 0 ? m / 12 + (IS_EN ? " yr" : " р.") : m + (IS_EN ? " mo" : " міс")) + "</text>";
    });
    svg += '<text x="' + (W - Rr) + '" y="' + (H - 4) + '" font-size="10" fill="#6b7280" text-anchor="end">' + (byMonth ? T.months : T.endYear) + "</text></svg>";
    return svg;
  }

  function scheduleHtml(r) {
    const month = state.view === "month", hasTop = r.top > 0;
    let head, rows, totalRow;
    if (month) {
      const hasDate = !!r.start;
      head = "<thead><tr><th>" + T.thMonth + "</th>" + (hasDate ? "<th>" + T.thDate + "</th>" : "") + (hasTop ? "<th>" + T.thTop + "</th>" : "") + "<th>" + T.thInt + "</th><th>" + T.thInv + "</th><th>" + T.thBal + "</th></tr></thead>";
      rows = r.rows
        .map((x) => "<tr><td>" + x.m + "</td>" + (hasDate ? '<td data-iso="' + iso(x.date) + '">' + x.date.toLocaleDateString(LOCALE) + "</td>" : "") + (hasTop ? "<td>" + f2(x.top) + "</td>" : "") + "<td>" + f2(x.interest) + "</td><td>" + f2(x.inv) + "</td><td>" + f2(x.balance) + "</td></tr>")
        .join("");
      totalRow = '<tr class="cmp__total"><td>' + T.thTotal + "</td>" + (hasDate ? "<td>—</td>" : "") + (hasTop ? "<td>" + f2(r.rows.reduce((a, x) => a + x.top, 0)) + "</td>" : "") + "<td>" + f2(r.rows.reduce((a, x) => a + x.interest, 0)) + "</td><td>—</td><td>—</td></tr>";
    } else {
      head = "<thead><tr><th>" + T.thYear + "</th><th>" + T.thInv + "</th><th>" + T.thInt + "</th><th>" + T.thIntCum + "</th><th>" + T.thBal + "</th></tr></thead>";
      const years = [];
      for (let i = 0; i < r.rows.length; i += 12) years.push(r.rows.slice(i, i + 12));
      rows = years
        .map((part, i) => {
          const last = part[part.length - 1];
          return "<tr><td>" + (i + 1) + "</td><td>" + f2(last.inv) + "</td><td>" + f2(part.reduce((a, x) => a + x.interest, 0)) + "</td><td>" + f2(last.cumInt) + "</td><td>" + f2(last.balance) + "</td></tr>";
        })
        .join("");
      totalRow = '<tr class="cmp__total"><td>' + T.thTotal + "</td><td>" + f2(r.inv) + "</td><td>" + f2(r.rows.reduce((a, x) => a + x.interest, 0)) + "</td><td>—</td><td>" + f2(r.final) + "</td></tr>";
    }
    return '<table class="cmp__tbl cmp__tbl--sch" id="scheduleTable">' + head + "<tbody>" + rows + totalRow + "</tbody></table>";
  }

  let last = null;

  function render(r) {
    const box = el("result");
    const sch = el("schedule");
    if (!r.ok) {
      last = null;
      box.innerHTML = r.none || !r.msg ? T.enter : '<div class="cmp__hintbox">' + r.msg + "</div>";
      sch.hidden = true;
      return;
    }
    last = r;
    let main;
    if (r.mode === "fv") main = tile(T.mainFv, money2(r.final), fill(T.mainFvMini, { t: termText(r.n) }), "cmp__kpi--main cmp__kpi--wide");
    else if (r.mode === "time") main = tile(T.mainTime, termText(r.hitMonths), fill(T.mainTimeMini, { f: money(r.final) }), "cmp__kpi--main cmp__kpi--wide");
    else main = tile(T.mainContrib, money2(r.top), fill(T.mainContribMini, { t: termText(r.n), g: money(r.goal) }), "cmp__kpi--main cmp__kpi--wide");
    const tiles =
      main +
      (r.mode !== "fv" ? tile(T.kFinal, money2(r.final), r.goal ? fill(T.kFinalMini, { g: money(r.goal) }) : "") : "") +
      tile(T.kInv, money(r.inv), T.kInvMini) +
      tile(T.kEarn, money(r.earned), fill(T.kEarnMini, { p: nf(r.inv > 0 ? (r.earned / r.inv) * 100 : 0, 1) })) +
      tile(T.kEff, nf(r.eff, 2) + "%", fill(T.kEffMini, { r: nf(r.rate, 2) })) +
      tile(T.kBenefit, money(r.benefit), T.kBenefitMini) +
      (r.doubling ? tile(T.kDouble, nf(r.doubling, 1) + (IS_EN ? " yr" : " р."), r.rule72 ? fill(T.kDoubleMini, { r: nf(r.rule72, 1) }) : "") : "") +
      (r.real != null ? tile(T.kReal, money(r.real), fill(T.kRealMini, { i: nf(r.infl, 1) })) : "") +
      (r.taxPct > 0 ? tile(T.kTax, money(r.taxTotal), fill(T.kTaxMini, { p: nf(r.taxPct, 1) })) : "");
    box.innerHTML = '<div class="cmp__kpis">' + tiles + '</div><div class="cmp__sub">' + T.chartTitle + "</div>" + chart(r) + '<div class="cmp__note">' + T.modelNote + "</div>";
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
    a.download = "compound-interest.csv";
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
    document.querySelectorAll("[data-freq]").forEach((b) => b.classList.toggle("is-on", Number(b.dataset.freq) === state.freq));
    document.querySelectorAll("[data-timing]").forEach((b) => b.classList.toggle("is-on", b.dataset.timing === state.timing));
    document.querySelectorAll("[data-tax]").forEach((b) => b.classList.toggle("is-on", b.dataset.tax === state.tax));
    el("taxRateWrap").hidden = state.tax !== "custom";
    el("goalWrap").hidden = state.mode === "fv";
    el("termWrap").hidden = state.mode === "time";
    el("topField").hidden = state.mode === "contrib";
    el("viewMonth").classList.toggle("is-on", state.view === "month");
    el("viewYear").classList.toggle("is-on", state.view === "year");
    const flag = { UAH: "ua", USD: "us", EUR: "eu" }[state.cur];
    el("cur_flag").src = "/assets/flags/" + flag + ".png";
    el("cur_code").textContent = state.cur;
    document.querySelectorAll("#cur_list li").forEach((li) => li.setAttribute("aria-selected", String(li.dataset.code === state.cur)));
  }

  // ===== кнопки =====
  const IDS = ["amount", "top", "topG", "rate", "years", "months", "goal", "taxRate", "infl", "start"];

  function syncChips() {
    const y = (el("years").value || "").trim(), mo = (el("months").value || "").trim();
    document.querySelectorAll("[data-years]").forEach((b) => b.classList.toggle("is-on", b.dataset.years === y && (mo === "" || mo === "0")));
  }

  function resetAll() {
    IDS.forEach((id) => (el(id).value = ""));
    Object.assign(state, { mode: "fv", freq: 12, timing: "start", tax: "none", cur: "UAH", view: "year" });
    el("moreDetails").open = false;
    applyState();
    syncChips();
    render({ ok: false, none: true });
  }

  function fillExample() {
    const v = { amount: "100000", top: "2000", topG: "", rate: "10", years: "10", months: "", goal: "", taxRate: "", infl: "", start: "" };
    IDS.forEach((id) => (el(id).value = v[id]));
    Object.assign(state, { mode: "fv", freq: 12, timing: "start", tax: "none", cur: "UAH", view: "year" });
    applyState();
    syncChips();
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
    p.set("freq", String(state.freq));
    p.set("timing", state.timing);
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
    if (["time", "contrib"].includes(q.get("mode"))) state.mode = q.get("mode");
    if ([1, 2, 4, 12, 365].includes(Number(q.get("freq")))) state.freq = Number(q.get("freq"));
    if (q.get("timing") === "end") state.timing = "end";
    if (["std", "custom"].includes(q.get("tax"))) state.tax = q.get("tax");
    if (["USD", "EUR"].includes(q.get("cur"))) state.cur = q.get("cur");
    if (["topG", "taxRate", "infl", "start"].some((id) => !blank(id)) || state.timing !== "start" || state.tax !== "none") el("moreDetails").open = true;
    return any || ["mode", "freq", "timing", "tax", "cur"].some((k) => q.has(k));
  }

  window.addEventListener("DOMContentLoaded", () => {
    IDS.forEach((id) => {
      el(id).addEventListener("input", () => {
        if (MONEY_IDS.includes(id)) groupInput(el(id));
        if (id === "years" || id === "months") syncChips();
        calc();
      });
      el(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") calc();
      });
    });
    document.querySelectorAll("[data-years]").forEach((b) =>
      b.addEventListener("click", () => {
        el("years").value = b.dataset.years;
        el("months").value = "";
        syncChips();
        calc();
      })
    );
    [["data-mode", "mode", (v) => v], ["data-freq", "freq", (v) => Number(v)], ["data-timing", "timing", (v) => v], ["data-tax", "tax", (v) => v]].forEach(([attr, key, conv]) =>
      document.querySelectorAll("[" + attr + "]").forEach((b) =>
        b.addEventListener("click", () => {
          state[key] = conv(b.getAttribute(attr));
          applyState();
          calc();
        })
      )
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
    syncChips();
    if (used) calc();
    else render({ ok: false, none: true });
  });
})();
