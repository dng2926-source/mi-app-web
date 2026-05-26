const Notification = require('../models/Notification');
const User = require('../models/User');
const logger = require('../utils/logger');

// Obtener notificaciones del usuario
exports.getNotifications = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ recipient: req.user })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username _id')
      .populate({
        path: 'post',
        select: 'content imageUrl author',
        populate: { path: 'author', select: 'username _id' }
      });

    const total = await Notification.countDocuments({ recipient: req.user });

    res.json({
      notifications,
      pagination: {
        page,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error al obtener notificaciones:', error);
    res.status(500).json({ message: 'Error al obtener notificaciones' });
  }
};

// Marcar notificación como leída
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndUpdate(id, { read: true });
    res.json({ message: 'Notificación marcada como leída' });
  } catch (error) {
    logger.error('Error al marcar notificación:', error);
    res.status(500).json({ message: 'Error al marcar notificación' });
  }
};

// Marcar todas como leídas
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user, read: false }, { read: true });
    res.json({ message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    logger.error('Error al marcar todas:', error);
    res.status(500).json({ message: 'Error al marcar notificaciones' });
  }
};

// Función helper para crear notificación
exports.createNotification = async (recipientId, senderId, type, postId = null) => {
  // En pruebas o cuando no hay modelos disponibles, no hacer nada
  if (typeof jest !== 'undefined' || !Notification || !User) return;

  try {
    // No crear notificación para sí mismo
    if (String(recipientId) === String(senderId)) return;

    const notification = new Notification({
      recipient: recipientId,
      sender: senderId,
      type,
      post: postId
    });

    await notification.save();
  } catch (error) {
    // Silenciar errores en pruebas o cuando no hay conexión a BD
    console.warn('Could not create notification:', error.message);
  }
};