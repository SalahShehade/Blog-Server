const { Server } = require('socket.io');
const Chat = require('./models/chat.model');
const Message = require('./models/message.model');

const initSocketServer = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
    },
  });

  io.on('connection', (socket) => {
    console.log('A user connected', socket.id);

    socket.on('join_chat', (chatId) => {
      socket.join(chatId);
      console.log(`User joined chat: ${chatId}`);
    });

    socket.on('send_message', async (data) => {
      const { chatId, senderEmail, content } = data;

      const message = new Message({ chatId, sender: senderEmail, content });
      await message.save();

      await Chat.findByIdAndUpdate(chatId, {
        $push: { messages: message._id },
        lastMessage: content,
        lastMessageTime: Date.now(),
      });

      io.to(chatId).emit('receive_message', message);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });
};

module.exports = initSocketServer;
