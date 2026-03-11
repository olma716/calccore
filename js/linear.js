(() => {
  const $ = (id) => document.getElementById(id);

  const toast = $("lToast");
  const result = $("lResult");
  const details = $("lDetails");
  const autoCalcEl = $("autoCalc");

  const aEl = $("la");
  const bEl = $("lb");
  const calcBtn = $("btnCalc");

  function isEN() {
    return (document.documentElement.lang || "").toLowerCase().startsWith("en");
  }

  function t(uk, en) {
    return isEN() ? en : uk;
  }

  function setToast(msg) {
    if (toast) toast.textContent = msg || "";
  }

  function setResult(main, extra = "") {
    if (result) result.textContent = main || "";
    if (details) details.innerHTML = extra || "";
  }

  function initialHint() {
    return t(
      "Введи коефіцієнти та натисни «Розрахувати».",
      "Enter coefficients and click “Calculate”."
    );
  }

  function enterHint() {
    return t("Введи дані.", "Enter values.");
  }

  function parseNum(val) {
    const s = String(val ?? "").trim().replace(",", ".");
    if (!s) return NaN;
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }

  function fmt(n) {
    if (!Number.isFinite(n)) return "—";
    if (Math.abs(n) < 1e-12) return "0";
    return Number(n.toFixed(10)).toString();
  }

  function fmtCoef(n) {
    if (!Number.isFinite(n)) return "";
    if (Math.abs(n) < 1e-12) return "0";
    return Number(n.toFixed(10)).toString();
  }

  function buildEquationText(a, b) {
    const aAbs = Math.abs(a);
    const bAbs = Math.abs(b);

    const aPart = aAbs === 1 ? "x" : `${fmtCoef(aAbs)}x`;
    const bPart = `${fmtCoef(bAbs)}`;
    const signB = b < 0 ? "−" : "+";

    return `${aPart} ${signB} ${bPart} = 0`;
  }

  function buildMoveStepText(a, b) {
    const left = Math.abs(a) === 1 ? (a < 0 ? "-x" : "x") : `${fmt(a)}x`;
    return `${left} = ${fmt(-b)}`;
  }

  function buildStep(title, text) {
    return `
      <div class="lcalc-step">
        <div class="lcalc-step__title">${title}</div>
        <div class="lcalc-step__text">${text}</div>
      </div>
    `;
  }

  function renderResultGrid(items) {
    return `
      <div class="lcalc-result-grid">
        ${items.map((item) => `
          <div class="lcalc-stat">
            <div class="lcalc-stat__label">${item.label}</div>
            <div class="lcalc-stat__value">${item.value}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderXBox(value) {
    return `
      <div class="lcalc-xbox">
        <div class="lcalc-xbox__label">${t("Результат", "Result")}</div>
        <div class="lcalc-xbox__value">x = ${value}</div>
      </div>
    `;
  }

  function solve({ silent = false } = {}) {
    const a = parseNum(aEl?.value);
    const b = parseNum(bEl?.value);

    if (![a, b].every(Number.isFinite)) {
      if (!silent) setToast(t("Введи коректні числа.", "Enter valid numbers."));
      return false;
    }

    const equationText = buildEquationText(a, b);

    // a = 0 cases
    if (Math.abs(a) < 1e-12) {
      if (Math.abs(b) < 1e-12) {
        setResult(
          `${t("Безліч розв’язків", "Infinitely many solutions")} (${equationText})`,
          renderResultGrid([
            { label: "a", value: fmt(a) },
            { label: "b", value: fmt(b) },
            { label: t("Тип", "Type"), value: t("Тотожність", "Identity") }
          ]) +
          buildStep(
            t("Пояснення", "Explanation"),
            t(
              "Рівняння 0 = 0 істинне для будь-якого x, тому воно має безліч розв’язків.",
              "The equation 0 = 0 is true for any x, so it has infinitely many solutions."
            )
          )
        );
        return true;
      }

      setResult(
        `${t("Розв’язків немає", "No solution")} (${equationText})`,
        renderResultGrid([
          { label: "a", value: fmt(a) },
          { label: "b", value: fmt(b) },
          { label: t("Тип", "Type"), value: t("Несумісне", "Inconsistent") }
        ]) +
        buildStep(
          t("Пояснення", "Explanation"),
          t(
            "Якщо a = 0 і b ≠ 0, маємо рівняння виду b = 0, яке є хибним. Тому розв’язків немає.",
            "If a = 0 and b ≠ 0, the equation becomes b = 0, which is false. Therefore, there is no solution."
          )
        )
      );
      return true;
    }

    // normal case
    const x = -b / a;

    const mainText = `${t("Лінійне рівняння розв’язано", "Linear equation solved")} (${equationText})`;

    const extra =
      renderResultGrid([
        { label: "a", value: fmt(a) },
        { label: "b", value: fmt(b) },
        { label: "x", value: fmt(x) }
      ]) +
      `<div class="lcalc-steps">
        ${buildStep(
          t("Крок 1. Записуємо рівняння", "Step 1. Write the equation"),
          equationText
        )}
        ${buildStep(
          t("Крок 2. Переносимо b", "Step 2. Move b"),
          buildMoveStepText(a, b)
        )}
        ${buildStep(
          t("Крок 3. Ділимо на a", "Step 3. Divide by a"),
          `x = ${fmt(-b)} / ${fmt(a)} = <b>${fmt(x)}</b>`
        )}
      </div>` +
      renderXBox(fmt(x));

    setResult(mainText, extra);
    return true;
  }

  calcBtn?.addEventListener("click", () => {
    setToast("");
    solve({ silent: false });
  });

  document.addEventListener("click", async (e) => {
    const exampleBtn = e.target.closest(".lin-example");
    if (exampleBtn) {
      const a = exampleBtn.getAttribute("data-a");
      const b = exampleBtn.getAttribute("data-b");

      if (aEl) aEl.value = a ?? "";
      if (bEl) bEl.value = b ?? "";

      if (isAutoOn()) {
        scheduleAutoCalc();
      } else {
        setToast("");
      }
      return;
    }

    const resetBtn = e.target.closest("[data-reset]");
    if (resetBtn) {
      if (aEl) aEl.value = "";
      if (bEl) bEl.value = "";

      setToast(t("Скинуто.", "Reset done."));
      setResult(enterHint(), "");
      setTimeout(() => setToast(""), 1200);
      return;
    }

    const copyBtn = e.target.closest("[data-copy]");
    if (copyBtn) {
      const text = result?.textContent?.trim();
      if (!text || text === initialHint() || text === enterHint()) {
        setToast(t("Спочатку порахуй результат.", "Calculate first."));
        return;
      }

      try {
        await navigator.clipboard.writeText(text);
        setToast(t("Скопійовано!", "Copied!"));
        setTimeout(() => setToast(""), 1500);
      } catch {
        setToast(t("Не вдалося скопіювати.", "Copy failed."));
      }
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    setToast("");
    solve({ silent: false });
  });

  function isAutoOn() {
    return !!autoCalcEl && autoCalcEl.checked;
  }

  let autoTimer = null;

  function scheduleAutoCalc() {
    if (!isAutoOn()) return;
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => {
      setToast("");
      solve({ silent: true });
    }, 180);
  }

  const root = document.querySelector(".lcalc");
  if (root) {
    root.addEventListener("input", () => scheduleAutoCalc());
    root.addEventListener("change", () => scheduleAutoCalc());
  }

  autoCalcEl?.addEventListener("change", () => {
    setToast("");
    if (autoCalcEl.checked) scheduleAutoCalc();
  });

  setResult(initialHint(), "");
})();