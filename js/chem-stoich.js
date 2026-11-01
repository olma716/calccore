/* chem-stoich.js — дані калькулятора «Стехіометрія»: кількість речовини (n, m, N, V), розрахунок за рівнянням реакції, обмежувальний реагент і вихід продукту */
PhysCalc.start(({ L, u, X }) => {
  const C = window.Chem;
  const F = (out, ins, txt, f, o) => ({ out, ins: ins ? ins.split(",") : [], txt, f, ...(o || {}) });
  const V = (id, sym, uk, en, si, units, ph, sign, def, extra) => ({ id, sym, uk, en, si, units, ph, sign: sign || "pos", def, ...(extra || {}) });
  const dyn = (f, fn) => { Object.defineProperty(f, "txt", { get: fn, enumerable: true }); return f; };
  const U = {
    mass: [u("г", "g", 1), u("мг", "mg", "0.001"), u("кг", "kg", 1000), u("т", "t", 1000000)],
    vol: [u("л", "L", 1), u("мл", "mL", "0.001"), u("м³", "m³", 1000), u("дм³", "dm³", 1)],
    mol: [u("моль", "mol", 1), u("ммоль", "mmol", "0.001"), u("кмоль", "kmol", 1000)],
    M: [u("г/моль", "g/mol", 1)],
    num: [u("(частинок)", "(particles)", 1)]
  };
  const dsep = (s) => L(s.replace(".", ","), s);
  const naTxt = () => (C.setNow() === "school" ? dsep("6.02") + "·10²³ " + L("моль⁻¹", "mol⁻¹") : dsep("6.02214076") + "·10²³ " + L("моль⁻¹", "mol⁻¹"));
  const vmTxt = () => (C.setNow() === "school" ? dsep("22.4") : dsep("22.414")) + " " + L("л/моль", "L/mol");
  const naNote = () => L("Число Авогадро Nₐ = " + naTxt() + (C.setNow() === "school" ? " (шкільне значення)." : " (точне за визначенням СІ)."), "The Avogadro constant Nₐ = " + naTxt() + (C.setNow() === "school" ? " (school value)." : " (exact by the SI definition)."));
  const vmNote = () => L("Молярний об'єм газу за нормальних умов (0 °C, 101,325 кПа): Vₘ = " + vmTxt() + (C.setNow() === "school" ? " (шкільне значення)." : "."), "Molar volume of a gas at standard conditions (0 °C, 101.325 kPa): Vₘ = " + vmTxt() + (C.setNow() === "school" ? " (school value)." : "."));

  // ----- кількість речовини -----
  const mol = {
    key: "mol", type: "chain", nameUk: "Кількість речовини", nameEn: "Amount of substance", find: "n",
    vars: [V("n", "n", "Кількість речовини", "Amount of substance", ["моль", "mol"], U.mol, ""), V("m", "m", "Маса", "Mass", ["г", "g"], U.mass, "напр.: 100"), { ...V("M", "M", "Молярна маса (число або формула)", "Molar mass (number or formula)", ["г/моль", "g/mol"], U.M, "напр.: 100,09 або CaCO3"), chem: true }, V("N", "N", "Число частинок", "Number of particles", ["(частинок)", "(particles)"], U.num, "напр.: 3,01e23"), V("V", "V", "Об'єм газу (н.у.)", "Gas volume (standard conditions)", ["л", "L"], U.vol, "напр.: 11,2")],
    formulas: [
      F("n", "m,M", "n = m / M", (a) => X.div(a.m, a.M)), F("m", "n,M", "m = n · M", (a) => X.mul(a.n, a.M)), F("M", "m,n", "M = m / n", (a) => X.div(a.m, a.n)),
      dyn(F("N", "n", "", (a) => X.mul(a.n, X.VR(C.NA())), { note: naNote }), () => "N = n · " + naTxt()),
      dyn(F("n", "N", "", (a) => X.div(a.N, X.VR(C.NA())), { note: naNote }), () => "n = N / " + naTxt()),
      dyn(F("V", "n", "", (a) => X.mul(a.n, X.VR(C.VM())), { note: vmNote }), () => "V = n · " + vmTxt()),
      dyn(F("n", "V", "", (a) => X.div(a.V, X.VR(C.VM())), { note: vmNote }), () => "n = V / " + vmTxt())
    ],
    hint: ["Зв'язок між масою, кількістю речовини, числом частинок і об'ємом газу. Молярну масу можна ввести числом або формулою (CaCO3, H2SO4). Об'єм газу — за нормальних умов; значення Vₘ і Nₐ залежать від набору в налаштуваннях.", "The link between mass, amount of substance, number of particles and gas volume. The molar mass can be a number or a formula (CaCO3, H2SO4). Gas volume is at standard conditions; the values of Vₘ and Nₐ depend on the set chosen in the settings."],
    example: { find: "n", vals: { m: "100", M: "CaCO3" } }
  };

  // ----- спільне для режимів із рівнянням -----
  const AU = [["mol", "моль", "mol", 1, "n"], ["mmol", "ммоль", "mmol", "0.001", "n"], ["kmol", "кмоль", "kmol", 1000, "n"], ["g", "г", "g", 1, "m"], ["mg", "мг", "mg", "0.001", "m"], ["kg", "кг", "kg", 1000, "m"], ["t", "т", "t", 1000000, "m"], ["L", "л (газ)", "L (gas)", 1, "V"], ["mL", "мл (газ)", "mL (gas)", "0.001", "V"]];
  const auOpts = (kinds, sel) => AU.map((a, i) => (kinds.includes(a[4]) ? '<option value="' + i + '"' + (i === sel ? " selected" : "") + ">" + L(a[1], a[2]) + "</option>" : "")).join("");
  const HINT = L("Запишіть рівняння (->, → або =); коефіцієнти можна не ставити — калькулятор розставить їх сам. Речовини пишіть формулами: Fe2O3, Ca(OH)2.", "Write the equation (->, → or =); coefficients can be left out — the calculator sets them itself. Write substances as formulas: Fe2O3, Ca(OH)2.");
  const CHIPS = ["CaCO3 -> CaO + CO2", "N2 + H2 -> NH3", "Fe + O2 -> Fe2O3", "Al + HCl -> AlCl3 + H2"];
  const chipsHtml = (h, id) => '<div class="ph__fnActions" id="' + id + '">' + CHIPS.map((f) => { const p = C.parseEquation(f); return '<button type="button" class="ph__mini" data-f="' + h.esc(f) + '">' + h.esc(C.eqStr(p.left, p.right, null)) + "</button>"; }).join("") + "</div>";

  // розбір і балансування рівняння + молярні маси
  function getEq(h) {
    const raw = h.el("sqEq").value;
    if (!raw.trim()) return { incomplete: true };
    const eq = C.parseEquation(raw);
    if (!eq.ok) return { err: C.eqErrText(eq) };
    const b = C.balance(eq.left, eq.right);
    if (!b.ok) return { err: C.balErrText(b) };
    const sp = eq.left.concat(eq.right), nl = eq.left.length, Ms = [];
    for (const s of sp) { if (s.p.electron) { return { err: L("Електрони (e^-) в розрахунках за рівнянням не підтримуються — запишіть рівняння в молекулярному вигляді.", "Electrons (e^-) are not supported in equation calculations — write the equation in molecular form.") }; } const m = C.molar(s.raw); Ms.push(m.M); }
    return { eq, sp, nl, co: b.coefs, M: Ms, text: C.eqStr(eq.left, eq.right, b.coefs) };
  }
  // кількість з поля (одиниці моль/маса/об'єм газу) → моль
  function toMol(h, val, unitIdx, M) {
    const a = AU[unitIdx], f = C.dec(String(a[3]));
    const x = C.qmul(val, f);
    if (a[4] === "n") return { n: x, how: "n" };
    if (a[4] === "m") return { n: C.qdiv(x, M), how: "m", m: x };
    return { n: C.qdiv(x, C.VM()), how: "V", V: x };
  }
  const spName = (s) => C.spStr(s);

  // ----- розрахунок за рівнянням -----
  const eqm = {
    key: "eq", type: "custom", nameUk: "За рівнянням реакції", nameEn: "From the reaction equation",
    build(body, x, h) {
      const { el, esc, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars ph__vars--one"><div class="ph__var"><label class="ph__label" for="sqEq">' + L("Рівняння реакції", "Reaction equation") + '</label><input class="ph__input" id="sqEq" type="text" inputmode="text" autocomplete="off" spellcheck="false" maxlength="300" placeholder="' + L("напр.: CaCO3 -> CaO + CO2", "e.g.: CaCO3 -> CaO + CO2") + '"></div></div>' + chipsHtml(h, "sqChips") +
        '<div class="ph__vars"><div class="ph__var"><label class="ph__label" for="sqKnown">' + L("Що відомо про речовину", "Which substance is known") + '</label><select class="ph__unit ph__unit--wide" id="sqKnown"></select></div><div class="ph__var"><label class="ph__label" for="sqAmt">' + L("Кількість (маса, моль або об'єм)", "Amount (mass, mol or volume)") + '</label><div class="ph__inl"><input class="ph__input" id="sqAmt" type="text" inputmode="text" autocomplete="off" maxlength="30" placeholder="' + L("напр.: 100", "e.g.: 100") + '"><select class="ph__unit" id="sqU" aria-label="' + L("Одиниця", "Unit") + '">' + auOpts(["n", "m", "V"], 3) + '</select></div></div><div class="ph__var ph__var--full"><label class="ph__label" for="sqFind">' + L("Що знайти", "What to find") + '</label><select class="ph__unit ph__unit--wide" id="sqFind"></select></div></div><div class="ph__hint ph__mt12">' + HINT + "</div>";
      body._sqSp = [];
      const refresh = () => {
        const raw = el("sqEq").value, eq = raw.trim() ? C.parseEquation(raw) : null, names = eq && eq.ok ? eq.left.concat(eq.right).map(spName) : [];
        if (JSON.stringify(names) === JSON.stringify(body._sqSp)) return;
        const k0 = Number(el("sqKnown").value) || 0, f0 = Number(el("sqFind").value) || 0;
        body._sqSp = names;
        const nl = eq && eq.ok ? eq.left.length : 0;
        el("sqKnown").innerHTML = names.map((nm, i) => '<option value="' + i + '"' + (i === (k0 < names.length ? k0 : 0) ? " selected" : "") + ">" + esc(nm) + "</option>").join("");
        el("sqFind").innerHTML = '<option value="-1"' + (f0 === -1 || !names.length ? " selected" : "") + ">" + L("Усі речовини", "All substances") + "</option>" + names.map((nm, i) => '<option value="' + i + '"' + (f0 === i ? " selected" : "") + ">" + esc(nm) + (i >= nl ? L(" (продукт)", " (product)") : L(" (реагент)", " (reactant)")) + "</option>").join("");
      };
      body._sqRefresh = refresh;
      el("sqEq").addEventListener("input", () => { refresh(); maybeCalc(); });
      el("sqEq").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); h.calc(true); } });
      el("sqChips").addEventListener("click", (e) => { const b = e.target.closest("button[data-f]"); if (b) { el("sqEq").value = b.dataset.f; refresh(); h.calc(true); } });
      ["sqKnown", "sqU", "sqFind"].forEach((id) => el(id).addEventListener("change", maybeCalc));
      el("sqAmt").addEventListener("input", maybeCalc);
      el("sqAmt").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); h.calc(true); } });
      refresh();
    },
    calc(h) {
      const { el, ND, vstr, VR, parseNum, esc } = h, nd = ND(), body = el("phBody");
      body._sqRefresh();
      const g = getEq(h);
      if (g.incomplete) return { ok: false, incomplete: true };
      if (g.err) return { ok: false, msg: g.err };
      const S = (r) => vstr(VR(r), null, nd, true);
      const ki = Number(el("sqKnown").value) || 0, ar = parseNum(el("sqAmt").value);
      if (ar.empty) return { ok: false, incomplete: true };
      if (ar.err || ar.v.n <= 0n) return { ok: false, msg: L("Кількість має бути додатним числом (наприклад, 100 чи 2,5).", "The amount must be a positive number (for example 100 or 2.5).") };
      const ui = Number(el("sqU").value) || 0, k = toMol(h, ar.v, ui, g.M[ki]), nk = k.n;
      const Vm = C.VM(), nsp = g.sp.length;
      const nn = g.co.map((cf) => C.qdiv(C.qmul(nk, C.R(cf)), C.R(g.co[ki])));
      const mm = nn.map((n, i) => C.qmul(n, g.M[i])), vv = nn.map((n) => C.qmul(n, Vm));
      const fi = Number(el("sqFind").value);
      const showAll = fi < 0 || fi >= nsp, target = showAll ? g.nl : fi;
      const nm = (i) => spName(g.sp[i]), un = L("моль", "mol"), gU = L("г", "g"), lU = L("л", "L");
      const steps = [];
      steps.push({ t: L("Збалансоване рівняння", "The balanced equation"), l: [g.text], note: L("Коефіцієнти показують, у яких молярних співвідношеннях речовини реагують.", "The coefficients show the molar ratios in which the substances react.") });
      const kl = [];
      if (k.how === "n") kl.push("n(" + nm(ki) + ") = " + S(nk) + " " + un);
      else if (k.how === "m") kl.push("M(" + nm(ki) + ") = " + S(g.M[ki]) + " " + L("г/моль", "g/mol"), "n(" + nm(ki) + ") = m / M = " + S(k.m) + " / " + S(g.M[ki]) + " = " + S(nk) + " " + un);
      else kl.push("n(" + nm(ki) + ") = V / Vₘ = " + S(k.V) + " / " + S(Vm) + " = " + S(nk) + " " + un);
      steps.push({ t: L("Кількість відомої речовини", "Amount of the known substance"), l: kl, note: k.how === "V" ? vmNote() : "" });
      const idx = showAll ? g.sp.map((s, i) => i).filter((i) => i !== ki) : (target === ki ? [] : [target]);
      steps.push({ t: L("Співвідношення за коефіцієнтами", "Ratios from the coefficients"), l: idx.map((i) => "n(" + nm(i) + ") = n(" + nm(ki) + ") · " + g.co[i] + " / " + g.co[ki] + " = " + S(nn[i]) + " " + un), note: L("n₂ / n₁ = ν₂ / ν₁, де ν — коефіцієнт перед речовиною.", "n₂ / n₁ = ν₂ / ν₁, where ν is the coefficient of the substance.") });
      steps.push({ t: L("Маса й об'єм", "Mass and volume"), l: (showAll ? g.sp.map((s, i) => i).filter((i) => i !== ki) : [target]).map((i) => "m(" + nm(i) + ") = n · M = " + S(nn[i]) + " · " + S(g.M[i]) + " = " + S(mm[i]) + " " + gU + ",  V = n · Vₘ = " + S(vv[i]) + " " + lU), note: L("Об'єм має сенс лише для газів за нормальних умов.", "Volume only makes sense for gases at standard conditions.") });
      const trs = g.sp.map((s, i) => "<tr" + (i === ki ? ' class="ph__total"' : "") + "><th>" + esc(nm(i)) + (i === ki ? L(" (дано)", " (given)") : "") + "</th><td>" + g.co[i] + "</td><td>" + esc(S(g.M[i])) + "</td><td>" + esc(S(nn[i])) + "</td><td>" + esc(S(mm[i])) + "</td><td>" + esc(S(vv[i])) + "</td></tr>").join("");
      const table = '<div class="ph__sub">' + L("Усі речовини реакції", "All substances of the reaction") + '</div><div class="ph__tblWrap"><table class="ph__tbl"><thead><tr><th>' + L("Речовина", "Substance") + "</th><th>ν</th><th>M, " + L("г/моль", "g/mol") + "</th><th>n, " + un + "</th><th>m, " + gU + "</th><th>V, " + lU + L(" (газ)", " (gas)") + "</th></tr></thead><tbody>" + trs + "</tbody></table></div>";
      const tiles = [{ k: "n(" + nm(target) + ")", v: S(nn[target]) + " " + un }, { k: "V(" + nm(target) + ")", v: S(vv[target]) + " " + lU + L(" (якщо газ)", " (if gas)") }];
      return { ok: true, expr: g.text, head: ["m(" + nm(target) + ")", S(mm[target]) + " " + gU], headSub: "n = " + S(nn[target]) + " " + un, subRaw: true, tiles, extraHtml: table, steps, resText: "m(" + nm(target) + ") = " + S(mm[target]) + " " + gU + ",  n = " + S(nn[target]) + " " + un };
    },
    reset(h) { h.el("sqEq").value = ""; h.el("sqAmt").value = ""; h.el("phBody")._sqRefresh(); h.el("sqU").value = "3"; },
    fill(h) { h.el("sqEq").value = "CaCO3 -> CaO + CO2"; h.el("phBody")._sqRefresh(); h.el("sqKnown").value = "0"; h.el("sqAmt").value = "100"; h.el("sqU").value = "3"; h.el("sqFind").value = "2"; },
    share(p, h) { if (h.el("sqEq").value.trim()) { p.set("e", h.el("sqEq").value.trim()); p.set("k", h.el("sqKnown").value); p.set("a", h.el("sqAmt").value.trim()); p.set("ua", h.el("sqU").value); p.set("fi", h.el("sqFind").value); } },
    apply(qs, h) { if (qs.has("e")) { h.el("sqEq").value = qs.get("e").slice(0, 300); h.el("phBody")._sqRefresh(); if (qs.has("k")) h.el("sqKnown").value = String(Math.max(0, Number(qs.get("k")) || 0)); if (qs.has("a")) h.el("sqAmt").value = qs.get("a").slice(0, 30); const ua = Number(qs.get("ua")); if (ua >= 0 && ua < AU.length) h.el("sqU").value = String(ua); if (qs.has("fi")) { const fi = Number(qs.get("fi")); h.el("sqFind").value = String(Number.isFinite(fi) ? fi : -1); } } }
  };

  // ----- обмежувальний реагент і вихід -----
  const lim = {
    key: "lim", type: "custom", nameUk: "Обмежувальний реагент і вихід", nameEn: "Limiting reagent and yield",
    build(body, x, h) {
      const { el, esc, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars ph__vars--one"><div class="ph__var"><label class="ph__label" for="sqEq">' + L("Рівняння реакції", "Reaction equation") + '</label><input class="ph__input" id="sqEq" type="text" inputmode="text" autocomplete="off" spellcheck="false" maxlength="300" placeholder="' + L("напр.: N2 + H2 -> NH3", "e.g.: N2 + H2 -> NH3") + '"></div></div>' + chipsHtml(h, "sqChips") +
        '<div class="ph__vars" id="sqReag"></div><div class="ph__vars"><div class="ph__var ph__var--full"><label class="ph__label" for="sqProd">' + L("Продукт, який шукаємо", "The product to find") + '</label><select class="ph__unit ph__unit--wide" id="sqProd"></select></div><div class="ph__var"><label class="ph__label" for="sqAct">' + L("Отримано (необов.)", "Obtained (optional)") + '</label><div class="ph__inl"><input class="ph__input" id="sqAct" type="text" inputmode="text" autocomplete="off" maxlength="30" placeholder="' + L("напр.: 15", "e.g.: 15") + '"><select class="ph__unit" id="sqActU" aria-label="' + L("Одиниця", "Unit") + '">' + auOpts(["m", "n"], 3) + '</select></div></div><div class="ph__var"><label class="ph__label" for="sqY">' + L("або вихід, %", "or yield, %") + '</label><input class="ph__input" id="sqY" type="text" inputmode="text" autocomplete="off" maxlength="12" placeholder="' + L("напр.: 80", "e.g.: 80") + '"></div></div><div class="ph__hint ph__mt12">' + HINT + L(" Для кожного реагенту вкажіть кількість; порожній реагент вважається в надлишку (наприклад, кисень повітря).", " Enter an amount for each reactant; an empty reactant is taken as in excess (for example, oxygen from the air).") + "</div>";
      body._sqSp = [];
      const refresh = () => {
        const raw = el("sqEq").value, eq = raw.trim() ? C.parseEquation(raw) : null, ok = eq && eq.ok, names = ok ? eq.left.concat(eq.right).map(spName) : [], nl = ok ? eq.left.length : 0;
        if (JSON.stringify(names) === JSON.stringify(body._sqSp) && body._sqNl === nl) return;
        const keep = Array.from({ length: (body._sqSp || []).length }, (_, i) => (el("sqA_" + i) ? [el("sqA_" + i).value, el("sqAU_" + i).value] : ["", "3"]));
        const p0 = Number(el("sqProd").value) || 0;
        body._sqSp = names; body._sqNl = nl;
        el("sqReag").innerHTML = names.slice(0, nl).map((nm, i) => '<div class="ph__var"><label class="ph__label" for="sqA_' + i + '">' + esc(nm) + "</label>" + '<div class="ph__inl"><input class="ph__input" id="sqA_' + i + '" type="text" inputmode="text" autocomplete="off" maxlength="30" placeholder="' + L("кількість", "amount") + '" value="' + esc(keep[i] ? keep[i][0] : "") + '"><select class="ph__unit" id="sqAU_' + i + '" aria-label="' + L("Одиниця", "Unit") + '">' + auOpts(["n", "m", "V"], keep[i] ? Number(keep[i][1]) : 3) + "</select></div></div>").join("");
        el("sqProd").innerHTML = names.slice(nl).map((nm, i) => '<option value="' + (nl + i) + '"' + (p0 === nl + i ? " selected" : "") + ">" + esc(nm) + "</option>").join("");
        if (names.length && !names.slice(nl).some((x, i) => p0 === nl + i)) el("sqProd").value = String(nl);
        names.slice(0, nl).forEach((nm, i) => { el("sqA_" + i).addEventListener("input", maybeCalc); el("sqAU_" + i).addEventListener("change", maybeCalc); });
      };
      body._sqRefresh = refresh;
      el("sqEq").addEventListener("input", () => { refresh(); maybeCalc(); });
      el("sqEq").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); h.calc(true); } });
      el("sqChips").addEventListener("click", (e) => { const b = e.target.closest("button[data-f]"); if (b) { el("sqEq").value = b.dataset.f; refresh(); h.calc(true); } });
      ["sqProd", "sqActU"].forEach((id) => el(id).addEventListener("change", maybeCalc));
      ["sqAct", "sqY"].forEach((id) => el(id).addEventListener("input", maybeCalc));
      refresh();
    },
    calc(h) {
      const { el, ND, vstr, VR, parseNum, esc, decNum } = h, nd = ND(), body = el("phBody");
      body._sqRefresh();
      const g = getEq(h);
      if (g.incomplete) return { ok: false, incomplete: true };
      if (g.err) return { ok: false, msg: g.err };
      const S = (r) => vstr(VR(r), null, nd, true), nl = g.nl, nsp = g.sp.length;
      const un = L("моль", "mol"), gU = L("г", "g"), lU = L("л", "L"), nm = (i) => spName(g.sp[i]);
      const ACT = L("практ.", "actual"), TH = L("теор.", "theor.");
      const given = [], errs = [];
      for (let i = 0; i < nl; i++) {
        const r = parseNum(el("sqA_" + i).value);
        if (r.empty) continue;
        if (r.err || r.v.n <= 0n) { errs.push(nm(i) + ": " + L("потрібне додатне число", "a positive number is needed")); continue; }
        const k = toMol(h, r.v, Number(el("sqAU_" + i).value) || 0, g.M[i]);
        given.push({ i, k, xi: C.qdiv(k.n, C.R(g.co[i])) });
      }
      if (errs.length) return { ok: false, msg: errs.slice(0, 3).join("; ") };
      if (!given.length) return { ok: false, incomplete: true };
      let xi = given[0].xi; given.forEach((x) => { if (x.xi.n * xi.d < xi.n * x.xi.d) xi = x.xi; });
      const limiting = given.filter((x) => x.xi.n * xi.d === xi.n * x.xi.d);
      const pi = Number(el("sqProd").value);
      if (!(pi >= nl && pi < nsp)) return { ok: false, incomplete: true };
      const np = C.qmul(xi, C.R(g.co[pi])), mp = C.qmul(np, g.M[pi]), vp = C.qmul(np, C.VM());
      const steps = [];
      steps.push({ t: L("Збалансоване рівняння", "The balanced equation"), l: [g.text] });
      steps.push({ t: L("Кількість кожного реагенту", "Amount of each reactant"), l: given.map((x) => { const a = AU[Number(el("sqAU_" + x.i).value) || 0]; return "n(" + nm(x.i) + ") = " + (x.k.how === "n" ? S(x.k.n) : x.k.how === "m" ? S(x.k.m) + " / " + S(g.M[x.i]) + " = " + S(x.k.n) : S(x.k.V) + " / " + S(C.VM()) + " = " + S(x.k.n)) + " " + un; }), note: given.length < nl ? L("Реагенти без кількості вважаємо в надлишку й не порівнюємо.", "Reactants without an amount are taken as in excess and not compared.") : "" });
      steps.push({ t: L("Порівнюємо n / ν", "Comparing n / ν"), l: given.map((x) => "n(" + nm(x.i) + ") / " + g.co[x.i] + " = " + S(x.k.n) + " / " + g.co[x.i] + " = " + S(x.xi)), note: L("Реагент із найменшим відношенням n / ν закінчиться першим — він обмежувальний.", "The reactant with the smallest n / ν runs out first — it is the limiting one.") });
      steps.push({ t: L("Обмежувальний реагент", "Limiting reagent"), l: [limiting.map((x) => nm(x.i)).join(", ")], note: limiting.length > 1 ? L("Кілька реагентів витрачаються одночасно — реагують у точному співвідношенні.", "Several reactants are used up at once — they react in the exact ratio.") : "" });
      steps.push({ t: L("Теоретичний вихід продукту", "Theoretical yield of the product"), l: ["n(" + nm(pi) + ") = " + S(xi) + " · " + g.co[pi] + " = " + S(np) + " " + un, "m(" + nm(pi) + ") = n · M = " + S(np) + " · " + S(g.M[pi]) + " = " + S(mp) + " " + gU] });
      const tiles = [{ k: L("Обмежувальний реагент", "Limiting reagent"), v: limiting.map((x) => nm(x.i)).join(", ") }, { k: "n(" + nm(pi) + ")", v: S(np) + " " + un }, { k: "V(" + nm(pi) + ")", v: S(vp) + " " + lU + L(" (якщо газ)", " (if gas)") }];
      // практичний вихід
      let headSub = "n = " + S(np) + " " + un, extraYield = "";
      const ar = parseNum(el("sqAct").value), yr = parseNum(el("sqY").value);
      if (ar.err || yr.err) return { ok: false, msg: L("Практичний вихід і відсоток вводьте числами.", "Enter the actual amount and the percentage as numbers.") };
      let yieldTxt = "";
      if (!ar.empty) {
        if (ar.v.n <= 0n) return { ok: false, msg: L("Практична кількість має бути додатною.", "The actual amount must be positive.") };
        const k = toMol(h, ar.v, Number(el("sqActU").value) || 0, g.M[pi]), ratio = C.qmul(C.qdiv(k.n, np), C.R(100));
        if (ratio.n > 100n * ratio.d) return { ok: false, msg: L("Практичний вихід не може перевищувати теоретичний (" + S(mp) + " " + gU + ").", "The actual yield cannot exceed the theoretical one (" + S(mp) + " " + gU + ").") };
        steps.push({ t: L("Вихід реакції", "Reaction yield"), l: ["η = n(" + ACT + ") / n(" + TH + ") · 100 % = " + S(k.n) + " / " + S(np) + " · 100 % = " + decNum(ratio, nd) + " %"], note: L("Вихід — частка практично одержаного продукту від теоретично можливого.", "The yield is the share of the product actually obtained out of the theoretical amount.") });
        tiles.push({ k: L("Вихід η", "Yield η"), v: decNum(ratio, nd) + " %" }); yieldTxt = ",  η = " + decNum(ratio, nd) + " %";
      } else if (!yr.empty) {
        if (yr.v.n <= 0n || yr.v.n > 100n * yr.v.d) return { ok: false, msg: L("Вихід має бути в межах від 0 до 100 %.", "The yield must be between 0 and 100 %.") };
        const ma = C.qmul(mp, C.qdiv(yr.v, C.R(100)));
        steps.push({ t: L("Практична маса продукту", "Actual mass of the product"), l: ["m(" + ACT + ") = m(" + TH + ") · η = " + S(mp) + " · " + S(yr.v) + " % = " + S(ma) + " " + gU] });
        tiles.push({ k: L("Практично отримаємо", "Actually obtained"), v: S(ma) + " " + gU }); yieldTxt = ",  m(" + ACT + ") = " + S(ma) + " " + gU;
      }
      // таблиця
      const rows = given.map((x) => "<tr" + (limiting.includes(x) ? ' class="ph__total"' : "") + "><th>" + esc(nm(x.i)) + "</th><td>" + esc(S(x.k.n)) + "</td><td>" + g.co[x.i] + "</td><td>" + esc(S(x.xi)) + "</td><td>" + (limiting.includes(x) ? L("обмежує", "limiting") : esc(S(C.qsub(x.k.n, C.qmul(xi, C.R(g.co[x.i])))) + " " + un + L(" залишиться", " left over"))) + "</td></tr>").join("");
      const table = '<div class="ph__sub">' + L("Реагенти", "Reactants") + '</div><div class="ph__tblWrap"><table class="ph__tbl"><thead><tr><th>' + L("Реагент", "Reactant") + "</th><th>n, " + un + "</th><th>ν</th><th>n / ν</th><th>" + L("Підсумок", "Result") + "</th></tr></thead><tbody>" + rows + "</tbody></table></div>";
      return { ok: true, expr: g.text, head: ["m(" + nm(pi) + ")", S(mp) + " " + gU], headSub, subRaw: true, tiles: tiles.slice(0, 4), extraHtml: table, steps, resText: L("Обмежує: ", "Limiting: ") + limiting.map((x) => nm(x.i)).join(", ") + ";  m(" + nm(pi) + ") = " + S(mp) + " " + gU + yieldTxt };
    },
    reset(h) { h.el("sqEq").value = ""; h.el("phBody")._sqRefresh(); h.el("sqAct").value = ""; h.el("sqY").value = ""; },
    fill(h) { h.el("sqEq").value = "N2 + H2 -> NH3"; h.el("phBody")._sqRefresh(); h.el("sqA_0").value = "28"; h.el("sqAU_0").value = "3"; h.el("sqA_1").value = "10"; h.el("sqAU_1").value = "3"; h.el("sqProd").value = "2"; h.el("sqAct").value = "25"; h.el("sqActU").value = "3"; h.el("sqY").value = ""; },
    share(p, h) { if (!h.el("sqEq").value.trim()) return; p.set("e", h.el("sqEq").value.trim()); const sp = h.el("phBody")._sqSp || [], nl = h.el("phBody")._sqNl || 0; for (let i = 0; i < nl; i++) { if (h.el("sqA_" + i) && h.el("sqA_" + i).value.trim()) { p.set("a" + i, h.el("sqA_" + i).value.trim()); p.set("au" + i, h.el("sqAU_" + i).value); } } p.set("pr", h.el("sqProd").value); if (h.el("sqAct").value.trim()) { p.set("ac", h.el("sqAct").value.trim()); p.set("acu", h.el("sqActU").value); } if (h.el("sqY").value.trim()) p.set("y", h.el("sqY").value.trim()); void sp; },
    apply(qs, h) { if (!qs.has("e")) return; h.el("sqEq").value = qs.get("e").slice(0, 300); const b = h.el("phBody"); b._sqRefresh(); for (let i = 0; i < (b._sqNl || 0); i++) { if (qs.has("a" + i)) { h.el("sqA_" + i).value = qs.get("a" + i).slice(0, 30); const ui = Number(qs.get("au" + i)); if (ui >= 0 && ui < AU.length) h.el("sqAU_" + i).value = String(ui); } } if (qs.has("pr")) h.el("sqProd").value = qs.get("pr"); if (qs.has("ac")) { h.el("sqAct").value = qs.get("ac").slice(0, 30); const ui = Number(qs.get("acu")); if (ui >= 0 && ui < AU.length) h.el("sqActU").value = String(ui); } if (qs.has("y")) h.el("sqY").value = qs.get("y").slice(0, 12); }
  };

  return { modes: [mol, eqm, lim], keepSet: true };
});
