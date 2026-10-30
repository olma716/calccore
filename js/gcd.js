/* gcd.js — калькулятор НСД і НСК: два режими (НСД і НСК кількох чисел; розклад числа та його дільники), розв'язання по кроках (UK/EN)
   Усе на BigInt: натуральні числа до 18 цифр, до 20 чисел. НСД — алгоритм Евкліда, НСК = a·b / НСД; ланцюжок для кількох чисел: НСД(a, b, c) = НСД(НСД(a, b), c).
   Способи: Евклід (кроки ділення з підписами пар), прості множники (таблиця степенів: мінімум для НСД, максимум для НСК), дільники й кратні (для чисел до 10⁶).
   Розклад: пробні ділення на малі прості, тест Міллера–Рабіна (детермінований для n < 3,3·10²⁴) і Поллард-ро (пакетний gcd) для великих множників.
   Режим «Розклад і дільники»: τ(n) = Π(eᵢ + 1), σ(n) = Π (pᵢ^(eᵢ+1) − 1)/(pᵢ − 1), список усіх дільників із розкладу. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const L = (u, e) => (IS_EN ? e : u);
  const MODES = ["gl", "fx"];
  const MAXN = 20, MAXD = 18, SMALLCAP = 1000000n, LADDER_CAP = 1000000000000n;
  let mode = "gl";

  const T = {
    enter: L("Вкажіть дані — результат з'явиться тут.", "Enter your data — the result will appear here."),
    copied: L("Результат скопійовано ✅", "Result copied ✅"),
    copyFailed: L("Не вдалось скопіювати 😕", "Could not copy 😕"),
    linkCopied: L("Посилання скопійовано ✅", "Link copied ✅"),
    reset: L("Скинуто ✅", "Reset ✅"),
    example: L("Підставлено приклад ✅", "Example filled in ✅"),
    calcFirst: L("Спочатку порахуйте результат.", "Calculate first.")
  };

  // ===== арифметика на BigInt =====
  const NB = " ";
  const fmt = (b) => b.toString().replace(/\B(?=(\d{3})+(?!\d))/g, NB);
  const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a; };
  const lcm = (a, b) => (a / gcd(a, b)) * b;
  const isqrt = (n) => { if (n < 2n) return n; let x = 1n << BigInt((n.toString(2).length + 1) >> 1), y = (x + n / x) >> 1n; while (y < x) { x = y; y = (x + n / x) >> 1n; } return x; };
  const modpow = (b, e, m) => { let r = 1n; b %= m; while (e > 0n) { if (e & 1n) r = (r * b) % m; b = (b * b) % m; e >>= 1n; } return r; };
  const SMALLP = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];
  function isPrime(n) {
    if (n < 2n) return false;
    for (const p of SMALLP) { if (n === p) return true; if (n % p === 0n) return false; }
    let d = n - 1n, s = 0;
    while (d % 2n === 0n) { d /= 2n; s++; }
    for (const a of SMALLP) {
      let x = modpow(a, d, n);
      if (x === 1n || x === n - 1n) continue;
      let comp = true;
      for (let i = 1; i < s; i++) { x = (x * x) % n; if (x === n - 1n) { comp = false; break; } }
      if (comp) return false;
    }
    return true;
  }
  function rho(n) {
    if (n % 2n === 0n) return 2n;
    for (let c = 1n; ; c++) {
      const f = (v) => (v * v + c) % n;
      let x = 2n, y = 2n, g = 1n;
      while (g === 1n) {
        const xs = x, ys = y;
        let q = 1n;
        for (let i = 0; i < 128; i++) { x = f(x); y = f(f(y)); q = (q * (x > y ? x - y : y - x)) % n; }
        g = gcd(q, n);
        if (g === n || q === 0n) { // повертаємось і йдемо по одному кроку
          x = xs; y = ys; g = 1n;
          for (let i = 0; i < 128 && g === 1n; i++) { x = f(x); y = f(f(y)); g = gcd(x > y ? x - y : y - x, n); }
          break;
        }
      }
      if (g > 1n && g < n) return g;
    }
  }
  // розклад: Map<BigInt, number>, ключі за зростанням
  function factorize(n) {
    const f = new Map();
    const add = (p) => f.set(p, (f.get(p) || 0) + 1);
    for (let p = 2n; p < 1000n && p * p <= n; p += p === 2n ? 1n : 2n) { while (n % p === 0n) { add(p); n /= p; } }
    const rec = (m) => {
      if (m === 1n) return;
      if (m < 1000000n || isPrime(m)) { add(m); return; } // без дільників до 1000 і < 10⁶ — просте
      const s = isqrt(m);
      if (s * s === m) { rec(s); rec(s); return; }
      const d = rho(m);
      rec(d); rec(m / d);
    };
    rec(n);
    return new Map([...f.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)));
  }
  const SUP = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
  const sup = (e) => String(e).split("").map((d) => SUP[d]).join("");
  const fText = (m) => (m.size ? [...m.entries()].map(([p, e]) => p.toString() + (e > 1 ? sup(e) : "")).join(" · ") : "1");
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const step = (t, lines, note, html) => ({ t, l: lines, note, h: html });

  // ===== розбір введення =====
  function parseNums(text, wantOne) {
    const raw = String(text || "").trim();
    if (!raw) return { empty: true };
    const tokens = [];
    for (let part of raw.split(/[\s;]+/).filter(Boolean)) {
      part = part.replace(/,+$/, "");
      if (!part) continue;
      if (/^\d+(,\d+){2,}$/.test(part)) { tokens.push(...part.split(",")); continue; }
      if (/^\d+[,.]\d+$/.test(part)) return { err: L("«" + part + "» схоже на десяткове число або на два числа без пропуску. Потрібні натуральні числа: розділяйте їх пробілом або «; ».", "“" + part + "” looks like a decimal or two numbers without a space. Natural numbers are needed: separate them with a space or “; ”.") };
      if (!/^\d+$/.test(part)) return { err: L("«" + part.slice(0, 16) + "» не підходить: допустимі лише натуральні числа.", "“" + part.slice(0, 16) + "” is not valid: only natural numbers are allowed.") };
      tokens.push(part);
    }
    if (!tokens.length) return { empty: true };
    const nums = [];
    for (const tk of tokens) {
      const t = tk.replace(/^0+(?=\d)/, "");
      if (/^0+$/.test(tk)) return { err: L("Числа мають бути більші за нуль.", "The numbers must be greater than zero.") };
      if (t.length > MAXD) return { err: L("Число «" + t.slice(0, 12) + "…» задовге: до " + MAXD + " цифр.", "The number “" + t.slice(0, 12) + "…” is too long: up to " + MAXD + " digits.") };
      nums.push(BigInt(t));
    }
    if (wantOne) { if (nums.length > 1) return { err: L("Введіть одне число.", "Enter a single number.") }; return { nums }; }
    if (nums.length > MAXN) return { err: L("Забагато чисел (до " + MAXN + ").", "Too many numbers (up to " + MAXN + ").") };
    if (nums.length < 2) return { incomplete: true, msg: L("Введіть щонайменше два числа.", "Enter at least two numbers.") };
    return { nums };
  }

  // ===== НСД і НСК =====
  const list = (arr) => arr.map(fmt).join(", ");
  function euclidLines(a, b) {
    const lines = [];
    if (a < b) { [a, b] = [b, a]; }
    while (b) { const q = a / b, r = a % b; lines.push(fmt(a) + " = " + fmt(q) + " · " + fmt(b) + " + " + fmt(r)); a = b; b = r; }
    return { lines, g: a };
  }
  function stepsEuclid(nums) {
    const steps = [];
    let g = nums[0], l = nums[0];
    for (let i = 1; i < nums.length; i++) {
      const e = euclidLines(g, nums[i]);
      const d2 = gcd(l, nums[i]), nl = (l / d2) * nums[i];
      const title = nums.length === 2 ? L("Алгоритм Евкліда: НСД(" + fmt(g) + ", " + fmt(nums[i]) + ")", "Euclidean algorithm: GCD(" + fmt(g) + ", " + fmt(nums[i]) + ")") : L("Додаємо число " + fmt(nums[i]) + ": НСД(" + fmt(g) + ", " + fmt(nums[i]) + ")", "Add the number " + fmt(nums[i]) + ": GCD(" + fmt(g) + ", " + fmt(nums[i]) + ")");
      const lines = e.lines.concat([L("Остання ненульова остача — НСД = ", "The last nonzero remainder — GCD = ") + fmt(e.g)]);
      const lcmLine = L("НСК(" + fmt(l) + ", " + fmt(nums[i]) + ") = " + fmt(l) + " · " + fmt(nums[i]) + " / НСД(" + fmt(l) + ", " + fmt(nums[i]) + ") = " + fmt(l) + " · " + fmt(nums[i]) + " / " + fmt(d2) + " = " + fmt(nl), "LCM(" + fmt(l) + ", " + fmt(nums[i]) + ") = " + fmt(l) + " · " + fmt(nums[i]) + " / GCD(" + fmt(l) + ", " + fmt(nums[i]) + ") = " + fmt(l) + " · " + fmt(nums[i]) + " / " + fmt(d2) + " = " + fmt(nl));
      steps.push(step(title, lines.concat([lcmLine]), i === 1 && nums.length > 2 ? L("Для кількох чисел рахуємо послідовно: НСД(a, b, c) = НСД(НСД(a, b), c) і так само для НСК.", "For several numbers we go step by step: GCD(a, b, c) = GCD(GCD(a, b), c), and the same for LCM.") : "") );
      g = e.g; l = nl;
    }
    return steps;
  }
  function tableHtml(nums, maps, primes, gMap, lMap) {
    const th = primes.map((p) => "<th>" + p + "</th>").join("");
    const rows = nums.map((n, i) => "<tr><th>" + fmt(n) + "</th>" + primes.map((p) => "<td>" + (maps[i].get(p) || "·") + "</td>").join("") + "</tr>").join("");
    const mn = "<tr class=\"gcd__rowG\"><th>" + L("мін.", "min") + "</th>" + primes.map((p) => "<td>" + (gMap.get(p) || "·") + "</td>").join("") + "</tr>";
    const mx = "<tr class=\"gcd__rowL\"><th>" + L("макс.", "max") + "</th>" + primes.map((p) => "<td>" + lMap.get(p) + "</td>").join("") + "</tr>";
    return '<div class="gcd__tbl"><table><thead><tr><th>' + L("Число", "Number") + "</th>" + th + "</tr></thead><tbody>" + rows + mn + mx + "</tbody></table></div>";
  }
  function stepsPrimes(nums) {
    const maps = nums.map(factorize);
    const all = new Set();
    maps.forEach((m) => m.forEach((_, p) => all.add(p)));
    const primes = [...all].sort((a, b) => (a < b ? -1 : 1));
    const gMap = new Map(), lMap = new Map();
    primes.forEach((p) => { const ex = maps.map((m) => m.get(p) || 0), mn = Math.min(...ex), mx = Math.max(...ex); if (mn > 0) gMap.set(p, mn); lMap.set(p, mx); });
    const steps = [step(L("Розкладаємо на прості множники", "Prime factorization"), nums.map((n, i) => fmt(n) + " = " + fText(maps[i])))];
    steps.push(step(L("Степені простих множників", "Exponents of the primes"), [], L("У таблиці — степінь кожного простого множника в кожному числі («·» означає, що його немає). Для НСД беремо мінімум, для НСК — максимум.", "The table shows the exponent of every prime in every number (“·” means it is absent). GCD takes the minimum, LCM the maximum."), tableHtml(nums, maps, primes, gMap, lMap)));
    const g = [...gMap.entries()].reduce((a, [p, e]) => a * p ** BigInt(e), 1n), l = [...lMap.entries()].reduce((a, [p, e]) => a * p ** BigInt(e), 1n);
    steps.push(step(L("НСД і НСК за таблицею", "GCD and LCM from the table"), [
      L("НСД: спільні прості множники з найменшими степенями — ", "GCD: the common primes with the smallest exponents — ") + (gMap.size ? fText(gMap) + " = " + fmt(g) : L("спільних простих множників немає, НСД = 1", "no common primes, GCD = 1")),
      L("НСК: усі прості множники з найбільшими степенями — ", "LCM: all primes with the largest exponents — ") + fText(lMap) + " = " + fmt(l)
    ]));
    return steps;
  }
  function divisorsSmall(n) {
    const d = [], r = Number(n);
    for (let i = 1; i * i <= r; i++) if (r % i === 0) { d.push(i); if (i * i !== r) d.push(r / i); }
    return d.sort((a, b) => a - b);
  }
  function stepsDivs(nums, g, l) {
    const steps = [];
    const ds = nums.map(divisorsSmall);
    steps.push(step(L("Дільники кожного числа", "Divisors of each number"), nums.map((n, i) => L("Дільники ", "Divisors of ") + fmt(n) + ": " + ds[i].join(", "))));
    const common = ds[0].filter((x) => ds.every((d) => d.includes(x)));
    steps.push(step(L("Спільні дільники", "Common divisors"), [L("Спільні дільники: ", "Common divisors: ") + common.join(", "), L("Найбільший з них — НСД = ", "The largest — GCD = ") + common[common.length - 1]]));
    const mx = nums.reduce((a, b) => (a > b ? a : b)), k = l / mx;
    if (k <= 40n) {
      const ml = []; for (let i = 1n; i <= k; i++) ml.push(mx * i);
      steps.push(step(L("Кратні найбільшого числа", "Multiples of the largest number"), [L("Кратні ", "Multiples of ") + fmt(mx) + ": " + list(ml), fmt(l) + L(" — перше число, яке ділиться на всі задані: ", " is the first multiple divisible by all the given numbers: ") + list(nums), L("Найменше таке — НСК = ", "The smallest — LCM = ") + fmt(l)], L("Перебираємо кратні найбільшого числа й шукаємо перше, що ділиться на решту.", "We go through the multiples of the largest number and look for the first one divisible by the rest.")));
    } else {
      steps.push(step(L("Кратні найбільшого числа", "Multiples of the largest number"), [L("Спільне кратне знайдеться лише на " + fmt(k) + "-му кратному числа " + fmt(mx) + ", тому перелік надто довгий.", "The first common multiple appears only at the " + fmt(k) + "th multiple of " + fmt(mx) + ", so the list is too long."), L("НСК = ", "LCM = ") + fmt(l) + L(" (знайдено через НСД)", " (found through GCD)")]));
    }
    return steps;
  }
  function calcGl() {
    const P = parseNums(el("nums").value, false);
    if (P.empty) return { ok: false, incomplete: true };
    if (P.err) return { ok: false, msg: P.err };
    if (P.incomplete) return { ok: false, incomplete: true, msg: P.msg };
    const nums = P.nums;
    let g = nums[0], l = nums[0];
    for (let i = 1; i < nums.length; i++) { g = gcd(g, nums[i]); l = lcm(l, nums[i]); }
    const method = el("method").value;
    let steps = [step(L("Числа", "The numbers"), [list(nums)])], notes = [];
    if (method === "primes") steps = steps.concat(stepsPrimes(nums));
    else if (method === "divs") {
      if (nums.every((n) => n <= SMALLCAP)) steps = steps.concat(stepsDivs(nums, g, l));
      else { steps.push(step(L("Дільники й кратні", "Divisors and multiples"), [L("Цей спосіб працює для чисел до 10⁶, тому скористаємось алгоритмом Евкліда.", "This method works for numbers up to 10⁶, so we use the Euclidean algorithm instead.")])); steps = steps.concat(stepsEuclid(nums)); }
    } else steps = steps.concat(stepsEuclid(nums));
    if (nums.length === 2) steps.push(step(L("Перевірка", "Check"), ["НСД · НСК = " + fmt(g) + " · " + fmt(l) + " = " + fmt(g * l), L("a · b = ", "a · b = ") + fmt(nums[0]) + " · " + fmt(nums[1]) + " = " + fmt(nums[0] * nums[1]) + (g * l === nums[0] * nums[1] ? " ✓" : " ✗")].map((s, i) => (i === 0 && IS_EN ? s.replace("НСД · НСК", "GCD · LCM") : s)), L("Для двох чисел добуток НСД і НСК дорівнює добутку самих чисел.", "For two numbers the product of GCD and LCM equals the product of the numbers.")));
    const coprime = g === 1n;
    const mxn = nums.reduce((a, b) => (a > b ? a : b));
    const head = '<div class="gcd__forms"><span class="gcd__rt"><small>' + L("НСД", "GCD") + '</small><span class="gcd__big">' + esc(fmt(g)) + '</span></span><span class="gcd__rt"><small>' + L("НСК", "LCM") + '</small><span class="gcd__big">' + esc(fmt(l)) + "</span></span></div>";
    const tiles = [{ k: L("Кількість чисел", "How many numbers"), v: String(nums.length) }, { k: L("Взаємно прості", "Coprime"), v: coprime ? L("Так (НСД = 1)", "Yes (GCD = 1)") : L("Ні", "No") }, nums.length === 2 ? { k: L("НСД · НСК", "GCD · LCM"), v: fmt(g * l) } : { k: L("Найбільше число", "The largest number"), v: fmt(mxn) }];
    return { ok: true, kind: "gl", expr: L("НСД і НСК чисел " + list(nums), "GCD and LCM of " + list(nums)), head, tiles, steps, resText: L("НСД = ", "GCD = ") + g + L(", НСК = ", ", LCM = ") + l, notes };
  }

  // ===== розклад і дільники =====
  function divisorsOf(map) {
    let ds = [1n];
    for (const [p, e] of map) { const nd = []; for (const d of ds) { let m = d; for (let i = 0; i <= e; i++) { nd.push(m); m *= p; } } ds = nd; }
    return ds.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  }
  function calcFx() {
    const P = parseNums(el("num1").value, true);
    if (P.empty) return { ok: false, incomplete: true };
    if (P.err) return { ok: false, msg: P.err };
    const n = P.nums[0];
    const f = factorize(n);
    const prime = f.size === 1 && [...f.values()][0] === 1;
    const steps = [step(L("Число", "The number"), [fmt(n)])];
    if (n === 1n) {
      steps.push(step(L("Особливий випадок", "A special case"), [L("1 — ні просте, ні складене число. Єдиний дільник — 1.", "1 is neither prime nor composite. Its only divisor is 1.")]));
    } else if (prime) {
      steps.push(step(L("Просте число", "A prime number"), [fmt(n) + L(" не має дільників, окрім 1 і себе.", " has no divisors other than 1 and itself.")], L("Перевірка виконана тестом Міллера–Рабіна для великих чисел і діленням для малих.", "Checked with the Miller–Rabin test for large numbers and by division for small ones.")));
    } else {
      if (n <= LADDER_CAP) {
        let cur = n; const lines = []; let p = 2n;
        while (p * p <= cur) { while (cur % p === 0n) { lines.push(fmt(cur) + " : " + p + " = " + fmt(cur / p)); cur /= p; } p += p === 2n ? 1n : 2n; if (lines.length > 70) break; }
        if (cur > 1n && lines.length <= 70) lines.push(fmt(cur) + " : " + fmt(cur) + " = 1");
        steps.push(step(L("Ділимо на найменші прості числа", "Divide by the smallest primes"), lines.slice(0, 70), L("Щоразу ділимо на найменше просте число, на яке ділиться залишок, доки не отримаємо 1.", "Each time we divide by the smallest prime that divides the rest, until we reach 1.")));
      } else steps.push(step(L("Розклад великого числа", "Factoring a large number"), [L("Для великих чисел використовується швидкий алгоритм (Поллард-ро з перевіркою простоти), тому покрокових ділень тут немає.", "Large numbers are factored with a fast algorithm (Pollard's rho with a primality test), so there are no step-by-step divisions here.")]));
      steps.push(step(L("Розклад", "Factorization"), [fmt(n) + " = " + fText(f)]));
    }
    const entries = [...f.entries()];
    const tau = entries.reduce((a, [, e]) => a * (e + 1), 1);
    const sigma = entries.reduce((a, [p, e]) => a * ((p ** BigInt(e + 1) - 1n) / (p - 1n)), 1n);
    if (n !== 1n) {
      steps.push(step(L("Кількість дільників", "The number of divisors"), ["τ = " + entries.map(([, e]) => "(" + e + " + 1)").join(" · ") + " = " + tau], L("Кожен простий множник можна взяти від нуля до eᵢ разів: це eᵢ + 1 способів.", "Each prime can be taken from zero to eᵢ times: eᵢ + 1 ways.")));
      steps.push(step(L("Сума дільників", "The sum of divisors"), ["σ = " + entries.map(([p, e]) => "(" + p + sup(e + 1) + " − 1)/(" + p + " − 1)").join(" · "), "σ = " + entries.map(([p, e]) => fmt((p ** BigInt(e + 1) - 1n) / (p - 1n))).join(" · ") + " = " + fmt(sigma)]));
    }
    const ds = divisorsOf(f);
    const LIMIT = 400;
    let shown, cut = false;
    if (ds.length > LIMIT) { shown = ds.slice(0, LIMIT / 2).concat(ds.slice(-LIMIT / 2)); cut = true; } else shown = ds;
    const chips = '<div class="gcd__chips">' + shown.map((d, i) => (cut && i === LIMIT / 2 ? '<span class="gcd__chip gcd__chip--dots">…</span>' : "") + '<span class="gcd__chip">' + esc(fmt(d)) + "</span>").join("") + "</div>";
    steps.push(step(L("Усі дільники (" + ds.length + ")", "All divisors (" + ds.length + ")"), [], cut ? L("Дільників багато, тому показано перші " + LIMIT / 2 + " і останні " + LIMIT / 2 + ".", "There are many divisors, so the first " + LIMIT / 2 + " and the last " + LIMIT / 2 + " are shown.") : "", chips));
    const type = n === 1n ? L("Ні просте, ні складене", "Neither prime nor composite") : prime ? L("Просте", "Prime") : L("Складене", "Composite");
    const head = '<div class="gcd__forms"><span class="gcd__dec">' + esc(n === 1n ? "1" : prime ? fmt(n) + L(" — просте число", " is a prime number") : fmt(n) + " = " + fText(f)) + "</span></div>";
    const tiles = [{ k: L("Тип числа", "Type"), v: type }, { k: L("Кількість дільників", "Divisors"), v: String(ds.length) }, { k: L("Сума дільників", "Sum of divisors"), v: fmt(sigma) }];
    const dsTxt = ds.length <= 2000 ? ds.map(String).join(", ") : ds.slice(0, 1000).map(String).join(", ") + ", …";
    return { ok: true, kind: "fx", expr: L("Розклад числа ", "Factorization of ") + fmt(n), head, tiles, steps, resText: (n === 1n ? "1" : n + " = " + fText(f)) + "; " + L("дільників: ", "divisors: ") + ds.length, extraText: L("Дільники: ", "Divisors: ") + dsTxt };
  }

  // ===== відображення =====
  const CALC = { gl: calcGl, fx: calcFx };
  function stepsHtml(steps) {
    return '<div class="gcd__sub">' + L("Розв'язання", "Solution") + "</div>" + steps.map((s, i) => '<div class="gcd__step"><span class="gcd__stepN">' + (i + 1) + '</span><div><b class="gcd__stepT">' + esc(s.t) + "</b>" + s.l.map((x) => '<p class="gcd__math">' + esc(x) + "</p>").join("") + (s.h || "") + (s.note ? '<p class="gcd__stepNote">' + esc(s.note) + "</p>" : "") + "</div></div>").join("");
  }
  function textOf(m) {
    const head = m.expr + "  →  " + m.resText;
    const body = m.steps.map((s, i) => (i + 1) + ". " + s.t + (s.l.length ? "\n   " + s.l.join("\n   ") : "")).join("\n");
    return [head, "", body].concat(m.extraText ? ["", m.extraText] : []).join("\n");
  }
  let last = null;
  function render(m, strict) {
    const box = el("result");
    if (!m.ok) {
      last = null;
      if (m.incomplete && !strict) { box.innerHTML = T.enter; return; }
      box.innerHTML = '<div class="gcd__hintbox">' + esc(m.msg || T.enter) + "</div>";
      return;
    }
    last = m;
    const tiles = '<div class="gcd__tiles">' + m.tiles.map((t) => '<div class="gcd__tile"><small>' + esc(t.k) + "</small><b>" + esc(t.v) + "</b></div>").join("") + "</div>";
    box.innerHTML = '<div class="gcd__rhead"><div class="gcd__expr">' + esc(m.expr) + "</div>" + m.head + "</div>" + tiles + stepsHtml(m.steps) + '<div class="gcd__note">' + L("Усі обчислення точні: числа до " + MAXD + " цифр обробляються цілими числами без округлень.", "All calculations are exact: numbers up to " + MAXD + " digits are handled as integers without rounding.") + "</div>";
  }
  const autoOn = () => !el("autoCalc") || el("autoCalc").checked;
  function calc(strict) {
    let m;
    try { m = CALC[mode](); } catch (e) { m = { ok: false, msg: String(e && e.message ? e.message : e) }; }
    render(m, strict === true);
    preview();
    return m;
  }
  function maybeCalc() { if (autoOn()) calc(); else { render({ ok: false, incomplete: true }, false); preview(); } }
  function preview() {
    const p = el("eqPreview");
    if (!p) return;
    let t = "";
    const P = parseNums(el(mode === "gl" ? "nums" : "num1").value, mode === "fx");
    if (P.nums) t = mode === "gl" ? L("НСД і НСК: ", "GCD and LCM: ") + list(P.nums) : L("Розклад числа ", "Factorize ") + fmt(P.nums[0]);
    p.textContent = t;
  }

  // ===== режими, список методів, кнопки =====
  function setDd(v) {
    const lis = Array.from(document.querySelectorAll("#md_list li")), li = lis.find((x) => x.dataset.v === String(v));
    if (!li) return;
    el("method").value = li.dataset.v;
    lis.forEach((x) => x.setAttribute("aria-selected", String(x === li)));
    el("md_val").textContent = li.textContent;
  }
  function initDd(onPick) {
    const btn = el("md_btn"), lst = el("md_list");
    const items = () => Array.from(lst.querySelectorAll("li"));
    const close = (f) => { lst.hidden = true; btn.setAttribute("aria-expanded", "false"); if (f) btn.focus(); };
    const open = () => { lst.hidden = false; btn.setAttribute("aria-expanded", "true"); (items().find((li) => li.getAttribute("aria-selected") === "true") || items()[0]).focus(); };
    btn.addEventListener("click", (e) => { e.stopPropagation(); if (lst.hidden) open(); else close(); });
    btn.addEventListener("keydown", (e) => { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); open(); } });
    const pick = (li) => { onPick(li.dataset.v); close(true); };
    lst.addEventListener("click", (e) => { const li = e.target.closest("li[data-v]"); if (li) pick(li); });
    lst.addEventListener("keydown", (e) => {
      const all = items(), i = all.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); all[Math.min(all.length - 1, i + 1)].focus(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); all[Math.max(0, i - 1)].focus(); }
      else if ((e.key === "Enter" || e.key === " ") && i >= 0) { e.preventDefault(); pick(all[i]); }
      else if (e.key === "Escape") { e.preventDefault(); close(true); }
      else if (e.key === "Tab") close();
    });
    document.addEventListener("click", (e) => { if (!e.target.closest("#md_dd")) close(); });
  }
  function toast(msg) { const n = el("toast"); if (!n) return; n.textContent = msg; clearTimeout(toast._t); toast._t = setTimeout(() => (n.textContent = ""), 2600); }
  const FIELDS = ["nums", "num1"];
  function setMode(m) {
    mode = m;
    document.querySelectorAll(".gcd__tab").forEach((b) => { const on = b.dataset.m === m; b.classList.toggle("is-active", on); b.setAttribute("aria-selected", String(on)); });
    el("panelGl").hidden = m !== "gl";
    el("panelFx").hidden = m !== "fx";
    maybeCalc();
  }
  function resetAll() { FIELDS.forEach((id) => (el(id).value = "")); setDd("euclid"); maybeCalc(); }
  const EXAMPLES = { gl: () => { el("nums").value = "12, 18, 30"; }, fx: () => { el("num1").value = "360"; } };
  function fillExample() { resetAll(); EXAMPLES[mode](); calc(true); toast(T.example); }
  function share() {
    const p = new URLSearchParams();
    p.set("m", mode); p.set("md", el("method").value);
    FIELDS.forEach((id) => el(id).value.trim() && p.set(id, el(id).value.trim()));
    navigator.clipboard?.writeText(location.origin + location.pathname + "?" + p.toString()).then(() => toast(T.linkCopied)).catch(() => toast(T.copyFailed));
  }
  function applyFromUrl() {
    const qs = new URLSearchParams(location.search);
    if (![...qs.keys()].length) return false;
    if (MODES.includes(qs.get("m"))) mode = qs.get("m");
    if (["euclid", "primes", "divs"].includes(qs.get("md"))) setDd(qs.get("md"));
    FIELDS.forEach((id) => { if (qs.has(id)) el(id).value = qs.get(id).slice(0, 400); });
    return true;
  }
  async function copyResult() {
    if (!last) { toast(T.calcFirst); return; }
    try { await navigator.clipboard.writeText(textOf(last).replace(/\u202f/g, "")); toast(T.copied); } catch { toast(T.copyFailed); }
  }

  window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".gcd__tab").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.m)));
    initDd((v) => { setDd(v); maybeCalc(); });
    FIELDS.forEach((id) => { el(id).addEventListener("input", maybeCalc); el(id).addEventListener("keydown", (e) => { if (e.key === "Enter" && (id !== "nums" || e.ctrlKey || e.metaKey)) { e.preventDefault(); calc(true); } }); });
    el("calcBtn").addEventListener("click", () => { const m = calc(true); if (!m.ok && m.msg) toast(m.msg); });
    el("exampleBtn").addEventListener("click", fillExample);
    el("resetBtn").addEventListener("click", () => { resetAll(); toast(T.reset); });
    el("shareBtn").addEventListener("click", share);
    el("copyBtn").addEventListener("click", copyResult);
    const used = applyFromUrl();
    setMode(mode);
    if (used) calc();
  });
})();
