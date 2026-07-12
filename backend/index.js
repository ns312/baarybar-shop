const express = require('express');
const axios = require('axios');
const { GoogleGenAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
app.use(express.json());

// Initialize Gemini API
// Make sure to set GEMINI_API_KEY, GREENAPI_ID, GREENAPI_TOKEN, TELEGRAM_BOT_TOKEN, and TELEGRAM_CHAT_ID in .env
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Simple in-memory session storage to keep track of chat history
// In production, you would use Redis, MongoDB, or Firebase Firestore
const sessions = {};

// Detailed System Prompt for the AI Sales Agent
const SYSTEM_INSTRUCTION = `
Ты — опытный, вежливый и экспертный менеджер по продажам кондиционеров интернет-магазина "Baarybar.shop" в Бишкеке.
Твоя цель — проконсультировать клиента, подобрать подходящую модель, закрепить за ним подарок (дефлектор) и мягко перевести диалог на человека-менеджера для подтверждения заказа и адреса доставки.

ПРАВИЛА ОБЩЕНИЯ:
1. Пиши кратко, дружелюбно, вежливо и грамотно на русском языке. Обращайся к клиенту по имени (если оно известно).
2. Используй смайлы (кондиционеры ❄️, подарки 🎁, огонь 🔥, сом ₸ или сом).
3. Валюта — киргизский сом (сом).
4. Расскажи про акцию: при заказе прямо сейчас клиент получает БЕСПЛАТНУЮ доставку по Бишкеку и защитный дефлектор в подарок (мы привезем и установим его бесплатно вместе с кондиционером!).
5. Если клиент спрашивает про преимущества дефлектора, объясни: он направляет холодный воздух вдоль потолка, защищая людей от простуды и сквозняков на кровати, диване или рабочем столе. Крепится без сверления.

КАТАЛОГ КОНДИЦИОНЕРОВ (Все цены актуальные, старые цены были выше, текущие цены окончательные):
А. Бытовые сплит-системы (для квартир, домов, офисов):
1. Midea (Премиум бренд, очень тихий, надежный, высокая энергоэффективность):
   - 09 BTU (до 25-30 кв.м) — 38 700 сом
   - 12 BTU (до 35-40 кв.м) — 43 200 сом
   - 18 BTU (до 50-60 кв.м) — 61 600 сом
   - 24 BTU (до 70-80 кв.м) — 74 800 сом
2. Almacom (Стандартный бренд, надежный, хорошее соотношение цена/качество):
   - 09 BTU (до 25-30 кв.м) — 29 700 сом
   - 12 BTU (до 35-40 кв.м) — 34 200 сом
   - 18 BTU (до 50-60 кв.м) — 49 600 сом
   - 24 BTU (до 70-80 кв.м) — 60 800 сом
3. Otex (Бюджетный надежный бренд, японский компрессор GMCC-Toshiba):
   - 09 BTU (до 25-30 кв.м) — 22 700 сом
   - 12 BTU (до 35-40 кв.м) — 26 200 сом
   - 18 BTU (до 50-60 кв.м) — 39 600 сом
   - 24 BTU (до 70-80 кв.м) — 47 800 сом
4. Duke (Бюджетный качественный бренд, компрессор Toshiba):
   - 09 BTU (до 25-30 кв.м) — 23 200 сом
   - 12 BTU (до 35-40 кв.м) — 26 800 сом
   - 18 BTU (до 50-60 кв.м) — 40 600 сом
   - 24 BTU (до 70-80 кв.м) — 48 800 сом

Б. Полупромышленные кондиционеры (для больших помещений, залов, ресторанов):
- Midea 24 MUE (Напольно-потолочный, 220V) — 79 200 сом
- Midea 18 MCA (Кассетный инвертор, 220V) — 88 000 сом
- Midea 24 YC400 (Колонный инвертор, 220V) — 101 200 сом
- Midea 60 MUE (Напольно-потолочный, 380V) — 145 200 сом
- Midea 48 MFM (Колонный инвертор, 380V) — 176 000 сом
- Midea 60 MFM (Колонный инвертор, 380V) — 184 800 сом

УСЛОВИЯ УСТАНОВКИ:
- Установка в Бишкеке выполняется штатными профессиональными монтажниками в день заказа.
- Монтаж чистый, без пыли, используется технология алмазного бурения со строительным пылесосом.

ПРАВИЛО ПЕРЕДАЧИ СДЕЛКИ ЧЕЛОВЕКУ (ГЛАВНОЕ ПРАВИЛО):
Как только клиент выражает готовность сделать заказ, спрашивает куда платить, просит оформить рассрочку, просит прислать монтажников, или явно говорит «Хочу заказать», ты должен:
1. Зафиксировать его выбор модели.
2. В конце своего ответа ОБЯЗАТЕЛЬНО напиши строго на новой строчке специальный тег: [TRANSFER_TO_MANAGER]
3. Вежливо напиши клиенту, что передаешь диалог старшему менеджеру для согласования времени и адреса.
`;

// Helper to get or create chat history
function getOrCreateSession(chatId) {
  if (!sessions[chatId]) {
    sessions[chatId] = {
      history: [{ role: 'user', parts: [{ text: SYSTEM_INSTRUCTION }] }],
      isTransferred: false
    };
  }
  return sessions[chatId];
}

// Route to receive incoming webhooks from GreenAPI
app.post('/webhook', async (req, res) => {
  try {
    const { body } = req;
    
    // Check if the event is a new incoming message
    if (body.typeWebhook === 'incomingMessageReceived') {
      const senderData = body.senderData;
      const messageData = body.messageData;
      
      const chatId = senderData.chatId; // WhatsApp identifier (e.g. 996502500874@c.us)
      const senderPhone = senderData.sender.replace('@c.us', '');
      const senderName = senderData.senderName || 'Клиент';
      
      // Ignore outgoing messages sent by the bot itself
      if (body.instanceData.wid === senderData.sender) {
        return res.sendStatus(200);
      }

      // Check if message is a text message
      if (messageData.typeMessage === 'textMessage') {
        const textMessage = messageData.textMessageData.textMessage;
        
        console.log(`[Message from ${senderPhone} (${senderName})]: ${textMessage}`);

        const session = getOrCreateSession(chatId);

        // If the chat has already been transferred to a human manager, ignore and let the human chat
        if (session.isTransferred) {
          console.log(`Chat with ${senderPhone} is handled by manager. Ignoring AI response.`);
          return res.sendStatus(200);
        }

        // Add user message to history
        session.history.push({ role: 'user', parts: [{ text: textMessage }] });

        // Start chat session with Gemini
        const chat = model.startChat({
          history: session.history,
          generationConfig: {
            maxOutputTokens: 500,
          },
        });

        // Generate response
        const result = await chat.sendMessage(textMessage);
        let aiResponse = result.response.text();

        // Check if response contains the transfer tag
        if (aiResponse.includes('[TRANSFER_TO_MANAGER]')) {
          session.isTransferred = true;
          
          // Remove the developer tag from the customer message
          aiResponse = aiResponse.replace('[TRANSFER_TO_MANAGER]', '').trim();

          // Send notification to manager via Telegram Bot API
          const telegramMessage = `🔥 *ГОРЯЧИЙ КЛИЕНТ ГОТОВ К ПОКУПКЕ!*\n\n` +
                                  `📱 *Телефон:* +${senderPhone}\n` +
                                  `👤 *Имя:* ${senderName}\n` +
                                  `💬 *Последнее сообщение:* _"${textMessage}"_\n\n` +
                                  `🟢 *[Открыть чат в WhatsApp](https://wa.me/${senderPhone})*`;

          try {
            await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
              chat_id: process.env.TELEGRAM_CHAT_ID,
              text: telegramMessage,
              parse_mode: 'Markdown'
            });
            console.log(`Alert sent to Telegram for client +${senderPhone}`);
          } catch (teleError) {
            console.error('Error sending Telegram notification:', teleError.message);
          }
        }

        // Add AI response to history
        session.history.push({ role: 'model', parts: [{ text: aiResponse }] });

        // Send reply to customer via GreenAPI
        const greenApiUrl = `https://api.green-api.com/waInstance${process.env.GREENAPI_ID}/sendMessage/${process.env.GREENAPI_TOKEN}`;
        
        await axios.post(greenApiUrl, {
          chatId: chatId,
          message: aiResponse
        });

        console.log(`[Reply to +${senderPhone}]: ${aiResponse}`);
      }
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.sendStatus(500);
  }
});

// Basic endpoint to check server status
app.get('/', (req, res) => {
  res.send('Baarybar AI Sales Assistant is running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
