const mongoose = require('mongoose');

const PublicationSchema = new mongoose.Schema({
  title: { // Título de la publicación
    type: String,
    required: true,
    trim: true
  },
  content: { // Contenido principal de la publicación
    type: String,
    required: true,
    trim: true
  },
  author: { // Referencia al usuario que creó la publicación
    type: mongoose.Schema.Types.ObjectId, // Tipo ObjectId para referenciar otro documento
    ref: 'User', // Indica que referencia al modelo 'User'
    required: true
  },
  createdAt: { // Fecha de creación de la publicación
    type: Date,
    default: Date.now
  },
  // Podríamos añadir campos para likes, comentarios, etc. más adelante
});

// Exportamos el modelo, llamándolo 'Publication'
module.exports = mongoose.model('Publication', PublicationSchema);