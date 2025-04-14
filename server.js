const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const connectDB = require('./db');
const { Message, Room, User } = require('./models');
const debug = require('debug')('socket.io:server');

// MongoDB bağlantısını başlat
connectDB();

// Express uygulamasını oluşturalım
const app = express();
app.use(cors());
//app.use(express.static(path.join(__dirname, 'public')));

// HTTP server ve Socket.io yapılandırması
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:4200",
    methods: ["GET", "POST"]
  }
});

// Aktif kullanıcıları saklamak için
const activeUsers = {};

// Socket bağlantısı
io.on('connection', async (socket) => {
  debug('Yeni kullanıcı bağlandı:', socket.id);
  
  // Kullanıcı kaydı
  socket.on('register', async (username) => {
    try {
      // Kullanıcı adı kontrolü
      if (Object.values(activeUsers).includes(username)) {
        socket.emit('register_error', 'Bu kullanıcı adı zaten aktif olarak kullanılıyor');
        socket.disconnect();
        return;
      }
      
      // Kullanıcıyı veritabanında bul veya oluştur
      let user = await User.findOne({ username });
      if (!user) {
        user = new User({ username });
        await user.save();
      } else {
        // Kullanıcı varsa son görülme zamanını güncelle
        user.lastSeen = new Date();
        await user.save();
      }
      
      activeUsers[socket.id] = username;
      socket.emit('register_success', username);
      
      // Tüm kullanıcıları gönder
      io.emit('userList', Object.values(activeUsers));
      
      // Kullanıcının sohbet odalarını getir
      const rooms = await Room.find({ participants: username });
      socket.emit('userRooms', rooms);
      
      console.log(`${username} kaydoldu`);
    } catch (error) {
      console.error('Kullanıcı kaydında hata:', error);
      socket.emit('register_error', 'Bir hata oluştu. Lütfen tekrar deneyin.');
    }
  });
  
  // Kullanıcının odalarını getir
  socket.on('getUserRooms', async () => {
    try {
      const username = activeUsers[socket.id];
      if (!username) return;
      
      const rooms = await Room.find({ participants: username });
      socket.emit('userRooms', rooms);
    } catch (error) {
      console.error('Odaları getirirken hata:', error);
    }
  });
  
  // Özel oda oluşturma
  socket.on('createRoom', async (targetUser) => {
    try {
      const currentUser = activeUsers[socket.id];
      if (!currentUser) return;
      
      // Kullanıcıyı veritabanında kontrol et
      const user = await User.findOne({ username: targetUser });
      if (!user) {
        socket.emit('roomError', 'Kullanıcı bulunamadı');
        return;
      }
      
      // Oda ID'sini oluştur (benzersiz olması için iki kullanıcının adını birleştirip sırala)
      const participants = [currentUser, targetUser].sort();
      const roomId = `${participants[0]}_${participants[1]}`;
      
      // Odayı veritabanında bul veya oluştur
      let room = await Room.findOne({ roomId });
      if (!room) {
        room = new Room({
          roomId,
          participants
        });
        await room.save();
      } else {
        // Odanın son aktivite zamanını güncelle
        room.lastActivity = new Date();
        await room.save();
      }
      
      // Önceki mesajları getir
      const messages = await Message.find({ roomId }).sort('timestamp');
      
      // Her iki kullanıcıyı da odaya ekle
      socket.join(roomId);
      const targetSocketId = Object.keys(activeUsers).find(id => activeUsers[id] === targetUser);
      if (targetSocketId && io.sockets.sockets.get(targetSocketId)) {
        io.sockets.sockets.get(targetSocketId).join(roomId);
      }
      
      // Her iki kullanıcıya da oda bilgisini gönder
      io.to(roomId).emit('roomCreated', {
        roomId: roomId,
        participants: participants,
        messages: messages
      });
      
      console.log(`Oda oluşturuldu veya açıldı: ${roomId}`);
    } catch (error) {
      console.error('Oda oluşturma hatası:', error);
      socket.emit('roomError', 'Bir hata oluştu. Lütfen tekrar deneyin.');
    }
  });
  
  // Belirli bir odaya gir
  socket.on('joinRoom', async (roomId) => {
    try {
      const username = activeUsers[socket.id];
      if (!username) return;
      
      // Odayı kontrol et
      const room = await Room.findOne({ roomId });
      if (!room) {
        socket.emit('roomError', 'Oda bulunamadı');
        return;
      }
      
      // Kullanıcının odaya erişimi var mı kontrol et
      if (!room.participants.includes(username)) {
        socket.emit('roomError', 'Bu odaya erişim izniniz yok');
        return;
      }
      
      // Önceki mesajları getir
      const messages = await Message.find({ roomId }).sort('timestamp');
      
      // Odaya katıl
      socket.join(roomId);
      
      // Oda bilgisini gönder
      socket.emit('roomCreated', {
        roomId: room.roomId,
        participants: room.participants,
        messages: messages
      });
      
      // Odanın son aktivite zamanını güncelle
      room.lastActivity = new Date();
      await room.save();
      
      console.log(`${username} ${roomId} odasına katıldı`);
    } catch (error) {
      console.error('Odaya katılma hatası:', error);
      socket.emit('roomError', 'Bir hata oluştu. Lütfen tekrar deneyin.');
    }
  });
  
  // Mesaj gönderme
  socket.on('sendMessage', async (data) => {
    try {
      const { roomId, message } = data;
      const sender = activeUsers[socket.id];
      
      if (!sender || !roomId || !message) {
        socket.emit('messageError', 'Geçersiz mesaj bilgileri');
        return;
      }
      
      // Odayı kontrol et
      const room = await Room.findOne({ roomId });
      if (!room) {
        socket.emit('messageError', 'Oda bulunamadı');
        return;
      }
      
      // Kullanıcının odaya erişimi var mı kontrol et
      if (!room.participants.includes(sender)) {
        socket.emit('messageError', 'Bu odaya mesaj gönderme izniniz yok');
        return;
      }
      
      // Yeni mesaj oluştur ve kaydet
      const newMessage = new Message({
        text: message,
        sender: sender,
        roomId: roomId,
        timestamp: new Date()
      });
      await newMessage.save();
      
      // Odanın son aktivite zamanını güncelle
      room.lastActivity = new Date();
      await room.save();
      
      // Odadaki herkese mesajı gönder
      io.to(roomId).emit('newMessage', newMessage);
      console.log(`Yeni mesaj (${roomId}): ${sender}: ${message}`);
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
      socket.emit('messageError', 'Bir hata oluştu. Lütfen tekrar deneyin.');
    }
  });
  
  // Kullanıcı çıkışı
  socket.on('disconnect', async () => {
    const username = activeUsers[socket.id];
    if (username) {
      try {
        // Kullanıcının son görülme zamanını güncelle
        await User.findOneAndUpdate(
          { username },
          { lastSeen: new Date() }
        );
        
        console.log(`${username} çıkış yaptı`);
        delete activeUsers[socket.id];
        
        // Güncellenmiş kullanıcı listesini gönder
        io.emit('userList', Object.values(activeUsers));
      } catch (error) {
        console.error('Kullanıcı çıkışında hata:', error);
      }
    }
  });
});


// Sunucuyu başlat
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
});