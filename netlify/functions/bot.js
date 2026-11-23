import { createHmac } from "node:crypto";

const TOKEN = process.env.TG_TOKEN || "";
const BROADCAST_KEY = process.env.BROADCAST_KEY || "";
const SITE = "https://tikki-trikki.ru";
const WELCOME_IMG = SITE + "/img/tikki.png";   // картинка с Тикки
const API = SITE + "/account.php";

async function tg(method, params) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params || {}),
  });
  return res.json().catch(() => null);
}

async function apiCall(payload) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => null);
  return res ? res.json().catch(() => null) : null;
}

// --- подписчики ---
async function register(chat, username) {
  const sig = createHmac("sha256", TOKEN).update("sub|" + chat).digest("hex");
  await apiCall({ action: "tg_sub", chat_id: String(chat), username: username || "", sig });
}

async function subsList() {
  const sig = createHmac("sha256", TOKEN).update("list").digest("hex");
  const j = await apiCall({ action: "tg_subs", sig });
  return j && j.ok && Array.isArray(j.ids) ? j.ids : [];
}

// --- меню ---
const mainKeyboard = {
  inline_keyboard: [
    [{ text: "🆕 Что нового", callback_data: "new" }],
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
  `Живу на tikki-trikki.ru: там все серии «Леди Баг и Супер-Кот» — 7 сезонов, спецэпизоды, фильм и 63 чиби.\n\n` +
  `Кнопки ниже ведут сразу в нужный раздел. А «🆕 Что нового» покажет свежие серии.`;

// фото с подписью, при неудаче — обычное сообщение
async function sendPhotoOr(chat, photo, caption, keyboard) {
  const r = await tg("sendPhoto", {
    chat_id: chat,
    photo,
    caption: caption.slice(0, 1024),
    reply_markup: keyboard,
  });
  if (r && r.ok) return true;
  await tg("sendMessage", { chat_id: chat, text: caption, reply_markup: keyboard });
  return false;
}

// --- лента новинок ---
async function newest() {
  const res = await fetch(SITE + "/new.json?t=" + Date.now()).catch(() => null);
  if (!res || !res.ok) return null;
  return res.json().catch(() => null);
}

async function sendNew(chat) {
  const data = await newest();
  if (!data || !data.items || !data.items.length) {
    await tg("sendMessage", { chat_id: chat, text: "Пока не могу получить новинки. Открой сайт: " + SITE, reply_markup: mainKeyboard });
    return;
  }
  const lines = data.items.map((it, i) => `${i + 1}. ${it.label} — «${it.title}»`);
  const rows = data.items.map((it) => [{ text: "▶ " + it.title, url: SITE + it.url }]);

  // сверху — миниатюра самой свежей серии
  const top = data.items[0];
  const cover = top ? SITE + "/img/thumbs/" + top.id + ".jpg" : WELCOME_IMG;
  await sendPhotoOr(chat, cover, `🆕 Что нового на сайте · ${data.updated}`, null);

  await tg("sendMessage", {
    chat_id: chat,
    text: `${lines.join("\n")}`,
    reply_markup: { inline_keyboard: rows },
  });
}

// --- вход по коду ---
async function confirmCode(code, tgId, nickname) {
  const sig = createHmac("sha256", TOKEN).update(code + "|" + tgId).digest("hex");
  return apiCall({ action: "tg_link", code, tg_id: tgId, nickname, sig });
}

// --- рассылка ---
async function broadcast(text) {
  const ids = await subsList();
  let sent = 0, failed = 0;
  for (const id of ids) {
    const r = await tg("sendMessage", { chat_id: id, text, reply_markup: mainKeyboard, disable_web_page_preview: false });
    if (r && r.ok) sent++;
    else failed++;
    await new Promise((res) => setTimeout(res, 40));
  }
  return { ok: true, total: ids.length, sent, failed };
}

export const handler = async (event) => {
  const q = event.queryStringParameters || {};

  // ---- установка ----
  if (q.setup) {
    const url = `https://${event.headers.host}/.netlify/functions/bot`;
    const me = await tg("getMe");
    const hook = await tg("setWebhook", { url, allowed_updates: ["message", "callback_query"] });
    const cmds = await tg("setMyCommands", {
      commands: [
        { command: "start", description: "Главное меню" },
        { command: "new", description: "Что нового на сайте" },
        { command: "site", description: "Ссылка на сайт" },
      ],
    });
    const tokInfo = TOKEN ? `задан, ${TOKEN.length} символов, ${TOKEN.slice(0, 4)}…${TOKEN.slice(-4)}` : "НЕ ЗАДАН";
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body:
        `Вебхук: ${url}\n` +
        `TG_TOKEN: ${tokInfo}\n` +
        `BROADCAST_KEY: ${BROADCAST_KEY ? "задан" : "НЕ ЗАДАН"}\n` +
        `getMe: ${JSON.stringify(me)}\n` +
        `setWebhook: ${JSON.stringify(hook)}\n` +
        `setMyCommands: ${JSON.stringify(cmds)}\n`,
    };
  }

  // ---- рассылка: POST ?send=1 {key, text} ----
  if (q.send) {
    let body = {};
    try { body = JSON.parse(event.body || "{}"); } catch (e) {}
    if (!BROADCAST_KEY || body.key !== BROADCAST_KEY) {
      return { statusCode: 403, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: false, error: "Неверный ключ" }) };
    }
    const text = (body.text || "").trim();
    if (!text) {
      return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: false, error: "Пустой текст" }) };
    }
    const result = await broadcast(text.slice(0, 4000));
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(result) };
  }

  // ---- подписчики: сколько людей ----
  if (q.count) {
    const ids = await subsList();
    return { statusCode: 200, headers: { "Content-Type": "text/plain; charset=utf-8" }, body: `Подписчиков: ${ids.length}` };
  }

  let update = {};
  try { update = JSON.parse(event.body || "{}"); } catch (e) { return { statusCode: 200, body: "ok" }; }

  const cb = update.callback_query;
  if (cb) {
    try { await tg("answerCallbackQuery", { callback_query_id: cb.id }); } catch (e) {}
    const chat = cb.message && cb.message.chat ? cb.message.chat.id : null;
    if (chat) {
      await register(chat, cb.from && cb.from.username);
      if (cb.data === "new") await sendNew(chat);
    }
    return { statusCode: 200, body: "ok" };
  }

  const msg = update.message;
  if (!msg || !msg.chat) return { statusCode: 200, body: "ok" };

  const chat = msg.chat.id;
  const first = (msg.from && msg.from.first_name) || "друг";
  const text = (msg.text || "").trim();

  await register(chat, msg.from && msg.from.username);

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
        reply_markup: mainKeyboard,
      });
    }
    return { statusCode: 200, body: "ok" };
  }

  if (text === "/start" || text === "start" || text === "") {
    await sendPhotoOr(chat, WELCOME_IMG, welcome(first), mainKeyboard);
  } else if (text === "/new" || text === "/новое") {
    await sendNew(chat);
  } else if (text === "/site" || text === "сайт" || text.toLowerCase() === "site") {
    await tg("sendMessage", { chat_id: chat, text: `Все серии, спецэпизоды, фильм и 63 чиби — тут:\n${SITE}`, reply_markup: mainKeyboard });
  } else {
    await tg("sendMessage", {
      chat_id: chat,
      text: "Я Тикки. Команды: /start — меню, /new — что нового, /site — ссылка.\nДля входа: получи код на сайте и пришли его сюда.",
      reply_markup: mainKeyboard,
    });
  }

  return { statusCode: 200, body: "ok" };
};
