import { createHmac } from "node:crypto";

const TOKEN = process.env.TG_TOKEN || "";
const SITE = "https://tikki-trikki.ru";
const API = SITE + "/account.php";

async function tg(method, params) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params || {}),
  });
  return res.json().catch(() => null);
}

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

const welcome = (first) =>
  `Привет, ${first}! Я Тикки, квами созидания ✨\n\n` +
  `Я живу на tikki-trikki.ru: там все серии «Леди Баг и Супер-Кот» — 7 сезонов, спецэпизоды, фильм и 63 чиби.\n\n` +
  `Чтобы войти на сайт: нажми «🔑 Войти на сайт», получи код и пришли его мне сюда — я подтвержу.`;

// подтверждение кода входа
async function confirmCode(code, tgId, nickname) {
  const sig = createHmac("sha256", TOKEN).update(code + "|" + tgId).digest("hex");
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "tg_link", code, tg_id: tgId, nickname, sig }),
  }).catch(() => null);
  return res ? res.json().catch(() => null) : null;
}

export const handler = async (event) => {
  if (event.queryStringParameters && event.queryStringParameters.setup) {
    const url = `https://${event.headers.host}/.netlify/functions/bot`;
    const me = await tg("getMe");
    const hook = await tg("setWebhook", { url, allowed_updates: ["message", "callback_query"] });
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: `Вебхук: ${url}\ngetMe: ${JSON.stringify(me)}\nsetWebhook: ${JSON.stringify(hook)}\n`,
    };
  }

  let update = {};
  try { update = JSON.parse(event.body || "{}"); } catch (e) { return { statusCode: 200, body: "ok" }; }

  const cb = update.callback_query;
  if (cb) {
    try { await tg("answerCallbackQuery", { callback_query_id: cb.id }); } catch (e) {}
    return { statusCode: 200, body: "ok" };
  }

  const msg = update.message;
  if (!msg || !msg.chat) return { statusCode: 200, body: "ok" };

  const chat = msg.chat.id;
  const first = (msg.from && msg.from.first_name) || "друг";
  let text = (msg.text || "").trim();

  // «/start ABC123» или просто «ABC123»
  let payload = "";
  if (/^\/start\s+/.test(text)) payload = text.split(/\s+/)[1] || "";
  else if (/^[A-Za-z2-9]{6,8}$/.test(text)) payload = text;

  if (payload) {
    const code = payload.toUpperCase();
    const r = await confirmCode(code, String(msg.from.id), (msg.from.username || first || "").slice(0, 64));
    if (r && r.ok) {
      await tg("sendMessage", {
        chat_id: chat,
        text: "Готово ✨ Возвращайтесь на сайт — вы уже вошли в аккаунт.",
        reply_markup: { inline_keyboard: [[{ text: "▶ Открыть сайт", url: SITE }]] },
      });
    } else {
      await tg("sendMessage", {
        chat_id: chat,
        text: "Не получилось: код не найден или истёк (он живёт 15 минут).\nНажмите «🔑 Войти на сайт» и получите новый.",
        reply_markup: keyboard,
      });
    }
    return { statusCode: 200, body: "ok" };
  }

  if (text === "/start" || text === "start" || text === "") {
    await tg("sendMessage", { chat_id: chat, text: welcome(first), reply_markup: keyboard });
  } else if (text === "/site" || text === "сайт" || text.toLowerCase() === "site") {
    await tg("sendMessage", { chat_id: chat, text: `Все серии, спецэпизоды, фильм и 63 чиби — тут:\n${SITE}`, reply_markup: keyboard });
  } else {
    await tg("sendMessage", { chat_id: chat, text: `Я Тикки. /start — меню, /site — ссылка.\nДля входа: получите код на сайте и пришлите его сюда.`, reply_markup: keyboard });
  }

  return { statusCode: 200, body: "ok" };
};


