const mongoose = require('mongoose');

const PublicationSchema = new mongoose.Schema({
  content: { type: String, required: true },
  imageUrl: { type: String },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    text: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now, index: true }
});

// Índices para optimizar búsquedas y sorting
PublicationSchema.index({ createdAt: -1 });
PublicationSchema.index({ author: 1 });
PublicationSchema.index({ likes: 1 });
PublicationSchema.index({ 'comments.user': 1 });
PublicationSchema.index({ 'author': 1, 'createdAt': -1 });

module.exports = mongoose.model('Publication', PublicationSchema);