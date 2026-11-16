/* lv-calc.js — калькулятор сумісності (розвага): відсоток за іменами й гра FLAMES; залежить від km-data.js і lv-data.js. Це жарт, а не наука: результат лише відображає перемішування літер імен */
PhysCalc.start(({ L }) => {
  const V = window.Lv, IS_EN = L(false, true);
  const S = { a: "", b: "" };
  const FIELDS = { names: ["lnA", "lnB"], flames: ["lfA", "lfB"] };
  const fld = (id, label, inner) => '<div class="ph__var" id="' + id + 'W"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const inp = (id, ph) => '<input class="ph__input" id="' + id + '" type="text" inputmode="text" autocomplete="off" maxlength="40" placeholder="' + ph + '" aria-label="' + id + '">';
  const hint = (t) => '<div class="ph__hint ph__mt12">' + t + "</div>";
  const box = (esc, t, strong) => '<div class="ph__hintbox ph__mt12">' + (strong ? "<b>" + esc(strong) + "</b> " : "") + esc(t) + "</div>";
  const JOKE = L("Це жарт для розваги, а не наука й не прогноз: ім'я не визначає, як складуться стосунки. Результат лише відображає перемішування літер у двох іменах: для тих самих імен він завжди однаковий, а порядок імен не має значення.", "This is a joke for fun, not science or a forecast: a name does not decide how a relationship turns out. The result only reflects a shuffle of the letters in two names: for the same names it is always the same, and the order of the names does not matter.");
  const VERD = [[L("Скоріше дружба", "More like friendship"), L("Іскри небагато, зате є простір для дружби.", "Not much spark, but plenty of room for friendship.")], [L("Є іскра, але треба попрацювати", "A spark, but it needs work"), L("Щось є, та без зусиль нічого не вийде.", "There is something, but nothing happens without effort.")], [L("Непоганий потенціал", "Decent potential"), L("Варто спробувати й подивитись, що буде.", "Worth trying to see what happens.")], [L("Чудова пара", "A great match"), L("Усе може вийти: рахунок на вашому боці.", "Things could work out: the score is on your side.")], [L("Написано на зірках", "Written in the stars"), L("Майже ідеально — принаймні за літерами.", "Almost perfect, at least by the letters.")]];
  const FNAME = { F: [L("Друзі", "Friends"), L("Добра дружба — теж чудова основа.", "A good friendship is a fine foundation too.")], L: [L("Кохання", "Lovers"), L("Іскра є: далі вирішуєте ви.", "There is a spark: the rest is up to you.")], A: [L("Симпатія", "Affection"), L("Приємна взаємна симпатія.", "A pleasant mutual liking.")], M: [L("Шлюб", "Marriage"), L("Гра пророкує довгий союз.", "The game foretells a lasting union.")], E: [L("Вороги", "Enemies"), L("Гра жартома каже: тримайтесь осторонь. Ніхто не зобов'язаний їй вірити.", "The game says, jokingly, keep your distance. Nobody has to believe it.")], S: [L("Брат і сестра", "Siblings"), L("Щось рідне, майже як у родині.", "Something familiar, almost like family.")] };
  const heart = (pct) => '<svg class="lv__heart" viewBox="0 0 120 108" role="img" aria-label="' + pct + '%"><defs><clipPath id="lvC"><path d="M60 100 C20 70 6 48 6 32 C6 16 18 6 32 6 C44 6 54 12 60 22 C66 12 76 6 88 6 C102 6 114 16 114 32 C114 48 100 70 60 100Z"/></clipPath><linearGradient id="lvG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5c8a"/><stop offset="1" stop-color="#c2185b"/></linearGradient></defs>' +
    '<path d="M60 100 C20 70 6 48 6 32 C6 16 18 6 32 6 C44 6 54 12 60 22 C66 12 76 6 88 6 C102 6 114 16 114 32 C114 48 100 70 60 100Z" fill="#fde4ec"/><g clip-path="url(#lvC)"><rect class="lv__fill" x="0" y="' + (106 * (1 - pct / 100)).toFixed(1) + '" width="120" height="' + (106 * pct / 100 + 2).toFixed(1) + '" fill="url(#lvG)"/></g>' +
    '<path d="M60 100 C20 70 6 48 6 32 C6 16 18 6 32 6 C44 6 54 12 60 22 C66 12 76 6 88 6 C102 6 114 16 114 32 C114 48 100 70 60 100Z" fill="none" stroke="#a3124a" stroke-width="2.4" stroke-linejoin="round"/></svg>';
  const upper = (arr) => arr.join(", ");

  // ----- спільні для вкладок: ті самі імена -----
  const readS = (mk, el) => { const [a, b] = FIELDS[mk]; if (el(a)) S.a = el(a).value; if (el(b)) S.b = el(b).value; };
  const paint = (mk, el) => { const [a, b] = FIELDS[mk]; if (el(a)) el(a).value = S.a; if (el(b)) el(b).value = S.b; };
  function wire(mk, h) { FIELDS[mk].forEach((id) => { const e = h.el(id); const f = () => { readS(mk, h.el); h.maybeCalc(); }; e.addEventListener("input", f); e.addEventListener("change", f); }); }
  const share = (mk) => (p, h) => { readS(mk, h.el); if (S.a.trim()) p.set("a", S.a.trim().slice(0, 40)); if (S.b.trim()) p.set("b", S.b.trim().slice(0, 40)); };
  const apply = (mk) => (qs, h) => { if (qs.has("a")) S.a = qs.get("a").slice(0, 40); if (qs.has("b")) S.b = qs.get("b").slice(0, 40); paint(mk, h.el); };
  const body = (mk) => '<div class="ph__vars">' + fld(FIELDS[mk][0], L("Перше ім'я", "First name"), inp(FIELDS[mk][0], L("Катерина", "Sophia"))) + fld(FIELDS[mk][1], L("Друге ім'я", "Second name"), inp(FIELDS[mk][1], L("Олег", "Luke"))) + "</div>";

  // ====================== за іменами ======================
  const names = {
    key: "names", type: "custom", req: () => ["lnA", "lnB"], nameUk: "За іменами", nameEn: "By names",
    build(b, x, h) { b.innerHTML = body("names") + hint(L("Імена можна писати будь-якою мовою, з великої чи малої літери: враховуються лише літери. Порядок імен не впливає на результат.", "Names can be written in any language, in capitals or lowercase: only letters count. The order of the names does not affect the result.")); paint("names", h.el); wire("names", h); },
    calc(h) {
      const { el, esc } = h; readS("names", el); if (!S.a.trim() || !S.b.trim()) return { ok: false, incomplete: true };
      const r = V.percent(S.a, S.b); if (!r) return { ok: false, msg: L("В обох іменах потрібні літери: цифри й знаки не враховуються.", "Both names need letters: digits and symbols do not count.") };
      const lv = V.level(r.pct), cm = V.common(S.a, S.b), v = VERD[lv], A = S.a.trim(), B = S.b.trim();
      const steps = [
        { t: L("Імена", "The names"), l: [r.a + " + " + r.b], note: L("Залишено лише літери в нижньому регістрі.", "Only letters are kept, in lowercase.") },
        { t: L("Пара", "The pair"), l: [r.key], note: L("Імена впорядковано за абеткою, тому порядок не має значення.", "The names are put in alphabetical order, so the order does not matter.") },
        { t: L("Відсоток", "The percentage"), l: [L("Хеш пари (FNV-1a) = ", "The hash of the pair (FNV-1a) = ") + r.h, r.h + " mod 100 + 1 = " + r.pct] }
      ];
      const copy = A + " + " + B + " = " + r.pct + " % (" + v[0] + ")";
      return { ok: true, expr: A + " + " + B, head: [L("сумісність", "compatibility"), r.pct + " %"], headSub: v[0], subRaw: true, afterHead: '<div class="lv__stage">' + heart(r.pct) + '<div class="lv__verdict">' + esc(v[1]) + "</div></div>", tiles: [{ k: L("Рівень", "Level"), v: v[0] }, { k: L("Спільні літери", "Shared letters"), v: cm.length ? cm.length + " (" + upper(Array.from(new Set(cm))) + ")" : "0" }, { k: L("Літер у двох іменах", "Letters in both names"), v: String(r.a.length + r.b.length) }], extraHtml: box(esc, JOKE, L("Це жарт.", "It is a joke.")), steps, note: "", copyText: copy, resText: copy };
    },
    reset(h) { S.a = ""; S.b = ""; paint("names", h.el); },
    fill(h) { S.a = L("Катерина", "Sophia"); S.b = L("Олег", "Luke"); paint("names", h.el); },
    share: share("names"), apply: apply("names")
  };

  // ====================== FLAMES ======================
  const flames = {
    key: "flames", type: "custom", req: () => ["lfA", "lfB"], nameUk: "FLAMES", nameEn: "FLAMES",
    build(b, x, h) { b.innerHTML = body("flames") + hint(L("FLAMES — старовинна жартівлива гра: викреслюємо спільні літери двох імен, рахуємо ті, що лишились, і викреслюємо літери слова FLAMES (Friends, Lovers, Affection, Marriage, Enemies, Siblings), доки не лишиться одна.", "FLAMES is an old joke game: cross out the shared letters of two names, count the ones left and cross out the letters of the word FLAMES (Friends, Lovers, Affection, Marriage, Enemies, Siblings) until one remains.")); paint("flames", h.el); wire("flames", h); },
    calc(h) {
      const { el, esc } = h; readS("flames", el); if (!S.a.trim() || !S.b.trim()) return { ok: false, incomplete: true };
      const f = V.flames(S.a, S.b); if (!f) return { ok: false, msg: L("В обох іменах потрібні літери: цифри й знаки не враховуються.", "Both names need letters: digits and symbols do not count.") };
      const A = S.a.trim(), B = S.b.trim(), fn = f.result ? FNAME[f.result] : null;
      const cancel = f.cancelled.length ? upper(f.cancelled) : L("жодної", "none");
      const rest = f.restA.concat(f.rest);
      const steps = [
        { t: L("Викреслюємо спільні літери", "Cross out the shared letters"), l: [L("Спільні: ", "Shared: ") + cancel, L("Лишилось: ", "Left: ") + (rest.length ? upper(rest) : L("нічого", "nothing"))], note: L("Кожну літеру першого імені викреслюємо разом з однією такою ж літерою другого.", "Each letter of the first name is crossed out with one identical letter of the second.") },
        { t: L("Рахуємо залишок", "Count what is left"), l: ["n = " + f.n] }
      ].concat(f.rounds.length ? [{ t: L("Викреслюємо за колом FLAMES", "Cross out round the FLAMES circle"), l: f.rounds.map((r, i) => (i + 1) + ". " + r.ring.join(" ") + L(" → викреслюємо ", " → cross out ") + r.removed), note: L("Рахуємо n літер по колу від першої літери; після викреслення лічба продовжується з наступної.", "Count n letters round the circle from the first letter; after crossing out, counting goes on from the next.") }] : []);
      const ring = '<div class="lv__fl">' + V.FL.map((c) => '<div class="lv__fc"><span class="lv__f' + (c === f.result ? " is-win" : f.rounds.some((r) => r.removed === c) ? " is-out" : "") + '">' + c + "</span><small>" + esc(FNAME[c][0]) + "</small></div>").join("") + "</div>";
      const copy = A + " + " + B + ": " + (fn ? fn[0] : L("усі літери збіглись", "all letters match"));
      if (!fn) return { ok: true, expr: A + " + " + B, head: [L("результат", "result"), L("збіг", "match")], headSub: L("усі літери збіглись", "all the letters match"), subRaw: true, afterHead: "", tiles: [{ k: L("Спільних літер", "Shared letters"), v: String(f.cancelled.length) }, { k: L("Залишилось", "Left"), v: "0" }], extraHtml: box(esc, L("Імена складаються з тих самих літер, тому нічого не лишилось і гра не має відповіді. Спробуйте інші імена.", "The names are made of the same letters, so nothing is left and the game has no answer. Try other names."), L("Дзеркало.", "A mirror.")) + box(esc, JOKE), steps, note: "", copyText: copy, resText: copy };
      return { ok: true, expr: A + " + " + B, head: [L("FLAMES", "FLAMES"), fn[0]], headSub: fn[1], subRaw: true, afterHead: ring, tiles: [{ k: L("Спільних літер", "Shared letters"), v: String(f.cancelled.length) }, { k: L("Залишилось (n)", "Left (n)"), v: String(f.n) }, { k: L("Літера", "Letter"), v: f.result }], extraHtml: box(esc, JOKE, L("Це жарт.", "It is a joke.")), steps, note: "", copyText: copy, resText: copy };
    },
    reset(h) { S.a = ""; S.b = ""; paint("flames", h.el); },
    fill(h) { S.a = L("Катерина", "Sophia"); S.b = L("Олег", "Luke"); paint("flames", h.el); },
    share: share("flames"), apply: apply("flames")
  };

  return { modes: [names, flames], exactNote: false, onReset() { S.a = ""; S.b = ""; } };
});
