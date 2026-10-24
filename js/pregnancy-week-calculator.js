/* pregnancy-week-calculator.js — калькулятор тижня вагітності: термін за ПДМ сьогодні або на обрану дату, розмір малюка, віхи, таблиця тижнів (UK/EN)
   Дати — цілі числа днів (UTC), тому перехід на літній/зимовий час не зсуває результат.
   Термін на дату t = t − ПДМ (тижні й дні; за замовчуванням t — сьогодні); N-й тиждень вагітності = ціла частина тижнів + 1. Інші способи (цикл, зачаття, ЕКЗ, УЗД, дата пологів), триместр і дата пологів — у калькуляторі дати пологів. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");

  const MONTHS = IS_EN
    ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    : ["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"];
  const WEEKDAYS = IS_EN
    ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    : ["неділя", "понеділок", "вівторок", "середа", "четвер", "пʼятниця", "субота"];

  // розмір малюка за тижнем: орієнтири-порівняння, не медичний термін
  const FRUIT = {
    4: ["🌱", "Макове зерня", "Poppy seed"], 5: ["🌱", "Кунжут", "Sesame seed"], 6: ["🫘", "Сочевиця", "Lentil"], 7: ["🫐", "Чорниця", "Blueberry"],
    8: ["🍓", "Малина", "Raspberry"], 9: ["🫒", "Оливка", "Olive"], 10: ["🍓", "Полуниця", "Strawberry"], 11: ["🟢", "Лайм", "Lime"],
    12: ["🟣", "Слива", "Plum"], 13: ["🍑", "Персик", "Peach"], 14: ["🍋", "Лимон", "Lemon"], 15: ["🍎", "Яблуко", "Apple"],
    16: ["🥑", "Авокадо", "Avocado"], 17: ["🍐", "Груша", "Pear"], 18: ["🫑", "Болгарський перець", "Bell pepper"], 19: ["🍅", "Помідор", "Tomato"],
    20: ["🍌", "Банан", "Banana"], 21: ["🥕", "Морква", "Carrot"], 22: ["🥒", "Огірок", "Cucumber"], 23: ["🥭", "Манго", "Mango"],
    24: ["🌽", "Качан кукурудзи", "Ear of corn"], 25: ["🥬", "Порей", "Leek"], 26: ["🥒", "Кабачок", "Zucchini"], 27: ["🥦", "Броколі", "Broccoli"],
    28: ["🍆", "Баклажан", "Eggplant"], 29: ["🎃", "Гарбуз-мускат", "Butternut squash"], 30: ["🥬", "Капуста", "Cabbage"], 31: ["🥥", "Кокос", "Coconut"],
    32: ["🥔", "Хікама", "Jicama"], 33: ["🍍", "Ананас", "Pineapple"], 34: ["🍈", "Диня-канталупа", "Cantaloupe"], 35: ["🍈", "Медова диня", "Honeydew melon"],
    36: ["🥬", "Салат ромен", "Romaine lettuce"], 37: ["🥬", "Пучок мангольду", "Bunch of Swiss chard"], 38: ["🌿", "Порей", "Leek"], 39: ["🍉", "Міні-кавун", "Mini watermelon"],
    40: ["🎃", "Маленький гарбуз", "Small pumpkin"]
  };
  const fruitOf = (w) => {
    if (w < 4) return null;
    const f = FRUIT[Math.min(40, w)];
    return { e: f[0], t: IS_EN ? f[2] : f[1] };
  };
  // ключові віхи по тижнях (загальні орієнтири)
  const MILE = {
    1: ["Початок відліку: перший день останньої менструації.", "The count starts: the first day of the last period."],
    2: ["Організм готується до овуляції.", "The body prepares for ovulation."],
    3: ["Зазвичай відбуваються овуляція й запліднення.", "Ovulation and fertilization usually happen."],
    4: ["Ембріон імплантується в матку; тест на вагітність уже може бути позитивним.", "The embryo implants in the uterus; a pregnancy test can already be positive."],
    5: ["Починають формуватися серце й нервова трубка.", "The heart and the neural tube begin to form."],
    6: ["Б'ється серце; на УЗД часто вже видно серцебиття.", "The heart beats; the heartbeat is often visible on an ultrasound."],
    7: ["Закладаються зачатки рук і ніг, швидко росте мозок.", "Limb buds appear and the brain grows quickly."],
    8: ["Формуються пальці; основні органи вже закладені.", "Fingers form; the main organs are already laid down."],
    9: ["Плід рухається, хоча мама цього ще не відчуває.", "The fetus moves, although the mother cannot feel it yet."],
    10: ["Починається фетальний період: плід росте й розвивається.", "The fetal period begins: the fetus grows and develops."],
    11: ["Голова становить майже половину довжини тіла.", "The head is almost half of the body length."],
    12: ["Нирки починають виробляти сечу, розвиваються рефлекси.", "The kidneys start producing urine and reflexes develop."],
    13: ["Завершується перший триместр.", "The first trimester ends."],
    14: ["Початок другого триместру; плід може морщити лоб і смоктати палець.", "The second trimester starts; the fetus can frown and suck a thumb."],
    15: ["Розвивається слух, міцнішає скелет.", "Hearing develops and the skeleton strengthens."],
    16: ["Мама може вперше відчути рухи (частіше це 18–20 тиждень).", "The mother may feel the first movements (more often at 18–20 weeks)."],
    17: ["Росте жирова тканина, формується мозок.", "Fat tissue grows and the brain develops."],
    18: ["Вікно анатомічного УЗД (18–22 тижні).", "The window of the anatomy scan (18–22 weeks)."],
    19: ["Шкіру вкриває первородна змазка.", "The skin is covered with vernix."],
    20: ["Середина вагітності; рухи зазвичай уже відчутні.", "The middle of pregnancy; movements are usually felt by now."],
    21: ["Рухи стають відчутнішими; плід ковтає навколоплідні води.", "Movements become stronger; the fetus swallows amniotic fluid."],
    22: ["Формуються брови й вії; зростає чутливість до дотику.", "Eyebrows and eyelashes form; sensitivity to touch grows."],
    23: ["Плід реагує на гучні звуки.", "The fetus reacts to loud sounds."],
    24: ["Розвиваються легені; близько цього терміну починається життєздатність поза маткою за допомоги лікарів.", "The lungs develop; around this time viability outside the womb with medical help begins."],
    25: ["Плід набирає вагу, формується ритм сну й неспання.", "The fetus gains weight and a sleep–wake rhythm forms."],
    26: ["Продовжують розвиватися легені.", "The lungs keep developing."],
    27: ["Завершується другий триместр.", "The second trimester ends."],
    28: ["Початок третього триместру.", "The third trimester starts."],
    29: ["Міцнішають кістки, активно росте мозок.", "Bones strengthen and the brain grows actively."],
    30: ["З цього терміну можна оформити декретну відпустку.", "From this term maternity leave can be arranged."],
    31: ["Плід швидко набирає вагу.", "The fetus gains weight quickly."],
    32: ["Нігті доходять до кінчиків пальців; плід часто займає головне передлежання.", "The nails reach the fingertips; the fetus often turns head-down."],
    33: ["Кістки черепа ще не зрослися, що полегшує пологи.", "The skull bones are not fused yet, which eases the birth."],
    34: ["Легені майже дозріли.", "The lungs are almost mature."],
    35: ["Нирки сформовані, печінка починає працювати.", "The kidneys are formed and the liver starts working."],
    36: ["Плід опускається головкою до входу в таз (може трапитись пізніше).", "The fetus drops its head toward the pelvis (this may happen later)."],
    37: ["Доношена вагітність: пологи вважаються своєчасними.", "Full term: the birth is considered timely."],
    38: ["Органи готові до життя поза маткою.", "The organs are ready for life outside the womb."],
    39: ["Плід набирає вагу; пологи можуть початися будь-коли.", "The fetus keeps gaining weight; labour can start at any time."],
    40: ["Розрахована дата пологів; лише близько 4–5% дітей народжуються точно в цей день.", "The calculated due date; only about 4–5% of babies are born exactly on it."],
    41: ["Пологи в межах норми; лікар зазвичай частіше спостерігає.", "The birth is still within the normal range; the doctor usually monitors more often."],
    42: ["Переношена вагітність: потрібне спостереження лікаря.", "Post-term pregnancy: a doctor’s monitoring is needed."]
  };
  const mileOf = (w) => (MILE[Math.max(1, Math.min(42, w))] || MILE[42])[IS_EN ? 1 : 0];

  const T = IS_EN
    ? {
        enter: "Enter a date — the result will appear here.",
        needLmp: "Enter the first day of the last period.",
        errDate: "Enter a valid date.",
        errFuture: "This date is in the future — check it.",
        errOld: "More than 42 weeks have passed since this date — check it.",
        errOn: "On the chosen date the gestational age falls outside 0–42 weeks — choose a date between the first day of the period and 42 weeks after it.",
        errOnDate: "Enter a valid date for “term on another date”.",
        nowTitle: "Gestational age now", onTitle: "Gestational age on {d}", mainMini: "week {n} of pregnancy",
        weekTitle: "This week", weekMini: "week {n} of pregnancy",
        sizeTitle: "Baby’s size", sizeMini: "a comparison, not a medical measure", sizeEarly: "too early to compare",
        mileTitle: "Week {n}", nextTitle: "Next, week {n}",
        thWeek: "Week", thDates: "Dates", thSize: "Size", thMile: "What happens",
        note: "General reference only: the sizes are comparisons and the milestones are typical, not a medical measurement. Months are obstetric (4 weeks each). The term is confirmed by your doctor.",
        wk: "{n} wk", dy: "{n} d", mo: "{n} mo",
        linkCopied: "Link copied ✅", copyFailed: "Could not copy 😕", reset: "Reset ✅", example: "Example filled in ✅", tableCopied: "Table copied ✅", csvDone: "CSV downloaded ✅", resultCopied: "Result copied ✅"
      }
    : {
        enter: "Вкажіть дату — результат зʼявиться тут.",
        needLmp: "Вкажіть перший день останньої менструації.",
        errDate: "Вкажіть коректну дату.",
        errFuture: "Ця дата в майбутньому — перевірте її.",
        errOld: "Від цієї дати минуло понад 42 тижні — перевірте її.",
        errOn: "На обрану дату термін виходить за межі 0–42 тижнів — оберіть дату між першим днем менструації й днем через 42 тижні після нього.",
        errOnDate: "Вкажіть коректну дату для «терміну на іншу дату».",
        nowTitle: "Термін зараз", onTitle: "Термін на {d}", mainMini: "{n}-й тиждень вагітності",
        weekTitle: "Цей тиждень", weekMini: "{n}-й тиждень вагітності",
        sizeTitle: "Розмір малюка", sizeMini: "порівняння, а не медичний вимір", sizeEarly: "ще надто рано для порівняння",
        mileTitle: "Тиждень {n}", nextTitle: "Далі, тиждень {n}",
        thWeek: "Тиждень", thDates: "Дати", thSize: "Розмір", thMile: "Що відбувається",
        note: "Лише загальний довідник: розміри — порівняння, а віхи — типові орієнтири, а не медичний вимір. Місяці акушерські (по 4 тижні). Термін підтверджує лікар.",
        wk: "{n} тиж", dy: "{n} дн", mo: "{n} міс",
        linkCopied: "Посилання скопійовано ✅", copyFailed: "Не вдалось скопіювати 😕", reset: "Скинуто ✅", example: "Підставлено приклад ✅", tableCopied: "Таблицю скопійовано ✅", csvDone: "CSV завантажено ✅", resultCopied: "Результат скопійовано ✅"
      };

  // ===== helpers =====
  const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : ""));
  const blank = (id) => (el(id)?.value || "").trim() === "";
  const wkd = (days) => {
    const w = Math.floor(days / 7), d = days % 7;
    return fill(T.wk, { n: w }) + (d ? " " + fill(T.dy, { n: d }) : "");
  };
  // акушерські місяці (по 4 тижні), потім тижні, потім дні: 157 днів = 5 міс 2 тиж 3 дн
  const mwd = (days) => {
    const m = Math.floor(days / 28), rest = days % 28, w = Math.floor(rest / 7), d = rest % 7;
    const parts = [];
    if (m) parts.push(fill(T.mo, { n: m }));
    if (w || (!m && !d)) parts.push(fill(T.wk, { n: w }));
    if (d) parts.push(fill(T.dy, { n: d }));
    return parts.join(" ");
  };
  function toast(msg) {
    const n = el("toast");
    if (!n) return;
    n.textContent = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (n.textContent = ""), 2400);
  }

  // ===== дати як цілі числа днів (UTC) =====
  const DAY = 86400000;
  const dnOf = (y, m, d) => Math.round(Date.UTC(y, m - 1, d) / DAY);
  function parseISO(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || "").trim());
    if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3];
    if (y < 1990 || y > 2100) return null;
    const n = dnOf(y, mo, d), chk = new Date(n * DAY);
    return chk.getUTCFullYear() === y && chk.getUTCMonth() === mo - 1 && chk.getUTCDate() === d ? n : null;
  }
  const isoOf = (n) => new Date(n * DAY).toISOString().slice(0, 10);
  const todayDn = () => {
    const t = new Date();
    return dnOf(t.getFullYear(), t.getMonth() + 1, t.getDate());
  };
  const dparts = (n) => {
    const d = new Date(n * DAY);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() };
  };
  const fmtDate = (n) => {
    const p = dparts(n);
    return IS_EN ? MONTHS[p.m] + " " + p.d + ", " + p.y : p.d + " " + MONTHS[p.m] + " " + p.y;
  };
  const fmtDay = (n) => {
    const p = dparts(n);
    return IS_EN ? MONTHS[p.m] + " " + p.d : p.d + " " + MONTHS[p.m];
  };
  const fmtRange = (a, b) => (dparts(a).y === dparts(b).y ? fmtDay(a) + " – " + fmtDate(b) : fmtDate(a) + " – " + fmtDate(b));

  // ===== розрахунок =====
  function compute() {
    const today = todayDn();
    if (blank("lmpDate")) return { ok: false, none: blank("onDate"), msg: blank("onDate") ? "" : T.needLmp };
    const lmp = parseISO(el("lmpDate").value);
    if (lmp == null) return { ok: false, msg: T.errDate };
    if (lmp > today) return { ok: false, msg: T.errFuture };
    let t = today, custom = false;
    if (!blank("onDate")) {
      const o = parseISO(el("onDate").value);
      if (o == null) return { ok: false, msg: T.errOnDate };
      t = o;
      custom = true;
    }
    const gaDays = t - lmp;
    if (!custom && gaDays > 293) return { ok: false, msg: T.errOld };
    if (gaDays < 0 || gaDays > 293) return { ok: false, msg: T.errOn };
    const week = Math.floor(gaDays / 7) + 1;
    const rows = [];
    for (let n = 1; n <= 42; n++) rows.push({ n, a: lmp + (n - 1) * 7, b: lmp + n * 7 - 1 });
    return { ok: true, t, custom, lmp, gaDays, week, rows };
  }

  // ===== відображення =====
  const tile = (title, value, mini, cls = "") =>
    '<div class="wk__kpi ' + cls + '"><div class="wk__kpiT">' + title + '</div><div class="wk__kpiV' + (String(value).length > 14 ? " wk__kpiV--s" : "") + '">' + value + "</div>" + (mini ? '<div class="wk__kpiM">' + mini + "</div>" : "") + "</div>";

  function tableHtml(r) {
    const head = "<thead><tr><th>" + T.thWeek + "</th><th>" + T.thDates + "</th><th>" + T.thSize + "</th><th>" + T.thMile + "</th></tr></thead>";
    const body = r.rows
      .map((x) => {
        const f = fruitOf(x.n);
        return "<tr" + (x.n === r.week ? ' class="wk__total"' : "") + "><td>" + x.n + "</td><td>" + fmtRange(x.a, x.b) + "</td><td>" + (f ? f.e + " " + f.t : "—") + "</td><td>" + mileOf(x.n) + "</td></tr>";
      })
      .join("");
    return '<table class="wk__tbl wk__tbl--sch" id="scheduleTable">' + head + "<tbody>" + body + "</tbody></table>";
  }

  let last = null;

  function render(r) {
    const box = el("result");
    const sch = el("schedule");
    if (!r.ok) {
      last = null;
      box.innerHTML = r.none || !r.msg ? T.enter : '<div class="wk__hintbox">' + r.msg + "</div>";
      sch.hidden = true;
      return;
    }
    last = r;
    const cur = r.rows[r.week - 1] || r.rows[41];
    const f = fruitOf(r.week);
    const title = r.custom ? fill(T.onTitle, { d: fmtDate(r.t) }) : T.nowTitle;
    const tiles =
      tile(title, mwd(r.gaDays) + ' <span class="wk__paren">(' + wkd(r.gaDays) + ")</span>", fill(T.mainMini, { n: r.week }), "wk__kpi--main wk__kpi--wide") +
      tile(T.weekTitle, fmtRange(cur.a, cur.b), fill(T.weekMini, { n: r.week }), "wk__kpi--wide") +
      '<div class="wk__kpi wk__kpi--wide wk__size"><div class="wk__sizeEmoji" aria-hidden="true">' + (f ? f.e : "🌱") + '</div><div class="wk__sizeBody"><div class="wk__kpiT">' + T.sizeTitle + '</div><div class="wk__sizeName">' + (f ? f.t : T.sizeEarly) + "</div>" + (f ? '<div class="wk__kpiM">' + T.sizeMini + "</div>" : "") + "</div></div>";
    const next = Math.min(42, r.week + 1);
    const mile =
      '<div class="wk__mile"><div class="wk__mileT">' + fill(T.mileTitle, { n: r.week }) + "</div><div>" + mileOf(r.week) + "</div>" +
      (r.week < 42 ? '<div class="wk__mileT wk__mileT--next">' + fill(T.nextTitle, { n: next }) + "</div><div>" + mileOf(next) + "</div>" : "") +
      "</div>";
    box.innerHTML = '<div class="wk__kpis">' + tiles + "</div>" + mile + '<div class="wk__note">' + T.note + "</div>";
    el("schedBody").innerHTML = tableHtml(r);
    sch.hidden = false;
  }

  function calc() {
    render(compute());
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
    a.download = "pregnancy-weeks.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(T.csvDone);
  }
  async function copyResult() {
    if (!last) return;
    const txt = (last.custom ? fill(T.onTitle, { d: fmtDate(last.t) }) : T.nowTitle) + ": " + mwd(last.gaDays) + " (" + wkd(last.gaDays) + ", " + fill(T.mainMini, { n: last.week }) + ")";
    try {
      await navigator.clipboard.writeText(txt);
      toast(T.resultCopied);
    } catch {
      toast(T.copyFailed);
    }
  }

  // ===== кнопки =====
  const IDS = ["lmpDate", "onDate"];

  function resetAll() {
    IDS.forEach((id) => (el(id).value = ""));
    el("moreDet").open = false;
    render({ ok: false, none: true });
  }

  function fillExample() {
    IDS.forEach((id) => (el(id).value = ""));
    el("lmpDate").value = isoOf(todayDn() - 22 * 7 - 3);
    calc();
    toast(T.example);
  }

  function share() {
    const p = new URLSearchParams();
    IDS.forEach((id) => {
      const v = (el(id).value || "").trim();
      if (v) p.set(id, v);
    });
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
    if (!blank("onDate")) el("moreDet").open = true;
    return any;
  }

  window.addEventListener("DOMContentLoaded", () => {
    el("lmpDate").setAttribute("max", isoOf(todayDn()));
    IDS.forEach((id) => {
      ["input", "change"].forEach((ev) => el(id).addEventListener(ev, calc));
      el(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") calc();
      });
    });
    el("copyTbl").addEventListener("click", copyTable);
    el("csvBtn").addEventListener("click", downloadCsv);
    el("calcBtn").addEventListener("click", () => {
      const r = compute();
      render(r);
      if (!r.ok && r.msg) toast(r.msg);
    });
    el("copyBtn").addEventListener("click", copyResult);
    el("exampleBtn").addEventListener("click", fillExample);
    el("resetBtn").addEventListener("click", () => {
      resetAll();
      toast(T.reset);
    });
    el("shareBtn").addEventListener("click", share);

    if (applyFromUrl()) calc();
    else render({ ok: false, none: true });
  });
})();
