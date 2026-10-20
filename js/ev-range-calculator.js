/* ev-range-calculator.js — калькулятор запасу ходу електромобіля (UK/EN)
   Модель (орієнтовна):
     корисна енергія = ємність × стан батареї × (заряд − резерв)
     запас ходу = корисна енергія / споживання × 100 × коефіцієнт температури × коефіцієнт швидкості
   Температура: ламана за відкритими даними —
     Geotab (понад 5 млн поїздок): 100% від паспорта при 10–31 °C, 54% при −15 °C;
     AAA (2019, стендові тести): −41% при −7 °C з обігрівом, −12% без нього; −17% при +35 °C з кондиціонером, −4% без нього.
   Швидкість: спрощена фізична модель типового електромобіля (опір кочення + аеродинаміка + власні потреби),
     нормована на «змішаний цикл»; для міста обмежено 1,10 (старт-стоп). */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const LOCALE = IS_EN ? "en-US" : "uk-UA";

  const T = IS_EN
    ? {
        km: "km", kwh: "kWh", per100: "kWh/100 km",
        enter: "Enter the battery capacity and consumption — the result will appear here.",
        missing: "To calculate, fill in: {list}.",
        lblCap: "Battery capacity", lblCons: "Consumption",
        errCap: "Battery capacity must be between 1 and 400 kWh.",
        errCons: "Consumption must be between 3 and 100 kWh/100 km.",
        errCharge: "Charge level must be between 0 and 100%.",
        errReserve: "The reserve must be between 0% and the charge level.",
        errSoh: "Battery health must be between 50 and 100%.",
        errTemp: "Temperature must be between −50 and 60 °C.",
        errDist: "Trip distance must be 0 or more.",
        errSpeed: "Speed must be between 20 and 200 km/h.",
        lblSpeed: "Speed (km/h)",
        kmh: "km/h",
        range: "Estimated range", toReserve: "down to a {r}% reserve", toZero: "down to 0%",
        base: "Base range (no adjustments)", usable: "Usable energy",
        fTemp: "Temperature factor", fSpeed: "Speed factor", total0: "Range down to 0%",
        tripTitle: "Trip of {d} km",
        tripNeed: "Energy needed", tripArrive: "Charge on arrival",
        tripOk: "Enough: about {p}% will be left on arrival.",
        tripShort: "Not enough: about {km} km short. Charge about {kwh} kWh more (≈ {pct}% of the battery).",
        tripLink: "Calculate the cost of this charge",
        hintCar: "Usable (net) capacity from public data. It may differ for your car — check it and correct if needed.",
        hintCarApprox: "Approximate value: sources disagree (depends on year and version) or the manufacturer does not publish it. Check it against your car’s documents.",
        carSearch: "Search cars…", carNone: "Not selected — enter the capacity manually", carNotFound: "Nothing found",
        copied: "Result copied ✅", copyFailed: "Could not copy 😕", linkCopied: "Link copied ✅", reset: "Reset ✅", example: "Example filled in ✅",
        modelNote: "Estimate: temperature from Geotab and AAA data, speed from a simplified model.",
        copyText: "Range ≈ {range} km ({cap} kWh, {cons} kWh/100 km, charge {soc}% → reserve {res}%, {temp} °C, {speed})"
      }
    : {
        km: "км", kwh: "кВт⋅год", per100: "кВт⋅год/100 км",
        enter: "Вкажіть ємність батареї та споживання — результат зʼявиться тут.",
        missing: "Щоб порахувати, заповніть: {list}.",
        lblCap: "Ємність батареї", lblCons: "Споживання",
        errCap: "Ємність батареї має бути від 1 до 400 кВт⋅год.",
        errCons: "Споживання має бути від 3 до 100 кВт⋅год/100 км.",
        errCharge: "Рівень заряду має бути від 0 до 100%.",
        errReserve: "Резерв має бути від 0% до рівня заряду.",
        errSoh: "Стан батареї має бути від 50 до 100%.",
        errTemp: "Температура має бути від −50 до 60 °C.",
        errDist: "Відстань поїздки має бути 0 або більше.",
        errSpeed: "Швидкість має бути від 20 до 200 км/год.",
        lblSpeed: "Швидкість (км/год)",
        kmh: "км/год",
        range: "Орієнтовний запас ходу", toReserve: "до резерву {r}%", toZero: "до 0%",
        base: "Базовий запас ходу (без поправок)", usable: "Корисна енергія",
        fTemp: "Коефіцієнт температури", fSpeed: "Коефіцієнт швидкості", total0: "Запас ходу до 0%",
        tripTitle: "Поїздка на {d} км",
        tripNeed: "Потрібно енергії", tripArrive: "Заряд по прибутті",
        tripOk: "Вистачить: по прибутті залишиться близько {p}%.",
        tripShort: "Не вистачить: бракує близько {km} км. Потрібно дозарядити приблизно {kwh} кВт⋅год (≈ {pct}% батареї).",
        tripLink: "Порахувати вартість цієї зарядки",
        hintCar: "Корисна (нетто) ємність за відкритими даними. Для вашого авто може відрізнятись — перевірте й за потреби виправте.",
        hintCarApprox: "Значення орієнтовне: у джерелах розходяться (залежить від року й версії) або виробник не публікує. Перевірте за документами авто.",
        carSearch: "Пошук авто…", carNone: "Не вибрано — ввести ємність вручну", carNotFound: "Нічого не знайдено",
        copied: "Результат скопійовано ✅", copyFailed: "Не вдалось скопіювати 😕", linkCopied: "Посилання скопійовано ✅", reset: "Скинуто ✅", example: "Підставлено приклад ✅",
        modelNote: "Оцінка: температура за даними Geotab і AAA, швидкість за спрощеною моделлю.",
        copyText: "Запас ходу ≈ {range} км ({cap} кВт⋅год, {cons} кВт⋅год/100 км, заряд {soc}% → резерв {res}%, {temp} °C, {speed})"
      };

  const SPEEDS = {
    city: { f: 1.1, uk: "Місто (~50 км/год)", en: "City (~50 km/h)" },
    mixed: { f: 1.0, uk: "Змішаний цикл", en: "Mixed driving" },
    h80: { f: 0.89, uk: "Траса 80 км/год", en: "Highway 80 km/h" },
    h90: { f: 0.8, uk: "Траса 90 км/год", en: "Highway 90 km/h" },
    h100: { f: 0.71, uk: "Траса 100 км/год", en: "Highway 100 km/h" },
    h110: { f: 0.63, uk: "Траса 110 км/год", en: "Highway 110 km/h" },
    h120: { f: 0.56, uk: "Траса 120 км/год", en: "Highway 120 km/h" },
    h130: { f: 0.5, uk: "Траса 130 км/год", en: "Highway 130 km/h" },
    h140: { f: 0.45, uk: "Траса 140 км/год", en: "Highway 140 km/h" },
    custom: { f: null, uk: "Своя швидкість", en: "Custom speed" }
  };
  const speedLabel = (k) => SPEEDS[k][IS_EN ? "en" : "uk"];

  // питоме споживання (Вт⋅год/км) спрощеної моделі: опір кочення + аеродинаміка + власні потреби
  const modelCons = (kmh) => 58.84 + 0.1231 * Math.pow(kmh / 3.6, 2) + 500 / kmh;
  const customFactor = (kmh) => Math.round(Math.min(1.1, modelCons(70) / modelCons(kmh)) * 100) / 100;

  // коефіцієнт температури (множник запасу ходу, обігрів/кондиціонер увімкнено)
  const TEMP_POINTS = [[-25, 0.5], [-15, 0.54], [-7, 0.59], [10, 1], [31, 1], [35, 0.83], [40, 0.8]];
  // авто з тепловим насосом: на морозі втрата менша (0 °C ≈ −17%, −7 °C ≈ −22%, оцінка за даними Recurrent 2025–26)
  const HP_POINTS = [[-25, 0.62], [-15, 0.7], [-7, 0.775], [0, 0.83], [10, 1]];
  function interp(P, t) {
    if (t <= P[0][0]) return P[0][1];
    if (t >= P[P.length - 1][0]) return P[P.length - 1][1];
    for (let i = 0; i < P.length - 1; i++) {
      if (t >= P[i][0] && t <= P[i + 1][0]) return P[i][1] + ((P[i + 1][1] - P[i][1]) * (t - P[i][0])) / (P[i + 1][0] - P[i][0]);
    }
  }
  function tempFactor(t, hvac, hp) {
    const f = hp && t < 10 ? interp(HP_POINTS, t) : interp(TEMP_POINTS, t);
    if (hvac) return f;
    // без обігріву/кондиціонера втрата менша (AAA: холод −12% проти −41%, спека −4% проти −17%)
    const k = t < 10 ? 0.293 : t > 31 ? 0.235 : 0;
    return 1 - (1 - f) * k;
  }

  // ===== helpers =====
  function num(v) {
    const raw = String(v ?? "").replace(/[\s ]+/g, "").replace(/−/g, "-");
    const s = IS_EN ? raw.replace(/,/g, "") : raw.replace(",", ".");
    if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }
  const blank = (id) => (el(id)?.value || "").trim() === "";
  const val = (id, fallback) => (blank(id) ? fallback : num(el(id).value));
  const fmt0 = (n) => Math.round(n).toLocaleString(LOCALE);
  const fmt2 = (n) => n.toLocaleString(LOCALE, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  const fmtKwh = (n) => n.toLocaleString(LOCALE, { maximumFractionDigits: 1 });

  function toast(msg) {
    const n = el("toast");
    if (!n) return;
    n.textContent = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (n.textContent = ""), 2400);
  }

  const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : ""));

  // ===== розрахунок =====
  let last = null; // останній успішний результат (для копіювання й посилання)

  function compute() {
    const cap = val("battery", NaN);
    const cons = val("consumption", NaN);
    const miss = [];
    if (!(cap > 0)) miss.push(T.lblCap);
    if (!(cons > 0)) miss.push(T.lblCons);
    if ((el("speed")?.value || "mixed") === "custom" && blank("speedCustom")) miss.push(T.lblSpeed);
    if (miss.length) {
      const any = !blank("battery") || !blank("consumption") || !blank("speedCustom");
      return { ok: false, msg: any ? fill(T.missing, { list: miss.join(", ") }) : "", none: !any };
    }

    if (cap > 400) return { ok: false, msg: T.errCap };
    if (cap < 1) return { ok: false, msg: T.errCap };
    if (cons < 3 || cons > 100) return { ok: false, msg: T.errCons };

    const charge = val("charge", 100);
    const reserve = val("reserve", 0);
    const soh = val("soh", 100);
    const temp = val("temp", 20);
    const dist = val("distance", 0);
    if (!(charge >= 0 && charge <= 100)) return { ok: false, msg: T.errCharge };
    if (!(reserve >= 0 && reserve <= charge)) return { ok: false, msg: T.errReserve };
    if (!(soh >= 50 && soh <= 100)) return { ok: false, msg: T.errSoh };
    if (!(temp >= -50 && temp <= 60)) return { ok: false, msg: T.errTemp };
    if (!(dist >= 0)) return { ok: false, msg: T.errDist };

    const hvac = !!el("hvac")?.checked;
    const speed = el("speed")?.value || "mixed";
    let fS = SPEEDS[speed].f;
    let speedText = speedLabel(speed);
    if (speed === "custom") {
      const kmh = num(el("speedCustom").value);
      if (!(kmh >= 20 && kmh <= 200)) return { ok: false, msg: T.errSpeed };
      fS = customFactor(kmh);
      speedText = fmt0(kmh) + " " + T.kmh;
    }
    const hp = !!el("heatpump")?.checked;
    const fT = tempFactor(temp, hvac, hp);

    const capEff = cap * (soh / 100); // корисна ємність з урахуванням стану батареї
    const usable = (capEff * (charge - reserve)) / 100;
    const base = (usable / cons) * 100;
    const range = base * fT * fS;
    const effCons = cons / (fT * fS); // реальне споживання, кВт⋅год/100 км
    const total0 = (((capEff * charge) / 100) / effCons) * 100;

    const out = { ok: true, cap, cons, charge, reserve, soh, temp, hvac, hp, speed, speedText, fT, fS, usable, base, range, effCons, total0, dist };

    if (dist > 0) {
      const need = (dist * effCons) / 100;
      const needPct = (need / capEff) * 100;
      const arrive = charge - needPct;
      out.trip = { need, needPct, arrive };
      if (arrive < reserve) {
        const shortPct = reserve - arrive;
        out.trip.short = true;
        out.trip.shortKm = Math.max(0, dist - range);
        out.trip.shortKwh = (shortPct / 100) * capEff;
        out.trip.shortPct = shortPct;
      }
    }
    return out;
  }

  // ===== відображення =====
  const tile = (title, value, mini, cls = "") =>
    '<div class="evr__kpi ' + cls + '"><div class="evr__kpiT">' + title + '</div><div class="evr__kpiV">' + value + "</div>" + (mini ? '<div class="evr__kpiM">' + mini + "</div>" : "") + "</div>";

  function render(r) {
    const box = el("result");
    if (!r.ok) {
      last = null;
      if (r.none || !r.msg) box.innerHTML = T.enter;
      else box.innerHTML = '<div class="evr__hintbox">' + r.msg + "</div>";
      return;
    }
    last = r;
    const resTxt = r.reserve > 0 ? fill(T.toReserve, { r: fmt0(r.reserve) }) : T.toZero;
    const tiles = [
      tile(T.range, "≈ " + fmt0(r.range) + " " + T.km, resTxt, "evr__kpi--main evr__kpi--wide"),
      tile(T.base, fmt0(r.base) + " " + T.km, ""),
      tile(T.usable, fmtKwh(r.usable) + " " + T.kwh, ""),
      tile(T.fTemp, "×" + fmt2(r.fT), fmt0(r.temp) + " °C"),
      tile(T.fSpeed, "×" + fmt2(r.fS), r.speedText)
    ];
    if (r.reserve > 0) tiles.push(tile(T.total0, fmt0(r.total0) + " " + T.km, ""));

    let trip = "";
    if (r.trip) {
      const t = r.trip;
      const verdict = t.short
        ? fill(T.tripShort, { km: fmt0(t.shortKm), kwh: fmtKwh(t.shortKwh), pct: fmt0(t.shortPct) })
        : fill(T.tripOk, { p: fmt0(Math.max(0, t.arrive)) });
      let link = "";
      if (t.short) {
        // дозарядка: від рівня резерву (де зупиняємось) на потрібний дефіцит, щоб доїхати
        const now = Math.round(r.reserve);
        const target = Math.min(100, Math.max(now + 1, Math.round(r.reserve + t.shortPct)));
        const base = IS_EN ? "/en/auto/ev-charge-calculator" : "/auto/ev-charge-calculator";
        const q = new URLSearchParams({ battery_kwh: String(r.cap), soc_now: String(now), soc_target: String(target) }).toString();
        link = '<a class="evr__link" href="' + base + "?" + q + '">' + T.tripLink + "</a>";
      }
      trip =
        '<div class="evr__sub">' + fill(T.tripTitle, { d: fmt0(r.dist) }) + "</div>" +
        '<div class="evr__kpis">' +
        tile(T.tripNeed, fmtKwh(t.need) + " " + T.kwh, "≈ " + fmt0(t.needPct) + "%") +
        tile(T.tripArrive, fmt0(Math.max(0, t.arrive)) + "%", "", t.short ? "is-lose" : "is-win") +
        "</div>" +
        '<div class="evr__verdict ' + (t.short ? "is-bad" : "is-ok") + '">' + verdict + (link ? " " + link : "") + "</div>";
    }

    box.innerHTML = '<div class="evr__kpis">' + tiles.join("") + "</div>" + trip + '<div class="evr__note">' + T.modelNote + "</div>";
  }

  function calc() {
    render(compute());
  }

  // ===== випадні списки =====
  function closeAllDd(exceptId) {
    document.querySelectorAll("#evr .evr__ddList").forEach((ul) => {
      if (ul.id === exceptId || ul.hidden) return;
      ul.hidden = true;
      ul.closest(".evr__dd")?.querySelector(".evr__ddBtn")?.setAttribute("aria-expanded", "false");
    });
  }

  // швидкість: випадний список з прихованим <select>
  function syncSpeedDd() {
    const sel = el("speed");
    if (!sel) return;
    const lab = el("speed_label");
    if (lab && sel.selectedOptions[0]) lab.textContent = sel.selectedOptions[0].text;
    document.querySelectorAll("#speed_list li").forEach((li) => li.setAttribute("aria-selected", String(li.dataset.v === sel.value)));
    const wrap = el("speed_custom_wrap");
    if (wrap) wrap.hidden = sel.value !== "custom";
  }

  function initSpeedDd() {
    const sel = el("speed");
    const list = el("speed_list");
    const btn = el("speed_btn");
    if (!sel || !list || !btn) return;
    sel.innerHTML = Object.keys(SPEEDS).map((k) => '<option value="' + k + '">' + speedLabel(k) + "</option>").join("");
    sel.value = "mixed";
    list.innerHTML = Object.keys(SPEEDS).map((k) => '<li role="option" tabindex="-1" data-v="' + k + '" aria-selected="false"><span class="evr__ddCar">' + speedLabel(k) + "</span></li>").join("");
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllDd(list.id);
      const open = list.hidden;
      list.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
    });
    list.addEventListener("click", (e) => {
      const li = e.target.closest("li[data-v]");
      if (!li) return;
      list.hidden = true;
      btn.setAttribute("aria-expanded", "false");
      sel.value = li.dataset.v;
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    });
    // будь-яка зміна значення (у т.ч. програмна) оновлює підпис і розрахунок
    sel.addEventListener("change", () => {
      syncSpeedDd();
      calc();
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#speed_dd") && !list.hidden) {
        list.hidden = true;
        btn.setAttribute("aria-expanded", "false");
      }
    });
    syncSpeedDd();
  }

  // авто: випадний список із пошуком (ємність батареї з ev-models.js)
  const carList = () => (Array.isArray(window.EV_MODELS) ? window.EV_MODELS : []);

  function updateCarHint() {
    const id = el("car") ? el("car").value : "";
    const m = carList().find((x) => x.id === id);
    const label = el("car_label");
    if (label) {
      if (label.dataset.none === undefined) label.dataset.none = label.textContent;
      label.textContent = m ? m.make + " " + m.name : label.dataset.none;
    }
    document.querySelectorAll("#car_list li[data-id]").forEach((li) => li.setAttribute("aria-selected", String(li.dataset.id === id)));
    const hint = el("car_hint");
    if (hint) hint.textContent = m ? (m.conf === "ok" ? T.hintCar : T.hintCarApprox) : "";
  }

  function pickCar(id) {
    const sel = el("car");
    if (!sel) return;
    sel.value = id;
    const m = carList().find((x) => x.id === id);
    if (m) el("battery").value = String(m.kwh);
    updateCarHint();
    calc();
  }

  function initCarDd() {
    const sel = el("car");
    const list = el("car_list");
    const btn = el("car_btn");
    if (!sel || !list || !btn) return;
    const models = carList();
    const makes = [];
    models.forEach((m) => {
      if (!makes.includes(m.make)) makes.push(m.make);
    });
    sel.innerHTML = '<option value=""></option>' + models.map((m) => '<option value="' + m.id + '">' + m.name + "</option>").join("");
    list.innerHTML =
      '<li role="presentation" class="evr__ddSearchRow"><input type="search" class="evr__ddSearch" id="car_search" autocomplete="off" placeholder="' + T.carSearch + '" aria-label="' + T.carSearch + '"></li>' +
      '<li role="option" tabindex="-1" data-id="" aria-selected="true"><span class="evr__ddCar">' + T.carNone + "</span></li>" +
      makes
        .map(
          (mk) =>
            '<li role="presentation" class="evr__ddGroup">' + mk + "</li>" +
            models
              .filter((m) => m.make === mk)
              .map((m) => '<li role="option" tabindex="-1" data-id="' + m.id + '" data-make="' + m.make + '" aria-selected="false"><span class="evr__ddCar">' + m.name + '</span><span class="evr__ddName">≈' + fmtKwh(m.kwh) + " " + T.kwh + "</span></li>")
              .join("")
        )
        .join("") +
      '<li role="presentation" class="evr__ddEmpty" hidden>' + T.carNotFound + "</li>";

    const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9а-яіїєґ]+/g, "");
    const search = el("car_search");
    const applyFilter = () => {
      const q = norm(search.value);
      let any = false;
      let groupEl = null;
      let groupHas = false;
      const flush = () => {
        if (groupEl) groupEl.hidden = !groupHas;
      };
      list.querySelectorAll("li").forEach((li) => {
        if (li.classList.contains("evr__ddSearchRow") || li.classList.contains("evr__ddEmpty")) return;
        if (li.classList.contains("evr__ddGroup")) {
          flush();
          groupEl = li;
          groupHas = false;
          return;
        }
        const id = li.getAttribute("data-id");
        const text = id === "" ? "" : (li.getAttribute("data-make") || "") + li.textContent;
        const show = q === "" ? true : id !== "" && norm(text).includes(q);
        li.hidden = !show;
        if (show && id !== "") {
          groupHas = true;
          any = true;
        }
      });
      flush();
      list.querySelector(".evr__ddEmpty").hidden = q === "" || any;
    };
    const close = () => {
      if (list.hidden) return;
      list.hidden = true;
      btn.setAttribute("aria-expanded", "false");
    };
    search.addEventListener("input", applyFilter);
    search.addEventListener("click", (e) => e.stopPropagation());
    search.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Escape") {
        close();
        btn.focus();
      } else if (e.key === "Enter") {
        e.preventDefault();
        const first = [...list.querySelectorAll("li[data-id]")].find((li) => !li.hidden && li.getAttribute("data-id") !== "");
        if (first) {
          close();
          pickCar(first.getAttribute("data-id"));
        }
      }
    });
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllDd(list.id);
      const open = list.hidden;
      list.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      if (open) {
        search.value = "";
        applyFilter();
        list.querySelector('li[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
        setTimeout(() => search.focus({ preventScroll: true }), 0);
      }
    });
    list.addEventListener("click", (e) => {
      const li = e.target.closest("li[data-id]");
      if (!li) return;
      close();
      pickCar(li.getAttribute("data-id"));
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#car_dd")) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
    el("battery")?.addEventListener("input", () => {
      if (sel.value) {
        sel.value = "";
        updateCarHint();
      }
    });
  }

  // ===== кнопки =====
  const TEXT_IDS = ["battery", "consumption", "charge", "reserve", "soh", "temp", "distance", "speedCustom"];

  function resetAll() {
    TEXT_IDS.forEach((id) => (el(id).value = ""));
    el("charge").value = "100";
    if (el("hvac")) el("hvac").checked = true;
    if (el("heatpump")) el("heatpump").checked = false;
    if (el("speed")) el("speed").value = "mixed";
    syncSpeedDd();
    if (el("car")) el("car").value = "";
    updateCarHint();
    if (el("more")) el("more").open = false;
    render({ ok: false, none: true });
  }

  function fillExample() {
    if (el("car")) el("car").value = "";
    updateCarHint();
    el("battery").value = "64";
    el("consumption").value = "15.9";
    el("charge").value = "100";
    el("reserve").value = "10";
    el("soh").value = "";
    el("temp").value = "-5";
    if (el("hvac")) el("hvac").checked = true;
    el("speed").value = "h110";
    syncSpeedDd();
    el("distance").value = "120";
    if (el("more")) el("more").open = true;
    calc();
    toast(T.example);
  }

  const URL_MAP = [["cap", "battery"], ["cons", "consumption"], ["soc", "charge"], ["res", "reserve"], ["soh", "soh"], ["temp", "temp"], ["dist", "distance"]];

  function share() {
    const p = new URLSearchParams();
    URL_MAP.forEach(([k, id]) => {
      const v = (el(id).value || "").trim();
      if (v) p.set(k, v);
    });
    if (el("car")?.value) p.set("car", el("car").value);
    p.set("hvac", el("hvac")?.checked ? "1" : "0");
    if (el("heatpump")?.checked) p.set("hp", "1");
    p.set("spd", el("speed")?.value || "mixed");
    if ((el("speed")?.value || "") === "custom" && !blank("speedCustom")) p.set("sv", el("speedCustom").value.trim());
    const url = location.origin + location.pathname + "?" + p.toString();
    navigator.clipboard?.writeText(url).then(() => toast(T.linkCopied)).catch(() => toast(T.copyFailed));
  }

  function applyFromUrl() {
    const q = new URLSearchParams(location.search);
    if (![...URL_MAP.map((m) => m[0]), "car", "hvac", "hp", "spd", "sv"].some((k) => q.has(k))) return false;
    URL_MAP.forEach(([k, id]) => {
      if (q.has(k)) el(id).value = q.get(k);
    });
    if (q.has("car") && el("car")) el("car").value = q.get("car");
    if (q.has("hvac") && el("hvac")) el("hvac").checked = q.get("hvac") === "1";
    if (el("heatpump")) el("heatpump").checked = q.get("hp") === "1";
    if (q.has("spd") && SPEEDS[q.get("spd")]) el("speed").value = q.get("spd");
    if (q.has("sv")) el("speedCustom").value = q.get("sv");
    syncSpeedDd();
    updateCarHint();
    if (["reserve", "soh", "temp", "distance"].some((id) => !blank(id)) && el("more")) el("more").open = true;
    return true;
  }

  async function copyResult() {
    if (!last) return;
    const r = last;
    const txt = fill(T.copyText, { range: fmt0(r.range), cap: fmtKwh(r.cap), cons: fmtKwh(r.cons), soc: fmt0(r.charge), res: fmt0(r.reserve), temp: fmt0(r.temp), speed: r.speedText });
    try {
      await navigator.clipboard.writeText(txt);
      toast(T.copied);
    } catch {
      toast(T.copyFailed);
    }
  }

  function scrollToResultIfStacked() {
    const cards = document.querySelectorAll(".evr__card");
    if (cards.length < 2) return;
    const stacked = cards[1].getBoundingClientRect().top >= cards[0].getBoundingClientRect().bottom - 5;
    if (stacked) cards[1].scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ===== init =====
  window.addEventListener("DOMContentLoaded", () => {
    initSpeedDd();
    initCarDd();

    [...TEXT_IDS, "hvac", "heatpump"].forEach((id) => {
      el(id)?.addEventListener("input", calc);
      el(id)?.addEventListener("change", calc);
    });

    el("calcBtn")?.addEventListener("click", () => {
      const r = compute();
      render(r);
      if (!r.ok) {
        if (r.msg) toast(r.msg);
        else toast(fill(T.missing, { list: T.lblCap + ", " + T.lblCons }));
        return;
      }
      scrollToResultIfStacked();
    });
    el("exampleBtn")?.addEventListener("click", fillExample);
    el("resetBtn")?.addEventListener("click", () => {
      resetAll();
      toast(T.reset);
    });
    el("shareBtn")?.addEventListener("click", share);

    // Enter у текстовому полі — розрахунок
    document.addEventListener("keydown", (e) => {
      const tg = e.target;
      if (e.key === "Enter" && tg && tg.tagName === "INPUT" && tg.type !== "checkbox" && tg.type !== "search") calc();
    });

    if (el("car")) updateCarHint();
    if (applyFromUrl()) calc();
    else render({ ok: false, none: true });
  });
})();
