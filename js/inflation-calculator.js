/* inflation-calculator.js — калькулятор інфляції: історична (Україна) і за вашою ставкою (UK/EN)
   Історичні дані: помісячні індекси споживчих цін України (до попереднього місяця, %) за зведеною таблицею Мінфіну
   на основі Держстату (index.minfin.com.ua), отримані 2026-10-22; для кожного повного року добуток 12 місячних індексів
   збігається з річним значенням із точністю до 0,05 п. п. Дані треба поповнювати вручну в міру публікації нових місяців.
   Порівнюємо рівень цін у початковому та кінцевому місяцях: множник = добуток індексів місяців ПІСЛЯ початкового
   до кінцевого включно. Еквівалент = сума × множник; те, що сума вартувала б на початку = сума ÷ множник.
   Прогноз: сталa річна інфляція r, множник f = (1+r)^(місяці/12); гроші без вкладу не ростуть, вклад (необовʼязково)
   капіталізується щомісяця за номінальною ставкою без податку. Реальна дохідність = (1+ефективна)/(1+r) − 1. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const LOCALE = IS_EN ? "en-US" : "uk-UA";

  // індекси цін, % до попереднього місяця (null — даних ще немає)
  const CPI = {
    2000: [104.6, 103.3, 102.0, 101.7, 102.1, 103.7, 99.9, 100.0, 102.6, 101.4, 100.4, 101.6],
    2001: [101.5, 100.6, 100.6, 101.5, 100.4, 100.6, 98.3, 99.8, 100.4, 100.2, 100.5, 101.6],
    2002: [101.0, 98.6, 99.3, 101.4, 99.7, 98.2, 98.5, 99.8, 100.2, 100.7, 100.7, 101.4],
    2003: [101.5, 101.1, 101.1, 100.7, 100.0, 100.1, 99.9, 98.3, 100.6, 101.3, 101.9, 101.5],
    2004: [101.4, 100.4, 100.4, 100.7, 100.7, 100.7, 100.0, 99.9, 101.3, 102.2, 101.6, 102.4],
    2005: [101.7, 101.0, 101.6, 100.7, 100.6, 100.6, 100.3, 100.0, 100.4, 100.9, 101.2, 100.9],
    2006: [101.2, 101.8, 99.7, 99.6, 100.5, 100.1, 100.9, 100.0, 102.0, 102.6, 101.8, 100.9],
    2007: [100.5, 100.6, 100.2, 100.0, 100.6, 102.2, 101.4, 100.6, 102.2, 102.9, 102.2, 102.1],
    2008: [102.9, 102.7, 103.8, 103.1, 101.3, 100.8, 99.5, 99.9, 101.1, 101.7, 101.5, 102.1],
    2009: [102.9, 101.5, 101.4, 100.9, 100.5, 101.1, 99.9, 99.8, 100.8, 100.9, 101.1, 100.9],
    2010: [101.8, 101.9, 100.9, 99.7, 99.4, 99.6, 99.8, 101.2, 102.9, 100.5, 100.3, 100.8],
    2011: [101.0, 100.9, 101.4, 101.3, 100.8, 100.4, 98.7, 99.6, 100.1, 100.0, 100.1, 100.2],
    2012: [100.2, 100.2, 100.3, 100.0, 99.7, 99.7, 99.8, 99.7, 100.1, 100.0, 99.9, 100.2],
    2013: [100.2, 99.9, 100.0, 100.0, 100.1, 100.0, 99.9, 99.3, 100.0, 100.4, 100.2, 100.5],
    2014: [100.2, 100.6, 102.2, 103.3, 103.8, 101.0, 100.4, 100.8, 102.9, 102.4, 101.9, 103.0],
    2015: [103.1, 105.3, 110.8, 114.0, 102.2, 100.4, 99.0, 99.2, 102.3, 98.7, 102.0, 100.7],
    2016: [100.9, 99.6, 101.0, 103.5, 100.1, 99.8, 99.9, 99.7, 101.8, 102.8, 101.8, 100.9],
    2017: [101.1, 101.0, 101.8, 100.9, 101.3, 101.6, 100.2, 99.9, 102.0, 101.2, 100.9, 101.0],
    2018: [101.5, 100.9, 101.1, 100.8, 100.0, 100.0, 99.3, 100.0, 101.9, 101.7, 101.4, 100.8],
    2019: [101.0, 100.5, 100.9, 101.0, 100.7, 99.5, 99.4, 99.7, 100.7, 100.7, 100.1, 99.8],
    2020: [100.2, 99.7, 100.8, 100.8, 100.3, 100.2, 99.4, 99.8, 100.5, 101.0, 101.3, 100.9],
    2021: [101.3, 101.0, 101.7, 100.7, 101.3, 100.2, 100.1, 99.8, 101.2, 100.9, 100.8, 100.6],
    2022: [101.3, 101.6, 104.5, 103.1, 102.7, 103.1, 100.7, 101.1, 101.9, 102.5, 100.7, 100.7],
    2023: [100.8, 100.7, 101.5, 100.2, 100.5, 100.8, 99.4, 98.6, 100.5, 100.8, 100.5, 100.7],
    2024: [100.4, 100.3, 100.5, 100.2, 100.6, 102.2, 100.0, 100.6, 101.5, 101.8, 101.9, 101.4],
    2025: [101.2, 100.8, 101.5, 100.7, 101.3, 100.8, 99.8, 99.8, 100.3, 100.9, 100.4, 100.2],
    2026: [100.7, 101.0, 101.7, 101.4, 100.9, 99.9, 100.3, 100.1, 102.1, null, null, null]
  };
  const DATA_UPDATED = "22.10.2026";
  const MONTHS = IS_EN
    ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    : ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"];
  const MONTHS_LOC = ["січні", "лютому", "березні", "квітні", "травні", "червні", "липні", "серпні", "вересні", "жовтні", "листопаді", "грудні"];
  const MONTHS_GEN = ["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"];
  const FIRST_Y = 2000;
  const LAST = (() => {
    const ys = Object.keys(CPI).map(Number).sort((a, b) => b - a);
    for (const y of ys) for (let m = 12; m >= 1; m--) if (CPI[y][m - 1] != null) return { y, m };
    return { y: 2000, m: 1 };
  })();

  const T = IS_EN
    ? {
        enter: "Enter the amount — the result will appear here.",
        missing: "To calculate, fill in: {list}.",
        lblAmount: "amount", lblRate: "inflation rate", lblTerm: "term",
        errAmount: "The amount must be above 0 and not above 1 000 000 000 000.",
        errPeriod: "The end of the period must be later than the start.",
        errLast: "There is no data after {d}.",
        errRate: "Inflation must be between −50% and 1000% per year.",
        errTerm: "The term must be from 1 month to 100 years.",
        errNum: "Check the value in the field “{f}”.",
        lblTop: "Monthly top-up", lblDep: "Deposit rate",
        cur: { UAH: "UAH", USD: "USD", EUR: "EUR" },
        yr: "{n} yr", mo: "{n} mo",
        hMain: "Needed in {to}", hMainMini: "to buy what {a} bought in {from}",
        hThen: "Your sum was worth", hThenMini: "{a} in {to} equal {v} in {from}",
        hCum: "Total inflation", hCumMini: "{from} → {to}, {m} months",
        hAvg: "Average per year", hAvgMini: "compound annual rate",
        hLoss: "Loss of purchasing power", hLossMini: "of the money over the period",
        hPower: "Purchasing power of 1", hPowerMini: "unit of money from {from} to {to}",
        fMain: "Needed to keep the value", fMainMini: "for {a} to keep its purchasing power after {t}",
        fReal: "Real value of the sum", fRealMini: "{n} after {t}, loss {p}%",
        fCum: "Total inflation", fCumMini: "over {t} at {r}% per year",
        fPower: "Purchasing power of 1", fPowerMini: "unit of money after {t}",
        fDep: "Deposit balance", fDepMini: "at {d}% per year, no tax",
        fDepReal: "Real value of the deposit", fDepRealMini: "in today's money",
        fRealRet: "Real yield of the deposit", fRealRetMini: "effective yield {e}% against inflation {r}%",
        thYear: "Year", thMonths: "Months", thInfl: "Inflation", thCum: "Total index", thEq: "Equivalent of the sum", thNeed: "Needed to keep the value", thReal: "Real value", thDep: "Deposit", thDepReal: "Deposit, real", thTotal: "Total",
        tableCopied: "Table copied ✅", csvDone: "CSV downloaded ✅",
        chartHist: "Inflation by year, %", chartFc: "Real value of money by year", legIdle: "Money without a deposit", legDep: "Money on a deposit", partial: "partial period",
        modelHist: "Data: State Statistics Service of Ukraine (through the Minfin summary table), up to {d}, updated {u}. The start month is the price base, so inflation counts from the next month.",
        modelFc: "Estimate for a constant inflation rate that you set. Real inflation changes from year to year.",
        linkCopied: "Link copied ✅", copyFailed: "Could not copy 😕", reset: "Reset ✅", example: "Example filled in ✅"
      }
    : {
        enter: "Вкажіть суму — результат зʼявиться тут.",
        missing: "Щоб порахувати, заповніть: {list}.",
        lblAmount: "суму", lblRate: "інфляцію", lblTerm: "термін",
        errAmount: "Сума має бути більшою за 0 і не більшою за 1 000 000 000 000.",
        errPeriod: "Кінець періоду має бути пізніше за початок.",
        errLast: "Даних після {d} ще немає.",
        errRate: "Інфляція має бути від −50% до 1000% на рік.",
        errTerm: "Термін — від 1 місяця до 100 років.",
        errNum: "Перевірте значення в полі «{f}».",
        lblTop: "Щомісячний внесок", lblDep: "Ставка вкладу",
        cur: { UAH: "грн", USD: "USD", EUR: "EUR" },
        yr: "{n} р.", mo: "{n} міс",
        hMain: "Потрібно {toL}", hMainMini: "щоб купити те, що за {a} купували {fromL}",
        hThen: "Ваша сума вартувала", hThenMini: "{a} {toL} відповідають {v} {fromL}",
        hCum: "Накопичена інфляція", hCumMini: "{from} → {to}, {m} міс",
        hAvg: "У середньому за рік", hAvgMini: "складна річна ставка",
        hLoss: "Втрата купівельної спроможності", hLossMini: "грошей за період",
        hPower: "Купівельна спроможність 1", hPowerMini: "грошової одиниці з {fromG} по {to}",
        fMain: "Потрібно, щоб зберегти вартість", fMainMini: "щоб {a} за {t} зберегли купівельну спроможність",
        fReal: "Реальна вартість суми", fRealMini: "{n} через {t}, втрата {p}%",
        fCum: "Накопичена інфляція", fCumMini: "за {t} при {r}% на рік",
        fPower: "Купівельна спроможність 1", fPowerMini: "грошової одиниці через {t}",
        fDep: "Баланс вкладу", fDepMini: "під {d}% на рік, без податку",
        fDepReal: "Реальна вартість вкладу", fDepRealMini: "у сьогоднішніх грошах",
        fRealRet: "Реальна дохідність вкладу", fRealRetMini: "ефективна {e}% при інфляції {r}%",
        thYear: "Рік", thMonths: "Місяців", thInfl: "Інфляція", thCum: "Накопичений індекс", thEq: "Еквівалент суми", thNeed: "Потрібно для збереження вартості", thReal: "Реальна вартість", thDep: "Вклад", thDepReal: "Вклад, реальна вартість", thTotal: "Разом",
        tableCopied: "Таблицю скопійовано ✅", csvDone: "CSV завантажено ✅",
        chartHist: "Інфляція по роках, %", chartFc: "Реальна вартість грошей по роках", legIdle: "Гроші без вкладу", legDep: "Гроші на вкладі", partial: "неповний період",
        modelHist: "Дані: Держстат України (через зведену таблицю Мінфіну), до {d}, оновлено {u}. Початковий місяць — база цін, тому інфляція рахується з наступного місяця.",
        modelFc: "Оцінка для сталої інфляції, яку ви задаєте. Реальна інфляція змінюється з року в рік.",
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
  const state = { mode: "hist", cur: "UAH" };
  const money = (n) => f0(n) + " " + T.cur[state.cur];
  const money2 = (n) => f2(n) + " " + T.cur[state.cur];
  const termText = (m) => {
    const y = Math.floor(m / 12), mo = m % 12;
    return [y ? fill(T.yr, { n: y }) : "", mo ? fill(T.mo, { n: mo }) : ""].filter(Boolean).join(" ") || fill(T.mo, { n: 0 });
  };
  const monthName = (y, m) => (IS_EN ? MONTHS[m - 1] : MONTHS[m - 1].toLowerCase()) + " " + y;
  const monthLoc = (y, m) => (IS_EN ? "in " : "у ") + (IS_EN ? MONTHS[m - 1] : MONTHS_LOC[m - 1]) + " " + y;
  const monthGen = (y, m) => (IS_EN ? MONTHS[m - 1] : MONTHS_GEN[m - 1]) + " " + y;
  const pct = (f) => (f - 1) * 100;

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

  // ===== історична модель =====
  const idxOf = (y, m) => (CPI[y] ? CPI[y][m - 1] : null);
  const pos = (y, m) => y * 12 + (m - 1);
  const lastPos = pos(LAST.y, LAST.m);
  // множник цін від початкового до кінцевого місяця (початковий — база)
  function histFactor(y1, m1, y2, m2) {
    let f = 1;
    for (let t = pos(y1, m1) + 1; t <= pos(y2, m2); t++) {
      const y = Math.floor(t / 12), m = (t % 12) + 1;
      const v = idxOf(y, m);
      if (v == null) return null;
      f *= v / 100;
    }
    return f;
  }

  function computeHist() {
    if (blank("amount")) return { ok: false, none: true, msg: "" };
    const A = num(el("amount").value);
    if (!(A > 0 && A <= 1e12)) return { ok: false, msg: T.errAmount };
    const y1 = +el("fromY").value, m1 = +el("fromM").value, y2 = +el("toY").value, m2 = +el("toM").value;
    if (pos(y2, m2) > lastPos) return { ok: false, msg: fill(T.errLast, { d: monthGen(LAST.y, LAST.m) }) };
    if (pos(y2, m2) <= pos(y1, m1)) return { ok: false, msg: T.errPeriod };
    const f = histFactor(y1, m1, y2, m2);
    if (f == null) return { ok: false, msg: fill(T.errLast, { d: monthGen(LAST.y, LAST.m) }) };
    const months = pos(y2, m2) - pos(y1, m1);
    // рядки по роках: частина року, що потрапила в період
    const rows = [];
    let cum = 1;
    for (let y = y1; y <= y2; y++) {
      const mStart = y === y1 ? m1 + 1 : 1;
      const mEnd = y === y2 ? m2 : 12;
      let fy = 1, cnt = 0;
      for (let m = mStart; m <= mEnd; m++) {
        if (m > 12) continue;
        fy *= idxOf(y, m) / 100;
        cnt++;
      }
      if (!cnt) continue;
      cum *= fy;
      rows.push({ year: y, months: cnt, infl: pct(fy), cum, eq: r2(A * cum), partial: cnt < 12 });
    }
    return { ok: true, mode: "hist", A, y1, m1, y2, m2, f, months, rows, eq: r2(A * f), then: r2(A / f), cumPct: pct(f), avg: (Math.pow(f, 12 / months) - 1) * 100, loss: (1 - 1 / f) * 100, power: 1 / f };
  }

  // ===== прогноз =====
  function computeFc() {
    const miss = [];
    if (blank("amount")) miss.push(T.lblAmount);
    if (blank("rate")) miss.push(T.lblRate);
    if (blank("years") && blank("months")) miss.push(T.lblTerm);
    if (miss.length) {
      const any = ["amount", "rate", "years", "months", "top", "dep"].some((id) => !blank(id));
      return { ok: false, none: !any, msg: any ? fill(T.missing, { list: miss.join(", ") }) : "" };
    }
    const A = num(el("amount").value);
    if (!(A > 0 && A <= 1e12)) return { ok: false, msg: T.errAmount };
    const rate = num(el("rate").value);
    if (!(rate >= -50 && rate <= 1000)) return { ok: false, msg: T.errRate };
    const y = blank("years") ? 0 : num(el("years").value), mo = blank("months") ? 0 : num(el("months").value);
    if (!(Number.isInteger(y) && y >= 0 && y <= 100) || !(Number.isInteger(mo) && mo >= 0 && mo <= 11)) return { ok: false, msg: T.errTerm };
    const n = y * 12 + mo;
    if (!(n >= 1 && n <= 1200)) return { ok: false, msg: T.errTerm };
    const top = opt("top", T.lblTop, 0, 1e9), dep = opt("dep", T.lblDep, 0, 100);
    for (const x of [top, dep]) if (x.err) return { ok: false, msg: x.err };
    const r = rate / 100;
    const fm = Math.pow(1 + r, 1 / 12);
    let idle = A, bal = A, f = 1;
    const rows = [];
    for (let m = 1; m <= n; m++) {
      if (top.v > 0) {
        idle = r2(idle + top.v);
        bal = r2(bal + top.v);
      }
      if (dep.given) bal = r2(bal + r2((bal * dep.v) / 1200));
      f *= fm;
      rows.push({ m, cum: f, idle, idleReal: r2(idle / f), need: r2(A * f), bal, balReal: r2(bal / f) });
    }
    const fN = Math.pow(1 + r, n / 12);
    const effDep = dep.given ? (Math.pow(1 + dep.v / 1200, 12) - 1) * 100 : 0;
    return {
      ok: true, mode: "fc", A, rate, n, top: top.v, dep: dep.given ? dep.v : null, rows, f: fN, need: r2(A * fN), idle, idleReal: r2(idle / fN), loss: (1 - 1 / fN) * 100, cumPct: pct(fN),
      power: 1 / fN, bal, balReal: r2(bal / fN), effDep, realRet: dep.given ? ((1 + effDep / 100) / (1 + r) - 1) * 100 : null
    };
  }

  // ===== відображення =====
  const tile = (title, value, mini, cls = "") =>
    '<div class="inf__kpi ' + cls + '"><div class="inf__kpiT">' + title + '</div><div class="inf__kpiV">' + value + "</div>" + (mini ? '<div class="inf__kpiM">' + mini + "</div>" : "") + "</div>";

  const compact = (v) => (Math.abs(v) >= 1e6 ? nf(v / 1e6, Math.abs(v) % 1e6 ? 1 : 0) + "M" : Math.abs(v) >= 1000 ? f0(v / 1000) + "k" : String(Math.round(v)));
  const niceStep = (range, want = 5) => {
    const raw = range / want, p = Math.pow(10, Math.floor(Math.log10(raw || 1)));
    return [1, 2, 2.5, 5, 10].map((q) => q * p).find((q) => range / q <= want + 0.5) || p;
  };

  // діаграма річної інфляції (стовпці від нуля, є від'ємні значення)
  function chartHist(r) {
    const vals = r.rows.map((x) => x.infl);
    const hi = Math.max(...vals, 0), lo = Math.min(...vals, 0);
    const W = 480, H = 270, L = 50, Rr = 14, Tp = 36, B = 34;
    const step = niceStep(hi - lo || 1);
    const top = Math.ceil(hi / step) * step, bot = Math.floor(lo / step) * step;
    const py = (v) => Tp + (1 - (v - bot) / (top - bot || 1)) * (H - Tp - B);
    let svg = '<svg class="inf__chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + T.chartHist + '">';
    for (let v = bot; v <= top + 1e-9; v += step) {
      svg += '<line x1="' + L + '" y1="' + py(v).toFixed(1) + '" x2="' + (W - Rr) + '" y2="' + py(v).toFixed(1) + '" stroke="' + (Math.abs(v) < 1e-9 ? "#9aa6c2" : "#e6ebf5") + '"/>';
      svg += '<text x="' + (L - 8) + '" y="' + (py(v) + 4).toFixed(1) + '" font-size="11" fill="#6b7280" text-anchor="end">' + (Math.abs(v) < 1e-9 ? "0" : nf(v, step < 1 ? 1 : 0) + "%") + "</text>";
    }
    svg += '<text x="' + L + '" y="18" font-size="11" fill="#5b6b8c">' + T.chartHist + "</text>";
    const n = vals.length, slot = (W - L - Rr) / n, bw = Math.min(46, slot * 0.66), many = n > 12;
    r.rows.forEach((x, k) => {
      const cx = L + slot * k + slot / 2, y0 = py(0), y1 = py(x.infl);
      svg += '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + Math.min(y0, y1).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(1, Math.abs(y1 - y0)).toFixed(1) + '" fill="' + (x.infl < 0 ? "#0f8b8d" : "#283b69") + '"' + (x.partial ? ' opacity=".55"' : "") + "/>";
      if (!many || k % 2 === 0 || k === n - 1) svg += '<text x="' + cx.toFixed(1) + '" y="' + (x.infl >= 0 ? y1 - 5 : y1 + 13).toFixed(1) + '" font-size="' + (many ? 9 : 11) + '" font-weight="700" fill="#283b69" text-anchor="middle">' + nf(x.infl, 1) + "</text>";
      if (!many || k % 2 === 0 || k === n - 1) svg += '<text x="' + cx.toFixed(1) + '" y="' + (H - B + 16) + '" font-size="' + (many ? 10 : 11) + '" fill="#6b7280" text-anchor="middle">' + x.year + (x.partial ? "*" : "") + "</text>";
    });
    svg += "</svg>";
    return svg + (r.rows.some((x) => x.partial) ? '<div class="inf__hint">* ' + T.partial + "</div>" : "");
  }

  // діаграма прогнозу: реальна вартість грошей по роках (з вкладом і без нього)
  function chartFc(r) {
    const n = r.n;
    const idx = [];
    if (n < 24) for (let m = 1; m <= n; m++) idx.push(m - 1);
    else {
      for (let m = 12; m <= n; m += 12) idx.push(m - 1);
      if (n % 12 !== 0) idx.push(n - 1);
    }
    const byMonth = n < 24, hasDep = r.dep != null;
    const maxV = Math.max(...idx.map((i) => Math.max(r.rows[i].idleReal, hasDep ? r.rows[i].balReal : 0)), r.A);
    const W = 480, H = 270, L = 56, Rr = 14, Tp = 36, B = 34;
    const step = niceStep(maxV);
    const top = Math.ceil(maxV / step) * step;
    const py = (v) => Tp + (1 - v / top) * (H - Tp - B);
    let svg = '<svg class="inf__chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + T.chartFc + '">';
    for (let v = 0; v <= top + 1e-9; v += step) {
      svg += '<line x1="' + L + '" y1="' + py(v).toFixed(1) + '" x2="' + (W - Rr) + '" y2="' + py(v).toFixed(1) + '" stroke="' + (v === 0 ? "#c9d3e6" : "#e6ebf5") + '"/>';
      svg += '<text x="' + (L - 8) + '" y="' + (py(v) + 4).toFixed(1) + '" font-size="11" fill="#6b7280" text-anchor="end">' + (v === 0 ? "0" : compact(v)) + "</text>";
    }
    svg += '<rect x="' + L + '" y="9" width="10" height="10" rx="2" fill="#283b69"/><text x="' + (L + 15) + '" y="18" font-size="11" fill="#5b6b8c">' + T.legIdle + "</text>";
    if (hasDep) {
      const lx = L + 28 + T.legIdle.length * 5.9;
      svg += '<rect x="' + lx + '" y="9" width="10" height="10" rx="2" fill="#0f8b8d"/><text x="' + (lx + 15) + '" y="18" font-size="11" fill="#5b6b8c">' + T.legDep + "</text>";
    }
    const slot = (W - L - Rr) / idx.length, many = idx.length > 8;
    const bw = Math.min(hasDep ? 34 : 56, (slot * (hasDep ? 0.8 : 0.66)) / (hasDep ? 2 : 1));
    idx.forEach((i, k) => {
      const cx = L + slot * k + slot / 2, y0 = py(0);
      const bars = hasDep ? [[cx - bw, r.rows[i].idleReal, "#283b69"], [cx, r.rows[i].balReal, "#0f8b8d"]] : [[cx - bw / 2, r.rows[i].idleReal, "#283b69"]];
      bars.forEach(([x, v, c]) => {
        svg += '<rect x="' + x.toFixed(1) + '" y="' + py(v).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (y0 - py(v)).toFixed(1) + '" fill="' + c + '"/>';
        if (!many || k === idx.length - 1 || k % 2 === 0) svg += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (py(v) - 5).toFixed(1) + '" font-size="' + (many || hasDep ? 9 : 11) + '" font-weight="700" fill="' + c + '" text-anchor="middle">' + compact(v) + "</text>";
      });
      const m = i + 1;
      if (idx.length <= 12 || k % Math.ceil(idx.length / 12) === 0 || k === idx.length - 1) svg += '<text x="' + cx.toFixed(1) + '" y="' + (H - B + 16) + '" font-size="11" fill="#6b7280" text-anchor="middle">' + (byMonth ? m : m % 12 === 0 ? m / 12 + (IS_EN ? " yr" : " р.") : m + (IS_EN ? " mo" : " міс")) + "</text>";
    });
    return svg + "</svg>";
  }

  function tableHist(r) {
    const head = "<thead><tr><th>" + T.thYear + "</th><th>" + T.thMonths + "</th><th>" + T.thInfl + ", %</th><th>" + T.thCum + "</th><th>" + T.thEq + "</th></tr></thead>";
    const body = r.rows.map((x) => "<tr><td>" + x.year + (x.partial ? "*" : "") + "</td><td>" + x.months + "</td><td>" + nf(x.infl, 2) + "</td><td>" + nf(x.cum, 4) + "</td><td>" + f2(x.eq) + "</td></tr>").join("");
    const total = '<tr class="inf__total"><td>' + T.thTotal + "</td><td>" + r.months + "</td><td>" + nf(r.cumPct, 2) + "</td><td>" + nf(r.f, 4) + "</td><td>" + f2(r.eq) + "</td></tr>";
    return '<table class="inf__tbl inf__tbl--sch" id="scheduleTable">' + head + "<tbody>" + body + total + "</tbody></table>";
  }

  function tableFc(r) {
    const hasDep = r.dep != null;
    const years = [];
    const n = r.n;
    if (n < 24) for (let m = 1; m <= n; m++) years.push(m);
    else {
      for (let m = 12; m <= n; m += 12) years.push(m);
      if (n % 12 !== 0) years.push(n);
    }
    const head = "<thead><tr><th>" + (n < 24 ? T.thMonths : T.thYear) + "</th><th>" + T.thCum + "</th><th>" + T.thNeed + "</th><th>" + T.thReal + "</th>" + (hasDep ? "<th>" + T.thDep + "</th><th>" + T.thDepReal + "</th>" : "") + "</tr></thead>";
    const body = years
      .map((m) => {
        const x = r.rows[m - 1];
        return "<tr><td>" + (n < 24 ? m : m % 12 === 0 ? m / 12 : nf(m / 12, 1)) + "</td><td>" + nf(x.cum, 4) + "</td><td>" + f2(x.need) + "</td><td>" + f2(x.idleReal) + "</td>" + (hasDep ? "<td>" + f2(x.bal) + "</td><td>" + f2(x.balReal) + "</td>" : "") + "</tr>";
      })
      .join("");
    return '<table class="inf__tbl inf__tbl--sch" id="scheduleTable">' + head + "<tbody>" + body + "</tbody></table>";
  }

  let last = null;

  function render(r) {
    const box = el("result");
    const sch = el("schedule");
    if (!r.ok) {
      last = null;
      box.innerHTML = r.none || !r.msg ? T.enter : '<div class="inf__hintbox">' + r.msg + "</div>";
      sch.hidden = true;
      return;
    }
    last = r;
    let tiles, chart, note;
    if (r.mode === "hist") {
      const from = monthName(r.y1, r.m1), to = monthName(r.y2, r.m2);
      const cs = { from, to, fromL: monthLoc(r.y1, r.m1), toL: monthLoc(r.y2, r.m2), fromG: monthGen(r.y1, r.m1), toG: monthGen(r.y2, r.m2) };
      tiles =
        tile(fill(T.hMain, cs), money2(r.eq), fill(T.hMainMini, Object.assign({ a: money(r.A) }, cs)), "inf__kpi--main inf__kpi--wide") +
        tile(T.hThen, money2(r.then), fill(T.hThenMini, Object.assign({ a: money(r.A), v: money(r.then) }, cs))) +
        tile(T.hCum, nf(r.cumPct, 2) + "%", fill(T.hCumMini, { from, to, m: r.months })) +
        tile(T.hAvg, nf(r.avg, 2) + "%", T.hAvgMini) +
        tile(T.hLoss, nf(r.loss, 2) + "%", T.hLossMini) +
        tile(fill(T.hPower, {}), nf(r.power, 4), fill(T.hPowerMini, cs), "inf__kpi--wide");
      chart = chartHist(r);
      note = fill(T.modelHist, { d: monthGen(LAST.y, LAST.m), u: DATA_UPDATED });
      el("schedBody").innerHTML = tableHist(r);
    } else {
      const t = termText(r.n);
      tiles =
        tile(T.fMain, money2(r.need), fill(T.fMainMini, { a: money(r.A), t }), "inf__kpi--main inf__kpi--wide") +
        tile(T.fReal, money2(r.idleReal), fill(T.fRealMini, { n: money(r.idle), t, p: nf(r.loss, 1) })) +
        tile(T.fCum, nf(r.cumPct, 2) + "%", fill(T.fCumMini, { t, r: nf(r.rate, 2) })) +
        tile(T.fPower, nf(r.power, 4), fill(T.fPowerMini, { t }), r.dep != null ? "" : "inf__kpi--wide") +
        (r.dep != null ? tile(T.fDep, money2(r.bal), fill(T.fDepMini, { d: nf(r.dep, 2) })) + tile(T.fDepReal, money2(r.balReal), T.fDepRealMini) + tile(T.fRealRet, nf(r.realRet, 2) + "%", fill(T.fRealRetMini, { e: nf(r.effDep, 2), r: nf(r.rate, 2) })) : "");
      chart = chartFc(r);
      note = T.modelFc;
      el("schedBody").innerHTML = tableFc(r);
    }
    box.innerHTML = '<div class="inf__kpis">' + tiles + '</div><div class="inf__sub" id="chartTitle">' + (r.mode === "hist" ? T.chartHist : T.chartFc) + "</div>" + '<div class="inf__chartScroll">' + chart + "</div>" + '<div class="inf__note">' + note + "</div>";
    sch.hidden = false;
  }

  function calc() {
    render(state.mode === "hist" ? computeHist() : computeFc());
  }

  // ===== таблиця: копіювання й CSV =====
  const tableMatrix = () => {
    const t = el("scheduleTable");
    if (!t) return [];
    return Array.from(t.querySelectorAll("tr")).map((tr) => Array.from(tr.children).map((c) => c.textContent.trim()));
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
      const x = s.replace(/[\s ]/g, "").replace(/\*$/, "");
      if (/^[\d,.\-]+$/.test(x)) return IS_EN ? x.replace(/,/g, "") : x.replace(",", ".");
      return s;
    };
    const csv = "﻿" + tableMatrix().map((row) => row.map((c) => '"' + clean(c).replace(/"/g, '""') + '"').join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "inflation.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(T.csvDone);
  }

  // ===== селекти періоду =====
  function fillSelects() {
    const years = [];
    for (let y = FIRST_Y; y <= LAST.y; y++) years.push(y);
    ["fromY", "toY"].forEach((id) => (el(id).innerHTML = years.map((y) => '<option value="' + y + '">' + y + "</option>").join("")));
    ["fromM", "toM"].forEach((id) => (el(id).innerHTML = MONTHS.map((n, i) => '<option value="' + (i + 1) + '">' + n + "</option>").join("")));
    ["fromM", "toM", "fromY", "toY"].forEach(buildPicker);
  }

  // власний випадний список замість системного select (select залишається джерелом значення)
  const valueDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  let openPicker = null;
  function closePicker() {
    if (!openPicker) return;
    openPicker.list.hidden = true;
    openPicker.btn.setAttribute("aria-expanded", "false");
    openPicker = null;
  }
  function buildPicker(id) {
    const sel = el(id);
    let box = sel.nextElementSibling && sel.nextElementSibling.classList.contains("inf__pick") ? sel.nextElementSibling : null;
    const isYear = id.endsWith("Y");
    if (!box) {
      sel.classList.add("inf__selNative");
      sel.setAttribute("tabindex", "-1");
      sel.setAttribute("aria-hidden", "true");
      box = document.createElement("div");
      box.className = "inf__pick" + (isYear ? " inf__pick--year" : " inf__pick--month");
      box.innerHTML = '<button type="button" class="inf__pickBtn" id="' + id + '_btn" aria-haspopup="listbox" aria-expanded="false"><span class="inf__pickVal"></span><span class="inf__caret" aria-hidden="true"></span></button><ul class="inf__pickList" role="listbox" hidden></ul>';
      sel.after(box);
      const lab = document.querySelector('label[for="' + id + '"]');
      if (lab) lab.setAttribute("for", id + "_btn");
      Object.defineProperty(sel, "value", {
        configurable: true,
        get() {
          return valueDesc.get.call(sel);
        },
        set(v) {
          valueDesc.set.call(sel, v);
          syncPicker(id);
        }
      });
      const btn = box.querySelector("button");
      const list = box.querySelector("ul");
      const toggle = (open) => {
        if (open === !list.hidden) return;
        if (open) {
          closePicker();
          list.hidden = false;
          btn.setAttribute("aria-expanded", "true");
          openPicker = { btn, list };
          list.scrollIntoView({ block: "nearest" });
          const cur = list.querySelector('[aria-selected="true"]');
          if (cur) list.scrollTop = Math.max(0, cur.offsetTop - list.clientHeight / 2 + cur.offsetHeight / 2);
        } else closePicker();
      };
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggle(list.hidden);
        if (!list.hidden) {
          const cur = list.querySelector('[aria-selected="true"]');
          if (cur) cur.focus({ preventScroll: true });
        }
      });
      btn.addEventListener("keydown", (e) => {
        if (["ArrowDown", "ArrowUp"].includes(e.key)) {
          e.preventDefault();
          toggle(true);
          const cur = list.querySelector('[aria-selected="true"]') || list.firstElementChild;
          if (cur) cur.focus({ preventScroll: true });
        }
      });
      const pick = (li) => {
        sel.value = li.dataset.v;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
        closePicker();
        btn.focus();
      };
      list.addEventListener("click", (e) => {
        const li = e.target.closest("li[data-v]");
        if (li) pick(li);
      });
      list.addEventListener("keydown", (e) => {
        const items = [...list.children];
        const i = items.indexOf(document.activeElement);
        const cols = 1;
        const go = (n) => {
          e.preventDefault();
          const t = items[Math.max(0, Math.min(items.length - 1, n))];
          if (t) t.focus();
        };
        if (e.key === "ArrowDown") go(i + cols);
        else if (e.key === "ArrowUp") go(i - cols);
        else if (e.key === "ArrowRight") go(i + 1);
        else if (e.key === "ArrowLeft") go(i - 1);
        else if (e.key === "Home") go(0);
        else if (e.key === "End") go(items.length - 1);
        else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (i >= 0) pick(items[i]);
        } else if (e.key === "Tab") closePicker();
      });
    }
    box.querySelector("ul").innerHTML = [...sel.options].map((o) => '<li role="option" tabindex="-1" data-v="' + o.value + '">' + o.textContent + "</li>").join("");
    syncPicker(id);
  }
  function syncPicker(id) {
    const sel = el(id);
    const box = sel.nextElementSibling;
    if (!box || !box.classList.contains("inf__pick")) return;
    const o = sel.options[sel.selectedIndex];
    box.querySelector(".inf__pickVal").textContent = o ? o.textContent : "";
    box.querySelectorAll("li").forEach((li) => li.setAttribute("aria-selected", String(o != null && li.dataset.v === o.value)));
  }
  function setPeriod(y1, m1, y2, m2) {
    el("fromY").value = y1;
    el("fromM").value = m1;
    el("toY").value = y2;
    el("toM").value = m2;
  }
  function defaultPeriod() {
    setPeriod(LAST.y - 5, LAST.m, LAST.y, LAST.m);
  }
  function quick(key) {
    if (key === "war") setPeriod(2022, 2, LAST.y, LAST.m);
    else setPeriod(LAST.y - Number(key), LAST.m, LAST.y, LAST.m);
  }

  // ===== режими =====
  function applyState() {
    document.querySelectorAll("[data-mode]").forEach((b) => {
      const on = b.dataset.mode === state.mode;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", String(on));
    });
    el("histWrap").hidden = state.mode !== "hist";
    el("fcWrap").hidden = state.mode !== "fc";
    const flag = { UAH: "ua", USD: "us", EUR: "eu" }[state.cur];
    el("cur_flag").src = "/assets/flags/" + flag + ".png";
    el("cur_code").textContent = state.cur;
    document.querySelectorAll("#cur_list li").forEach((li) => li.setAttribute("aria-selected", String(li.dataset.code === state.cur)));
  }

  // ===== кнопки =====
  const IDS = ["amount", "rate", "years", "months", "top", "dep"];
  const SELS = ["fromY", "fromM", "toY", "toM"];

  function resetAll() {
    IDS.forEach((id) => (el(id).value = ""));
    defaultPeriod();
    Object.assign(state, { mode: "hist", cur: "UAH" });
    el("fcMore").open = false;
    applyState();
    render({ ok: false, none: true });
  }

  function fillExample() {
    IDS.forEach((id) => (el(id).value = ""));
    el("amount").value = "100000";
    setPeriod(2015, 1, LAST.y, LAST.m);
    Object.assign(state, { mode: "hist", cur: "UAH" });
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
    SELS.forEach((id) => p.set(id, el(id).value));
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
    SELS.forEach((id) => {
      const v = Number(q.get(id));
      if (q.has(id) && [...el(id).options].some((o) => Number(o.value) === v)) {
        el(id).value = v;
        any = true;
      }
    });
    if (q.get("mode") === "fc") state.mode = "fc";
    if (["USD", "EUR"].includes(q.get("cur"))) state.cur = q.get("cur");
    if (["top", "dep"].some((id) => !blank(id))) el("fcMore").open = true;
    return any || ["mode", "cur"].some((k) => q.has(k));
  }

  window.addEventListener("DOMContentLoaded", () => {
    fillSelects();
    defaultPeriod();
    IDS.forEach((id) => {
      el(id).addEventListener("input", () => {
        if (MONEY_IDS.includes(id)) groupInput(el(id));
        calc();
      });
      el(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") calc();
      });
    });
    SELS.forEach((id) => el(id).addEventListener("change", calc));
    document.querySelectorAll("[data-quick]").forEach((b) =>
      b.addEventListener("click", () => {
        quick(b.dataset.quick);
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
      if (!e.target.closest(".inf__pick")) closePicker();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeCur();
        if (openPicker) {
          const b = openPicker.btn;
          closePicker();
          b.focus();
        }
      }
    });

    el("calcBtn").addEventListener("click", () => {
      const r = state.mode === "hist" ? computeHist() : computeFc();
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
