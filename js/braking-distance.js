/* braking-distance.js — калькулятор гальмівного шляху (UK/EN)
   Модель (орієнтовна, спрощена):
     реакція = v × t;  гальмування = v² / (2a);  a = g × (μ × cosθ + sinθ)  (θ — кут ухилу, вгору «+»)
     повна зупинка = реакція + гальмування
   Зчеплення μ:
     суха / мокра дорога: μ = база(0,85 / 0,60) × коефіцієнт шини за температурою
       (літні й зношені гірші в холоді, зимові — на теплій дорозі);
     сніг / лід: μ = база(0,30 / 0,12 — зимові шини) × коефіцієнт шини
       (за відкритими тестами: на снігу з 50 км/год літні ≈ вдвічі довше за зимові, всесезонні ≈ +23%;
        на льоду шипи ≈ на 40% краще за зимові); температура окремо не враховується.
   Значення зчеплення — оцінки за відкритими джерелами, а не сертифіковані. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const LOCALE = IS_EN ? "en-US" : "uk-UA";
  const G = 9.81;
  const CAR_LEN = 4.5;

  const T = IS_EN
    ? {
        enter: "Enter the speed — the result will appear here.",
        missing: "To calculate, fill in: {list}.",
        lblSpeed: "speed",
        errSpeed: "Speed must be between 10 and 250 km/h.",
        errSlope: "Slope must be between −20 and 20%.",
        errObstacle: "Distance to the obstacle must be between 0 and 2000 m.",
        m: "m", kmh: "km/h", s: "s", g: "g", ms2: "m/s²",
        scA: "Conditions A", scB: "Conditions B",
        stop: "Total stopping distance", react: "Reaction distance", brake: "Braking distance", decel: "Deceleration", mu: "Friction μ",
        mainMini: "reaction {r} m + braking {b} m · ≈ {n} car lengths",
        reactMini: "{t} s at {v} km/h", decelMini: "≈ {g} g", slope: "slope {p}%",
        noStop: "The car will not stop on this slope with this grip.",
        obstacle: "Obstacle at {d} m",
        obOk: "{sc}: you stop in time, {x} m to spare.", obHit: "{sc}: you do not stop in time — impact at about {v} km/h.", obNoBrake: "{sc}: braking has not even started — impact at {v} km/h.",
        cmpTitle: "Comparison A and B",
        cmpSame: "Stopping distances are about the same: A {a} m, B {b} m.",
        cmpLonger: "Conditions B need {x} m more ({p}% longer): A {a} m, B {b} m.",
        cmpShorter: "Conditions B stop {x} m shorter ({p}%): A {a} m, B {b} m.",
        tblTitle: "Stopping distance by speed", tblSpeed: "Speed",
        wetCold: "A wet road below 0 °C is effectively ice: choose “Ice”.",
        siTemp: "For snow and ice the temperature is not applied separately.",
        modelNote: "Estimate from typical friction values: real distances depend on ABS, brakes, tire pressure, load and road surface. Do not rely on it for safety-critical decisions.",
        linkCopied: "Link copied ✅", copyFailed: "Could not copy 😕", reset: "Reset ✅", example: "Example filled in ✅"
      }
    : {
        enter: "Вкажіть швидкість — результат зʼявиться тут.",
        missing: "Щоб порахувати, заповніть: {list}.",
        lblSpeed: "швидкість",
        errSpeed: "Швидкість має бути від 10 до 250 км/год.",
        errSlope: "Ухил має бути від −20 до 20%.",
        errObstacle: "Відстань до перешкоди має бути від 0 до 2000 м.",
        m: "м", kmh: "км/год", s: "с", g: "g", ms2: "м/с²",
        scA: "Умови A", scB: "Умови B",
        stop: "Повна зупинка", react: "Шлях за час реакції", brake: "Гальмівний шлях", decel: "Уповільнення", mu: "Зчеплення μ",
        mainMini: "реакція {r} м + гальмування {b} м · ≈ {n} довжин авто",
        reactMini: "{t} с на {v} км/год", decelMini: "≈ {g} g", slope: "ухил {p}%",
        noStop: "На такому ухилі за такого зчеплення авто не зупиниться.",
        obstacle: "Перешкода за {d} м",
        obOk: "{sc}: ви встигнете зупинитись, запас {x} м.", obHit: "{sc}: ви не встигнете зупинитись — удар зі швидкістю близько {v} км/год.", obNoBrake: "{sc}: гальмування навіть не почнеться — удар зі швидкістю {v} км/год.",
        cmpTitle: "Порівняння A і B",
        cmpSame: "Зупинка приблизно однакова: A {a} м, B {b} м.",
        cmpLonger: "Умови B потребують на {x} м більше (+{p}%): A {a} м, B {b} м.",
        cmpShorter: "Умови B дають зупинку на {x} м коротшу (−{p}%): A {a} м, B {b} м.",
        tblTitle: "Зупинка за швидкістю", tblSpeed: "Швидкість",
        wetCold: "Мокра дорога при мінусовій температурі — це фактично ожеледиця: оберіть «Лід».",
        siTemp: "Для снігу й льоду температура окремо не враховується.",
        modelNote: "Оцінка за типовими значеннями зчеплення: реальна відстань залежить від ABS, гальм, тиску в шинах, навантаження й стану дороги. Не покладайтесь на неї в питаннях безпеки.",
        linkCopied: "Посилання скопійовано ✅", copyFailed: "Не вдалось скопіювати 😕", reset: "Скинуто ✅", example: "Підставлено приклад ✅"
      };

  // ===== модель зчеплення =====
  const BASE = { dry: 0.85, wet: 0.6, snow: 0.3, ice: 0.12 };
  // суха / мокра дорога: коефіцієнт шини за температурою (літні й зношені — в холоді гірші, зимові — в теплі)
  const DW = {
    summer: { warm: 1, cool: 0.92, cold: 0.85 },
    allseason: { warm: 0.95, cool: 0.97, cold: 0.92 },
    winter: { warm: 0.9, cool: 1, cold: 1 },
    studs: { warm: 0.85, cool: 0.95, cold: 0.95 }
  };
  const WORN_DW = { dry: 0.9, wet: 0.75 };
  // сніг / лід: коефіцієнт шини (зимові = 1)
  const SI = {
    winter: { snow: 1, ice: 1 },
    studs: { snow: 1, ice: 1.45 },
    allseason: { snow: 0.8, ice: 0.85 },
    summer: { snow: 0.5, ice: 0.65 },
    worn: { snow: 0.4, ice: 0.5 }
  };

  function frictionMu(surface, tire, temp) {
    if (surface === "snow" || surface === "ice") return BASE[surface] * SI[tire][surface];
    if (tire === "worn") return BASE[surface] * DW.summer[temp] * WORN_DW[surface];
    return BASE[surface] * DW[tire][temp];
  }

  function stopping(speedKmh, rt, mu, slopePct) {
    const v = speedKmh / 3.6;
    const th = Math.atan(slopePct / 100);
    const a = G * (mu * Math.cos(th) + Math.sin(th));
    const react = v * rt;
    const canStop = a > 0.2;
    const brake = canStop ? (v * v) / (2 * a) : Infinity;
    return { v, a, mu, react, brake, total: react + brake, canStop };
  }

  // швидкість удару в перешкоду на відстані d; null — зупиниться
  function impact(speedKmh, st, d) {
    if (st.canStop && st.total <= d) return null;
    if (d <= st.react) return speedKmh;
    const v2 = st.v * st.v - 2 * st.a * (d - st.react);
    return Math.sqrt(Math.max(0, v2)) * 3.6;
  }

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
  const optText = (id) => {
    const s = el(id);
    return s && s.selectedOptions[0] ? s.selectedOptions[0].text : "";
  };

  function toast(msg) {
    const n = el("toast");
    if (!n) return;
    n.textContent = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (n.textContent = ""), 2400);
  }

  const cmpOn = () => !!el("cmp")?.checked;
  const SPEED_ROWS = [30, 50, 60, 90, 110, 130];

  function readScenario(sfx) {
    return { surface: el("surface" + sfx).value, tire: el("tire" + sfx).value, temp: el("temp" + sfx).value };
  }
  const scLabel = (sfx) => optText("surface" + sfx) + ", " + optText("tire" + sfx).toLowerCase() + (["snow", "ice"].includes(el("surface" + sfx).value) ? "" : ", " + optText("temp" + sfx));

  // ===== розрахунок =====
  function compute() {
    if (blank("speed")) return { ok: false, none: blank("slope") && blank("obstacle"), msg: blank("slope") && blank("obstacle") ? "" : fill(T.missing, { list: T.lblSpeed }) };
    const speed = num(el("speed").value);
    if (!(speed >= 10 && speed <= 250)) return { ok: false, msg: T.errSpeed };
    const rt = Number(el("reaction").value);
    let slope = 0;
    if (!blank("slope")) {
      slope = num(el("slope").value);
      if (!(slope >= -20 && slope <= 20)) return { ok: false, msg: T.errSlope };
    }
    let obstacle = null;
    if (!blank("obstacle")) {
      obstacle = num(el("obstacle").value);
      if (!(obstacle >= 0 && obstacle <= 2000)) return { ok: false, msg: T.errObstacle };
    }
    const sfxs = cmpOn() ? ["A", "B"] : ["A"];
    const scs = sfxs.map((sfx) => {
      const c = readScenario(sfx);
      const mu = frictionMu(c.surface, c.tire, c.temp);
      const st = stopping(speed, rt, mu, slope);
      return { sfx, ...c, label: scLabel(sfx), ...st, hit: obstacle == null ? undefined : impact(speed, st, obstacle) };
    });
    return { ok: true, speed, rt, slope, obstacle, scs };
  }

  // ===== відображення =====
  const tile = (title, value, mini, cls = "") =>
    '<div class="brk__kpi ' + cls + '"><div class="brk__kpiT">' + title + '</div><div class="brk__kpiV">' + value + "</div>" + (mini ? '<div class="brk__kpiM">' + mini + "</div>" : "") + "</div>";
  const meters = (n) => (Number.isFinite(n) ? f1(n) + " " + T.m : "∞");

  function scenarioTiles(sc, r) {
    const stopTxt = sc.canStop ? "≈ " + meters(sc.total) : "—";
    const mini = sc.canStop
      ? fill(T.mainMini, { r: f1(sc.react), b: f1(sc.brake), n: f0(sc.total / CAR_LEN) })
      : T.noStop;
    return (
      tile(T.stop, stopTxt, mini, "brk__kpi--main brk__kpi--wide") +
      tile(T.react, meters(sc.react), fill(T.reactMini, { t: f2(r.rt), v: f0(r.speed) })) +
      tile(T.brake, sc.canStop ? meters(sc.brake) : "∞", "") +
      tile(T.decel, f1(sc.a) + " " + T.ms2, fill(T.decelMini, { g: f2(sc.a / G) })) +
      tile(T.mu, f2(sc.mu), r.slope ? fill(T.slope, { p: (r.slope > 0 ? "+" : "") + f1(r.slope) }) : "")
    );
  }

  function render(r) {
    const box = el("result");
    if (!r.ok) {
      if (r.none || !r.msg) box.innerHTML = T.enter;
      else box.innerHTML = '<div class="brk__hintbox">' + r.msg + "</div>";
      return;
    }
    const two = r.scs.length === 2;
    let cmpHtml = "";

    if (two) {
      const a = r.scs[0], b = r.scs[1];
      if (a.canStop && b.canStop) {
        const diff = b.total - a.total;
        const ratio = b.total / a.total;
        const pct = Math.abs(ratio - 1) * 100;
        let cls = "is-ok", txt;
        if (Math.abs(ratio - 1) <= 0.08) txt = fill(T.cmpSame, { a: f1(a.total), b: f1(b.total) });
        else if (diff > 0) {
          cls = ratio > 1.8 ? "is-bad" : "is-warn";
          txt = fill(T.cmpLonger, { x: f1(diff), p: f0(pct), a: f1(a.total), b: f1(b.total) });
        } else txt = fill(T.cmpShorter, { x: f1(-diff), p: f0(pct), a: f1(a.total), b: f1(b.total) });
        cmpHtml = '<div class="brk__verdict ' + cls + '"><b>' + T.cmpTitle + ".</b> " + txt + "</div>";
      }
    }

    let html = cmpHtml;
    if (two) {
      html += r.scs
        .map(
          (sc) =>
            '<div class="brk__scn brk__scn--' + sc.sfx.toLowerCase() + '"><div class="brk__scnHead"><span class="brk__scnBadge">' + sc.sfx + '</span><div class="brk__scnTitle"><b>' + (sc.sfx === "A" ? T.scA : T.scB) + "</b><span>" + sc.label + '</span></div></div><div class="brk__kpis">' + scenarioTiles(sc, r) + "</div></div>"
        )
        .join("");
    } else {
      html += '<div class="brk__kpis brk__mt10">' + scenarioTiles(r.scs[0], r) + "</div>";
    }

    if (r.obstacle != null) {
      html += '<div class="brk__sub">' + fill(T.obstacle, { d: f0(r.obstacle) }) + "</div>";
      r.scs.forEach((sc) => {
        const name = two ? (sc.sfx === "A" ? T.scA : T.scB) : "";
        let txt, cls;
        if (sc.hit == null) {
          txt = fill(T.obOk, { sc: name, x: f1(r.obstacle - sc.total) });
          cls = "is-ok";
        } else if (r.obstacle <= sc.react) {
          txt = fill(T.obNoBrake, { sc: name, v: f0(sc.hit) });
          cls = "is-bad";
        } else {
          txt = fill(T.obHit, { sc: name, v: f0(sc.hit) });
          cls = "is-bad";
        }
        const clean = txt.replace(/^: /, "");
        html += '<div class="brk__verdict ' + cls + '">' + clean.charAt(0).toUpperCase() + clean.slice(1) + "</div>";
      });
    }

    // таблиця за швидкостями
    const rows = SPEED_ROWS.map((s) => {
      const cells = r.scs.map((sc) => {
        const st = stopping(s, r.rt, sc.mu, r.slope);
        return "<td>" + (st.canStop ? f0(st.total) : "∞") + "</td>";
      });
      return "<tr><th>" + s + " " + T.kmh + "</th>" + cells.join("") + "</tr>";
    }).join("");
    html +=
      '<div class="brk__sub">' + T.tblTitle + "</div>" +
      '<table class="brk__tbl"><thead><tr><th>' + T.tblSpeed + "</th>" + r.scs.map((sc) => "<th>" + (two ? sc.sfx + ", " : "") + T.m + "</th>").join("") + "</tr></thead><tbody>" + rows + "</tbody></table>";

    html += '<div class="brk__note">' + T.modelNote + "</div>";
    box.innerHTML = html;
  }

  function updateHints() {
    ["A", "B"].forEach((sfx) => {
      const h = el("tempHint" + sfx);
      if (!h) return;
      const surface = el("surface" + sfx).value;
      const temp = el("temp" + sfx).value;
      if (surface === "wet" && temp === "cold") h.textContent = T.wetCold;
      else if (surface === "snow" || surface === "ice") h.textContent = T.siTemp;
      else h.textContent = "";
    });
  }

  function syncCompare() {
    const b = el("blockB");
    if (b) b.hidden = !cmpOn();
  }

  function calc() {
    updateHints();
    render(compute());
  }

  // ===== випадні списки (приховані <select> лишаються джерелом значень) =====
  function closeAllDd(except) {
    document.querySelectorAll("#brk .brk__ddList").forEach((ul) => {
      if (ul === except || ul.hidden) return;
      ul.hidden = true;
      ul.parentNode.querySelector(".brk__ddBtn")?.setAttribute("aria-expanded", "false");
    });
  }

  function initDropdowns() {
    document.querySelectorAll("#brk [data-dd]").forEach((wrap) => {
      const sel = wrap.querySelector("select");
      const btn = wrap.querySelector(".brk__ddBtn");
      const list = wrap.querySelector(".brk__ddList");
      const label = wrap.querySelector(".brk__ddLabel");
      if (!sel || !btn || !list || !label) return;
      list.innerHTML = Array.from(sel.options)
        .map((o) => '<li role="option" tabindex="-1" data-v="' + o.value + '" aria-selected="false"><span class="brk__ddItem">' + o.text + "</span></li>")
        .join("");
      const sync = () => {
        label.textContent = sel.selectedOptions[0] ? sel.selectedOptions[0].text : "";
        list.querySelectorAll("li[data-v]").forEach((li) => li.setAttribute("aria-selected", String(li.dataset.v === sel.value)));
      };
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeAllDd(list);
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
      sel.addEventListener("change", () => {
        sync();
        calc();
      });
      wrap._sync = sync;
      sync();
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".brk__dd")) closeAllDd(null);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAllDd(null);
    });
  }

  const syncAllDd = () => document.querySelectorAll("#brk [data-dd]").forEach((w) => w._sync && w._sync());

  // ===== кнопки =====
  const TEXT_IDS = ["speed", "slope", "obstacle"];
  const DD_IDS = ["surfaceA", "tireA", "tempA", "surfaceB", "tireB", "tempB"];
  const DEFAULTS = { surfaceA: "dry", tireA: "summer", tempA: "warm", surfaceB: "wet", tireB: "worn", tempB: "cool" };

  function setReaction(v) {
    el("reaction").value = String(v);
    el("reactionVal").textContent = f2(Number(v));
    document.querySelectorAll("[data-rt]").forEach((b) => b.classList.toggle("is-on", Number(b.dataset.rt) === Number(v)));
  }

  function resetAll() {
    TEXT_IDS.forEach((id) => (el(id).value = ""));
    el("speed").value = "100";
    setReaction(1);
    DD_IDS.forEach((id) => (el(id).value = DEFAULTS[id]));
    el("cmp").checked = false;
    syncCompare();
    syncAllDd();
    calc();
  }

  function fillExample() {
    el("speed").value = "100";
    el("slope").value = "";
    el("obstacle").value = "60";
    setReaction(1);
    el("surfaceA").value = "wet";
    el("tireA").value = "summer";
    el("tempA").value = "warm";
    el("surfaceB").value = "snow";
    el("tireB").value = "winter";
    el("tempB").value = "cold";
    el("cmp").checked = true;
    syncCompare();
    syncAllDd();
    calc();
    toast(T.example);
  }

  const URL_MAP = [["v", "speed"], ["sl", "slope"], ["ob", "obstacle"]];
  const DD_MAP = [["sA", "surfaceA"], ["tA", "tireA"], ["tpA", "tempA"], ["sB", "surfaceB"], ["tB", "tireB"], ["tpB", "tempB"]];

  function share() {
    const p = new URLSearchParams();
    URL_MAP.forEach(([k, id]) => {
      const v = (el(id).value || "").trim();
      if (v) p.set(k, v);
    });
    p.set("rt", String(Number(el("reaction").value)));
    DD_MAP.forEach(([k, id]) => p.set(k, el(id).value));
    if (cmpOn()) p.set("cmp", "1");
    const url = location.origin + location.pathname + "?" + p.toString();
    navigator.clipboard?.writeText(url).then(() => toast(T.linkCopied)).catch(() => toast(T.copyFailed));
  }

  function applyFromUrl() {
    const q = new URLSearchParams(location.search);
    // старі посилання: speed=…, показ μ (mu) ігноруємо; наявність параметрів умов B вмикає порівняння
    const keys = [...URL_MAP.map((m) => m[0]), "speed", "rt", "cmp", ...DD_MAP.map((m) => m[0])];
    if (!keys.some((k) => q.has(k))) return false;
    URL_MAP.forEach(([k, id]) => {
      if (q.has(k)) el(id).value = q.get(k);
    });
    if (!q.has("v") && q.has("speed")) el("speed").value = q.get("speed");
    if (q.has("rt")) {
      const rt = Number(q.get("rt"));
      if (Number.isFinite(rt)) setReaction(Math.min(2.5, Math.max(0.5, rt)));
    }
    DD_MAP.forEach(([k, id]) => {
      const sel = el(id);
      if (q.has(k) && Array.from(sel.options).some((o) => o.value === q.get(k))) sel.value = q.get(k);
    });
    el("cmp").checked = q.get("cmp") === "1" || ["sB", "tB", "tpB"].some((k) => q.has(k));
    syncCompare();
    syncAllDd();
    return true;
  }

  window.addEventListener("DOMContentLoaded", () => {
    initDropdowns();

    TEXT_IDS.forEach((id) => {
      el(id).addEventListener("input", () => {
        if (id === "speed") document.querySelectorAll("[data-speed]").forEach((b) => b.classList.toggle("is-on", b.dataset.speed === el("speed").value.trim()));
        calc();
      });
      el(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") calc();
      });
    });
    el("reaction").addEventListener("input", () => {
      setReaction(el("reaction").value);
      calc();
    });
    document.querySelectorAll("[data-rt]").forEach((b) =>
      b.addEventListener("click", () => {
        setReaction(b.dataset.rt);
        calc();
      })
    );
    document.querySelectorAll("[data-speed]").forEach((b) =>
      b.addEventListener("click", () => {
        el("speed").value = b.dataset.speed;
        document.querySelectorAll("[data-speed]").forEach((x) => x.classList.toggle("is-on", x === b));
        calc();
      })
    );
    el("cmp").addEventListener("change", () => {
      syncCompare();
      calc();
    });

    el("calcBtn")?.addEventListener("click", () => {
      updateHints();
      const r = compute();
      render(r);
      if (!r.ok && r.msg) toast(r.msg);
    });
    el("exampleBtn")?.addEventListener("click", fillExample);
    el("resetBtn")?.addEventListener("click", () => {
      resetAll();
      toast(T.reset);
    });
    el("shareBtn")?.addEventListener("click", share);

    setReaction(Number(el("reaction").value));
    syncCompare();
    if (applyFromUrl()) calc();
    else calc();
  });
})();
