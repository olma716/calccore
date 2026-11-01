/* phys-ohm.js — дані калькулятора «Закон Ома й електрика»: закон Ома й потужність, з'єднання резисторів, енергія й вартість, закон Джоуля–Ленца */
PhysCalc.start(({ L, UN, X }) => {
  const F = (out, ins, txt, f, o) => ({ out, ins: ins ? ins.split(",") : [], txt, f, ...(o || {}) });
  const V = (id, sym, uk, en, si, units, ph, sign) => ({ id, sym, uk, en, si, units, ph, sign: sign || "pos" });
  const SIv = ["В", "V"], SIa = ["А", "A"], SIo = ["Ом", "Ω"], SIw = ["Вт", "W"], SIj = ["Дж", "J"], SIs = ["с", "s"];

  // ----- закон Ома -----
  const ohm = {
    key: "ohm", type: "chain", nameUk: "Закон Ома й потужність", nameEn: "Ohm's law and power", find: "R",
    vars: [V("U", "U", "Напруга", "Voltage", SIv, UN.volt, "напр.: 12"), V("I", "I", "Сила струму", "Current", SIa, UN.amp, "напр.: 3"), V("R", "R", "Опір", "Resistance", SIo, UN.ohm, "напр.: 4"), V("P", "P", "Потужність", "Power", SIw, UN.power, "напр.: 36")],
    formulas: [
      F("U", "I,R", "U = I · R", (a, x) => x.mul(a.I, a.R)), F("I", "U,R", "I = U / R", (a, x) => x.div(a.U, a.R)), F("R", "U,I", "R = U / I", (a, x) => x.div(a.U, a.I)),
      F("P", "U,I", "P = U · I", (a, x) => x.mul(a.U, a.I)), F("P", "U,R", "P = U² / R", (a, x) => x.div(x.sq(a.U), a.R)), F("P", "I,R", "P = I² · R", (a, x) => x.mul(x.sq(a.I), a.R)),
      F("U", "P,I", "U = P / I", (a, x) => x.div(a.P, a.I)), F("I", "P,U", "I = P / U", (a, x) => x.div(a.P, a.U)),
      F("U", "P,R", "U = √(P · R)", (a, x) => x.sqrt(x.mul(a.P, a.R))), F("I", "P,R", "I = √(P / R)", (a, x) => x.sqrt(x.div(a.P, a.R))),
      F("R", "U,P", "R = U² / P", (a, x) => x.div(x.sq(a.U), a.P)), F("R", "P,I", "R = P / I²", (a, x) => x.div(a.P, x.sq(a.I)))
    ],
    hint: ["Заповніть будь-які дві величини з чотирьох: калькулятор знайде решту. Одиниці можна обирати для кожної величини окремо.", "Fill in any two of the four quantities: the calculator finds the rest. Units can be chosen separately for each quantity."],
    example: { find: "R", vals: { U: "12", I: "3" } }
  };

  // ----- енергія й вартість -----
  const cost = {
    key: "cost", type: "chain", nameUk: "Енергія й вартість електроенергії", nameEn: "Energy and electricity cost", find: "C",
    vars: [V("P", "P", "Потужність", "Power", SIw, UN.power, "напр.: 2"), V("U", "U", "Напруга", "Voltage", SIv, UN.volt, "напр.: 220"), V("I", "I", "Сила струму", "Current", SIa, UN.amp, "напр.: 9"), V("t", "t", "Час роботи", "Running time", SIs, UN.time, "напр.: 5"), V("A", "A", "Спожита енергія", "Energy used", SIj, UN.energy, "напр.: 10"), V("T", "T", "Тариф", "Tariff", ["₴/Дж", "₴/J"], UN.tariff, "напр.: 4,32"), V("C", "C", "Вартість", "Cost", ["₴", "₴"], UN.money, "")],
    formulas: [
      F("P", "U,I", "P = U · I", (a, x) => x.mul(a.U, a.I)), F("I", "P,U", "I = P / U", (a, x) => x.div(a.P, a.U)), F("U", "P,I", "U = P / I", (a, x) => x.div(a.P, a.I)),
      F("A", "P,t", "A = P · t", (a, x) => x.mul(a.P, a.t)), F("P", "A,t", "P = A / t", (a, x) => x.div(a.A, a.t)), F("t", "A,P", "t = A / P", (a, x) => x.div(a.A, a.P)),
      F("C", "A,T", "C = A · T", (a, x) => x.mul(a.A, a.T), { note: ["Тариф у СІ — гривні за джоуль: 1 ₴/кВт·год = 1/3 600 000 ₴/Дж.", "The tariff in SI is hryvnias per joule: 1 ₴/kW·h = 1/3 600 000 ₴/J."] }), F("A", "C,T", "A = C / T", (a, x) => x.div(a.C, a.T)), F("T", "C,A", "T = C / A", (a, x) => x.div(a.C, a.A))
    ],
    hint: ["Вкажіть потужність приладу, час і тариф: отримаєте спожиту енергію й вартість. Для енергії оберіть одиницю «кВт·год», для часу «год». Тариф введіть зі свого рахунку.", "Enter the power of the appliance, the time and the tariff to get the energy used and the cost. Choose «kW·h» for energy and «h» for time. Take the tariff from your bill."],
    example: { find: "C", vals: { P: "2|1", t: "5|2", T: "4.32" } }
  };

  // ----- Джоуль–Ленц -----
  const joule = {
    key: "joule", type: "chain", nameUk: "Закон Джоуля–Ленца", nameEn: "Joule–Lenz law", find: "Q",
    vars: [V("I", "I", "Сила струму", "Current", SIa, UN.amp, "напр.: 2"), V("R", "R", "Опір", "Resistance", SIo, UN.ohm, "напр.: 10"), V("t", "t", "Час", "Time", SIs, UN.time, "напр.: 60"), V("Q", "Q", "Кількість теплоти", "Heat", SIj, UN.energy, "")],
    formulas: [
      F("Q", "I,R,t", "Q = I² · R · t", (a, x) => x.mul(x.mul(x.sq(a.I), a.R), a.t)), F("R", "Q,I,t", "R = Q / (I² · t)", (a, x) => x.div(a.Q, x.mul(x.sq(a.I), a.t))),
      F("t", "Q,I,R", "t = Q / (I² · R)", (a, x) => x.div(a.Q, x.mul(x.sq(a.I), a.R))), F("I", "Q,R,t", "I = √(Q / (R · t))", (a, x) => x.sqrt(x.div(a.Q, x.mul(a.R, a.t))))
    ],
    hint: ["Кількість теплоти, що виділяється в провіднику: Q = I²Rt. Заповніть три з чотирьох величин.", "The heat released in a conductor: Q = I²Rt. Fill in three of the four quantities."],
    example: { find: "Q", vals: { I: "2", R: "10", t: "60" } }
  };

  // ----- резистори -----
  const res = {
    key: "res", type: "custom", nameUk: "З'єднання резисторів", nameEn: "Resistor networks",
    build(body, x, h) {
      const { el, L, esc, selOpts, maybeCalc } = h;
      const rowsHtml = (n, keep) => Array.from({ length: n }, (_, i) => '<div class="ph__var"><label class="ph__label" for="res_' + i + '"><b class="ph__sym">R' + "₁₂₃₄₅₆₇₈"[i] + "</b> — " + L("опір", "resistance") + '</label><div class="ph__inl"><input class="ph__input" id="res_' + i + '" type="text" inputmode="text" autocomplete="off" maxlength="40" placeholder="' + L("напр.: ", "e.g.: ") + [10, 20, 30, 40, 50, 60, 70, 80][i] + '" value="' + esc(keep && keep[i] ? keep[i][0] : "") + '"><select class="ph__unit" id="resu_' + i + '">' + selOpts({ units: UN.ohm }, keep && keep[i] ? Number(keep[i][1]) : 0) + "</select></div></div>").join("");
      body.innerHTML = '<div class="ph__vars"><div class="ph__var"><label class="ph__label" for="resMode">' + L("З'єднання", "Connection") + '</label><select class="ph__unit ph__unit--wide" id="resMode"><option value="s">' + L("Послідовне", "In series") + '</option><option value="p">' + L("Паралельне", "In parallel") + '</option></select></div><div class="ph__var"><label class="ph__label" for="resUv">' + L("Напруга U (необов.)", "Voltage U (optional)") + '</label><div class="ph__inl"><input class="ph__input" id="resUv" type="text" inputmode="text" autocomplete="off" maxlength="40" placeholder="' + L("напр.: 12", "e.g.: 12") + '"><select class="ph__unit" id="resUu">' + selOpts({ units: UN.volt }, 0) + '</select></div></div></div><div class="ph__vars" id="resRows">' + rowsHtml(3) + '</div><div class="ph__fnActions"><button type="button" class="ph__mini" id="resAdd">' + L("+ Додати резистор", "+ Add a resistor") + '</button><button type="button" class="ph__mini" id="resDel">' + L("− Прибрати", "− Remove") + '</button></div><div class="ph__hint ph__mt12">' + L("Достатньо двох резисторів; порожні рядки ігноруються. Якщо вказати напругу, калькулятор покаже струми, напруги й потужності на кожному резисторі.", "Two resistors are enough; empty rows are ignored. If you enter the voltage, the calculator shows the current, voltage and power on each resistor.") + "</div>";
      let n = 3;
      const wire = () => { for (let i = 0; i < n; i++) { el("res_" + i).addEventListener("input", maybeCalc); el("resu_" + i).addEventListener("change", maybeCalc); } };
      const rebuild = (nn) => { const keep = Array.from({ length: n }, (_, i) => [el("res_" + i).value, el("resu_" + i).value]); n = nn; el("resRows").innerHTML = rowsHtml(n, keep); wire(); el("resAdd").disabled = n >= 8; el("resDel").disabled = n <= 2; maybeCalc(); };
      el("resAdd").addEventListener("click", () => { if (n < 8) rebuild(n + 1); });
      el("resDel").addEventListener("click", () => { if (n > 2) rebuild(n - 1); });
      ["resMode", "resUu"].forEach((id) => el(id).addEventListener("change", maybeCalc)); el("resUv").addEventListener("input", maybeCalc);
      wire(); body._resN = () => n; body._resRebuild = rebuild;
    },
    calc(h) {
      const { el, L, parseNum, vstr, ND, VR, vnum, decNum } = h, x = h.X, nd = ND(), body = el("phBody"), n = body._resN();
      const Rv = [], errs = [];
      for (let i = 0; i < n; i++) {
        const inp = el("res_" + i), r = parseNum(inp.value);
        if (r.empty) continue;
        if (r.err) { errs.push("R" + "₁₂₃₄₅₆₇₈"[i] + ": «" + inp.value.slice(0, 12) + "»"); continue; }
        const f = UN.ohm[Number(el("resu_" + i).value) || 0].f, val = h.qmul(r.v, f);
        if (val.n <= 0n) { errs.push("R" + "₁₂₃₄₅₆₇₈"[i] + ": " + L("опір має бути додатним", "the resistance must be positive")); continue; }
        Rv.push({ i, v: VR(val), raw: r.v, un: UN.ohm[Number(el("resu_" + i).value) || 0] });
      }
      if (errs.length) return { ok: false, msg: errs.join("; ") };
      if (Rv.length < 2) return { ok: false, incomplete: true };
      const ser = el("resMode").value === "s", ur = parseNum(el("resUv").value);
      if (ur.err) return { ok: false, msg: L("Напруга U: введіть число (наприклад, 12).", "Voltage U: enter a number (for example 12).") };
      const Uv = ur.empty ? null : VR(h.qmul(ur.v, UN.volt[Number(el("resUu").value) || 0].f));
      if (Uv && Uv.c.n <= 0n) return { ok: false, msg: L("Напруга має бути додатною.", "The voltage must be positive.") };
      const S = (v) => vstr(v, null, nd, true), nm = (r) => "R" + "₁₂₃₄₅₆₇₈"[r.i];
      const steps = [];
      steps.push({ t: L("Дані", "The data"), l: Rv.map((r) => nm(r) + " = " + decNum(r.raw, 8) + " " + L(r.un.uk, r.un.en) + (r.un.f.n === r.un.f.d ? "" : " = " + S(r.v) + " " + L("Ом", "Ω"))).concat(Uv ? ["U = " + S(Uv) + " " + L("В", "V")] : []) });
      let Req;
      if (ser) {
        Req = Rv.reduce((s, r) => (s ? x.add(s, r.v) : r.v), null);
        steps.push({ t: L("Послідовне з'єднання", "Series connection"), l: ["R = R₁ + R₂ + …", "R = " + Rv.map((r) => S(r.v)).join(" + ") + " = " + S(Req) + " " + L("Ом", "Ω")], note: L("Опори складаються; струм однаковий в усіх резисторах, а напруга ділиться пропорційно опорам.", "The resistances add up; the current is the same in all resistors, and the voltage divides in proportion to the resistances.") });
      } else {
        const inv = Rv.reduce((s, r) => { const t = x.div(x.k(1), r.v); return s ? x.add(s, t) : t; }, null);
        Req = x.div(x.k(1), inv);
        steps.push({ t: L("Паралельне з'єднання", "Parallel connection"), l: ["1/R = 1/R₁ + 1/R₂ + …", "1/R = " + Rv.map((r) => "1/" + S(r.v)).join(" + ") + " = " + S(inv), "R = 1 / " + S(inv) + " = " + S(Req) + " " + L("Ом", "Ω")], note: L("Провідності складаються; напруга однакова на всіх резисторах, а струм ділиться. Загальний опір менший за найменший із резисторів.", "The conductances add up; the voltage is the same across all resistors, and the current divides. The total resistance is less than the smallest resistor.") });
      }
      const tiles = [];
      if (Uv) {
        if (ser) {
          const I = x.div(Uv, Req), l = ["I = U / R = " + S(Uv) + " / " + S(Req) + " = " + S(I) + " " + L("А", "A")];
          Rv.forEach((r) => l.push(nm(r) + ": U = I · R = " + S(I) + " · " + S(r.v) + " = " + S(x.mul(I, r.v)) + " " + L("В", "V") + ",  P = I² · R = " + S(x.mul(x.sq(I), r.v)) + " " + L("Вт", "W")));
          steps.push({ t: L("Струм і напруги", "Current and voltages"), l });
          tiles.push({ k: L("Загальний струм I", "Total current I"), v: S(I) + " " + L("А", "A") }, { k: L("Потужність P", "Total power P"), v: S(x.mul(Uv, I)) + " " + L("Вт", "W") });
        } else {
          const Is = Rv.map((r) => x.div(Uv, r.v)), It = Is.reduce((s, v) => x.add(s, v)), l = [];
          Rv.forEach((r, k) => l.push(nm(r) + ": I = U / R = " + S(Uv) + " / " + S(r.v) + " = " + S(Is[k]) + " " + L("А", "A") + ",  P = U · I = " + S(x.mul(Uv, Is[k])) + " " + L("Вт", "W")));
          l.push("I = " + Is.map(S).join(" + ") + " = " + S(It) + " " + L("А", "A"));
          steps.push({ t: L("Струми й потужності", "Currents and powers"), l });
          tiles.push({ k: L("Загальний струм I", "Total current I"), v: S(It) + " " + L("А", "A") }, { k: L("Потужність P", "Total power P"), v: S(x.mul(Uv, It)) + " " + L("Вт", "W") });
        }
      }
      return { ok: true, expr: ser ? L("Послідовне з'єднання", "Series connection") : L("Паралельне з'єднання", "Parallel connection"), head: ["R", S(Req) + " " + L("Ом", "Ω")], headSub: (() => { const rn = vnum(Req); return Number(rn.n) / Number(rn.d) >= 1000 ? decNum(h.qdiv(rn, h.R(1000)), nd) + " " + L("кОм", "kΩ") : null; })(), tiles, steps, resText: "R = " + S(Req) + " " + L("Ом", "Ω") };
    },
    reset(h) { const b = h.el("phBody"); if (b._resRebuild) { b._resRebuild(3); } ["resUv"].forEach((id) => (h.el(id).value = "")); for (let i = 0; i < b._resN(); i++) { h.el("res_" + i).value = ""; } },
    fill(h) { const b = h.el("phBody"); b._resRebuild(3); h.el("resMode").value = "p"; ["10", "20", "30"].forEach((v, i) => { h.el("res_" + i).value = v; h.el("resu_" + i).value = "0"; }); h.el("resUv").value = "12"; },
    share(p, h) { const b = h.el("phBody"), n = b._resN(); p.set("rn", n); p.set("rm", h.el("resMode").value); for (let i = 0; i < n; i++) { if (h.el("res_" + i).value.trim()) { p.set("r" + i, h.el("res_" + i).value.trim()); p.set("ru" + i, h.el("resu_" + i).value); } } if (h.el("resUv").value.trim()) { p.set("ruv", h.el("resUv").value.trim()); p.set("ruu", h.el("resUu").value); } },
    apply(qs, h) { const b = h.el("phBody"), n = Math.min(8, Math.max(2, Number(qs.get("rn")) || 3)); b._resRebuild(n); if (qs.get("rm") === "p") h.el("resMode").value = "p"; for (let i = 0; i < n; i++) { if (qs.has("r" + i)) { h.el("res_" + i).value = qs.get("r" + i).slice(0, 40); const u = Number(qs.get("ru" + i)); if (u >= 0 && u < UN.ohm.length) h.el("resu_" + i).value = String(u); } } if (qs.has("ruv")) { h.el("resUv").value = qs.get("ruv").slice(0, 40); const u = Number(qs.get("ruu")); if (u >= 0 && u < UN.volt.length) h.el("resUu").value = String(u); } }
  };
  return { modes: [ohm, res, cost, joule] };
});
