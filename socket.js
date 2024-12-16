const { Server } = require('socket.io');
const Chat = require('./models/chat.model');
const Message = require('./models/message.model');

const initSocketServer = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*', // Allow requests from any origin
    },
  });

  io.on('connection', (socket) => {
    console.log('🔗 A user connected', socket.id);

    // 1️⃣ **Join Chat Room**
    socket.on('join_chat', (chatId) => {
      if (!chatId) {
        console.log('❌ Chat ID is missing');
        return;
      }

      socket.join(chatId);
      console.log(`✅ User joined chat room: ${chatId}`);
    });

  

    // 3️⃣ **Handle User Disconnection**
    socket.on('disconnect', () => {
      console.log('❌ User disconnected');
    });
  });
};

module.exports = initSocketServer;
