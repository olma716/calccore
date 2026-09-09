(() => {
  const el = (id) => document.getElementById(id);

  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();

  const T = LANG === "en" ? {
    placeholder: "Enter a link or text to generate a QR code.",
  } : {
    placeholder: "Введи посилання чи текст, щоб згенерувати QR-код.",
  };

  // ---------- DOM ----------
  const qrText = el("qrText");
  const qrSize = el("qrSize");
  const qrCanvasWrap = el("qrCanvasWrap");
  const btnDownload = el("btnDownload");

  let qrInstance = null;
  let debounceTimer = null;

  function showPlaceholder() {
    qrCanvasWrap.innerHTML = `<div class="qr-placeholder">${T.placeholder}</div>`;
    btnDownload.style.display = "none";
  }

  function generate() {
    const text = qrText?.value.trim();
    const size = Number(qrSize?.value) || 300;

    if (!text) {
      showPlaceholder();
      return;
    }

    qrCanvasWrap.innerHTML = "";

    if (typeof QRCode === "undefined") {
      qrCanvasWrap.innerHTML = `<div class="qr-placeholder">Loading...</div>`;
      return;
    }

    qrInstance = new QRCode(qrCanvasWrap, {
      text: text,
      width: size,
      height: size,
      correctLevel: QRCode.CorrectLevel.M,
    });

    btnDownload.style.display = "";
  }

  function scheduleGenerate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(generate, 300);
  }

  function downloadQR() {
    const img = qrCanvasWrap.querySelector("img");
    const canvas = qrCanvasWrap.querySelector("canvas");

    let dataUrl = null;
    if (canvas) {
      dataUrl = canvas.toDataURL("image/png");
    } else if (img) {
      dataUrl = img.src;
    }

    if (!dataUrl) return;

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "qrcode.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // ---------- events ----------
  qrText?.addEventListener("input", scheduleGenerate);
  qrSize?.addEventListener("change", generate);
  btnDownload?.addEventListener("click", downloadQR);

  // ---------- init ----------
  showPlaceholder();

  // wait for QRCode library to load (it's loaded with defer, may arrive after this script)
  const checkLib = setInterval(() => {
    if (typeof QRCode !== "undefined") {
      clearInterval(checkLib);
    }
  }, 100);
})();