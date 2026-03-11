(() => {
  const $ = (id) => document.getElementById(id);

  const exprEl = $("sciExpression");
  const resultEl = $("sciResult");
  const toastEl = $("sciToast");
  const historyEl = $("sciHistory");

  const HISTORY_KEY = "calccore_scientific_history_v3";
  const MODE_KEY = "calccore_scientific_mode_v3";

  let expression = "";
  let lastAnswer = 0;
  let history = [];
  let angleMode = localStorage.getItem(MODE_KEY) || "DEG";

  function isEN() {
    return (document.documentElement.lang || "").toLowerCase().startsWith("en");
  }

  function t(uk, en) {
    return isEN() ? en : uk;
  }

  function setToast(msg) {
    if (toastEl) toastEl.textContent = msg || "";
  }

  function fmt(n) {
    if (!Number.isFinite(n)) return t("—", "—");
    if (Math.abs(n) < 1e-12) return "0";
    return Number(n.toFixed(12)).toString();
  }

  function updateModeButtons() {
    document.querySelectorAll("[data-mode]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-mode") === angleMode);
    });
  }

  function updateScreen(preview = null) {
    if (exprEl) exprEl.textContent = expression || "0";
    if (resultEl) resultEl.textContent = preview ?? (expression ? "" : "0");
  }

  function saveHistory() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {}
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function renderHistory() {
    if (!historyEl) return;

    if (!history.length) {
      historyEl.innerHTML = `<div class="scicalc-history__empty">${t("Історія порожня.", "History is empty.")}</div>`;
      return;
    }

    historyEl.innerHTML = history
      .slice()
      .reverse()
      .map(
        (item, index) => `
          <div class="scicalc-history-item" data-history-index="${history.length - 1 - index}">
            <div class="scicalc-history-item__expr">${item.expr}</div>
            <div class="scicalc-history-item__res">${item.result}</div>
          </div>
        `
      )
      .join("");
  }

  function toRad(x) {
    return angleMode === "DEG" ? (x * Math.PI) / 180 : x;
  }

  function pushHistory(expr, result) {
    history.push({ expr, result, mode: angleMode });
    if (history.length > 30) history = history.slice(-30);
    saveHistory();
    renderHistory();
  }

  function clearAll() {
    expression = "";
    updateScreen("0");
    setToast("");
  }

  function backspace() {
    expression = expression.slice(0, -1);
    updateScreen();
    calculatePreview();
  }

  function useAns() {
    expression += String(lastAnswer);
    updateScreen();
    calculatePreview();
  }

  function negateCurrent() {
    if (!expression.trim()) {
      expression = "-";
    } else {
      expression = `(-(${expression}))`;
    }
    updateScreen();
    calculatePreview();
  }

  function applyPercent() {
    if (!expression.trim()) return;
    expression = `((${expression})/100)`;
    updateScreen();
    calculatePreview();
  }

  function squareCurrent() {
    if (!expression.trim()) return;
    expression = `((${expression})^2)`;
    updateScreen();
    calculatePreview();
  }

  function inverseCurrent() {
    if (!expression.trim()) return;
    expression = `(1/(${expression}))`;
    updateScreen();
    calculatePreview();
  }

  function absCurrent() {
    if (!expression.trim()) return;
    expression = `abs(${expression})`;
    updateScreen();
    calculatePreview();
  }

  function insertValue(value) {
    if (expression === "0" && /[0-9]/.test(value)) {
      expression = value;
    } else {
      expression += value;
    }
    updateScreen();
    calculatePreview();
  }

  function setMode(mode) {
    angleMode = mode === "RAD" ? "RAD" : "DEG";
    localStorage.setItem(MODE_KEY, angleMode);
    updateModeButtons();
    calculatePreview();
  }

  function calculatePreview() {
    if (!expression.trim()) {
      updateScreen("0");
      return;
    }

    try {
      const value = evaluate(expression);
      updateScreen(fmt(value));
      setToast("");
    } catch {
      updateScreen(t("—", "—"));
    }
  }

  async function copyResult() {
    const text = resultEl?.textContent?.trim();
    if (!text || text === "0" || text === t("—", "—")) {
      setToast(t("Немає що копіювати.", "Nothing to copy."));
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setToast(t("Скопійовано!", "Copied!"));
      setTimeout(() => setToast(""), 1400);
    } catch {
      setToast(t("Не вдалося скопіювати.", "Copy failed."));
    }
  }

  function clearHistory() {
    history = [];
    saveHistory();
    renderHistory();
    setToast(t("Історію очищено.", "History cleared."));
    setTimeout(() => setToast(""), 1200);
  }

  function useLastResult() {
    if (!history.length) {
      setToast(t("Історія порожня.", "History is empty."));
      return;
    }
    const last = history[history.length - 1];
    expression += last.result;
    updateScreen();
    calculatePreview();
  }

  function doEquals() {
    if (!expression.trim()) {
      setToast(t("Введи вираз.", "Enter an expression."));
      return;
    }

    try {
      const value = evaluate(expression);
      const formatted = fmt(value);
      pushHistory(expression, formatted);
      lastAnswer = value;
      expression = formatted;
      updateScreen(formatted);
      setToast("");
    } catch {
      updateScreen(t("—", "—"));
      setToast(
        t(
          "Некоректний вираз або недопустима операція.",
          "Invalid expression or unsupported operation."
        )
      );
    }
  }

  // -----------------------------
  // PARSER V3
  // -----------------------------
  function tokenize(input) {
  const s = String(input || "").replace(/\s+/g, "").replace(/,/g, ".");
  const tokens = [];
  let i = 0;

  const isDigit = (ch) => ch >= "0" && ch <= "9";
  const isLetter = (ch) => /[A-Za-z]/.test(ch);

  while (i < s.length) {
    const ch = s[i];

    if (isDigit(ch) || ch === ".") {
      let start = i;
      let hasDot = ch === ".";
      i++;

      while (i < s.length) {
        const c = s[i];
        if (isDigit(c)) {
          i++;
          continue;
        }
        if (c === "." && !hasDot) {
          hasDot = true;
          i++;
          continue;
        }
        break;
      }

      if (i < s.length && (s[i] === "E" || s[i] === "e")) {
        let j = i + 1;
        if (j < s.length && (s[j] === "+" || s[j] === "-")) j++;
        let hasExpDigits = false;
        while (j < s.length && isDigit(s[j])) {
          hasExpDigits = true;
          j++;
        }
        if (hasExpDigits) i = j;
      }

      const raw = s.slice(start, i);
      const value = Number(raw);
      if (!Number.isFinite(value)) throw new Error("bad_number");
      tokens.push({ type: "number", value });
      continue;
    }

    if (isLetter(ch) || ch === "π") {
      if (ch === "π") {
        tokens.push({ type: "identifier", value: "pi" });
        i++;
        continue;
      }

      let start = i;
      i++;
      while (i < s.length && /[A-Za-z0-9_]/.test(s[i])) i++;
      const name = s.slice(start, i);
      tokens.push({ type: "identifier", value: name });
      continue;
    }

    if ("+-*/^%".includes(ch)) {
      tokens.push({ type: "operator", value: ch });
      i++;
      continue;
    }

    if (ch === "(" || ch === ")") {
      tokens.push({ type: "paren", value: ch });
      i++;
      continue;
    }

    throw new Error("invalid_char");
  }

  return tokens;
}

  function evaluate(input) {
    const tokens = tokenize(input);
    let pos = 0;

    function peek() {
      return tokens[pos] || null;
    }

    function consume() {
      return tokens[pos++] || null;
    }

    function match(type, value = null) {
      const token = peek();
      if (!token) return false;
      if (token.type !== type) return false;
      if (value !== null && token.value !== value) return false;
      pos++;
      return true;
    }

    function expect(type, value = null) {
      const token = consume();
      if (!token || token.type !== type || (value !== null && token.value !== value)) {
        throw new Error("unexpected_token");
      }
      return token;
    }

    function parseExpression() {
      let value = parseTerm();

      while (true) {
        const token = peek();
        if (!token || token.type !== "operator" || (token.value !== "+" && token.value !== "-")) {
          break;
        }
        consume();
        const rhs = parseTerm();
        value = token.value === "+" ? value + rhs : value - rhs;
      }

      return value;
    }

    function parseTerm() {
      let value = parsePower();

      while (true) {
        const token = peek();
        if (!token || token.type !== "operator" || !["*", "/", "%"].includes(token.value)) {
          break;
        }
        consume();
        const rhs = parsePower();

        if (token.value === "*") value *= rhs;
        if (token.value === "/") {
          if (rhs === 0) throw new Error("division_by_zero");
          value /= rhs;
        }
        if (token.value === "%") {
          if (rhs === 0) throw new Error("division_by_zero");
          value %= rhs;
        }
      }

      return value;
    }

    function parsePower() {
      let value = parseUnary();

      const token = peek();
      if (token && token.type === "operator" && token.value === "^") {
        consume();
        const rhs = parsePower(); // right-associative
        value = Math.pow(value, rhs);
      }

      return value;
    }

    function parseUnary() {
      const token = peek();
      if (token && token.type === "operator" && (token.value === "+" || token.value === "-")) {
        consume();
        const value = parseUnary();
        return token.value === "-" ? -value : value;
      }
      return parsePrimary();
    }

    function parsePrimary() {
      const token = peek();
      if (!token) throw new Error("unexpected_end");

      if (token.type === "number") {
        consume();
        return token.value;
      }

      if (token.type === "paren" && token.value === "(") {
        consume();
        const value = parseExpression();
        expect("paren", ")");
        return value;
      }

      if (token.type === "identifier") {
        const name = token.value;
        consume();

        const lower = name.toLowerCase();

        if (lower === "pi") return Math.PI;
        if (lower === "e") return Math.E;
        if (lower === "ans") return lastAnswer;

        if (match("paren", "(")) {
          const arg = parseExpression();
          expect("paren", ")");

          if (lower === "sqrt") {
            if (arg < 0) throw new Error("sqrt_negative");
            return Math.sqrt(arg);
          }
          if (lower === "sin") return Math.sin(toRad(arg));
          if (lower === "cos") return Math.cos(toRad(arg));
          if (lower === "tan") return Math.tan(toRad(arg));
          if (lower === "log") {
            if (arg <= 0) throw new Error("log_domain");
            return Math.log10(arg);
          }
          if (lower === "ln") {
            if (arg <= 0) throw new Error("ln_domain");
            return Math.log(arg);
          }
          if (lower === "abs") return Math.abs(arg);

          throw new Error("unknown_function");
        }

        throw new Error("unexpected_identifier");
      }

      throw new Error("bad_primary");
    }

    const value = parseExpression();

    if (pos !== tokens.length) throw new Error("trailing_tokens");
    if (!Number.isFinite(value)) throw new Error("invalid_result");

    return value;
  }

  // -----------------------------
  // UI events
  // -----------------------------
  document.addEventListener("click", (e) => {
    const modeBtn = e.target.closest("[data-mode]");
    if (modeBtn) {
      setMode(modeBtn.getAttribute("data-mode"));
      return;
    }

    const insertBtn = e.target.closest("[data-insert]");
    if (insertBtn) {
      insertValue(insertBtn.getAttribute("data-insert") || "");
      return;
    }

    const actionBtn = e.target.closest("[data-action]");
    if (actionBtn) {
      const action = actionBtn.getAttribute("data-action");

      if (action === "clear") clearAll();
      if (action === "backspace") backspace();
      if (action === "ans") useAns();
      if (action === "negate") negateCurrent();
      if (action === "percent") applyPercent();
      if (action === "square") squareCurrent();
      if (action === "inverse") inverseCurrent();
      if (action === "abs") absCurrent();
      if (action === "equals") doEquals();
      if (action === "preview") calculatePreview();
      if (action === "copy") copyResult();
      if (action === "clear-history") clearHistory();
      if (action === "use-last") useLastResult();
      return;
    }

    const historyItem = e.target.closest("[data-history-index]");
    if (historyItem) {
      const index = Number(historyItem.getAttribute("data-history-index"));
      const item = history[index];
      if (!item) return;
      expression = item.result;
      updateScreen(item.result);
      calculatePreview();
    }
  });

  document.addEventListener("keydown", (e) => {
    const allowed = "0123456789+-*/().^%";
    if (allowed.includes(e.key)) {
      e.preventDefault();
      insertValue(e.key);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      doEquals();
      return;
    }

    if (e.key === "Backspace") {
      e.preventDefault();
      backspace();
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      clearAll();
    }
  });

  history = loadHistory();
  renderHistory();
  updateModeButtons();
  updateScreen("0");
})();