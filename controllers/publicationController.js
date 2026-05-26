const Publication = require('../models/Publication');
const User = require('../models/User');
const logger = require('../utils/logger');

// Importar createNotification de forma segura
let createNotification;
try {
  createNotification = require('./notificationController').createNotification;
} catch (e) {
  createNotification = async () => {}; // No-op para pruebas
}

exports.createPublication = async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'El contenido no puede estar vacío' });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    
    const newPublication = new Publication({
      content: content.trim(),
      imageUrl,
      author: req.user
    });
    
    await newPublication.save();
    
    // Usar agregación para obtener datos completos de forma eficiente
    const result = await Publication.aggregate([
      { $match: { _id: newPublication._id } },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'author'
        }
      },
      { $unwind: '$author' },
      {
        $project: {
          content: 1,
          imageUrl: 1,
          author: { username: 1, _id: 1 },
          likes: 1,
          comments: 1,
          createdAt: 1
        }
      }
    ]);
    
    res.status(201).json(result[0]);
  } catch (error) {
    logger.error('Error al crear publicación:', error);
    res.status(500).json({ message: 'Error al crear publicación' });
  }
};

exports.getPublications = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 10;
    const skip = (page - 1) * limit;

    // Optimización: usar agregación para evitar populate ineficiente
    const publications = await Publication.aggregate([
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'author'
        }
      },
      { $unwind: '$author' },
      {
        $project: {
          content: 1,
          imageUrl: 1,
          author: { username: 1, _id: 1 },
          likes: 1,
          comments: 1,
          createdAt: 1,
          likesCount: { $size: '$likes' },
          commentsCount: { $size: '$comments' }
        }
      }
    ]);
    
    const total = await Publication.countDocuments();
    
    res.json({
      publications,
      pagination: {
        page,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error al obtener publicaciones:', error);
    res.status(500).json({ message: 'Error al obtener publicaciones' });
  }
};

exports.likePublication = async (req, res) => {
  try {
    const publication = await Publication.findById(req.params.id);
    if (!publication) {
      return res.status(404).json({ message: 'Publicación no encontrada' });
    }

    const userIdStr = req.user.toString();
    const likeIndex = publication.likes.findIndex(id => id.toString() === userIdStr);
    
    if (likeIndex > -1) {
      // Si ya tiene like, se lo quitamos (Toggle)
      publication.likes.splice(likeIndex, 1);
    } else {
      publication.likes.push(req.user);
      // Crear notificación de like
      await createNotification(publication.author, req.user, 'like', publication._id);
    }
    
    await publication.save();
    res.json({ likes: publication.likes, count: publication.likes.length });
  } catch (error) {
    logger.error('Error en el like:', error);
    res.status(500).json({ message: 'Error al procesar el like' });
  }
};

exports.commentPublication = async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'El comentario no puede estar vacío' });
    }

    const publication = await Publication.findById(req.params.id);
    if (!publication) {
      return res.status(404).json({ message: 'Publicación no encontrada' });
    }

    const user = await User.findById(req.user).select('username');
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    publication.comments.push({
      user: req.user,
      username: user.username,
      text: text.trim(),
      createdAt: new Date()
    });
    
    await publication.save();
    
    // Crear notificación de comentario
    await createNotification(publication.author, req.user, 'comment', publication._id);
    
    res.json({ comments: publication.comments, commentsCount: publication.comments.length });
  } catch (error) {
    logger.error('Error al comentar:', error);
    res.status(500).json({ message: 'Error al procesar el comentario' });
  }
};

// NUEVA FUNCIÓN: Eliminar publicación (solo autor puede)
exports.deletePublication = async (req, res) => {
  try {
    const publication = await Publication.findById(req.params.id);
    if (!publication) {
      return res.status(404).json({ message: 'Publicación no encontrada' });
    }

    // Verificar que el usuario es el autor
    if (publication.author.toString() !== req.user.toString()) {
      return res.status(403).json({ message: 'No tienes permisos para eliminar esta publicación' });
    }

    // Eliminar archivo de imagen si existe
    if (publication.imageUrl) {
      const fs = require('fs');
      const path = require('path');
      try {
        // Mejorar manejo seguro de la ruta
        let imagePath;
        if (publication.imageUrl.startsWith('/uploads/')) {
          imagePath = path.join(__dirname, '..', 'public', publication.imageUrl);
        } else if (publication.imageUrl.startsWith('/')) {
          imagePath = path.join(__dirname, '..', 'public', publication.imageUrl);
        } else {
          imagePath = path.join(__dirname, '..', 'public', 'uploads', publication.imageUrl);
        }
        
        // Normalizar y verificar que no sale de public
        const normalizedPath = path.normalize(imagePath);
        const publicPath = path.normalize(path.join(__dirname, '..', 'public'));
        if (!normalizedPath.startsWith(publicPath)) {
          throw new Error('Invalid image path');
        }
        
        if (fs.existsSync(normalizedPath)) {
          fs.unlinkSync(normalizedPath);
        }
      } catch (err) {
        logger.error('Error al eliminar imagen:', err);
        // No bloquear la eliminación de publicación si la imagen no se puede eliminar
      }
    }

    await Publication.findByIdAndDelete(req.params.id);
    res.json({ message: 'Publicación eliminada correctamente' });
  } catch (error) {
    logger.error('Error al eliminar publicación:', error);
    res.status(500).json({ message: 'Error al eliminar publicación' });
  }
};

// NUEVA FUNCIÓN: Obtener publicaciones del usuario actual
exports.getUserPublications = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 10;
    const skip = (page - 1) * limit;

    const mongoose = require('mongoose');
    const userId = new mongoose.Types.ObjectId(req.user);

    const publications = await Publication.aggregate([
      { $match: { author: userId } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'author'
        }
      },
      { $unwind: '$author' },
      {
        $project: {
          content: 1,
          imageUrl: 1,
          author: { username: 1, _id: 1 },
          likes: 1,
          comments: 1,
          createdAt: 1,
          likesCount: { $size: '$likes' },
          commentsCount: { $size: '$comments' }
        }
      }
    ]);

    const total = await Publication.countDocuments({ author: userId });

    res.json({
      publications,
      pagination: {
        page,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error al obtener publicaciones del usuario:', error);
    res.status(500).json({ message: 'Error al obtener publicaciones' });
  }
};

// NUEVA FUNCIÓN: Obtener publicaciones de un usuario específico
exports.getUserProfilePublications = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 10;
    const skip = (page - 1) * limit;

    const mongoose = require('mongoose');

    // Verificar que el usuario existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const publications = await Publication.aggregate([
      { $match: { author: userObjectId } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'author'
        }
      },
      { $unwind: '$author' },
      {
        $project: {
          content: 1,
          imageUrl: 1,
          author: { username: 1, _id: 1 },
          likes: 1,
          comments: 1,
          createdAt: 1,
          likesCount: { $size: '$likes' },
          commentsCount: { $size: '$comments' }
        }
      }
    ]);

    const total = await Publication.countDocuments({ author: userObjectId });

    res.json({
      user: {
        id: user._id,
        username: user.username,
        followersCount: user.followers?.length || 0,
        followingCount: user.following?.length || 0
      },
      publications,
      pagination: {
        page,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error al obtener publicaciones del perfil:', error);
    res.status(500).json({ message: 'Error al obtener publicaciones del perfil' });
  }
};