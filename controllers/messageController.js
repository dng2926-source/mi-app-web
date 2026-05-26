const Message = require('../models/Message');
const User = require('../models/User');
const logger = require('../utils/logger');

// Obtener mensajes entre dos usuarios
exports.getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const skip = (page - 1) * limit;

    // Verificar que el usuario existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Obtener mensajes entre los dos usuarios (bidireccional)
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId }
      ]
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username _id')
      .populate('receiver', 'username _id');

    // Marcar mensajes recibidos como leídos
    await Message.updateMany(
      { sender: userId, receiver: currentUserId, read: false },
      { read: true }
    );

    const total = await Message.countDocuments({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId }
      ]
    });

    res.json({
      messages: messages.reverse(),
      pagination: {
        page,
        total,
        pages: Math.ceil(total / limit)
      },
      user: {
        id: user._id,
        username: user.username
      }
    });
  } catch (error) {
    logger.error('Error al obtener conversación:', error);
    res.status(500).json({ message: 'Error al obtener mensajes' });
  }
};

// Enviar un mensaje
exports.sendMessage = async (req, res) => {
  try {
    const { userId } = req.params;
    const content = req.body.content ? req.body.content.trim() : '';
    const senderId = req.user;

    const hasMedia = !!req.file;
    if (!content && !hasMedia) {
      return res.status(400).json({ message: 'El mensaje no puede estar vacío' });
    }

    // Verificar que el usuario existe
    const receiver = await User.findById(userId);
    if (!receiver) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // No se puede enviar mensaje a sí mismo
    if (userId === senderId.toString()) {
      return res.status(400).json({ message: 'No puedes enviarte mensajes a ti mismo' });
    }

    const messageData = {
      sender: senderId,
      receiver: userId,
      content: content || ''
    };

    if (hasMedia) {
      const mediaType = req.file.mimetype.split('/')[0];
      messageData.mediaUrl = `/uploads/messages/${req.file.filename}`;
      messageData.mediaType = ['image', 'video', 'audio'].includes(mediaType) ? mediaType : 'file';
      messageData.mediaName = req.file.originalname;
    }

    const message = new Message(messageData);

    await message.save();
    await message.populate('sender', 'username _id');
    await message.populate('receiver', 'username _id');

    res.status(201).json(message);
  } catch (error) {
    logger.error('Error al enviar mensaje:', error);
    res.status(500).json({ message: 'Error al enviar mensaje' });
  }
};

// Obtener lista de conversaciones (chats recientes)
exports.getConversations = async (req, res) => {
  try {
    const currentUserId = req.user;

    // Obtener los últimos mensajes de cada conversación
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: currentUserId },
            { receiver: currentUserId }
          ]
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', currentUserId] },
              '$receiver',
              '$sender'
            ]
          },
          lastMessage: { $first: '$$ROOT' }
        }
      },
      { $limit: 20 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' }
    ]);

    res.json({
      conversations: conversations.map(conv => {
        const lastMsgSender = conv.lastMessage.sender;
        const isFromOther = lastMsgSender && lastMsgSender.toString() !== currentUserId.toString();
        const isUnread = isFromOther && !conv.lastMessage.read;
        
        return {
          userId: conv._id,
          username: conv.user.username,
          lastMessage: conv.lastMessage.content || '[Archivo adjunto]',
          lastMessageTime: conv.lastMessage.createdAt,
          unread: isUnread
        };
      })
    });
  } catch (error) {
    logger.error('Error al obtener conversaciones:', error);
    res.status(500).json({ message: 'Error al obtener conversaciones' });
  }
};
