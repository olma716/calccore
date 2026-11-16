/* pw-names.js — генератор логінів і ніків: власні списки слів (англійські й українські з узгодженням роду), транслітерація за КМУ 2010, логіни з імені й прізвища, довжина, роздільник, цифри; залежить від pw-data.js (randInt) */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis, P = root.Pw;
  const { randInt, pick } = P;

  const EN_ADJ = "Swift Silent Brave Lucky Wild Clever Mighty Shiny Frosty Sunny Misty Cosmic Golden Silver Crimson Azure Amber Velvet Stormy Gentle Fierce Noble Lonely Happy Sleepy Crazy Rapid Hidden Ancient Electric Digital Atomic Lunar Solar Arctic Rusty Cunning Daring Jolly Bold Calm Dusty Eager Fuzzy Glowing Humble Icy Jazzy Keen Lively Magic Nimble Plucky Quick Radiant Savage Tiny Vivid Witty Zesty".split(" ");
  const EN_NOUNS = {
    animals: "Fox Wolf Bear Owl Hawk Tiger Panda Otter Raven Falcon Lynx Badger Dolphin Eagle Moose Gecko Cobra Bison Heron Koala".split(" "),
    nature: "River Mountain Forest Ocean Canyon Meadow Thunder Breeze Glacier Willow Maple Cedar Storm Valley Island Desert Harbor Cloud Ember Aurora".split(" "),
    space: "Comet Galaxy Nebula Orbit Meteor Pulsar Quasar Rocket Eclipse Cosmos Photon Starship Satellite Asteroid Zenith Horizon Supernova Moonbeam Stardust Voyager".split(" "),
    fantasy: "Dragon Wizard Knight Phoenix Goblin Sorcerer Griffin Ranger Paladin Elf Titan Specter Warlock Valkyrie Unicorn Sentinel Oracle Viking Samurai Ninja".split(" "),
    history: "Spartan Gladiator Pharaoh Centurion Emperor Pirate Crusader Templar Hussar Legionary Gladius Citadel Chariot Pyramid Colossus Trireme Bastion Chronicle Dynasty Monarch".split(" "),
    tech: "Pixel Byte Cipher Matrix Circuit Binary Kernel Vertex Cursor Script Packet Router Signal Beacon Pilot Droid Cyborg Robot Laser Turbo".split(" ")
  };
  // прикметники: чоловічий|жіночий|середній рід
  const UA_ADJ = ("Швидкий|Швидка|Швидке Тихий|Тиха|Тихе Сміливий|Смілива|Сміливе Хитрий|Хитра|Хитре Дикий|Дика|Дике Мудрий|Мудра|Мудре Яскравий|Яскрава|Яскраве Сонячний|Сонячна|Сонячне Морозний|Морозна|Морозне Золотий|Золота|Золоте Срібний|Срібна|Срібне Грозовий|Грозова|Грозове Північний|Північна|Північне Далекий|Далека|Далеке Вільний|Вільна|Вільне Веселий|Весела|Веселе Сонний|Сонна|Сонне Нічний|Нічна|Нічне Місячний|Місячна|Місячне Зоряний|Зоряна|Зоряне Кришталевий|Кришталева|Кришталеве Вогняний|Вогняна|Вогняне Крижаний|Крижана|Крижане Таємничий|Таємнича|Таємниче Стрімкий|Стрімка|Стрімке Відважний|Відважна|Відважне Спокійний|Спокійна|Спокійне Гордий|Горда|Горде Бистрий|Бистра|Бистре Чарівний|Чарівна|Чарівне Невидимий|Невидима|Невидиме Рудий|Руда|Руде Білий|Біла|Біле Чорний|Чорна|Чорне Червоний|Червона|Червоне Блакитний|Блакитна|Блакитне Грізний|Грізна|Грізне Щасливий|Щаслива|Щасливе Гарячий|Гаряча|Гаряче Лісовий|Лісова|Лісове Степовий|Степова|Степове Космічний|Космічна|Космічне Електричний|Електрична|Електричне Цифровий|Цифрова|Цифрове Пухнастий|Пухнаста|Пухнасте Кумедний|Кумедна|Кумедне Допитливий|Допитлива|Допитливе Невтомний|Невтомна|Невтомне").split(" ").map((x) => x.split("|"));
  // іменники: слово:рід (m, f, n)
  const UA_NOUNS_RAW = {
    animals: "Лис:m Вовк:m Ведмідь:m Сова:f Яструб:m Тигр:m Видра:f Ворон:m Рись:f Борсук:m Дельфін:m Орел:m Лось:m Бобер:m Зубр:m Журавель:m Кіт:m Лисиця:f Білка:f Лелека:f",
    nature: "Річка:f Гора:f Ліс:m Океан:m Каньйон:m Луг:m Грім:m Вітер:m Льодовик:m Верба:f Клен:m Кедр:m Буря:f Долина:f Острів:m Пустеля:f Хмара:f Зоря:f Криниця:f Степ:m",
    space: "Комета:f Галактика:f Туманність:f Орбіта:f Метеор:m Пульсар:m Квазар:m Ракета:f Затемнення:n Космос:m Фотон:m Зореліт:m Супутник:m Астероїд:m Зеніт:m Горизонт:m Місяць:m Сузір'я:n Зірка:f Сонце:n",
    fantasy: "Дракон:m Чарівник:m Лицар:m Фенікс:m Гоблін:m Чаклун:m Грифон:m Мольфар:m Паладин:m Ельф:m Титан:m Привид:m Відьма:f Єдиноріг:m Вартовий:m Оракул:m Вікінг:m Козак:m Характерник:m Опришок:m",
    history: "Спартанець:m Гладіатор:m Фараон:m Центуріон:m Імператор:m Пірат:m Хрестоносець:m Тамплієр:m Гусар:m Легіонер:m Цитадель:f Колісниця:f Піраміда:f Колос:m Трирема:f Бастіон:m Хроніка:f Династія:f Монарх:m Гетьман:m",
    tech: "Піксель:m Байт:m Шифр:m Матриця:f Схема:f Ядро:n Вектор:m Курсор:m Скрипт:m Пакет:m Роутер:m Сигнал:m Маяк:m Дрон:m Кіборг:m Робот:m Лазер:m Процесор:m Алгоритм:m Код:m"
  };
  const GI = { m: 0, f: 1, n: 2 };
  const UA_NOUNS = {}; Object.keys(UA_NOUNS_RAW).forEach((k) => { UA_NOUNS[k] = UA_NOUNS_RAW[k].split(" ").map((x) => { const [w, g] = x.split(":"); return { w, g: GI[g] }; }); });
  const THEMES = ["animals", "nature", "space", "fantasy", "history", "tech"];

  // транслітерація за КМУ №55 (2010); початкові форми є, я, ї, й, ю, я; «зг» → zgh
  const T1 = { а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", ж: "zh", з: "z", и: "y", і: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ь: "", ъ: "", ы: "y", э: "e", ё: "e", "'": "", "’": "", "ʼ": "" };
  const T_MID = { є: "ie", ї: "i", й: "i", ю: "iu", я: "ia" }, T_INI = { є: "ye", ї: "yi", й: "y", ю: "yu", я: "ya" };
  const isLet = (ch) => !!ch && /[\p{L}'’ʼ]/u.test(ch);
  function translit(str) {
    const s = Array.from(String(str)); let out = "";
    for (let i = 0; i < s.length; i++) {
      const ch = s[i], lo = ch.toLowerCase(), up = ch !== lo; let m;
      if (lo === "г" && i > 0 && s[i - 1].toLowerCase() === "з") m = "gh";
      else if (T_MID[lo] !== undefined) m = isLet(s[i - 1]) ? T_MID[lo] : T_INI[lo];
      else if (T1[lo] !== undefined) m = T1[lo];
      else m = ch;
      out += up && m ? m.charAt(0).toUpperCase() + m.slice(1) : m;
    }
    return out;
  }
  // ім'я для логіна: латиниця без діакритики, малі літери й цифри
  const loginPart = (t) => translit(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const nounPool = (lang, theme) => { const keys = theme && theme !== "all" && (lang === "uk" ? UA_NOUNS : EN_NOUNS)[theme] ? [theme] : THEMES; return [].concat(...keys.map((k) => (lang === "uk" ? UA_NOUNS : EN_NOUNS)[k])); };
  const digitsStr = (n) => { let s = ""; for (let i = 0; i < n; i++) s += String(randInt(10)); return s; };
  // слова за структурою: adj-noun, noun, noun-noun, adj-adj-noun; для української прикметник узгоджується з родом іменника
  function wordParts(lang, theme, shape) {
    const pool = nounPool(lang, theme);
    if (lang === "uk") {
      const n = pick(pool), forms = [];
      if (shape === "nn") { let n2; do { n2 = pick(pool); } while (n2 === n && pool.length > 1); return [n.w, n2.w]; }
      if (shape === "aan") { const a = pick(UA_ADJ); let b; do { b = pick(UA_ADJ); } while (b === a); return [a[n.g], b[n.g], n.w]; }
      if (shape === "an") return [pick(UA_ADJ)[n.g], n.w];
      return [n.w];
    }
    const n = pick(pool);
    if (shape === "nn") { let n2; do { n2 = pick(pool); } while (n2 === n && pool.length > 1); return [n, n2]; }
    if (shape === "aan") { const a = pick(EN_ADJ); let b; do { b = pick(EN_ADJ); } while (b === a); return [a, b, n]; }
    if (shape === "an") return [pick(EN_ADJ), n];
    return [n];
  }
  const spaceOf = (lang, theme, shape) => {
    const N = nounPool(lang, theme).length, A = lang === "uk" ? UA_ADJ.length : EN_ADJ.length;
    return shape === "nn" ? N * (N - 1) : shape === "aan" ? A * (A - 1) * N : shape === "an" ? A * N : N;
  };
  const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);

  // ніки: o = {lang, script, theme, struct, style, digits, max, count}
  function nicks(o) {
    const lat = o.lang !== "uk" || o.script === "lat", shape = o.struct || "an", style = o.style || "camel", dg = o.digits || 0, list = [], seen = new Set();
    let tries = 0;
    while (list.length < o.count && tries++ < o.count * 80 + 300) {
      let parts = wordParts(o.lang, o.theme, shape);
      if (o.lang === "uk" && lat) parts = parts.map((w) => cap(translit(w).replace(/[^A-Za-z]/g, "")));
      let s;
      if (style === "spaced") s = parts.join(" "); else if (style === "snake") s = parts.map((w) => w.toLowerCase()).join("_"); else if (style === "lower") s = parts.map((w) => w.toLowerCase()).join(""); else s = parts.join("");
      const d = digitsStr(dg); if (d) s += style === "snake" ? "_" + d : style === "spaced" ? " " + d : d;
      if (o.max && s.length > o.max) continue;
      if (seen.has(s)) continue;
      seen.add(s); list.push(s);
    }
    if (!list.length) return { err: "maxlen" };
    return { list, space: spaceOf(o.lang, o.theme, shape) * Math.pow(10, dg), short: list.length < o.count };
  }

  // логіни: o = {lang, theme, words (1–3), sep, digits, max, count, name}
  function logins(o) {
    const dg = o.digits || 0, list = [], seen = new Set(), sep = o.sep || "";
    let space, tries = 0;
    const name = String(o.name || "").trim();
    if (name) {
      const toks = name.split(/\s+/).map(loginPart).filter(Boolean);
      if (!toks.length) return { err: "name" };
      const f = toks[0], l = toks.length > 1 ? toks[toks.length - 1] : "";
      let pats;
      if (l) pats = [...new Set([f + sep + l, l + sep + f, f[0] + sep + l, f + sep + l[0], f[0] + l])];
      else pats = null;
      const lg = o.lang === "uk" ? "uk" : "en"; space = (l ? pats.length : nounPool(lg, o.theme).length * 2) * Math.pow(10, dg);
      while (list.length < o.count && tries++ < o.count * 80 + 300) {
        let s;
        if (l) s = pats[randInt(pats.length)];
        else { const nn = pick(nounPool(lg, o.theme)), word = loginPart(lg === "uk" ? nn.w : nn); s = randInt(2) ? f + sep + word : word + sep + f; }
        s += digitsStr(dg);
        if (o.max && s.length > o.max) continue;
        if (seen.has(s)) continue;
        seen.add(s); list.push(s);
      }
    } else {
      const shape = o.words === 3 ? "aan" : o.words === 2 ? "an" : "n";
      space = spaceOf(o.lang, o.theme, shape) * Math.pow(10, dg);
      while (list.length < o.count && tries++ < o.count * 80 + 300) {
        const parts = wordParts(o.lang, o.theme, shape).map(loginPart);
        let s = parts.join(sep) + digitsStr(dg);
        if (o.max && s.length > o.max) continue;
        if (seen.has(s)) continue;
        seen.add(s); list.push(s);
      }
    }
    if (!list.length) return { err: "maxlen" };
    return { list, space, short: list.length < o.count };
  }

  root.PwNames = { EN_ADJ, EN_NOUNS, UA_ADJ, UA_NOUNS, THEMES, translit, loginPart, nicks, logins, spaceOf, nounPool };
})();
