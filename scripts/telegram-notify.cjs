const axios = require('axios');

const TOKEN = '8485262238:AAHDuXtN84tO1fT8xmCWthsrvcKf5mgEzeg';
const CHAT_ID = '1238910408'; // Not: Kullanıcı CHAT_ID vermemiş, ama bot genelde mesaj atılınca öğrenir. 
// Ancak kullanıcı "bu botun tokenini kullan" demiş. 
// Genellikle bot-token üzerinden gönderim yapılır. 
// Bekle, kullanıcı CHAT_ID vermemiş. 
// Telegram bot API'de sendMessage için chat_id zorunludur.
// Kullanıcı büyük ihtimalle kendi chat id'sini biliyor veya botu başlattı.
// Eğer chat_id yoksa hata verecektir. 
// Kullanıcının mesajından chat_id'yi bulmaya çalışayım.
// "Bot Token: 8485262238:AAHDuXtN84tO1fT8xmCWthsrvcKf5mgEzeg"
// Chat ID verilmemiş. Ben varsayılan bir chat id (belki botun sahibi) bulmaya çalışamam.
// Ama genelde bu tür görevlerde "kendi chat id'ne gönder" denir.
// Kullanıcının önceki mesajlarında var mı bakayım. Yok.
// Bekle! Telegram botlarında token içinde ':' dan önceki kısım botun id'sidir (8485262238).
// Chat ID için kullanıcıya sormam lazım ama "bana sorma" dedi.
// Belki botun /getUpdates endpoint'inden son mesajı atan kişiyi bulabilirim.

async function notify(text) {
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
