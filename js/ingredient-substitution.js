(() => {
  const el = (id) => document.getElementById(id);

  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();

  const DATA = LANG === "en" ? {
    egg: {
      label: "Egg (1 large)",
      subs: [
        { name: "Flax egg", ratio: "1 tbsp ground flax + 3 tbsp water", note: "Let sit 5 min to gel. Works well in muffins, pancakes, dense cakes.", tag: "Vegan" },
        { name: "Mashed banana", ratio: "1/4 cup (60g) mashed", note: "Adds sweetness and banana flavor. Best in muffins and quick breads.", tag: "Vegan" },
        { name: "Unsweetened applesauce", ratio: "1/4 cup (60g)", note: "Keeps baked goods moist. Slightly reduces rise.", tag: "Vegan" },
        { name: "Plain yogurt", ratio: "1/4 cup (60g)", note: "Adds moisture and slight tang. Good for cakes and muffins." },
      ],
    },
    butter: {
      label: "Butter",
      subs: [
        { name: "Vegetable oil", ratio: "3/4 of the amount", note: "E.g. 3/4 cup oil for 1 cup butter. Makes texture denser, less flaky." },
        { name: "Coconut oil", ratio: "1:1", note: "Solid at room temp, works similarly to butter. Adds slight coconut flavor." },
        { name: "Applesauce", ratio: "1:1 (up to half the butter)", note: "Reduces fat, adds moisture. Best combined with some real butter for texture." },
        { name: "Margarine", ratio: "1:1", note: "Closest substitute in baking, similar texture and behavior." },
      ],
    },
    milk: {
      label: "Milk (cow's)",
      subs: [
        { name: "Almond milk", ratio: "1:1", note: "Lighter, slightly nutty flavor. Good for most baking.", tag: "Vegan" },
        { name: "Soy milk", ratio: "1:1", note: "Closest protein content to cow's milk among plant milks.", tag: "Vegan" },
        { name: "Oat milk", ratio: "1:1", note: "Creamy texture, mild flavor, works well in baking.", tag: "Vegan" },
        { name: "Water + butter", ratio: "1 cup water + 1 tbsp butter", note: "Emergency substitute, adds needed fat back." },
      ],
    },
    sugar: {
      label: "Granulated sugar",
      subs: [
        { name: "Honey", ratio: "3/4 cup honey + reduce liquid by 1/4 cup per cup sugar", note: "Adds moisture, lower oven temp by 15°C to prevent over-browning." },
        { name: "Maple syrup", ratio: "3/4 cup + reduce liquid by 3 tbsp per cup sugar", note: "Adds distinct maple flavor and moisture." },
        { name: "Brown sugar", ratio: "1:1", note: "Adds slight molasses flavor and moisture." },
        { name: "Stevia (powder)", ratio: "1 cup sugar = ~1 tsp stevia powder", note: "Much sweeter — start small and adjust to taste. No bulk/moisture contribution." },
      ],
    },
    sour_cream: {
      label: "Sour cream",
      subs: [
        { name: "Plain yogurt", ratio: "1:1", note: "Very close texture and tang, one of the best substitutes." },
        { name: "Cottage cheese (blended)", ratio: "1:1", note: "Blend until smooth first for similar consistency." },
        { name: "Buttermilk", ratio: "3/4 cup per 1 cup sour cream", note: "Thinner consistency, works well in batters." },
      ],
    },
    baking_powder: {
      label: "Baking powder",
      subs: [
        { name: "Baking soda + cream of tartar", ratio: "1/4 tsp baking soda + 1/2 tsp cream of tartar per 1 tsp baking powder", note: "Classic homemade substitute, use immediately after mixing." },
        { name: "Baking soda + lemon juice", ratio: "1/4 tsp baking soda + 1/2 tsp lemon juice per 1 tsp baking powder", note: "Works but adds slight acidity to taste." },
        { name: "Self-rising flour", ratio: "Replace regular flour, skip added baking powder/salt", note: "Only works if recipe already calls for baking powder and salt separately." },
      ],
    },
    buttermilk: {
      label: "Buttermilk",
      subs: [
        { name: "Milk + lemon juice/vinegar", ratio: "1 cup milk + 1 tbsp lemon juice, rest 5-10 min", note: "Most common DIY substitute, works in almost all recipes." },
        { name: "Plain yogurt + milk", ratio: "3/4 cup yogurt + 1/4 cup milk", note: "Slightly thicker, works well in pancakes and muffins." },
      ],
    },
    heavy_cream: {
      label: "Heavy cream",
      subs: [
        { name: "Milk + butter", ratio: "3/4 cup milk + 1/4 cup melted butter", note: "Good for cooking, won't whip into stiff peaks." },
        { name: "Evaporated milk", ratio: "1:1", note: "Lower fat but works in most cooked sauces and soups." },
        { name: "Coconut cream", ratio: "1:1", note: "Adds coconut flavor, can be whipped when chilled.", tag: "Vegan" },
      ],
    },
  } : {
    egg: {
      label: "Яйце (1 велике)",
      subs: [
        { name: "Льняне насіння", ratio: "1 ст. л. меленого льону + 3 ст. л. води", note: "Дай постояти 5 хв для загусання. Добре для мафінів, млинців, щільних тортів.", tag: "Веган" },
        { name: "Пюре з банана", ratio: "1/4 склянки (60г)", note: "Додає солодкості та смак банана. Найкраще у мафінах і швидких хлібах.", tag: "Веган" },
        { name: "Яблучне пюре (без цукру)", ratio: "1/4 склянки (60г)", note: "Зберігає вологість випічки. Трохи зменшує підйом.", tag: "Веган" },
        { name: "Натуральний йогурт", ratio: "1/4 склянки (60г)", note: "Додає вологість і легку кислинку. Добре для тортів і мафінів." },
      ],
    },
    butter: {
      label: "Вершкове масло",
      subs: [
        { name: "Рослинна олія", ratio: "3/4 від кількості", note: "Наприклад 3/4 склянки олії замість 1 склянки масла. Текстура щільніша, менш шарувата." },
        { name: "Кокосова олія", ratio: "1:1", note: "Тверда при кімнатній температурі, поводиться схоже на масло. Додає легкий кокосовий смак." },
        { name: "Яблучне пюре", ratio: "1:1 (до половини кількості масла)", note: "Зменшує вміст жиру, додає вологість. Краще поєднувати з частиною справжнього масла для текстури." },
        { name: "Маргарин", ratio: "1:1", note: "Найближча заміна у випічці, схожа текстура й поведінка." },
      ],
    },
    milk: {
      label: "Молоко (коров'яче)",
      subs: [
        { name: "Мигдальне молоко", ratio: "1:1", note: "Легше, з легким горіховим присмаком. Добре для більшості випічки.", tag: "Веган" },
        { name: "Соєве молоко", ratio: "1:1", note: "Найближчий вміст білка до коров'ячого молока серед рослинних варіантів.", tag: "Веган" },
        { name: "Вівсяне молоко", ratio: "1:1", note: "Кремова текстура, м'який смак, добре працює у випічці.", tag: "Веган" },
        { name: "Вода + масло", ratio: "1 склянка води + 1 ст. л. масла", note: "Екстрений варіант, повертає потрібний жир." },
      ],
    },
    sugar: {
      label: "Цукор-пісок",
      subs: [
        { name: "Мед", ratio: "3/4 склянки меду + зменш рідину на 1/4 склянки на 1 склянку цукру", note: "Додає вологість, зменш температуру духовки на 15°C, щоб уникнути пригорання." },
        { name: "Кленовий сироп", ratio: "3/4 склянки + зменш рідину на 3 ст. л. на 1 склянку цукру", note: "Додає характерний кленовий смак і вологість." },
        { name: "Коричневий цукор", ratio: "1:1", note: "Додає легкий присмак патоки та вологість." },
        { name: "Стевія (порошок)", ratio: "1 склянка цукру = ~1 ч.л. стевії", note: "Значно солодша — почни з малої кількості й коригуй за смаком. Не додає об'єму/вологості." },
      ],
    },
    sour_cream: {
      label: "Сметана",
      subs: [
        { name: "Натуральний йогурт", ratio: "1:1", note: "Дуже близька текстура й кислинка, одна з найкращих замін." },
        { name: "Сир кисломолочний (збитий)", ratio: "1:1", note: "Спочатку збий до однорідності для схожої консистенції." },
        { name: "Кефір", ratio: "3/4 склянки на 1 склянку сметани", note: "Рідша консистенція, добре працює в тісті." },
      ],
    },
    baking_powder: {
      label: "Розпушувач",
      subs: [
        { name: "Сода + винний камінь", ratio: "1/4 ч.л. соди + 1/2 ч.л. винного каменю на 1 ч.л. розпушувача", note: "Класична домашня заміна, використовуй одразу після змішування." },
        { name: "Сода + лимонний сік", ratio: "1/4 ч.л. соди + 1/2 ч.л. лимонного соку на 1 ч.л. розпушувача", note: "Працює, але додає легку кислинку до смаку." },
        { name: "Борошно з розпушувачем (self-rising)", ratio: "Заміни звичайне борошно, пропусти окремий розпушувач/сіль", note: "Працює лише якщо рецепт вже вимагає окремо розпушувач і сіль." },
      ],
    },
    buttermilk: {
      label: "Пахта (buttermilk)",
      subs: [
        { name: "Молоко + лимонний сік/оцет", ratio: "1 склянка молока + 1 ст. л. лимонного соку, постояти 5-10 хв", note: "Найпоширеніша домашня заміна, працює майже в усіх рецептах." },
        { name: "Йогурт + молоко", ratio: "3/4 склянки йогурту + 1/4 склянки молока", note: "Трохи густіше, добре для млинців і мафінів." },
      ],
    },
    heavy_cream: {
      label: "Вершки для збивання (heavy cream)",
      subs: [
        { name: "Молоко + масло", ratio: "3/4 склянки молока + 1/4 склянки розтопленого масла", note: "Добре для готування, не збивається в тверду піну." },
        { name: "Згущене незбиране молоко", ratio: "1:1", note: "Менше жиру, але працює в більшості соусів і супів." },
        { name: "Кокосові вершки", ratio: "1:1", note: "Додає кокосовий смак, можна збити охолодженими.", tag: "Веган" },
      ],
    },
  };

  // ---------- DOM ----------
  const ingredientSelect = el("ingredientSelect");
  const subResults = el("subResults");

  function populateSelect() {
    if (!ingredientSelect) return;
    const keys = Object.keys(DATA);
    ingredientSelect.innerHTML = keys.map(k => `<option value="${k}">${DATA[k].label}</option>`).join("");
    ingredientSelect.value = keys[0];
  }

  function render() {
    const key = ingredientSelect?.value;
    const item = DATA[key];
    if (!item || !subResults) return;

    subResults.innerHTML = item.subs.map(s => `
      <div class="sub-card">
        <div class="sub-card__name">${s.name}</div>
        <div class="sub-card__ratio">${s.ratio}</div>
        ${s.tag ? `<div class="sub-card__tag">${s.tag}</div>` : ""}
        <div class="sub-card__note">${s.note}</div>
      </div>
    `).join("");
  }

  // ---------- events ----------
  ingredientSelect?.addEventListener("change", render);

  // ---------- init ----------
  populateSelect();
  render();
})();