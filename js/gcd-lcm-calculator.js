(() => {
  const el = (id) => document.getElementById(id);

  const LANG = String(document.documentElement.lang || "").toLowerCase().startsWith("en") ? "en" : "uk";

  const T = LANG === "en" ? {
    enterInputs: "Enter two or more natural numbers.",
    needTwo: "Enter at least two numbers.",
    invalid: "Only natural numbers are allowed. Check:",
    positive: "Numbers must be greater than zero.",
    tooBig: "A number is too long (up to 18 digits).",
    tooMany: "Too many numbers (up to 20).",
    gcd: "GCD",
    lcm: "LCM",
    count: "Numbers",
    coprime: "Coprime",
    yes: "yes",
    no: "no",
    factorsTitle: "Prime factorization",
    gcdByPrimes: "GCD: common primes with the smallest exponents",
    noCommon: "no common primes",
    lcmByPrimes: "LCM: all primes with the largest exponents",
    stepsTitle: "Euclidean algorithm",
    stepsMore: "…and more steps",
    copied: "Copied.",
    copyFail: "Could not copy.",
    resetDone: "Reset done.",
    nothing: "Nothing to copy yet."
  } : {
    enterInputs: "Введи два або більше натуральних числа.",
    needTwo: "Введи щонайменше два числа.",
    invalid: "Допустимі лише натуральні числа. Перевір:",
    positive: "Числа мають бути більші за нуль.",
    tooBig: "Число задовге (до 18 цифр).",
    tooMany: "Забагато чисел (до 20).",
    gcd: "НСД",
    lcm: "НСК",
    count: "Кількість чисел",
    coprime: "Взаємно прості",
    yes: "так",
    no: "ні",
    factorsTitle: "Розклад на прості множники",
    gcdByPrimes: "НСД: спільні прості множники з найменшими степенями",
    noCommon: "немає спільних простих множників",
    lcmByPrimes: "НСК: усі прості множники з найбільшими степенями",
    stepsTitle: "Алгоритм Евкліда",
    stepsMore: "…і ще кроки",
    copied: "Скопійовано.",
    copyFail: "Не вдалося скопіювати.",
    resetDone: "Скинуто.",
    nothing: "Поки нічого копіювати."
  };

  const MAX_NUMBERS = 20;
  const MAX_DIGITS = 18;
  const FACTOR_LIMIT = 1000000000000n; // 10^12: розклад пробним діленням (до 10^6 кроків)
  const MAX_STEP_LINES = 30;

  // ---------- DOM ----------
  const input = el("numbersInput");
  const btnCalc = el("btnCalc");
  const btnReset = el("btnReset");
  const btnCopy = el("btnCopy");
  const toast = el("mToast");
  const resultEl = el("mResult");
  const detailsEl = el("mDetails");

  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };
  const setResult = (mainText, extraHtml = "") => {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  };

  let lastCopy = "";

  // ---------- математика (BigInt: НСК швидко виходить за 2^53) ----------
  function gcd(a, b) {
    while (b) { [a, b] = [b, a % b]; }
    return a;
  }

  const SUP = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
  const sup = (n) => String(n).split("").map((d) => SUP[d]).join("");

  // Map простий множник -> степінь (n <= 10^12, тому Number безпечний)
  function factorize(big) {
    let n = Number(big);
    const f = new Map();
    for (let p = 2; p * p <= n; p += p === 2 ? 1 : 2) {
      while (n % p === 0) {
        f.set(p, (f.get(p) || 0) + 1);
        n /= p;
      }
    }
    if (n > 1) f.set(n, (f.get(n) || 0) + 1);
    return f;
  }

  function factorText(map) {
    if (!map.size) return "1";
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([p, e]) => (e > 1 ? `${p}${sup(e)}` : String(p)))
      .join(" · ");
  }

  function parse(text) {
    const tokens = String(text || "").split(/[\s,;]+/).filter(Boolean);
    if (!tokens.length) return { error: "empty" };

    const nums = [];
    for (const tk of tokens) {
      if (!/^\d+$/.test(tk)) return { error: "invalid", token: tk };
      if (/^0+$/.test(tk)) return { error: "positive" };
      if (tk.replace(/^0+/, "").length > MAX_DIGITS) return { error: "tooBig" };
      nums.push(BigInt(tk));
    }
    if (nums.length > MAX_NUMBERS) return { error: "tooMany" };
    if (nums.length < 2) return { error: "needTwo" };
    return { nums };
  }

  const fmt = (big) => big.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  // ---------- розрахунок ----------
  function calculate({ silent = false } = {}) {
    const parsed = parse(input ? input.value : "");

    if (parsed.error) {
      lastCopy = "";
      if (parsed.error === "empty") {
        setResult(T.enterInputs, "");
        setToast("");
      } else if (parsed.error === "needTwo") {
        setResult(T.needTwo, "");
        setToast("");
      } else {
        setResult(T.enterInputs, "");
        if (!silent || parsed.error === "invalid") {
          const msg = parsed.error === "invalid" ? `${T.invalid} ${parsed.token}` : T[parsed.error];
          setToast(msg);
        }
      }
      return;
    }

    setToast("");
    const { nums } = parsed;

    // НСД і НСК послідовно: gcd(a,b,c) = gcd(gcd(a,b),c); lcm(a,b)=a/gcd*b
    let g = nums[0];
    let l = nums[0];
    const steps = [];
    let stepsCut = false;

    for (let i = 1; i < nums.length; i++) {
      let a = g;
      let b = nums[i];
      if (a < b) [a, b] = [b, a];

      while (b) {
        const q = a / b;
        const r = a % b;
        if (steps.length < MAX_STEP_LINES) {
          steps.push(`${fmt(a)} = ${fmt(q)} · ${fmt(b)} + ${fmt(r)}`);
        } else {
          stepsCut = true;
        }
        a = b;
        b = r;
      }
      g = a;
      l = (l / gcd(l, nums[i])) * nums[i];
    }

    const coprime = g === 1n;
    const gText = fmt(g);
    const lText = fmt(l);

    let primesHtml = "";
    const factorable = nums.every((n) => n <= FACTOR_LIMIT);
    if (factorable) {
      const maps = nums.map(factorize);

      // НСД: спільні прості з мінімальним степенем; НСК: усі прості з максимальним
      const allPrimes = new Set();
      maps.forEach((m) => m.forEach((_, p) => allPrimes.add(p)));
      const gMap = new Map();
      const lMap = new Map();
      [...allPrimes].sort((a, b) => a - b).forEach((p) => {
        const exps = maps.map((m) => m.get(p) || 0);
        const min = Math.min(...exps);
        const max = Math.max(...exps);
        if (min > 0) gMap.set(p, min);
        lMap.set(p, max);
      });

      const rows = nums
        .map((n, i) => `<tr><td>${fmt(n)}</td><td>${factorText(maps[i])}</td></tr>`)
        .join("");

      primesHtml = `
        <div class="m-hintSmall" style="margin-top:14px;"><b>${T.factorsTitle}</b></div>
        <div class="m-tablewrap">
          <table class="m-table"><tbody>${rows}</tbody></table>
        </div>
        <div class="m-hintSmall" style="margin-top:8px;">${T.gcdByPrimes}: <b>${gMap.size ? factorText(gMap) : T.noCommon} = ${gText}</b></div>
        <div class="m-hintSmall">${T.lcmByPrimes}: <b>${factorText(lMap)} = ${lText}</b></div>`;
    }

    const stepsHtml = `
      <div class="m-hintSmall" style="margin-top:14px;"><b>${T.stepsTitle}</b></div>
      <ol style="margin:6px 0 0 20px; font-size:13px; line-height:1.7;">
        ${steps.map((s) => `<li>${s}</li>`).join("")}
        ${stepsCut ? `<li>${T.stepsMore}</li>` : ""}
      </ol>`;

    setResult(
      `${T.gcd} = ${gText}  ·  ${T.lcm} = ${lText}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.gcd}</div>
            <div class="m-kpi__v">${gText}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.lcm}</div>
            <div class="m-kpi__v" style="word-break:break-all;">${lText}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.count}</div>
            <div class="m-kpi__v">${nums.length}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.coprime}</div>
            <div class="m-kpi__v">${coprime ? T.yes : T.no}</div>
          </div>
        </div>
        ${primesHtml}
        ${stepsHtml}`
    );

    lastCopy = `${T.gcd} = ${g}, ${T.lcm} = ${l}`;
  }

  // ---------- події ----------
  let timer = null;
  input?.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => calculate({ silent: true }), 350);
  });
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) calculate();
  });

  btnCalc?.addEventListener("click", () => calculate());

  btnReset?.addEventListener("click", () => {
    if (input) input.value = "";
    lastCopy = "";
    setResult(T.enterInputs, "");
    setToast(T.resetDone);
    setTimeout(() => setToast(""), 1200);
  });

  btnCopy?.addEventListener("click", async () => {
    if (!lastCopy) {
      setToast(T.nothing);
      return;
    }
    try {
      await navigator.clipboard.writeText(lastCopy);
      setToast(T.copied);
    } catch {
      setToast(T.copyFail);
    }
    setTimeout(() => setToast(""), 1500);
  });

  setResult(T.enterInputs, "");
})();
