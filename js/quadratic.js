(() => {
  const $ = (id) => document.getElementById(id);

  const toast = $("qToast");
  const result = $("qResult");
  const details = $("qDetails");
  const autoCalcEl = $("autoCalc");

  const aEl = $("qa");
  const bEl = $("qb");
  const cEl = $("qc");
  const calcBtn = $("btnCalc");

  function isEN() {
    return (document.documentElement.lang || "").toLowerCase().startsWith("en");
  }

  function t(uk, en) {
    return isEN() ? en : uk;
  }

  function setToast(msg) {
    if (!toast) return;
    toast.textContent = msg || "";
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

  function buildEquationText(a, b, c) {
    const aAbs = Math.abs(a);
    const bAbs = Math.abs(b);
    const cAbs = Math.abs(c);

    const aPart = aAbs === 1 ? "x²" : `${fmtCoef(aAbs)}x²`;
    const bPart = bAbs === 1 ? "x" : `${fmtCoef(bAbs)}x`;
    const cPart = `${fmtCoef(cAbs)}`;

    const signB = b < 0 ? "−" : "+";
    const signC = c < 0 ? "−" : "+";

    return `${aPart} ${signB} ${bPart} ${signC} ${cPart} = 0`;
  }

  function buildStep(title, text) {
    return `
      <div class="qcalc-step">
        <div class="qcalc-step__title">${title}</div>
        <div class="qcalc-step__text">${text}</div>
      </div>
    `;
  }

  function renderResultGrid(items) {
    return `
      <div class="qcalc-result-grid">
        ${items.map((item) => `
          <div class="qcalc-stat">
            <div class="qcalc-stat__label">${item.label}</div>
            <div class="qcalc-stat__value">${item.value}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function solve({ silent = false } = {}) {
    const a = parseNum(aEl?.value);
    const b = parseNum(bEl?.value);
    const c = parseNum(cEl?.value);

    if (![a, b, c].every(Number.isFinite)) {
      if (!silent) setToast(t("Введи коректні числа.", "Enter valid numbers."));
      return false;
    }

    if (Math.abs(a) < 1e-12) {
      if (!silent) {
        setToast(
          t(
            "Коефіцієнт a не може дорівнювати 0.",
            "Coefficient a cannot be 0."
          )
        );
      }

      setResult(
        t("Це не квадратне рівняння.", "This is not a quadratic equation."),
        buildStep(
          t("Пояснення", "Explanation"),
          t(
            "Якщо a = 0, рівняння <b>ax² + bx + c = 0</b> стає лінійним. Для такого випадку краще використати калькулятор лінійного рівняння.",
            "If a = 0, the equation <b>ax² + bx + c = 0</b> becomes linear. In that case, use a linear equation solver."
          )
        )
      );
      return false;
    }

    const equationText = buildEquationText(a, b, c);

    const D = b * b - 4 * a * c;
    const twoA = 2 * a;

    const commonSteps = [
      buildStep(
        t("Крок 1. Підстановка коефіцієнтів", "Step 1. Substitute coefficients"),
        `a = <b>${fmt(a)}</b>, b = <b>${fmt(b)}</b>, c = <b>${fmt(c)}</b>`
      ),
      buildStep(
        t("Крок 2. Обчислюємо дискримінант", "Step 2. Calculate the discriminant"),
        `D = b² − 4ac = (${fmt(b)})² − 4·${fmt(a)}·${fmt(c)} = <b>${fmt(D)}</b>`
      )
    ];

    let mainText = "";
    let extra = "";

    if (D > 1e-12) {
      const sqrtD = Math.sqrt(D);
      const x1 = (-b + sqrtD) / twoA;
      const x2 = (-b - sqrtD) / twoA;

      mainText = `${t("Два дійсні корені", "Two real roots")} (${equationText})`;

      extra =
        renderResultGrid([
          { label: "D", value: fmt(D) },
          { label: "x₁", value: fmt(x1) },
          { label: "x₂", value: fmt(x2) }
        ]) +
        `<div class="qcalc-steps">
          ${commonSteps.join("")}
          ${buildStep(
            t("Крок 3. Знаходимо корені", "Step 3. Find the roots"),
            `x₁ = (-b + √D) / (2a) = (${fmt(-b)} + √${fmt(D)}) / ${fmt(twoA)} = <b>${fmt(x1)}</b><br>
             x₂ = (-b - √D) / (2a) = (${fmt(-b)} - √${fmt(D)}) / ${fmt(twoA)} = <b>${fmt(x2)}</b>`
          )}
        </div>`;
    } else if (Math.abs(D) <= 1e-12) {
      const x = -b / twoA;

      mainText = `${t("Один дійсний корінь", "One real root")} (${equationText})`;

      extra =
        renderResultGrid([
          { label: "D", value: fmt(D) },
          { label: "x", value: fmt(x) },
          { label: t("Тип", "Type"), value: t("Подвійний корінь", "Double root") }
        ]) +
        `<div class="qcalc-steps">
          ${commonSteps.join("")}
          ${buildStep(
            t("Крок 3. Знаходимо корінь", "Step 3. Find the root"),
            `x = -b / (2a) = ${fmt(-b)} / ${fmt(twoA)} = <b>${fmt(x)}</b>`
          )}
        </div>`;
    } else {
      mainText = `${t("Дійсних коренів немає", "No real roots")} (${equationText})`;

      extra =
        renderResultGrid([
          { label: "D", value: fmt(D) },
          { label: t("Корені", "Roots"), value: t("Немає дійсних", "No real roots") },
          { label: t("Тип", "Type"), value: t("Комплексні", "Complex") }
        ]) +
        `<div class="qcalc-steps">
          ${commonSteps.join("")}
          ${buildStep(
            t("Крок 3. Аналіз результату", "Step 3. Analyze the result"),
            t(
              "Оскільки <b>D &lt; 0</b>, квадратне рівняння не має дійсних коренів.",
              "Since <b>D &lt; 0</b>, the quadratic equation has no real roots."
            )
          )}
        </div>`;
    }

    setResult(mainText, extra);
    return true;
  }

  calcBtn?.addEventListener("click", () => {
    setToast("");
    solve({ silent: false });
  });

  document.addEventListener("click", async (e) => {
    const exampleBtn = e.target.closest(".quad-example");
    if (exampleBtn) {
      const a = exampleBtn.getAttribute("data-a");
      const b = exampleBtn.getAttribute("data-b");
      const c = exampleBtn.getAttribute("data-c");

      if (aEl) aEl.value = a ?? "";
      if (bEl) bEl.value = b ?? "";
      if (cEl) cEl.value = c ?? "";

      scheduleAutoCalc();
      return;
    }

    const fillBtn = e.target.closest("[data-fill]");
    if (fillBtn) {
      const raw = fillBtn.getAttribute("data-fill") || "";
      const parts = raw.split(",");
      if (parts.length === 3) {
        if (aEl) aEl.value = parts[0];
        if (bEl) bEl.value = parts[1];
        if (cEl) cEl.value = parts[2];
        scheduleAutoCalc();
      }
      return;
    }

    const resetBtn = e.target.closest("[data-reset]");
    if (resetBtn) {
      if (aEl) aEl.value = "";
      if (bEl) bEl.value = "";
      if (cEl) cEl.value = "";

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

  const root = document.querySelector(".qcalc");
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