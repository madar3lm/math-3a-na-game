const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// قاعدة بيانات الاشتراكات والأجهزة
const subscriptions = {
  "school1": { 
    expireDate: "2027-12-31", // تاريخ انتهاء الاشتراك
    maxDevices: 2             // الحد الأقصى للأجهزة المتصلة
  }
};

const activeSessions = {}; 

io.on('connection', (socket) => {
  socket.on('join_game', { accountId, deviceId }) => {
    const sub = subscriptions[accountId];

    // 1. فحص الاشتراك
    if (!sub) {
      socket.emit('error_message', 'رابط أو حساب غير صالح.');
      return socket.disconnect();
    }

    const today = new Date().toISOString().split('T')[0];
    if (today > sub.expireDate) {
      socket.emit('error_message', 'عفواً، انتهت مدة الاشتراك السنوي. يرجى التجديد للمتابعة.');
      return socket.disconnect();
    }

    // 2. فحص الأجهزة وطرد الزائد
    if (!activeSessions[accountId]) {
      activeSessions[accountId] = new Map();
    }

    const userDevices = activeSessions[accountId];

    if (!userDevices.has(deviceId) && userDevices.size >= sub.maxDevices) {
      socket.emit('error_message', 'تم تجاوز الحد الأقصى لعدد الأجهزة المتصلة بنفس الحساب!');
      return socket.disconnect();
    }

    userDevices.set(deviceId, socket.id);
    socket.accountId = accountId;
    socket.deviceId = deviceId;

    socket.emit('success_join', { message: 'تم الدخول بنجاح للعبة نافس رياضيات!' });

    socket.on('disconnect', () => {
      if (activeSessions[accountId]) {
        activeSessions[accountId].delete(deviceId);
      }
    
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(Server running on port ${PORT}));
