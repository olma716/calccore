/* chem-mass.js — дані калькулятора «Молярна маса»: формула → молярна маса й склад, емпірична й молекулярна формула за складом */
PhysCalc.start(({ L, UN, X }) => {
  const C = window.Chem, UNIT = L("г/моль", "g/mol");
  const CHIPS = ["H2O", "NaCl", "H2SO4", "Ca(OH)2", "C6H12O6", "CuSO4·5H2O", "Al2(SO4)3"];
  const MAXR = 6;

  // ----- молярна маса за формулою -----
  const mm = {
    key: "mm", type: "custom", nameUk: "Молярна маса й склад", nameEn: "Molar mass and composition",
    build(body, x, h) {
      const { el, esc, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars ph__vars--one"><div class="ph__var"><label class="ph__label" for="mmF">' + L("Формула речовини", "Chemical formula") + '</label><input class="ph__input" id="mmF" type="text" inputmode="text" autocomplete="off" spellcheck="false" maxlength="80" placeholder="' + L("напр.: H2SO4, Ca(OH)2, CuSO4·5H2O", "e.g.: H2SO4, Ca(OH)2, CuSO4·5H2O") + '"></div></div><div class="ph__fnActions" id="mmChips">' +
        CHIPS.map((f) => '<button type="button" class="ph__mini" data-f="' + esc(f) + '">' + esc(C.pretty(f)) + "</button>").join("") + '</div><div class="ph__hint ph__mt12">' + L("Пишіть формулу звичайними цифрами: H2O, Fe2(SO4)3, CuSO4·5H2O (крапка гідрату — · чи *). Регістр важливий: Co — кобальт, CO — чадний газ. Дужки й гідрати враховуються.", "Write the formula with ordinary digits: H2O, Fe2(SO4)3, CuSO4·5H2O (the hydrate dot is · or *). Case matters: Co is cobalt, CO is carbon monoxide. Brackets and hydrates are handled.") + "</div>";
      el("mmF").addEventListener("input", maybeCalc);
      el("mmF").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); h.calc(true); } });
      el("mmChips").addEventListener("click", (e) => { const b = e.target.closest("button[data-f]"); if (b) { el("mmF").value = b.dataset.f; h.calc(true); } });
    },
    calc(h) {
      const { el, ND, decNum, vstr, VR } = h, nd = ND(), raw = el("mmF").value;
      if (!raw.trim()) return { ok: false, incomplete: true };
      const m = C.molar(raw);
      if (!m.ok) return { ok: false, msg: C.errText(m) };
      if (m.p.electron) return { ok: false, msg: L("Електрон не має молярної маси в цьому калькуляторі.", "An electron has no molar mass in this calculator.") };
      const S = (r) => vstr(VR(r), null, nd, true), pc = (r) => decNum(C.qmul(C.qdiv(r, m.M), C.R(100)), nd) + " %";
      const total = m.rows.reduce((a, r) => a + r.count, 0), name = "M(" + m.pretty + ")";
      const terms = m.rows.map((r) => (r.count > 1 ? r.count + " · " : "") + S(r.ar)).join(" + ");
      const steps = [
        { t: L("Розбираємо формулу", "Parsing the formula"), l: [m.pretty + " = " + m.rows.map((r) => r.sym + ": " + r.count).join(", ")], note: L("Індекси після дужок множать усе всередині; у гідратах коефіцієнт перед H₂O множить усю воду.", "An index after a bracket multiplies everything inside; in hydrates the coefficient before H₂O multiplies all the water.") },
        { t: L("Атомні маси", "Atomic masses"), l: m.rows.map((r) => "Ar(" + r.sym + ") = " + S(r.ar)), note: C.setNow() === "school" ? L("Шкільні округлені значення (Cl = 35,5).", "Rounded school values (Cl = 35.5).") : L("Стандартні значення IUPAC (стисла таблиця).", "Standard IUPAC values (abridged table).") },
        { t: L("Додаємо маси атомів", "Adding the atomic masses"), l: [name + " = " + terms, name + " = " + S(m.M) + " " + UNIT] },
        { t: L("Масові частки елементів", "Mass fractions of the elements"), l: m.rows.map((r) => "ω(" + r.sym + ") = " + S(r.sub) + " / " + S(m.M) + " = " + pc(r.sub)), note: L("Частка елемента — його внесок, поділений на молярну масу.", "The fraction of an element is its contribution divided by the molar mass.") }
      ];
      const rowsHtml = m.rows.map((r) => "<tr><th>" + h.esc(r.sym) + "</th><td>" + r.count + "</td><td>" + h.esc(S(r.ar)) + "</td><td>" + h.esc(S(r.sub)) + "</td><td>" + h.esc(pc(r.sub)) + "</td></tr>").join("");
      const table = '<div class="ph__sub">' + L("Склад", "Composition") + '</div><div class="ph__tblWrap"><table class="ph__tbl"><thead><tr><th>' + L("Елемент", "Element") + "</th><th>" + L("Атомів", "Atoms") + "</th><th>Ar</th><th>" + L("Внесок", "Mass") + "</th><th>ω</th></tr></thead><tbody>" + rowsHtml + '<tr class="ph__total"><th>' + L("Разом", "Total") + "</th><td>" + total + "</td><td></td><td>" + h.esc(S(m.M)) + "</td><td>100 %</td></tr></tbody></table></div>";
      const kg = C.qdiv(m.M, C.R(1000));
      return { ok: true, expr: L("Молярна маса ", "Molar mass of ") + m.pretty, head: ["M", S(m.M) + " " + UNIT], headSub: S(kg) + " " + L("кг/моль", "kg/mol"), tiles: [{ k: L("Відносна маса Mr", "Relative mass Mr"), v: S(m.M) }, { k: L("Атомів у формулі", "Atoms in the formula"), v: String(total) }, { k: L("Елементів", "Elements"), v: String(m.rows.length) }], extraHtml: table, steps, resText: name + " = " + S(m.M) + " " + UNIT };
    },
    reset(h) { h.el("mmF").value = ""; },
    fill(h) { h.el("mmF").value = "H2SO4"; },
    share(p, h) { if (h.el("mmF").value.trim()) p.set("f", h.el("mmF").value.trim()); },
    apply(qs, h) { if (qs.has("f")) h.el("mmF").value = qs.get("f").slice(0, 80); }
  };

  // ----- емпірична й молекулярна формула -----
  const emp = {
    key: "emp", type: "custom", nameUk: "Емпірична формула", nameEn: "Empirical formula",
    build(body, x, h) {
      const { el, esc, maybeCalc, selOpts } = h;
      const rowsHtml = (n, keep) => Array.from({ length: n }, (_, i) => '<div class="ph__var"><label class="ph__label" for="emS_' + i + '">' + L("Елемент ", "Element ") + (i + 1) + '</label><div class="ph__inl"><input class="ph__input ph__input--sym" id="emS_' + i + '" type="text" autocomplete="off" spellcheck="false" maxlength="2" placeholder="' + ["C", "H", "O", "N", "S", "Cl"][i] + '" value="' + esc(keep && keep[i] ? keep[i][0] : "") + '"><input class="ph__input" id="emV_' + i + '" type="text" inputmode="text" autocomplete="off" maxlength="30" placeholder="' + [L("40 (%)", "40 (%)"), "6,71", "53,29", "", "", ""][i] + '" value="' + esc(keep && keep[i] ? keep[i][1] : "") + '"></div></div>').join("");
      body.innerHTML = '<div class="ph__vars"><div class="ph__var"><label class="ph__label" for="emT">' + L("Склад заданий у", "The composition is given in") + '</label><select class="ph__unit ph__unit--wide" id="emT"><option value="p">' + L("відсотках (%)", "percent (%)") + '</option><option value="g">' + L("грамах (г)", "grams (g)") + '</option></select></div><div class="ph__var"><label class="ph__label" for="emM">' + L("Молярна маса, г/моль (необов.)", "Molar mass, g/mol (optional)") + '</label><input class="ph__input" id="emM" type="text" inputmode="text" autocomplete="off" maxlength="20" placeholder="' + L("напр.: 180", "e.g.: 180") + '"></div></div><div class="ph__vars" id="emRows">' + rowsHtml(3) + '</div><div class="ph__fnActions"><button type="button" class="ph__mini" id="emAdd">' + L("+ Додати елемент", "+ Add an element") + '</button><button type="button" class="ph__mini" id="emDel">' + L("− Прибрати", "− Remove") + '</button></div><div class="ph__hint ph__mt12">' + L("Вкажіть символи елементів і їхній вміст. Калькулятор знайде найпростіше співвідношення атомів (емпіричну формулу); якщо додати молярну масу, покаже й молекулярну формулу.", "Enter the element symbols and their content. The calculator finds the simplest atom ratio (the empirical formula); if you add the molar mass it also shows the molecular formula.") + "</div>";
      let n = 3;
      const wire = () => { for (let i = 0; i < n; i++) { el("emS_" + i).addEventListener("input", maybeCalc); el("emV_" + i).addEventListener("input", maybeCalc); } };
      const rebuild = (nn) => { const keep = Array.from({ length: n }, (_, i) => [el("emS_" + i).value, el("emV_" + i).value]); n = nn; el("emRows").innerHTML = rowsHtml(n, keep); wire(); el("emAdd").disabled = n >= MAXR; el("emDel").disabled = n <= 2; maybeCalc(); };
      el("emAdd").addEventListener("click", () => { if (n < MAXR) rebuild(n + 1); });
      el("emDel").addEventListener("click", () => { if (n > 2) rebuild(n - 1); });
      el("emT").addEventListener("change", maybeCalc); el("emM").addEventListener("input", maybeCalc);
      wire(); body._emN = () => n; body._emRebuild = rebuild;
    },
    calc(h) {
      const { el, parseNum, ND, decNum, vstr, VR } = h, nd = ND(), n = el("phBody")._emN(), pct = el("emT").value === "p";
      const items = [], errs = [];
      for (let i = 0; i < n; i++) {
        const sraw = el("emS_" + i).value.trim(), vraw = el("emV_" + i).value;
        if (!sraw && !vraw.trim()) continue;
        const s = C.norm(sraw), sym = s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : "";
        if (!C.EL[sym]) { errs.push(L("Невідомий елемент «" + sraw.slice(0, 4) + "»", "Unknown element “" + sraw.slice(0, 4) + "”")); continue; }
        const r = parseNum(vraw);
        if (r.empty) { errs.push(sym + ": " + L("вкажіть вміст", "enter the content")); continue; }
        if (r.err || r.v.n <= 0n) { errs.push(sym + ": " + L("вміст має бути додатним числом", "the content must be a positive number")); continue; }
        if (items.some((it) => it.sym === sym)) { errs.push(L("Елемент " + sym + " повторюється", "The element " + sym + " is repeated")); continue; }
        items.push({ sym, x: r.v, ar: C.massOf(sym) });
      }
      if (errs.length) return { ok: false, msg: errs.slice(0, 3).join("; ") };
      if (items.length < 2) return { ok: false, incomplete: true };
      const sum = items.reduce((a, it) => C.qadd(a, it.x), C.R(0));
      if (pct && Number(sum.n) / Number(sum.d) > 100.5) return { ok: false, msg: L("Сума відсотків більша за 100.", "The percentages add up to more than 100.") };
      const S = (r) => vstr(VR(r), null, nd, true), mol = (a) => S(a);
      items.forEach((it) => { it.n = C.qdiv(it.x, it.ar); });
      const nmin = items.reduce((a, it) => (it.n.n * a.d < a.n * it.n.d ? it.n : a), items[0].n);
      items.forEach((it) => { it.r = C.qdiv(it.n, nmin); it.rd = Number(it.r.n) / Number(it.r.d); });
      let k = 0;
      for (let t = 1; t <= 12 && !k; t++) if (items.every((it) => { const v = it.rd * t; return Math.round(v) >= 1 && Math.abs(v - Math.round(v)) <= 0.1; })) k = t;
      if (!k) return { ok: false, msg: L("Не вдалося підібрати цілі індекси за такими даними. Перевірте відсотки (їхня сума має бути близько 100) і символи елементів.", "Could not find whole-number indices for these data. Check the percentages (they should add up to about 100) and the element symbols.") };
      items.forEach((it) => { it.cnt = Math.round(it.rd * k); });
      const formula = (mult) => items.map((it) => it.sym + (it.cnt * mult > 1 ? it.cnt * mult : "")).join("");
      const Me = items.reduce((a, it) => C.qadd(a, C.qmul(it.ar, C.R(it.cnt))), C.R(0));
      const steps = [];
      const what = pct ? L("Беремо 100 г речовини, тоді маса елемента в грамах дорівнює його відсотку.", "Take 100 g of the substance; then the mass of an element in grams equals its percentage.") : L("Масу кожного елемента беремо як є.", "Each element's mass is taken as given.");
      steps.push({ t: L("Маси елементів", "Masses of the elements"), l: items.map((it) => "m(" + it.sym + ") = " + S(it.x) + " " + L("г", "g")), note: what });
      steps.push({ t: L("Кількість речовини атомів n = m / Ar", "Amount of atoms n = m / Ar"), l: items.map((it) => "n(" + it.sym + ") = " + S(it.x) + " / " + S(it.ar) + " = " + S(it.n) + " " + L("моль", "mol")) });
      steps.push({ t: L("Ділимо на найменше значення", "Dividing by the smallest value"), l: items.map((it) => it.sym + ": " + S(it.n) + " / " + S(nmin) + " = " + decNum(it.r, nd)) });
      if (k > 1) steps.push({ t: L("Множимо на " + k + ", щоб отримати цілі числа", "Multiplying by " + k + " to get whole numbers"), l: items.map((it) => it.sym + ": " + decNum(it.r, nd) + " · " + k + " ≈ " + it.cnt), note: L("Допускаємо відхилення до 0,1 від цілого — дані зазвичай округлені.", "A deviation of up to 0.1 from a whole number is allowed — the data are usually rounded.") });
      steps.push({ t: L("Емпірична формула", "Empirical formula"), l: [C.pretty(formula(1)), "M(" + C.pretty(formula(1)) + ") = " + S(Me) + " " + UNIT] });
      const tiles = [{ k: L("Емпірична формула", "Empirical formula"), v: C.pretty(formula(1)) }, { k: L("Молярна маса формули", "Molar mass of the formula"), v: S(Me) + " " + UNIT }];
      let head = C.pretty(formula(1)), headSub = null;
      const Mraw = parseNum(el("emM").value);
      if (Mraw.err) return { ok: false, msg: L("Молярна маса: введіть число (наприклад, 180).", "Molar mass: enter a number (for example 180).") };
      if (!Mraw.empty) {
        if (Mraw.v.n <= 0n) return { ok: false, msg: L("Молярна маса має бути додатною.", "The molar mass must be positive.") };
        const ratio = C.qdiv(Mraw.v, Me), rd = Number(ratio.n) / Number(ratio.d), fct = Math.round(rd);
        if (fct < 1 || Math.abs(rd - fct) > 0.05 * fct + 0.1) return { ok: false, msg: L("Молярна маса " + S(Mraw.v) + " не кратна масі емпіричної формули (" + S(Me) + "). Перевірте дані.", "The molar mass " + S(Mraw.v) + " is not a multiple of the mass of the empirical formula (" + S(Me) + "). Check the data.") };
        steps.push({ t: L("Молекулярна формула", "Molecular formula"), l: ["M / M(" + C.pretty(formula(1)) + ") = " + S(Mraw.v) + " / " + S(Me) + " = " + decNum(ratio, nd) + " ≈ " + fct, L("Множимо всі індекси на ", "Multiply all the indices by ") + fct + ": " + C.pretty(formula(fct))], note: fct === 1 ? L("Молекулярна формула збігається з емпіричною.", "The molecular formula equals the empirical formula.") : "" });
        tiles.push({ k: L("Молекулярна формула", "Molecular formula"), v: C.pretty(formula(fct)) });
        head = C.pretty(formula(fct)); headSub = L("емпірична: ", "empirical: ") + C.pretty(formula(1));
      }
      return { ok: true, expr: L("Формула за складом", "Formula from composition"), head: [L("формула", "formula"), head], headSub, subRaw: true, tiles, steps, resText: (headSub ? head + " (" + headSub + ")" : head) };
    },
    reset(h) { const b = h.el("phBody"); if (b._emRebuild) b._emRebuild(3); for (let i = 0; i < b._emN(); i++) { h.el("emS_" + i).value = ""; h.el("emV_" + i).value = ""; } h.el("emM").value = ""; h.el("emT").value = "p"; },
    fill(h) { const b = h.el("phBody"); b._emRebuild(3); [["C", "40"], ["H", "6,71"], ["O", "53,29"]].forEach(([s, v], i) => { h.el("emS_" + i).value = s; h.el("emV_" + i).value = v; }); h.el("emT").value = "p"; h.el("emM").value = "180"; },
    share(p, h) { const b = h.el("phBody"), n = b._emN(); p.set("en", n); p.set("et", h.el("emT").value); for (let i = 0; i < n; i++) { if (h.el("emS_" + i).value.trim() || h.el("emV_" + i).value.trim()) { p.set("es" + i, h.el("emS_" + i).value.trim()); p.set("ev" + i, h.el("emV_" + i).value.trim()); } } if (h.el("emM").value.trim()) p.set("em", h.el("emM").value.trim()); },
    apply(qs, h) { const b = h.el("phBody"), n = Math.min(MAXR, Math.max(2, Number(qs.get("en")) || 3)); b._emRebuild(n); if (qs.get("et") === "g") h.el("emT").value = "g"; for (let i = 0; i < n; i++) { if (qs.has("es" + i)) h.el("emS_" + i).value = qs.get("es" + i).slice(0, 2); if (qs.has("ev" + i)) h.el("emV_" + i).value = qs.get("ev" + i).slice(0, 30); } if (qs.has("em")) h.el("emM").value = qs.get("em").slice(0, 20); }
  };
  return { modes: [mm, emp], keepSet: true };
});
