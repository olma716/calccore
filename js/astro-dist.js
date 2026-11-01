/* astro-dist.js — дані калькулятора «Відстані й одиниці в астрономії»: конвертер одиниць, паралакс, час проходження світла, кутовий розмір */
PhysCalc.start(({ L, u, X, UN }) => {
  const A = window.Astro, C = A.C;
  const F = (out, ins, txt, f, o) => ({ out, ins: ins ? ins.split(",") : [], txt, f, ...(o || {}) });
  const V = (id, sym, uk, en, si, units, ph, sign, def) => ({ id, sym, uk, en, si, units, ph, sign: sign || "pos", def });
  const LYpc = C.LY + "/" + C.PC, AUpc = C.AU + "/" + C.PC;
  // одиниці довжини в метрах (для конвертера і полів)
  const LEN = [["m", "м", "m", "1"], ["km", "км", "km", "1000"], ["au", "а.о.", "AU", C.AU], ["ls", "світлових секунд", "light-seconds", C.c], ["lmin", "світлових хвилин", "light-minutes", String(299792458 * 60)], ["lh", "світлових годин", "light-hours", String(299792458 * 3600)], ["ly", "світлових років", "light-years", C.LY], ["pc", "парсеків", "parsecs", C.PC], ["kpc", "кілопарсеків", "kiloparsecs", C.PC + "000"], ["Mpc", "мегапарсеків", "megaparsecs", C.PC + "000000"]];
  const UL = (ids) => LEN.filter((l) => ids.includes(l[0])).map((l) => u(l[1], l[2], l[3]));
  const U = {
    d: UL(["m", "km", "au", "ly", "pc"]),
    par: [u("″ (кутових секунд)", "″ (arcseconds)", 1), u("мс дуги (mas)", "mas", "0.001"), u("мкс дуги (µas)", "µas", "0.000001")],
    dpc: [u("парсеків", "parsecs", 1), u("світлових років", "light-years", LYpc), u("а.о.", "AU", AUpc), u("кілопарсеків", "kiloparsecs", 1000)],
    tm: [u("с", "s", 1), u("хв", "min", 60), u("год", "h", 3600), u("діб", "days", 86400), u("років", "years", C.year)],
    v: [u("м/с", "m/s", 1), u("км/с", "km/s", 1000), u("км/год", "km/h", "5/18"), u("c (швидкість світла)", "c (speed of light)", C.c)],
    ang: [u("рад", "rad", 1), u("°", "°", "0.0174532925199433"), u("′", "′", "0.000290888208665722"), u("″", "″", C.ARCSEC), u("мс дуги", "mas", "4.84813681109536e-9")],
    size: UL(["m", "km", "au"])
  };

  // ----- конвертер відстаней -----
  const conv = {
    key: "conv", type: "custom", nameUk: "Конвертер відстаней", nameEn: "Distance converter",
    build(body, x, h) {
      const { el, esc, maybeCalc } = h;
      const opts = (sel) => LEN.map((l, i) => '<option value="' + i + '"' + (i === sel ? " selected" : "") + ">" + esc(L(l[1], l[2])) + "</option>").join("");
      body.innerHTML = '<div class="ph__vars"><div class="ph__var"><label class="ph__label" for="dcV">' + L("Відстань", "Distance") + '</label><input class="ph__input" id="dcV" type="text" inputmode="text" autocomplete="off" maxlength="30" placeholder="' + L("напр.: 4,2465", "e.g.: 4.2465") + '"></div><div class="ph__var"><label class="ph__label" for="dcFrom">' + L("Одиниця", "Unit") + '</label><select class="ph__unit ph__unit--wide" id="dcFrom">' + opts(6) + '</select></div><div class="ph__var ph__var--full"><label class="ph__label" for="dcTo">' + L("Перевести в", "Convert to") + '</label><select class="ph__unit ph__unit--wide" id="dcTo">' + opts(7) + '</select></div></div><div class="ph__fnActions" id="dcChips">' +
        CH.map((c, i) => '<button type="button" class="ph__mini" data-i="' + i + '">' + esc(L(c[0], c[1])) + "</button>").join("") + '</div><div class="ph__hint ph__mt12">' + L("Усі переведення точні за визначеннями: 1 а.о. = 149 597 870 700 м, 1 світловий рік = 9 460 730 472 580 800 м, 1 парсек = 648000/π а.о. ≈ 3,0857·10¹⁶ м.", "All conversions are exact by definition: 1 AU = 149,597,870,700 m, 1 light-year = 9,460,730,472,580,800 m, 1 parsec = 648000/π AU ≈ 3.0857·10¹⁶ m.") + "</div>";
      el("dcChips").addEventListener("click", (e) => { const b = e.target.closest("button[data-i]"); if (!b) return; const c = CH[Number(b.dataset.i)]; el("dcV").value = c[2]; el("dcFrom").value = String(c[3]); el("dcTo").value = String(c[4]); h.calc(true); });
      ["dcFrom", "dcTo"].forEach((id) => el(id).addEventListener("change", maybeCalc));
      el("dcV").addEventListener("input", maybeCalc);
      el("dcV").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); h.calc(true); } });
    },
    calc(h) {
      const { el, parseNum, ND, decNum, esc, qmul, qdiv, qz } = h, nd = ND();
      const r = parseNum(el("dcV").value);
      if (r.empty) return { ok: false, incomplete: true };
      if (r.err || r.v.n < 0n) return { ok: false, msg: L("Введіть невід'ємне число (наприклад, 4,2465).", "Enter a non-negative number (for example 4.2465).") };
      const fi = Number(el("dcFrom").value) || 0, ti = Number(el("dcTo").value) || 0, f = A.dec(LEN[fi][3]), t = A.dec(LEN[ti][3]);
      const meters = qmul(r.v, f), out = qdiv(meters, t), N = (v) => decNum(v, nd);
      const nmL = (i) => L(LEN[i][1], LEN[i][2]);
      const steps = [{ t: L("Переводимо в метри", "Converting to metres"), l: [N(r.v) + " " + nmL(fi) + " = " + N(r.v) + " · " + N(f) + " " + L("м", "m") + " = " + N(meters) + " " + L("м", "m")], note: L("Усі одиниці виражаємо через метр.", "All units are expressed through the metre.") }, { t: L("Переводимо в потрібну одиницю", "Converting to the target unit"), l: [N(meters) + " " + L("м", "m") + " / " + N(t) + " = " + N(out) + " " + nmL(ti)] }];
      const trs = LEN.map((l, i) => "<tr" + (i === ti ? ' class="ph__total"' : "") + "><th>" + esc(nmL(i)) + "</th><td>" + esc(N(qdiv(meters, A.dec(l[3])))) + "</td></tr>").join("");
      const table = '<div class="ph__sub">' + L("Та сама відстань в усіх одиницях", "The same distance in all units") + '</div><div class="ph__tblWrap"><table class="ph__tbl"><thead><tr><th>' + L("Одиниця", "Unit") + "</th><th>" + L("Значення", "Value") + "</th></tr></thead><tbody>" + trs + "</tbody></table></div>";
      const sec = qz(meters) ? null : qdiv(meters, A.dec(C.c)), ts = sec ? Number(sec.n) / Number(sec.d) : 0, tu = ts < 120 ? [1, L("с", "s")] : ts < 7200 ? [60, L("хв", "min")] : ts < 172800 ? [3600, L("год", "h")] : ts < 63115200 ? [86400, L("діб", "days")] : [31557600, L("років", "years")];
      return { ok: true, expr: L("Конвертер відстаней", "Distance converter"), head: [L("відстань", "distance"), N(out) + " " + nmL(ti)], headSub: sec ? L("світло йде ", "light takes ") + N(qdiv(sec, A.dec(String(tu[0])))) + " " + tu[1] : null, subRaw: true, tiles: [{ k: L("У метрах", "In metres"), v: N(meters) + " " + L("м", "m") }, { k: L("У а.о.", "In AU"), v: N(qdiv(meters, A.dec(C.AU))) }, { k: L("У світлових роках", "In light-years"), v: N(qdiv(meters, A.dec(C.LY))) }], extraHtml: table, steps, resText: N(r.v) + " " + nmL(fi) + " = " + N(out) + " " + nmL(ti) };
    },
    reset(h) { h.el("dcV").value = ""; h.el("dcFrom").value = "6"; h.el("dcTo").value = "7"; },
    fill(h) { h.el("dcV").value = "4.2465"; h.el("dcFrom").value = "6"; h.el("dcTo").value = "7"; },
    share(p, h) { if (h.el("dcV").value.trim()) { p.set("dv", h.el("dcV").value.trim()); p.set("df", h.el("dcFrom").value); p.set("dt", h.el("dcTo").value); } },
    apply(qs, h) { if (qs.has("dv")) { h.el("dcV").value = qs.get("dv").slice(0, 30); const a = Number(qs.get("df")), b = Number(qs.get("dt")); if (a >= 0 && a < LEN.length) h.el("dcFrom").value = String(a); if (b >= 0 && b < LEN.length) h.el("dcTo").value = String(b); } }
  };
  const CH = [["Місяць", "Moon", "384400", 1, 3], ["Сонце", "Sun", "1", 2, 4], ["Проксима Центавра", "Proxima Centauri", "4.2465", 6, 7], ["Андромеда", "Andromeda", "0.78", 9, 6], ["Центр Галактики", "Galactic centre", "8.2", 8, 6]];

  // ----- паралакс -----
  const par = {
    key: "par", type: "chain", nameUk: "Паралакс і відстань", nameEn: "Parallax and distance", find: "d",
    vars: [V("p", "p", "Річний паралакс", "Annual parallax", ["″", "″"], U.par, "напр.: 0,7681"), V("d", "d", "Відстань до зорі", "Distance to the star", ["парсеків", "parsecs"], U.dpc, "")],
    formulas: [F("d", "p", "d = 1 / p", (a) => X.div(X.k(1), a.p), { note: ["Відстань у парсеках дорівнює 1, поділеній на паралакс у кутових секундах: парсек — це відстань, з якої радіус земної орбіти видно під кутом 1″.", "The distance in parsecs equals 1 divided by the parallax in arcseconds: a parsec is the distance from which the radius of the Earth's orbit is seen at an angle of 1″."] }), F("p", "d", "p = 1 / d", (a) => X.div(X.k(1), a.d))],
    chips: [{ uk: "Проксима Центавра (768 мс)", en: "Proxima Centauri (768 mas)", find: "d", vals: { p: "768.07|1" } }, { uk: "Сіріус (379 мс)", en: "Sirius (379 mas)", find: "d", vals: { p: "379.21|1" } }, { uk: "Бетельгейзе (6,6 мс)", en: "Betelgeuse (6.6 mas)", find: "d", vals: { p: "6.55|1" } }],
    hint: ["Паралакс — кутове зміщення зорі при русі Землі по орбіті. Чим далі зоря, тим менший кут. Значення Gaia (мілісекунди дуги) вводьте в «мс дуги». Відстань можна показати в парсеках, світлових роках, а.о.", "Parallax is the angular shift of a star as the Earth moves along its orbit. The farther the star, the smaller the angle. Enter Gaia values (milliarcseconds) in “mas”. The distance can be shown in parsecs, light-years or AU."],
    example: { find: "d", vals: { p: "768.07|1" } }
  };

  // ----- час проходження світла -----
  const light = {
    key: "light", type: "chain", nameUk: "Час проходження світла й польоту", nameEn: "Light-travel and flight time", find: "t",
    vars: [V("d", "d", "Відстань", "Distance", ["м", "m"], U.d, "напр.: 1"), V("v", "v", "Швидкість", "Speed", ["м/с", "m/s"], U.v, "", "pos", "299792458"), V("t", "t", "Час", "Time", ["с", "s"], U.tm, "")],
    formulas: [F("t", "d,v", "t = d / v", (a) => X.div(a.d, a.v), { note: ["За замовчуванням швидкість дорівнює швидкості світла c = 299 792 458 м/с (точне значення за визначенням метра). Її можна замінити швидкістю зонда чи ракети.", "By default the speed equals the speed of light c = 299,792,458 m/s (exact by the definition of the metre). It can be replaced with the speed of a probe or a rocket."] }), F("d", "v,t", "d = v · t", (a) => X.mul(a.v, a.t)), F("v", "d,t", "v = d / t", (a) => X.div(a.d, a.t))],
    chips: [{ uk: "Сонце → Земля", en: "Sun → Earth", find: "t", vals: { d: "1|2", t: "|1" } }, { uk: "Земля → Місяць", en: "Earth → Moon", find: "t", vals: { d: "384400|1", t: "|0" } }, { uk: "Проксима → Земля", en: "Proxima → Earth", find: "t", vals: { d: "4.2465|3", t: "|4" } }, { uk: "Вояджер-1 до Проксими", en: "Voyager 1 to Proxima", find: "t", vals: { d: "4.2465|3", v: "17|1", t: "|4" } }],
    hint: ["Світло за секунду проходить майже 300 000 км. Час польоту світла від Сонця до Землі — приблизно 8,3 хвилини. Щоб порахувати політ зонда, замініть швидкість, наприклад 17 км/с для «Вояджера-1».", "Light travels almost 300,000 km in a second. The light-travel time from the Sun to the Earth is about 8.3 minutes. To compute a probe's flight, replace the speed, for example 17 km/s for Voyager 1."],
    example: { find: "t", vals: { d: "1|2", t: "|1" } }
  };

  // ----- кутовий розмір -----
  const ang = {
    key: "ang", type: "chain", nameUk: "Кутовий розмір", nameEn: "Angular size", find: "th",
    vars: [V("D", "D", "Лінійний розмір тіла", "Linear size of the object", ["м", "m"], U.size, "напр.: 3474,8"), V("d", "d", "Відстань до тіла", "Distance to the object", ["м", "m"], U.d, "напр.: 384400"), V("th", "θ", "Кутовий розмір", "Angular size", ["рад", "rad"], U.ang, "")],
    formulas: [F("th", "D,d", "θ = D / d", (a) => X.div(a.D, a.d), { note: ["Для малих кутів кутовий розмір у радіанах дорівнює розміру, поділеному на відстань. 1 рад ≈ 57,3° ≈ 206 265″.", "For small angles the angular size in radians equals the size divided by the distance. 1 rad ≈ 57.3° ≈ 206,265″."] }), F("D", "th,d", "D = θ · d", (a) => X.mul(a.th, a.d)), F("d", "D,th", "d = D / θ", (a) => X.div(a.D, a.th))],
    chips: [{ uk: "Місяць", en: "Moon", find: "th", vals: { D: "3474.8|1", d: "384400|1", th: "|2" } }, { uk: "Сонце", en: "Sun", find: "th", vals: { D: "1391400|1", d: "1|2", th: "|2" } }, { uk: "Юпітер", en: "Jupiter", find: "th", vals: { D: "139820|1", d: "4.2|2", th: "|3" } }],
    hint: ["Формула для малих кутів. Місяць і Сонце мають майже однаковий кутовий розмір — близько 0,5° (30′), тому бувають повні затемнення. Кут можна показати в градусах, мінутах чи секундах дуги.", "The small-angle formula. The Moon and the Sun have almost the same angular size, about 0.5° (30′), which is why total eclipses happen. The angle can be shown in degrees, arcminutes or arcseconds."],
    example: { find: "th", vals: { D: "3474.8|1", d: "384400|1", th: "|2" } }
  };
  return { modes: [conv, par, light, ang] };
});
