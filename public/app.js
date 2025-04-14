document.addEventListener('DOMContentLoaded', () => {
  // Socket.io bağlantısı
  const socket = io();
  
  // DOM Elemanları
  const loginContainer = document.getElementById('login-container');
  const chatContainer = document.getElementById('chat-container');
  const usernameInput = document.getElementById('username-input');
  const loginButton = document.getElementById('login-button');
  const loginError = document.getElementById('login-error');
  const currentUserSpan = document.getElementById('current-user');
  const usersList = document.getElementById('users-list');
  const userSearch = document.getElementById('user-search');
  const welcomeMessage = document.getElementById('welcome-message');
  const chatScreen = document.getElementById('chat-screen');
  const chatWithSpan = document.getElementById('chat-with');
  const chatWithInitials = document.getElementById('chat-with-initials');
  const messagesContainer = document.getElementById('messages');
  const messageInput = document.getElementById('message-input');
  const sendButton = document.getElementById('send-button');
  
  // Uygulama durumu
  let currentUser = null;
  let currentRoom = null;
  let allContacts = []; // Tüm kullanıcılar ve sohbetleri birleştirdiğimiz liste
  
  // Giriş işlemi
  loginButton.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (username) {
      socket.emit('register', username);
    } else {
      loginError.textContent = 'Lütfen bir kullanıcı adı girin';
    }
  });
  
  usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      loginButton.click();
    }
  });
  
  // Kullanıcı arama
  userSearch.addEventListener('input', (e) => {
    const searchText = e.target.value.toLowerCase();
    filterUsers(searchText);
  });
  
  function filterUsers(searchText) {
    const userItems = usersList.querySelectorAll('.list-group-item');
    userItems.forEach(item => {
      const userName = item.querySelector('.user-name').textContent.toLowerCase();
      if (userName.includes(searchText)) {
        item.style.display = 'block';
      } else {
        item.style.display = 'none';
      }
    });
  }
  
  // Mesaj gönderme
  sendButton.addEventListener('click', sendMessage);
  
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
  
  function sendMessage() {
    const message = messageInput.value.trim();
    if (message && currentRoom) {
      socket.emit('sendMessage', {
        roomId: currentRoom,
        message: message
      });
      messageInput.value = '';
    }
  }
  
  // Socket olayları
  socket.on('register_success', (username) => {
    currentUser = username;
    loginContainer.classList.add('d-none');
    chatContainer.classList.remove('d-none');
    currentUserSpan.textContent = username;
    loginError.textContent = '';
    
    // Kullanıcı listesini ve önceki sohbetleri yükleyelim
    socket.emit('getUserRooms');
  });
  
  socket.on('register_error', (errorMessage) => {
    loginError.textContent = errorMessage;
  });
  
  socket.on('userList', (users) => {
    // Kendimizi listeden çıkaralım
    const filteredUsers = users.filter(user => user !== currentUser);
    
    // Kullanıcıları saklayalım
    updateContactsList(filteredUsers);
  });
  
  socket.on('userRooms', (rooms) => {
    if (rooms && rooms.length > 0) {
      // Odaları işleyelim ve kontaklar listesine ekleyelim
      const roomContacts = [];
      
      rooms.forEach(room => {
        const otherUser = room.participants.find(user => user !== currentUser);
        if (otherUser) {
          roomContacts.push({
            username: otherUser,
            roomId: room.roomId,
            lastActivity: new Date(room.lastActivity),
            hasChat: true
          });
        }
      });
      
      // Mevcut kullanıcı listesini güncelleyelim
      updateContactsList(null, roomContacts);
    }
  });
  
  socket.on('roomCreated', (roomData) => {
    currentRoom = roomData.roomId;
    
    // Karşıdaki kullanıcının adını bul
    const otherUser = roomData.participants.find(user => user !== currentUser);
    chatWithSpan.textContent = otherUser;
    chatWithInitials.textContent = getInitials(otherUser);
    
    // Ekranları güncelle
    welcomeMessage.classList.add('d-none');
    chatScreen.classList.remove('d-none');
    
    // İlgili kullanıcıyı listede aktif olarak işaretle
    markActiveContact(otherUser);
    
    // Mesaj geçmişini yükle
    loadMessages(roomData.messages);
    
    // Kullanıcının artık sohbeti olduğunu işaretle
    updateContactStatus(otherUser, roomData.roomId);
  });
  
  socket.on('newMessage', (message) => {
    // Mesajı ekleyelim
    addMessage(message);
    
    // Eğer göndericimiz değilse, ilgili kullanıcının son aktivitesini güncelleyelim
    if (message.sender !== currentUser) {
      updateLastActivity(message.sender);
    }
  });
  
  socket.on('messageError', (errorMessage) => {
    console.error('Mesaj hatası:', errorMessage);
  });
  
  socket.on('roomError', (errorMessage) => {
    console.error('Oda hatası:', errorMessage);
  });
  
  // Yardımcı fonksiyonlar
  function updateContactsList(users = null, rooms = null) {
    // Mevcut kontak listesini güncelle
    if (users) {
      // Yeni kullanıcıları ekle
      users.forEach(user => {
        // Kullanıcı zaten var mı kontrol et
        const existingIndex = allContacts.findIndex(contact => contact.username === user);
        
        if (existingIndex === -1) {
          // Yeni kullanıcı ekle
          allContacts.push({
            username: user,
            roomId: null,
            lastActivity: null,
            hasChat: false
          });
        }
      });
    }
    
    if (rooms) {
      // Odaları ekle veya güncelle
      rooms.forEach(room => {
        const existingIndex = allContacts.findIndex(contact => contact.username === room.username);
        
        if (existingIndex !== -1) {
          // Mevcut kullanıcıyı güncelle
          allContacts[existingIndex].roomId = room.roomId;
          allContacts[existingIndex].lastActivity = room.lastActivity;
          allContacts[existingIndex].hasChat = true;
        } else {
          // Yeni ekle
          allContacts.push(room);
        }
      });
    }
    
    // Kontak listesini son aktiviteye göre sırala
    allContacts.sort((a, b) => {
      // Sohbeti olmayan kullanıcıları en sona koy
      if (!a.hasChat && b.hasChat) return 1;
      if (a.hasChat && !b.hasChat) return -1;
      
      // Sohbeti olan kullanıcıları son aktiviteye göre sırala
      if (a.hasChat && b.hasChat) {
        return b.lastActivity - a.lastActivity;
      }
      
      // Sohbeti olmayan kullanıcıları alfabetik sırala
      return a.username.localeCompare(b.username);
    });
    
    // Kullanıcı listesini temizle ve yeniden oluştur
    renderContactsList();
  }
  
  function renderContactsList() {
    usersList.innerHTML = '';
    
    allContacts.forEach(contact => {
      const initialsText = getInitials(contact.username);
      
      const userItem = document.createElement('div');
      userItem.className = 'list-group-item';
      userItem.dataset.username = contact.username;
      
      let lastActivityText = '';
      if (contact.hasChat && contact.lastActivity) {
        lastActivityText = formatTimeAgo(contact.lastActivity);
      }
      
      userItem.innerHTML = `
        <div class="d-flex align-items-center user-list-item">
          <div class="avatar-circle small-avatar-circle">
            <span class="avatar-initials">${initialsText}</span>
          </div>
          <div class="ms-3 flex-grow-1">
            <div class="fw-semibold user-name">${contact.username}</div>
            <div class="text-muted small last-activity">${lastActivityText}</div>
          </div>
          ${contact.hasChat ? '<div class="text-primary"><i class="fas fa-circle-dot small"></i></div>' : ''}
        </div>
      `;
      
      userItem.addEventListener('click', () => {
        // Eğer bir oda yoksa oluştur, varsa katıl
        if (contact.roomId) {
          socket.emit('joinRoom', contact.roomId);
        } else {
          socket.emit('createRoom', contact.username);
        }
      });
      
      usersList.appendChild(userItem);
    });
  }
  
  function markActiveContact(username) {
    // Önce tüm active sınıflarını kaldıralım
    const userItems = usersList.querySelectorAll('.list-group-item');
    userItems.forEach(item => {
      item.classList.remove('active');
    });
    
    // İlgili kullanıcıyı aktif olarak işaretleyelim
    const activeItem = usersList.querySelector(`.list-group-item[data-username="${username}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
    }
  }
  
  function updateContactStatus(username, roomId) {
    // Kullanıcının bilgilerini güncelle
    const index = allContacts.findIndex(contact => contact.username === username);
    if (index !== -1) {
      allContacts[index].hasChat = true;
      allContacts[index].roomId = roomId;
      allContacts[index].lastActivity = new Date();
      
      // Listeyi yeniden oluştur
      renderContactsList();
      
      // Aktif kullanıcıyı işaretle
      markActiveContact(username);
    }
  }
  
  function updateLastActivity(username) {
    // Kullanıcının son aktivitesini güncelle
    const index = allContacts.findIndex(contact => contact.username === username);
    if (index !== -1) {
      allContacts[index].lastActivity = new Date();
      
      // Son aktiviteyi güncelle
      const userItem = usersList.querySelector(`.list-group-item[data-username="${username}"]`);
      if (userItem) {
        const lastActivityEl = userItem.querySelector('.last-activity');
        if (lastActivityEl) {
          lastActivityEl.textContent = 'Az önce';
        }
      }
    }
  }
  
  function loadMessages(messages) {
    messagesContainer.innerHTML = '';
    messages.forEach(message => {
      addMessage(message);
    });
  }
  
  function addMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    
    if (message.sender === currentUser) {
      messageDiv.classList.add('sent');
    } else {
      messageDiv.classList.add('received');
    }
    
    const messageTime = new Date(message.timestamp);
    const formattedTime = !isNaN(messageTime.getTime()) ? formatTime(messageTime) : formatTime(new Date());
    
    messageDiv.innerHTML = `
      <div class="message-content">
        ${message.text}
        <div class="message-time">
          ${formattedTime}
          ${message.sender === currentUser ? '<span class="read-mark"><i class="fas fa-check-double"></i></span>' : ''}
        </div>
      </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    
    // Otomatik kaydırma
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  function formatTime(date) {
    // Saat ve dakikayı iki haneli olarak formatla
    const hours = date.getHours();
    const minutes = date.getMinutes();
    
    // İki basamaklı formata çevir
    const formattedHours = hours < 10 ? '0' + hours : hours;
    const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
    
    return `${formattedHours}:${formattedMinutes}`;
  }
  
  function formatTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    
    // Zaman farkını saat, dakika, saniye olarak hesapla
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      if (days === 1) return 'Dün';
      if (days <= 7) return `${days} gün önce`;
      
      // Belirli bir tarih formatı
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    } else if (hours > 0) {
      return `${hours} saat önce`;
    } else if (minutes > 0) {
      return `${minutes} dakika önce`;
    } else {
      return 'Az önce';
    }
  }
  
  function getInitials(name) {
    if (!name) return '';
    return name.split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }
});