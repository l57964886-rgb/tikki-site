import { createHmac } from "node:crypto";

const TOKEN = process.env.TG_TOKEN || "";
const BROADCAST_KEY = process.env.BROADCAST_KEY || "";
const SITE = "https://tikki-trikki.ru";
const API = SITE + "/account.php";
const WELCOME_IMG = SITE + "/img/tikki.png";

/* ================= админ-страница (рассылка + новинки) ================= */
const PAGE = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Тикки — админка</title>
<style>
:root{--bg:#12060f;--card:#1e0c19;--line:#3a1a30;--text:#f7ecf3;--dim:#a98b9e;--red:#ff2e63}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(900px 500px at 20% -10%,#3a0b22,transparent),var(--bg);color:var(--text);font:16px/1.5 Nunito,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:26px 16px;display:flex;justify-content:center}
.wrap{width:100%;max-width:680px}
h1{font-size:1.35rem;margin:0 0 16px;display:flex;align-items:center;gap:10px}
h1 img{width:38px;height:38px;border-radius:50%;box-shadow:0 0 18px rgba(255,46,99,.6)}
.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px;margin-bottom:16px}
h2{font-size:1rem;margin:0 0 12px;color:var(--red)}
label{display:block;font-size:.78rem;color:var(--dim);margin:12px 0 5px}
label:first-of-type{margin-top:0}
input,textarea{width:100%;padding:11px 13px;border-radius:11px;border:1px solid var(--line);background:#150910;color:var(--text);font:inherit}
textarea{min-height:130px;resize:vertical}
input:focus,textarea:focus{outline:none;border-color:var(--red);box-shadow:0 0 0 3px rgba(255,46,99,.16)}
button{padding:12px 16px;border-radius:11px;border:0;background:var(--red);color:#fff;font:800 .95rem Nunito,system-ui,sans-serif;cursor:pointer;margin-top:12px}
button.ghost{background:transparent;border:1px solid var(--line);color:var(--text);font-weight:700}
.msg{font-size:.88rem;min-height:18px;margin-top:10px}
.msg.ok{color:#5ee39a}.msg.err{color:#ff7089}
.list{margin-top:14px;border-top:1px solid var(--line);padding-top:10px}
.item{display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px dashed var(--line);font-size:.88rem}
.item div{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.item small{color:var(--dim);display:block;font-size:.72rem}
.item button{margin:0;padding:6px 10px;font-size:.78rem;background:transparent;border:1px solid var(--red);color:var(--red)}
.hint{color:var(--dim);font-size:.75rem;margin-top:6px}
</style></head><body><div class="wrap">
<h1><img src="${WELCOME_IMG}" alt=""> Админка Тикки</h1>

<div class="card">
<label for="key">Ключ (BROADCAST_KEY)</label>
<input id="key" type="password" placeholder="тот, что в Vercel" autocomplete="off">
<div class="hint">Сохраняется в этом браузере.</div>
</div>

<div class="card">
<h2>🆕 Новинки для кнопки «Что нового»</h2>
<label for="nl">Подпись (например «7 сезон · 7 серия»)</label>
<input id="nl" placeholder="7 сезон · 7 серия">
<label for="nt">Название серии</label>
<input id="nt" placeholder="Камило">
<label for="nu">Ссылка</label>
<input id="nu" placeholder="https://tikki-trikki.ru/#play/s7/7">
<button id="addNew">Добавить в новинки</button>
<div class="msg" id="msgNew"></div>
<div class="list" id="listNew"></div>
</div>

<div class="card">
<h2>📣 Рассылка всем</h2>
<label for="txt">Текст сообщения</label>
<textarea id="txt" placeholder="Привет, скучаешь? 🐞&#10;Новая серия — «Камило». Заходи:&#10;https://tikki-trikki.ru"></textarea>
<button id="go">Отправить всем</button>
<button id="cnt" class="ghost">Сколько подписчиков</button>
<div class="msg" id="msg"></div>
</div>
</div>
<script>
(function(){
 var FN="/api/bot",key=document.getElementById("key");
 try{key.value=localStorage.getItem("tikki_bk")||""}catch(e){}
 key.addEventListener("change",function(){try{localStorage.setItem("tikki_bk",key.value)}catch(e){}});
 function say(id,t,c){var el=document.getElementById(id);el.className="msg "+(c||"");el.textContent=t}
 function k(){return key.value.trim()}

 document.getElementById("addNew").onclick=function(){
  var label=document.getElementById("nl").value.trim(),
      title=document.getElementById("nt").value.trim(),
      url=document.getElementById("nu").value.trim();
  if(!k()){say("msgNew","Введите ключ","err");return}
  if(!title){say("msgNew","Нужно название","err");return}
  if(!url){say("msgNew","Нужна ссылка","err");return}
  say("msgNew","Добавляю…");
  fetch(FN+"?news_add=1",{method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({key:k(),label:label,title:title,url:url})})
  .then(function(r){return r.json()}).then(function(j){
   if(j&&j.ok){say("msgNew","Добавлено ✓","ok");
    document.getElementById("nt").value="";document.getElementById("nu").value="";loadNews()}
   else say("msgNew","Ошибка: "+((j&&j.error)||"?"),"err")})
  .catch(function(){say("msgNew","Сайт не ответил — проверь account.php","err")});
 };

 function loadNews(){
  if(!k())return;
  fetch(FN+"?news_list=1&key="+encodeURIComponent(k())).then(function(r){return r.json()}).then(function(j){
   var box=document.getElementById("listNew");
   if(!j||!j.ok||!j.items.length){box.innerHTML='<div class="hint">Пока пусто</div>';return}
   box.innerHTML=j.items.map(function(it){
    return '<div class="item"><div>'+esc(it.label)+' — '+esc(it.title)+'<small>'+esc(it.url)+'</small></div>'+
     '<button data-id="'+it.id+'">Удалить</button></div>'}).join("");
   box.querySelectorAll("button[data-id]").forEach(function(b){
    b.onclick=function(){del(b.getAttribute("data-id"))}});
  }).catch(function(){});
 }
 function del(id){
  fetch(FN+"?news_del=1",{method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({key:k(),id:id})}).then(function(r){return r.json()})
  .then(function(j){if(j&&j.ok)loadNews()});
 }

 document.getElementById("go").onclick=function(){
  var t=document.getElementById("txt").value.trim();
  if(!k()){say("msg","Введите ключ","err");return}
  if(!t){say("msg","Напишите текст","err");return}
  if(!confirm("Отправить всем подписчикам?"))return;
  say("msg","Отправляю…");
  fetch(FN+"?send=1",{method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({key:k(),text:t})}).then(function(r){return r.json()})
  .then(function(j){if(j&&j.ok)say("msg","Доставлено: "+j.sent+" из "+j.total,"ok");
   else say("msg","Ошибка: "+((j&&j.error)||"?"),"err")});
 };

 document.getElementById("cnt").onclick=function(){
  fetch(FN+"?count=1").then(function(r){return r.text()}).then(function(t){say("msg",t,"ok")});
 };

 function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
 key.addEventListener("change",loadNews);
 if(k())loadNews();
})();
</script></body></html>`;

/* ================= Telegram API ================= */
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

const sig = (s) => createHmac("sha256", TOKEN).update(s).digest("hex");

/* --- подписчики --- */
async function register(chat, username) {
  await apiCall({ action: "tg_sub", chat_id: String(chat), username: username || "", sig: sig("sub|" + chat) });
}
async function subsList() {
  const j = await apiCall({ action: "tg_subs", sig: sig("list") });
  return j && j.ok && Array.isArray(j.ids) ? j.ids : [];
}

/* --- новинки --- */
async function newsList() {
  const j = await apiCall({ action: "news_list", sig: sig("news_list") });
  return j && j.ok && Array.isArray(j.items) ? j.items : [];
}
async function newsAdd(label, title, url) {
  return apiCall({ action: "news_add", label, title, url, sig: sig("news_add") });
}
async function newsDel(id) {
  return apiCall({ action: "news_del", id: String(id), sig: sig("news_del") });
}

/* --- память о своих сообщениях (для самоочистки) --- */
async function remember(chat, resp) {
  const mid = resp && resp.ok && resp.result && resp.result.message_id;
  if (!mid) return;
  await apiCall({ action: "tg_log", chat_id: String(chat), message_id: String(mid), sig: sig("log|" + chat + "|" + mid) });
}
async function purgeOld(chat) {
  const j = await apiCall({ action: "tg_purge", chat_id: String(chat), sig: sig("purge|" + chat) });
  if (!j || !j.ok || !Array.isArray(j.ids)) return;
  for (const id of j.ids) {
    await tg("deleteMessage", { chat_id: chat, message_id: id });
  }
}

/* ================= контент бота ================= */
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
  let r = await tg("sendPhoto", params);
  if (!(r && r.ok)) {
    r = await tg("sendMessage", { chat_id: chat, text: caption, reply_markup: keyboard });
  }
  await remember(chat, r);
  return r;
}

async function sendNew(chat) {
  const items = await newsList();
  if (items.length) {
    const lines = items.slice(0, 8).map((it, i) => `${i + 1}. ${it.label} — «${it.title}»`);
    const rows = items.slice(0, 8).map((it) => [{ text: "▶ " + it.title, url: it.url }]);
    rows.push([{ text: "⬅ Назад", callback_data: "back" }]);
    const top = items[0];
    const cover = top && /s7-|ch-/.test(top.url) ? SITE + "/img/thumbs/" + (top.url.split("/#play/")[1] || "").replace("/", "-") + ".jpg" : WELCOME_IMG;
    await sendPhotoOr(chat, cover, "🆕 Что нового на сайте", null);
    const r = await tg("sendMessage", { chat_id: chat, text: lines.join("\n"), reply_markup: { inline_keyboard: rows } });
    await remember(chat, r);
    return;
  }

  // если свой список пуст — берём new.json с сайта
  const res = await fetch(SITE + "/new.json?t=" + Date.now()).catch(() => null);
  const data = res && res.ok ? await res.json().catch(() => null) : null;
  if (!data || !Array.isArray(data.items) || !data.items.length) {
    const r = await tg("sendMessage", { chat_id: chat, text: "Пока новинок нет. Добавь их в админке: " + SITE, reply_markup: mainKeyboard });
    await remember(chat, r);
    return;
  }
  const lines = data.items.map((it, i) => `${i + 1}. ${it.label} — «${it.title}»`);
  const rows = data.items.map((it) => [{ text: "▶ " + it.title, url: SITE + it.url }]);
  rows.push([{ text: "⬅ Назад", callback_data: "back" }]);
  const top = data.items[0];
  await sendPhotoOr(chat, SITE + "/img/thumbs/" + top.id + ".jpg", `🆕 Что нового · ${data.updated}`, null);
  const r = await tg("sendMessage", { chat_id: chat, text: lines.join("\n"), reply_markup: { inline_keyboard: rows } });
  await remember(chat, r);
}

async function confirmCode(code, tgId, nickname) {
  return apiCall({ action: "tg_link", code, tg_id: tgId, nickname, sig: sig(code + "|" + tgId) });
}

async function broadcast(text) {
  const ids = await subsList();
  let sent = 0, failed = 0;
  for (const id of ids) {
    const r = await tg("sendMessage", { chat_id: id, text, reply_markup: mainKeyboard });
    if (r && r.ok) { sent++; await remember(id, r); } else failed++;
    await new Promise((res) => setTimeout(res, 40));
  }
  return { ok: true, total: ids.length, sent, failed };
}

/* ================= обработчик ================= */
export default async function handler(req, res) {
  const q = req.query || {};
  const body = typeof req.body === "string" ? (() => { try { return JSON.parse(req.body || "{}"); } catch (e) { return {}; } })() : req.body || {};

  if (q.page === "broadcast" || q.page === "admin") {
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
      `Админка: https://${host}/api/bot?page=admin\n` +
      `getMe: ${JSON.stringify(me)}\n` +
      `setWebhook: ${JSON.stringify(hook)}\n` +
      `setMyCommands: ${JSON.stringify(cmds)}\n`
    );
  }

  /* ---- админские действия (по ключу) ---- */
  const adminOk = BROADCAST_KEY && body.key === BROADCAST_KEY;

  if (q.news_add) {
    if (!adminOk) return res.status(403).json({ ok: false, error: "Неверный ключ" });
    const r = await newsAdd(body.label || "", body.title || "", body.url || "");
    return res.status(200).json(r || { ok: false, error: "Сервер не ответил" });
  }
  if (q.news_del) {
    if (!adminOk) return res.status(403).json({ ok: false, error: "Неверный ключ" });
    const r = await newsDel(body.id);
    return res.status(200).json(r || { ok: false, error: "Сервер не ответил" });
  }
  if (q.news_list) {
    if (!BROADCAST_KEY || q.key !== BROADCAST_KEY) return res.status(403).json({ ok: false, error: "Неверный ключ" });
    return res.status(200).json({ ok: true, items: await newsList() });
  }
  if (q.send) {
    if (!adminOk) return res.status(403).json({ ok: false, error: "Неверный ключ" });
    const text = (body.text || "").trim();
    if (!text) return res.status(400).json({ ok: false, error: "Пустой текст" });
    return res.status(200).json(await broadcast(text.slice(0, 4000)));
  }
  if (q.count) {
    const ids = await subsList();
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send(`Подписчиков: ${ids.length}`);
  }

  /* ---- обновления от Telegram ---- */
  const update = body;

  const cb = update.callback_query;
  if (cb) {
    try { await tg("answerCallbackQuery", { callback_query_id: cb.id }); } catch (e) {}
    const chat = cb.message && cb.message.chat ? cb.message.chat.id : null;
    if (chat) {
      await register(chat, cb.from && cb.from.username);
      await purgeOld(chat);
      if (cb.data === "new") await sendNew(chat);
      else if (cb.data === "back") await sendPhotoOr(chat, WELCOME_IMG, welcome(cb.from && cb.from.first_name || "друг"), mainKeyboard);
    }
    return res.status(200).send("ok");
  }

  const msg = update.message;
  if (!msg || !msg.chat) return res.status(200).send("ok");

  const chat = msg.chat.id;
  const first = (msg.from && msg.from.first_name) || "друг";
  const text = (msg.text || "").trim();

  await register(chat, msg.from && msg.from.username);

  // убираем предыдущие сообщения бота, чтобы чат не засорялся
  await purgeOld(chat);

  let payload = "";
  if (/^\/start\s+/.test(text)) payload = text.split(/\s+/)[1] || "";
  else if (/^[A-Za-z2-9]{6,8}$/.test(text)) payload = text;

  if (payload) {
    const code = payload.toUpperCase();
    const r = await confirmCode(code, String(msg.from.id), (msg.from.username || first || "").slice(0, 64));
    const sent = r && r.ok
      ? await tg("sendMessage", {
          chat_id: chat,
          text: "Готово ✨ Возвращайтесь на сайт — вы уже вошли в аккаунт.",
          reply_markup: { inline_keyboard: [[{ text: "▶ Открыть сайт", url: SITE }]] },
        })
      : await tg("sendMessage", {
          chat_id: chat,
          text: "Не получилось: код не найден или истёк (он живёт 15 минут).\nНажмите «🔑 Войти на сайт» и получите новый.",
          reply_markup: mainKeyboard,
        });
    await remember(chat, sent);
    return res.status(200).send("ok");
  }

  if (text === "/start" || text === "start" || text === "") {
    await sendPhotoOr(chat, WELCOME_IMG, welcome(first), mainKeyboard);
  } else if (text === "/new" || text === "/новое") {
    await sendNew(chat);
  } else if (text === "/site" || text === "сайт" || text.toLowerCase() === "site") {
    const r = await tg("sendMessage", { chat_id: chat, text: `Все серии, спецэпизоды, фильм и 63 чиби — тут:\n${SITE}`, reply_markup: mainKeyboard });
    await remember(chat, r);
  } else {
    const r = await tg("sendMessage", {
      chat_id: chat,
      text: "Я Тикки. Команды: /start — меню, /new — что нового, /site — ссылка.\nДля входа: получи код на сайте и пришли его сюда.",
      reply_markup: mainKeyboard,
    });
    await remember(chat, r);
  }

  return res.status(200).send("ok");
}

