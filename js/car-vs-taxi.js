/* car-vs-taxi.js — калькулятор «Власне авто чи таксі / каршеринг» (UK/EN)
   Власне авто за місяць:
     змінні витрати = поїздки × відстань × (витрата/100 × ціна енергії + обслуговування за км)
     постійні витрати = страхування/12 + паркування + кредит + ціна авто × втрата вартості%/12 + інші
   Альтернатива за місяць:
     таксі: поїздки × max(мінімальна вартість, подача + ціна за км × відстань)
     каршеринг: поїздки × (ціна за хвилину × тривалість + ціна за км × відстань)
   Точка беззбитковості: поїздок/міс = постійні витрати / (ціна поїздки альтернативи − змінні витрати власного авто за поїздку). */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const LOCALE = IS_EN ? "en-US" : "uk-UA";

  const T = IS_EN
    ? {
        enter: "Enter the trips per month, the distance, the consumption and the energy price — the result will appear here.",
        missing: "To calculate, fill in: {list}.",
        lblTrips: "trips per month", lblDist: "trip distance", lblCons: "consumption", lblPrice: "energy price",
        errTrips: "Trips per month must be between 1 and 1000.",
        errDist: "Trip distance must be between 0.5 and 500 km.",
        errCons: "Consumption is out of range.",
        errPrice: "Energy price must be between 0 and 500.",
        errNum: "Check the value in the field “{f}”: it must be a number of 0 or more.",
        errTariff: "Enter the tariff of the alternative: the trip must cost more than 0.",
        uah: "UAH", km: "km", m: "month", y: "year",
        modeFuel: "Fuel", modeEv: "Electric",
        altTaxi: "Taxi", altShare: "Car sharing",
        lblConsFuel: "Consumption (l/100 km)", lblConsEv: "Consumption (kWh/100 km)",
        lblPriceFuel: "Fuel price (UAH/l)", lblPriceEv: "Energy price (UAH/kWh)",
        fAlt: { fee: "Base fare", perKm: "Price per km", minFare: "Minimum fare", perMin: "Price per minute", perKmShare: "Price per km", duration: "Trip duration" },
        fOwn: { wear: "Service and tires", ins: "Insurance", parking: "Parking", credit: "Loan or lease", carPrice: "Car price", dep: "Depreciation", other: "Other fixed costs" },
        cheaper: "{who} is cheaper: by {x} UAH per month ({y} UAH per year).",
        same: "The cost is about the same: the difference is under 1%.",
        whoOwn: "Your own car", whoAlt: { taxi: "Taxi", share: "Car sharing" },
        kOwn: "Own car per month", kAlt: "{alt} per month", kDiff: "Difference per year", kTrip: "One trip", kKm: "One kilometre", kBreak: "Break-even",
        trip: "{o} vs {a} UAH", tripMini: "own car vs {alt}", km: "km",
        breakAt: "{n} trips ≈ {k} km per month",
        breakNote: "Above this mileage your own car is cheaper.",
        breakNever: "Your own car is cheaper at any mileage.",
        breakAltAlways: "{alt} is cheaper at any mileage: one trip costs less than the fuel and wear of your own car.",
        breakNow: "At {n} trips per month you are {side} the break-even point.",
        sideBelow: "below", sideAbove: "above",
        tblTitle: "Monthly cost of the own car", tblItem: "Item", tblSum: "UAH per month",
        rowEnergy: "Fuel or energy", rowWear: "Service and tires", rowIns: "Insurance", rowParking: "Parking", rowCredit: "Loan or lease", rowDep: "Depreciation", rowOther: "Other fixed costs", rowTotal: "Total",
        chartTitle: "Cost for three mileage scenarios (UAH per month)", legOwn: "Own car", trips: "trips per month", yours: "yours",
        modelNote: "Estimate from the numbers you enter. Time, comfort and waiting are not priced in; a car’s depreciation is an assumption you set.",
        linkCopied: "Link copied ✅", copyFailed: "Could not copy 😕", reset: "Reset ✅", example: "Example filled in ✅"
      }
    : {
        enter: "Вкажіть кількість поїздок, відстань, витрату й ціну пального — результат зʼявиться тут.",
        missing: "Щоб порахувати, заповніть: {list}.",
        lblTrips: "кількість поїздок", lblDist: "відстань поїздки", lblCons: "витрату", lblPrice: "ціну пального чи енергії",
        errTrips: "Кількість поїздок має бути від 1 до 1000 на місяць.",
        errDist: "Відстань поїздки має бути від 0,5 до 500 км.",
        errCons: "Витрата поза допустимим діапазоном.",
        errPrice: "Ціна енергії має бути від 0 до 500.",
        errNum: "Перевірте значення в полі «{f}»: це має бути число від 0.",
        errTariff: "Вкажіть тариф альтернативи: поїздка має коштувати більше 0.",
        uah: "грн", km: "км", m: "міс", y: "рік",
        modeFuel: "Паливо", modeEv: "Електро",
        altTaxi: "Таксі", altShare: "Каршеринг",
        lblConsFuel: "Витрата (л/100 км)", lblConsEv: "Витрата (кВт⋅год/100 км)",
        lblPriceFuel: "Ціна пального (грн/л)", lblPriceEv: "Ціна енергії (грн/кВт⋅год)",
        fAlt: { fee: "Подача", perKm: "Ціна за км", minFare: "Мінімальна вартість", perMin: "Ціна за хвилину", perKmShare: "Ціна за км", duration: "Тривалість поїздки" },
        fOwn: { wear: "Обслуговування й шини", ins: "Страхування", parking: "Паркування", credit: "Кредит або лізинг", carPrice: "Ціна авто", dep: "Втрата вартості", other: "Інші постійні витрати" },
        cheaper: "{who} дешевше: на {x} грн на місяць ({y} грн на рік).",
        same: "Вартість приблизно однакова: різниця менша за 1%.",
        whoOwn: "Власне авто", whoAlt: { taxi: "Таксі", share: "Каршеринг" },
        kOwn: "Власне авто за місяць", kAlt: "{alt} за місяць", kDiff: "Різниця за рік", kTrip: "Одна поїздка", kKm: "Один кілометр", kBreak: "Точка беззбитковості",
        trip: "{o} проти {a} грн", tripMini: "власне авто проти {alt}", km: "км",
        breakAt: "{n} поїздок ≈ {k} км на місяць",
        breakNote: "Від такого пробігу власне авто стає дешевшим.",
        breakNever: "Власне авто дешевше за будь-якого пробігу.",
        breakAltAlways: "{alt} дешевше за будь-якого пробігу: одна поїздка коштує менше, ніж пальне й знос власного авто.",
        breakNow: "При {n} поїздках на місяць ви {side} точки беззбитковості.",
        sideBelow: "нижче", sideAbove: "вище",
        tblTitle: "Витрати власного авто за місяць", tblItem: "Стаття", tblSum: "грн на місяць",
        rowEnergy: "Пальне або енергія", rowWear: "Обслуговування й шини", rowIns: "Страхування", rowParking: "Паркування", rowCredit: "Кредит або лізинг", rowDep: "Втрата вартості", rowOther: "Інші постійні витрати", rowTotal: "Разом",
        chartTitle: "Витрати за трьох сценаріїв пробігу (грн на місяць)", legOwn: "Власне авто", trips: "поїздок на місяць", yours: "ваш",
        modelNote: "Оцінка за введеними вами числами. Час, комфорт і очікування не враховані; втрата вартості авто — припущення, яке задаєте ви.",
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
  const state = { energy: "fuel", alt: "taxi" };

  // групування тисяч під час введення: 1000000 → 1 000 000 (EN: 1,000,000); курсор лишається біля тієї самої цифри
  const GROUP_SEP = IS_EN ? "," : " ";
  const MONEY_IDS = ["ins","parking","credit","carPrice","other"];
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

  // необовʼязкові числові поля: порожньо = 0, обмеження — число ≥ 0
  function optNum(id, label, max) {
    if (blank(id)) return { v: 0 };
    const v = num(el(id).value);
    if (!(v >= 0 && v <= max)) return { err: fill(T.errNum, { f: label }) };
    return { v };
  }

  // ===== розрахунок =====
  function compute() {
    const miss = [];
    if (blank("trips")) miss.push(T.lblTrips);
    if (blank("dist")) miss.push(T.lblDist);
    if (blank("cons")) miss.push(T.lblCons);
    if (blank("price")) miss.push(T.lblPrice);
    if (miss.length) {
      const any = ["trips", "dist", "cons", "price"].some((id) => !blank(id));
      return { ok: false, none: !any, msg: any ? fill(T.missing, { list: miss.join(", ") }) : "" };
    }
    const trips = num(el("trips").value);
    if (!(trips >= 1 && trips <= 1000)) return { ok: false, msg: T.errTrips };
    const dist = num(el("dist").value);
    if (!(dist >= 0.5 && dist <= 500)) return { ok: false, msg: T.errDist };
    const ev = state.energy === "ev";
    const cons = num(el("cons").value);
    if (!(cons >= (ev ? 3 : 1) && cons <= (ev ? 80 : 60))) return { ok: false, msg: T.errCons };
    const price = num(el("price").value);
    if (!(price >= 0 && price <= 500)) return { ok: false, msg: T.errPrice };

    const o = {};
    const specs = [
      ["wear", T.fOwn.wear, 50], ["ins", T.fOwn.ins, 1e6], ["parking", T.fOwn.parking, 1e5], ["credit", T.fOwn.credit, 1e6],
      ["carPrice", T.fOwn.carPrice, 1e8], ["dep", T.fOwn.dep, 50], ["other", T.fOwn.other, 1e6]
    ];
    for (const [id, label, max] of specs) {
      const r = optNum(id, label, max);
      if (r.err) return { ok: false, msg: r.err };
      o[id] = r.v;
    }

    // альтернатива
    let altPerTrip, altInfo;
    if (state.alt === "taxi") {
      const fee = optNum("fee", T.fAlt.fee, 2000), perKm = optNum("perKm", T.fAlt.perKm, 500), minFare = optNum("minFare", T.fAlt.minFare, 5000);
      for (const r of [fee, perKm, minFare]) if (r.err) return { ok: false, msg: r.err };
      altPerTrip = Math.max(minFare.v, fee.v + perKm.v * dist);
      altInfo = { fee: fee.v, perKm: perKm.v, minFare: minFare.v };
    } else {
      const perMin = optNum("perMin", T.fAlt.perMin, 100), perKmS = optNum("perKmShare", T.fAlt.perKmShare, 100), dur = optNum("duration", T.fAlt.duration, 1000);
      for (const r of [perMin, perKmS, dur]) if (r.err) return { ok: false, msg: r.err };
      altPerTrip = perMin.v * dur.v + perKmS.v * dist;
      altInfo = { perMin: perMin.v, perKm: perKmS.v, duration: dur.v };
    }
    if (!(altPerTrip > 0)) return { ok: false, msg: T.errTariff };

    // власне авто
    const energyPerKm = (cons / 100) * price;
    const varPerKm = energyPerKm + o.wear;
    const ownVarTrip = varPerKm * dist;
    const dep = (o.carPrice * o.dep) / 100 / 12;
    const fixed = o.ins / 12 + o.parking + o.credit + dep + o.other;
    const km = trips * dist;
    const energyM = energyPerKm * km;
    const wearM = o.wear * km;
    const ownMonth = fixed + ownVarTrip * trips;
    const altMonth = altPerTrip * trips;
    const diff = altMonth - ownMonth; // > 0: власне авто дешевше

    // беззбитковість
    let breakTrips = null;
    let breakMode = "none";
    if (altPerTrip <= ownVarTrip) breakMode = "altAlways";
    else if (fixed <= 0) breakMode = "ownAlways";
    else {
      breakMode = "point";
      breakTrips = fixed / (altPerTrip - ownVarTrip);
    }

    return {
      ok: true, trips, dist, ev, alt: state.alt, o, altInfo, altPerTrip, energyPerKm, varPerKm, ownVarTrip, fixed, dep, km,
      energyM, wearM, ownMonth, altMonth, diff, breakTrips, breakMode,
      ownPerTrip: ownMonth / trips, ownPerKm: ownMonth / km, altPerKm: altMonth / km
    };
  }

  // ===== відображення =====
  const tile = (title, value, mini, cls = "") =>
    '<div class="cvt__kpi ' + cls + '"><div class="cvt__kpiT">' + title + '</div><div class="cvt__kpiV">' + value + "</div>" + (mini ? '<div class="cvt__kpiM">' + mini + "</div>" : "") + "</div>";
  const uah = (n) => f0(n) + " " + T.uah;
  const altName = (alt) => (alt === "taxi" ? T.whoAlt.taxi : T.whoAlt.share);

  // графік: три сценарії пробігу (удвічі менше, ваш, удвічі більше) — пари стовпців «власне авто / альтернатива»
  function chart(r) {
    const W = 320, H = 200, L = 46, Rr = 10, Tp = 16, B = 34;
    const ownAt = (n) => r.fixed + r.ownVarTrip * n;
    const altAt = (n) => r.altPerTrip * n;
    const scen = [...new Set([Math.max(1, Math.round(r.trips / 2)), Math.round(r.trips), Math.round(r.trips * 2)])].sort((x, y) => x - y);
    const maxY = Math.max(...scen.map((n) => Math.max(ownAt(n), altAt(n)))) * 1.12 || 1;
    const py = (y) => Tp + (1 - y / maxY) * (H - Tp - B);
    const slot = (W - L - Rr) / scen.length;
    const bw = Math.min(34, (slot - 18) / 2);
    let s = '<svg class="cvt__chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + T.chartTitle + '">';
    s += '<line x1="' + L + '" y1="' + (H - B) + '" x2="' + (W - Rr) + '" y2="' + (H - B) + '" stroke="#c9d3e6"/>';
    s += '<text x="' + (L - 4) + '" y="' + (Tp + 8) + '" font-size="10" fill="#6b7280" text-anchor="end">' + f0(maxY) + "</text>";
    s += '<text x="' + (L - 4) + '" y="' + (H - B) + '" font-size="10" fill="#6b7280" text-anchor="end">0</text>';
    scen.forEach((n, i) => {
      const cx = L + slot * i + slot / 2;
      const xo = cx - bw - 2;
      const xa = cx + 2;
      const o = ownAt(n), al = altAt(n);
      s += '<rect x="' + xo.toFixed(1) + '" y="' + py(o).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (py(0) - py(o)).toFixed(1) + '" rx="3" fill="#283b69"/>';
      s += '<rect x="' + xa.toFixed(1) + '" y="' + py(al).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (py(0) - py(al)).toFixed(1) + '" rx="3" fill="#0f8b8d"/>';
      s += '<text x="' + (xo + bw / 2).toFixed(1) + '" y="' + (py(o) - 4).toFixed(1) + '" font-size="10" fill="#1f2f55" text-anchor="middle">' + f0(o) + "</text>";
      s += '<text x="' + (xa + bw / 2).toFixed(1) + '" y="' + (py(al) - 4).toFixed(1) + '" font-size="10" fill="#1f2f55" text-anchor="middle">' + f0(al) + "</text>";
      const mine = n === Math.round(r.trips);
      s += '<text x="' + cx.toFixed(1) + '" y="' + (H - B + 15) + '" font-size="11" fill="' + (mine ? "#1f2f55" : "#6b7280") + '" font-weight="' + (mine ? 800 : 400) + '" text-anchor="middle">' + f0(n) + (mine ? " · " + T.yours : "") + "</text>";
    });
    s += '<text x="' + ((L + W - Rr) / 2) + '" y="' + (H - 4) + '" font-size="10" fill="#6b7280" text-anchor="middle">' + T.trips + "</text>";
    return s + "</svg>";
  }

  function render(r) {
    const box = el("result");
    if (!r.ok) {
      if (r.none || !r.msg) box.innerHTML = T.enter;
      else box.innerHTML = '<div class="cvt__hintbox">' + r.msg + "</div>";
      return;
    }
    const an = altName(r.alt);
    const same = Math.abs(r.diff) <= Math.max(r.ownMonth, r.altMonth) * 0.01;
    let verdict, cls;
    if (same) {
      verdict = T.same;
      cls = "";
    } else {
      const ownWins = r.diff > 0;
      verdict = fill(T.cheaper, { who: ownWins ? T.whoOwn : an, x: f0(Math.abs(r.diff)), y: f0(Math.abs(r.diff) * 12) });
      cls = ownWins ? "is-ok" : "is-warn";
    }

    let breakVal, breakMini;
    if (r.breakMode === "point") {
      breakVal = fill(T.breakAt, { n: f0(Math.ceil(r.breakTrips)), k: f0(Math.ceil(r.breakTrips) * r.dist) });
      breakMini = T.breakNote + " " + fill(T.breakNow, { n: f0(r.trips), side: r.trips >= r.breakTrips ? T.sideAbove : T.sideBelow });
    } else if (r.breakMode === "ownAlways") {
      breakVal = "—";
      breakMini = T.breakNever;
    } else {
      breakVal = "—";
      breakMini = fill(T.breakAltAlways, { alt: an });
    }

    const tiles =
      tile(fill(T.kOwn, {}), uah(r.ownMonth), uah(r.ownMonth * 12) + " / " + T.y, r.diff > 0 && !same ? "is-win" : "") +
      tile(fill(T.kAlt, { alt: an }), uah(r.altMonth), uah(r.altMonth * 12) + " / " + T.y, r.diff < 0 && !same ? "is-win" : "") +
      tile(T.kTrip, fill(T.trip, { o: f0(r.ownPerTrip), a: f0(r.altPerTrip) }), fill(T.tripMini, { alt: an.toLowerCase() })) +
      tile(T.kKm, fill(T.trip, { o: f1(r.ownPerKm), a: f1(r.altPerKm) }), fill(T.tripMini, { alt: an.toLowerCase() })) +
      tile(T.kBreak, breakVal, breakMini, "cvt__kpi--wide");

    const rows = [
      [T.rowEnergy, r.energyM], [T.rowWear, r.wearM], [T.rowIns, r.o.ins / 12], [T.rowParking, r.o.parking],
      [T.rowCredit, r.o.credit], [T.rowDep, r.dep], [T.rowOther, r.o.other]
    ].filter(([, v]) => v > 0);
    const table =
      '<div class="cvt__sub">' + T.tblTitle + "</div>" +
      '<table class="cvt__tbl"><thead><tr><th>' + T.tblItem + "</th><th>" + T.tblSum + "</th></tr></thead><tbody>" +
      rows.map(([k, v]) => "<tr><th>" + k + "</th><td>" + f0(v) + "</td></tr>").join("") +
      '<tr class="cvt__total"><th>' + T.rowTotal + "</th><td>" + f0(r.ownMonth) + "</td></tr></tbody></table>";

    const legend = '<div class="cvt__legend"><span><i style="background:#283b69"></i>' + T.legOwn + '</span><span><i style="background:#0f8b8d"></i>' + an + "</span></div>";

    box.innerHTML =
      '<div class="cvt__verdict ' + cls + '"><b>' + verdict + "</b></div>" +
      '<div class="cvt__kpis cvt__mt10">' + tiles + "</div>" +
      table +
      '<div class="cvt__sub">' + T.chartTitle + "</div>" + chart(r) + legend +
      '<div class="cvt__note">' + T.modelNote + "</div>";
  }

  function calc() {
    render(compute());
  }

  // ===== режими =====
  function applyLabels() {
    const ev = state.energy === "ev";
    el("lblCons").firstChild.nodeValue = (ev ? T.lblConsEv : T.lblConsFuel) + " ";
    el("lblPrice").firstChild.nodeValue = (ev ? T.lblPriceEv : T.lblPriceFuel) + " ";
    el("cons").placeholder = ev ? (IS_EN ? "e.g. 17" : "наприклад: 17") : IS_EN ? "e.g. 8" : "наприклад: 8";
    el("price").placeholder = ev ? (IS_EN ? "e.g. 8" : "наприклад: 8") : IS_EN ? "e.g. 55" : "наприклад: 55";
    el("modeFuel").classList.toggle("is-active", !ev);
    el("modeEv").classList.toggle("is-active", ev);
    el("altTaxi").classList.toggle("is-active", state.alt === "taxi");
    el("altShare").classList.toggle("is-active", state.alt === "share");
    [["modeFuel", !ev], ["modeEv", ev], ["altTaxi", state.alt === "taxi"], ["altShare", state.alt === "share"]].forEach(([id, on]) => el(id).setAttribute("aria-pressed", String(on)));
    el("taxiFields").hidden = state.alt !== "taxi";
    el("shareFields").hidden = state.alt !== "share";
  }

  function setEnergy(v) {
    state.energy = v;
    applyLabels();
    calc();
  }
  function setAlt(v) {
    state.alt = v;
    applyLabels();
    calc();
  }

  // ===== кнопки =====
  const IDS = ["trips", "dist", "cons", "price", "wear", "ins", "parking", "credit", "carPrice", "dep", "other", "fee", "perKm", "minFare", "perMin", "perKmShare", "duration"];

  function resetAll() {
    IDS.forEach((id) => (el(id).value = ""));
    state.energy = "fuel";
    state.alt = "taxi";
    el("fixedDetails").open = false;
    applyLabels();
    render({ ok: false, none: true });
  }

  function fillExample() {
    const v = { trips: "40", dist: "8", cons: "8", price: "55", wear: "1.5", ins: "6000", parking: "300", credit: "", carPrice: "600000", dep: "10", other: "", fee: "60", perKm: "12", minFare: "100", perMin: "", perKmShare: "", duration: "" };
    IDS.forEach((id) => (el(id).value = IS_EN ? v[id] : v[id].replace(".", ",")));
    state.energy = "fuel";
    state.alt = "taxi";
    el("fixedDetails").open = true;
    applyLabels();
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
    p.set("en", state.energy);
    p.set("alt", state.alt);
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
    if (q.get("en") === "ev") state.energy = "ev";
    if (q.get("alt") === "share") state.alt = "share";
    if (["ins", "parking", "credit", "carPrice", "dep", "other"].some((id) => !blank(id))) el("fixedDetails").open = true;
    return any || q.has("en") || q.has("alt");
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
    el("modeFuel").addEventListener("click", () => setEnergy("fuel"));
    el("modeEv").addEventListener("click", () => setEnergy("ev"));
    el("altTaxi").addEventListener("click", () => setAlt("taxi"));
    el("altShare").addEventListener("click", () => setAlt("share"));
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
    applyLabels();
    if (used) calc();
    else render({ ok: false, none: true });
  });
})();
