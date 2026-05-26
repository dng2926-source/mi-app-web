const express = require('express');
const router = express.Router();
const publicationController = require('../controllers/publicationController');
const auth = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { validatePublication, validateComment, validateObjectId } = require('../middleware/validators');

// Asegurar que el directorio de uploads existe
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de Multer con ruta absoluta
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = 'pub_' + Date.now() + ext;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen (JPEG, PNG, GIF, WebP)'));
    }
  }
});

// RUTAS
router.get('/', publicationController.getPublications);
router.get('/user/me', auth, publicationController.getUserPublications);
router.get('/user/:userId', publicationController.getUserProfilePublications);
router.post('/', auth, upload.single('image'), validatePublication, publicationController.createPublication);
router.post('/like/:id', auth, validateObjectId, publicationController.likePublication);
router.post('/comment/:id', auth, validateObjectId, validateComment, publicationController.commentPublication);
router.delete('/:id', auth, validateObjectId, publicationController.deletePublication);

// Manejo de errores de multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Archivo muy grande, máximo 5MB' });
    }
    return res.status(400).json({ message: 'Error al procesar archivo: ' + error.message });
  }
  if (error) {
    return res.status(400).json({ message: error.message });
  }
  next();
});

module.exports = router;