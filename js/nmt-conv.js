/* nmt-conv.js — дані калькулятора «Переведення балів НМТ у шкалу 100–200»: один предмет, усі предмети й зворотне завдання */
PhysCalc.start(({ L }) => {
  const N = window.Nmt;
  const CHIPS = [["math", "20"], ["ukr", "36"], ["hist", "41"], ["lang", "25"]];
  const subjOpts = (list, sel) => list.map((s) => '<option value="' + s.id + '"' + (s.id === sel ? " selected" : "") + ">" + L(s.uk, s.en) + "</option>").join("");
  const intOf = (v, parseNum) => { const r = parseNum(v); if (r.empty) return { empty: true }; if (r.err || r.v.d !== 1n || r.v.n < 0n) return { err: 1 }; return { n: Number(r.v.n) }; };
  const fullTable = (s, hi, h) => { const rows = []; for (let r = s.min; r <= s.max; r++) rows.push("<tr" + (r === hi ? ' class="ph__total"' : "") + "><th>" + r + "</th><td>" + s.tab[r] + "</td></tr>"); return '<details class="ph__det"><summary>' + L("Повна таблиця переведення: ", "The full conversion table: ") + h.esc(L(s.uk, s.en)) + '</summary><div class="ph__tblWrap"><table class="ph__tbl"><thead><tr><th>' + L("Тестовий бал", "Test score") + "</th><th>" + L("Шкала 100–200", "100–200 scale") + "</th></tr></thead><tbody>" + rows.join("") + "</tbody></table></div></details>"; };
  const FAIL = L("поріг не подолано", "below the threshold");

  // ----- один предмет -----
  const conv = {
    key: "conv", type: "custom", nameUk: "Один предмет", nameEn: "One subject",
    build(body, x, h) {
      const { el, esc, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars"><div class="ph__var"><label class="ph__label" for="nmS">' + L("Предмет НМТ", "NMT subject") + '</label><select class="ph__unit ph__unit--wide" id="nmS">' + subjOpts(N.S, "math") + '</select></div><div class="ph__var"><label class="ph__label" for="nmR">' + L("Тестовий (сирий) бал", "Test (raw) score") + '</label><input class="ph__input" id="nmR" type="text" inputmode="numeric" autocomplete="off" maxlength="3" placeholder="' + L("напр.: 20", "e.g.: 20") + '"></div></div><div class="ph__fnActions" id="nmChips">' + CHIPS.map((c, i) => '<button type="button" class="ph__mini" data-i="' + i + '">' + esc(N.find(c[0]).short + " " + c[1]) + "</button>").join("") + '</div><div class="ph__hint ph__mt12">' + L("Тестовий бал — це кількість набраних за завдання балів (до 32 для математики, до 45 для української мови, до 54 для історії). Для кожного предмета є власна таблиця переведення; поріг — 100 балів за шкалою.", "The test score is the number of points earned for the tasks (up to 32 for mathematics, 45 for Ukrainian language, 54 for history). Each subject has its own conversion table; the threshold is 100 points on the scale.") + "</div>";
      el("nmChips").addEventListener("click", (e) => { const b = e.target.closest("button[data-i]"); if (!b) return; const c = CHIPS[Number(b.dataset.i)]; el("nmS").value = c[0]; el("nmR").value = c[1]; h.calc(true); });
      el("nmS").addEventListener("change", maybeCalc); el("nmR").addEventListener("input", maybeCalc);
      el("nmR").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); h.calc(true); } });
    },
    calc(h) {
      const { el, parseNum, esc } = h, s = N.find(el("nmS").value), r = intOf(el("nmR").value, parseNum);
      if (r.empty) return { ok: false, incomplete: true };
      if (r.err) return { ok: false, msg: L("Тестовий бал — ціле невід'ємне число.", "The test score is a whole non-negative number.") };
      if (r.n > s.max) return { ok: false, msg: L("Для предмета «" + s.uk + "» максимум " + s.max + " тестових балів.", "For “" + s.en + "” the maximum is " + s.max + " test points.") };
      const sc = N.scale(s.id, r.n), pct = Math.round((r.n / s.max) * 1000) / 10, fmt = (v) => String(v).replace(".", L(",", "."));
      const steps = [{ t: L("Предмет і шкала", "Subject and scale"), l: [L(s.uk, s.en) + ": " + L("тестові бали ", "test points ") + s.min + "–" + s.max + " → 100–200"], note: L("Мінімум " + s.min + " тестових балів дає поріг 100, максимум " + s.max + " дає 200.", "A minimum of " + s.min + " test points gives the threshold 100, the maximum " + s.max + " gives 200.") }];
      if (sc === null) {
        steps.push({ t: L("Порівнюємо з порогом", "Comparing with the threshold"), l: [r.n + " < " + s.min + " → " + FAIL], note: L("Якщо хоча б з одного предмета поріг не подолано, результати НМТ для вступу використати не можна.", "If the threshold is not passed in even one subject, the NMT results cannot be used for admission.") });
        return { ok: true, expr: L(s.uk, s.en), head: [L("результат", "result"), L("менше за 100", "below 100")], headSub: FAIL + ": " + L("потрібно щонайменше ", "at least ") + s.min + L(" тестових балів", " test points"), subRaw: true, tiles: [{ k: L("Тестових балів", "Test points"), v: r.n + " / " + s.max }, { k: L("Бракує до порогу", "Missing for the threshold"), v: String(s.min - r.n) }], extraHtml: fullTable(s, null, h), steps, resText: L(s.short, s.short) + " " + r.n + " → " + FAIL };
      }
      steps.push({ t: L("Шукаємо в таблиці переведення", "Looking up the conversion table"), l: [L("Тестовий бал ", "Test score ") + r.n + " → " + sc + " " + L("за шкалою 100–200", "on the 100–200 scale")], note: L("Таблиці наведено за відкритими даними для НМТ 2026; остаточні значення — у додатку до Порядку прийому.", "The tables follow open data for NMT 2026; the final values are in the annex to the Admission Procedure.") });
      return { ok: true, expr: L(s.uk, s.en), head: [L("шкала 100–200", "100–200 scale"), String(sc)], headSub: L("поріг 100 подолано", "threshold 100 passed"), subRaw: true, tiles: [{ k: L("Тестових балів", "Test points"), v: r.n + " / " + s.max }, { k: L("Від максимуму", "Of the maximum"), v: fmt(pct) + " %" }, { k: L("До 200 балів", "To 200 points"), v: String(200 - sc) }], extraHtml: fullTable(s, r.n, h), steps, resText: s.short + " " + r.n + " → " + sc };
    },
    reset(h) { h.el("nmS").value = "math"; h.el("nmR").value = ""; },
    fill(h) { h.el("nmS").value = "math"; h.el("nmR").value = "20"; },
    share(p, h) { p.set("s", h.el("nmS").value); if (h.el("nmR").value.trim()) p.set("r", h.el("nmR").value.trim()); },
    apply(qs, h) { if (qs.has("s") && N.find(qs.get("s"))) h.el("nmS").value = qs.get("s"); if (qs.has("r")) h.el("nmR").value = qs.get("r").slice(0, 3); }
  };

  // ----- усі предмети -----
  const ALL = ["ukr", "math", "hist"];
  const all = {
    key: "all", type: "custom", nameUk: "Усі чотири предмети", nameEn: "All four subjects",
    build(body, x, h) {
      const { el, esc, maybeCalc } = h;
      const row = (id, label, extra) => '<div class="ph__var"><label class="ph__label" for="nm_' + id + '">' + label + '</label><input class="ph__input" id="nm_' + id + '" type="text" inputmode="numeric" autocomplete="off" maxlength="3" placeholder="' + L("тестовий бал", "test score") + '"></div>';
      body.innerHTML = '<div class="ph__vars">' + ALL.map((id) => row(id, esc(L(N.find(id).uk, N.find(id).en)))).join("") + '<div class="ph__var ph__var--full"><label class="ph__label" for="nm4">' + L("Четвертий предмет (на вибір)", "Fourth subject (your choice)") + '</label><select class="ph__unit ph__unit--wide" id="nm4">' + subjOpts(N.FOURTH.map(N.find), "lang") + '</select></div>' + row("4", L("Тестовий бал з четвертого предмета", "Test score in the fourth subject")) + '</div><div class="ph__hint ph__mt12">' + L("Введіть тестові бали (до 54 для історії, до 45 для української, до 32 для математики). Калькулятор переведе їх у шкалу 100–200 та перевірить пороги. Далі підставте результати в «Конкурсний бал вступу».", "Enter the test scores (up to 54 for history, 45 for Ukrainian, 32 for mathematics). The calculator converts them to the 100–200 scale and checks the thresholds. Then use the results in the “Admission score” calculator.") + "</div>";
      ["nm_ukr", "nm_math", "nm_hist", "nm_4"].forEach((id) => el(id).addEventListener("input", maybeCalc)); el("nm4").addEventListener("change", maybeCalc);
    },
    calc(h) {
      const { el, parseNum, esc } = h, ids = [...ALL, el("nm4").value], rows = [], errs = [];
      ids.forEach((id, i) => { const s = N.find(id), r = intOf(el(i < 3 ? "nm_" + id : "nm_4").value, parseNum); if (r.empty) return; if (r.err) { errs.push(s.short + ": " + L("ціле число", "a whole number")); return; } if (r.n > s.max) { errs.push(s.short + ": " + L("максимум ", "maximum ") + s.max); return; } rows.push({ s, n: r.n, sc: N.scale(id, r.n) }); });
      if (errs.length) return { ok: false, msg: errs.join("; ") };
      if (!rows.length) return { ok: false, incomplete: true };
      const passed = rows.filter((r) => r.sc !== null), failed = rows.filter((r) => r.sc === null);
      const trs = rows.map((r) => "<tr><th>" + esc(r.s.name) + "</th><td>" + r.n + " / " + r.s.max + "</td><td>" + (r.sc === null ? esc(FAIL) : r.sc) + "</td></tr>").join("");
      const table = '<div class="ph__sub">' + L("Результати за предметами", "Results by subject") + '</div><div class="ph__tblWrap"><table class="ph__tbl"><thead><tr><th>' + L("Предмет", "Subject") + "</th><th>" + L("Тестовий бал", "Test score") + "</th><th>" + L("Шкала 100–200", "100–200") + "</th></tr></thead><tbody>" + trs + "</tbody></table></div>";
      const steps = rows.map((r) => ({ t: r.s.name, l: [L("Тестовий бал ", "Test score ") + r.n + (r.sc === null ? " → " + FAIL + " (" + L("потрібно ≥ ", "need ≥ ") + r.s.min + ")" : " → " + r.sc)] }));
      const avg = passed.length ? Math.round((passed.reduce((a, r) => a + r.sc, 0) / passed.length) * 100) / 100 : null;
      const ok4 = failed.length === 0 && rows.length === 4;
      return { ok: true, expr: L("Переведення балів НМТ", "NMT score conversion"), head: [L("шкала 100–200", "100–200 scale"), rows.map((r) => (r.sc === null ? "—" : r.sc)).join(" · ")], headSub: failed.length ? L("поріг не подолано: ", "below the threshold: ") + failed.map((r) => r.s.short).join(", ") + L(". Такі результати для вступу використати не можна.", ". Such results cannot be used for admission.") : (ok4 ? L("усі пороги подолано", "all thresholds passed") : L("введіть решту предметів", "enter the remaining subjects")), subRaw: true, tiles: [{ k: L("Предметів введено", "Subjects entered"), v: String(rows.length) + " / 4" }, { k: L("Середнє арифметичне", "Arithmetic mean"), v: avg === null ? "—" : String(avg).replace(".", L(",", ".")) }], extraHtml: table, steps, resText: rows.map((r) => r.s.short + " " + r.n + " → " + (r.sc === null ? FAIL : r.sc)).join("; ") };
    },
    reset(h) { ["nm_ukr", "nm_math", "nm_hist", "nm_4"].forEach((id) => (h.el(id).value = "")); h.el("nm4").value = "lang"; },
    fill(h) { h.el("nm_ukr").value = "36"; h.el("nm_math").value = "20"; h.el("nm_hist").value = "41"; h.el("nm4").value = "lang"; h.el("nm_4").value = "25"; },
    share(p, h) { p.set("f", h.el("nm4").value); [["su", "nm_ukr"], ["sm", "nm_math"], ["sh", "nm_hist"], ["sx", "nm_4"]].forEach(([k, id]) => { if (h.el(id).value.trim()) p.set(k, h.el(id).value.trim()); }); },
    apply(qs, h) { if (qs.has("f") && N.FOURTH.includes(qs.get("f"))) h.el("nm4").value = qs.get("f"); [["su", "nm_ukr"], ["sm", "nm_math"], ["sh", "nm_hist"], ["sx", "nm_4"]].forEach(([k, id]) => { if (qs.has(k)) h.el(id).value = qs.get(k).slice(0, 3); }); }
  };

  // ----- зворотне завдання -----
  const rev = {
    key: "rev", type: "custom", nameUk: "Скільки балів потрібно", nameEn: "How many points are needed",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars"><div class="ph__var"><label class="ph__label" for="rvS">' + L("Предмет НМТ", "NMT subject") + '</label><select class="ph__unit ph__unit--wide" id="rvS">' + subjOpts(N.S, "math") + '</select></div><div class="ph__var"><label class="ph__label" for="rvT">' + L("Потрібний бал за шкалою 100–200", "The 100–200 score you need") + '</label><input class="ph__input" id="rvT" type="text" inputmode="numeric" autocomplete="off" maxlength="3" placeholder="' + L("напр.: 170", "e.g.: 170") + '"></div></div><div class="ph__hint ph__mt12">' + L("Скільки тестових балів треба набрати, щоб отримати щонайменше потрібний бал за шкалою 100–200.", "How many test points you need to get at least the required score on the 100–200 scale.") + "</div>";
      el("rvS").addEventListener("change", maybeCalc); el("rvT").addEventListener("input", maybeCalc);
      el("rvT").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); h.calc(true); } });
    },
    calc(h) {
      const { el, parseNum, esc } = h, s = N.find(el("rvS").value), t = intOf(el("rvT").value, parseNum);
      if (t.empty) return { ok: false, incomplete: true };
      if (t.err || t.n > 200) return { ok: false, msg: L("Потрібний бал — ціле число від 100 до 200.", "The required score is a whole number from 100 to 200.") };
      if (t.n < 100) return { ok: false, msg: L("Шкала починається зі 100: нижчих балів немає (поріг — 100).", "The scale starts at 100: there are no lower scores (the threshold is 100).") };
      const raw = N.needRaw(s.id, t.n), got = N.scale(s.id, raw);
      const lo = Math.max(s.min, raw - 2), hi = Math.min(s.max, raw + 2), rows = [];
      for (let r = lo; r <= hi; r++) rows.push("<tr" + (r === raw ? ' class="ph__total"' : "") + "><th>" + r + "</th><td>" + s.tab[r] + "</td></tr>");
      const table = '<div class="ph__sub">' + L("Поруч у таблиці", "Nearby in the table") + '</div><div class="ph__tblWrap"><table class="ph__tbl"><thead><tr><th>' + L("Тестовий бал", "Test score") + "</th><th>" + L("Шкала 100–200", "100–200") + "</th></tr></thead><tbody>" + rows.join("") + "</tbody></table></div>" + fullTable(s, raw, h);
      const steps = [{ t: L("Шукаємо найменший тестовий бал", "Finding the smallest test score"), l: [L(s.uk, s.en) + ": " + L("потрібно ≥ ", "need ≥ ") + t.n, L("Найменший тестовий бал, що дає ≥ ", "The smallest test score giving ≥ ") + t.n + ": " + raw + " → " + got] , note: got === t.n ? "" : L("Точно " + t.n + " у таблиці немає, тому беремо найближче більше значення " + got + ".", "The table has no exact " + t.n + ", so the next larger value " + got + " is taken.") }];
      return { ok: true, expr: L(s.uk, s.en), head: [L("тестових балів", "test points"), raw + " / " + s.max], headSub: L("це дає ", "this gives ") + got + L(" за шкалою", " on the scale"), subRaw: true, tiles: [{ k: L("Потрібно ≥", "Needed ≥"), v: String(t.n) }, { k: L("Отримаєте", "You get"), v: String(got) }, { k: L("Запас до максимуму", "Left to the maximum"), v: String(s.max - raw) + L(" тест. балів", " points") }], extraHtml: table, steps, resText: s.short + ": " + t.n + " → " + raw + " " + L("тестових балів", "test points") };
    },
    reset(h) { h.el("rvS").value = "math"; h.el("rvT").value = ""; },
    fill(h) { h.el("rvS").value = "math"; h.el("rvT").value = "170"; },
    share(p, h) { p.set("s", h.el("rvS").value); if (h.el("rvT").value.trim()) p.set("t", h.el("rvT").value.trim()); },
    apply(qs, h) { if (qs.has("s") && N.find(qs.get("s"))) h.el("rvS").value = qs.get("s"); if (qs.has("t")) h.el("rvT").value = qs.get("t").slice(0, 3); }
  };
  return { modes: [conv, all, rev] };
});
