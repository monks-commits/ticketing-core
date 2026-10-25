/* VA International • UI-only localisation pilot. No ticket, hold or payment logic.
 * For safe sandbox testing: DO NOT publish this build without full QA.
 * Translation memory is scoped to DOM text/attributes; never modifies order data.
 */
(() => {
  'use strict';
  if (window.VAI18N) return;
  const LANGS = ['uk', 'ru', 'en'];
  const STORAGE = 'va_ui_language_v1';
  const rows = [
    // UK SOURCE                                         RU                                               EN
    ['Квитки онлайн — Ваш Адмін', 'Билеты онлайн — Ваш Адмін', 'Online Tickets — Vash Admin'],
    ['Ваш Адмін • Квитки онлайн', 'Ваш Адмін • Билеты онлайн', 'Vash Admin • Online Tickets'],
    ['Ваш Адмін • Live Demo', 'Ваш Адмін • Live Demo', 'Vash Admin • Live Demo'],
    ['Вхід для партнерів', 'Вход для партнёров', 'Partner Login'],
    ['Офіційна онлайн-афіша театрів та майданчиків', 'Официальная онлайн-афиша театров и площадок', 'Official Online Event Listings for Venues and Theatres'],
    ['Оберіть майданчик, перегляньте актуальні події, відкрийте схему залу та придбайте квитки онлайн у кілька кроків.', 'Выберите площадку, посмотрите ближайшие события, откройте схему зала и купите билеты онлайн за несколько шагов.', 'Choose a venue, explore upcoming events, select your seats and buy tickets online in just a few steps.'],
    ['Вибір місць на схемі залу', 'Выбор мест на схеме зала', 'Choose Seats on an Interactive Seating Plan'],
    ['QR-квиток для входу', 'QR-билет для входа', 'QR Ticket for Entry'],
    ['Офіційна покупка без черг', 'Официальная покупка без очередей', 'Official Tickets, No Queues'],
    ['Усі міста', 'Все города', 'All Cities'],
    ['Усі майданчики', 'Все площадки', 'All Venues'],
    ['Кривий Ріг', 'Кривой Рог', 'Kryvyi Rih'],
    ['Дніпро', 'Днепр', 'Dnipro'],
    ['Пошук за назвою події', 'Поиск по названию события', 'Search for Events'],
    ['Показати', 'Показать', 'Show'],
    ['Найближчі події', 'Ближайшие события', 'Upcoming Events'],
    ['Загальна афіша всіх активних сеансів', 'Общая афиша всех активных сеансов', 'All Available Events'],
    ['Про подію', 'О событии', 'About the Event'],
    ['Перейти до афіші', 'Перейти к афише', 'View Events'],
    ['Купити квитки', 'Купить билеты', 'Buy Tickets'],
    ['Дата уточнюється', 'Дата уточняется', 'Date to Be Announced'],
    ['Афіша', 'Афиша', 'Poster'],
    ['Вистава', 'Спектакль', 'Event'],
    ['Подія', 'Событие', 'Event'],
    ['Майданчик', 'Площадка', 'Venue'],
    ['Онлайн-афіша, схема залу та продаж квитків.', 'Онлайн-афиша, схема зала и продажа билетов.', 'Event listings, seating plans and online ticket sales.'],
    ['За цими фільтрами подій немає', 'По этим фильтрам событий нет', 'No Events Match These Filters'],
    ['Поки що немає активних сеансів за обраними фільтрами.', 'Пока нет активных сеансов по выбранным фильтрам.', 'There are no available events for these filters.'],
    ['Демонстраційні події повного циклу VA: афіша, вибір місця, оплата, електронний квиток і контроль входу.', 'Демонстрационные события полного цикла VA: афиша, выбор места, оплата, электронный билет и контроль входа.', 'VA full-cycle demo events: listings, seat selection, payment, e-ticket and admission control.'],
    // Live Poster
    ['Пропустити', 'Пропустить', 'Skip'],
    ['🔊 Увімкнути звук', '🔊 Включить звук', '🔊 Turn Sound On'],
    ['🔇 Вимкнути звук', '🔇 Выключить звук', '🔇 Mute'],
    ['▶ Відтворити', '▶ Воспроизвести', '▶ Play'],
    ['Завантаження Live Poster…', 'Загрузка Live Poster…', 'Loading Live Poster…'],
    ['Сеанс не визначено. Відкриваю схему залу…', 'Сеанс не определён. Открываю схему зала…', 'Event not specified. Opening the seating plan…'],
    ['Натисніть «Відтворити» або «Пропустити».', 'Нажмите «Воспроизвести» или «Пропустить».', 'Select Play or Skip.'],
    // Hall
    ['Схема залу', 'Схема зала', 'Seating Plan'],
    ['Ваш Адмін • Онлайн продаж', 'Ваш Адмін • Онлайн-продажа', 'Vash Admin • Online Ticket Sales'],
    ['Оберіть місця та перейдіть до оформлення замовлення.', 'Выберите места и перейдите к оформлению заказа.', 'Select seats, then proceed to checkout.'],
    ['Ціна', 'Цена', 'Price'],
    ['Вільно', 'Свободно', 'Available'],
    ['Тимчасово заброньовано', 'Временно забронировано', 'On Hold'],
    ['Продано', 'Продано', 'Sold'],
    ['Резерв', 'Резерв', 'Reserved'],
    ['Оберіть місця на схемі нижче.', 'Выберите места на схеме ниже.', 'Choose your seats on the plan below.'],
    ['Обрані місця: немає', 'Выбранные места: нет', 'Selected Seats: None'],
    ['Перейти до оформлення', 'Перейти к оформлению', 'Proceed to Order'],
    ['Кнопка стане активною, коли ви оберете хоча б одне місце.', 'Кнопка станет активной после выбора хотя бы одного места.', 'Select at least one seat to continue.'],
    ['Додати в кошик', 'Добавить в корзину', 'Add to Cart'],
    ['Ціни не задані', 'Цены не указаны', 'Prices Not Available'],
    ['СЦЕНА', 'СЦЕНА', 'STAGE'],
    ['Партер', 'Партер', 'Stalls'],
    ['Амфітеатр', 'Амфитеатр', 'Amphitheatre'],
    ['Балкон', 'Балкон', 'Balcony'],
    ['Ложа А', 'Ложа А', 'Box A'],
    ['Ложа Б', 'Ложа Б', 'Box B'],
    ['Ложа', 'Ложа', 'Box'],
    ['Боковий сектор', 'Боковой сектор', 'Side Section'],
    ['Столи', 'Столы', 'Tables'],
    ['Сектор', 'Сектор', 'Section'],
    ['Зал', 'Зал', 'Hall'],
    ['Можна обрати не більше 12 місць в одному замовленні.', 'В одном заказе можно выбрать не более 12 мест.', 'You can select up to 12 seats per order.'],
    ['Не вдалося утримати місце. Оновлюємо стан залу.', 'Не удалось забронировать место. Обновляем схему зала.', 'Could not hold the seat. Refreshing seat availability.'],
    // Order
    ['Підтвердження вибору', 'Подтверждение выбора', 'Confirm Selection'],
    ['Ваш Адмін • Підтвердження замовлення', 'Ваш Адмін • Подтверждение заказа', 'Vash Admin • Confirm Order'],
    ['Оберіть місця та перейдіть до оплати.', 'Выберите места и перейдите к оплате.', 'Review your seats and proceed to payment.'],
    ['Ваші місця', 'Ваши места', 'Your Seats'],
    ['Перевірте вибір перед оплатою. Видалення місця зі списку одразу знімає його бронювання.', 'Проверьте выбор перед оплатой. Удаление места из списка сразу снимает бронь.', 'Review your seats before payment. Removing a seat will immediately release its hold.'],
    ['Замовлення', 'Заказ', 'Order'],
    ['Квитків', 'Билетов', 'Tickets'],
    ['Дата / час', 'Дата / время', 'Date / Time'],
    ['До сплати', 'К оплате', 'Total Due'],
    ['Перейти до безпечної оплати', 'Перейти к безопасной оплате', 'Proceed to Secure Payment'],
    ['← Повернутись до вибору місць', '← Вернуться к выбору мест', '← Back to Seat Selection'],
    ['Очистити кошик', 'Очистить корзину', 'Clear Cart'],
    ['Після оплати квиток буде сформовано автоматично.', 'После оплаты билет будет сформирован автоматически.', 'Your ticket will be generated automatically after payment.'],
    ['QR-код використовується для контролю входу.', 'QR-код используется для контроля входа.', 'The QR code is used for admission control.'],
    ['Покупка оформлюється в офіційному контурі квиткової системи.', 'Покупка оформляется в официальной билетной системе.', 'Your purchase is processed by the official ticketing system.'],
    ['Дата і час уточнюються', 'Дата и время уточняются', 'Date and Time to Be Announced'],
    ['Кошик порожній', 'Корзина пуста', 'Your Cart Is Empty'],
    ['Видалити', 'Удалить', 'Remove'],
    ['Не вдалося зняти місце з броні.', 'Не удалось снять бронь с места.', 'Could not release the seat.'],
    ['Не вдалося очистити кошик.', 'Не удалось очистить корзину.', 'Could not clear the cart.'],
    ['Не вдалося зняти бронювання', 'Не удалось снять бронь', 'Could not release the reservation'],
    // Checkout
    ['Оплата', 'Оплата', 'Payment'],
    ['Ваш Адмін • Безпечна оплата', 'Ваш Адмін • Безопасная оплата', 'Vash Admin • Secure Payment'],
    ['Оплата замовлення', 'Оплата заказа', 'Order Payment'],
    ['Перевірте дані покупця та перейдіть до оплати через LiqPay.', 'Проверьте данные покупателя и перейдите к оплате через LiqPay.', 'Check your contact details and proceed to payment via LiqPay.'],
    ['Дані покупця', 'Данные покупателя', 'Buyer Details'],
    ['Вкажіть контактні дані для оформлення замовлення. Після успішної оплати квиток буде сформовано автоматично.', 'Укажите контактные данные для оформления заказа. После успешной оплаты билет будет сформирован автоматически.', 'Enter your contact details to place your order. Your ticket will be generated automatically after payment.'],
    ['Ім’я', 'Имя', 'Name'],
    ['Ваше ім’я', 'Ваше имя', 'Your Name'],
    ['Телефон', 'Телефон', 'Phone'],
    ['Сеанс', 'Сеанс', 'Event'],
    ['Сума платежу', 'Сумма платежа', 'Payment Total'],
    ['Оплатити через LiqPay', 'Оплатить через LiqPay', 'Pay via LiqPay'],
    ['← Повернутись до замовлення', '← Вернуться к заказу', '← Back to Order'],
    ['Оплата виконується через захищену сторінку LiqPay.', 'Оплата выполняется на защищённой странице LiqPay.', 'Payment is processed on LiqPay’s secure checkout page.'],
    ['Контактні дані потрібні для оформлення та відправки квитка.', 'Контактные данные нужны для оформления и отправки билета.', 'Contact details are required to issue and send your ticket.'],
    ['Після оплати ви отримаєте підтвердження та квиток із QR-кодом.', 'После оплаты вы получите подтверждение и билет с QR-кодом.', 'After payment you will receive confirmation and a QR ticket.'],
    ['Немає вибраних місць', 'Нет выбранных мест', 'No Seats Selected'],
    ['Заповніть всі поля', 'Заполните все поля', 'Please complete all fields.'],
    ['Gateway-клієнт не завантажено.', 'Клиент Gateway не загружен.', 'Gateway client failed to load.'],
    ['Сесію утримання місць втрачено. Поверніться до схеми залу та оберіть місця повторно.', 'Сессия удержания мест потеряна. Вернитесь к схеме зала и выберите места повторно.', 'Your seat hold has expired. Return to the seating plan and select your seats again.'],
    ['Не вдалося підтвердити утримання місць у майданчика. Поверніться до схеми залу.', 'Не удалось подтвердить бронь мест на площадке. Вернитесь к схеме зала.', 'We could not confirm the venue seat hold. Return to the seating plan.'],
    ['Наразі придбати квитки можна лише в касі.', 'Сейчас билеты можно приобрести только в кассе.', 'Tickets are currently available at the box office only.'],
    ['Не вдалося перейти до оплати. Спробуйте ще раз.', 'Не удалось перейти к оплате. Попробуйте ещё раз.', 'Could not start payment. Please try again.'],
    ['Не вдалося з’єднатися із сервісом оплати. Перевірте інтернет-з’єднання.', 'Не удалось подключиться к платёжному сервису. Проверьте интернет-соединение.', 'Could not connect to the payment service. Check your internet connection.'],
    // Thanks
    ['Дякуємо за оплату', 'Спасибо за оплату', 'Thank You for Your Payment'],
    ['Ваш Адмін • Оплата завершена', 'Ваш Адмін • Оплата завершена', 'Vash Admin • Payment Complete'],
    ['Дякуємо за оплату!', 'Спасибо за оплату!', 'Thank You for Your Payment!'],
    ['Ваше замовлення успішно оформлено. Квиток буде сформовано автоматично та надіслано на email. Якщо лист не надійшов — перевірте папку «Спам».', 'Ваш заказ успешно оформлен. Билет будет создан автоматически и отправлен на email. Если письмо не пришло, проверьте папку «Спам».', 'Your order is complete. Your ticket will be generated automatically and sent by email. If you do not see the email, check your spam folder.'],
    ['Оплату підтверджено', 'Оплата подтверждена', 'Payment Confirmed'],
    ['Замовлення успішно зафіксовано в системі. QR-код буде використано для контролю входу.', 'Заказ успешно сохранён в системе. QR-код будет использоваться для контроля входа.', 'Your order has been recorded. The QR code will be used for admission control.'],
    ['Номер замовлення', 'Номер заказа', 'Order Number'],
    ['Сума оплати', 'Сумма оплаты', 'Amount Paid'],
    ['Ми отримали ваше замовлення. Якщо квиток не прийшов на email — перевірте «Спам» або зверніться до адміністратора майданчика.', 'Мы получили ваш заказ. Если билет не пришёл на email, проверьте папку «Спам» или обратитесь к администрации площадки.', 'We have received your order. If your ticket does not arrive by email, check your spam folder or contact the venue.'],
    ['Електронний квиток має таку ж силу, як і друкований.', 'Электронный билет имеет такую же силу, как и печатный.', 'The e-ticket is as valid as a printed ticket.'],
    ['Для входу достатньо показати QR-код з телефону.', 'Для входа достаточно показать QR-код на телефоне.', 'Show the QR code on your phone to enter.'],
    ['У разі питань звертайтесь до каси або адміністрації майданчика.', 'По всем вопросам обращайтесь в кассу или к администрации площадки.', 'For assistance, contact the box office or venue staff.'],
    ['Повернутися до афіші', 'Вернуться к афише', 'Back to Events'],
    ['Друк сторінки', 'Печать страницы', 'Print Page'],
    ['Технічна довідка', 'Техническая справка', 'Technical Details'],
    ['Не вдалося визначити конкретне замовлення. Дані інших або останніх оплат не завантажуються з міркувань безпеки.', 'Не удалось определить заказ. Данные других или последних платежей не загружаются из соображений безопасности.', 'Cannot identify this order. Other or previous payment details are not loaded for security reasons.'],
    ['Оплату отримано, але дані цього замовлення не завантажились. Оновіть сторінку або зверніться до підтримки.', 'Оплата получена, но данные заказа не загрузились. Обновите страницу или обратитесь в поддержку.', 'Payment received, but order details could not be loaded. Refresh the page or contact support.'],
    ['Платіж ще обробляється. Оновіть сторінку через 10–20 секунд.', 'Платёж ещё обрабатывается. Обновите страницу через 10–20 секунд.', 'Your payment is still processing. Refresh the page in 10–20 seconds.'],
    ['Сталася помилка при завантаженні даних. Оновіть сторінку.', 'Ошибка загрузки данных. Обновите страницу.', 'An error occurred while loading your order. Refresh the page.'],
    // Static ticket template only; actual PDF is generated elsewhere.
    ['Квиток / E-Ticket', 'Билет / E-Ticket', 'Ticket / E-Ticket'],
    ['Квиток дійсний тільки на зазначений захід.', 'Билет действителен только на указанное мероприятие.', 'This ticket is valid only for the specified event.'],
    ['Заборонено копіювання та передача третім особам.', 'Копирование и передача третьим лицам запрещены.', 'Copying and transfer to third parties are prohibited.']
  ];
  const maps = {
    ru: new Map(rows.map(row => [row[0], row[1]])),
    en: new Map(rows.map(row => [row[0], row[2]]))
  };
  const normalize = s => String(s || '').replace(/\s+/g, ' ').trim();
  let locale = 'uk';
  const localeFromQuery = (() => {
    try { return new URL(location.href).searchParams.get('lang'); } catch (_) { return null; }
  })();
  try {
    const stored = localStorage.getItem(STORAGE);
    locale = LANGS.includes(localeFromQuery) ? localeFromQuery : (LANGS.includes(stored) ? stored : 'uk');
    localStorage.setItem(STORAGE, locale);
  } catch (_) { locale = LANGS.includes(localeFromQuery) ? localeFromQuery : 'uk'; }
  const originals = new WeakMap();
  const observed = new WeakMap();
  const attrCache = new WeakMap();
  const attrObserved = new WeakMap();
  const attrNames = ['placeholder', 'title', 'aria-label', 'alt'];
  const patterns = [
    [/^Знайдено подій: (\d+)$/, n => [`Найдено событий: ${n}`, `Events Found: ${n}`]],
    [/^(.+) — демонстраційна афіша$/, x => [`${x} — демонстрационная афиша`, `${x} — Demo Events`]],
    [/^Події (.+)$/, x => [`События ${x}`, `Events at ${x}`]],
    [/^Вистава: (.*)$/, x => [`Спектакль: ${x}`, `Event: ${x}`]],
    [/^Майданчик: (.*)$/, x => [`Площадка: ${x}`, `Venue: ${x}`]],
    [/^Сеанс: (.*)$/, x => [`Сеанс: ${x}`, `Event: ${x}`]],
    [/^Seance: (.*)$/, x => [`Сеанс: ${x}`, `Event: ${x}`]],
    [/^Місць: (\d+)$/, n => [`Мест: ${n}`, `Seats: ${n}`]],
    [/^Обрані місця: (.*)$/, x => [`Выбранные места: ${x === 'немає' ? 'нет' : x}`, `Selected Seats: ${x === 'немає' ? 'None' : x}`]],
    [/^Сума: ([\d.,\s]+) грн$/, x => [`Сумма: ${x} грн`, `Total: ${x} UAH`]],
    [/^Ціна: (.*)$/, x => [`Цена: ${x.replace(/грн/g, 'грн')}`, `Price: ${x.replace(/грн/g, 'UAH')}`]],
    [/^([\d.,\s]+) грн$/, x => [`${x} грн`, `${x} UAH`]],
    [/^Ряд (\d+), місце (\d+) \((.*)\)$/, (r,s,z) => [`Ряд ${r}, место ${s} (${maps.ru.get(z) || z})`, `Row ${r}, Seat ${s} (${maps.en.get(z) || z})`]],
    [/^Партер, ряд (\d+), місце (\d+)$/, (r,s) => [`Партер, ряд ${r}, место ${s}`, `Stalls, Row ${r}, Seat ${s}`]],
    [/^Амфітеатр, ряд (\d+), місце (\d+)$/, (r,s) => [`Амфитеатр, ряд ${r}, место ${s}`, `Amphitheatre, Row ${r}, Seat ${s}`]],
    [/^Балкон, ряд (\d+), місце (\d+)$/, (r,s) => [`Балкон, ряд ${r}, место ${s}`, `Balcony, Row ${r}, Seat ${s}`]],
    [/^Ложа ([АБ]), місце (\d+)$/, (b,s) => [`Ложа ${b}, место ${s}`, `Box ${b === 'А' ? 'A' : 'B'}, Seat ${s}`]],
    [/^(.*), ряд: (\d+), місце: (\d+)$/, (z,r,s) => [`${maps.ru.get(z) || z}, ряд: ${r}, место: ${s}`, `${maps.en.get(z) || z}, Row: ${r}, Seat: ${s}`]],
    [/^(.*), місце: (\d+)$/, (z,s) => [`${maps.ru.get(z) || z}, место: ${s}`, `${maps.en.get(z) || z}, Seat: ${s}`]],
    [/^(\d+) місць$/, n => [`${n} мест`, `${n} seats`]],
    [/^([\d.,\s]+) грн депозит$/, n => [`${n} грн депозит`, `${n} UAH deposit`]],
    [/^([\d.,\s]+) грн \/ місце$/, n => [`${n} грн / место`, `${n} UAH / seat`]],
    [/^Місце вже зайнято: (.+)$/, x => [`Место уже занято: ${x}`, `Seat is no longer available: ${x}`]],
    [/^Дата: (.*)$/, x => [`Дата: ${x}`, `Date: ${x}`]],
    [/^Час: (.*)$/, x => [`Время: ${x}`, `Time: ${x}`]],
    [/^Місце: (.*)$/, x => [`Место: ${x}`, `Seat: ${x}`]],
    [/^Замовлення: (.*)$/, x => [`Заказ: ${x}`, `Order: ${x}`]]
  ];
  function translate(uk, lang = locale) {
    if (lang === 'uk') return uk;
    const source = normalize(uk);
    const direct = maps[lang]?.get(source);
    if (direct !== undefined) return direct;
    for (const [re, formatter] of patterns) {
      const match = source.match(re);
      if (match) return formatter(...match.slice(1))[lang === 'ru' ? 0 : 1];
    }
    return uk;
  }
  function updateText(node) {
    if (node.nodeType !== Node.TEXT_NODE) return;
    const parent = node.parentElement;
    if (!parent || parent.closest('script,style,textarea,pre,code,[data-va-i18n-ignore]')) return;
    const actual = node.nodeValue || '';
    if (actual !== observed.get(node)) originals.set(node, actual);
    const original = originals.get(node) || actual;
    if (!/[А-Яа-яІіЇїЄєҐґ]/.test(original)) { observed.set(node, actual); return; }
    const local = translate(original);
    const next = /^\s|\s$/.test(original) && normalize(original) !== original
      ? original.replace(/^(\s*)[\s\S]*?(\s*)$/, (_, a, b) => a + local + b)
      : local;
    if (actual !== next) node.nodeValue = next;
    observed.set(node, next);
  }
  function updateAttrs(el) {
    if (el.nodeType !== Node.ELEMENT_NODE || el.closest('[data-va-i18n-ignore]')) return;
    let cache = attrCache.get(el);
    let seen = attrObserved.get(el);
    if (!cache) { cache = {}; attrCache.set(el, cache); }
    if (!seen) { seen = {}; attrObserved.set(el, seen); }
    for (const attr of attrNames) {
      if (!el.hasAttribute(attr)) continue;
      const current = el.getAttribute(attr);
      if (seen[attr] !== current) cache[attr] = current;
      const expected = translate(cache[attr]);
      if (current !== expected) el.setAttribute(attr, expected);
      seen[attr] = expected;
    }
  }
  function refresh(root = document.documentElement) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) { updateText(root); return; }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    if (root.matches('script,style,textarea,pre,code,[data-va-i18n-ignore]')) return;
    updateAttrs(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE && node.matches('script,style,textarea,pre,code,[data-va-i18n-ignore]')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) updateText(node);
      else updateAttrs(node);
    }
  }
  const buttons = [];
  function showSwitcher() {
    if (!document.body || document.getElementById('va-language-switch')) return;
    const css = document.createElement('style');
    css.id = 'va-language-style';
    css.textContent = `
      .va-language-switch{display:inline-flex;align-items:center;gap:2px;flex:none;padding:4px;border:1px solid #d4af37;background:#091725;color:#fff;border-radius:999px;box-shadow:0 4px 12px #0003;font-family:Arial,sans-serif;z-index:2147483000;box-sizing:border-box}
      .va-language-switch button{border:0;border-radius:999px;color:#dce4f0;background:transparent;font:700 12px/1 Arial,sans-serif;padding:9px 10px;cursor:pointer;min-width:38px;min-height:34px}
      .va-language-switch button[aria-pressed="true"]{background:#d4af37;color:#091725}
      .va-language-switch button:focus-visible{outline:2px solid #fff;outline-offset:2px}
      .va-language-slot{display:flex;justify-content:flex-end;padding:6px 0 10px}
      body.va-i18n-ticket .va-language-slot{max-width:800px;margin:auto}
      body.va-i18n-live .va-language-slot{position:fixed;left:16px;top:16px;z-index:2147483000;padding:0}
      @media print{.va-language-slot{display:none!important}}
    `;
    document.head.appendChild(css);
    const slot = document.createElement('div');
    slot.className = 'va-language-slot';
    slot.setAttribute('data-va-i18n-ignore', '');
    const panel = document.createElement('nav');
    panel.id = 'va-language-switch';
    panel.className = 'va-language-switch';
    panel.setAttribute('aria-label', 'Language / Мова / Язык');
    for (const lang of LANGS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.lang = lang;
      btn.textContent = lang.toUpperCase();
      btn.title = ({uk:'Українська',ru:'Русский',en:'English'})[lang];
      btn.addEventListener('click', () => setLocale(lang));
      panel.appendChild(btn);
      buttons.push(btn);
    }
    slot.appendChild(panel);
    if (location.pathname.endsWith('/index.html') && document.querySelector('.topbar')) {
      document.querySelector('.topbar').appendChild(slot);
    } else if (location.pathname.includes('live-poster-bridge')) {
      document.body.classList.add('va-i18n-live');
      document.body.appendChild(slot);
    } else {
      if (location.pathname.endsWith('/ticket.html')) document.body.classList.add('va-i18n-ticket');
      const container = document.querySelector('.page, .container, main') || document.body;
      container.insertBefore(slot, container.firstChild);
    }
    reflectButtons();
  }
  function reflectButtons() {
    document.documentElement.lang = locale;
    for (const btn of buttons) btn.setAttribute('aria-pressed', String(btn.lang === locale));
  }
  function setLocale(lang) {
    if (!LANGS.includes(lang)) return;
    locale = lang;
    try { localStorage.setItem(STORAGE, lang); } catch (_) {}
    // Keep the same page and active seat HOLDs; no forced reload.
    try {
      const u = new URL(location.href);
      u.searchParams.set('lang', lang);
      history.replaceState(history.state, '', u.toString());
    } catch (_) {}
    reflectButtons();
    refresh();
  }
  const observer = new MutationObserver(changes => {
    for (const change of changes) {
      if (change.type === 'characterData') updateText(change.target);
      else if (change.type === 'attributes') updateAttrs(change.target);
      else if (change.type === 'childList') {
        for (const n of change.addedNodes) refresh(n);
      }
    }
  });
  function boot() {
    showSwitcher();
    reflectButtons();
    refresh();
    observer.observe(document.documentElement, {
      subtree: true, childList: true, characterData: true,
      attributes: true, attributeFilter: attrNames
    });
  }
  window.VAI18N = Object.freeze({ t: translate, setLocale, get locale() { return locale; } });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
