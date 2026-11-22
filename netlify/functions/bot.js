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

const keyboard = { inline_keyboard: [[{ text: "▶ Открыть сайт", url: SITE }]] };

function welcome(first) {
  return (
    `Привет, ${first}! Я Тикки, квами созидания ✨\n\n` +
    `Помогу не потерять серии: аккаунт на tikki-trikki.ru запомнит избранное, место просмотра и озвучку — и на телефоне, и на компьютере.\n\n` +
    `Смотреть серии → tikki-trikki.ru\n\n` +
    `Команды:\n/site — открыть сайт\n/start — показать это сообщение`
  );
}

export const handler = async (event) => {
  if (event.queryStringParameters && event.queryStringParameters.setup) {
    const url = `https://${event.headers.host}/.netlify/functions/bot`;
    const me = await tg("getMe");
    const hook = await tg("setWebhook", { url, allowed_updates: ["message"] });
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: `Вебхук: ${url}\ngetMe: ${JSON.stringify(me)}\nsetWebhook: ${JSON.stringify(hook)}\n`,
    };
  }

  let update = {};
  try { update = JSON.parse(event.body || "{}"); } catch (e) { return { statusCode: 200, body: "ok" }; }

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
    await tg("sendMessage", { chat_id: chat, text: `Умею немного: /start — приветствие, /site — ссылка.\nСерии: ${SITE}`, reply_markup: keyboard });
  }

  return { statusCode: 200, body: "ok" };
};
