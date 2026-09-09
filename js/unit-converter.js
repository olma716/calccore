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
    if (val == null) return null;
    const s = String(val).replace(/\s+/g, "").replace(/,/g, ".").replace(/[^\d.\-]/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  const fmt = (n) => {
    if (!Number.isFinite(n)) return "—";
    const abs = Math.abs(n);
    const digits = abs >= 100 ? 2 : abs >= 1 ? 4 : 6;
    const rounded = Math.round(n * Math.pow(10, digits)) / Math.pow(10, digits);
    return rounded.toLocaleString(LOCALE, { maximumFractionDigits: digits });
  };

  // Categories: base unit conversion factor (multiply value by factor to get base unit)
  const CATEGORIES = LANG === "en" ? {
    length: {
      label: "Length", base: "m",
      units: [
        { id: "mm", label: "Millimeter (mm)", factor: 0.001 },
        { id: "cm", label: "Centimeter (cm)", factor: 0.01 },
        { id: "m", label: "Meter (m)", factor: 1 },
        { id: "km", label: "Kilometer (km)", factor: 1000 },
        { id: "in", label: "Inch (in)", factor: 0.0254 },
        { id: "ft", label: "Foot (ft)", factor: 0.3048 },
        { id: "yd", label: "Yard (yd)", factor: 0.9144 },
        { id: "mi", label: "Mile (mi)", factor: 1609.344 },
      ],
    },
    weight: {
      label: "Weight", base: "kg",
      units: [
        { id: "mg", label: "Milligram (mg)", factor: 0.000001 },
        { id: "g", label: "Gram (g)", factor: 0.001 },
        { id: "kg", label: "Kilogram (kg)", factor: 1 },
        { id: "t", label: "Metric ton (t)", factor: 1000 },
        { id: "oz", label: "Ounce (oz)", factor: 0.0283495 },
        { id: "lb", label: "Pound (lb)", factor: 0.453592 },
      ],
    },
    volume: {
      label: "Volume", base: "L",
      units: [
        { id: "ml", label: "Milliliter (ml)", factor: 0.001 },
        { id: "l", label: "Liter (L)", factor: 1 },
        { id: "cup", label: "Cup (US)", factor: 0.24 },
        { id: "pt", label: "Pint (US)", factor: 0.473176 },
        { id: "qt", label: "Quart (US)", factor: 0.946353 },
        { id: "gal", label: "Gallon (US)", factor: 3.78541 },
        { id: "floz", label: "Fluid ounce (fl oz)", factor: 0.0295735 },
      ],
    },
    area: {
      label: "Area", base: "m2",
      units: [
        { id: "m2", label: "Square meter (m²)", factor: 1 },
        { id: "km2", label: "Square kilometer (km²)", factor: 1000000 },
        { id: "ha", label: "Hectare (ha)", factor: 10000 },
        { id: "ft2", label: "Square foot (ft²)", factor: 0.092903 },
        { id: "ac", label: "Acre", factor: 4046.86 },
      ],
    },
    speed: {
      label: "Speed", base: "m/s",
      units: [
        { id: "ms", label: "Meter/second (m/s)", factor: 1 },
        { id: "kmh", label: "Kilometer/hour (km/h)", factor: 0.277778 },
        { id: "mph", label: "Mile/hour (mph)", factor: 0.44704 },
        { id: "knot", label: "Knot", factor: 0.514444 },
      ],
    },
  } : {
    length: {
      label: "Довжина", base: "m",
      units: [
        { id: "mm", label: "Міліметр (мм)", factor: 0.001 },
        { id: "cm", label: "Сантиметр (см)", factor: 0.01 },
        { id: "m", label: "Метр (м)", factor: 1 },
        { id: "km", label: "Кілометр (км)", factor: 1000 },
        { id: "in", label: "Дюйм (in)", factor: 0.0254 },
        { id: "ft", label: "Фут (ft)", factor: 0.3048 },
        { id: "yd", label: "Ярд (yd)", factor: 0.9144 },
        { id: "mi", label: "Миля (mi)", factor: 1609.344 },
      ],
    },
    weight: {
      label: "Вага", base: "kg",
      units: [
        { id: "mg", label: "Міліграм (мг)", factor: 0.000001 },
        { id: "g", label: "Грам (г)", factor: 0.001 },
        { id: "kg", label: "Кілограм (кг)", factor: 1 },
        { id: "t", label: "Тонна (т)", factor: 1000 },
        { id: "oz", label: "Унція (oz)", factor: 0.0283495 },
        { id: "lb", label: "Фунт (lb)", factor: 0.453592 },
      ],
    },
    volume: {
      label: "Об'єм", base: "L",
      units: [
        { id: "ml", label: "Мілілітр (мл)", factor: 0.001 },
        { id: "l", label: "Літр (л)", factor: 1 },
        { id: "cup", label: "Склянка (US)", factor: 0.24 },
        { id: "pt", label: "Пінта (US)", factor: 0.473176 },
        { id: "qt", label: "Кварта (US)", factor: 0.946353 },
        { id: "gal", label: "Галон (US)", factor: 3.78541 },
        { id: "floz", label: "Рідинна унція (fl oz)", factor: 0.0295735 },
      ],
    },
    area: {
      label: "Площа", base: "m2",
      units: [
        { id: "m2", label: "Квадратний метр (м²)", factor: 1 },
        { id: "km2", label: "Квадратний кілометр (км²)", factor: 1000000 },
        { id: "ha", label: "Гектар (га)", factor: 10000 },
        { id: "ft2", label: "Квадратний фут (ft²)", factor: 0.092903 },
        { id: "ac", label: "Акр", factor: 4046.86 },
      ],
    },
    speed: {
      label: "Швидкість", base: "m/s",
      units: [
        { id: "ms", label: "Метр/секунда (м/с)", factor: 1 },
        { id: "kmh", label: "Кілометр/година (км/год)", factor: 0.277778 },
        { id: "mph", label: "Миля/година (mph)", factor: 0.44704 },
        { id: "knot", label: "Вузол", factor: 0.514444 },
      ],
    },
  };

  const TEMP_UNITS = LANG === "en"
    ? [{ id: "c", label: "Celsius (°C)" }, { id: "f", label: "Fahrenheit (°F)" }, { id: "k", label: "Kelvin (K)" }]
    : [{ id: "c", label: "Цельсій (°C)" }, { id: "f", label: "Фаренгейт (°F)" }, { id: "k", label: "Кельвін (K)" }];

  function tempToCelsius(val, unit) {
    if (unit === "c") return val;
    if (unit === "f") return (val - 32) * 5 / 9;
    if (unit === "k") return val - 273.15;
  }
  function celsiusTo(val, unit) {
    if (unit === "c") return val;
    if (unit === "f") return val * 9 / 5 + 32;
    if (unit === "k") return val + 273.15;
  }

  // ---------- DOM ----------
  const category = el("category");
  const inputValue = el("inputValue");
  const inputUnit = el("inputUnit");
  const unitResults = el("unitResults");

  function populateUnits() {
    const cat = category?.value || "length";
    if (cat === "temperature") {
      inputUnit.innerHTML = TEMP_UNITS.map(u => `<option value="${u.id}">${u.label}</option>`).join("");
    } else {
      const units = CATEGORIES[cat].units;
      inputUnit.innerHTML = units.map(u => `<option value="${u.id}">${u.label}</option>`).join("");
    }
  }

  function render() {
    const cat = category?.value || "length";
    const val = parseNum(inputValue?.value);
    const unit = inputUnit?.value;

    if (val === null || !unit) {
      unitResults.innerHTML = "";
      return;
    }

    let rows = [];

    if (cat === "temperature") {
      const celsius = tempToCelsius(val, unit);
      rows = TEMP_UNITS.map(u => ({
        label: u.label,
        value: fmt(celsiusTo(celsius, u.id)),
      }));
    } else {
      const units = CATEGORIES[cat].units;
      const fromUnit = units.find(u => u.id === unit);
      const baseValue = val * fromUnit.factor;
      rows = units.map(u => ({
        label: u.label,
        value: fmt(baseValue / u.factor),
      }));
    }

    unitResults.innerHTML = `
      <div class="m-tablewrap" style="margin-top:16px;">
        <table class="m-table" aria-label="Unit conversion results">
          <thead><tr><th>${LANG === "en" ? "Unit" : "Одиниця"}</th><th>${LANG === "en" ? "Value" : "Значення"}</th></tr></thead>
          <tbody>
            ${rows.map(r => `<tr><td>${r.label}</td><td style="font-weight:900;color:#0f4a44;">${r.value}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  // ---------- events ----------
  category?.addEventListener("change", () => { populateUnits(); render(); });
  inputUnit?.addEventListener("change", render);
  inputValue?.addEventListener("input", render);

  // ---------- init ----------
  populateUnits();
  if (inputValue) inputValue.value = "1";
  render();
})();