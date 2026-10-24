/* pension-calculator.js — пенсійний калькулятор: державна пенсія (Україна) і власні накопичення (UK/EN)
   Державна пенсія за віком (Закон №1058-IV): П = Зп × Кс. Зп = середня зарплата для обчислення пенсій × Кз,
   Кз = зарплата ÷ середня зарплата по країні (у моделі стала протягом усього стажу), Кс = стаж у роках × 1%.
   Мінімум (2 595 грн) застосовується лише коли стажу достатньо; максимум — 10 прожиткових мінімумів (25 950 грн).
   Усі параметри закону редагуються, бо змінюються. Потрібний стаж у році досягнення віку: 60 р. — 33 (+1 щороку до 35),
   63 р. — 23 (+1 щороку до 25), 65 р. — 15.
   Накопичення: внесок на початку місяця, нарахування щомісяця за ставкою/12, щорічна індексація внесків; сума в
   сьогоднішніх грошах = номінал ÷ (1+і)^років; виплати — ануїтет у реальних грошах: реальна ставка за місяць
   (1+r/12)/(1+і_міс)−1, платіж наприкінці місяця. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const LOCALE = IS_EN ? "en-US" : "uk-UA";

  // параметри закону за замовчуванням (станом на 2026 рік; можна змінити в полях)
  const DEF = { wage: 32243, avg: 17482.87, pct: 1, min: 2595, max: 25950 };
  const LAW_YEAR = 2026;

  const T = IS_EN
    ? {
        enter: "Fill in the fields — the result will appear here.",
        missing: "To calculate, fill in: {list}.",
        lblAge: "age", lblRet: "retirement age", lblExp: "insurance experience", lblSalary: "salary", lblRate: "return",
        errAge: "Age must be a whole number from 16 to 100.",
        errRetState: "For the state pension choose 60, 63 or 65 years.",
        errRetSave: "Retirement age must be a whole number above your age, up to 100.",
        errExp: "Experience is from 0 to {max} years (not more than age minus 14).",
        errSalary: "Salary must be above 0 and up to 1,000,000,000.",
        errNum: "{f}: enter a valid number.",
        errSum: "Enter the current savings or the monthly contribution.",
        errRate: "Return must be from −50% to 100% per year.",
        errInfl: "Inflation must be from −50% to 100% per year.",
        errGrowth: "Contribution indexation must be from 0% to 100%.",
        errPay: "Payout period must be a whole number from 1 to 60 years.",
        errLaw: "Check the law parameters: {f}.",
        fxLabel: "Exchange rate, UAH per 1 {c}", lblFx: "exchange rate", errFx: "Exchange rate must be a number above 0.",
        nbuLoading: "Loading…", nbuOk: "NBU rate on {d}: {r} UAH per 1 {c}", nbuFail: "Could not load the NBU rate — enter it manually.",
        fxNote: "The law parameters and the pension are calculated in hryvnias; the amounts are converted at your rate.",
        lawAvg: "average wage for pensions", lawWage: "average wage now", lawPct: "value of a year of experience", lawMin: "minimum pension", lawMax: "maximum pension", lawReq: "required experience",
        lblSum: "savings", lblContrib: "contribution", lblGrowth: "indexation", lblInfl: "inflation", lblGoal: "desired income",
        sMain: "Estimated state pension", sMainMini: "per month, in today’s money",
        sRate: "Of your salary", sRateMini: "{p} of {s}",
        sExp: "Experience at retirement", sExpOk: "enough: {n} yr required", sExpNo: "short by {d} yr: {n} yr required",
        sKz: "Salary coefficient Kz", sKzMini: "salary {s} ÷ average {w}",
        sKs: "Experience coefficient Kc", sKsMini: "{t} yr × {p}%",
        sZp: "Wage for calculation", sZpMini: "average {a} × Kz",
        warnMin: "The calculated {raw} is below the minimum, so the minimum pension {min} is paid.",
        warnMax: "The calculated {raw} is above the cap, so {max} is paid.",
        warnNoExp: "With this experience the age pension is not assigned at {a}: the calculation below is hypothetical.",
        reqTitle: "Experience required by age", reqRow: "{a} yr: {n} yr required, you will have {h} yr — {s}", reqYes: "enough", reqNo: "not enough",
        vMain: "Retirement savings", vMainMini: "in {y} yr, contributed {c}",
        vReal: "In today’s money", vRealMini: "inflation {i}% per year",
        vContrib: "Contributed", vContribMini: "savings now + contributions",
        vEarn: "Earned", vEarnMini: "{p}% of contributions",
        vInc: "Income from savings", vIncMini: "per month for {l} yr, in today’s money",
        vState: "State pension", vStateMini: "per month, in today’s money",
        vTotal: "Total per month", vTotalMini: "{p}% of your salary",
        vNeed: "Required contribution", vNeedMini: "per month to get {g} per month",
        vGoalOk: "Goal reached: you get {g} — {x} more than needed.", vGoalNo: "The goal {g} is not reached: {x} per month is missing.",
        vNeedZero: "Your savings alone already cover the goal — no contribution is needed.",
        chartState: "Pension by years of experience", chartSave: "Savings growth by year",
        chartLegend: "Grey bars — experience is not enough to retire; yours is highlighted.",
        legIn: "Contributed", legEarn: "Earned",
        thExp: "Experience, yr", thKs: "Kc", thPen: "Pension", thPct: "% of salary", thStat: "Status",
        thYear: "Year", thAge: "Age", thYContrib: "Contributed in the year", thTContrib: "Contributed in total", thEarn: "Earned", thBal: "Balance", thReal: "In today’s money",
        modelState: "The salary is assumed to stay the same relative to the national average through the whole experience; the rules, indexation and limits may change. For an exact amount use the Pension Fund calculator.",
        modelSave: "A forecast at your constant return and inflation; real returns vary and taxes and fees are not included.",
        yr: "{n} yr", okState: "✓", noState: "✗",
        cur: { UAH: "UAH", USD: "USD", EUR: "EUR" },
        linkCopied: "Link copied ✅", copyFailed: "Could not copy 😕", reset: "Reset ✅", example: "Example filled in ✅", tableCopied: "Table copied ✅", csvDone: "CSV downloaded ✅"
      }
    : {
        enter: "Заповніть поля — результат зʼявиться тут.",
        missing: "Щоб розрахувати, заповніть: {list}.",
        lblAge: "вік", lblRet: "вік виходу на пенсію", lblExp: "страховий стаж", lblSalary: "зарплату", lblRate: "дохідність",
        errAge: "Вік — ціле число від 16 до 100.",
        errRetState: "Для державної пенсії оберіть вік 60, 63 або 65 років.",
        errRetSave: "Вік виходу на пенсію — ціле число, більше за ваш вік, до 100.",
        errExp: "Стаж — від 0 до {max} років (не більше, ніж вік мінус 14).",
        errSalary: "Зарплата — число більше 0 і до 1 000 000 000.",
        errNum: "{f}: вкажіть коректне число.",
        errSum: "Вкажіть накопичення зараз або щомісячний внесок.",
        errRate: "Дохідність — від −50% до 100% на рік.",
        errInfl: "Інфляція — від −50% до 100% на рік.",
        errGrowth: "Індексація внесків — від 0% до 100%.",
        errPay: "Тривалість виплат — ціле число від 1 до 60 років.",
        errLaw: "Перевірте параметри закону: {f}.",
        fxLabel: "Курс, грн за 1 {c}", lblFx: "курс", errFx: "Курс — число більше 0.",
        nbuLoading: "Завантажую…", nbuOk: "Курс НБУ на {d}: {r} грн за 1 {c}", nbuFail: "Не вдалося завантажити курс НБУ — введіть курс вручну.",
        fxNote: "Параметри закону й пенсія рахуються в гривнях; суми переведено за вашим курсом.",
        lawAvg: "середня зарплата для пенсій", lawWage: "середня зарплата зараз", lawPct: "оцінка року стажу", lawMin: "мінімальна пенсія", lawMax: "максимальна пенсія", lawReq: "потрібний стаж",
        lblSum: "накопичення", lblContrib: "внесок", lblGrowth: "індексація", lblInfl: "інфляція", lblGoal: "бажаний дохід",
        sMain: "Орієнтовна державна пенсія", sMainMini: "на місяць, у сьогоднішніх цінах",
        sRate: "Від вашої зарплати", sRateMini: "{p} із {s}",
        sExp: "Стаж до виходу", sExpOk: "вистачає: потрібно {n} р.", sExpNo: "бракує {d} р.: потрібно {n} р.",
        sKz: "Коефіцієнт зарплати Кз", sKzMini: "зарплата {s} ÷ середня {w}",
        sKs: "Коефіцієнт стажу Кс", sKsMini: "{t} р. × {p}%",
        sZp: "Зарплата для обчислення", sZpMini: "середня {a} × Кз",
        warnMin: "Розрахунок {raw} менший за мінімум, тому виплачується мінімальна пенсія {min}.",
        warnMax: "Розрахунок {raw} перевищує обмеження, тому виплачується {max}.",
        warnNoExp: "З таким стажем пенсію за віком у {a} не призначать: розрахунок нижче — гіпотетичний.",
        reqTitle: "Потрібний стаж за віком", reqRow: "{a} р.: потрібно {n} р., у вас буде {h} р. — {s}", reqYes: "вистачає", reqNo: "не вистачає",
        vMain: "Накопичення на пенсію", vMainMini: "через {y} р., внесли {c}",
        vReal: "У сьогоднішніх грошах", vRealMini: "інфляція {i}% на рік",
        vContrib: "Внесли", vContribMini: "накопичення зараз + внески",
        vEarn: "Заробили", vEarnMini: "{p}% до внесків",
        vInc: "Дохід з накопичень", vIncMini: "на місяць протягом {l} р., у сьогоднішніх грошах",
        vState: "Державна пенсія", vStateMini: "на місяць, у сьогоднішніх цінах",
        vTotal: "Разом на місяць", vTotalMini: "{p}% від вашої зарплати",
        vNeed: "Потрібний внесок", vNeedMini: "на місяць, щоб отримувати {g} на місяць",
        vGoalOk: "Ціль досягнута: ви отримаєте {g} — на {x} більше, ніж потрібно.", vGoalNo: "Ціль {g} не досягнута: не вистачає {x} на місяць.",
        vNeedZero: "Вам вистачає вже наявних накопичень — внесок не потрібен.",
        chartState: "Пенсія залежно від стажу", chartSave: "Ріст накопичень по роках",
        chartLegend: "Сірі стовпці — стажу недостатньо для виходу; ваш стаж виділено.",
        legIn: "Внесли", legEarn: "Заробили",
        thExp: "Стаж, р.", thKs: "Кс", thPen: "Пенсія", thPct: "% від зарплати", thStat: "Статус",
        thYear: "Рік", thAge: "Вік", thYContrib: "Внесено за рік", thTContrib: "Внесено всього", thEarn: "Заробили", thBal: "Баланс", thReal: "У сьогоднішніх грошах",
        modelState: "Розрахунок вважає, що ваша зарплата протягом усього стажу лишається такою самою відносно середньої по країні; правила, індексації й обмеження можуть змінюватись. Для точної суми скористайтеся калькулятором Пенсійного фонду.",
        modelSave: "Прогноз за вашою сталою дохідністю та інфляцією; реальна дохідність змінюється, податки й комісії не враховано.",
        yr: "{n} р.", okState: "✓", noState: "✗",
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
  const nf = (n, d) => n.toLocaleString(LOCALE, { minimumFractionDigits: d, maximumFractionDigits: d });
  const f0 = (n) => nf(n, 0);
  const f2 = (n) => nf(n, 2);
  const r2 = (x) => Math.round(x * 100) / 100;
  const state = { mode: "state", cur: "UAH" };
  const inclOn = () => !!el("incl") && el("incl").checked;
  const curEff = () => state.cur;
  const needFx = () => state.cur !== "UAH" && (state.mode === "state" || inclOn());
  const uah0 = (n) => f0(n) + " " + T.cur.UAH;
  const uah2 = (n) => f2(n) + " " + T.cur.UAH;
  const money = (n) => f0(n) + " " + T.cur[curEff()];
  const money2 = (n) => f2(n) + " " + T.cur[curEff()];
  const mAuto = (n) => (Math.abs(n) >= 1e5 ? money(n) : money2(n));
  const yrs = (n) => fill(T.yr, { n: Number.isInteger(n) ? f0(n) : nf(n, 1) });

  // групування тисяч під час введення: 1000000 → 1 000 000 (EN: 1,000,000); курсор лишається біля тієї самої цифри
  const GROUP_SEP = IS_EN ? "," : " ";
  const MONEY_IDS = ["sum", "contrib", "salary", "wageNow", "lawAvg", "lawMin", "lawMax", "goal"];
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
    if (!(v >= min && v <= max)) return { err: fill(T.errNum, { f: label }) };
    return { v, given: true };
  }
  const isInt = (x) => Number.isInteger(x);

  // ===== державна пенсія =====
  // потрібний стаж для виходу у віці age у році year
  function reqExp(age, year) {
    const d = Math.max(0, year - LAW_YEAR);
    if (age === 60) return Math.min(35, 33 + d);
    if (age === 63) return Math.min(25, 23 + d);
    return 15;
  }
  // пенсія за стажем E (років) при вже відомих Зп, оцінці року, мінімумі та максимумі
  function pensionFor(E, zp, pct, min, max, need) {
    const raw = zp * ((E * pct) / 100);
    const ok = E >= need;
    const pen = ok ? Math.min(max, Math.max(min, raw)) : Math.min(max, raw);
    return { raw, pen: r2(pen), ok };
  }

  // спільні поля віку
  function readAges(forState) {
    const miss = [];
    if (blank("age")) miss.push(T.lblAge);
    if (blank("retAge")) miss.push(T.lblRet);
    return miss;
  }

  function lawParams() {
    const wage = opt("wageNow", T.lawWage, 1, 1e9, DEF.wage);
    const avg = opt("lawAvg", T.lawAvg, 1, 1e9, DEF.avg);
    const pct = opt("lawPct", T.lawPct, 0.01, 10, DEF.pct);
    const min = opt("lawMin", T.lawMin, 0, 1e9, DEF.min);
    const max = opt("lawMax", T.lawMax, 0, 1e9, DEF.max);
    const req = opt("lawReq", T.lawReq, 0, 60, null);
    for (const x of [wage, avg, pct, min, max, req]) if (x.err) return { err: x.err };
    if (max.v < min.v) return { err: fill(T.errLaw, { f: T.lawMin + " / " + T.lawMax }) };
    return { wage: wage.v, avg: avg.v, pct: pct.v, min: min.v, max: max.v, req: req.given ? req.v : null };
  }

  function computeState() {
    const miss = readAges();
    if (blank("exp")) miss.push(T.lblExp);
    if (blank("salary")) miss.push(T.lblSalary);
    if (needFx() && blank("fx")) miss.push(T.lblFx);
    if (miss.length) {
      const any = ["age", "retAge", "exp", "salary", "fx"].some((id) => !blank(id));
      return { ok: false, none: !any, msg: any ? fill(T.missing, { list: miss.join(", ") }) : "" };
    }
    const age = num(el("age").value), ret = num(el("retAge").value);
    if (!(isInt(age) && age >= 16 && age <= 100)) return { ok: false, msg: T.errAge };
    if (![60, 63, 65].includes(ret)) return { ok: false, msg: T.errRetState };
    const exp = num(el("exp").value);
    const maxExp = Math.max(0, age - 14);
    if (!(exp >= 0 && exp <= maxExp)) return { ok: false, msg: fill(T.errExp, { max: maxExp }) };
    const salary = num(el("salary").value);
    if (!(salary > 0 && salary <= 1e9)) return { ok: false, msg: T.errSalary };
    let fx = 1;
    if (needFx()) {
      fx = num(el("fx").value);
      if (!(fx > 0 && fx <= 1e6)) return { ok: false, msg: T.errFx };
    }
    const salaryU = salary * fx;
    const law = lawParams();
    if (law.err) return { ok: false, msg: law.err };

    const togo = Math.max(0, ret - age);
    const total = exp + togo;
    const year = new Date().getFullYear() + togo;
    const need = law.req != null ? law.req : reqExp(ret, year);
    const kz = salaryU / law.wage, zp = law.avg * kz, ks = (total * law.pct) / 100;
    const p = pensionFor(total, zp, law.pct, law.min, law.max, need);
    const reqs = [60, 63, 65].map((a) => {
      const t2 = Math.max(0, a - age);
      const have = exp + t2;
      const nd = law.req != null ? law.req : reqExp(a, new Date().getFullYear() + t2);
      return { age: a, need: nd, have, ok: have >= nd };
    });
    // рядки таблиці/діаграми: стаж від 15 до 45 років + ваш
    const list = [15, 20, 25, 30, 35, 40, 45];
    const mine = Math.round(total * 10) / 10;
    if (!list.includes(mine)) list.push(mine);
    list.sort((a, b) => a - b);
    const rows = list.map((E) => {
      const q = pensionFor(E, zp, law.pct, law.min, law.max, need);
      return { exp: E, ks: (E * law.pct) / 100, pen: q.pen, penC: q.pen / fx, pct: (q.pen / salaryU) * 100, ok: q.ok, mine: E === mine };
    });
    return {
      ok: true, mode: "state", age, ret, exp, salary, salaryU, fx, cur: state.cur, law, total, need, year, kz, zp, ks, raw: r2(p.raw), pen: p.pen, penC: p.pen / fx, enough: p.ok,
      floor: p.ok && p.raw < law.min, cap: p.raw > law.max, pct: (p.pen / salaryU) * 100, short: Math.max(0, need - total), reqs, rows
    };
  }

  // ===== накопичення =====
  function simSave(sum, c, growth, rm, n) {
    let bal = sum, contrib = sum, cm = c, yc = 0;
    const rows = [];
    for (let m = 1; m <= n; m++) {
      if (m > 1 && (m - 1) % 12 === 0) cm *= 1 + growth;
      bal += cm;
      contrib += cm;
      yc += cm;
      bal *= 1 + rm;
      if (m % 12 === 0) {
        rows.push({ y: m / 12, yc, contrib, bal });
        yc = 0;
      }
    }
    return { bal, contrib, rows };
  }
  const annuityFactor = (rho, L) => (Math.abs(rho) < 1e-12 ? 1 / L : rho / (1 - Math.pow(1 + rho, -L)));

  function computeSave() {
    const miss = readAges();
    if (blank("ret")) miss.push(T.lblRate);
    const incl = inclOn();
    if (incl) {
      if (blank("exp")) miss.push(T.lblExp);
      if (blank("salary")) miss.push(T.lblSalary);
    }
    if (miss.length) {
      const any = ["age", "retAge", "sum", "contrib", "ret", "infl", "growth", "payYears", "goal", "exp", "salary"].some((id) => !blank(id));
      return { ok: false, none: !any, msg: any ? fill(T.missing, { list: miss.join(", ") }) : "" };
    }
    const age = num(el("age").value), retAge = num(el("retAge").value);
    if (!(isInt(age) && age >= 16 && age <= 100)) return { ok: false, msg: T.errAge };
    if (!(isInt(retAge) && retAge > age && retAge <= 100)) return { ok: false, msg: T.errRetSave };
    const sum = opt("sum", T.lblSum, 0, 1e12, 0), contrib = opt("contrib", T.lblContrib, 0, 1e9, 0);
    const growth = opt("growth", T.lblGrowth, 0, 100, 0), infl = opt("infl", T.lblInfl, -50, 100, 0), goal = opt("goal", T.lblGoal, 0, 1e9, 0);
    if (growth.err) return { ok: false, msg: T.errGrowth };
    if (infl.err) return { ok: false, msg: T.errInfl };
    for (const x of [sum, contrib, goal]) if (x.err) return { ok: false, msg: x.err };
    if (!(sum.v > 0 || contrib.v > 0)) return { ok: false, msg: T.errSum };
    const rate = num(el("ret").value);
    if (!(rate >= -50 && rate <= 100)) return { ok: false, msg: T.errRate };
    let payY = 20;
    if (!blank("payYears")) {
      payY = num(el("payYears").value);
      if (!(isInt(payY) && payY >= 1 && payY <= 60)) return { ok: false, msg: T.errPay };
    }
    let st = null;
    if (incl) {
      st = computeState();
      if (!st.ok) return st;
    }
    const n = (retAge - age) * 12;
    const rm = rate / 1200, im = Math.pow(1 + infl.v / 100, 1 / 12) - 1;
    const g = growth.v / 100;
    const s0 = simSave(sum.v, contrib.v, g, rm, n);
    const defl = Math.pow(1 + im, n);
    const L = payY * 12;
    const rho = (1 + rm) / (1 + im) - 1;
    const fac = annuityFactor(rho, L);
    const realBal = s0.bal / defl;
    const income = realBal * fac;
    const rows = s0.rows.map((x) => ({ age: age + x.y, y: x.y, yc: x.yc, tc: x.contrib, earn: x.bal - x.contrib, bal: x.bal, real: x.bal / Math.pow(1 + im, x.y * 12) }));
    const out = {
      ok: true, mode: "save", age, retAge, n, years: retAge - age, sum: sum.v, contrib: contrib.v, growth: growth.v, rate, infl: infl.v, payY, goal: goal.given ? goal.v : 0,
      bal: s0.bal, tc: s0.contrib, earn: s0.bal - s0.contrib, real: realBal, income, rows, st
    };
    if (st) {
      out.stateP = st.penC;
      out.total = income + st.penC;
      out.totalPct = (out.total / st.salary) * 100;
    }
    if (out.goal > 0) {
      const have = st ? st.penC : 0;
      const needReal = Math.max(0, out.goal - have);
      const base = simSave(sum.v, 0, g, rm, n).bal;
      const unit = simSave(0, 1, g, rm, n).bal;
      const balReq = (needReal / fac) * defl;
      out.need = Math.max(0, (balReq - base) / unit);
      out.reach = (st ? out.total : income) - out.goal;
    }
    return out;
  }

  // ===== відображення =====
  const tile = (title, value, mini, cls = "") =>
    '<div class="pen__kpi ' + cls + '"><div class="pen__kpiT">' + title + '</div><div class="pen__kpiV' + (String(value).length > 12 ? " pen__kpiV--s" : "") + '">' + value + "</div>" + (mini ? '<div class="pen__kpiM">' + mini + "</div>" : "") + "</div>";

  const compact = (v) => (Math.abs(v) >= 1e6 ? nf(v / 1e6, Math.abs(v) % 1e6 ? 1 : 0) + "M" : Math.abs(v) >= 1000 ? f0(v / 1000) + "k" : String(Math.round(v)));
  const barLabel = (v) => (v >= 1000 ? nf(v / 1000, v < 10000 ? 1 : 0) + "k" : String(Math.round(v)));
  const niceStep = (range, want = 5) => {
    const raw = range / want, p = Math.pow(10, Math.floor(Math.log10(raw || 1)));
    return [1, 2, 2.5, 5, 10].map((q) => q * p).find((q) => range / q <= want + 0.5) || p;
  };

  // діаграма: пенсія за стажем (стовпці), ваш стаж виділено
  function chartState(r) {
    const vals = r.rows.map((x) => x.penC);
    const maxV = Math.max(...vals, 1);
    const W = 480, H = 270, L = 56, Rr = 14, Tp = 36, B = 34;
    const step = niceStep(maxV);
    const top = Math.ceil(maxV / step) * step;
    const py = (v) => Tp + (1 - v / top) * (H - Tp - B);
    let svg = '<svg class="pen__chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + T.chartState + '">';
    for (let v = 0; v <= top + 1e-9; v += step) {
      svg += '<line x1="' + L + '" y1="' + py(v).toFixed(1) + '" x2="' + (W - Rr) + '" y2="' + py(v).toFixed(1) + '" stroke="' + (v === 0 ? "#c9d3e6" : "#e6ebf5") + '"/>';
      svg += '<text x="' + (L - 8) + '" y="' + (py(v) + 4).toFixed(1) + '" font-size="11" fill="#6b7280" text-anchor="end">' + (v === 0 ? "0" : compact(v)) + "</text>";
    }
    svg += '<text x="' + L + '" y="18" font-size="11" fill="#5b6b8c">' + T.chartState + ", " + T.cur[state.cur] + "</text>";
    const n = r.rows.length, slot = (W - L - Rr) / n, bw = Math.min(46, slot * 0.66);
    r.rows.forEach((x, k) => {
      const cx = L + slot * k + slot / 2, y0 = py(0), y1 = py(x.penC);
      const col = x.mine ? "#0f8b8d" : x.ok ? "#283b69" : "#9aa6c2";
      svg += '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + y1.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(1, y0 - y1).toFixed(1) + '" fill="' + col + '"/>';
      svg += '<text x="' + cx.toFixed(1) + '" y="' + (y1 - 5).toFixed(1) + '" font-size="11" font-weight="700" fill="' + col + '" text-anchor="middle">' + barLabel(x.penC) + "</text>";
      svg += '<text x="' + cx.toFixed(1) + '" y="' + (H - B + 16) + '" font-size="11" fill="#6b7280" text-anchor="middle">' + (Number.isInteger(x.exp) ? x.exp : nf(x.exp, 1)) + "</text>";
    });
    return svg + "</svg>" + '<div class="pen__hint">' + T.chartLegend + "</div>";
  }

  // діаграма накопичень: стовпці «внесли / заробили» по роках (стек)
  function chartSave(r) {
    const rows = r.rows;
    const maxV = Math.max(...rows.map((x) => x.bal), 1);
    const W = 480, H = 270, L = 56, Rr = 14, Tp = 36, B = 34;
    const step = niceStep(maxV);
    const top = Math.ceil(maxV / step) * step;
    const py = (v) => Tp + (1 - v / top) * (H - Tp - B);
    let svg = '<svg class="pen__chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + T.chartSave + '">';
    for (let v = 0; v <= top + 1e-9; v += step) {
      svg += '<line x1="' + L + '" y1="' + py(v).toFixed(1) + '" x2="' + (W - Rr) + '" y2="' + py(v).toFixed(1) + '" stroke="' + (v === 0 ? "#c9d3e6" : "#e6ebf5") + '"/>';
      svg += '<text x="' + (L - 8) + '" y="' + (py(v) + 4).toFixed(1) + '" font-size="11" fill="#6b7280" text-anchor="end">' + (v === 0 ? "0" : compact(v)) + "</text>";
    }
    svg += '<rect x="' + L + '" y="9" width="10" height="10" rx="2" fill="#283b69"/><text x="' + (L + 15) + '" y="18" font-size="11" fill="#5b6b8c">' + T.legIn + "</text>";
    const lx = L + 28 + T.legIn.length * 5.9;
    svg += '<rect x="' + lx + '" y="9" width="10" height="10" rx="2" fill="#0f8b8d"/><text x="' + (lx + 15) + '" y="18" font-size="11" fill="#5b6b8c">' + T.legEarn + "</text>";
    const n = rows.length, slot = (W - L - Rr) / n, bw = Math.min(40, slot * 0.72), every = Math.ceil(n / 12);
    rows.forEach((x, k) => {
      const cx = L + slot * k + slot / 2, y0 = py(0), yc = py(Math.min(x.tc, x.bal)), yb = py(x.bal);
      svg += '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + yc.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0, y0 - yc).toFixed(1) + '" fill="#283b69"/>';
      svg += '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + yb.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0, yc - yb).toFixed(1) + '" fill="#0f8b8d"/>';
      if (k % every === 0 || k === n - 1) svg += '<text x="' + cx.toFixed(1) + '" y="' + (H - B + 16) + '" font-size="11" fill="#6b7280" text-anchor="middle">' + x.age + "</text>";
    });
    svg += '<text x="' + (W - Rr) + '" y="' + (H - 4) + '" font-size="10" fill="#6b7280" text-anchor="end">' + T.thAge + "</text>";
    return svg + "</svg>";
  }

  function tableState(r) {
    const head = "<thead><tr><th>" + T.thExp + "</th><th>" + T.thKs + "</th><th>" + T.thPen + "</th><th>" + T.thPct + "</th><th>" + T.thStat + "</th></tr></thead>";
    const body = r.rows
      .map((x) => '<tr' + (x.mine ? ' class="pen__total"' : "") + "><td>" + (Number.isInteger(x.exp) ? x.exp : nf(x.exp, 1)) + "</td><td>" + nf(x.ks, 2) + "</td><td>" + f2(x.penC) + "</td><td>" + nf(x.pct, 1) + "</td><td>" + (x.ok ? T.reqYes : T.reqNo) + "</td></tr>")
      .join("");
    return '<table class="pen__tbl pen__tbl--sch" id="scheduleTable">' + head + "<tbody>" + body + "</tbody></table>";
  }
  function tableSave(r) {
    const head = "<thead><tr><th>" + T.thYear + "</th><th>" + T.thAge + "</th><th>" + T.thYContrib + "</th><th>" + T.thTContrib + "</th><th>" + T.thEarn + "</th><th>" + T.thBal + "</th><th>" + T.thReal + "</th></tr></thead>";
    const body = r.rows.map((x) => "<tr><td>" + x.y + "</td><td>" + x.age + "</td><td>" + f2(x.yc) + "</td><td>" + f2(x.tc) + "</td><td>" + f2(x.earn) + "</td><td>" + f2(x.bal) + "</td><td>" + f2(x.real) + "</td></tr>").join("");
    return '<table class="pen__tbl pen__tbl--sch" id="scheduleTable">' + head + "<tbody>" + body + "</tbody></table>";
  }

  let last = null;

  function reqList(r) {
    return (
      '<div class="pen__rq"><div class="pen__rqT">' + T.reqTitle + "</div>" +
      r.reqs.map((q) => '<div class="pen__rqRow' + (q.ok ? " is-ok" : "") + '">' + fill(T.reqRow, { a: q.age, n: q.need, h: Number.isInteger(q.have) ? f0(q.have) : nf(q.have, 1), s: q.ok ? T.reqYes + " " + T.okState : T.reqNo + " " + T.noState }) + "</div>").join("") +
      "</div>"
    );
  }

  function render(r) {
    const box = el("result");
    const sch = el("schedule");
    if (!r.ok) {
      last = null;
      box.innerHTML = r.none || !r.msg ? T.enter : '<div class="pen__hintbox">' + r.msg + "</div>";
      sch.hidden = true;
      return;
    }
    last = r;
    let tiles, chart, note, extra = "";
    if (r.mode === "state") {
      const t = Number.isInteger(r.total) ? f0(r.total) : nf(r.total, 1);
      tiles =
        tile(T.sMain, money2(r.penC), T.sMainMini, "pen__kpi--main pen__kpi--wide") +
        tile(T.sRate, nf(r.pct, 1) + "%", fill(T.sRateMini, { p: money(r.penC), s: money(r.salary) })) +
        tile(T.sExp, fill(T.yr, { n: t }), r.enough ? fill(T.sExpOk, { n: r.need }) : fill(T.sExpNo, { d: nf(r.short, 1), n: r.need })) +
        tile(T.sKz, nf(r.kz, 4), fill(T.sKzMini, { s: uah0(r.salaryU), w: uah0(r.law.wage) })) +
        tile(T.sKs, nf(r.ks, 4), fill(T.sKsMini, { t, p: nf(r.law.pct, 2) })) +
        tile(T.sZp, uah2(r.zp), fill(T.sZpMini, { a: uah2(r.law.avg) }), "pen__kpi--wide");
      if (!r.enough) extra += '<div class="pen__warn">' + fill(T.warnNoExp, { a: r.ret }) + "</div>";
      if (r.floor) extra += '<div class="pen__warn">' + fill(T.warnMin, { raw: uah2(r.raw), min: uah2(r.law.min) }) + "</div>";
      if (r.cap) extra += '<div class="pen__warn">' + fill(T.warnMax, { raw: uah2(r.raw), max: uah2(r.law.max) }) + "</div>";
      extra += reqList(r);
      if (r.cur !== "UAH") extra += '<div class="pen__hint">' + T.fxNote + "</div>";
      chart = chartState(r);
      note = T.modelState;
      el("schedBody").innerHTML = tableState(r);
    } else {
      tiles = tile(T.vMain, mAuto(r.bal), fill(T.vMainMini, { y: r.years, c: money(r.tc) }), "pen__kpi--main pen__kpi--wide");
      tiles += tile(T.vReal, mAuto(r.real), fill(T.vRealMini, { i: nf(r.infl, 2) }));
      tiles += tile(T.vInc, mAuto(r.income), fill(T.vIncMini, { l: r.payY }));
      tiles += tile(T.vContrib, mAuto(r.tc), T.vContribMini);
      tiles += tile(T.vEarn, mAuto(r.earn), fill(T.vEarnMini, { p: nf(r.tc > 0 ? (r.earn / r.tc) * 100 : 0, 1) }));
      if (r.st) {
        tiles += tile(T.vState, mAuto(r.stateP), T.vStateMini);
        tiles += tile(T.vTotal, mAuto(r.total), fill(T.vTotalMini, { p: nf(r.totalPct, 1) }));
      }
      if (r.goal > 0) {
        tiles += tile(T.vNeed, mAuto(r.need > 0 ? r.need : 0), fill(T.vNeedMini, { g: money(r.goal) }), "pen__kpi--wide");
        extra += '<div class="pen__warn' + (r.reach >= 0 ? " is-ok" : "") + '">' + (r.reach >= 0 ? fill(T.vGoalOk, { g: money(r.goal), x: money(r.reach) }) : fill(T.vGoalNo, { g: money(r.goal), x: money(-r.reach) })) + (r.need <= 0 ? " " + T.vNeedZero : "") + "</div>";
      }
      chart = chartSave(r);
      note = T.modelSave;
      el("schedBody").innerHTML = tableSave(r);
    }
    box.innerHTML = '<div class="pen__kpis">' + tiles + "</div>" + extra + '<div class="pen__sub" id="chartTitle">' + (r.mode === "state" ? T.chartState : T.chartSave) + "</div>" + '<div class="pen__chartScroll">' + chart + "</div>" + '<div class="pen__note">' + note + "</div>";
    sch.hidden = false;
  }

  const compute = () => (state.mode === "state" ? computeState() : computeSave());
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
    a.download = last.mode === "state" ? "pension-state.csv" : "pension-savings.csv";
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
    const incl = inclOn();
    el("saveWrap").hidden = state.mode !== "save";
    el("stateWrap").hidden = !(state.mode === "state" || incl);
    el("fxWrap").hidden = el("stateWrap").hidden || state.cur === "UAH";
    el("fxLabel").textContent = fill(T.fxLabel, { c: T.cur[state.cur] });
    const flag = { UAH: "ua", USD: "us", EUR: "eu" }[curEff()];
    el("cur_flag").src = "/assets/flags/" + flag + ".png";
    el("cur_code").textContent = curEff();
    document.querySelectorAll("#cur_list li").forEach((li) => li.setAttribute("aria-selected", String(li.dataset.code === state.cur)));
    document.querySelectorAll("[data-ret]").forEach((b) => b.classList.toggle("is-on", el("retAge").value.trim() === b.dataset.ret));
  }

  // ===== офіційний курс НБУ за натисненням кнопки =====
  async function fillNbuRate() {
    const code = state.cur;
    const btn = el("fxNbu");
    if (code === "UAH" || !btn || btn.disabled) return;
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = T.nbuLoading;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    try {
      const res = await fetch("https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=" + code + "&json", { cache: "no-store", signal: ctl.signal });
      if (!res.ok) throw new Error("NBU " + res.status);
      const data = await res.json();
      const row = Array.isArray(data) ? data.find((x) => String(x.cc || "").toUpperCase() === code) : null;
      const rate = Number(row && row.rate);
      if (!(rate > 0)) throw new Error("no rate");
      const r4 = Math.round(rate * 10000) / 10000;
      el("fx").value = IS_EN ? String(r4) : String(r4).replace(".", ",");
      calc();
      toast(fill(T.nbuOk, { d: (row && row.exchangedate) || "", r: nf(r4, 4), c: T.cur[code] }));
    } catch {
      toast(T.nbuFail);
    } finally {
      clearTimeout(timer);
      btn.disabled = false;
      btn.textContent = label;
    }
  }

  // ===== кнопки =====
  const IDS = ["age", "retAge", "exp", "salary", "fx", "wageNow", "lawAvg", "lawPct", "lawMin", "lawMax", "lawReq", "sum", "contrib", "growth", "ret", "infl", "payYears", "goal"];

  function resetAll() {
    IDS.forEach((id) => (el(id).value = ""));
    el("incl").checked = false;
    Object.assign(state, { mode: "state", cur: "UAH" });
    el("lawMore").open = false;
    el("saveMore").open = false;
    applyState();
    render({ ok: false, none: true });
  }

  function fillExample() {
    IDS.forEach((id) => (el(id).value = ""));
    el("incl").checked = false;
    el("age").value = "30";
    el("retAge").value = "60";
    if (state.mode === "state") {
      el("exp").value = "8";
      el("salary").value = "35000";
    } else {
      el("sum").value = "200000";
      el("contrib").value = "3000";
      el("growth").value = "5";
      el("ret").value = "12";
      el("infl").value = "7";
      el("payYears").value = "20";
      el("goal").value = "30000";
      el("saveMore").open = true;
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
    if (inclOn()) p.set("incl", "1");
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
    if (q.get("mode") === "save") state.mode = "save";
    if (["USD", "EUR"].includes(q.get("cur"))) state.cur = q.get("cur");
    if (q.get("incl") === "1") el("incl").checked = true;
    if (["wageNow", "lawAvg", "lawPct", "lawMin", "lawMax", "lawReq"].some((id) => !blank(id))) el("lawMore").open = true;
    if (["growth", "infl", "payYears", "goal"].some((id) => !blank(id))) el("saveMore").open = true;
    return any || ["mode", "cur", "incl"].some((k) => q.has(k));
  }

  window.addEventListener("DOMContentLoaded", () => {
    IDS.forEach((id) => {
      el(id).addEventListener("input", () => {
        if (MONEY_IDS.includes(id)) groupInput(el(id));
        if (id === "retAge") applyState();
        calc();
      });
      el(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") calc();
      });
    });
    el("incl").addEventListener("change", () => {
      applyState();
      calc();
    });
    document.querySelectorAll("[data-ret]").forEach((b) =>
      b.addEventListener("click", () => {
        el("retAge").value = b.dataset.ret;
        applyState();
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
    el("fxNbu").addEventListener("click", fillNbuRate);

    const used = applyFromUrl();
    groupAll();
    applyState();
    if (used) calc();
    else render({ ok: false, none: true });
  });
})();
