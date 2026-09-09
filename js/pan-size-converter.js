(() => {
  const el = (id) => document.getElementById(id);

  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();
  const LOCALE = LANG === "en" ? "en-US" : "uk-UA";

  const parseNum = (val) => {
    if (val == null) return 0;
    const s = String(val).replace(/\s+/g, "").replace(/,/g, ".").replace(/[^\d.]/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  const fmt = (n) => Number.isFinite(n) ? n.toLocaleString(LOCALE, { maximumFractionDigits: 2 }) : "—";

  const T = LANG === "en" ? {
    enterInputs: "Enter both pan dimensions.",
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    scaleFactor: "Scaling factor",
    origArea: "Original pan area",
    newArea: "New pan area",
    useMore: "Use more batter/filling",
    useLess: "Use less batter/filling",
    same: "Same amount — pans are equal in area",
  } : {
    enterInputs: "Введи дані обох форм.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    scaleFactor: "Коефіцієнт масштабування",
    origArea: "Площа оригінальної форми",
    newArea: "Площа нової форми",
    useMore: "Використовуй більше тіста/начинки",
    useLess: "Використовуй менше тіста/начинки",
    same: "Однакова кількість — площі форм рівні",
  };

  // ---------- DOM ----------
  const origShape = el("origShape");
  const newShape = el("newShape");

  const origDiameterWrap = el("origDiameterWrap");
  const origSideWrap = el("origSideWrap");
  const origLenWrap = el("origLenWrap");
  const origWidWrap = el("origWidWrap");

  const newDiameterWrap = el("newDiameterWrap");
  const newSideWrap = el("newSideWrap");
  const newLenWrap = el("newLenWrap");
  const newWidWrap = el("newWidWrap");

  const origDiameter = el("origDiameter");
  const origSide = el("origSide");
  const origLen = el("origLen");
  const origWid = el("origWid");

  const newDiameter = el("newDiameter");
  const newSide = el("newSide");
  const newLen = el("newLen");
  const newWid = el("newWid");

  const btnCalc = el("btnCalc");
  const btnCopy = el("btnCopy");

  const toast = el("mToast");
  const resultEl = el("mResult");
  const detailsEl = el("mDetails");

  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };
  const setResult = (mainText, extraHtml = "") => {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  };

  function applyShapeUI(shape, wraps) {
    wraps.diameter.style.display = shape === "round" ? "" : "none";
    wraps.side.style.display = shape === "square" ? "" : "none";
    wraps.len.style.display = shape === "rect" ? "" : "none";
    wraps.wid.style.display = shape === "rect" ? "" : "none";
  }

  function getArea(shape, vals) {
    if (shape === "round") {
      const r = vals.diameter / 2;
      return Math.PI * r * r;
    }
    if (shape === "square") {
      return vals.side * vals.side;
    }
    return vals.len * vals.wid;
  }

  function calc() {
    const oShape = origShape?.value || "round";
    const nShape = newShape?.value || "square";

    const oVals = {
      diameter: parseNum(origDiameter?.value),
      side: parseNum(origSide?.value),
      len: parseNum(origLen?.value),
      wid: parseNum(origWid?.value),
    };
    const nVals = {
      diameter: parseNum(newDiameter?.value),
      side: parseNum(newSide?.value),
      len: parseNum(newLen?.value),
      wid: parseNum(newWid?.value),
    };

    const oArea = getArea(oShape, oVals);
    const nArea = getArea(nShape, nVals);

    if (!(oArea > 0) || !(nArea > 0)) {
      setResult(T.enterInputs, "");
      return;
    }

    const factor = nArea / oArea;
    let note;
    if (factor > 1.02) note = T.useMore;
    else if (factor < 0.98) note = T.useLess;
    else note = T.same;

    setResult(
      `${T.scaleFactor}: ×${fmt(factor)}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.origArea}</div>
            <div class="m-kpi__v">${fmt(oArea)} cm²</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.newArea}</div>
            <div class="m-kpi__v">${fmt(nArea)} cm²</div>
          </div>
        </div>
        <div class="m-summary" style="margin-top:10px;">${note}</div>
      `
    );
  }

  async function copyResult() {
    const txt = (resultEl?.textContent || "").trim();
    if (!txt) return;
    try {
      await navigator.clipboard.writeText(txt);
      setToast(T.copied);
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(T.copyFailed);
    }
  }

  // ---------- events ----------
  origShape?.addEventListener("change", () => {
    applyShapeUI(origShape.value, {
      diameter: origDiameterWrap, side: origSideWrap, len: origLenWrap, wid: origWidWrap,
    });
    calc();
  });
  newShape?.addEventListener("change", () => {
    applyShapeUI(newShape.value, {
      diameter: newDiameterWrap, side: newSideWrap, len: newLenWrap, wid: newWidWrap,
    });
    calc();
  });

  [origDiameter, origSide, origLen, origWid, newDiameter, newSide, newLen, newWid].forEach(x =>
    x?.addEventListener("input", calc)
  );

  btnCalc?.addEventListener("click", calc);
  btnCopy?.addEventListener("click", copyResult);

  document.addEventListener("keydown", (e) => { if (e.key === "Enter") calc(); });

  // ---------- init ----------
  applyShapeUI(origShape?.value || "round", {
    diameter: origDiameterWrap, side: origSideWrap, len: origLenWrap, wid: origWidWrap,
  });
  applyShapeUI(newShape?.value || "square", {
    diameter: newDiameterWrap, side: newSideWrap, len: newLenWrap, wid: newWidWrap,
  });
  setResult(T.enterInputs, "");
})();