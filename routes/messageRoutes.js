const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const messageController = require('../controllers/messageController');
const auth = require('../middleware/authMiddleware');

const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'messages');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `msg_${Date.now()}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'video/mp4', 'video/webm', 'video/ogg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no soportado para mensajes')); 
    }
  }
});

// Todas las rutas de mensajes requieren autenticación
router.use(auth);

// Obtener conversaciones recientes
router.get('/', messageController.getConversations);

// Obtener conversación con un usuario específico
router.get('/:userId', messageController.getConversation);

// Enviar mensaje
router.post('/:userId', upload.single('media'), messageController.sendMessage);

module.exports = router;
