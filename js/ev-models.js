/* Список електромобілів для калькулятора зарядки: підставляє лише ємність батареї.
   kwh — корисна (нетто) ємність, кВт⋅год, ОРІЄНТОВНО: за відкритими джерелами
   (EV Database, EVKX, ArenaEV, Wikipedia, оголошення AUTO.RIA); перевірено станом на 2026-10-20.
   conf: "ok" — джерела збігаються; "approx" — джерела розходяться або виробник цифр не публікує
   (Tesla, китайські моделі, різні роки й комплектації) — у калькуляторі показується попередження.
   Потужності AC/DC та витрата авто навмисно не підставляються: вони залежать від року, ринку й комплектації. */
window.EV_MODELS = [
  { id: "tesla-model-y-lr", make: "Tesla", name: "Model Y Long Range (2020–2023)", kwh: 72, conf: "approx" },
  { id: "nissan-leaf-24", make: "Nissan", name: "Leaf 24 kWh (2013–2017)", kwh: 22, conf: "ok" },
  { id: "nissan-leaf-30", make: "Nissan", name: "Leaf 30 kWh (2016–2017)", kwh: 28, conf: "approx" },
  { id: "nissan-leaf-40", make: "Nissan", name: "Leaf 40 kWh (2018+)", kwh: 36, conf: "approx" },
  { id: "nissan-leaf-62", make: "Nissan", name: "Leaf e+ 62 kWh", kwh: 58, conf: "ok" },
  { id: "tesla-model-3-lr", make: "Tesla", name: "Model 3 Long Range (2019–2023)", kwh: 75, conf: "approx" },
  { id: "tesla-model-3-sr", make: "Tesla", name: "Model 3 Standard Range Plus (2019–2022)", kwh: 52, conf: "approx" },
  { id: "tesla-model-s-100d", make: "Tesla", name: "Model S 100D", kwh: 95, conf: "approx" },
  { id: "chevrolet-bolt-60", make: "Chevrolet", name: "Bolt EV (2017–2021)", kwh: 57, conf: "approx" },
  { id: "chevrolet-bolt-65", make: "Chevrolet", name: "Bolt EV / EUV (2022–2023)", kwh: 62, conf: "approx" },
  { id: "kia-niro-ev-64", make: "Kia", name: "Niro EV / e-Niro 64 kWh", kwh: 64, conf: "ok" },
  { id: "kia-soul-ev-64", make: "Kia", name: "Soul EV 64 kWh", kwh: 64, conf: "ok" },
  { id: "kia-ev6-lr", make: "Kia", name: "EV6 Long Range (77.4 kWh)", kwh: 74, conf: "approx" },
  { id: "hyundai-kona-39", make: "Hyundai", name: "Kona Electric 39 kWh", kwh: 39, conf: "ok" },
  { id: "hyundai-kona-64", make: "Hyundai", name: "Kona Electric 64 kWh", kwh: 64, conf: "ok" },
  { id: "hyundai-ioniq-28", make: "Hyundai", name: "Ioniq Electric 28 kWh", kwh: 28, conf: "ok" },
  { id: "hyundai-ioniq-5", make: "Hyundai", name: "Ioniq 5 (72.6 kWh)", kwh: 70, conf: "approx" },
  { id: "vw-e-golf", make: "Volkswagen", name: "e-Golf 35.8 kWh (2017–2020)", kwh: 32, conf: "ok" },
  { id: "vw-id3-pro", make: "Volkswagen", name: "ID.3 Pro (58 kWh)", kwh: 58, conf: "ok" },
  { id: "vw-id4-pro", make: "Volkswagen", name: "ID.4 Pro (77 kWh)", kwh: 77, conf: "ok" },
  { id: "bmw-i3-94", make: "BMW", name: "i3 94 Ah (2016–2018)", kwh: 27.2, conf: "ok" },
  { id: "bmw-i3-120", make: "BMW", name: "i3 120 Ah (2018–2022)", kwh: 37.9, conf: "ok" },
  { id: "renault-zoe-40", make: "Renault", name: "Zoe Z.E. 40", kwh: 41, conf: "ok" },
  { id: "audi-e-tron-55", make: "Audi", name: "e-tron 55 quattro", kwh: 86.5, conf: "ok" },
  { id: "jaguar-i-pace", make: "Jaguar", name: "I-Pace EV400", kwh: 84.7, conf: "ok" },
  { id: "skoda-enyaq-80", make: "Škoda", name: "Enyaq iV 80", kwh: 77, conf: "ok" },
  { id: "ford-mach-e-er", make: "Ford", name: "Mustang Mach-E Extended Range", kwh: 91, conf: "approx" },
  { id: "byd-sea-lion-06", make: "BYD", name: "Sea Lion 06 EV (78.7 kWh)", kwh: 78.7, conf: "approx" },
  { id: "byd-leopard-3", make: "BYD", name: "Leopard 3", kwh: 72.9, conf: "approx" },
  { id: "zeekr-001", make: "Zeekr", name: "001 (100 kWh)", kwh: 100, conf: "approx" }
];
