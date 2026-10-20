/* wheels.js — калькулятор шин і дисків (UK/EN)
   Геометрія шини (розмір W/A R):
     висота профілю = W × A / 100;  діаметр колеса = R × 25,4 + 2 × висота профілю;  окружність = π × діаметр
   Порівняння: різниця діаметра (%), зміна кліренсу (= Δдіаметра / 2), похибка спідометра (реально = показ × окружність₂ / окружність₁).
   Диск (орієнтовно, ETRTO-логіка):
     виміряний диск ≈ ширина × k(профіль) / 25,4, округлено до 0,5″ (k = 0,70 для профілю ≥ 65, 0,75 для 50–60, 0,80 для 40–45, 0,85 для ≤ 35);
     рекомендовано: від −0,5″ до +1,5″ від виміряного, допустимо з обмеженнями: від −1,0″ до +2,0″;
     ширина шини на диску ≈ номінальна + 0,4 мм на кожен мм різниці ширини диска й виміряного.
   Положення колеса: зовнішній край = ширина/2 − ET, внутрішній = ширина/2 + ET (від площини кріплення до маточини). */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const LOCALE = IS_EN ? "en-US" : "uk-UA";
  const IN = 25.4;

  const T = IS_EN
    ? {
        enter: "Enter the current tire size — the result will appear here. Add a new size to compare.",
        missing: "{size}: fill in {list}.",
        fillFirst: "Fill in the current size first.",
        size1: "Current size", size2: "New size",
        lblW: "width", lblA: "profile", lblR: "rim (R)",
        errW: "{size}: tire width must be between 100 and 450 mm.",
        errA: "{size}: profile must be between 20 and 95%.",
        errR: "{size}: rim diameter must be between 10 and 30 inches.",
        errJ: "{size}: rim width must be between 2 and 15 inches.",
        errE: "{size}: offset (ET) must be between −100 and 150 mm.",
        mm: "mm", m: "m", kmh: "km/h", km: "km", inch: "″",
        wheelDia: "Wheel diameter", sidewall: "Sidewall height", rimDia: "Rim diameter", circ: "Circumference", revs: "Revolutions per km", tireWidth: "Tire width on the rim",
        addNew: "Add a new size to compare the diameter, speedometer and wheel position.",
        verdictOkT: "Diameter difference {p} — within ±2%", verdictOkD: "Such a size is usually fitted without side effects: the speedometer and ABS/ESP keep working normally.",
        verdictWarnT: "Difference {p} — between 2% and 3%", verdictWarnD: "It may work, but check the permitted sizes in the car manual or with the manufacturer: the speedometer and ABS/ESP may deviate.",
        verdictBadT: "Difference {p} — over 3%", verdictBadD: "Not recommended: noticeable speedometer and odometer error, possible issues with ABS/ESP, the gearbox and ground clearance.",
        tblCur: "Current", tblNew: "New", tblDiff: "Difference",
        speedSub: "Speedometer and odometer",
        spShown: "Speedometer shows", spReal: "Real speed", spDiff: "Difference",
        spUnder: "The speedometer reads low: you actually drive faster than it shows.", spOver: "The speedometer reads high: you actually drive slower than it shows.", spSame: "Speedometer readings do not change.",
        odo: "100 km on the odometer = {x} km actually driven",
        rimSub: "Rim",
        rimRange: "For {s} the approximate rim width is {lo}–{hi}″ (measuring rim ≈ {rm}″).",
        rimOk: "✅ A {j}″ rim fits.", rimEdge: "⚠️ {j}″ is at the edge of the range: the tire will be stretched or squeezed, the tire maker’s approval is needed.", rimBad: "❌ {j}″ is outside the acceptable range — not recommended.",
        posSub: "Wheel position (by ET)",
        outerOut: "The outer edge of the tire moves out by {x} mm.", outerIn: "The outer edge of the tire moves in by {x} mm (more clearance to the arch).", outerSame: "The outer edge does not move.",
        innerOut: "The inner edge gets closer to the suspension by {x} mm.", innerIn: "The inner edge moves away from the suspension by {x} mm.", innerSame: "The inner edge does not move.",
        posWarn: "⚠️ Check the clearance on the car.",
        etNeed: "To see the wheel position, enter the offset (ET) for both sizes.",
        clearNote: "Ground clearance changes by half the diameter difference.",
        modelNote: "Estimate from nominal sizes. The real diameter depends on the brand, tread wear, pressure and load; rim width and ET are approximate — check them against the tire maker’s table.",
        linkCopied: "Link copied ✅", copyFailed: "Could not copy 😕", reset: "Reset ✅", example: "Example filled in ✅"
      }
    : {
        enter: "Вкажіть поточний розмір шини — результат зʼявиться тут. Додайте новий розмір, щоб порівняти.",
        missing: "{size}: заповніть {list}.",
        fillFirst: "Спочатку заповніть поточний розмір.",
        size1: "Поточний розмір", size2: "Новий розмір",
        lblW: "ширину", lblA: "профіль", lblR: "діаметр диска (R)",
        errW: "{size}: ширина шини має бути від 100 до 450 мм.",
        errA: "{size}: профіль має бути від 20 до 95%.",
        errR: "{size}: діаметр диска має бути від 10 до 30 дюймів.",
        errJ: "{size}: ширина диска має бути від 2 до 15 дюймів.",
        errE: "{size}: виніс (ET) має бути від −100 до 150 мм.",
        mm: "мм", m: "м", kmh: "км/год", km: "км", inch: "″",
        wheelDia: "Діаметр колеса", sidewall: "Висота профілю", rimDia: "Діаметр диска", circ: "Окружність", revs: "Оберти на 1 км", tireWidth: "Ширина шини на диску",
        addNew: "Додайте новий розмір, щоб порівняти діаметр, спідометр і положення колеса.",
        verdictOkT: "Різниця діаметра {p} — у межах ±2%", verdictOkD: "Такий розмір зазвичай ставлять без побічних ефектів: спідометр і ABS/ESP працюватимуть штатно.",
        verdictWarnT: "Різниця {p} — між 2% і 3%", verdictWarnD: "Може працювати, але звірте допустимі розміри в інструкції авто або у виробника: можливі відхилення спідометра й роботи ABS/ESP.",
        verdictBadT: "Різниця {p} — понад 3%", verdictBadD: "Не рекомендується: помітна похибка спідометра й одометра, можливі проблеми з ABS/ESP, коробкою та кліренсом.",
        tblCur: "Поточний", tblNew: "Новий", tblDiff: "Різниця",
        speedSub: "Спідометр і одометр",
        spShown: "Спідометр показує", spReal: "Реальна швидкість", spDiff: "Різниця",
        spUnder: "Спідометр занижує: реально ви їдете швидше, ніж він показує.", spOver: "Спідометр завищує: реально ви їдете повільніше, ніж він показує.", spSame: "Покази спідометра не змінюються.",
        odo: "100 км за одометром = {x} км реально",
        rimSub: "Диск",
        rimRange: "Для {s} орієнтовна ширина диска {lo}–{hi}″ (вимірювальний диск ≈ {rm}″).",
        rimOk: "✅ Диск {j}″ підходить.", rimEdge: "⚠️ {j}″ — на межі діапазону: шина буде розтягнута або стиснута, потрібен дозвіл виробника шини.", rimBad: "❌ {j}″ — поза допустимим діапазоном, не рекомендується.",
        posSub: "Положення колеса (за ET)",
        outerOut: "Зовнішній край шини зміститься назовні на {x} мм.", outerIn: "Зовнішній край шини зміститься всередину на {x} мм (більше зазору до арки).", outerSame: "Зовнішній край не зміщується.",
        innerOut: "Внутрішній край наблизиться до підвіски на {x} мм.", innerIn: "Внутрішній край відійде від підвіски на {x} мм.", innerSame: "Внутрішній край не зміщується.",
        posWarn: "⚠️ Перевірте зазор на авто.",
        etNeed: "Щоб побачити положення колеса, вкажіть виніс (ET) в обох розмірів.",
        clearNote: "Кліренс змінюється на половину різниці діаметрів.",
        modelNote: "Оцінка за номінальними розмірами. Реальний діаметр залежить від бренду, зносу протектора, тиску й навантаження; ширина диска та ET — орієнтовні, звіряйте з таблицею виробника шини.",
        linkCopied: "Посилання скопійовано ✅", copyFailed: "Не вдалось скопіювати 😕", reset: "Скинуто ✅", example: "Підставлено приклад ✅"
      };

  const LIM = { w: [100, 450], a: [20, 95], r: [10, 30], j: [2, 15], e: [-100, 150] };
  const SPEEDS = [50, 90, 130];

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
  const f2 = (n) => nf(n, 2);
  const f3 = (n) => nf(n, 3);
  function signed(n, d) {
    const k = Math.pow(10, d);
    const r = Math.round(n * k) / k;
    if (r === 0) return nf(0, d);
    return (r > 0 ? "+" : "−") + nf(Math.abs(r), d);
  }
  const inchTxt = (n) => nf(n, n % 1 === 0 ? 0 : 1) + T.inch;

  function toast(msg) {
    const n = el("toast");
    if (!n) return;
    n.textContent = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (n.textContent = ""), 2400);
  }

  // ===== модель =====
  function measuringRim(w, a) {
    const k = a >= 65 ? 0.7 : a >= 50 ? 0.75 : a >= 40 ? 0.8 : 0.85;
    return Math.max(3, Math.round(((w * k) / IN) * 2) / 2);
  }

  function calcSize(p) {
    const side = (p.w * p.a) / 100;
    const rimMm = p.r * IN;
    const dia = rimMm + 2 * side;
    const circ = Math.PI * dia;
    const rm = measuringRim(p.w, p.a);
    const jEff = p.j == null ? rm : p.j;
    const tw = p.w + 0.4 * (jEff - rm) * IN;
    const lo = rm - 0.5;
    const hi = rm + 1.5;
    let fit = null;
    if (p.j != null) {
      const d = p.j - rm;
      fit = d >= -0.5 && d <= 1.5 ? "ok" : d >= -1 && d <= 2 ? "edge" : "bad";
    }
    return {
      ...p, side, rimMm, dia, circ, revs: 1e6 / circ, rm, lo, hi, fit, jEff, tw,
      outer: tw / 2 - (p.et ?? 0), inner: tw / 2 + (p.et ?? 0),
      label: f0(p.w) + "/" + f0(p.a) + " R" + f0(p.r)
    };
  }

  // зчитування розміру: empty | missing | bad | ok
  function readSize(n, name) {
    const ids = { w: "w" + n, a: "a" + n, r: "r" + n, j: "j" + n, e: "e" + n };
    const used = Object.values(ids).some((id) => !blank(id));
    if (!used) return { state: "empty" };
    const miss = [];
    if (blank(ids.w)) miss.push(T.lblW);
    if (blank(ids.a)) miss.push(T.lblA);
    if (blank(ids.r)) miss.push(T.lblR);
    if (miss.length) return { state: "missing", msg: fill(T.missing, { size: name, list: miss.join(", ") }) };
    const v = { w: num(el(ids.w).value), a: num(el(ids.a).value), r: num(el(ids.r).value) };
    const inR = (x, k) => x >= LIM[k][0] && x <= LIM[k][1];
    if (!inR(v.w, "w")) return { state: "bad", msg: fill(T.errW, { size: name }) };
    if (!inR(v.a, "a")) return { state: "bad", msg: fill(T.errA, { size: name }) };
    if (!inR(v.r, "r")) return { state: "bad", msg: fill(T.errR, { size: name }) };
    v.j = null;
    v.et = null;
    if (!blank(ids.j)) {
      v.j = num(el(ids.j).value);
      if (!(v.j >= LIM.j[0] && v.j <= LIM.j[1])) return { state: "bad", msg: fill(T.errJ, { size: name }) };
    }
    if (!blank(ids.e)) {
      v.et = num(el(ids.e).value);
      if (!(v.et >= LIM.e[0] && v.et <= LIM.e[1])) return { state: "bad", msg: fill(T.errE, { size: name }) };
    }
    return { state: "ok", data: calcSize(v) };
  }

  function compute() {
    const s1 = readSize(1, T.size1);
    const s2 = readSize(2, T.size2);
    if (s1.state === "empty") {
      if (s2.state === "empty") return { ok: false, none: true };
      return { ok: false, msg: T.fillFirst };
    }
    if (s1.state !== "ok") return { ok: false, msg: s1.msg };
    if (s2.state === "empty") return { ok: true, a: s1.data, b: null };
    if (s2.state !== "ok") return { ok: false, msg: s2.msg };

    const a = s1.data;
    const b = s2.data;
    const dDia = b.dia - a.dia;
    const pct = (dDia / a.dia) * 100;
    const abs = Math.abs(pct);
    const grade = abs <= 2 ? "ok" : abs <= 3 ? "warn" : "bad";
    const ratio = b.circ / a.circ;
    const hasPos = a.et != null && b.et != null;
    return {
      ok: true, a, b, dDia, pct, grade, clearance: dDia / 2, ratio,
      speeds: SPEEDS.map((v) => ({ v, real: v * ratio })),
      odo: 100 * ratio,
      hasPos, dOuter: b.outer - a.outer, dInner: b.inner - a.inner,
      etMissing: (a.et != null) !== (b.et != null)
    };
  }

  // ===== відображення =====
  const tile = (title, value, mini, cls = "") =>
    '<div class="whl__kpi ' + cls + '"><div class="whl__kpiT">' + title + '</div><div class="whl__kpiV">' + value + "</div>" + (mini ? '<div class="whl__kpiM">' + mini + "</div>" : "") + "</div>";
  const row = (label, a, b, d) => "<tr><th>" + label + "</th><td>" + a + "</td>" + (b !== undefined ? "<td>" + b + "</td><td>" + d + "</td>" : "") + "</tr>";

  function rimLines(s) {
    let h = '<div class="whl__line">' + fill(T.rimRange, { s: s.label, lo: inchTxt(s.lo).replace(T.inch, ""), hi: inchTxt(s.hi).replace(T.inch, ""), rm: inchTxt(s.rm).replace(T.inch, "") }) + "</div>";
    if (s.fit) h += '<div class="whl__line whl__line--' + s.fit + '">' + fill(s.fit === "ok" ? T.rimOk : s.fit === "edge" ? T.rimEdge : T.rimBad, { j: inchTxt(s.j).replace(T.inch, "") }) + "</div>";
    return h;
  }

  function render(r) {
    const box = el("result");
    if (!r.ok) {
      if (r.none || !r.msg) box.innerHTML = T.enter;
      else box.innerHTML = '<div class="whl__hintbox">' + r.msg + "</div>";
      return;
    }
    const a = r.a;
    const b = r.b;

    if (!b) {
      const tiles = [
        tile(T.wheelDia, f1(a.dia) + " " + T.mm, a.label, "whl__kpi--main whl__kpi--wide"),
        tile(T.sidewall, f1(a.side) + " " + T.mm, ""),
        tile(T.rimDia, f1(a.rimMm) + " " + T.mm, f0(a.r) + T.inch),
        tile(T.circ, f3(a.circ / 1000) + " " + T.m, ""),
        tile(T.revs, f0(a.revs), ""),
        tile(T.tireWidth, f0(a.tw) + " " + T.mm, a.j != null ? inchTxt(a.j) : "")
      ];
      box.innerHTML =
        '<div class="whl__kpis">' + tiles.join("") + "</div>" +
        '<div class="whl__sub">' + T.rimSub + "</div>" + rimLines(a) +
        '<div class="whl__verdict">' + T.addNew + "</div>" +
        '<div class="whl__note">' + T.modelNote + "</div>";
      return;
    }

    const p = signed(r.pct, 2) + "%";
    const vt = r.grade === "ok" ? [T.verdictOkT, T.verdictOkD] : r.grade === "warn" ? [T.verdictWarnT, T.verdictWarnD] : [T.verdictBadT, T.verdictBadD];
    const verdict = '<div class="whl__verdict is-' + r.grade + '"><b>' + fill(vt[0], { p }) + "</b><br>" + vt[1] + "</div>";

    const tiles =
      tile(T.wheelDia, signed(r.dDia, 1) + " " + T.mm, p, "whl__kpi--wide " + (r.grade === "ok" ? "is-win" : r.grade === "bad" ? "is-lose" : "")) +
      tile(IS_EN ? "Ground clearance" : "Кліренс", signed(r.clearance, 1) + " " + T.mm, T.clearNote) +
      tile(T.circ, signed(r.pct, 2) + "%", f3(a.circ / 1000) + " → " + f3(b.circ / 1000) + " " + T.m);

    const table =
      '<table class="whl__tbl"><thead><tr><th></th><th>' + T.tblCur + "</th><th>" + T.tblNew + "</th><th>" + T.tblDiff + "</th></tr></thead><tbody>" +
      row(T.sidewall + ", " + T.mm, f1(a.side), f1(b.side), signed(b.side - a.side, 1)) +
      row(T.rimDia, f0(a.r) + T.inch, f0(b.r) + T.inch, signed(b.r - a.r, 0) + T.inch) +
      row(T.wheelDia + ", " + T.mm, f1(a.dia), f1(b.dia), signed(r.dDia, 1)) +
      row(T.circ + ", " + T.m, f3(a.circ / 1000), f3(b.circ / 1000), signed(b.circ / 1000 - a.circ / 1000, 3)) +
      row(T.revs, f0(a.revs), f0(b.revs), signed(b.revs - a.revs, 0)) +
      row(T.tireWidth + ", " + T.mm, f0(a.tw), f0(b.tw), signed(b.tw - a.tw, 0)) +
      "</tbody></table>";

    const speedNote = r.pct > 0.005 ? T.spUnder : r.pct < -0.005 ? T.spOver : T.spSame;
    const speed =
      '<div class="whl__sub">' + T.speedSub + "</div>" +
      '<table class="whl__tbl"><thead><tr><th>' + T.spShown + "</th><th>" + T.spReal + "</th><th>" + T.spDiff + "</th></tr></thead><tbody>" +
      r.speeds.map((s) => "<tr><th>" + s.v + " " + T.kmh + "</th><td>" + f1(s.real) + " " + T.kmh + "</td><td>" + signed(s.real - s.v, 1) + "</td></tr>").join("") +
      "</tbody></table>" +
      '<div class="whl__line">' + speedNote + " " + fill(T.odo, { x: f1(r.odo) }) + ".</div>";

    const rim = '<div class="whl__sub">' + T.rimSub + "</div>" + rimLines(b) + (a.fit ? rimLines(a) : "");

    let pos = "";
    if (r.hasPos) {
      const oTxt = r.dOuter > 0.5 ? fill(T.outerOut, { x: f0(r.dOuter) }) : r.dOuter < -0.5 ? fill(T.outerIn, { x: f0(-r.dOuter) }) : T.outerSame;
      const iTxt = r.dInner > 0.5 ? fill(T.innerOut, { x: f0(r.dInner) }) : r.dInner < -0.5 ? fill(T.innerIn, { x: f0(-r.dInner) }) : T.innerSame;
      const oWarn = Math.round(r.dOuter * 10) / 10 > 10;
      const iWarn = Math.round(r.dInner * 10) / 10 > 10;
      pos =
        '<div class="whl__sub">' + T.posSub + "</div>" +
        '<div class="whl__line' + (oWarn ? " whl__line--edge" : "") + '">' + oTxt + (oWarn ? " " + T.posWarn : "") + "</div>" +
        '<div class="whl__line' + (iWarn ? " whl__line--edge" : "") + '">' + iTxt + (iWarn ? " " + T.posWarn : "") + "</div>";
    } else if (r.etMissing || (a.et == null && b.et == null)) {
      pos = '<div class="whl__note">' + T.etNeed + "</div>";
    }

    box.innerHTML =
      '<div class="whl__head">' + a.label + " → " + b.label + "</div>" +
      verdict + '<div class="whl__kpis whl__mt10">' + tiles + "</div>" + table + speed + rim + pos +
      '<div class="whl__note">' + T.modelNote + "</div>";
  }

  function calc() {
    render(compute());
  }

  // ===== кнопки =====
  const IDS = ["w1", "a1", "r1", "j1", "e1", "w2", "a2", "r2", "j2", "e2"];

  function resetAll() {
    IDS.forEach((id) => el(id) && (el(id).value = ""));
    render({ ok: false, none: true });
  }

  function fillExample() {
    const v = { w1: "205", a1: "55", r1: "16", j1: "6.5", e1: "45", w2: "225", a2: "45", r2: "17", j2: "7.5", e2: "42" };
    IDS.forEach((id) => (el(id).value = IS_EN ? v[id] : v[id].replace(".", ",")));
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
    return any;
  }

  // «205/55 R16» одним рядком у полі ширини розкладається на три поля
  const SIZE_RE = /^\s*(\d{3})\s*[/\\-]\s*(\d{2})\s*(?:z?r|-)?\s*(\d{2})\s*$/i;
  function splitPasted(n) {
    const w = el("w" + n);
    const m = SIZE_RE.exec(w.value);
    if (!m) return;
    w.value = m[1];
    el("a" + n).value = m[2];
    el("r" + n).value = m[3];
  }

  window.addEventListener("DOMContentLoaded", () => {
    IDS.forEach((id) => {
      const n = el(id);
      if (!n) return;
      n.addEventListener("input", () => {
        if (id === "w1") splitPasted(1);
        if (id === "w2") splitPasted(2);
        calc();
      });
      n.addEventListener("keydown", (e) => {
        if (e.key === "Enter") calc();
      });
    });

    el("calcBtn")?.addEventListener("click", () => {
      const r = compute();
      render(r);
      if (!r.ok && r.msg) toast(r.msg);
    });
    el("shareBtn")?.addEventListener("click", share);
    el("exampleBtn")?.addEventListener("click", fillExample);
    el("resetBtn")?.addEventListener("click", () => {
      resetAll();
      toast(T.reset);
    });

    if (applyFromUrl()) calc();
    else render({ ok: false, none: true });
  });
})();
