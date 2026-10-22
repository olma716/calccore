/* depreciation-calculator.js — калькулятор знецінення (амортизації) авто (UK/EN)
   Вартість наступного року = вартість поточного × коефіцієнт збереження для віку авто.
   Профілі (частка вартості, що лишається за рік; перший елемент — перший рік життя авто):
     «середнє» — за 5 років лишається ≈54,2% (iSeeCars 2025: у середньому втрата 45,6%; перший рік ≈20%, LendingTree);
     «тримає вартість» — ≈60,8% (пікапи 40,4%, гібриди 40,7% втрати);
     «швидко знецінюється» — ≈43,3% (нішеві й розкішні моделі);
     «електро» — ≈41,2% (EV: 58,8% втрати за 5 років, iSeeCars 2025; 57,2% у 2026).
   Це дані США, орієнтир для українського ринку. Свій відсоток: стале знецінення за рік (спадний залишок).
   Після 10-го року береться останній коефіцієнт профілю. Вік авто зараз зсуває початок профілю. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const LOCALE = IS_EN ? "en-US" : "uk-UA";

  const T = IS_EN
    ? {
        enter: "Enter the current car value — the result will appear here.",
        missing: "To calculate, fill in: {list}.",
        lblPrice: "car value",
        errPrice: "Car value must be between 1 000 and 1 000 000 000.",
        errAge: "Car age must be a whole number from 0 to 15 years.",
        errYears: "Forecast period must be a whole number from 1 to 10 years.",
        errKm: "Mileage per year must be between 0 and 200 000 km.",
        errRate: "Yearly depreciation must be between 0.1 and 50%.",
        cur: { UAH: "UAH", USD: "USD", EUR: "EUR" },
                value: "Estimated value after {n} years", valueMini: "{p}% of the current value",
        kLoss: "Total value lost", kLossMini: "{p}% of the current value",
        kYear: "Loss per year (average)", kMonth: "Loss per month (average)", kFirst: "Loss in the first year", kKm: "Loss per 1 km",
        leaseTitle: "For a lease", leaseText: "Residual value after {n} years ≈ {p}% of the price.", leaseLink: "Calculate a lease with this residual value →",
        chartTitle: "Car value by year", chartCap: "The bar is the share of the current value; the red figure is the loss for that year.", now: "now", yearRow: "year {n}",
        thYear: "Year", thVal: "Value", thLoss: "Loss for the year", thCum: "Lost in total", thPct: "% of current", thTotal: "Total",
        tableCopied: "Table copied ✅", csvDone: "CSV downloaded ✅",
        modelNote: "A forecast from average market data (the USA: iSeeCars, LendingTree). The real value of your car depends on the model, mileage, condition and the local market.",
        linkCopied: "Link copied ✅", copyFailed: "Could not copy 😕", reset: "Reset ✅", example: "Example filled in ✅"
      }
    : {
        enter: "Вкажіть поточну вартість авто — результат зʼявиться тут.",
        missing: "Щоб порахувати, заповніть: {list}.",
        lblPrice: "вартість авто",
        errPrice: "Вартість авто має бути від 1 000 до 1 000 000 000.",
        errAge: "Вік авто — ціле число від 0 до 15 років.",
        errYears: "Період прогнозу — ціле число від 1 до 10 років.",
        errKm: "Пробіг на рік має бути від 0 до 200 000 км.",
        errRate: "Знецінення за рік має бути від 0,1 до 50%.",
        cur: { UAH: "грн", USD: "USD", EUR: "EUR" },
                value: "Орієнтовна вартість через {n} р.", valueMini: "{p}% від поточної вартості",
        kLoss: "Загальна втрата вартості", kLossMini: "{p}% від поточної вартості",
        kYear: "Втрата на рік (у середньому)", kMonth: "Втрата на місяць (у середньому)", kFirst: "Втрата за перший рік", kKm: "Втрата на 1 км",
        leaseTitle: "Для лізингу", leaseText: "Залишкова вартість через {n} р. ≈ {p}% від ціни.", leaseLink: "Розрахувати лізинг із такою залишковою вартістю →",
        chartTitle: "Вартість авто по роках", chartCap: "Смужка — частка поточної вартості, червоним — втрата за цей рік.", now: "зараз", yearRow: "рік {n}",
        thYear: "Рік", thVal: "Вартість", thLoss: "Втрата за рік", thCum: "Втрачено всього", thPct: "% від поточної", thTotal: "Разом",
        tableCopied: "Таблицю скопійовано ✅", csvDone: "CSV завантажено ✅",
        modelNote: "Прогноз за усередненими даними ринку (США: iSeeCars, LendingTree). Реальна вартість вашого авто залежить від моделі, пробігу, стану й місцевого ринку.",
        linkCopied: "Посилання скопійовано ✅", copyFailed: "Не вдалось скопіювати 😕", reset: "Скинуто ✅", example: "Підставлено приклад ✅"
      };

  // коефіцієнти збереження вартості за рік життя авто (1-й, 2-й, … рік)
  const PROFILES = {
    average: [0.8, 0.88, 0.9, 0.92, 0.93, 0.94, 0.945, 0.95, 0.955, 0.96],
    holds: [0.84, 0.9, 0.92, 0.93, 0.94, 0.95, 0.955, 0.96, 0.965, 0.97],
    fast: [0.74, 0.84, 0.87, 0.89, 0.9, 0.92, 0.93, 0.94, 0.945, 0.95],
    ev: [0.75, 0.82, 0.85, 0.87, 0.905, 0.92, 0.93, 0.94, 0.945, 0.95]
  };
  const state = { type: "average", cur: "UAH" };

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
  const money = (n) => f0(n) + " " + T.cur[state.cur];

  function toast(msg) {
    const n = el("toast");
    if (!n) return;
    n.textContent = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (n.textContent = ""), 2400);
  }

  // ===== розрахунок =====
  function retention(type, ageIndex, custom) {
    if (type === "custom") return 1 - custom / 100;
    const p = PROFILES[type];
    return p[Math.min(ageIndex, p.length - 1)];
  }

  function compute() {
    if (blank("price")) return { ok: false, none: ["age", "years", "km", "rate"].every(blank), msg: ["age", "years", "km", "rate"].every(blank) ? "" : fill(T.missing, { list: T.lblPrice }) };
    const price = num(el("price").value);
    if (!(price >= 1000 && price <= 1e9)) return { ok: false, msg: T.errPrice };
    let age = 0;
    if (!blank("age")) {
      age = num(el("age").value);
      if (!(Number.isInteger(age) && age >= 0 && age <= 15)) return { ok: false, msg: T.errAge };
    }
    let years = 5;
    if (!blank("years")) {
      years = num(el("years").value);
      if (!(Number.isInteger(years) && years >= 1 && years <= 10)) return { ok: false, msg: T.errYears };
    }
    let km = 0;
    if (!blank("km")) {
      km = num(el("km").value);
      if (!(km >= 0 && km <= 200000)) return { ok: false, msg: T.errKm };
    }
    let custom = 0;
    if (state.type === "custom") {
      if (blank("rate")) return { ok: false, msg: fill(T.missing, { list: IS_EN ? "yearly depreciation" : "знецінення за рік" }) };
      custom = num(el("rate").value);
      if (!(custom >= 0.1 && custom <= 50)) return { ok: false, msg: T.errRate };
    }
    const rows = [{ year: 0, value: price, loss: 0, cum: 0, pct: 100 }];
    let v = price;
    for (let y = 1; y <= years; y++) {
      const nv = v * retention(state.type, age + y - 1, custom);
      rows.push({ year: y, value: nv, loss: v - nv, cum: price - nv, pct: (nv / price) * 100 });
      v = nv;
    }
    const last = rows[rows.length - 1];
    return {
      ok: true, price, age, years, km, type: state.type, custom, rows,
      valueN: last.value, lossTotal: price - last.value, lossPct: ((price - last.value) / price) * 100, pctN: last.pct,
      perYear: (price - last.value) / years, perMonth: (price - last.value) / (years * 12), first: rows[1].loss,
      perKm: km > 0 ? (price - last.value) / (km * years) : null
    };
  }

  // ===== відображення =====
  const tile = (title, value, mini, cls = "") =>
    '<div class="dpr__kpi ' + cls + '"><div class="dpr__kpiT">' + title + '</div><div class="dpr__kpiV">' + value + "</div>" + (mini ? '<div class="dpr__kpiM">' + mini + "</div>" : "") + "</div>";

  function chart(r) {
    const rows = r.rows
      .map((x) => {
        const w = Math.max(2, Math.min(100, x.pct));
        const out = w < 38;
        const label = f0(x.value);
        return (
          '<div class="dpr__yr" role="listitem"><span class="dpr__yrN">' + (x.year === 0 ? T.now : fill(T.yearRow, { n: x.year })) + '</span>' +
          '<div class="dpr__yrT"><i style="width:' + w.toFixed(1) + '%"></i>' +
          '<b class="' + (out ? "is-out" : "") + '"' + (out ? ' style="left:calc(' + w.toFixed(1) + '% + 8px)"' : "") + ">" + label + "</b>" +
          (x.year > 0 ? "<u>−" + f0(x.loss) + "</u>" : "") + "</div></div>"
        );
      })
      .join("");
    return '<div class="dpr__yrs" role="list" aria-label="' + T.chartTitle + '">' + rows + '</div><div class="dpr__hint">' + T.chartCap + "</div>";
  }

  function scheduleHtml(r) {
    const body = r.rows
      .map((x) => "<tr><td>" + x.year + "</td><td>" + f2(x.value) + "</td><td>" + (x.year === 0 ? "—" : f2(x.loss)) + "</td><td>" + (x.year === 0 ? "—" : f2(x.cum)) + "</td><td>" + nf(x.pct, 1) + "%</td></tr>")
      .join("");
    const tot = r.rows.reduce((s, x) => s + x.loss, 0);
    return (
      '<table class="dpr__tbl dpr__tbl--sch" id="scheduleTable"><thead><tr><th>' + T.thYear + "</th><th>" + T.thVal + "</th><th>" + T.thLoss + "</th><th>" + T.thCum + "</th><th>" + T.thPct + "</th></tr></thead><tbody>" +
      body + '<tr class="dpr__total"><td>' + T.thTotal + "</td><td>—</td><td>" + f2(tot) + "</td><td>—</td><td>" + nf(r.rows[r.rows.length - 1].pct, 1) + "%</td></tr></tbody></table>"
    );
  }

  let last = null;

  function render(r) {
    const box = el("result");
    const sch = el("schedule");
    if (!r.ok) {
      last = null;
      box.innerHTML = r.none || !r.msg ? T.enter : '<div class="dpr__hintbox">' + r.msg + "</div>";
      sch.hidden = true;
      return;
    }
    last = r;
    const resid = Math.min(95, Math.max(0, Math.round(r.pctN)));
    const leaseUrl = (IS_EN ? "/en" : "") + "/auto/lease-calculator?" + new URLSearchParams({ price: String(Math.round(r.price)), residual: String(resid), term: String(r.years * 12), cur: state.cur }).toString();
    const tiles =
      tile(fill(T.value, { n: r.years }), money(r.valueN), fill(T.valueMini, { p: f1(r.pctN) }), "dpr__kpi--main dpr__kpi--wide") +
      tile(T.kLoss, money(r.lossTotal), fill(T.kLossMini, { p: f1(r.lossPct) })) +
      tile(T.kFirst, money(r.first), "") +
      tile(T.kYear, money(r.perYear), "") +
      tile(T.kMonth, money(r.perMonth), "") +
      (r.perKm != null ? tile(T.kKm, f2(r.perKm) + " " + T.cur[state.cur], "") : "");
    const lease =
      '<div class="dpr__sub">' + T.leaseTitle + "</div>" +
      '<div class="dpr__verdict"><b>' + fill(T.leaseText, { n: r.years, p: f1(r.pctN) }) + '</b><br><a class="dpr__link" href="' + leaseUrl + '">' + T.leaseLink + "</a></div>";
    box.innerHTML = '<div class="dpr__kpis">' + tiles + "</div>" + lease + '<div class="dpr__sub">' + T.chartTitle + "</div>" + chart(r) + '<div class="dpr__note">' + T.modelNote + "</div>";
    sch.hidden = false;
    el("schedBody").innerHTML = scheduleHtml(r);
  }

  function calc() {
    render(compute());
  }

  // ===== таблиця: копіювання й CSV =====
  const tableMatrix = () => {
    const t = el("scheduleTable");
    return t ? Array.from(t.querySelectorAll("tr")).map((tr) => Array.from(tr.children).map((c) => c.textContent.trim())) : [];
  };
  async function copyTable() {
    try {
      await navigator.clipboard.writeText(tableMatrix().map((row) => row.join("\t")).join("\n"));
      toast(T.tableCopied);
    } catch {
      toast(T.copyFailed);
    }
  }
  function downloadCsv() {
    if (!last) return;
    const clean = (s) => {
      const x = s.replace(/[\s ]/g, "").replace("%", "");
      if (/^[\d,.\-]+$/.test(x)) return IS_EN ? x.replace(/,/g, "") : x.replace(",", ".");
      return s;
    };
    const csv = "﻿" + tableMatrix().map((row) => row.map((c) => '"' + clean(c).replace(/"/g, '""') + '"').join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "car-depreciation.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(T.csvDone);
  }

  // ===== групування тисяч під час введення =====
  const GROUP_SEP = IS_EN ? "," : " ";
  const MONEY_IDS = ["price", "km"];
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
  const plain = (v) => (IS_EN ? v.replace(/,/g, "") : v.replace(/[\s ]/g, "").replace(",", "."));

  // ===== режими =====
  function applyState() {
    document.querySelectorAll("[data-type]").forEach((b) => {
      const on = b.dataset.type === state.type;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", String(on));
    });
    el("rateField").hidden = state.type !== "custom";
    document.querySelectorAll("[data-typehint]").forEach((h) => (h.hidden = h.dataset.typehint !== state.type));
    const flag = { UAH: "ua", USD: "us", EUR: "eu" }[state.cur];
    el("cur_flag").src = "/assets/flags/" + flag + ".png";
    el("cur_code").textContent = state.cur;
    document.querySelectorAll("#cur_list li").forEach((li) => li.setAttribute("aria-selected", String(li.dataset.code === state.cur)));
  }
  function syncYearChips() {
    const v = (el("years").value || "").trim();
    document.querySelectorAll("[data-years]").forEach((b) => b.classList.toggle("is-on", b.dataset.years === v));
  }

  // ===== кнопки =====
  const IDS = ["price", "age", "years", "km", "rate"];

  function resetAll() {
    IDS.forEach((id) => (el(id).value = ""));
    state.type = "average";
    state.cur = "UAH";
    applyState();
    syncYearChips();
    render({ ok: false, none: true });
  }

  function fillExample() {
    const v = { price: "800000", age: "0", years: "5", km: "15000", rate: "" };
    IDS.forEach((id) => (el(id).value = v[id]));
    state.type = "average";
    state.cur = "UAH";
    applyState();
    syncYearChips();
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
    if (["holds", "fast", "ev", "custom"].includes(q.get("type"))) state.type = q.get("type");
    if (["USD", "EUR"].includes(q.get("cur"))) state.cur = q.get("cur");
    return any || q.has("type") || q.has("cur");
  }

  window.addEventListener("DOMContentLoaded", () => {
    IDS.forEach((id) => {
      el(id).addEventListener("input", () => {
        if (MONEY_IDS.includes(id)) groupInput(el(id));
        if (id === "years") syncYearChips();
        calc();
      });
      el(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") calc();
      });
    });
    document.querySelectorAll("[data-years]").forEach((b) =>
      b.addEventListener("click", () => {
        el("years").value = b.dataset.years;
        syncYearChips();
        calc();
      })
    );
    document.querySelectorAll("[data-type]").forEach((b) =>
      b.addEventListener("click", () => {
        state.type = b.dataset.type;
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

    const used = applyFromUrl();
    groupAll();
    applyState();
    syncYearChips();
    if (used) calc();
    else render({ ok: false, none: true });
  });
})();
