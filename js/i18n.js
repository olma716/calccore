// /js/i18n.js
(() => {
  const langFromHtml = (document.documentElement.lang || "").toLowerCase();
  const langFromPath = location.pathname.startsWith("/en/") ? "en" : "uk";
  const LANG = langFromHtml.startsWith("en") ? "en" : langFromPath;

  const DICT = {
    uk: {
      common: {
        cheaper: "Дешевше",
        calculate: "Розрахувати",
        clear: "Очистити",
        copy: "Скопіювати",
        share: "Поділитись",
        copied: "Скопійовано ✅",
        on: "Увімк",
        off: "Вимк",
        unit_km: "км",
        unit_km_h: "км/год",
        unit_mm: "мм",
        unit_cm: "см",
        unit_l: "л",
        unit_uah: "грн",
        unit_uah_per_km: "грн/км",
        unit_l_per_100_km: "л/100 км",
        unit_kwh: "кВт·год",
        unit_kwh_per_100_km: "кВт·год/100 км",
        unit_m: "м",
      },
      deposit: {
  // NBU
  nbu_badge: "Курс НБУ: USD {usd} / EUR {eur}{datePart}",
  nbu_title: "Курс НБУ (USD/EUR)",
  nbu_unavailable: "Курс НБУ: недоступно",
  toast_nbu_not_loaded_fallback: "Курс НБУ не завантажився — показую UAH.",

  // Result / toasts
  toast_enter_values: "Введи суму та термін.",
  toast_reset: "Скинуто.",
  toast_need_calc_first: "Спочатку зроби розрахунок.",
  copied_result: "Скопійовано результат.",
  copy_failed: "Не вдалося скопіювати.",
  copied_table: "Скопійовано таблицю.",
  copy_table_failed: "Не вдалося скопіювати таблицю.",
  csv_downloaded: "CSV завантажено.",
  result_enter_values: "Введи суму, ставку та термін.",

  // KPI labels
  per_income_net: "Дохід (нетто)",
  kpi_interest_gross: "Відсотки (брутто)",
  kpi_period: "Періодичність",
  kpi_tax: "Податки",
  kpi_tax_rate: "Ставка",
  kpi_interest_net: "Відсотки (нетто)",
  kpi_after_tax: "Після податків",
  kpi_final_balance: "Підсумковий баланс",
  cap_on: "З капіталізацією",
  cap_off: "Без капіталізації",

  // Period labels
  period_daily: "щоденно (365)",
  period_monthly: "щомісячно",

  // Summary
  summary_topups: "Поповнення",
  summary_hint: "У графіку: баланс відображається в ₴ та може бути конвертований у USD/EUR за курсом НБУ.",
},
      import: {
            dash: "—",

            // statuses
            calc_ready: "Розрахунок готовий ✅",
            err_rates_not_ready: "Курси НБУ ще не завантажились. Спробуй ще раз або перезавантаж сторінку.",
            err_car_price: "Заповни коректну ціну авто.",
            link_copied: "Посилання скопійовано ✅",
            copy_link_prompt: "Скопіюй посилання:",
            no_result_to_copy: "Немає результату для копіювання.",
            result_copied: "Результат скопійовано ✅",

            // total subline
            total_sub_customs: "розмитнення: {pct}%",
            total_sub_top: "найбільша стаття: {label}",

            // kpis
            kpi_car: "Ціна авто",
            kpi_delivery: "Доставка",
            kpi_customs: "Розмитнення",
            kpi_cert: "Сертифікація",
            kpi_reg: "Реєстрація",
            kpi_other: "Інше (ТО/комісія/непередбачені)",

            // customs block
            customs_value: "Митна вартість",
            customs_value_sub: "Ціна авто + доставка",
            duty: "Мито (10%)",
            duty_ev_zero: "У цій моделі для EV = 0",
            duty_10pct: "10% від митної вартості",
            excise: "Акциз",
            excise_ev_zero: "Для EV = 0",
            excise_sub: "База: {base}€ • коеф. віку: {age}",
            vat: "ПДВ (20%)",
            vat_sub: "20% від (митна вартість + мито + акциз)",
            customs_total: "Разом розмитнення",
            customs_note:
              "<b>Примітка:</b> модель спрощена для оцінки. Реальні суми можуть залежати від пільг, категорії авто, митної оцінки та документів.",

            // verdict
            verdict_ok_title: "✅ Оцінка “під ключ” готова",
            verdict_ok_hint:
              "Це орієнтовний розрахунок. Реальні суми залежать від документів, митної оцінки, пільг і додаткових послуг.",
            verdict_warn_title: "⚠️ Розмитнення займає велику частку",
            verdict_warn_hint:
              "Якщо сума здається завеликою — перевір обʼєм/рік/тип пального та значення витрат.",
            verdict_short: "Під ключ: ≈ {total}. Розмитнення: {pct}% від загальної суми.",
            verdict_long: "Найбільша стаття: <b>{label}</b> — {money} ({pct}%).",
          },
      customs: {
        mode_ev: "Електро",
        mode_ice: "ДВЗ",

        age_dash: "Вік: —",
        age_years: "Вік: {age}р",

        sub_hint: "Митна вартість: {customs_value_input} → {customs_value_uah} · Акциз: {excise_eur} €",

        link_copied: "Посилання скопійовано ✅",
        link_copy_failed: "Не вдалось скопіювати 😕",
        reset_done: "Скинуто ✅",
      },
      wheels: {
        unit_m: "м",
          hint_enter_and_calc: "Введи дані та натисни «Розрахувати».",

          err_width_mm: "ширина (мм)",
          err_aspect_pct: "профіль (%)",
          err_rim_r: "диск (R)",
          err_fill_correct_size: "Заповни коректно: {fields} для Розміру {n}.",

          kpi_sidewall: "Висота профілю",
          kpi_rim_diameter: "Діаметр диска",
          kpi_wheel_diameter: "Діаметр колеса",

          difference: "Різниця",
          diameter: "Діаметр",
          clearance: "Кліренс",
          circumference: "Окружність",
          speedometer_error: "Похибка спідометра",
          at_100: "при 100 км/год буде ≈",
          explanation:
            "Пояснення: якщо окружність більша — авто проїжджає більше за 1 оберт, тому реальна швидкість вища.",

          single_result: "Розмір 1: {size} • Діаметр: {dia} • Окружність: {circ}",
          compare_line: "Порівняння: {s1} → {s2} ({band})",
          within_2: "в межах ±2%",
          outside_2: "поза межами ±2%",

          verdict_ok_title: "✅ Можна використовувати без ризику",
          verdict_ok_short: "Різниця діаметра: {pct}% (у межах норми).",
          verdict_ok_long:
            "Зміна діаметра складає {pct}%, це в межах допустимого. Похибка спідометра мінімальна, ABS/ESP працюватимуть штатно.",

          verdict_warn_title: "⚠️ Допустимо, але перевір зазори",
          verdict_warn_short: "Різниця діаметра: {pct}% (на межі ±2%).",
          verdict_warn_long:
            "Зміна діаметра {pct}% — на межі правила ±2%. Рекомендується перевірити зазори в арках і при повному вивороті керма.",

          verdict_bad_title: "❌ Не рекомендується (ризик ABS / ESP)",
          verdict_bad_short: "Різниця діаметра: {pct}% (поза межами ±2%).",
          verdict_bad_long:
            "Зміна діаметра {pct}% перевищує допустиму норму ±2%. Це може вплинути на точність спідометра, роботу ABS/ESP та зазори в арках.",

          verdict_hint_bigger:
            "Спідометр буде показувати МЕНШЕ реальної швидкості (~{err}%). Кліренс збільшиться приблизно на {mm} мм.",
          verdict_hint_smaller:
            "Спідометр буде показувати БІЛЬШЕ реальної швидкості (~{err}%). Кліренс зменшиться приблизно на {mm} мм.",
          verdict_hint_same:
            "Діаметр однаковий — кліренс і покази спідометра не зміняться.",
          verdict_seo:
            "Чи можна ставити {s2} замість {s1}? Подивись різницю діаметра, кліренсу та похибку спідометра.",

          link_copied: "Посилання скопійовано ✅",
          copy_link_prompt: "Скопіюй посилання:",
          nothing_to_copy: "Немає результату для копіювання.",
          result_copied: "Результат скопійовано ✅",
          copy_result_prompt: "Скопіюй результат:",
        },

      fuel: {
        fuel_spent: "Витрачено пального",
        energy_spent: "Спожито енергії",
        route_cost: "Вартість маршруту",
        route_cost_total: "Вартість маршруту (разом)",
        route_cost_with_losses: "Вартість маршруту (втрати {loss}%)",
        cost_per_1_km: "Вартість за 1 км",
        cost_100_km: "Вартість 100 км",
        resource_100_km: "Ресурс на 100 км",
        full_tank_range: "Повний бак ≈ запас ходу",
        full_battery_range: "Повна батарея ≈ запас ходу",
        full_tank_cost: "Вартість повного бака",
        full_battery_cost: "Вартість повної батареї",
        comparison: "Порівняння",
        conclusion: "Висновок",
        diff_per_100_km: "Різниця на 100 км",
        saving_month: "Економія/місяць (≈ {km} км)",
        saving_year: "Економія/рік ({km} км)",
        same_cost: "За вартістю — практично однаково.",
        cheaper_car_1: "Дешевше: <b>Авто 1</b> на <b>{diff} грн</b> за маршрут.",
        cheaper_car_2: "Дешевше: <b>Авто 2</b> на <b>{diff} грн</b> за маршрут.",
        err_distance: "Вкажи відстань маршруту більше 0 км.",
      },

      currency: {
        ua_label: "UAH — Українська гривня",
        ua_name: "Українська гривня",
        nbu_badge: "Курс НБУ: {date}",

        nbu_unavailable_cached: "⚠️ НБУ тимчасово недоступний. Використано збережені курси.",
        nbu_failed: "Не вдалося завантажити курси НБУ. Спробуй пізніше.",

        err_amount: "Введи суму.",
        err_currencies: "Оберіть валюти.",

        rate: "Курс:",
        formula: "Формула:",
        line_result: "{a} {from} = {b} {to}",

        reset_done: "Скинуто ✅",
        hint_enter: "Введи суму та обери валюти.",
        loading: "Завантажую курси НБУ…",

        copy_first_calc: "Спочатку зроби розрахунок 🙂",
        copy_ok: "✅ Результат скопійовано",
        copy_failed: "Не вдалося скопіювати (браузер заборонив).",
      },


      tco: {
        hint_enter_and_calc: "Введи дані та натисни «Розрахувати».",
        fill_km_year_and_years: "Заповни пробіг і період володіння.",
        diff: "Різниця",
        payback_km_years: "Окупність (км/роки)",
        payback_years: "Окупність (роки)",
        ev_better: "EV вигідніше",
        ice_better: "ДВЗ вигідніше",
        ev_not_payback: "EV не окупається",
        less_than_year: "Менше ніж за 1 рік",
        year: "Рік",
        ice_sum: "ДВЗ (сума)",
        ev_sum: "Електро (сума)",
        cumulative_note: "* Кумулятивна сума (покупка + енергія + сервіс) на кожен рік.",

        payback_not_needed: "EV не дорожчий при покупці — окупність по переплаті не потрібна",
        payback_km_years_value: "≈ {km} км (~ {years} років)",
        payback_years_value: "≈ {years} років",
        assessment_note: "Оцінка за поточних цін, сервісу та пробігу.",
        for_mileage: "Для пробігу {km} км/рік.",
        kpi_meta: "Покупка + енергія + сервіс",
        sum_for_years: "(сума за {years} р.)",
        ev_plus: "EV +",
        ice_plus: "ДВЗ +",
        break_even_title_win: "EV стає вигіднішим на ≈ {year}-му році",
        break_even_title_no: "На горизонті {years} років EV не стає вигіднішим",
        link_copied: "Посилання скопійовано ✅",
        copy_link_prompt: "Скопіюй посилання:",
      },
      brake: {
          // labels for scenario string
          surface: { dry: "сухо", wet: "мокро", snow: "сніг", ice: "лід" },
          tire: { summer: "літні", winter: "зимові", studs: "шипи", allseason: "всесезон", worn: "знос" },
          temp: { warm: "+10..+30°C", cool: "0..+10°C", cold: "<0°C" },

          tile_sub: "реакція {r} м + гальм. {b} м",

          verdict_invalid: "Введіть коректні дані — і побачите порівняння.",
          verdict_baseline: "На {speed} км/год: Scenario A ≈ {a} м, Scenario B ≈ {b} м.",
          verdict_ok: "{base} Різниця невелика: +{pct}%.",
          verdict_warn: "{base} На Scenario B зупинка довша на +{pct}%.",
          verdict_bad: "{base} Дуже небезпечно: відстань зростає приблизно в {ratio} раз(и).",

          copy_title: "Калькулятор гальмівного шляху",
          copy_speed: "Швидкість: {speed} км/год",
          copy_reaction: "Реакція: {rt} c → {m} м",
          copy_scenario_a: "Scenario A: {label}",
          copy_scenario_b: "Scenario B: {label}",
          copy_brake: "Гальмівний шлях: {m} м",
          copy_total: "Повна зупинка: {m} м",
          copy_ratio: "Різниця B/A: ~{x}×",

          copy_link_btn: "Скопіювати посилання",
          copy_result_btn: "Скопіювати результат",
          link_copied: "Посилання скопійовано ✅",
          result_copied: "Результат скопійовано ✅",
          copy_failed: "Не вдалось скопіювати",
        },
        credit: {
          nbu_badge: "Курс НБУ: {date}",
          nbu_badge_title: "Дата офіційного курсу НБУ: {date}",
          nbu_badge_short: "Курс НБУ",
          nbu_badge_short_title: "Офіційний курс НБУ",
          nbu_unavailable_cached: "⚠️ НБУ тимчасово недоступний. Використано збережені курси.",
          nbu_unavailable_now: "⚠️ Курс НБУ не завантажився. Поки що ₴.",

          th_no: "№",
          th_date: "Дата",
          th_payment: "Платіж",
          th_interest: "Відсотки",
          th_principal: "Тіло",
          th_fees: "Комісії",
          th_balance: "Залишок",

          type_annuity: "Ануїтет",
          type_diff: "Диференційований",

          main_monthly: "{amount} / міс",

          kpi_monthly_no_fees: 'Щомісячний платіж <b>(без комісій)</b>',
          kpi_calc_type: "Розраховано: {type}",
          kpi_monthly_with_fees: "Платіж “з витратами”",
          kpi_fees_included: "Комісії + страхування враховані",
          kpi_overpay_interest: "Переплата <b>(відсотки)</b>",
          kpi_overpay_note: "Без урахування разової комісії",
          kpi_total: "Загалом <b>(Платежі + комісії)</b>",
          kpi_total_note: "Платежі + комісії",

          summary_fees: "Комісії та додаткові витрати",
          hint_prefix: "Підказка",
          hint_avg: "середній платіж без комісій ≈ <b>{avg1}</b>, з витратами ≈ <b>{avg2}</b>.",

          err_amount_term: "Введи коректну суму та термін.",
          hint_enter_inputs: "Введи суму, ставку та термін.",
          hint_enter_inputs_short: "Введи суму та обери параметри.",
          reset_done: "Скинуто ✅",

          copy_first_calc: "Спочатку зроби розрахунок 🙂",
          copy_ok: "✅ Результат скопійовано",
          copy_failed: "Не вдалося скопіювати (браузер заборонив).",
          copy_table_ok: "✅ Таблицю скопійовано",
          copy_table_failed: "Не вдалося скопіювати таблицю.",
          csv_downloaded: "CSV завантажено ✅",
        },
        evc: {
        hint_enter_and_calc: "Введи дані та натисни «Розрахувати».",

        // UI
        source_home: "Від розетки",
        source_station: "Від зарядної станції",
        from_to: "з {now}% до {target}%",
        losses: "втрати: {loss}%",

        station_price_per_min: "Ціна (грн / хв)",
        station_price_per_kwh: "Ціна (грн / кВт⋅год)",
        station_hint_min: "У режимі грн/хв потужність потрібна для розрахунку часу.",
        station_hint_kwh: "Тариф за енергію (кВт⋅год).",

        // units
        unit_kwh: "кВт⋅год",
        unit_uah: "грн",
        unit_h: "год",
        unit_min: "хв",
        unit_uah_per_min: "грн/хв",
        unit_uah_per_kwh: "грн/кВт⋅год",

        // KPI
        kpi_to_battery: "Потрібно “у батарею”",
        kpi_from_grid: "З мережі (з втратами)",
        kpi_time: "Орієнтовний час",
        time_need_power: "Вкажи потужність (кВт), щоб порахувати час.",
        power_kw: "потужність {p} кВт",
        kpi_cost: "Вартість ({mode})",

        mode_home: "розетка",
        mode_station_min: "станція (грн/хв)",
        mode_station_kwh: "станція (грн/кВт⋅год)",

        price_home_label: "Тариф грн/кВт⋅год",
        price_station_label_min: "Тариф грн/хв",
        price_station_label_kwh: "Тариф грн/кВт⋅год",

        // errors
        err_cap: "Вкажи ємність батареї (кВт⋅год) більше 0.",
        err_now: "Поточний заряд має бути 0–100%.",
        err_target: "Цільовий заряд має бути 0–100%.",
        err_target_gt_now: "“Хочу (%)” має бути більше ніж “Зараз (%)”.",
        err_power: "Вибери потужність зарядки (кВт) більше 0.",
        err_price_home: "Вкажи ціну від розетки (грн/кВт⋅год) більше 0.",
        err_price_station: "Вкажи ціну для зарядної станції ({unit}) більше 0.",
        err_min_need_power: "Для тарифу грн/хв потрібна потужність зарядки (кВт), щоб порахувати час.",

        // compare
        cheaper_home: "Дешевше від розетки. Різниця: <b>{diff} грн</b>",
        cheaper_station: "Дешевше на станції. Різниця: <b>{diff} грн</b>",
        same_cost: "Однаково за вартістю.",

        // explain
        explain_base: "Пояснення: (Ємність) × (Δ%) = кВт⋅год у батарею, далі ділимо на (1 − втрати).",
        explain_min: "Для грн/хв: ціна = хвилини × тариф.",

        // share
        link_copied: "Посилання скопійовано ✅",
        copy_link_prompt: "Скопіюй посилання:",
        compare_title: "Порівняння",
compare_home_time: "Від розетки • Час",
compare_home_cost: "Від розетки • Вартість",
compare_station_time: "Від станції • Час",
compare_station_cost: "Від станції • Вартість",

tariff_label: "Тариф",
station_formula_kwh: "Станція (грн/кВт⋅год): вартість = кВт⋅год (з мережі) × тариф.",
station_formula_min: "Станція (грн/хв): вартість = хвилини × тариф.",

// short units (для рядків типу ≈ 183 хв • 7.00 кВт)
unit_h_short: "год",
unit_min_short: "хв",
unit_kw: "кВт",
      },
      
        ipoteca: {
          // UI / buttons
          title: "Іпотечний калькулятор",
          calculate: "Розрахувати",
          reset: "Скинути",
          copy: "Скопіювати",
          share: "Поділитись",
          copied: "Скопійовано ✅",
          copied_result: "✅ Результат скопійовано",
          copied_table: "✅ Таблицю скопійовано",
          csv_downloaded: "CSV завантажено ✅",

          // Down payment mode
          dp_mode_uah: "Внесок (грн)",
          dp_mode_pct: "Внесок (%)",
          dp_hint_uah: "Наприклад: 400 000 ₴",
          dp_hint_pct: "Наприклад: 20 %",

          // Validation / toasts
          toast_reset: "Скинуто ✅",
          toast_need_calc_first: "Спочатку зроби розрахунок 🙂",
          toast_enter_values: "Введи вартість, внесок і термін (роки).",
          result_enter_values: "Введи вартість, внесок, ставку та термін.",
          toast_nbu_unavailable: "⚠️ НБУ тимчасово недоступний. Використано збережені курси.",
          toast_nbu_not_loaded_fallback: "Курс НБУ не завантажився — показуємо ₴.",

          // NBU badge
          nbu_unavailable: "Курс НБУ: недоступно",
          nbu_title: "Офіційний курс НБУ",
          nbu_badge: "Курс НБУ: $ {usd} / € {eur}{datePart}",

          // Result blocks
          per_month: "{value} / міс",
          type_annuity: "Ануїтет",
          type_diff: "Диференційований",

          kpi_payment_no_fees: "Платіж (без комісій)",
          kpi_payment_with_costs: "Платіж “з витратами”",
          kpi_overpay_interest: "Переплата (відсотки)",
          kpi_total_paid: "Загалом (Платежі + витрати)",

          kpi_calc_type: "Розраховано: {type}",
          kpi_with_costs_note: "Щомісячні витрати враховані",
          kpi_interest_note: "Лише відсотки за період",
          kpi_total_note: "Платежі + разова + щомісячні",

          summary_costs: "Комісії та витрати: {value}",
          hint_avg:
            "Підказка: середній платіж без комісій ≈ {avg}, з витратами ≈ {avg2}.",

          // Schedule table
          th_payment: "Платіж ({sym})",
          th_interest: "Відсотки ({sym})",
          th_principal: "Тіло ({sym})",
          th_costs: "Витрати ({sym})",
          th_balance: "Залишок ({sym})",
        },
        salary:{
          nbu_badge: "Курс НБУ: USD {usd} / EUR {eur}{datePart}",
          nbu_title: "Курс НБУ (USD/EUR)",
          nbu_unavailable: "Курс НБУ: недоступно",

          toast_enter_values: "Введи суму для розрахунку.",
          result_enter_values: "Введи суму для розрахунку.",
          toast_reset: "Скинуто.",
          toast_need_calc_first: "Спочатку зроби розрахунок.",
          copied_result: "Скопійовано результат.",
          copy_failed: "Не вдалося скопіювати.",
          copied_table: "Скопійовано таблицю.",
          copy_table_failed: "Не вдалося скопіювати таблицю.",
          csv_downloaded: "CSV завантажено.",
          toast_nbu_not_loaded_fallback: "Курс НБУ не завантажився — показую UAH.",

          net_inhand: "На руки",
          period: "період",
          period_month: "місяць",
          period_year: "рік",

          mode_gross2net: "від брутто → “на руки”",
          mode_net2gross: "від “на руки” → брутто",

          kpi_gross: "Брутто (база)",
          kpi_taxes: "Податки (ПДФО+ВЗ)",
          kpi_bonus: "Бонус / премія",
          kpi_deductions: "Утримання",
          kpi_employer_cost: "Вартість роботодавця",
          kpi_esv: "ЄСВ",
          kpi_tax_rate: "Ставка",
          kpi_mode: "Режим",

          summary_net: "На руки",
          summary_hint: "У графіку: суми відображаються в ₴ та можуть бути конвертовані у USD/EUR за курсом НБУ."
        },

        oscpv: {
          dash: "—",
          uah: "грн",

          // buttons
          copy_link_btn: "Скопіювати посилання",
          copy_result_btn: "Скопіювати результат",
          link_copied: "Посилання скопійовано ✅",
          result_copied: "Результат скопійовано ✅",
          copy_failed: "Не вдалось скопіювати",

          // verdict
          verdict_invalid: "Введи коректні дані — і побачиш різницю між Авто 1 та Авто 2.",
          verdict_baseline: "Авто 1 ≈ {a} грн, Авто 2 ≈ {b} грн.",
          verdict_ok: "{base} Різниця невелика: +{pct}%.",
          verdict_warn: "{base} Авто 2 дорожче на +{pct}%.",
          verdict_bad: "{base} Дуже велика різниця: приблизно в {ratio}× дорожче.",

          // tiles
          tile_range: "діапазон: {min} – {max}",
          tile_base_and_range: "база: {base} | {min} – {max}",

          regions: {
            kyiv: "Київ",
            oblast: "Облцентр",
            city: "Інше місто",
            rural: "Село/район",
          },

          insurers: {
            market: "Середній ринок",
            tas: "ТАС",
            arx: "ARX",
            pzu: "PZU",
            uniqa: "UNIQA",
            ingo: "INGO",
          },

          // copy text
          copy_title: "Калькулятор ОСЦПВ (ринкова модель)",
          copy_insurer: "Страхова",
          copy_base: "База",
          copy_car1: "Авто 1",
          copy_car2: "Авто 2",
          copy_range: "від {min} до {max}",
          copy_avg: "середня {avg}",
          copy_ratio: "Різниця Авто 2 / Авто 1: ~{x}×",
        },
      comp:{
          nbu_badge: "Курс НБУ: USD {usd} / EUR {eur}{datePart}",
          nbu_title: "Курс НБУ (USD/EUR)",
          nbu_unavailable: "Курс НБУ: недоступно",

          toast_enter_values: "Введи початкову суму та період.",
          result_enter_values: "Введи початкову суму, ставку та період.",
          toast_reset: "Скинуто.",
          toast_need_calc_first: "Спочатку зроби розрахунок.",
          copied_result: "Скопійовано результат.",
          copy_failed: "Не вдалося скопіювати.",
          copied_table: "Скопійовано таблицю.",
          copy_table_failed: "Не вдалося скопіювати таблицю.",
          csv_downloaded: "CSV завантажено.",
          toast_nbu_not_loaded_fallback: "Курс НБУ не завантажився — показую UAH.",

          final: "Підсумкова сума",
          kpi_contributed: "Внесли",
          kpi_earned: "Заробили",
          kpi_earned_pct: "Прибуток",
          kpi_ratio: "Внесли vs заробили",
          kpi_ratio_hint: "Заробили / внесли",
          kpi_final: "Фінальний баланс",
          kpi_years: "По роках",
          kpi_freq: "Частота",

          freq_monthly: "щомісяця",
          freq_quarterly: "щокварталу",
          freq_yearly: "щороку",

          summary: "Внесли та заробили",
          summary_hint: "Графік і таблиця — за балансом наприкінці кожного року. Валюту можна перемкнути на USD/EUR (курс НБУ).",
          chart_need_data: "Зроби розрахунок, щоб побачити графік."
        },
      roi: {
          nbu_badge: "Курс НБУ: USD {usd} / EUR {eur}{datePart}",
          nbu_title: "Курс НБУ (USD/EUR)",
          nbu_unavailable: "Курс НБУ: недоступно",

          toast_enter_values: "Введи суму інвестиції та період.",
          result_enter_values: "Введи суму інвестиції, дохідність та період.",
          toast_reset: "Скинуто.",
          toast_need_calc_first: "Спочатку зроби розрахунок.",
          copied_result: "Скопійовано результат.",
          copy_failed: "Не вдалося скопіювати.",
          toast_nbu_not_loaded_fallback: "Курс НБУ не завантажився — показую UAH.",

          main: "ROI",
          final: "Підсумкова сума",
          kpi_roi: "ROI",
          kpi_roi_hint: "Прибуток / внесли",
          kpi_profit: "Чистий прибуток",
          kpi_profit_pct: "У % до внесків",
          kpi_contributed: "Внесли",
          kpi_contributed_hint: "Початкова сума + внески",
          kpi_final: "Підсумкова сума",
          kpi_final_hint: "Баланс наприкінці періоду",
          summary: "Внесли та заробили",
          summary_hint: "Графік показує баланс наприкінці кожного року. Валюту можна перемкнути на USD/EUR (курс НБУ).",
          chart_need_data: "Зроби розрахунок, щоб побачити графік.",
          copied_table: "Скопійовано таблицю.",
          copy_table_failed: "Не вдалося скопіювати таблицю.",
          csv_downloaded: "CSV завантажено.",
          main: "ROI",
        final: "Підсумкова сума",
        toast_enter_values: "Введи суму інвестиції та період.",
        result_enter_values: "Введи суму інвестиції, дохідність і період.",
        toast_reset: "Скинуто.",
        toast_need_calc_first: "Спочатку зроби розрахунок.",
        copy_failed: "Не вдалося скопіювати результат.",

        chart_need_data: "Зроби розрахунок, щоб побачити графік.",

        nbu_badge: "Курс НБУ: USD {usd} / EUR {eur}{datePart}",
        nbu_title: "Курс НБУ (USD/EUR)",
        nbu_unavailable: "Курс НБУ: недоступно",
        toast_nbu_not_loaded_fallback: "Курс НБУ не завантажився — показую UAH.",

        kpi_roi: "ROI",
        kpi_roi_hint: "Прибуток / внески",

        kpi_profit: "Чистий прибуток",
        kpi_profit_pct: "% від внесків",

        kpi_contributed: "Внесли",
        kpi_contributed_hint: "Початкова сума + внески",

        kpi_final: "Підсумкова сума",
        kpi_final_hint: "Баланс наприкінці періоду",

        summary: "Внесли та заробили",
        },


      percent: {
  // hints
  hint_pick_mode: "Вибери режим і натисни «Розрахувати».",
  hint_enter_and_calc: "Введи дані та натисни «Розрахувати».",

  // common words
  formula: "Формула",
  old: "Було",
  new: "Стало",

  // actions / directions
  increase: "Збільшити",
  decrease: "Зменшити",
  growth: "Зростання",
  drop: "Падіння",
  no_change: "Без змін",

  // lines
  t1_line: "{p}% від {x} = {r}",
  t2_line: "{part} — це {p}% від {total}",
  t3_line: "{action} {x} на {p}% = {r}",
  t4_line: "{dir}: {p}%",

  // toasts
  reset_done: "Скинуто ✅",
  copy_first_calc: "Спочатку зроби розрахунок 🙂",
  copy_ok: "✅ Результат скопійовано",
  copy_failed: "Не вдалося скопіювати (браузер заборонив).",

  // errors
  err_number_and_percent: "Введи число та відсоток.",
  err_part_and_total: "Введи частину та ціле.",
  err_total_zero: "«Від цілого» не може бути 0.",
  err_old_new: "Введи «Було» та «Стало».",
  err_old_zero: "«Було» не може бути 0 для розрахунку % зміни.",
},
      pension:
      {
  nbu_badge: "Курс НБУ: USD {usd} / EUR {eur}{datePart}",
  nbu_title: "Курс НБУ (USD/EUR)",
  nbu_unavailable: "Курс НБУ: недоступно",

  main: "Накопичення на пенсію",

  toast_bad_ages: "Перевір вік і вік виходу на пенсію.",
  toast_enter_values: "Введи значення для розрахунку.",
  result_enter_values: "Введи вік, вік виходу на пенсію, суму та дохідність.",
  toast_reset: "Скинуто.",
  toast_need_calc_first: "Спочатку зроби розрахунок.",
  copied_result: "Скопійовано результат.",
  copy_failed: "Не вдалося скопіювати.",

  toast_nbu_not_loaded_fallback: "Курс НБУ не завантажився — показую UAH.",
  chart_need_data: "Зроби розрахунок, щоб побачити графік.",

  kpi_final: "Підсумкова сума",
  kpi_horizon: "Горизонт",
  y: "р.",
  m: "міс.",
  kpi_contrib: "Внесли",
  kpi_contrib_hint: "Накопичення зараз + внески",
  kpi_profit: "Заробили",
  kpi_profit_pct: "У % до внесків",
  kpi_monthly: "Щомісячний внесок",
  kpi_monthly_hint: "Регулярні внески до пенсії",

  summary: "Внесли та заробили",
  summary_hint: "Графік показує баланс наприкінці кожного року. Валюту можна перемкнути на USD/EUR за курсом НБУ.",
  copied_table: "Скопійовано таблицю.",
copy_table_failed: "Не вдалося скопіювати таблицю.",
csv_downloaded: "CSV завантажено.",
},
    infl:{
  main: "Реальна вартість",

  toast_enter_values: "Введи суму та період.",
  result_enter_values: "Введи суму, інфляцію та період.",
  toast_reset: "Скинуто.",
  toast_need_calc_first: "Спочатку зроби розрахунок.",
  copied_result: "Скопійовано результат.",
  copy_failed: "Не вдалося скопіювати.",

  chart_need_data: "Зроби розрахунок, щоб побачити графік.",

  legend_nominal: "Номінал",
  legend_real: "Реально",

  kpi_real: "Реально (сьогоднішні гроші)",
  kpi_real_hint: "Купівельна спроможність",

  kpi_required: "Потрібно номінально",
  kpi_required_hint: "Щоб мати ту ж купівельну спроможність",

  kpi_nominal: "Номінал наприкінці",
  kpi_factor: "Множник інфляції",

  kpi_loss: "Втрата купівельної спроможності",
  kpi_loss_hint: "Через інфляцію за період",

  summary: "Підсумок",
  summary_hint: "“Реально” = номінал / (1+інфляція)^роки. Поповнення додаються щомісяця і також знецінюються з часом.",

  copied_table: "Скопійовано таблицю.",
  copy_table_failed: "Не вдалося скопіювати таблицю.",
  csv_downloaded: "CSV завантажено.",
  nbu_badge: "Курс НБУ: USD {usd} / EUR {eur}{datePart}",
nbu_title: "Курс НБУ (USD/EUR)",
nbu_unavailable: "Курс НБУ: недоступно",
toast_nbu_not_loaded_fallback: "Курс НБУ не завантажився — показую UAH.",
},

    cc:{
  nbu_title: "Курс НБУ (USD/EUR)",
  nbu_badge: "Курс НБУ: USD {usd} / EUR {eur}{datePart}",
  nbu_unavailable: "Курс НБУ: недоступно",

  toast_nbu_not_loaded_fallback: "Курс НБУ не завантажився — показую UAH.",
  toast_enter_values: "Введи площу та ціну за м².",
  toast_weights_normalized: "Увага: сума відсотків ≠ 100%. Нормалізую автоматично.",
  toast_reset: "Скинуто.",
  toast_need_calc_first: "Спочатку зроби розрахунок.",

  result_enter_values: "Введи площу та ціну за м².",

  main_total: "Загальна вартість",

  kpi_base: "Базова сума",
  kpi_base_hint: "Площа × ціна за м²",

  kpi_total: "Підсумок",
  kpi_total_hint: "База + резерв + податки + додаткові",

  kpi_per_m2: "Ціна за м² (факт)",
  kpi_per_m2_hint: "З урахуванням надбавок",

  kpi_additions: "Надбавки",
  kpi_additions_hint: "Резерв + податки + додаткові",

  summary: "Пояснення",
  summary_hint: "Етапи розподіляють базову суму; резерв/податки/додаткові додаються зверху.",

  stage_foundation: "Фундамент",
  stage_walls: "Стіни/коробка",
  stage_roof: "Дах",
  stage_windows: "Вікна/фасад",
  stage_engineering: "Інженерія",
  stage_interior: "Оздоблення",

  chart_need_data: "Зроби розрахунок, щоб побачити графік.",
  legend: "Накопичення",

  copied_result: "Скопійовано результат.",
  copy_failed: "Не вдалося скопіювати.",

  copied_table: "Скопійовано таблицю.",
  copy_table_failed: "Не вдалося скопіювати таблицю.",
  csv_downloaded: "CSV завантажено.",
},
      conc:{
  toast_enter_values: "Введи розміри для розрахунку.",
  toast_need_calc_first: "Спочатку зроби розрахунок.",
  toast_reset: "Скинуто.",
  result_enter_values: "Введи розміри для розрахунку.",

  main: "Об’єм бетону",

  kpi_wet: "Мокрий об’єм",
  kpi_wet_hint: "За розмірами",
  kpi_dry: "Сухий об’єм",
  kpi_dry_hint: "Мокрий × коефіцієнт",
  kpi_cement: "Цемент",
  kpi_water: "Вода",
  kpi_water_hint: "За W/C",

  unit_bags: "мішків",

  summary: "Співвідношення",
  summary2: "Матеріали (від сухого об’єму)",
  summary_hint: "Примітки: густина цементу ≈ 1440 кг/м³. Літри води ≈ цемент(кг) × W/C.",

  item_cement: "Цемент",
  item_sand: "Пісок",
  item_gravel: "Щебінь",
  item_water: "Вода",
  note_volume: "Оцінка об’єму",

  chart_need_data: "Зроби розрахунок, щоб побачити графік.",
  chart_cement: "Цемент",
  chart_sand: "Пісок",
  chart_gravel: "Щебінь",

  copied_result: "Скопійовано результат.",
  copy_failed: "Не вдалося скопіювати.",
  copied_table: "Скопійовано таблицю.",
  copy_table_failed: "Не вдалося скопіювати таблицю.",
  csv_downloaded: "CSV завантажено.",

  label_thickness: "Товщина (м)",
  label_thickness_wall: "Товщина (м)",
  label_height: "Висота (м)",
},
brick: {
  toast_enter_values: "Введи дані для розрахунку.",
  toast_need_calc_first: "Спочатку зроби розрахунок.",
  toast_reset: "Скинуто.",
  result_enter_values: "Введи дані для розрахунку.",

  main: "Кількість цегли",

  kpi_area: "Площа (чиста)",
  kpi_area_hint: "З урахуванням отворів",

  kpi_wall_volume: "Об’єм стіни",
  kpi_wall_volume_hint: "Площа × товщина",

  kpi_bricks_no_waste: "Цегла (без запасу)",
  kpi_bricks_no_waste_hint: "За модулем з швом",

  kpi_mortar: "Розчин",

  summary: "Параметри",
  summary2: "Матеріали",
  summary_hint: "Розчин ≈ (об’єм стіни − об’єм цегли без швів). Для реального об’єкта закладай запас 5–10%.",

  item_bricks: "Цегла",
  item_mortar: "Розчин",
  item_area: "Площа кладки (чиста)",
  item_wall_volume: "Об’єм стіни",

  note_volume: "Оцінка об’єму",
  note_no_waste: "без запасу",
  note_waste: "запас",
  note_liters_approx: "≈",
  note_openings: "Площа після віднімання отворів",
  note_area_times_thickness: "Площа × товщина",

  chart_need_data: "Зроби розрахунок, щоб побачити графік.",
  chart_wall: "Стіна",
  chart_mortar: "Розчин",
  chart_mortar_waste: "Розчин+запас",

  copied_result: "Скопійовано результат.",
  copy_failed: "Не вдалося скопіювати.",
  copied_table: "Скопійовано таблицю.",
  copy_table_failed: "Не вдалося скопіювати таблицю.",
  csv_downloaded: "CSV завантажено.",

  unit_pcs: "шт",
  unit_m2: "м²",
  unit_m3: "м³",
  unit_liters: "л",

  label_joint: "Шов (мм)",

  cost_need_calc_first: "Спочатку зроби розрахунок.",
  cost_enter_prices: "Введи ціни, щоб побачити вартість.",
  cost_nothing_to_copy: "Немає що копіювати.",
  cost_copied: "Скопійовано.",
  cost_saved: "Ціни збережено.",
  cost_reset: "Ціни скинуто.",

  common_total_cost: "Загальна вартість",
  common_subtotal: "Проміжний підсумок",
  common_delivery: "Доставка",
  common_price_per_m2: "Ціна за 1 м²",
  unit_mm: "мм",
  label_joint: "Шов",
  note_waste: "запас",
},
      plaster: {
              h1: "Калькулятор штукатурки",
              subtitle: "Розрахунок штукатурної суміші: <b>готова суха суміш (мішки)</b> або <b>цемент + пісок</b>. Є графік, таблиця матеріалів, копіювання та CSV (Excel).",
              auto: "Авто-розрахунок",

              input_title: "Введи дані",
              mode_label: "Режим",
              mode_wall: "Стіна (Д×В)",
              mode_area: "Площа (м²)",
              mode_hint: "Стіна: вводиш довжину та висоту. Площа: вводиш лише м².",

              mix_type_label: "Тип штукатурки",
              mix_bags: "Готова суха суміш (мішки)",
              mix_cs: "Цемент + пісок (саморобний)",
              mix_type_hint: "Обери, що саме рахуємо: мішки суміші або цементно-піщаний розчин.",

              length_label: "Довжина (м)",
              height_label: "Висота (м)",
              area_label: "Площа (м²)",

              openings_label: "Площа отворів (м²) (опц.)",
              openings_hint: "Сумарно для вікон/дверей. Віднімається від площі штукатурення.",

              thickness_label: "Товщина шару (мм)",
              thickness_hint: "Середня товщина. Для нерівних стін краще брати запас.",

              cons_label: "Витрата (кг/м² на 10 мм)",
              cons_hint: "Бери з мішка. Типово 8–10 кг/м² на 10 мм (залежить від суміші).",
              bagkg_label: "Вага мішка (кг)",
              water_lkg_label: "Вода (л на 1 кг) (опц.)",
              water_lkg_hint: "Якщо не знаєш — залиш порожнім, вода не рахуватиметься.",
              bags_formula_hint: "Формула: кг = площа × витрата × (товщина/10) × (1 + запас%).",

              ratio_title: "Пропорція (за об’ємом)",
              ratio_c: "Цемент (C)",
              ratio_s: "Пісок (S)",
              ratio_wc: "Вода/цемент (W/C)",
              ratio_hint: "🔹 1:3 означає — 1 частина цементу + 3 частини піску (по об’єму).<br>🔹 W/C = 0.5 означає — ~0.5 л води на 1 кг цементу.<br>🔹 Типово: 1:3 або 1:4 • W/C ~ 0.45–0.6",

              cement_density: "Густина цементу (кг/м³)",
              sand_density: "Густина піску (кг/м³)",
              cement_bagkg: "Вага мішка цементу (кг)",

              waste_label: "Запас / втрати, %",
              waste_hint: "Зазвичай 5–15% залежно від основи та втрат.",

              btn_calc: "Розрахувати",
              btn_reset: "Скинути",
              btn_copy: "Копіювати результат",

              result_title: "Результат",
              result_enter: "Введи дані для розрахунку.",

              chart_title: "Графік",
              chart_hint: "Візуалізація основних показників (залежно від режиму).",

              table_title: "Таблиця матеріалів",
              table_open: "(відкрити)",
              btn_copy_table: "Копіювати таблицю",
              btn_csv: "📄 Завантажити (Excel)",
              th_item: "Позиція",
              th_qty: "К-сть",
              th_unit: "Одиниця",
              th_note: "Примітка",

              cost_title: "Вартість матеріалів",
              cost_opt: "(опційно)",
              price_per_bag: "Суміш: ціна за 1 мішок",
              price_per_bag_hint: "У режимі «цемент+пісок» це поле означає «цемент за мішок».",
              price_sand: "Пісок: ціна за 1 м³",
              price_water: "Вода: ціна за 1 л (опц.)",
              delivery: "Доставка (фікс.)",
              waste_cost: "Запас/втрати, % (для вартості)",
              waste_cost_hint: "Окремо, щоб не чіпати розрахунок кількості.",
              btn_save_prices: "Зберегти ціни",
              btn_reset_prices: "Скинути ціни",
              btn_copy_cost: "Копіювати вартість",
              cost_enter: "Введи ціни, щоб побачити загальну вартість.",
            },
            flooring: {
    h1: "Калькулятор підлогових матеріалів",
    subtitle: "Розрахунок матеріалів для підлоги: <b>ламінат / вініл</b> (упаковки), <b>плитка</b> (розмір + шт/упак), <b>килим</b> (ширина рулону → пог. м). Є графік, таблиця матеріалів, копіювання та CSV (Excel).",

    auto: "Авто-розрахунок",

    inputTitle: "Введи дані",
    modeLabel: "Режим площі",
    modeRoom: "Кімната (Д×Ш)",
    modeArea: "Площа (м²)",

    typeLabel: "Тип покриття",
    typeLaminate: "Ламінат",
    typeVinyl: "Вініл (SPC / LVT)",
    typeTile: "Плитка",
    typeCarpet: "Килим",
    typeHint: "Поля нижче автоматично змінюються залежно від типу.",

    lenLabel: "Довжина (м)",
    widLabel: "Ширина (м)",
    areaLabel: "Площа (м²)",

    cutoutsLabel: "Відняти площу (м²) (опц.)",
    cutoutsHint: "Якщо не потрібно — залиш 0.",

    wasteLabel: "Запас / підрізка, %",
    wasteHint: "Зазвичай 7–12% (пряма укладка), 12–18% (складна).",

    coverPerPackLabel: "Покриття 1 упаковки (м²)",
    unitNameLabel: "Назва одиниці",

    tileSizeTitle: "Розмір плитки",
    tileLenLabel: "Довжина (мм)",
    tileWidLabel: "Ширина (мм)",
    tilesPerPackLabel: "Штук в упаковці",
    tileHint: "Показує кількість штук та упаковок. Купівля зазвичай по упаковках.",
    unitNameTileLabel: "Назва одиниці",
    roundingLabel: "Округлення",
    roundPacks: "Округляти упаковки вгору",
    roundPieces: "Округляти штуки вгору",

    rollWidthLabel: "Ширина рулону (м)",
    rollHint: "Погонні метри = (площа з запасом) / ширина рулону.",
    carpetUnitLabel: "Назва одиниці",

    btnCalc: "Розрахувати",
    btnReset: "Скинути",
    btnCopy: "Копіювати результат",

    resultTitle: "Результат",
    resultPlaceholder: "Введи дані для розрахунку.",

    chartTitle: "Графік",
    chartHint: "Візуалізація основних показників.",

    tableTitle: "Таблиця матеріалів",
    tableOpen: "(відкрити)",
    btnCopyTable: "Копіювати таблицю",
    btnCsv: "📄 Завантажити (Excel)",
    thItem: "Позиція",
    thQty: "К-сть",
    thUnit: "Одиниця",
    thNote: "Примітка",

    costTitle: "Вартість матеріалів",
    costOpt: "(опційно)",
    priceLabel: "Ціна",
    priceHint: "Для килима — ціна за м². Для інших — ціна за упаковку.",
    deliveryLabel: "Доставка (фікс.)",
    wasteCostLabel: "Запас, % (для вартості)",
    btnSavePrices: "Зберегти ціни",
    btnResetPrices: "Скинути ціни",
    btnCopyCost: "Копіювати вартість",
    costPlaceholder: "Введи ціни, щоб побачити загальну вартість.",

    linkPlaster: "Калькулятор штукатурки",
    linkConcrete: "Калькулятор бетону",

    seoH2: "Як працює калькулятор",
    seoP: "Обери тип покриття → введи площу та запас → отримай упаковки/штуки або погонні метри для килима.",
  },
  excavation: {
  h1: "Калькулятор об’єму земляних робіт",
  subtitle: "Розрахунок об’єму ґрунту: траншея/котлован/площа/вручну, перекоп, розпушення, рейси і тоннаж. Є графік, таблиця, копіювання та CSV (Excel).",
  auto: "Авто-розрахунок",

  input_title: "Введи дані",

  mode_label: "Режим",
  mode_trench: "Траншея (Д×Ш×Г)",
  mode_pit: "Котлован (Д×Ш×Г)",
  mode_area: "Площа × глибина",
  mode_custom: "Об’єм вручну (м³)",
  mode_hint: "Обери режим — поля нижче зміняться.",

  length_label: "Довжина (м)",
  width_label: "Ширина (м)",
  depth_label: "Глибина (м)",
  depth_hint: "Середня глибина.",
  area_label: "Площа (м²)",
  custom_label: "Об’єм (м³)",

  overdig_label: "Перекоп, % (опц.)",
  overdig_hint: "Запас на нерівності/неточності.",

  soil_label: "Тип ґрунту (задає розпушення і густину)",
  soil_hint: "Автоматично підставляє розпушення (%) та густину (т/м³). Для “вручну” можна редагувати.",
  soil_sand: "Пісок",
  soil_loam: "Суглинок",
  soil_clay: "Глина",
  soil_chernozem: "Чорнозем",
  soil_gravel: "Щебінь / гравій",
  soil_custom: "Вручну (свій % та густина)",

  bulking_label: "Розпушення, %",
  density_label: "Густина (т/м³) (опц.)",
  truck_label: "Місткість машини (м³) (опц.)",

  btn_calc: "Розрахувати",
  btn_reset: "Скинути",
  btn_copy: "Копіювати результат",

  result_title: "Результат",
  result_enter: "Введи дані для розрахунку.",

  // KPI tiles
  kpi_in_situ: "Об’єм ґрунту",
  kpi_excavation: "Об’єм копання (з перекопом)",
  kpi_loose: "Розпушений об’єм",
  kpi_tonnage: "Тоннаж",
  kpi_trips: "Рейси",

  note_soil: "Тип ґрунту: {soil}. Об’єм для розпушення рахую по об’єму копання, а для перевезення — по розпушеному об’єму.",
  note_trips: "Примітка: якщо густина або місткість не задані — тоннаж/рейси не рахуються.",

  chart_title: "Графік",
  chart_hint: "Візуалізація основних значень.",

  table_title: "Таблиця",
  table_open: "(відкрити)",
  btn_copy_table: "Копіювати таблицю",
  btn_csv: "📄 Завантажити (Excel)",
  th_item: "Позиція",
  th_qty: "К-сть",
  th_unit: "Одиниця",
  th_note: "Примітка",

  // toasts
  toast_enter_values: "Введи дані для розрахунку.",
  toast_need_calc_first: "Спочатку зроби розрахунок.",
  toast_reset: "Скинуто ✅",
  copy_ok: "✅ Результат скопійовано",
  copy_failed: "Не вдалося скопіювати.",
  table_copy_ok: "✅ Таблицю скопійовано",
  table_copy_failed: "Не вдалося скопіювати таблицю.",
  csv_downloaded: "CSV завантажено ✅",

  // cost
  cost_title: "Вартість",
  cost_opt: "(опційно)",
  price_exc: "Земляні роботи: ціна за 1 м³",
  price_haul: "Вивіз/утилізація: ціна за 1 м³",
  price_trip: "Машина: ціна за рейс (опц.)",
  price_trip_hint: "Працює, якщо задана місткість машини.",
  delivery: "Додатково (фікс.)",
  waste_cost: "Запас, % (для вартості)",
  btn_save_prices: "Зберегти ціни",
  btn_reset_prices: "Скинути ціни",
  btn_copy_cost: "Копіювати вартість",
  cost_enter: "Введи ціни, щоб побачити вартість.",

  // labels for table
  row_geom: "Геометрія",
  row_overdig: "Перекоп",
  row_excavation: "Об’єм копання",
  row_bulking: "Розпушення",
  row_loose: "Розпушений об’єм",
  row_density: "Густина",
  row_tonnage: "Тоннаж",
  row_truck: "Місткість машини",
  row_trips: "Рейси",
},
steel: {
    h1: "Калькулятор ваги металу",
    subtitle: "Розрахунок маси металопрокату за геометрією або за кг/м (де доступно).",
    input_title: "Введи дані",
    result_title: "Результат",
    chart_title: "Графік",
    chart_hint: "Зроби розрахунок, щоб побачити графік.",
    need_inputs: "Введи дані для розрахунку.",

    type_label: "Тип елемента",
    type_rebar: "Арматура/пруток",
    type_pipe: "Труба",
    type_profile: "Профіль",
    type_strip: "Смуга",
    type_square: "Квадрат",
    type_sheet: "Лист",
    type_angle: "Кутник",
    type_round: "Катанка",
    type_channel: "Швелер",
    type_ibeam: "Двотавр",

    auto_calc: "Авто-розрахунок",
    density: "Густина (кг/м³)",
    length: "Довжина (м)",
    qty: "Кількість (шт)",
    waste: "Запас / втрати, %",
    btn_calc: "Розрахувати",
    btn_reset: "Скинути",
    btn_copy: "Копіювати результат",

    len_ph: "напр.: 6",
    qty_ph: "1",
    density_ph: "7850",
    waste_ph: "0",

    // strip visualization / formula hint (те, що ти просив уточнити)
    strip_vis_title: "Смуга",
    strip_vis_inputs: "Ввід: b (мм), t (мм), L (м)",
    strip_vis_formula: "Формула: V = b × t × L",

    // common dimensions labels if показуєш у UI
    b_mm: "b (мм)",
    t_mm: "t (мм)",
    h_mm: "h (мм)",
    s_mm: "s (мм)",
    L_m: "L (м)",
  },



    },

    en: {
      steel: {
    h1: "Steel Weight Calculator",
    subtitle: "Estimate steel weight by geometry or by kg/m (where available).",
    input_title: "Enter data",
    result_title: "Result",
    chart_title: "Chart",
    chart_hint: "Run a calculation to see the chart.",
    need_inputs: "Enter inputs to calculate.",

    type_label: "Element type",
    type_rebar: "Rebar / round bar",
    type_pipe: "Pipe",
    type_profile: "Profile",
    type_strip: "Strip",
    type_square: "Square bar",
    type_sheet: "Sheet",
    type_angle: "Angle",
    type_round: "Wire rod",
    type_channel: "Channel",
    type_ibeam: "I-beam",

    auto_calc: "Auto calculation",
    density: "Density (kg/m³)",
    length: "Length (m)",
    qty: "Quantity (pcs)",
    waste: "Waste / extra, %",
    btn_calc: "Calculate",
    btn_reset: "Reset",
    btn_copy: "Copy result",

    len_ph: "e.g.: 6",
    qty_ph: "1",
    density_ph: "7850",
    waste_ph: "0",

    strip_vis_title: "Strip",
    strip_vis_inputs: "Inputs: b (mm), t (mm), L (m)",
    strip_vis_formula: "Formula: V = b × t × L",

    b_mm: "b (mm)",
    t_mm: "t (mm)",
    h_mm: "h (mm)",
    s_mm: "s (mm)",
    L_m: "L (m)",
  },
      excavation: {
  h1: "Earthworks Volume Calculator",
  subtitle: "Estimate soil volume: trench/pit/area/manual input, overdig, bulking factor, truck trips and tonnage. Includes chart, table, copy and CSV (Excel).",
  auto: "Auto calculation",

  input_title: "Enter data",

  mode_label: "Mode",
  mode_trench: "Trench (L×W×D)",
  mode_pit: "Pit (L×W×D)",
  mode_area: "Area × depth",
  mode_custom: "Manual volume (m³)",
  mode_hint: "Choose a mode — fields below will adapt.",

  length_label: "Length (m)",
  width_label: "Width (m)",
  depth_label: "Depth (m)",
  depth_hint: "Average depth.",
  area_label: "Area (m²)",
  custom_label: "Volume (m³)",

  overdig_label: "Overdig, % (opt.)",
  overdig_hint: "Extra allowance for inaccuracies.",

  soil_label: "Soil type (sets bulking & density)",
  soil_hint: "Automatically fills bulking (%) and density (t/m³). Choose “manual” to edit.",
  soil_sand: "Sand",
  soil_loam: "Loam",
  soil_clay: "Clay",
  soil_chernozem: "Black soil",
  soil_gravel: "Gravel / crushed stone",
  soil_custom: "Manual (custom % & density)",

  bulking_label: "Bulking, %",
  density_label: "Density (t/m³) (opt.)",
  truck_label: "Truck capacity (m³) (opt.)",

  btn_calc: "Calculate",
  btn_reset: "Reset",
  btn_copy: "Copy result",

  result_title: "Result",
  result_enter: "Enter inputs to calculate.",

  kpi_in_situ: "In-situ volume",
  kpi_excavation: "Excavation volume (with overdig)",
  kpi_loose: "Loose volume",
  kpi_tonnage: "Tonnage",
  kpi_trips: "Trips",

  note_soil: "Soil: {soil}. Bulking is applied to excavation volume; hauling uses loose volume.",
  note_trips: "Note: if density or truck capacity is missing — tonnage/trips are not calculated.",

  chart_title: "Chart",
  chart_hint: "Visualization of key values.",

  table_title: "Table",
  table_open: "(open)",
  btn_copy_table: "Copy table",
  btn_csv: "📄 Download (Excel)",
  th_item: "Item",
  th_qty: "Qty",
  th_unit: "Unit",
  th_note: "Note",

  toast_enter_values: "Enter inputs to calculate.",
  toast_need_calc_first: "Calculate first.",
  toast_reset: "Reset ✅",
  copy_ok: "✅ Result copied",
  copy_failed: "Copy failed.",
  table_copy_ok: "✅ Table copied",
  table_copy_failed: "Failed to copy table.",
  csv_downloaded: "CSV downloaded ✅",

  cost_title: "Cost",
  cost_opt: "(optional)",
  price_exc: "Excavation work: price per 1 m³",
  price_haul: "Hauling/disposal: price per 1 m³",
  price_trip: "Truck: price per trip (opt.)",
  price_trip_hint: "Works if truck capacity is set.",
  delivery: "Extra (fixed)",
  waste_cost: "Extra, % (for cost)",
  btn_save_prices: "Save prices",
  btn_reset_prices: "Reset prices",
  btn_copy_cost: "Copy cost",
  cost_enter: "Enter prices to see the total cost.",

  row_geom: "Geometry",
  row_overdig: "Overdig",
  row_excavation: "Excavation volume",
  row_bulking: "Bulking",
  row_loose: "Loose volume",
  row_density: "Density",
  row_tonnage: "Tonnage",
  row_truck: "Truck capacity",
  row_trips: "Trips",
},


       flooring: {
    h1: "Flooring Calculator",
    subtitle: "Estimate flooring materials: <b>laminate / vinyl</b> (packs), <b>tile</b> (size + pcs/pack), <b>carpet</b> (roll width → linear meters). Includes chart, materials table, copy and CSV (Excel).",

    auto: "Auto-calc",

    inputTitle: "Enter inputs",
    modeLabel: "Area mode",
    modeRoom: "Room (L×W)",
    modeArea: "Area (m²)",

    typeLabel: "Floor type",
    typeLaminate: "Laminate",
    typeVinyl: "Vinyl (SPC / LVT)",
    typeTile: "Tile",
    typeCarpet: "Carpet",
    typeHint: "Fields below will adapt automatically.",

    lenLabel: "Length (m)",
    widLabel: "Width (m)",
    areaLabel: "Area (m²)",

    cutoutsLabel: "Subtract area (m²) (opt.)",
    cutoutsHint: "If not needed — keep 0.",

    wasteLabel: "Waste / cutting, %",
    wasteHint: "Usually 7–12% (straight), 12–18% (complex).",

    coverPerPackLabel: "Coverage per pack (m²)",
    unitNameLabel: "Unit name",

    tileSizeTitle: "Tile size",
    tileLenLabel: "Length (mm)",
    tileWidLabel: "Width (mm)",
    tilesPerPackLabel: "Pieces per pack",
    tileHint: "Shows pieces and packs. Buying is usually by packs.",
    unitNameTileLabel: "Unit name",
    roundingLabel: "Rounding",
    roundPacks: "Round packs up",
    roundPieces: "Round pieces up",

    rollWidthLabel: "Roll width (m)",
    rollHint: "Linear meters = (area with waste) / roll width.",
    carpetUnitLabel: "Unit name",

    btnCalc: "Calculate",
    btnReset: "Reset",
    btnCopy: "Copy result",

    resultTitle: "Result",
    resultPlaceholder: "Enter inputs to calculate.",

    chartTitle: "Chart",
    chartHint: "Visualization of key metrics.",

    tableTitle: "Materials table",
    tableOpen: "(open)",
    btnCopyTable: "Copy table",
    btnCsv: "📄 Download (Excel)",
    thItem: "Item",
    thQty: "Qty",
    thUnit: "Unit",
    thNote: "Note",

    costTitle: "Material cost",
    costOpt: "(optional)",
    priceLabel: "Price",
    priceHint: "For carpet — price per m². For others — price per pack.",
    deliveryLabel: "Delivery (fixed)",
    wasteCostLabel: "Waste, % (for cost)",
    btnSavePrices: "Save prices",
    btnResetPrices: "Reset prices",
    btnCopyCost: "Copy cost",
    costPlaceholder: "Enter prices to see the total cost.",

    linkPlaster: "Plaster calculator",
    linkConcrete: "Concrete calculator",

    seoH2: "How it works",
    seoP: "Choose floor type → enter area and waste → get packs/pieces or linear meters for carpet.",
  },

      plaster :{
  h1: "Plastering Calculator",
  subtitle: "Estimate materials for plastering: <b>dry mix (bags)</b> or <b>cement + sand</b>. Includes chart, materials table, copy and CSV (Excel).",
  auto: "Auto-calc",

  input_title: "Enter inputs",
  mode_label: "Mode",
  mode_wall: "Wall (L×H)",
  mode_area: "Area (m²)",
  mode_hint: "Wall: enter length and height. Area: enter only m².",

  mix_type_label: "Plaster type",
  mix_bags: "Dry mix (bags)",
  mix_cs: "Cement + sand (DIY)",
  mix_type_hint: "Choose what you want to estimate: bags or cement-sand mix.",

  length_label: "Length (m)",
  height_label: "Height (m)",
  area_label: "Area (m²)",

  openings_label: "Openings area (m²) (opt.)",
  openings_hint: "Total windows/doors area. Subtracted from plaster area.",

  thickness_label: "Layer thickness (mm)",
  thickness_hint: "Average thickness. Add extra for uneven walls.",

  cons_label: "Consumption (kg/m² per 10 mm)",
  cons_hint: "Use the value from the bag. Typical 8–10 kg/m² per 10 mm.",
  bagkg_label: "Bag weight (kg)",
  water_lkg_label: "Water (L per 1 kg) (opt.)",
  water_lkg_hint: "Leave empty if unknown — water won’t be calculated.",
  bags_formula_hint: "Formula: kg = area × consumption × (thickness/10) × (1 + waste%).",

  ratio_title: "Ratio (by volume)",
  ratio_c: "Cement (C)",
  ratio_s: "Sand (S)",
  ratio_wc: "Water/cement (W/C)",
  ratio_hint: "• 1:3 means 1 part cement + 3 parts sand (by volume).<br>• W/C = 0.5 means ~0.5 L water per 1 kg cement.<br>• Typical: 1:3 or 1:4 • W/C ~ 0.45–0.6",

  cement_density: "Cement density (kg/m³)",
  sand_density: "Sand density (kg/m³)",
  cement_bagkg: "Cement bag weight (kg)",

  waste_label: "Waste / extra, %",
  waste_hint: "Typical 5–15% depending on losses and surface.",

  btn_calc: "Calculate",
  btn_reset: "Reset",
  btn_copy: "Copy result",

  result_title: "Result",
  result_enter: "Enter inputs to calculate.",

  chart_title: "Chart",
  chart_hint: "Visualization of key values (depends on selected mode).",

  table_title: "Materials table",
  table_open: "(open)",
  btn_copy_table: "Copy table",
  btn_csv: "📄 Download (Excel)",
  th_item: "Item",
  th_qty: "Qty",
  th_unit: "Unit",
  th_note: "Note",

  cost_title: "Material cost",
  cost_opt: "(optional)",
  price_per_bag: "Mix: price per bag",
  price_per_bag_hint: "In cement+sand mode, this means “cement price per bag”.",
  price_sand: "Sand: price per 1 m³",
  price_water: "Water: price per 1 L (opt.)",
  delivery: "Delivery (fixed)",
  waste_cost: "Waste/extra, % (for cost)",
  waste_cost_hint: "Separate from material quantity waste.",
  btn_save_prices: "Save prices",
  btn_reset_prices: "Reset prices",
  btn_copy_cost: "Copy cost",
  cost_enter: "Enter prices to see the total cost.",
},
      brick: {
  unit_mm: "mm",
  label_joint: "Joint",
  note_waste: "waste",
  toast_enter_values: "Enter inputs to calculate.",
  toast_need_calc_first: "Calculate first.",
  toast_reset: "Reset done.",
  result_enter_values: "Enter inputs to calculate.",

  main: "Bricks quantity",

  kpi_area: "Net area",
  kpi_area_hint: "After openings",

  kpi_wall_volume: "Wall volume",
  kpi_wall_volume_hint: "Area × thickness",

  kpi_bricks_no_waste: "Bricks (no waste)",
  kpi_bricks_no_waste_hint: "By module with joint",

  kpi_mortar: "Mortar",

  summary: "Parameters",
  summary2: "Materials",
  summary_hint: "Mortar ≈ (wall volume − solid brick volume). Add 5–10% extra for real-world waste.",

  item_bricks: "Bricks",
  item_mortar: "Mortar",
  item_area: "Net masonry area",
  item_wall_volume: "Wall volume",

  note_volume: "Volume estimate",
  note_no_waste: "no waste",
  note_waste: "waste",
  note_liters_approx: "≈",
  note_openings: "Area after subtracting openings",
  note_area_times_thickness: "Area × thickness",

  chart_need_data: "Calculate to see the chart.",
  chart_wall: "Wall",
  chart_mortar: "Mortar",
  chart_mortar_waste: "Mortar+waste",

  copied_result: "Result copied.",
  copy_failed: "Copy failed.",
  copied_table: "Table copied.",
  copy_table_failed: "Failed to copy table.",
  csv_downloaded: "CSV downloaded.",

  unit_pcs: "pcs",
  unit_m2: "m²",
  unit_m3: "m³",
  unit_liters: "L",

  label_joint: "Joint (mm)",

  cost_need_calc_first: "Calculate first.",
  cost_enter_prices: "Enter prices to see the total cost.",
  cost_nothing_to_copy: "Nothing to copy.",
  cost_copied: "Copied.",
  cost_saved: "Prices saved.",
  cost_reset: "Prices reset.",

  common_total_cost: "Total cost",
  common_subtotal: "Subtotal",
  common_delivery: "Delivery",
  common_price_per_m2: "Price per 1 m²",
},


      conc:{
            toast_enter_values: "Enter dimensions to calculate.",
            toast_need_calc_first: "Calculate first.",
            toast_reset: "Reset.",
            result_enter_values: "Enter dimensions to calculate.",

            main: "Concrete volume",

            kpi_wet: "Wet volume",
            kpi_wet_hint: "From dimensions",
            kpi_dry: "Dry volume",
            kpi_dry_hint: "Wet × dry factor",
            kpi_cement: "Cement",
            kpi_water: "Water",
            kpi_water_hint: "From W/C ratio",

            unit_bags: "bags",

            summary: "Mix ratio",
            summary2: "Materials (by dry volume)",
            summary_hint: "Notes: cement density ≈ 1440 kg/m³. Water liters ≈ cement(kg) × W/C.",

            item_cement: "Cement",
            item_sand: "Sand",
            item_gravel: "Gravel",
            item_water: "Water",
            note_volume: "Volume estimate",

            chart_need_data: "Run a calculation to see the chart.",
            chart_cement: "Cement",
            chart_sand: "Sand",
            chart_gravel: "Gravel",

            copied_result: "Result copied.",
            copy_failed: "Copy failed.",
            copied_table: "Table copied.",
            copy_table_failed: "Copy failed.",
            csv_downloaded: "CSV downloaded.",

            label_thickness: "Thickness (m)",
            label_thickness_wall: "Thickness (m)",
            label_height: "Height (m)",
          },

      cc:{
  nbu_title: "NBU rates (USD/EUR)",
  nbu_badge: "NBU rates: USD {usd} / EUR {eur}{datePart}",
  nbu_unavailable: "NBU rates: unavailable",

  toast_nbu_not_loaded_fallback: "NBU rates didn’t load — showing UAH.",
  toast_enter_values: "Enter area and cost per m².",
  toast_weights_normalized: "Warning: stage weights don’t sum to 100%. Normalizing automatically.",
  toast_reset: "Reset.",
  toast_need_calc_first: "Calculate first.",

  result_enter_values: "Enter area and cost per m².",

  main_total: "Total cost",

  kpi_base: "Base budget",
  kpi_base_hint: "Area × cost per m²",

  kpi_total: "Total",
  kpi_total_hint: "Base + contingency + taxes + extras",

  kpi_per_m2: "Cost per m² (effective)",
  kpi_per_m2_hint: "Including add-ons",

  kpi_additions: "Add-ons",
  kpi_additions_hint: "Contingency + taxes + extras",

  summary: "Breakdown",
  summary_hint: "Stages split the base budget; contingency/taxes/extras are added on top.",

  stage_foundation: "Foundation",
  stage_walls: "Walls / structure",
  stage_roof: "Roof",
  stage_windows: "Windows / facade",
  stage_engineering: "Engineering",
  stage_interior: "Interior finishes",

  chart_need_data: "Run a calculation to see the chart.",
  legend: "Cumulative",

  copied_result: "Result copied.",
  copy_failed: "Copy failed.",

  copied_table: "Table copied.",
  copy_table_failed: "Copy failed.",
  csv_downloaded: "CSV downloaded.",
},

      infl:{
  main: "Real value",

  toast_enter_values: "Enter amount and period.",
  result_enter_values: "Enter amount, inflation rate, and period.",
  toast_reset: "Reset.",
  toast_need_calc_first: "Calculate first.",
  copied_result: "Result copied.",
  copy_failed: "Copy failed.",

  chart_need_data: "Run the calculation to see the chart.",

  legend_nominal: "Nominal",
  legend_real: "Real",

  kpi_real: "Real (today’s money)",
  kpi_real_hint: "Purchasing power",

  kpi_required: "Required nominal",
  kpi_required_hint: "To keep the same purchasing power",

  kpi_nominal: "Final nominal",
  kpi_factor: "Inflation factor",

  kpi_loss: "Purchasing power loss",
  kpi_loss_hint: "Over the selected period",

  summary: "Summary",
  summary_hint: "Real = nominal / (1+inflation)^years. Monthly additions are included and also lose value over time.",

  copied_table: "Table copied.",
  copy_table_failed: "Failed to copy table.",
  csv_downloaded: "CSV downloaded.",
  nbu_badge: "NBU rate: USD {usd} / EUR {eur}{datePart}",
nbu_title: "NBU rate (USD/EUR)",
nbu_unavailable: "NBU rate: unavailable",
toast_nbu_not_loaded_fallback: "NBU rate didn’t load — showing UAH.",
},

      pension:{
  nbu_badge: "NBU rate: USD {usd} / EUR {eur}{datePart}",
  nbu_title: "NBU rate (USD/EUR)",
  nbu_unavailable: "NBU rate: unavailable",

  main: "Retirement savings",

  toast_bad_ages: "Check current age and retirement age.",
  toast_enter_values: "Enter values to calculate.",
  result_enter_values: "Enter ages, amount, and expected return.",
  toast_reset: "Reset.",
  toast_need_calc_first: "Calculate first.",
  copied_result: "Result copied.",
  copy_failed: "Copy failed.",

  toast_nbu_not_loaded_fallback: "NBU rate didn’t load — showing UAH.",
  chart_need_data: "Run the calculation to see the chart.",

  kpi_final: "Final amount",
  kpi_horizon: "Horizon",
  y: "yr",
  m: "mo",
  kpi_contrib: "Contributed",
  kpi_contrib_hint: "Current savings + contributions",
  kpi_profit: "Earned",
  kpi_profit_pct: "% of contributed",
  kpi_monthly: "Monthly contribution",
  kpi_monthly_hint: "Recurring contributions until retirement",

  summary: "Contributed and earned",
  summary_hint: "Chart shows end-of-year balance. Currency can be switched to USD/EUR using NBU rates.",
  copied_table: "Table copied.",
copy_table_failed: "Failed to copy table.",
csv_downloaded: "CSV downloaded.",
},

      roi: {
  nbu_badge: "NBU rate: USD {usd} / EUR {eur}{datePart}",
  nbu_title: "NBU rate (USD/EUR)",
  nbu_unavailable: "NBU rate: unavailable",

  toast_enter_values: "Enter investment amount and period.",
  result_enter_values: "Enter investment amount, expected return, and period.",
  toast_reset: "Reset.",
  toast_need_calc_first: "Calculate first.",
  copied_result: "Result copied.",
  copy_failed: "Copy failed.",
  toast_nbu_not_loaded_fallback: "NBU rate didn’t load — showing UAH.",

  main: "ROI",
  final: "Final amount",
  kpi_roi: "ROI",
  kpi_roi_hint: "Profit / contributed",
  kpi_profit: "Net profit",
  kpi_profit_pct: "% of contributed",
  kpi_contributed: "Contributed",
  kpi_contributed_hint: "Initial + contributions",
  kpi_final: "Final amount",
  kpi_final_hint: "End-of-period balance",
  summary: "Contributed and earned",
  summary_hint: "Chart shows end-of-year balance. Currency can be switched to USD/EUR (NBU rate).",
  chart_need_data: "Run the calculation to see the chart.",
  copied_table: "Table copied.",
  copy_table_failed: "Failed to copy table.",
  csv_downloaded: "CSV downloaded.",
  main: "ROI",
  final: "Final amount",

    toast_enter_values: "Enter investment amount and period.",
    result_enter_values: "Enter investment amount, expected return, and period.",
    toast_reset: "Reset.",
    toast_need_calc_first: "Calculate first.",
    copy_failed: "Failed to copy result.",

    chart_need_data: "Run the calculation to see the chart.",

    nbu_badge: "NBU rate: USD {usd} / EUR {eur}{datePart}",
    nbu_title: "NBU rate (USD/EUR)",
    nbu_unavailable: "NBU rate: unavailable",
    toast_nbu_not_loaded_fallback: "NBU rate didn’t load — showing UAH.",

    kpi_roi: "ROI",
    kpi_roi_hint: "Profit / contributed",

    kpi_profit: "Net profit",
    kpi_profit_pct: "% of contributed",

    kpi_contributed: "Contributed",
    kpi_contributed_hint: "Initial + contributions",

    kpi_final: "Final amount",
    kpi_final_hint: "End-of-period balance",

    summary: "Contributed and earned",
},

      comp:{
  nbu_badge: "NBU rate: USD {usd} / EUR {eur}{datePart}",
  nbu_title: "NBU rate (USD/EUR)",
  nbu_unavailable: "NBU rate: unavailable",

  toast_enter_values: "Enter the initial amount and period.",
  result_enter_values: "Enter the initial amount, rate, and period.",
  toast_reset: "Reset.",
  toast_need_calc_first: "Calculate first.",
  copied_result: "Result copied.",
  copy_failed: "Copy failed.",
  copied_table: "Table copied.",
  copy_table_failed: "Failed to copy table.",
  csv_downloaded: "CSV downloaded.",
  toast_nbu_not_loaded_fallback: "NBU rate didn’t load — showing UAH.",

  final: "Final amount",
  kpi_contributed: "Contributed",
  kpi_earned: "Earned",
  kpi_earned_pct: "Return",
  kpi_ratio: "Contributed vs earned",
  kpi_ratio_hint: "Earned / contributed",
  kpi_final: "Final balance",
  kpi_years: "Years",
  kpi_freq: "Frequency",

  freq_monthly: "monthly",
  freq_quarterly: "quarterly",
  freq_yearly: "yearly",

  summary: "Contributed and earned",
  summary_hint: "Chart and table use end-of-year balances. You can switch currency to USD/EUR (NBU rate).",
  chart_need_data: "Run the calculation to see the chart."
},

       salary:{
  nbu_badge: "NBU rate: USD {usd} / EUR {eur}{datePart}",
  nbu_title: "NBU rate (USD/EUR)",
  nbu_unavailable: "NBU rate: unavailable",

  toast_enter_values: "Enter an amount to calculate.",
  result_enter_values: "Enter an amount to calculate.",
  toast_reset: "Reset.",
  toast_need_calc_first: "Calculate first.",
  copied_result: "Result copied.",
  copy_failed: "Copy failed.",
  copied_table: "Table copied.",
  copy_table_failed: "Failed to copy table.",
  csv_downloaded: "CSV downloaded.",
  toast_nbu_not_loaded_fallback: "NBU rate didn’t load — showing UAH.",

  net_inhand: "Take-home",
  period: "period",
  period_month: "month",
  period_year: "year",

  mode_gross2net: "gross → take-home",
  mode_net2gross: "take-home → gross",

  kpi_gross: "Gross (base)",
  kpi_taxes: "Taxes",
  kpi_bonus: "Bonus",
  kpi_deductions: "Deductions",
  kpi_employer_cost: "Employer cost",
  kpi_esv: "SSC",
  kpi_tax_rate: "Rate",
  kpi_mode: "Mode",

  summary_net: "Take-home",
  summary_hint: "In the schedule: values are shown in ₴ and can be converted to USD/EUR using NBU rates."
},

      deposit: {
  // NBU
  nbu_badge: "NBU rate: USD {usd} / EUR {eur}{datePart}",
  nbu_title: "NBU exchange rate (USD/EUR)",
  nbu_unavailable: "NBU rate: unavailable",
  toast_nbu_not_loaded_fallback: "NBU rates not loaded — showing UAH.",

  // Result / toasts
  toast_enter_values: "Enter the amount and term.",
  toast_reset: "Reset.",
  toast_need_calc_first: "Calculate first.",
  copied_result: "Result copied.",
  copy_failed: "Copy failed.",
  copied_table: "Table copied.",
  copy_table_failed: "Failed to copy table.",
  csv_downloaded: "CSV downloaded.",
  result_enter_values: "Enter amount, rate, and term.",

  // KPI labels
  per_income_net: "Net income",
  kpi_interest_gross: "Gross interest",
  kpi_period: "Accrual",
  kpi_tax: "Taxes",
  kpi_tax_rate: "Rate",
  kpi_interest_net: "Net interest",
  kpi_after_tax: "After tax",
  kpi_final_balance: "Final balance",
  cap_on: "With capitalization",
  cap_off: "No capitalization",

  // Period labels
  period_daily: "daily (365)",
  period_monthly: "monthly",

  // Summary
  summary_topups: "Top-ups",
  summary_hint: "In the schedule, values are in UAH and can be converted to USD/EUR using NBU rates.",
},
      percent: {
  // hints
  hint_pick_mode: "Choose a mode and click “Calculate”.",
  hint_enter_and_calc: "Enter values and click “Calculate”.",

  // common words
  formula: "Formula",
  old: "Old",
  new: "New",

  // actions / directions
  increase: "Increase",
  decrease: "Decrease",
  growth: "Growth",
  drop: "Drop",
  no_change: "No change",

  // lines
  t1_line: "{p}% of {x} = {r}",
  t2_line: "{part} is {p}% of {total}",
  t3_line: "{action} {x} by {p}% = {r}",
  t4_line: "{dir}: {p}%",

  // toasts
  reset_done: "Reset ✅",
  copy_first_calc: "Calculate first 🙂",
  copy_ok: "✅ Result copied",
  copy_failed: "Copy failed (browser blocked it).",

  // errors
  err_number_and_percent: "Enter a number and a percent.",
  err_part_and_total: "Enter a part and a total.",
  err_total_zero: "Total can’t be 0.",
  err_old_new: "Enter “Old” and “New”.",
  err_old_zero: "Old value can’t be 0 to calculate percent change.",
},
      oscpv: {
  dash: "—",
  uah: "UAH",

  // buttons
  copy_link_btn: "Copy link",
  copy_result_btn: "Copy result",
  link_copied: "Link copied ✅",
  result_copied: "Result copied ✅",
  copy_failed: "Copy failed",

  // verdict
  verdict_invalid: "Enter valid values to see the difference between Car 1 and Car 2.",
  verdict_baseline: "Car 1 ≈ {a} UAH, Car 2 ≈ {b} UAH.",
  verdict_ok: "{base} Small difference: +{pct}%.",
  verdict_warn: "{base} Car 2 is more expensive by +{pct}%.",
  verdict_bad: "{base} Very large difference: roughly {ratio}× more expensive.",

  // tiles
  tile_range: "range: {min} – {max}",
  tile_base_and_range: "base: {base} | {min} – {max}",

  regions: {
    kyiv: "Kyiv",
    oblast: "Regional center",
    city: "Other city",
    rural: "Rural area",
  },

  insurers: {
    market: "Market average",
    tas: "TAS",
    arx: "ARX",
    pzu: "PZU",
    uniqa: "UNIQA",
    ingo: "INGO",
  },

  // copy text
  copy_title: "OSCPV calculator (market model)",
  copy_insurer: "Insurer",
  copy_base: "Base",
  copy_car1: "Car 1",
  copy_car2: "Car 2",
  copy_range: "from {min} to {max}",
  copy_avg: "avg {avg}",
  copy_ratio: "Car 2 / Car 1 ratio: ~{x}×",
},

      ipoteca: {
        // UI / buttons
        title: "Mortgage calculator",
        calculate: "Calculate",
        reset: "Reset",
        copy: "Copy",
        share: "Share",
        copied: "Copied ✅",
        copied_result: "✅ Result copied",
        copied_table: "✅ Table copied",
        csv_downloaded: "CSV downloaded ✅",

        // Down payment mode
        dp_mode_uah: "Down payment (UAH)",
        dp_mode_pct: "Down payment (%)",
        dp_hint_uah: "Example: 400,000 ₴",
        dp_hint_pct: "Example: 20%",

        // Validation / toasts
        toast_reset: "Reset ✅",
        toast_need_calc_first: "Run a calculation first 🙂",
        toast_enter_values: "Enter price, down payment, and term (years).",
        result_enter_values: "Enter price, down payment, rate and term.",
        toast_nbu_unavailable: "⚠️ NBU is temporarily unavailable. Using cached rates.",
        toast_nbu_not_loaded_fallback: "NBU rates not loaded — showing ₴.",

        // NBU badge
        nbu_unavailable: "NBU rates: unavailable",
        nbu_title: "Official NBU exchange rates",
        nbu_badge: "NBU: $ {usd} / € {eur}{datePart}",

        // Result blocks
        per_month: "{value} / mo",
        type_annuity: "Annuity",
        type_diff: "Differentiated",

        kpi_payment_no_fees: "Payment (no fees)",
        kpi_payment_with_costs: "Payment (with costs)",
        kpi_overpay_interest: "Overpayment (interest)",
        kpi_total_paid: "Total (payments + costs)",

        kpi_calc_type: "Calculated: {type}",
        kpi_with_costs_note: "Monthly costs included",
        kpi_interest_note: "Interest only over the term",
        kpi_total_note: "Payments + one-time + monthly",

        summary_costs: "Fees and costs: {value}",
        hint_avg:
          "Tip: average payment (no fees) ≈ {avg}, with costs ≈ {avg2}.",

        // Schedule table
        th_payment: "Payment ({sym})",
        th_interest: "Interest ({sym})",
        th_principal: "Principal ({sym})",
        th_costs: "Costs ({sym})",
        th_balance: "Balance ({sym})",
      },

      import: {
          dash: "—",

          calc_ready: "Calculation is ready ✅",
          err_rates_not_ready: "NBU rates are not loaded yet. Try again or reload the page.",
          err_car_price: "Enter a valid car price.",
          link_copied: "Link copied ✅",
          copy_link_prompt: "Copy this link:",
          no_result_to_copy: "No result to copy.",
          result_copied: "Result copied ✅",

          total_sub_customs: "customs: {pct}%",
          total_sub_top: "largest item: {label}",

          kpi_car: "Car price",
          kpi_delivery: "Delivery",
          kpi_customs: "Customs",
          kpi_cert: "Certification",
          kpi_reg: "Registration",
          kpi_other: "Other (service/agent/unexpected)",

          customs_value: "Customs value",
          customs_value_sub: "Car price + delivery",
          duty: "Duty (10%)",
          duty_ev_zero: "In this model EV duty = 0",
          duty_10pct: "10% of customs value",
          excise: "Excise",
          excise_ev_zero: "For EV = 0",
          excise_sub: "Base: €{base} • age coef: {age}",
          vat: "VAT (20%)",
          vat_sub: "20% of (customs value + duty + excise)",
          customs_total: "Total customs",
          customs_note:
            "<b>Note:</b> simplified estimate. Real amounts depend on benefits, vehicle category, customs valuation and documents.",

          verdict_ok_title: "✅ Turnkey estimate is ready",
          verdict_ok_hint:
            "This is an approximate estimate. Real totals depend on documents, customs valuation, benefits and extra services.",
          verdict_warn_title: "⚠️ Customs take a large share",
          verdict_warn_hint:
            "If the number looks too high, double-check engine size/year/fuel type and extra costs.",
          verdict_short: "Turnkey: ≈ {total}. Customs: {pct}% of total.",
          verdict_long: "Largest item: <b>{label}</b> — {money} ({pct}%).",
        },

      evc: {
        hint_enter_and_calc: "Enter values and click “Calculate”.",

        source_home: "Home charging",
        source_station: "Charging station",
        from_to: "from {now}% to {target}%",
        losses: "losses: {loss}%",

        station_price_per_min: "Price (UAH / min)",
        station_price_per_kwh: "Price (UAH / kWh)",
        station_hint_min: "In UAH/min mode power is required to estimate time.",
        station_hint_kwh: "Energy tariff (kWh).",

        unit_kwh: "kWh",
        unit_uah: "UAH",
        unit_h: "h",
        unit_min: "min",
        unit_uah_per_min: "UAH/min",
        unit_uah_per_kwh: "UAH/kWh",

        kpi_to_battery: "Energy to battery",
        kpi_from_grid: "From grid (incl. losses)",
        kpi_time: "Estimated time",
        time_need_power: "Enter charging power (kW) to calculate time.",
        power_kw: "power {p} kW",
        kpi_cost: "Cost ({mode})",

        mode_home: "home",
        mode_station_min: "station (UAH/min)",
        mode_station_kwh: "station (UAH/kWh)",

        price_home_label: "Tariff UAH/kWh",
        price_station_label_min: "Tariff UAH/min",
        price_station_label_kwh: "Tariff UAH/kWh",

        err_cap: "Enter battery capacity (kWh) greater than 0.",
        err_now: "Current charge must be 0–100%.",
        err_target: "Target charge must be 0–100%.",
        err_target_gt_now: "Target (%) must be greater than current (%).",
        err_power: "Enter charging power (kW) greater than 0.",
        err_price_home: "Enter home tariff (UAH/kWh) greater than 0.",
        err_price_station: "Enter station price ({unit}) greater than 0.",
        err_min_need_power: "For UAH/min pricing you need charging power (kW) to estimate time.",

        cheaper_home: "Home charging is cheaper. Difference: <b>{diff} UAH</b>",
        cheaper_station: "Station charging is cheaper. Difference: <b>{diff} UAH</b>",
        same_cost: "Costs are the same.",

        explain_base: "Explanation: (Capacity) × (Δ%) = kWh to the battery, then divide by (1 − losses).",
        explain_min: "For UAH/min: cost = minutes × tariff.",

        link_copied: "Link copied ✅",
        copy_link_prompt: "Copy this link:",
        // compare-ui
compare_title: "Compare",
compare_home_time: "Home outlet • Time",
compare_home_cost: "Home outlet • Cost",
compare_station_time: "Station • Time",
compare_station_cost: "Station • Cost",

tariff_label: "Tariff",
station_formula_kwh: "Station (UAH/kWh): cost = grid kWh × tariff.",
station_formula_min: "Station (UAH/min): cost = minutes × tariff.",

// short units
unit_h_short: "h",
unit_min_short: "min",
unit_kw: "kW",
      },
      customs: {
          mode_ev: "EV",
          mode_ice: "ICE",

          age_dash: "Age: —",
          age_years: "Age: {age}y",

          sub_hint: "Customs value: {customs_value_input} → {customs_value_uah} · Excise: {excise_eur} €",

          link_copied: "Link copied ✅",
          link_copy_failed: "Couldn’t copy 😕",
          reset_done: "Reset ✅",
        },
      wheels: {
        unit_m: "m",
          hint_enter_and_calc: "Enter values and click “Calculate”.",

          err_width_mm: "width (mm)",
          err_aspect_pct: "aspect (%)",
          err_rim_r: "rim (R)",
          err_fill_correct_size: "Fill in correctly: {fields} for Size {n}.",

          kpi_sidewall: "Sidewall height",
          kpi_rim_diameter: "Rim diameter",
          kpi_wheel_diameter: "Wheel diameter",

          difference: "Difference",
          diameter: "Diameter",
          clearance: "Ground clearance",
          circumference: "Circumference",
          speedometer_error: "Speedometer error",
          at_100: "at 100 km/h actual is ≈",
          explanation:
            "Explanation: if circumference is larger, the car travels farther per wheel revolution, so the real speed is higher.",

          single_result: "Size 1: {size} • Diameter: {dia} • Circumference: {circ}",
          compare_line: "Comparison: {s1} → {s2} ({band})",
          within_2: "within ±2%",
          outside_2: "outside ±2%",

          verdict_ok_title: "✅ Safe to use",
          verdict_ok_short: "Diameter difference: {pct}% (within the normal range).",
          verdict_ok_long:
            "Diameter change is {pct}%, which is within the acceptable range. Speedometer error is minimal, ABS/ESP should work normally.",

          verdict_warn_title: "⚠️ Acceptable, but check clearances",
          verdict_warn_short: "Diameter difference: {pct}% (near the ±2% limit).",
          verdict_warn_long:
            "Diameter change is {pct}%, close to the ±2% rule. Check wheel arch clearances and full steering lock.",

          verdict_bad_title: "❌ Not recommended (ABS/ESP risk)",
          verdict_bad_short: "Diameter difference: {pct}% (outside the ±2% limit).",
          verdict_bad_long:
            "Diameter change of {pct}% exceeds the ±2% limit. It can affect speedometer accuracy, ABS/ESP operation and clearances.",

          verdict_hint_bigger:
            "Speedometer will show LOWER than real speed (~{err}%). Ground clearance increases by about {mm} mm.",
          verdict_hint_smaller:
            "Speedometer will show HIGHER than real speed (~{err}%). Ground clearance decreases by about {mm} mm.",
          verdict_hint_same:
            "Same diameter — ground clearance and speedometer readings won’t change.",
          verdict_seo:
            "Can you fit {s2} instead of {s1}? Check diameter, clearance and speedometer error.",

          link_copied: "Link copied ✅",
          copy_link_prompt: "Copy this link:",
          nothing_to_copy: "No result to copy.",
          result_copied: "Result copied ✅",
          copy_result_prompt: "Copy the result:",
        },
      common: {
        unit_m: "m",
        cheaper: "Cheaper",
        calculate: "Calculate",
        clear: "Clear",
        copy: "Copy",
        share: "Share",
        copied: "Copied ✅",
        on: "On",
        off: "Off",
        unit_km: "km",
        unit_km_h: "km/h",
        unit_mm: "mm",
        unit_cm: "cm",
        unit_l: "L",
        unit_uah: "UAH",
        unit_uah_per_km: "UAH/km",
        unit_l_per_100_km: "L/100 km",
        unit_kwh: "kWh",
        unit_kwh_per_100_km: "kWh/100 km",
      },

      fuel: {
        fuel_spent: "Fuel used",
        energy_spent: "Energy used",
        route_cost: "Trip cost",
        route_cost_total: "Trip cost (total)",
        route_cost_with_losses: "Trip cost (losses {loss}%)",
        cost_per_1_km: "Cost per 1 km",
        cost_100_km: "Cost per 100 km",
        resource_100_km: "Consumption per 100 km",
        full_tank_range: "Full tank ≈ range",
        full_battery_range: "Full battery ≈ range",
        full_tank_cost: "Full tank cost",
        full_battery_cost: "Full battery cost",
        comparison: "Comparison",
        conclusion: "Conclusion",
        diff_per_100_km: "Difference per 100 km",
        saving_month: "Savings / month (≈ {km} km)",
        saving_year: "Savings / year ({km} km)",
        same_cost: "Costs are practically the same.",
        cheaper_car_1: "Cheaper: <b>Car 1</b> by <b>{diff} UAH</b> per trip.",
        cheaper_car_2: "Cheaper: <b>Car 2</b> by <b>{diff} UAH</b> per trip.",
        err_distance: "Enter a trip distance greater than 0 km.",
      },

      currency: {
        ua_label: "UAH — Ukrainian hryvnia",
        ua_name: "Ukrainian hryvnia",
        nbu_badge: "NBU rate: {date}",

        nbu_unavailable_cached: "⚠️ NBU is temporarily unavailable. Using cached rates.",
        nbu_failed: "Failed to load NBU rates. Please try again later.",

        err_amount: "Enter an amount.",
        err_currencies: "Choose currencies.",

        rate: "Rate:",
        formula: "Formula:",
        line_result: "{a} {from} = {b} {to}",

        reset_done: "Reset ✅",
        hint_enter: "Enter an amount and choose currencies.",
        loading: "Loading NBU rates…",

        copy_first_calc: "Calculate first 🙂",
        copy_ok: "✅ Result copied",
        copy_failed: "Copy failed (browser blocked it).",
      },

      tco: {
        hint_enter_and_calc: "Enter values and click “Calculate”.",
        fill_km_year_and_years: "Enter annual mileage and ownership period.",
        diff: "Difference",
        payback_km_years: "Payback (km/years)",
        payback_years: "Payback (years)",
        ev_better: "EV is cheaper",
        ice_better: "ICE is cheaper",
        ev_not_payback: "EV does not pay back",
        less_than_year: "Less than 1 year",
        year: "Year",
        ice_sum: "ICE (total)",
        ev_sum: "EV (total)",
        cumulative_note:
          "* Cumulative total (purchase + energy + service) for each year.",

        payback_not_needed: "EV is not more expensive upfront — payback is not needed",
        payback_km_years_value: "≈ {km} km (~ {years} years)",
        payback_years_value: "≈ {years} years",
        assessment_note: "Estimate based on current prices, service and mileage.",
        for_mileage: "For {km} km/year.",
        kpi_meta: "Purchase + energy + service",
        sum_for_years: "(total for {years} yrs)",
        ev_plus: "EV +",
        ice_plus: "ICE +",
        break_even_title_win: "EV becomes cheaper around year {year}",
        break_even_title_no: "Over {years} years EV does not become cheaper",
        link_copied: "Link copied ✅",
        copy_link_prompt: "Copy this link:",
      },
      brake: {
        surface: { dry: "dry", wet: "wet", snow: "snow", ice: "ice" },
        tire: { summer: "summer tires", winter: "winter tires", studs: "studded", allseason: "all-season", worn: "worn" },
        temp: { warm: "+10..+30°C", cool: "0..+10°C", cold: "<0°C" },

        tile_sub: "reaction {r} m + braking {b} m",

        verdict_invalid: "Enter valid values to see the comparison.",
        verdict_baseline: "At {speed} km/h: Scenario A ≈ {a} m, Scenario B ≈ {b} m.",
        verdict_ok: "{base} Small difference: +{pct}%.",
        verdict_warn: "{base} Scenario B stop is longer by +{pct}%.",
        verdict_bad: "{base} Very dangerous: distance increases by ~{ratio}×.",

        copy_title: "Braking distance calculator",
        copy_speed: "Speed: {speed} km/h",
        copy_reaction: "Reaction: {rt} s → {m} m",
        copy_scenario_a: "Scenario A: {label}",
        copy_scenario_b: "Scenario B: {label}",
        copy_brake: "Braking distance: {m} m",
        copy_total: "Total stopping distance: {m} m",
        copy_ratio: "Difference B/A: ~{x}×",

        copy_link_btn: "Copy link",
        copy_result_btn: "Copy result",
        link_copied: "Link copied ✅",
        result_copied: "Result copied ✅",
        copy_failed: "Copy failed",
        
      },
      credit: {
        nbu_badge: "NBU rate: {date}",
        nbu_badge_title: "Official NBU rate date: {date}",
        nbu_badge_short: "NBU rate",
        nbu_badge_short_title: "Official NBU exchange rate",
        nbu_unavailable_cached: "⚠️ NBU is temporarily unavailable. Using cached rates.",
        nbu_unavailable_now: "⚠️ NBU rates not loaded yet. Using ₴ for now.",

        th_no: "#",
        th_date: "Date",
        th_payment: "Payment",
        th_interest: "Interest",
        th_principal: "Principal",
        th_fees: "Fees",
        th_balance: "Balance",

        type_annuity: "Annuity",
        type_diff: "Differentiated",

        main_monthly: "{amount} / mo",

        kpi_monthly_no_fees: "Monthly payment <b>(without fees)</b>",
        kpi_calc_type: "Calculated: {type}",
        kpi_monthly_with_fees: "Payment “with fees”",
        kpi_fees_included: "Fees + insurance included",
        kpi_overpay_interest: "Overpayment <b>(interest)</b>",
        kpi_overpay_note: "Excludes one-time fee",
        kpi_total: "Total <b>(Payments + fees)</b>",
        kpi_total_note: "Payments + fees",

        summary_fees: "Fees and extra costs",
        hint_prefix: "Hint",
        hint_avg: "avg payment without fees ≈ <b>{avg1}</b>, with fees ≈ <b>{avg2}</b>.",

        err_amount_term: "Enter a valid amount and term.",
        hint_enter_inputs: "Enter amount, rate and term.",
        hint_enter_inputs_short: "Enter amount and choose parameters.",
        reset_done: "Reset ✅",

        copy_first_calc: "Calculate first 🙂",
        copy_ok: "✅ Result copied",
        copy_failed: "Copy failed (browser blocked it).",
        copy_table_ok: "✅ Table copied",
        copy_table_failed: "Failed to copy the table.",
        csv_downloaded: "CSV downloaded ✅",
      }
    },
  };

  function interpolate(str, vars) {
    if (!vars || typeof vars !== "object") return str;
    let s = str;
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
    return s;
  }

  function getByKey(lang, key) {
    const parts = String(key || "").split(".");
    let obj = DICT[lang];
    for (const p of parts) obj = obj?.[p];
    return obj;
  }

  function t(key, vars) {
    const k = String(key ?? "");
    const val = getByKey(LANG, k) ?? getByKey("uk", k);
    return interpolate(val ?? k, vars);
  }

  function i18nLocale() {
    return LANG === "en" ? "en-US" : "uk-UA";
  }

  window.__LANG__ = LANG;
  window.t = t;
  window.i18nLocale = i18nLocale;
})();
