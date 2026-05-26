const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { // Nombre de usuario para el login
    type: String,
    required: true,
    unique: true, // Cada nombre de usuario debe ser único
    trim: true // Elimina espacios en blanco al inicio y final
  },
  password: { // Contraseña encriptada
    type: String,
    required: true
  },
  email: { // Email opcional, pero útil
    type: String,
    required: false, // No es obligatorio por ahora
    unique: true,
    trim: true,
    lowercase: true // Guarda el email en minúsculas
  },
  createdAt: { // Fecha de creación del usuario
    type: Date,
    default: Date.now
  }
});

// Exportamos el modelo, llamándolo 'User'
module.exports = mongoose.model('User', UserSchema);