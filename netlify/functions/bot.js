const TOKEN = process.env.TG_TOKEN || "";
const SITE = "https://tikki-trikki.ru";
async function tg(method, params) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params || {}),
  });
  return res.json().catch(() => null);
}
// кнопки-разделы: ведут сразу на нужную часть сайта
const keyboard = {
  inline_keyboard: [
    [{ text: "▶ Смотреть серии", url: SITE }],
    [
      { text: "7 сезон", url: SITE + "/#play/s7/1" },
      { text: "Чиби", url: SITE + "/#play/ch/1" },
    ],
    [
      { text: "Спецэпизоды", url: SITE + "/#play/sp/1" },
      { text: "Фильм", url: SITE + "/#play/mv/1" },
    ],
    [{ text: "🔑 Войти на сайт", url: SITE + "/#login" }],
  ],
};
function welcome(first) {
  return (
    `Привет, ${first}! Я Тикки, квами созидания ✨\n\n` +
    `Я живу на tikki-trikki.ru: там все серии «Леди Баг и Супер-Кот» — 7 сезонов, спецэпизоды, фильм и 63 чиби.\n\n` +
    `Выбирай раздел кнопкой ниже, а чтобы избранное и место просмотра сохранялись на всех устройствах — нажми «Войти на сайт».`
  );
}
export const handler = async (event) => {
  if (event.queryStringParameters && event.queryStringParameters.setup) {
    const url = `https://${event.headers.host}/.netlify/functions/bot`;
    const me = await tg("getMe");
    const hook = await tg("setWebhook", { url, allowed_updates: ["message", "callback_query"] });
    const info = await tg("getWebhookInfo");
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body:
        `Вебхук: ${url}\n` +
        `getMe: ${JSON.stringify(me)}\n` +
        `setWebhook: ${JSON.stringify(hook)}\n` +
        `getWebhookInfo: ${JSON.stringify(info)}\n`,
    };
  }
  let update = {};
  try { update = JSON.parse(event.body || "{}"); } catch (e) { return { statusCode: 200, body: "ok" }; }
  // кнопки с url обрабатывает сам Telegram (не требуют callback), но подстрахуемся
  const cb = update.callback_query;
  if (cb) {
    try { await tg("answerCallbackQuery", { callback_query_id: cb.id }); } catch (e) {}
    return { statusCode: 200, body: "ok" };
  }
  const msg = update.message;
  if (!msg || !msg.chat) return { statusCode: 200, body: "ok" };
  const chat = msg.chat.id;
  const text = (msg.text || "").trim();
  const first = (msg.from && msg.from.first_name) || "друг";
  if (text === "/start" || text === "start" || text === "") {
    await tg("sendMessage", { chat_id: chat, text: welcome(first), reply_markup: keyboard });
  } else if (text === "/site" || text === "сайт" || text.toLowerCase() === "site") {
    await tg("sendMessage", { chat_id: chat, text: `Все серии, спецэпизоды, фильм и 63 чиби — тут:\n${SITE}`, reply_markup: keyboard });
  } else {
    await tg("sendMessage", { chat_id: chat, text: `Я Тикки и умею немного: /start — главное меню, /site — ссылка на сайт.`, reply_markup: keyboard });
  }
  return { statusCode: 200, body: "ok" };
};
