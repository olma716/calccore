(() => {
  const el = (id) => document.getElementById(id);

  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();
  const LOCALE = LANG === "en" ? "en-US" : "uk-UA";

  const T = {
    err: LANG === "en" ? "Error" : "Помилка",
    cleared: LANG === "en" ? "Cleared." : "Скинуто.",
    memSaved: LANG === "en" ? "Saved to memory." : "Збережено в пам'ять.",
    memAdded: LANG === "en" ? "Added to memory." : "Додано до пам'яті.",
    memSub: LANG === "en" ? "Subtracted from memory." : "Віднято з пам'яті.",
    memCleared: LANG === "en" ? "Memory cleared." : "Пам'ять очищено.",
    memRecalled: LANG === "en" ? "Memory recalled." : "Пам'ять викликано.",
    copied: LANG === "en" ? "Result copied." : "Скопійовано результат.",
    copyFailed: LANG === "en" ? "Copy failed." : "Не вдалося скопіювати.",
    nothingToCopy: LANG === "en" ? "Nothing to copy." : "Немає що копіювати.",
    historyCleared: LANG === "en" ? "History cleared." : "Історію очищено.",
    historyEmpty: LANG === "en" ? "No calculations yet." : "Ще немає обчислень.",
  };

  const LS_HISTORY = "cc_calc_history_v1";
  const MAX_HISTORY = 30;

  // ---------- DOM ----------
  const exprEl = el("calcExpr");
  const resultEl = el("calcResult");
  const toastEl = el("calcToast");
  const historyList = el("historyList");

  const modeDeg = el("modeDeg");
  const modeRad = el("modeRad");
  const invToggle = el("invToggle");

  const btnCopyResult = el("btnCopyResult");
  const btnClearHistory = el("btnClearHistory");

  // ---------- state ----------
  let tokens = []; // { disp, raw }
  let memory = 0;
  let lastResult = null;
  let deg = true;
  let invActive = false;

  // ---------- helpers ----------
  const setToast = (msg) => { if (toastEl) toastEl.textContent = msg || ""; };
  const clearToastSoon = () => setTimeout(() => setToast(""), 1400);

  function fmt(n) {
    if (!Number.isFinite(n)) return T.err;
    if (Math.abs(n) < 1e-12) n = 0;
    const rounded = Math.round(n * 1e10) / 1e10;
    return rounded.toLocaleString(LOCALE, { maximumFractionDigits: 10 });
  }

  function dispString() { return tokens.map(t => t.disp).join(""); }
  function rawString() { return tokens.map(t => t.raw).join(""); }

  function push(disp, raw) { tokens.push({ disp, raw: raw ?? disp }); renderLive(); }

  function wrapTrailingNumber(dispFn, rawFn) {
    // capture contiguous trailing digit/dot tokens (a number literal)
    let i = tokens.length - 1;
    while (i >= 0 && /^[0-9.]$/.test(tokens[i].raw) && tokens[i].raw.length === 1) i--;
    const start = i + 1;
    if (start >= tokens.length) {
      // no trailing number — just insert an empty function call
      push(dispFn + "()", rawFn + "()");
      return;
    }
    const captured = tokens.slice(start);
    const capDisp = captured.map(t => t.disp).join("");
    const capRaw = captured.map(t => t.raw).join("");
    tokens.length = start;
    tokens.push({ disp: dispFn + "(" + capDisp + ")", raw: rawFn + "(" + capRaw + ")" });
    renderLive();
  }

  // ---------- eval scope ----------
  function makeScope() {
    const d2r = (x) => (deg ? (x * Math.PI) / 180 : x);
    const r2d = (x) => (deg ? (x * 180) / Math.PI : x);
    return {
      sin: (x) => Math.sin(d2r(x)),
      cos: (x) => Math.cos(d2r(x)),
      tan: (x) => Math.tan(d2r(x)),
      asin: (x) => r2d(Math.asin(x)),
      acos: (x) => r2d(Math.acos(x)),
      atan: (x) => r2d(Math.atan(x)),
      log: (x) => Math.log10 ? Math.log10(x) : Math.log(x) / Math.LN10,
      ln: (x) => Math.log(x),
      sqrt: (x) => Math.sqrt(x),
      fact: (x) => {
        if (!Number.isFinite(x) || x < 0 || Math.abs(x - Math.round(x)) > 1e-9) return NaN;
        x = Math.round(x);
        if (x > 170) return Infinity;
        let r = 1;
        for (let i = 2; i <= x; i++) r *= i;
        return r;
      },
    };
  }

  function balanceParens(raw) {
    let opens = 0;
    for (const ch of raw) { if (ch === "(") opens++; if (ch === ")") opens--; }
    return raw + ")".repeat(Math.max(0, opens));
  }

  function tryEvaluate() {
    const raw = balanceParens(rawString());
    if (!raw.trim()) return null;
    try {
      const scope = makeScope();
      const fn = new Function(
        "sin", "cos", "tan", "asin", "acos", "atan", "log", "ln", "sqrt", "fact",
        "return (" + raw + ")"
      );
      const v = fn(scope.sin, scope.cos, scope.tan, scope.asin, scope.acos, scope.atan, scope.log, scope.ln, scope.sqrt, scope.fact);
      return Number.isFinite(v) ? v : null;
    } catch {
      return null;
    }
  }

  // ---------- render ----------
  function renderLive() {
    exprEl.textContent = dispString() || "0";
    const v = tryEvaluate();
    resultEl.textContent = v !== null ? fmt(v) : "";
  }

  function renderHistory() {
    const items = readHistory();
    if (!items.length) {
      historyList.innerHTML = `<div class="ccalc__historyEmpty">${T.historyEmpty}</div>`;
      return;
    }
    historyList.innerHTML = items.slice().reverse().map((h, idx) => `
      <div class="ccalc__historyItem" data-idx="${items.length - 1 - idx}">
        <div class="ccalc__historyExpr">${h.expr}</div>
        <div class="ccalc__historyResult">= ${h.result}</div>
      </div>
    `).join("");
  }

  function readHistory() {
    try {
      const raw = localStorage.getItem(LS_HISTORY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  function writeHistory(items) {
    try { localStorage.setItem(LS_HISTORY, JSON.stringify(items.slice(-MAX_HISTORY))); } catch {}
  }

  function addHistory(exprDisp, resultStr) {
    const items = readHistory();
    items.push({ expr: exprDisp, result: resultStr });
    writeHistory(items);
    renderHistory();
  }

  // ---------- actions ----------
  function clearAll() {
    tokens = [];
    renderLive();
    setToast(T.cleared);
    clearToastSoon();
  }

  function clearEntry() { tokens = []; renderLive(); }

  function backspace() {
    tokens.pop();
    renderLive();
  }

  function toggleSign() {
    if (!tokens.length) return;
    const raw = rawString();
    if (raw.startsWith("-(") && raw.endsWith(")")) {
      // unwrap
      const inner = dispString().slice(2, -1);
      const innerRaw = raw.slice(2, -1);
      tokens = [{ disp: inner, raw: innerRaw }];
    } else {
      tokens = [{ disp: "-(" + dispString() + ")", raw: "-(" + raw + ")" }];
    }
    renderLive();
  }

  function equals() {
    const v = tryEvaluate();
    if (v === null) {
      setToast(T.err);
      clearToastSoon();
      return;
    }
    const displayExpr = dispString();
    const resStr = fmt(v);
    addHistory(displayExpr, resStr);
    lastResult = v;
    tokens = [{ disp: resStr.replace(/\s/g, ""), raw: String(v) }];
    renderLive();
  }

  function doMemory(action) {
    const v = tryEvaluate();
    const current = v !== null ? v : (lastResult ?? 0);
    if (action === "ms") { memory = current; setToast(T.memSaved); }
    if (action === "mc") { memory = 0; setToast(T.memCleared); }
    if (action === "mplus") { memory += current; setToast(T.memAdded); }
    if (action === "mminus") { memory -= current; setToast(T.memSub); }
    if (action === "mr") {
      const s = String(memory);
      tokens.push({ disp: fmt(memory), raw: s });
      renderLive();
      setToast(T.memRecalled);
    }
    clearToastSoon();
  }

  async function copyResult() {
    const txt = resultEl.textContent.trim() || (lastResult !== null ? fmt(lastResult) : "");
    if (!txt) { setToast(T.nothingToCopy); clearToastSoon(); return; }
    try {
      await navigator.clipboard.writeText(txt);
      setToast(T.copied);
    } catch {
      setToast(T.copyFailed);
    }
    clearToastSoon();
  }

  function clearHistory() {
    writeHistory([]);
    renderHistory();
    setToast(T.historyCleared);
    clearToastSoon();
  }

  // ---------- key dispatch ----------
  function handleKeyToken(key) {
    const map = {
      "+": { disp: "+", raw: "+" },
      "-": { disp: "−", raw: "-" },
      "*": { disp: "×", raw: "*" },
      "/": { disp: "÷", raw: "/" },
      "^": { disp: "^", raw: "**" },
      "(": { disp: "(", raw: "(" },
      ")": { disp: ")", raw: ")" },
      "π": { disp: "π", raw: "Math.PI" },
      "e": { disp: "e", raw: "Math.E" },
      "%": { disp: "%", raw: "/100" },
      ".": { disp: ".", raw: "." },
    };
    if (map[key]) { push(map[key].disp, map[key].raw); return; }
    if (/^[0-9]$/.test(key)) { push(key, key); return; }
  }

  function handleFn(fn, trigType) {
    switch (fn) {
      case "clear": clearAll(); break;
      case "ce": clearEntry(); break;
      case "back": backspace(); break;
      case "sign": toggleSign(); break;
      case "equals": equals(); break;
      case "sq": push("²", "**2"); break;
      case "sqrt": wrapTrailingNumber("√", "sqrt"); break;
      case "inv1x":
        tokens = [{ disp: "1/(" + dispString() + ")", raw: "1/(" + rawString() + ")" }];
        renderLive();
        break;
      case "fact": wrapTrailingNumber("", "fact"); break;
      case "log": wrapTrailingNumber("log", "log"); break;
      case "ln": wrapTrailingNumber("ln", "ln"); break;
      case "trig": {
        const inv = invActive;
        const nameMap = {
          sin: inv ? "asin" : "sin",
          cos: inv ? "acos" : "cos",
          tan: inv ? "atan" : "tan",
        };
        const dispMap = {
          sin: inv ? "sin⁻¹" : "sin",
          cos: inv ? "cos⁻¹" : "cos",
          tan: inv ? "tan⁻¹" : "tan",
        };
        wrapTrailingNumber(dispMap[trigType], nameMap[trigType]);
        break;
      }
      case "mc": case "mr": case "mplus": case "mminus": case "ms":
        doMemory(fn);
        break;
    }
  }

  // ---------- events ----------
  document.querySelectorAll(".ccalc__key").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-key");
      const fn = btn.getAttribute("data-fn");
      const trigType = btn.getAttribute("data-trig");
      if (key) handleKeyToken(key);
      if (fn) handleFn(fn, trigType);
    });
  });

  modeDeg?.addEventListener("click", () => {
    deg = true;
    modeDeg.classList.add("is-active");
    modeRad.classList.remove("is-active");
  });
  modeRad?.addEventListener("click", () => {
    deg = false;
    modeRad.classList.add("is-active");
    modeDeg.classList.remove("is-active");
  });
  invToggle?.addEventListener("click", () => {
    invActive = !invActive;
    invToggle.classList.toggle("is-active", invActive);
  });

  btnCopyResult?.addEventListener("click", copyResult);
  btnClearHistory?.addEventListener("click", clearHistory);

  historyList?.addEventListener("click", (e) => {
    const item = e.target.closest(".ccalc__historyItem");
    if (!item) return;
    const items = readHistory();
    const idx = Number(item.getAttribute("data-idx"));
    const h = items[idx];
    if (!h) return;
    // load numeric result back for continued calculation
    const raw = h.result.replace(/\s/g, "").replace(/,/g, ".");
    const num = Number(raw);
    if (Number.isFinite(num)) {
      tokens = [{ disp: h.result, raw: String(num) }];
      renderLive();
    }
  });

  document.addEventListener("keydown", (e) => {
    const active = document.activeElement;
    if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;

    if (/^[0-9.]$/.test(e.key)) { handleKeyToken(e.key); return; }
    if (["+", "-", "*", "/", "(", ")", "%"].includes(e.key)) { handleKeyToken(e.key); return; }
    if (e.key === "Enter" || e.key === "=") { e.preventDefault(); equals(); return; }
    if (e.key === "Backspace") { backspace(); return; }
    if (e.key === "Escape") { clearAll(); return; }
  });

  // ---------- init ----------
  renderLive();
  renderHistory();
})();