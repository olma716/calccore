/* chr-century.js — дані калькулятора «Століття й римські цифри»: рік → століття, століття → роки, римські цифри, проміжок між роками, ери */
PhysCalc.start(({ L }) => {
  const C = window.Chr;
  const IS_EN = L(false, true);
  const grp = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const ERA = '<option value="0">' + L("н. е.", "AD") + '</option><option value="1">' + L("до н. е.", "BC") + "</option>";
  const era = (bc) => (bc ? L(" до н. е.", " BC") : "");
  const yearTxt = (y, bc) => y + era(bc);
  const natOf = (s, max) => { const t = String(s).trim(); return /^\d{1,5}$/.test(t) && Number(t) >= 1 && Number(t) <= (max || 99999) ? Number(t) : null; };
  const inp = (id, ph, ml) => '<input class="ph__input" id="' + id + '" type="text" inputmode="text" autocomplete="off" maxlength="' + (ml || 7) + '" placeholder="' + ph + '" aria-label="' + id + '">';
  const sel = (id, opts) => '<select class="ph__unit ph__unit--wide" id="' + id + '">' + opts + "</select>";
  const lab = (id, t) => '<label class="ph__label" for="' + id + '">' + t + "</label>";
  const ORD = (n) => { const t = n % 100, s = t >= 11 && t <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" })[n % 10] || "th"; return IS_EN ? n + s : C.toRoman(n); };
  const place = (y, bc) => { let r = ((y - 1) % 100) + 1; if (bc) r = 101 - r; return r <= 33 ? L("перша третина століття", "first third of the century") : r <= 66 ? L("друга третина століття", "second third of the century") : L("остання третина століття", "last third of the century"); };
  const secName = (bc) => (bc ? L("до н. е.", "BC") : L("н. е.", "AD"));

  // ----- рік → століття -----
  const yc = {
    key: "year", type: "custom", nameUk: "Рік → століття", nameEn: "Year → century",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars"><div class="ph__var">' + lab("ycY", L("Рік", "Year")) + inp("ycY", "1991", 5) + '</div><div class="ph__var">' + lab("ycE", L("Ера", "Era")) + sel("ycE", ERA) + '</div></div><div class="ph__chips ph__mt12" id="ycChips"><button type="button" class="ph__mini" data-y="1991" data-e="0">1991</button><button type="button" class="ph__mini" data-y="2000" data-e="0">2000</button><button type="button" class="ph__mini" data-y="988" data-e="0">988</button><button type="button" class="ph__mini" data-y="44" data-e="1">44 ' + L("до н. е.", "BC") + '</button></div><div class="ph__hint ph__mt12">' + L("Століття починається з року 1 і закінчується роком 100: 2000 р. — ще XX століття, а XXI починається з 2001 р. Нульового року немає: після 1 до н. е. одразу йде 1 н. е.", "A century starts with year 1 and ends with year 100: 2000 is still the 20th century and the 21st starts in 2001. There is no year zero: 1 BC is followed directly by AD 1.") + "</div>";
      el("ycY").addEventListener("input", maybeCalc); el("ycE").addEventListener("change", maybeCalc);
      el("ycChips").addEventListener("click", (e) => { const b = e.target.closest("button[data-y]"); if (!b) return; el("ycY").value = b.dataset.y; el("ycE").value = b.dataset.e; h.calc(true); });
    },
    calc(h) {
      const { el, esc } = h, s = el("ycY").value.trim();
      if (!s) return { ok: false, incomplete: true };
      const y = natOf(s, 99999), bc = el("ycE").value === "1";
      if (y === null || (bc && y > 99999)) return { ok: false, msg: L("Введіть рік — натуральне число до 99 999.", "Enter a year — a natural number up to 99,999.") };
      const c = C.century(y), m = C.millennium(y), from = (c - 1) * 100 + 1, to = c * 100, dec = Math.floor((y - 1) / 10) * 10 + 1;
      const ay = C.toAstro(y, bc);
      // ери: від створення світу (візант.), від заснування Риму, юліанський період
      const eraRows = [];
      if (!bc || y <= 4712) {
        const jp = ay + 4713;
        const aucv = bc ? 754 - y : y + 753;
        const byzJanAug = ay + 5508, byzSepDec = ay + 5509;
        if (byzJanAug > 0) eraRows.push([L("Від створення світу (візантійська ера)", "Anno Mundi (Byzantine era)"), byzJanAug === byzSepDec ? String(byzJanAug) : byzJanAug + " (" + L("січ.–серп.", "Jan–Aug") + ") / " + byzSepDec + " (" + L("вер.–груд.", "Sep–Dec") + ")"]);
        if (aucv > 0) eraRows.push([L("Від заснування Рима (ab urbe condita)", "Ab urbe condita (from the founding of Rome)"), "AUC " + aucv]);
        if (jp > 0) eraRows.push([L("Юліанський період", "Julian period"), String(jp)]);
      }
      const tbl = (rows) => PhysUI.list([], rows, { kv: true });
      const rows = [[L("Століття", "Century"), C.toRoman(c) + " (" + c + ")" + era(bc)], [L("Роки століття", "Years of the century"), bc ? to + " – " + from + era(true) : from + " – " + to], [L("Тисячоліття", "Millennium"), C.toRoman(m) + " (" + m + ")" + era(bc)], [L("Десятиліття (роки)", "Decade (years)"), bc ? dec + 9 + " – " + dec + era(true) : dec + " – " + (dec + 9)], [L("Рік як римське число", "The year in Roman numerals"), y <= 3999 ? C.toRoman(y) : "—"]];
      const steps = [{ t: L("Формула століття", "Century formula"), l: [L("століття = ⌈рік / 100⌉ = ⌈", "century = ⌈year / 100⌉ = ⌈") + y + " / 100⌉ = " + c], note: L("Округлення вгору, бо перше століття — це роки 1–100, а не 0–99.", "Rounding up, because the first century is years 1–100, not 0–99.") }, { t: L("Тисячоліття", "Millennium"), l: [L("⌈", "⌈") + y + " / 1000⌉ = " + m] }, { t: L("Ери", "Eras"), l: eraRows.length ? eraRows.map((r) => r[0] + ": " + r[1]) : [L("Для цього року ери не рахуються.", "Eras are not computed for this year.")], note: L("Візантійський рік змінюється 1 вересня: з січня по серпень — +5508, з вересня по грудень — +5509.", "The Byzantine year changes on 1 September: January–August is +5508, September–December is +5509.") }];
      return { ok: true, expr: yearTxt(y, bc), head: [L("століття", "century"), C.toRoman(c) + era(bc)], headSub: ORD(c) + L(" століття, ", " century, ") + L("тисячоліття ", "millennium ") + C.toRoman(m) + " · " + place(y, bc), subRaw: true, tiles: [{ k: L("Століття", "Century"), v: C.toRoman(c) + " (" + c + ")" }, { k: L("Тисячоліття", "Millennium"), v: C.toRoman(m) }, { k: L("Роки століття", "Years of the century"), v: bc ? to + "–" + from + " " + secName(true) : from + "–" + to }], extraHtml: tbl(rows.concat(eraRows)), steps, resText: yearTxt(y, bc) + " — " + C.toRoman(c) + L(" століття", " century") + era(bc) };
    },
    reset(h) { h.el("ycY").value = ""; h.el("ycE").value = "0"; },
    fill(h) { h.el("ycY").value = "1991"; h.el("ycE").value = "0"; },
    share(p, h) { if (h.el("ycY").value.trim()) { p.set("y", h.el("ycY").value.trim()); p.set("e", h.el("ycE").value); } },
    apply(qs, h) { if (qs.has("y")) h.el("ycY").value = qs.get("y").slice(0, 5); if (qs.has("e") && ["0", "1"].includes(qs.get("e"))) h.el("ycE").value = qs.get("e"); }
  };

  // ----- століття → роки -----
  const cy = {
    key: "cent", type: "custom", nameUk: "Століття → роки", nameEn: "Century → years",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars"><div class="ph__var">' + lab("cyC", L("Століття (13 або XIII)", "Century (13 or XIII)")) + inp("cyC", "XXI", 10) + '</div><div class="ph__var">' + lab("cyE", L("Ера", "Era")) + sel("cyE", ERA) + '</div></div><div class="ph__hint ph__mt12">' + L("Можна вводити арабською (21) або римськими цифрами (XXI), у т. ч. кириличними Х, І.", "You can enter an Arabic (21) or Roman (XXI) number.") + "</div>";
      el("cyC").addEventListener("input", maybeCalc); el("cyE").addEventListener("change", maybeCalc);
    },
    calc(h) {
      const { el, esc } = h, s = el("cyC").value.trim();
      if (!s) return { ok: false, incomplete: true };
      const c = /^\d+$/.test(s) ? Number(s) : C.fromRoman(s);
      if (!c || c < 1 || c > 999) return { ok: false, msg: L("Введіть номер століття від 1 до 999 (арабськими або римськими цифрами).", "Enter a century number from 1 to 999 (Arabic or Roman numerals).") };
      const bc = el("cyE").value === "1", from = (c - 1) * 100 + 1, to = c * 100, m = C.millennium(from);
      const range = bc ? to + " – " + from + era(true) : from + " – " + to;
      const steps = [{ t: L("Перше й останнє роки століття", "First and last year of the century"), l: [L("перший рік = (" + c + " − 1) × 100 + 1 = ", "first year = (" + c + " − 1) × 100 + 1 = ") + from, L("останній рік = ", "last year = ") + c + " × 100 = " + to], note: bc ? L("До н. е. роки лічать у зворотному напрямку: століття починається більшим числом (" + to + ") і закінчується меншим (" + from + ").", "BC years are counted backwards: the century starts with the larger number (" + to + ") and ends with the smaller (" + from + ").") : L("Століття охоплює рівно 100 років.", "A century covers exactly 100 years.") }];
      return { ok: true, expr: C.toRoman(c) + era(bc), head: [L("роки", "years"), range], headSub: C.toRoman(c) + " (" + c + ")" + L(" століття", " century") + era(bc) + " · " + L("тисячоліття ", "millennium ") + C.toRoman(m) + era(bc), subRaw: true, tiles: [{ k: L("Початок", "Start"), v: yearTxt(bc ? to : from, bc) }, { k: L("Кінець", "End"), v: yearTxt(bc ? from : to, bc) }, { k: L("Середина", "Middle"), v: yearTxt(bc ? to - 50 : from + 49, bc) }, { k: L("Тисячоліття", "Millennium"), v: C.toRoman(m) }], steps, resText: C.toRoman(c) + L(" століття", " century") + era(bc) + ": " + range };
    },
    reset(h) { h.el("cyC").value = ""; h.el("cyE").value = "0"; },
    fill(h) { h.el("cyC").value = "XXI"; h.el("cyE").value = "0"; },
    share(p, h) { if (h.el("cyC").value.trim()) { p.set("c", h.el("cyC").value.trim()); p.set("e", h.el("cyE").value); } },
    apply(qs, h) { if (qs.has("c")) h.el("cyC").value = qs.get("c").slice(0, 10); if (qs.has("e") && ["0", "1"].includes(qs.get("e"))) h.el("cyE").value = qs.get("e"); }
  };

  // ----- римські цифри -----
  const rn = {
    key: "roman", type: "custom", nameUk: "Римські цифри", nameEn: "Roman numerals",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars"><div class="ph__var ph__var--full">' + lab("rnV", L("Число (арабське 1–3999 або римське)", "Number (Arabic 1–3999 or Roman)")) + inp("rnV", "MCMXCIV", 12) + '</div></div><div class="ph__chips ph__mt12" id="rnChips">' + ["4", "9", "14", "49", "1994", "2026", "MMXXIV"].map((v) => '<button type="button" class="ph__mini" data-v="' + v + '">' + v + "</button>").join("") + '</div><div class="ph__hint ph__mt12">' + L("Розпізнається автоматично: цифри — перетворюються в римські, літери I, V, X, L, C, D, M (латиницею чи схожою кирилицею) — в арабські.", "Detected automatically: digits are converted to Roman, the letters I, V, X, L, C, D, M to Arabic.") + "</div>";
      el("rnV").addEventListener("input", maybeCalc);
      el("rnV").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); h.calc(true); } });
      el("rnChips").addEventListener("click", (e) => { const b = e.target.closest("button[data-v]"); if (!b) return; el("rnV").value = b.dataset.v; h.calc(true); });
    },
    calc(h) {
      const { el, esc } = h, s = el("rnV").value.trim();
      if (!s) return { ok: false, incomplete: true };
      let n, roman, fromRoman = false;
      if (/^\d+$/.test(s)) { n = Number(s); if (n < 1 || n > 3999) return { ok: false, msg: L("Римськими цифрами записують числа від 1 до 3999.", "Roman numerals cover the numbers 1 to 3999.") }; roman = C.toRoman(n); }
      else { n = C.fromRoman(s); fromRoman = true; if (n === null) return { ok: false, msg: L("Це не правильне римське число. Допустимі I, V, X, L, C, D, M; повтор — не більше трьох разів поспіль (IIII — неправильно, IV — правильно).", "That is not a valid Roman numeral. Allowed: I, V, X, L, C, D, M; no more than three repeats in a row (IIII is wrong, IV is right).") }; roman = C.toRoman(n); }
      const parts = []; let rest = n; const R = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
      R.forEach(([v, r]) => { while (rest >= v) { parts.push([r, v]); rest -= v; } });
      const steps = [{ t: L("Розкладаємо число на римські знаки", "Splitting the number into Roman symbols"), l: [n + " = " + parts.map((p) => p[1]).join(" + "), roman + " = " + parts.map((p) => p[0]).join(" + ")], note: L("Менший знак перед більшим віднімається (IV = 5 − 1), після нього — додається (VI = 5 + 1).", "A smaller symbol before a larger one is subtracted (IV = 5 − 1), after it — added (VI = 5 + 1).") }];
      const tab = '<details class="ph__det"><summary>' + L("Таблиця римських знаків", "Table of Roman symbols") + "</summary>" + PhysUI.list([], [["I", "1"], ["V", "5"], ["X", "10"], ["L", "50"], ["C", "100"], ["D", "500"], ["M", "1000"]], { kv: true }) + "</details>";
      return { ok: true, expr: s, head: fromRoman ? [L("арабське число", "Arabic number"), String(n)] : [L("римськими", "in Roman numerals"), roman], headSub: fromRoman ? roman + " = " + n : n + " = " + roman, subRaw: true, tiles: [{ k: L("Арабське", "Arabic"), v: String(n) }, { k: L("Римське", "Roman"), v: roman }, { k: L("Знаків", "Symbols"), v: String(roman.length) }, { k: L("Як номер століття", "As a century number"), v: n <= 99 ? C.toRoman(n) + L(" століття", " century") : "—" }], extraHtml: tab, steps, resText: n + " = " + roman };
    },
    reset(h) { h.el("rnV").value = ""; },
    fill(h) { h.el("rnV").value = "1994"; },
    share(p, h) { if (h.el("rnV").value.trim()) p.set("v", h.el("rnV").value.trim()); },
    apply(qs, h) { if (qs.has("v")) h.el("rnV").value = qs.get("v").slice(0, 12); }
  };

  // ----- проміжок між роками -----
  const sp = {
    key: "span", type: "custom", nameUk: "Проміжок між роками", nameEn: "Span between years",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars"><div class="ph__var">' + lab("spA", L("Перший рік", "First year")) + inp("spA", "44", 5) + '</div><div class="ph__var">' + lab("spAE", L("Ера", "Era")) + sel("spAE", ERA.replace('value="1"', 'value="1" selected')) + '</div><div class="ph__var">' + lab("spB", L("Другий рік", "Second year")) + inp("spB", "2026", 5) + '</div><div class="ph__var">' + lab("spBE", L("Ера", "Era")) + sel("spBE", ERA) + '</div></div><div class="ph__hint ph__mt12">' + L("Нульового року немає, тому від 1 до н. е. до 1 н. е. минув 1 рік, а не 2. Наприклад, від 44 р. до н. е. до 2026 р. н. е. — 2069 років.", "There is no year zero, so from 1 BC to AD 1 is 1 year, not 2. For example, from 44 BC to AD 2026 is 2069 years.") + "</div>";
      ["spA", "spB"].forEach((id) => el(id).addEventListener("input", maybeCalc)); ["spAE", "spBE"].forEach((id) => el(id).addEventListener("change", maybeCalc));
    },
    calc(h) {
      const { el, esc } = h, sa = el("spA").value.trim(), sb = el("spB").value.trim();
      if (!sa || !sb) return { ok: false, incomplete: true };
      const a = natOf(sa, 99999), b = natOf(sb, 99999);
      if (a === null || b === null) return { ok: false, msg: L("Роки — натуральні числа до 99 999.", "The years are natural numbers up to 99,999.") };
      const abc = el("spAE").value === "1", bbc = el("spBE").value === "1", aa = C.toAstro(a, abc), ab = C.toAstro(b, bbc);
      const n = C.spanYears(a, abc, b, bbc), centuries = Math.floor(n / 100), mill = Math.floor(n / 1000), rem = n % 100;
      const early = aa <= ab ? [a, abc] : [b, bbc], late = aa <= ab ? [b, bbc] : [a, abc];
      const cEarly = C.century(early[0]), cLate = C.century(late[0]);
      const naive = Math.abs((abc ? -a : a) - (bbc ? -b : b));
      const crosses = (abc !== bbc) ? 1 : 0;
      const steps = [{ t: L("Переходимо до астрономічного числення", "Switching to astronomical year numbering"), l: [yearTxt(a, abc) + " → " + aa, yearTxt(b, bbc) + " → " + ab], note: L("В астрономії рік 1 до н. е. має номер 0, 2 до н. е. — −1 і т. д.; тому відніманням виходить правильний проміжок.", "In astronomy 1 BC is year 0, 2 BC is −1 and so on; so subtraction gives the correct span.") }, { t: L("Віднімаємо", "Subtracting"), l: [Math.abs(ab - aa) + " = " + n], note: crosses ? L("Наївне віднімання зі знаком «мінус» дало б " + naive + " — на " + crosses + " рік менше (немає нульового року).", "Naive subtraction with a minus sign would give " + naive + " — one year less (there is no year zero).") : "" }];
      return { ok: true, expr: yearTxt(a, abc) + " … " + yearTxt(b, bbc), head: [L("проміжок", "span"), grp(n) + " " + L("р.", "yrs")], headSub: L("це ", "that is ") + centuries + L(" ст. ", " cent. ") + rem + L(" р.", " yrs"), subRaw: true, tiles: [{ k: L("Років", "Years"), v: grp(n) }, { k: L("Повних століть", "Full centuries"), v: String(centuries) }, { k: L("Тисячоліть", "Millennia"), v: String(mill) }, { k: L("Століття меж", "Centuries of the ends"), v: C.toRoman(cEarly) + era(early[1]) + " → " + C.toRoman(cLate) + era(late[1]) }], steps, resText: yearTxt(a, abc) + " … " + yearTxt(b, bbc) + ": " + grp(n) + L(" років", " years") };
    },
    reset(h) { h.el("spA").value = ""; h.el("spB").value = ""; h.el("spAE").value = "1"; h.el("spBE").value = "0"; },
    fill(h) { h.el("spA").value = "44"; h.el("spAE").value = "1"; h.el("spB").value = "2026"; h.el("spBE").value = "0"; },
    share(p, h) { const { el } = h; if (!el("spA").value.trim() || !el("spB").value.trim()) return; p.set("a", el("spA").value.trim()); p.set("ae", el("spAE").value); p.set("b", el("spB").value.trim()); p.set("be", el("spBE").value); },
    apply(qs, h) { const { el } = h; if (qs.has("a")) el("spA").value = qs.get("a").slice(0, 5); if (qs.has("b")) el("spB").value = qs.get("b").slice(0, 5); if (qs.has("ae") && ["0", "1"].includes(qs.get("ae"))) el("spAE").value = qs.get("ae"); if (qs.has("be") && ["0", "1"].includes(qs.get("be"))) el("spBE").value = qs.get("be"); }
  };
  return { modes: [yc, cy, rn, sp] };
});
