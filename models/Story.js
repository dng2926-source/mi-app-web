const mongoose = require('mongoose');

const StorySchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  imageUrl: { type: String, required: true },
  imageType: { type: String, enum: ['image', 'video'], default: 'image' },
  viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { 
    type: Date, 
    default: Date.now,
    // Eliminar automáticamente después de 24 horas
    expires: 86400 // 24 horas en segundos
  }
});

// Índice para consultas rápidas
StorySchema.index({ author: 1, createdAt: -1 });

module.exports = mongoose.model('Story', StorySchema);
