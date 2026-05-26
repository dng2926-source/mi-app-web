const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, trim: true },
  mediaUrl: { type: String },
  mediaType: { type: String, enum: ['image', 'video', 'audio', 'file'] },
  mediaName: { type: String },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, index: true }
});

// Índices para consultas rápidas de mensajes
MessageSchema.index({ sender: 1, receiver: 1 });
MessageSchema.index({ receiver: 1, read: 1 });
MessageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Message', MessageSchema);
