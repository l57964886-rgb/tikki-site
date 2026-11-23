import { createHmac } from "node:crypto";

const TOKEN = process.env.TG_TOKEN || "";
const BROADCAST_KEY = process.env.BROADCAST_KEY || "";
const SITE = "https://tikki-trikki.ru";
const API = SITE + "/account.php";
const WELCOME_IMG = SITE + "/img/tikki.png";

/* ---------- страница рассылки (отдаётся по ?page=broadcast) ---------- */
const PAGE = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Рассылка — Тикки</title>
<style>
:root{--bg:#12060f;--card:#1e0c19;--line:#3a1a30;--text:#f7ecf3;--dim:#a98b9e;--red:#ff2e63}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:radial-gradient(900px 500px at 20% -10%,#3a0b22,transparent),var(--bg);color:var(--text);font:16px/1.5 Nunito,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;display:flex;justify-content:center;padding:28px 16px}
.wrap{width:100%;max-width:640px}
h1{font-size:1.4rem;margin:0 0 4px;display:flex;align-items:center;gap:10px}
h1 img{width:40px;height:40px;border-radius:50%;box-shadow:0 0 18px rgba(255,46,99,.6)}
.sub{color:var(--dim);margin:0 0 18px;font-size:.9rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px}
label{display:block;font-size:.8rem;color:var(--dim);margin:14px 0 6px}
label:first-child{margin-top:0}
input,textarea{width:100%;padding:12px 14px;border-radius:12px;border:1px solid var(--line);background:#150910;color:var(--text);font:inherit}
textarea{min-height:160px;resize:vertical}
input:focus,textarea:focus{outline:none;border-color:var(--red);box-shadow:0 0 0 3px rgba(255,46,99,.18)}
.row{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap}
button{flex:1;min-width:150px;padding:13px 18px;border-radius:12px;border:0;background:var(--red);color:#fff;font:800 1rem Nunito,system-ui,sans-serif;cursor:pointer}
button.ghost{background:transparent;border:1px solid var(--line);color:var(--text);font-weight:700}
.msg{margin-top:14px;font-size:.9rem;min-height:20px}
.msg.ok{color:#5ee39a}.msg.err{color:#ff7089}
.count{margin-top:8px;font-size:.8rem;color:var(--dim)}
.hint{color:var(--dim);font-size:.75rem;margin-top:6px}
</style></head><body>
<div class="wrap">
<h1><img src="${WELCOME_IMG}" alt=""> Рассылка от Тикки</h1>
<p class="sub">Сообщение уйдёт всем, кто когда-либо запускал бота.</p>
<div class="card">
<label for="key">Ключ рассылки</label>
<input id="key" type="password" placeholder="тот же, что BROADCAST_KEY в Vercel" autocomplete="off">
<div class="hint">Сохраняется в этом браузере.</div>
<label for="txt">Текст сообщения</label>
<textarea id="txt" placeholder="Привет! Скучаешь? 🐞&#10;А вот новая серия — «Камило». Заходи:&#10;https://tikki-trikki.ru"></textarea>
<div class="row">
<button id="go">Отправить всем</button>
<button id="cnt" class="ghost">Сколько подписчиков</button>
</div>
<div class="msg" id="msg"></div>
<div class="count" id="count"></div>
</div></div>
<script>
(function(){
 var FN="/api/bot",key=document.getElementById("key"),txt=document.getElementById("txt"),
 msg=document.getElementById("msg"),cnt=document.getElementById("count"),
 go=document.getElementById("go"),btnCnt=document.getElementById("cnt");
 try{key.value=localStorage.getItem("tikki_bk")||""}catch(e){}
 key.addEventListener("change",function(){try{localStorage.setItem("tikki_bk",key.value)}catch(e){}});
 function say(t,c){msg.className="msg "+(c||"");msg.textContent=t}
 btnCnt.onclick=function(){say("Считаю…");fetch(FN+"?count=1").then(function(r){return r.text()}).then(function(t){cnt.textContent=t;say("")}).catch(function(){say("Не смог посчитать","err")})};
 go.onclick=function(){
  var k=key.value.trim(),t=txt.value.trim();
  if(!k){say("Введите ключ рассылки","err");return}
  if(!t){say("Напишите текст","err");return}
  if(!confirm("Отправить всем подписчикам?"))return;
  go.disabled=true;say("Отправляю…");
  fetch(FN+"?send=1",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({key:k,text:t})})
  .then(function(r){return r.json()})
  .then(function(j){go.disabled=false;
   if(j&&j.ok){say("Готово. Доставлено: "+j.sent+", не дошло: "+j.failed,"ok");cnt.textContent="Всего подписчиков: "+j.total}
   else{say("Ошибка: "+((j&&j.error)||"неизвестно"),"err")}})
  .catch(function(){go.disabled=false;say("Сеть не отвечает","err")})};
})();
</script></body></html>`;

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

async function register(chat, username) {
  const sig = createHmac("sha256", TOKEN).update("sub|" + chat).digest("hex");
  await apiCall({ action: "tg_sub", chat_id: String(chat), username: username || "", sig });
}

async function subsList() {
  const sig = createHmac("sha256", TOKEN).update("list").digest("hex");
  const j = await apiCall({ action: "tg_subs", sig });
  return j && j.ok && Array.isArray(j.ids) ? j.ids : [];
}

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

async function sendPhotoOr(chat, photo, caption, keyboard) {
  const params = { chat_id: chat, photo, caption: (caption || "").slice(0, 1024) };
  if (keyboard) params.reply_markup = keyboard;
  const r = await tg("sendPhoto", params);
  if (r && r.ok) return true;
  const msg = { chat_id: chat, text: caption };
  if (keyboard) msg.reply_markup = keyboard;
  await tg("sendMessage", msg);
  return false;
}

async function newest() {
  const res = await fetch(SITE + "/new.json?t=" + Date.now()).catch(() => null);
  if (!res || !res.ok) return null;
  const j = await res.json().catch(() => null);
  return j && Array.isArray(j.items) ? j : null;
}

async function sendNew(chat) {
  const data = await newest();
  if (!data) {
    await tg("sendMessage", { chat_id: chat, text: "Пока не могу получить новинки. Открой сайт: " + SITE, reply_markup: mainKeyboard });
    return;
  }
  const lines = data.items.map((it, i) => `${i + 1}. ${it.label} — «${it.title}»`);
  const rows = data.items.map((it) => [{ text: "▶ " + it.title, url: SITE + it.url }]);
  const top = data.items[0];
  const cover = top ? SITE + "/img/thumbs/" + top.id + ".jpg" : WELCOME_IMG;
  await sendPhotoOr(chat, cover, `🆕 Что нового на сайте · ${data.updated}`, null);
  await tg("sendMessage", { chat_id: chat, text: lines.join("\n"), reply_markup: { inline_keyboard: rows } });
}

async function confirmCode(code, tgId, nickname) {
  const sig = createHmac("sha256", TOKEN).update(code + "|" + tgId).digest("hex");
  return apiCall({ action: "tg_link", code, tg_id: tgId, nickname, sig });
}

async function broadcast(text) {
  const ids = await subsList();
  let sent = 0, failed = 0;
  for (const id of ids) {
    const r = await tg("sendMessage", { chat_id: id, text, reply_markup: mainKeyboard });
    if (r && r.ok) sent++; else failed++;
    await new Promise((res) => setTimeout(res, 40));
  }
  return { ok: true, total: ids.length, sent, failed };
}

export default async function handler(req, res) {
  const q = req.query || {};

  // страница рассылки
  if (q.page === "broadcast") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(PAGE);
  }

  if (q.setup) {
    const host = req.headers.host;
    const url = `https://${host}/api/bot`;
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
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send(
      `Вебхук: ${url}\n` +
      `TG_TOKEN: ${tokInfo}\n` +
      `BROADCAST_KEY: ${BROADCAST_KEY ? "задан" : "НЕ ЗАДАН"}\n` +
      `Страница рассылки: https://${host}/api/bot?page=broadcast\n` +
      `getMe: ${JSON.stringify(me)}\n` +
      `setWebhook: ${JSON.stringify(hook)}\n` +
      `setMyCommands: ${JSON.stringify(cmds)}\n`
    );
  }

  if (q.send) {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    if (!BROADCAST_KEY || body.key !== BROADCAST_KEY) {
      return res.status(403).json({ ok: false, error: "Неверный ключ" });
    }
    const text = (body.text || "").trim();
    if (!text) return res.status(400).json({ ok: false, error: "Пустой текст" });
    return res.status(200).json(await broadcast(text.slice(0, 4000)));
  }

  if (q.count) {
    const ids = await subsList();
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send(`Подписчиков: ${ids.length}`);
  }

  let update = {};
  try {
    update = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  } catch (e) {
    return res.status(200).send("ok");
  }

  const cb = update.callback_query;
  if (cb) {
    try { await tg("answerCallbackQuery", { callback_query_id: cb.id }); } catch (e) {}
    const chat = cb.message && cb.message.chat ? cb.message.chat.id : null;
    if (chat) {
      await register(chat, cb.from && cb.from.username);
      if (cb.data === "new") await sendNew(chat);
    }
    return res.status(200).send("ok");
  }

  const msg = update.message;
  if (!msg || !msg.chat) return res.status(200).send("ok");

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
    return res.status(200).send("ok");
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

  return res.status(200).send("ok");
}

