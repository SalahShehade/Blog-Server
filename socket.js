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

    // 2️⃣ **Send Message**
    socket.on('send_message', async (data) => {
      try {
        // ✅ **Validate required fields**
        const { chatId, senderEmail, receiverEmail, content } = data;

        if (!chatId || !senderEmail || !content) {
          console.log('❌ Missing required fields in send_message event', data);
          return;
        }

        // ✅ **Log for debugging**
        console.log(`📩 New message from ${senderEmail} to ${receiverEmail} in chat ${chatId}: ${content}`);

        // ✅ **Ensure socket joins the chat room**
        socket.join(chatId);

        // ✅ **Create a new message**
        const message = new Message({
          chatId, 
          senderEmail, 
          receiverEmail, 
          content, 
          timestamp: Date.now()
        });

        await message.save();

        // ✅ **Update the chat with the latest message**
        await Chat.findByIdAndUpdate(chatId, {
          $push: { messages: message._id },
          lastMessage: content,
          lastMessageTime: Date.now(),
        });

        // ✅ **Emit the message to the room**
        io.to(chatId).emit('receive_message', {
          _id: message._id,
          chatId: message.chatId,
          senderEmail: message.senderEmail,
          receiverEmail: message.receiverEmail,
          content: message.content,
          timestamp: message.timestamp,
        });

        console.log(`📡 Message sent to room: ${chatId} | Content: ${content}`);

      } catch (error) {
        console.error("❌ Error in send_message event:", error);
      }
    });

    // 3️⃣ **Handle User Disconnection**
    socket.on('disconnect', () => {
      console.log('❌ User disconnected');
    });
  });
};

module.exports = initSocketServer;
