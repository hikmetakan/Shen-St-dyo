require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function notify(text) {
  if (!TOKEN || !CHAT_ID) {
    console.error("Hata: TELEGRAM_BOT_TOKEN veya TELEGRAM_CHAT_ID eksik.");
    return;
  }
  try {
    // Önce son mesajı atan chat_id'yi bulmaya çalışalım (getUpdates)
    const updatesRes = await axios.get(`https://api.telegram.org/bot${TOKEN}/getUpdates`);
    const updates = updatesRes.data.result;
    let chatId = null;
    if (updates && updates.length > 0) {
      chatId = updates[updates.length - 1].message.chat.id;
    }

    if (!chatId) {
      console.error("Hata: Mesaj gönderilecek Chat ID bulunamadı. Lütfen botu başlatın (/start).");
      return;
    }

    await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      chat_id: chatId,
      text: text
    });
    console.log("Bildirim başarıyla gönderildi.");
  } catch (err) {
    console.error("Telegram bildirim hatası:", err.message);
  }
}

const message = process.argv[2] || "Sistemden mesaj var.";
notify(message);
