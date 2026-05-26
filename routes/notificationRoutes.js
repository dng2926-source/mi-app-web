const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const auth = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(auth);

// Obtener notificaciones
router.get('/', notificationController.getNotifications);

// Marcar como leída
router.put('/:id/read', notificationController.markAsRead);

// Marcar todas como leídas
router.put('/read-all', notificationController.markAllAsRead);

module.exports = router;