(() => {
  const $ = (id) => document.getElementById(id);

  const toast = $("sToast");
  const result = $("sResult");
  const details = $("sDetails");
  const autoCalcEl = $("autoCalc");
  const calcBtn = $("btnCalc");

  const ids = ["a1", "b1", "c1", "a2", "b2", "c2"];
  const els = Object.fromEntries(ids.map((id) => [id, $(id)]));

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
    if (result) result.innerHTML = main || "";
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

  function buildEqText(a, b, c) {
    const aAbs = Math.abs(a);
    const bAbs = Math.abs(b);

    const aPart = aAbs === 1 ? "x" : `${fmtCoef(aAbs)}x`;
    const bPart = bAbs === 1 ? "y" : `${fmtCoef(bAbs)}y`;

    const signB = b < 0 ? "−" : "+";
    const cPart = fmt(c);

    return `${aPart} ${signB} ${bPart} = ${cPart}`;
  }

  function buildSystemText(a1, b1, c1, a2, b2, c2) {
    return `
      <div class="scalc-systemPlain">
        <div class="scalc-systemPlain__line">${buildEqText(a1, b1, c1)}</div>
        <div class="scalc-systemPlain__line">${buildEqText(a2, b2, c2)}</div>
      </div>
    `;
  }

  function buildStep(title, text) {
    return `
      <div class="scalc-step">
        <div class="scalc-step__title">${title}</div>
        <div class="scalc-step__text">${text}</div>
      </div>
    `;
  }

  function renderResultGrid(items) {
    return `
      <div class="scalc-result-grid">
        ${items.map((item) => `
          <div class="scalc-stat">
            <div class="scalc-stat__label">${item.label}</div>
            <div class="scalc-stat__value">${item.value}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderXYBox(x, y) {
    return `
      <div class="scalc-xybox">
        <div class="scalc-xybox__label">${t("Результат", "Result")}</div>
        <div class="scalc-xybox__row">
          <div class="scalc-xybox__value">x = ${x}</div>
          <div class="scalc-xybox__value">y = ${y}</div>
        </div>
      </div>
    `;
  }

  function solve({ silent = false } = {}) {
    const vals = {};
    for (const id of ids) {
      vals[id] = parseNum(els[id]?.value);
    }

    if (!ids.every((id) => Number.isFinite(vals[id]))) {
      if (!silent) setToast(t("Введи коректні числа.", "Enter valid numbers."));
      return false;
    }

    const { a1, b1, c1, a2, b2, c2 } = vals;

    const systemText = buildSystemText(a1, b1, c1, a2, b2, c2);

    const D = a1 * b2 - a2 * b1;
    const Dx = c1 * b2 - c2 * b1;
    const Dy = a1 * c2 - a2 * c1;

    const common =
      buildStep(
        t("Крок 1. Записуємо систему", "Step 1. Write the system"),
        `${buildEqText(a1, b1, c1)}<br>${buildEqText(a2, b2, c2)}`
      ) +
      buildStep(
        t("Крок 2. Обчислюємо визначники", "Step 2. Calculate determinants"),
        `D = a₁b₂ − a₂b₁ = ${fmt(a1)}·${fmt(b2)} − ${fmt(a2)}·${fmt(b1)} = <b>${fmt(D)}</b><br>
         Dx = c₁b₂ − c₂b₁ = ${fmt(c1)}·${fmt(b2)} − ${fmt(c2)}·${fmt(b1)} = <b>${fmt(Dx)}</b><br>
         Dy = a₁c₂ − a₂c₁ = ${fmt(a1)}·${fmt(c2)} − ${fmt(a2)}·${fmt(c1)} = <b>${fmt(Dy)}</b>`
      );

    if (Math.abs(D) > 1e-12) {
      const x = Dx / D;
      const y = Dy / D;

      const main = `
        <div class="scalc-mainTitle">${t("Систему розв’язано", "System solved")}</div>
        <div class="scalc-system-wrapper">
          ${systemText}
        </div>
      `;

      const extra =
        renderResultGrid([
          { label: "D", value: fmt(D) },
          { label: "Dx", value: fmt(Dx) },
          { label: "Dy", value: fmt(Dy) }
        ]) +
        `<div class="scalc-steps">
          ${common}
          ${buildStep(
            t("Крок 3. Знаходимо x та y", "Step 3. Find x and y"),
            `x = Dx / D = ${fmt(Dx)} / ${fmt(D)} = <b>${fmt(x)}</b><br>
             y = Dy / D = ${fmt(Dy)} / ${fmt(D)} = <b>${fmt(y)}</b>`
          )}
        </div>` +
        renderXYBox(fmt(x), fmt(y));

      setResult(main, extra);
      return true;
    }

    if (Math.abs(Dx) <= 1e-12 && Math.abs(Dy) <= 1e-12) {
      const main = `
        <div class="scalc-mainTitle">${t("Безліч розв’язків", "Infinitely many solutions")}</div>
        <div class="scalc-system-wrapper">
          ${systemText}
        </div>
      `;

      const extra =
        renderResultGrid([
          { label: "D", value: fmt(D) },
          { label: "Dx", value: fmt(Dx) },
          { label: "Dy", value: fmt(Dy) }
        ]) +
        `<div class="scalc-steps">
          ${common}
          ${buildStep(
            t("Крок 3. Аналіз результату", "Step 3. Analyze the result"),
            t(
              "Оскільки <b>D = 0</b>, <b>Dx = 0</b> і <b>Dy = 0</b>, система має безліч розв’язків.",
              "Since <b>D = 0</b>, <b>Dx = 0</b>, and <b>Dy = 0</b>, the system has infinitely many solutions."
            )
          )}
        </div>`;

      setResult(main, extra);
      return true;
    }

    const main = `
      <div class="scalc-mainTitle">${t("Розв’язків немає", "No solution")}</div>
      <div class="scalc-system-wrapper">
        ${systemText}
      </div>
    `;

    const extra =
      renderResultGrid([
        { label: "D", value: fmt(D) },
        { label: "Dx", value: fmt(Dx) },
        { label: "Dy", value: fmt(Dy) }
      ]) +
      `<div class="scalc-steps">
        ${common}
        ${buildStep(
          t("Крок 3. Аналіз результату", "Step 3. Analyze the result"),
          t(
            "Оскільки <b>D = 0</b>, але хоча б один із <b>Dx</b> або <b>Dy</b> не дорівнює нулю, система не має розв’язків.",
            "Since <b>D = 0</b>, but at least one of <b>Dx</b> or <b>Dy</b> is not zero, the system has no solution."
          )
        )}
      </div>`;

    setResult(main, extra);
    return true;
  }

  calcBtn?.addEventListener("click", () => {
    setToast("");
    solve({ silent: false });
  });

  document.addEventListener("click", async (e) => {
    const exampleBtn = e.target.closest(".sys-example");
    if (exampleBtn) {
      const raw = exampleBtn.getAttribute("data-fill") || "";
      const parts = raw.split(",");
      if (parts.length === 6) {
        ids.forEach((id, i) => {
          if (els[id]) els[id].value = parts[i];
        });
        setToast("");
        solve({ silent: false });
      }
      return;
    }

    const resetBtn = e.target.closest("[data-reset]");
    if (resetBtn) {
      ids.forEach((id) => {
        if (els[id]) els[id].value = "";
      });

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

  const root = document.querySelector(".scalc");
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