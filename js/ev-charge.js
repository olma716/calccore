/* ev-charge.js — калькулятор вартості зарядки електромобіля (i18n-ready)
   - режими: від розетки / від зарядної станції / порівняння
   - втрати, обмеження авто (макс. AC/DC), орієнтовне сповільнення DC після 80%
   - вартість на 100 км, запас ходу, витрати за місяць і рік
   - валюта тарифів (12 валют, конвертація за курсом НБУ), групування тисяч, приклад
*/
(() => {
  const el = (id) => document.getElementById(id);

  // ===== i18n =====
  const t = (key, vars) => (window.t ? window.t(key, vars) : key);
  const locale = () => (window.i18nLocale ? window.i18nLocale() : "uk-UA");
  const IS_EN = !String(locale()).toLowerCase().startsWith("uk");

  const CURRENCIES = ["UAH", "USD", "EUR", "GBP", "CHF", "PLN", "CZK", "HUF", "RON", "CAD", "AUD", "TRY"];
  const CUR_FLAG = { UAH: "ua", USD: "us", EUR: "eu", GBP: "gb", CHF: "ch", PLN: "pl", CZK: "cz", HUF: "hu", RON: "ro", CAD: "ca", AUD: "au", TRY: "tr" };

  // ===== helpers =====
  // англійською кома — роздільник тисяч, українською — десятковий роздільник
  const NUM_CHARS = IS_EN ? /[\d.]/ : /[\d.,]/;
  const NON_NUM_CHARS = IS_EN ? /[^\d.]/g : /[^\d.,]/g;

  function num(v) {
    const raw = String(v ?? "").replace(/\s+/g, "");
    const s = IS_EN ? raw.replace(/,/g, "") : raw.replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  const val = (id) => num(el(id)?.value);
  const blank = (id) => (el(id)?.value || "").trim() === "";
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function groupNumber(raw) {
    const s = String(raw ?? "").replace(NON_NUM_CHARS, "");
    const m = s.match(/^(\d*)([.,]?)([\s\S]*)$/);
    const intPart = m[1].replace(/\B(?=(\d{3})+(?!\d))/g, IS_EN ? "," : " ");
    return intPart + m[2] + m[3].replace(/[^\d]/g, "");
  }

  // групування тисяч під час вводу зі збереженням позиції курсора
  function formatWhileTyping(inp) {
    const old = inp.value;
    const pos = inp.selectionStart ?? old.length;
    const digitsBefore = old.slice(0, pos).replace(NON_NUM_CHARS, "").length;
    const next = groupNumber(old);
    if (next === old) return;
    inp.value = next;
    let seen = 0;
    let i = 0;
    for (; i < next.length && seen < digitsBefore; i++) if (NUM_CHARS.test(next[i])) seen++;
    try {
      inp.setSelectionRange(i, i);
    } catch {}
  }

  const fmt2 = (n) => (Number.isFinite(n) ? n.toLocaleString(locale(), { maximumFractionDigits: 2, minimumFractionDigits: 2 }) : "—");
  const fmt0 = (n) => (Number.isFinite(n) ? Math.round(n).toLocaleString(locale()) : "—");

  // ===== валюта і курси =====
  let currency = "UAH";
  let rates = {}; // грн за 1 одиницю валюти (НБУ)

  const sym = (c = currency) => (c === "UAH" ? t("evc.unit_uah") : c);

  function fmtMoney(n) {
    if (!Number.isFinite(n)) return "—";
    const dec = currency === "UAH" || Math.abs(n) >= 100 ? 0 : 2;
    return n.toLocaleString(locale(), { maximumFractionDigits: dec, minimumFractionDigits: dec }) + " " + sym();
  }

  const perKwh = () => t("evc.per_kwh", { cur: sym() });
  const perMin = () => t("evc.per_min", { cur: sym() });

  async function loadRates() {
    try {
      const res = await fetch("https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json", { cache: "no-store" });
      if (!res.ok) throw new Error("NBU");
      const data = await res.json();
      const map = {};
      data.forEach((x) => {
        if (CURRENCIES.includes(x.cc) && Number(x.rate) > 0) map[x.cc] = Number(x.rate);
      });
      rates = map;
    } catch (e) {
      rates = {};
    }
  }

  const rateOf = (c) => (c === "UAH" ? 1 : rates[c] > 0 ? rates[c] : null);

  function syncCurrencyUI() {
    const f = CUR_FLAG[currency] || "ua";
    if (el("cur_flag")) el("cur_flag").src = `/assets/flags/${f}.png`;
    if (el("cur_code")) el("cur_code").textContent = currency;
    if (el("currency")) el("currency").value = currency;
    document.querySelectorAll("#cur_list li").forEach((li) => li.setAttribute("aria-selected", String(li.dataset.code === currency)));
    document.querySelectorAll("#evc .evc__quick").forEach((q) => (q.style.display = currency === "UAH" ? "" : "none"));
    updateStationTariffUI(true);
  }

  // ===== toast =====
  function toast(msg) {
    const n = el("toast");
    if (!n) return;
    n.textContent = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (n.textContent = ""), 2400);
  }

  // ===== стан =====
  let source = "home"; // home | station | compare
  const isAutoOn = () => !!el("auto_calc_toggle")?.checked;

  const getStationMode = () => el("station_tariff_mode")?.value || "kwh"; // kwh | min

  function updateStationTariffUI(skipCalc) {
    const mode = getStationMode();
    const label = el("station_price_label");
    const hint = el("station_hint");
    if (label) label.textContent = t("evc.station_price_label", { unit: mode === "min" ? perMin() : perKwh() });
    if (hint) hint.textContent = mode === "min" ? t("evc.station_hint_min") : t("evc.station_hint_kwh");
    if (!skipCalc && isAutoOn()) calculate({ soft: true });
  }

  function applyModeUI() {
    const home = el("home_tariff_card");
    const station = el("station_tariff_card");
    if (home) home.style.display = source === "station" ? "none" : "";
    if (station) station.style.display = source === "home" ? "none" : "";
  }

  function setSource(next) {
    source = next;
    el("srcHome")?.classList.toggle("is-active", source === "home");
    el("srcStation")?.classList.toggle("is-active", source === "station");
    el("srcCompare")?.classList.toggle("is-active", source === "compare");
    applyModeUI();
    saveProfile();
    if (isAutoOn()) calculate({ soft: true });
  }

  // ===== відображення =====
  function showDefault() {
    el("result").innerHTML = t("evc.hint_enter_and_calc");
    el("compare").innerHTML = "";
  }

  function showHint(msg) {
    el("result").innerHTML = `<div class="evc__hintbox">${msg}</div>`;
    el("compare").innerHTML = "";
  }

  // ===== розрахунки =====
  function missingFields() {
    const list = [];
    if (blank("battery_kwh")) list.push(t("evc.lbl_battery"));
    if (blank("soc_now")) list.push(t("evc.lbl_now"));
    if (blank("soc_target")) list.push(t("evc.lbl_target"));
    if (source !== "station" && blank("price_home")) list.push(t("evc.lbl_price_home"));
    if (source !== "home" && blank("price_station")) list.push(t("evc.lbl_price_station"));
    return list;
  }

  const anyEntered = () => ["battery_kwh", "soc_now", "soc_target", "price_home", "price_station"].some((id) => !blank(id));

  function calcEnergy() {
    const cap = val("battery_kwh");
    const now = val("soc_now");
    const target = val("soc_target");
    const lossPct = val("loss_pct");

    if (cap <= 0) return { ok: false, msg: t("evc.err_cap") };
    if (now < 0 || now > 100) return { ok: false, msg: t("evc.err_now") };
    if (target < 0 || target > 100) return { ok: false, msg: t("evc.err_target") };
    if (target <= now) return { ok: false, msg: t("evc.err_target_gt_now") };
    if (lossPct < 0 || lossPct > 50) return { ok: false, msg: t("evc.err_loss") };

    const loss = lossPct / 100;
    const eBatt = cap * ((target - now) / 100);
    const eGrid = eBatt / (1 - loss);
    return { ok: true, cap, now, target, loss, eBatt, eGrid };
  }

  const isDC = (p) => p >= 40;

  // час зарядки: потужність обмежується авто (AC або DC), на DC після 80% — орієнтовне сповільнення до ~30%
  function timeFor(power, base) {
    const dc = isDC(power);
    const carMax = dc ? val("car_max_dc") : val("car_max_ac");
    const limited = carMax > 0 && carMax < power;
    const pEff = limited ? carMax : power;
    const k = 1 / (1 - base.loss);

    let hours;
    let taper = false;
    if (dc && base.target > 80) {
      const e1 = base.cap * (Math.max(0, Math.min(base.target, 80) - base.now) / 100);
      const e2 = base.cap * ((base.target - Math.max(base.now, 80)) / 100);
      hours = (e1 * k) / pEff + (e2 * k) / (pEff * 0.3);
      taper = e2 > 0;
    } else {
      hours = base.eGrid / pEff;
    }
    return { hours, minutes: hours * 60, p: pEff, limited, taper, dc };
  }

  function costsFor(cost, base) {
    const perKwhBatt = cost / base.eBatt; // реальна ціна кВт⋅год «у батарею»
    const cons = val("cons_kwh100");
    const km = val("km_month");
    const per100 = cons > 0 ? cons * perKwhBatt : null;
    const range = cons > 0 ? (base.eBatt / cons) * 100 : null;
    const month = per100 !== null && km > 0 ? (per100 * km) / 100 : null;
    const year = month !== null ? month * 12 : null;
    return { per100, range, month, year };
  }

  // початок зарядки в хвилинах від півночі (null, якщо не вказано)
  function startMinutes() {
    const v = (el("start_time") && el("start_time").value) || "";
    if (v.length !== 5) return null; // потрібен повний формат ГГ:ХХ
    const p = v.split(":").map(Number);
    if (p.length !== 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || p[0] > 23 || p[1] > 59) return null;
    return p[0] * 60 + p[1];
  }

  // поле часу: автоматична двокрапка («2300» → «23:00»), швидкі кнопки, підсвічування активної
  function formatTimeInput(raw) {
    let d = String(raw).replace(/[^0-9]/g, "");
    if (d.length >= 2 && Number(d.slice(0, 2)) > 23) d = "0" + d; // «930» → «09:30»
    d = d.slice(0, 4);
    if (d.length === 4 && Number(d.slice(2)) > 59) d = d.slice(0, 2) + "59";
    return d.length > 2 ? d.slice(0, 2) + ":" + d.slice(2) : d;
  }

  function completeTime(v) {
    // на виході з поля: «9» → «09:00», «23» → «23:00», «23:3» → «23:30»
    if (!v) return v;
    const p = v.split(":");
    const hh = String(Math.min(23, Number(p[0] || 0))).padStart(2, "0");
    let mm = p[1] === undefined ? "00" : p[1].length === 1 ? p[1] + "0" : p[1];
    mm = String(Math.min(59, Number(mm))).padStart(2, "0");
    return hh + ":" + mm;
  }

  // підсвічування вибраної години й хвилин у спливаючому вікні
  function syncTimeChips() {
    const v = (el("start_time") && el("start_time").value) || "";
    const ok = v.length === 5;
    const hh = ok ? v.slice(0, 2) : "";
    const mm = ok ? v.slice(3) : "";
    document.querySelectorAll("#time_h li").forEach((li) => li.classList.toggle("is-on", li.getAttribute("data-v") === hh));
    document.querySelectorAll("#time_m li").forEach((li) => li.classList.toggle("is-on", li.getAttribute("data-v") === mm));
  }

  function closeTimePop() {
    const pop = el("time_pop");
    if (!pop || pop.hidden) return;
    pop.hidden = true;
    el("time_btn")?.setAttribute("aria-expanded", "false");
  }

  function initStartTime() {
    const inp = el("start_time");
    const btn = el("time_btn");
    const pop = el("time_pop");
    if (!inp) return;
    const commit = () => {
      inp.setAttribute("aria-invalid", "false");
      syncTimeChips();
      saveProfile();
      if (isAutoOn()) calculate({ soft: true });
    };

    // ручний ввід: автодвокрапка й завершення на виході з поля
    inp.addEventListener("input", () => {
      const f = formatTimeInput(inp.value);
      if (f !== inp.value) inp.value = f;
      inp.setAttribute("aria-invalid", f.length > 0 && f.length < 5 ? "true" : "false");
      syncTimeChips();
    });
    inp.addEventListener("blur", () => {
      if (inp.value) {
        const done = completeTime(inp.value);
        if (done !== inp.value) {
          inp.value = done;
          commit();
        }
      }
    });

    if (!btn || !pop) return;

    // колонки годин (нічні підсвічені) та хвилин із кроком 5
    const hList = el("time_h");
    const mList = el("time_m");
    hList.innerHTML = Array.from({ length: 24 }, (_, h) => {
      const v = String(h).padStart(2, "0");
      return '<li data-v="' + v + '" class="' + (h >= 23 || h < 7 ? "is-night" : "") + '">' + v + "</li>";
    }).join("");
    mList.innerHTML = Array.from({ length: 12 }, (_, i) => {
      const v = String(i * 5).padStart(2, "0");
      return '<li data-v="' + v + '">' + v + "</li>";
    }).join("");

    const setTime = (hh, mm) => {
      inp.value = hh + ":" + mm;
      commit();
    };
    const curHH = () => (inp.value.length === 5 ? inp.value.slice(0, 2) : String(new Date().getHours()).padStart(2, "0"));
    const curMM = () => (inp.value.length === 5 ? inp.value.slice(3) : "00");

    hList.addEventListener("click", (e) => {
      const li = e.target.closest("li[data-v]");
      if (li) setTime(li.getAttribute("data-v"), curMM());
    });
    mList.addEventListener("click", (e) => {
      const li = e.target.closest("li[data-v]");
      if (!li) return;
      setTime(curHH(), li.getAttribute("data-v"));
      closeTimePop();
    });
    el("time_now")?.addEventListener("click", () => {
      const d = new Date();
      const m = Math.round((d.getHours() * 60 + d.getMinutes()) / 5) * 5;
      const mm = m % 1440;
      setTime(String(Math.floor(mm / 60)).padStart(2, "0"), String(mm % 60).padStart(2, "0"));
      closeTimePop();
    });
    el("time_clear")?.addEventListener("click", () => {
      inp.value = "";
      commit();
      closeTimePop();
    });

    const open = () => {
      closeAllDd("");
      pop.hidden = false;
      btn.setAttribute("aria-expanded", "true");
      syncTimeChips();
      pop.querySelectorAll("ul").forEach((ul) => {
        const on = ul.querySelector("li.is-on");
        if (on) ul.scrollTop = Math.max(0, on.offsetTop - 70);
        else ul.scrollTop = ul === hList ? 18 * 32 : 0; // без значення показуємо вечірні години
      });
    };
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (pop.hidden) open();
      else closeTimePop();
    });
    inp.addEventListener("focus", () => {
      if (pop.hidden) open();
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#time_wrap")) closeTimePop();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeTimePop();
    });
  }

  // «Готово о …» від вибраного початку
  function readyAt(minutes) {
    const start = startMinutes();
    if (start === null) return "";
    const end = start + Math.round(minutes);
    const day = Math.floor(end / 1440);
    const mm = end % 1440;
    const time = String(Math.floor(mm / 60)).padStart(2, "0") + ":" + String(mm % 60).padStart(2, "0");
    return day > 0 ? t("evc.ready_at_day", { time: time, d: day }) : t("evc.ready_at", { time: time });
  }

  function homeCalc(base) {
    const price = val("price_home");
    const time = timeFor(val("socket_type"), base);
    const cost = base.eGrid * price;
    return { price, time, cost, extra: costsFor(cost, base), tariff: t("evc.tariff_label") + ": <b>" + fmt2(price) + "</b> " + perKwh() };
  }

  function stationCalc(base) {
    const price = val("price_station");
    const mode = getStationMode();
    const time = timeFor(val("station_power_kw"), base);
    const fee = Math.max(0, val("session_fee"));
    const cost = (mode === "kwh" ? base.eGrid * price : time.minutes * price) + fee;
    let tariff = t("evc.tariff_label") + ": <b>" + fmt2(price) + "</b> " + (mode === "min" ? perMin() : perKwh());
    if (fee > 0) tariff += "<br>" + t("evc.fee_line", { fee: fmtMoney(fee) });
    return { price, time, cost, extra: costsFor(cost, base), tariff };
  }

  // ===== рендер =====
  const tile = (title, value, mini, cls = "") =>
    `<div class="evc__kpi ${cls}"><div class="evc__kpiT">${title}</div><div class="evc__kpiV">${value}</div>${mini ? `<div class="evc__kpiM">${mini}</div>` : ""}</div>`;

  function timeTile(title, time, cls = "") {
    const notes = [];
    if (time.limited) notes.push(t(time.dc ? "evc.time_limit_dc" : "evc.time_limit_ac", { p: fmt2(time.p) }));
    if (time.taper) notes.push(t("evc.time_taper"));
    const rd = readyAt(time.minutes);
    const mini =
      `≈ ${fmt0(time.minutes)} ${t("evc.unit_min")} • ${fmt2(time.p)} ${t("evc.unit_kw")}` +
      (rd ? "<br><b>" + rd + "</b>" : "") +
      (notes.length ? `<br>${notes.join("; ")}` : "");
    return tile(title, `${fmt2(time.hours)} ${t("evc.unit_h")}`, mini, cls);
  }

  const headLine = (title, base) =>
    `${title} • ` + t("evc.from_to", { now: fmt2(base.now), target: fmt2(base.target) }) + ` • ` + t("evc.losses", { loss: fmt2(base.loss * 100) });

  const kmUnit = () => t("evc.unit_km");

  // блок «витрати на авто» для одного варіанта
  function carTiles(extra, label) {
    const pre = label ? `${label}: ` : "";
    const out = [];
    if (extra.per100 !== null) out.push(tile(pre + t("evc.kpi_per100"), fmtMoney(extra.per100), ""));
    if (extra.month !== null) {
      out.push(tile(pre + t("evc.kpi_month"), fmtMoney(extra.month), ""));
      out.push(tile(pre + t("evc.kpi_year"), fmtMoney(extra.year), ""));
    }
    return out;
  }

  function carHints(extra) {
    if (extra.per100 === null) return `<div class="evc__note">${t("evc.car_hint")}</div>`;
    if (extra.month === null) return `<div class="evc__note">${t("evc.month_hint")}</div>`;
    return "";
  }

  function renderSingle(base, r, title) {
    const tiles = [
      tile(t("evc.kpi_to_battery"), `${fmt2(base.eBatt)} ${t("evc.unit_kwh")}`, ""),
      tile(t("evc.kpi_from_grid"), `${fmt2(base.eGrid)} ${t("evc.unit_kwh")}`, ""),
      timeTile(t("evc.kpi_time"), r.time),
      tile(t("evc.kpi_cost"), fmtMoney(r.cost), r.tariff, "evc__kpi--main")
    ];

    const car = [];
    if (r.extra.range !== null) car.push(tile(t("evc.kpi_range"), `+${fmt0(r.extra.range)} ${kmUnit()}`, ""));
    car.push(...carTiles(r.extra));

    el("result").innerHTML = `
      <div class="evc__head">${headLine(title, base)}</div>
      <div class="evc__kpis">${tiles.join("")}</div>
      <div class="evc__sub">${t("evc.sub_car")}</div>
      ${car.length ? `<div class="evc__kpis">${car.join("")}</div>` : ""}
      ${carHints(r.extra)}
      <div class="evc__note">${t("evc.explain_base")}${getStationMode() === "min" && source === "station" ? " " + t("evc.explain_min") : ""}${r.time.taper ? " " + t("evc.explain_taper") : ""}</div>
    `;
    el("compare").innerHTML = "";
  }

  function renderCompare(base, h, s) {
    let winner = "eq";
    if (h.cost < s.cost) winner = "home";
    else if (s.cost < h.cost) winner = "station";
    const hTone = winner === "home" ? "is-win" : winner === "station" ? "is-lose" : "";
    const sTone = winner === "station" ? "is-win" : winner === "home" ? "is-lose" : "";

    const common = [
      tile(t("evc.kpi_to_battery"), `${fmt2(base.eBatt)} ${t("evc.unit_kwh")}`, ""),
      tile(t("evc.kpi_from_grid"), `${fmt2(base.eGrid)} ${t("evc.unit_kwh")}`, "")
    ];
    if (h.extra.range !== null) common.push(tile(t("evc.kpi_range"), `+${fmt0(h.extra.range)} ${kmUnit()}`, ""));

    const group = (title, r, tone) => `
      <div class="evc__colHead">${title}</div>
      ${timeTile(t("evc.kpi_time"), r.time)}
      ${tile(t("evc.kpi_cost"), fmtMoney(r.cost), r.tariff, tone)}
      ${r.extra.per100 !== null ? tile(t("evc.kpi_per100"), fmtMoney(r.extra.per100), "", tone) : ""}
      ${r.extra.month !== null ? tile(t("evc.kpi_month"), fmtMoney(r.extra.month), `${t("evc.kpi_year")}: ${fmtMoney(r.extra.year)}`, tone) : ""}
    `;

    el("result").innerHTML = `
      <div class="evc__head">${headLine(t("evc.compare_title"), base)}</div>
      <div class="evc__kpis">${common.join("")}</div>
      <div class="evc__kpis">
        ${group(t("evc.source_home"), h, hTone)}
        ${group(t("evc.source_station"), s, sTone)}
      </div>
      ${carHints(h.extra)}
      <div class="evc__note">${t("evc.explain_base")}${getStationMode() === "min" ? " " + t("evc.explain_min") : ""}${h.time.taper || s.time.taper ? " " + t("evc.explain_taper") : ""}</div>
    `;

    const diff = Math.abs(s.cost - h.cost);
    let verdict = t("evc.same_cost");
    let cls = "";
    if (winner === "home") {
      verdict = t("evc.cheaper_home", { diff: fmtMoney(diff) });
      cls = "is-home";
    } else if (winner === "station") {
      verdict = t("evc.cheaper_station", { diff: fmtMoney(diff) });
      cls = "is-station";
    }
    el("compare").innerHTML = `<div class="evc__verdict ${cls}">${verdict}</div>`;
  }

  // ===== основний розрахунок =====
  function calculate(opts = {}) {
    const soft = !!opts.soft;

    const miss = missingFields();
    if (miss.length) {
      if (!anyEntered()) showDefault();
      else showHint(t("evc.missing", { list: miss.join(", ") }));
      if (!soft && anyEntered()) toast(t("evc.missing", { list: miss.join(", ") }));
      return false;
    }

    const base = calcEnergy();
    if (!base.ok) {
      showHint(base.msg);
      return false;
    }

    const modeMin = getStationMode() === "min";
    const unit = modeMin ? perMin() : perKwh();

    if (source !== "station" && val("price_home") <= 0) {
      showHint(t("evc.err_price_home"));
      return false;
    }
    if (source !== "home" && val("price_station") <= 0) {
      showHint(t("evc.err_price_station", { unit }));
      return false;
    }
    if (source !== "home" && val("station_power_kw") <= 0) {
      showHint(t("evc.err_power"));
      return false;
    }

    if (source === "home") renderSingle(base, homeCalc(base), t("evc.source_home"));
    else if (source === "station") renderSingle(base, stationCalc(base), t("evc.source_station"));
    else renderCompare(base, homeCalc(base), stationCalc(base));
    return true;
  }

  // ===== кнопки =====
  const TEXT_IDS = ["battery_kwh", "soc_now", "soc_target", "loss_pct", "start_time", "price_home", "price_station", "session_fee", "car_max_ac", "car_max_dc", "cons_kwh100", "km_month"];

  function setVal(id, v) {
    const n = el(id);
    if (n) n.value = v;
    if (DD_IDS.includes(id)) syncDd(id);
    if (id === "start_time") syncTimeChips();
  }

  function resetAll() {
    TEXT_IDS.forEach((id) => setVal(id, ""));
    setVal("socket_type", "2.3");
    setVal("station_tariff_mode", "kwh");
    setVal("station_power_kw", "7");
    currency = "UAH";
    setVal("currency", "UAH");
    if (el("car_details")) el("car_details").open = false;
    if (el("remember_toggle")) el("remember_toggle").checked = false;
    setVal("car", "");
    updateCarHint();
    try {
      localStorage.removeItem(LS_KEY);
    } catch (e) {}
    syncCurrencyUI();
    updateStationTariffUI(true);
    applyModeUI();
    showDefault();
  }

  function fillExample() {
    currency = "UAH";
    setVal("currency", "UAH");
    setVal("car", "");
    updateCarHint();
    setVal("battery_kwh", "62");
    setVal("soc_now", "20");
    setVal("soc_target", "80");
    setVal("loss_pct", "10");
    setVal("socket_type", "7.4");
    setVal("price_home", "4.32");
    setVal("start_time", "23:00");
    setVal("station_tariff_mode", "kwh");
    setVal("price_station", "24");
    setVal("session_fee", "20");
    setVal("station_power_kw", "50");
    setVal("car_max_ac", "11");
    setVal("car_max_dc", "100");
    setVal("cons_kwh100", "17");
    setVal("km_month", groupNumber("1500"));
    if (el("car_details")) el("car_details").open = true;
    syncCurrencyUI();
    setSource("compare");
    calculate({ soft: true });
    toast(t("evc.example_done"));
  }

  // ===== вибір моделі авто: підставляє лише ємність батареї =====
  const carList = () => (Array.isArray(window.EV_MODELS) ? window.EV_MODELS : []);
  const fmtKwh = (n) => n.toLocaleString(locale(), { maximumFractionDigits: 1 });

  function closeCarList() {
    const list = el("car_list");
    if (!list || list.hidden) return;
    list.hidden = true;
    el("car_btn")?.setAttribute("aria-expanded", "false");
  }

  function pickCar(id) {
    const sel = el("car");
    if (!sel) return;
    sel.value = id;
    const m = carList().find((x) => x.id === id);
    if (m) setVal("battery_kwh", String(m.kwh));
    updateCarHint();
    saveProfile();
    if (isAutoOn()) calculate({ soft: true });
  }

  // вибір авто — кнопка й випадний список, як вибір валюти; під капотом прихований <select id="car"> зберігає стан
  function initCarSelect() {
    const sel = el("car");
    const list = el("car_list");
    const btn = el("car_btn");
    if (!sel || !list || !btn) return;

    const models = carList();
    const makes = [];
    models.forEach((m) => {
      if (!makes.includes(m.make)) makes.push(m.make);
    });
    const noneText = sel.getAttribute("data-none") || "";
    if (el("car_label")) el("car_label").setAttribute("data-none", el("car_label").textContent);

    sel.innerHTML = '<option value=""></option>' + models.map((m) => '<option value="' + m.id + '">' + m.name + "</option>").join("");
    list.innerHTML =
      '<li role="presentation" class="evc__ddSearchRow"><input type="search" class="evc__ddSearch" id="car_search" autocomplete="off" placeholder="' + t("evc.car_search_ph") + '" aria-label="' + t("evc.car_search_ph") + '"></li>' +
      '<li role="option" tabindex="-1" data-id="" aria-selected="true"><span class="evc__ddCar">' + noneText + "</span></li>" +
      makes
        .map(
          (mk) =>
            '<li role="presentation" class="evc__ddGroup">' + mk + "</li>" +
            models
              .filter((m) => m.make === mk)
              .map(
                (m) =>
                  '<li role="option" tabindex="-1" data-id="' + m.id + '" data-make="' + m.make + '" aria-selected="false"><span class="evc__ddCar">' + m.name +
                  '</span><span class="evc__ddName">≈' + fmtKwh(m.kwh) + " " + t("evc.unit_kwh") + "</span></li>"
              )
              .join("")
        )
        .join("") +
      '<li role="presentation" class="evc__ddEmpty" hidden>' + t("evc.car_not_found") + "</li>";

    // пошук: ігнорує регістр, пробіли, дефіси й крапки («etron» знаходить «e-tron»)
    const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9а-яіїєґ]+/g, "");
    const search = el("car_search");
    const applyFilter = () => {
      const q = norm(search.value);
      let any = false;
      let groupEl = null;
      let groupHasMatch = false;
      const flushGroup = () => {
        if (groupEl) groupEl.hidden = !groupHasMatch;
      };
      list.querySelectorAll("li").forEach((li) => {
        if (li.classList.contains("evc__ddSearchRow") || li.classList.contains("evc__ddEmpty")) return;
        if (li.classList.contains("evc__ddGroup")) {
          flushGroup();
          groupEl = li;
          groupHasMatch = false;
          return;
        }
        const id = li.getAttribute("data-id");
        const text = id === "" ? "" : (li.getAttribute("data-make") || "") + li.textContent;
        const show = q === "" ? true : id !== "" && norm(text).includes(q);
        li.hidden = !show;
        if (show && id !== "") {
          groupHasMatch = true;
          any = true;
        }
      });
      flushGroup();
      list.querySelector(".evc__ddEmpty").hidden = q === "" || any;
    };
    search.addEventListener("input", applyFilter);
    search.addEventListener("click", (e) => e.stopPropagation());
    search.addEventListener("keydown", (e) => {
      e.stopPropagation(); // щоб Enter не запускав розрахунок
      if (e.key === "Escape") {
        closeCarList();
        btn.focus();
      } else if (e.key === "Enter") {
        e.preventDefault();
        const first = [...list.querySelectorAll("li[data-id]")].find((li) => !li.hidden && li.getAttribute("data-id") !== "");
        if (first) {
          closeCarList();
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
      closeCarList();
      pickCar(li.getAttribute("data-id"));
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#car_dd")) closeCarList();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeCarList();
    });

    // ручна зміна ємності скасовує вибір моделі
    el("battery_kwh")?.addEventListener("input", () => {
      if (sel.value) {
        sel.value = "";
        updateCarHint();
      }
    });
  }

  // підпис кнопки, виділення в списку й попередження про точність
  function updateCarHint() {
    const sel = el("car");
    const id = sel ? sel.value : "";
    const m = carList().find((x) => x.id === id);
    const label = el("car_label");
    if (label) {
      const none = el("car_btn") ? el("car_btn").getAttribute("data-none-label") : "";
      if (m) label.textContent = m.make + " " + m.name;
      else label.textContent = label.getAttribute("data-none") || label.textContent;
    }
    document.querySelectorAll("#car_list li[data-id]").forEach((li) => li.setAttribute("aria-selected", String(li.getAttribute("data-id") === id)));
    const hint = el("car_hint");
    if (hint) hint.textContent = m ? t(m.conf === "ok" ? "evc.car_note_ok" : "evc.car_note_approx") : "";
  }

  // ===== запамʼятовування даних (лише в браузері) =====
  const LS_KEY = "evc_profile_v1";
  const PROFILE_IDS = ["car", "battery_kwh", "loss_pct", "socket_type", "price_home", "price_station", "station_tariff_mode", "station_power_kw", "session_fee", "car_max_ac", "car_max_dc", "cons_kwh100", "km_month"];

  function saveProfile() {
    try {
      if (!el("remember_toggle") || !el("remember_toggle").checked) return;
      const data = { currency: currency, source: source };
      PROFILE_IDS.forEach((id) => (data[id] = (el(id) && el(id).value) || ""));
      localStorage.setItem(LS_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function loadProfile() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      PROFILE_IDS.forEach((id) => {
        if (typeof d[id] === "string") setVal(id, d[id]);
      });
      if (CURRENCIES.includes(d.currency)) {
        currency = d.currency;
        setVal("currency", currency);
      }
      if (el("remember_toggle")) el("remember_toggle").checked = true;
      updateCarHint();
      if (el("car_details") && ["car_max_ac", "car_max_dc", "cons_kwh100", "km_month"].some((id) => !blank(id))) el("car_details").open = true;
      syncCurrencyUI();
      setSource(d.source === "station" ? "station" : d.source === "compare" ? "compare" : "home");
      return true;
    } catch (e) {
      return false;
    }
  }

  const URL_IDS = ["car", "battery_kwh", "soc_now", "soc_target", "loss_pct", "start_time", "socket_type", "price_home", "price_station", "session_fee", "station_tariff_mode", "station_power_kw", "car_max_ac", "car_max_dc", "cons_kwh100", "km_month"];

  function share() {
    const params = new URLSearchParams();
    URL_IDS.forEach((id) => {
      let v = (el(id)?.value || "").trim();
      if (id === "km_month" && v) v = String(num(v)); // без групування тисяч у посиланні
      if (v) params.set(id, v);
    });
    params.set("cur", currency);
    params.set("src", source);
    params.set("auto_calc_toggle", isAutoOn() ? "1" : "0");
    const url = `${location.origin}${location.pathname}?${params.toString()}`;
    navigator.clipboard
      ?.writeText(url)
      .then(() => toast(t("evc.link_copied")))
      .catch(() => toast(t("evc.link_copy_failed")));
  }

  function applyFromUrl() {
    const params = new URLSearchParams(location.search);
    if (![...params.keys()].length) return;

    URL_IDS.forEach((id) => {
      if (!params.has(id)) return;
      const v = params.get(id);
      setVal(id, id === "km_month" ? groupNumber(v) : v);
    });

    updateCarHint();

    const cur = params.get("cur");
    if (cur && CURRENCIES.includes(cur)) {
      currency = cur;
      setVal("currency", cur);
    }
    if (params.has("auto_calc_toggle") && el("auto_calc_toggle")) el("auto_calc_toggle").checked = params.get("auto_calc_toggle") === "1";
    if (el("car_details") && ["car_max_ac", "car_max_dc", "cons_kwh100", "km_month"].some((id) => !blank(id))) el("car_details").open = true;

    const src = params.get("src");
    syncCurrencyUI();
    setSource(src === "station" ? "station" : src === "compare" ? "compare" : "home");
    if (anyEntered()) calculate({ soft: true });
  }

  // ===== валюта: зміна з конвертацією тарифів =====
  function onCurrencyChange() {
    const next = el("currency").value;
    const prev = currency;
    if (next === prev) return;

    const rp = rateOf(prev);
    const rn = rateOf(next);
    const hasPrices = ["price_home", "price_station"].some((id) => !blank(id) && val(id) > 0);
    if (rp && rn) {
      ["price_home", "price_station"].forEach((id) => {
        const node = el(id);
        const v = val(id);
        if (blank(id) || !(v > 0)) return;
        // точна база в грн: якщо значення не редагували вручну, береться збережена база (без накопичення округлень)
        const baseUah = node.dataset.shown === node.value && node.dataset.baseUah ? Number(node.dataset.baseUah) : v * rp;
        const shown = String(Math.round((baseUah / rn) * 10000) / 10000);
        node.value = shown;
        node.dataset.baseUah = String(baseUah);
        node.dataset.shown = shown;
      });
    } else if (hasPrices) {
      toast(t("evc.rates_missing"));
    }
    currency = next;
    syncCurrencyUI();
    saveProfile();
    if (isAutoOn()) calculate({ soft: true });
  }

  function closeAllDd(exceptId) {
    if (el("time_pop") && !el("time_pop").hidden) {
      el("time_pop").hidden = true;
      el("time_btn")?.setAttribute("aria-expanded", "false");
    }
    document.querySelectorAll("#evc .evc__ddList").forEach((ul) => {
      if (ul.id === exceptId || ul.hidden) return;
      ul.hidden = true;
      const dd = ul.closest(".evc__dd");
      dd?.querySelector(".evc__ddBtn")?.setAttribute("aria-expanded", "false");
    });
  }

  // випадний список для <select> з коротким списком (тип розетки): приховане поле зберігає значення
  // усі короткі списки сторінки (розетка, тариф станції, потужність станції) — однакові випадні списки
  const DD_IDS = ["socket_type", "station_tariff_mode", "station_power_kw"];

  function syncDd(id) {
    const sel = el(id);
    if (!sel) return;
    const label = el(id + "_label");
    if (label && sel.selectedOptions[0]) label.textContent = sel.selectedOptions[0].text;
    document.querySelectorAll("#" + id + "_list li").forEach((li) => li.setAttribute("aria-selected", String(li.getAttribute("data-value") === sel.value)));
  }

  function initDd(id) {
    const sel = el(id);
    const list = el(id + "_list");
    const btn = el(id + "_btn");
    if (!sel || !list || !btn) return;
    list.innerHTML = [...sel.options]
      .map((o) => '<li role="option" tabindex="-1" data-value="' + o.value + '" aria-selected="false"><span class="evc__ddCar">' + o.text + "</span></li>")
      .join("");
    const close = () => {
      if (list.hidden) return;
      list.hidden = true;
      btn.setAttribute("aria-expanded", "false");
    };
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllDd(list.id);
      const open = list.hidden;
      list.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      if (open) list.querySelector('li[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
    });
    list.addEventListener("click", (e) => {
      const li = e.target.closest("li[data-value]");
      if (!li) return;
      close();
      sel.value = li.getAttribute("data-value");
      syncDd(id);
      sel.dispatchEvent(new Event("change", { bubbles: true })); // спрацює збереження, оновлення підписів і авто-розрахунок
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#" + id + "_dd")) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
    syncDd(id);
  }

  // вибір валюти — кнопка з прапорцем і випадний список, як у калькуляторах пального та TCO
  function closeCurrencyList() {
    const list = el("cur_list");
    if (!list || list.hidden) return;
    list.hidden = true;
    el("cur_btn")?.setAttribute("aria-expanded", "false");
  }

  function initCurrencySelect() {
    const sel = el("currency");
    const list = el("cur_list");
    const btn = el("cur_btn");
    if (!sel || !list || !btn) return;

    let names = null;
    try {
      names = new Intl.DisplayNames([locale().split("-")[0]], { type: "currency" });
    } catch {}
    const nameOf = (c) => {
      try {
        const nm = names ? names.of(c) : "";
        return nm ? nm.charAt(0).toUpperCase() + nm.slice(1) : "";
      } catch {
        return "";
      }
    };

    sel.innerHTML = CURRENCIES.map((c) => `<option value="${c}">${c}</option>`).join("");
    sel.value = currency;
    list.innerHTML = CURRENCIES.map(
      (c) =>
        `<li role="option" tabindex="-1" data-code="${c}" aria-selected="${c === currency}"><img class="evc__ddFlag" src="/assets/flags/${CUR_FLAG[c]}.png" width="20" height="14" alt="" loading="lazy" decoding="async"><span class="evc__ddCode">${c}</span><span class="evc__ddName">${nameOf(c)}</span></li>`
    ).join("");

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllDd(list.id);
      const open = list.hidden;
      list.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      if (open) list.querySelector('li[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
    });
    list.addEventListener("click", (e) => {
      const li = e.target.closest("li[data-code]");
      if (!li) return;
      closeCurrencyList();
      sel.value = li.dataset.code;
      onCurrencyChange();
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#cur_dd")) closeCurrencyList();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeCurrencyList();
    });
  }

  // ===== прокрутка до результату на вузьких екранах =====
  function scrollToResultIfStacked() {
    const cards = document.querySelectorAll(".evc__card");
    if (cards.length < 2) return;
    const stacked = cards[1].getBoundingClientRect().top >= cards[0].getBoundingClientRect().bottom - 5;
    if (stacked) cards[1].scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ===== init =====
  window.addEventListener("DOMContentLoaded", async () => {
    el("srcHome")?.addEventListener("click", () => setSource("home"));
    el("srcStation")?.addEventListener("click", () => setSource("station"));
    el("srcCompare")?.addEventListener("click", () => setSource("compare"));
    el("station_tariff_mode")?.addEventListener("change", () => updateStationTariffUI(false));

    el("calcBtn")?.addEventListener("click", () => {
      const ok = calculate({ soft: false });
      if (ok) {
        if (el("toast")) el("toast").textContent = "";
        scrollToResultIfStacked();
      }
    });
    el("resetBtn")?.addEventListener("click", () => {
      resetAll();
      toast(t("evc.reset_done"));
    });
    el("exampleBtn")?.addEventListener("click", fillExample);
    el("shareBtn")?.addEventListener("click", share);

    // швидкі тарифи для побутових споживачів (лише у гривнях)
    document.querySelectorAll("#evc [data-fill]").forEach((b) =>
      b.addEventListener("click", () => {
        setVal(b.getAttribute("data-target") || "price_home", b.getAttribute("data-fill"));
        saveProfile();
        if (isAutoOn()) calculate({ soft: true });
      })
    );

    // «Запамʼятати мої дані»
    el("remember_toggle")?.addEventListener("change", () => {
      if (el("remember_toggle").checked) {
        saveProfile();
        toast(t("evc.remember_on"));
      } else {
        try {
          localStorage.removeItem(LS_KEY);
        } catch (e) {}
        toast(t("evc.remember_off"));
      }
    });

    // групування тисяч для пробігу
    el("km_month")?.addEventListener("input", () => formatWhileTyping(el("km_month")));

    // Enter у текстовому полі — розрахунок
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const tg = e.target;
      if (tg && tg.tagName === "INPUT" && tg.type !== "checkbox") calculate({ soft: false });
    });

    // авто-розрахунок
    document.querySelectorAll("#evc input, #evc select").forEach((n) => {
      if (n.id === "auto_calc_toggle" || n.id === "currency" || n.id === "remember_toggle") return;
      n.addEventListener("input", () => {
        saveProfile();
        if (isAutoOn()) calculate({ soft: true });
      });
      n.addEventListener("change", () => {
        saveProfile();
        if (isAutoOn()) calculate({ soft: true });
      });
    });

    el("auto_calc_toggle")?.addEventListener("change", () => {
      if (isAutoOn()) calculate({ soft: true });
    });

    DD_IDS.forEach(initDd);
    initStartTime();
    initCarSelect();
    initCurrencySelect();
    syncCurrencyUI();
    applyModeUI();
    showDefault();
    await loadRates();
    // посилання має пріоритет лише якщо в ньому є параметри калькулятора (а не utm_ тощо)
    const qs = new URLSearchParams(location.search);
    const hasUrl = qs.has("src") || qs.has("cur") || URL_IDS.some((id) => qs.has(id));
    if (hasUrl) applyFromUrl();
    else if (loadProfile() && anyEntered()) calculate({ soft: true });
  });
})();
