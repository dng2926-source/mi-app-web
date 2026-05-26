const Story = require('../models/Story');
const User = require('../models/User');
const logger = require('../utils/logger');

// Obtener historias de usuarios seguidos
exports.getStories = async (req, res) => {
  try {
    const currentUserId = req.user;
    
    // Obtener usuarios que el usuario actual sigue
    const currentUser = await User.findById(currentUserId).select('following');
    if (!currentUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Obtener historias de usuarios seguidos + propias
    const userIds = [...currentUser.following, currentUserId];
    
    const stories = await Story.find({
      author: { $in: userIds },
      createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // últimas 24 horas
    })
      .sort({ createdAt: -1 })
      .populate('author', 'username _id')
      .populate('viewers', '_id');
    
    // Agrupar por usuario (para mostrar un ícono por usuario con la cantidad de historias)
    const groupedStories = {};
    stories.forEach(story => {
      const authorId = String(story.author._id);
      if (!groupedStories[authorId]) {
        groupedStories[authorId] = {
          author: story.author,
          stories: []
        };
      }
      groupedStories[authorId].stories.push(story);
    });
    
    res.json({ 
      stories: Object.values(groupedStories)
    });
  } catch (error) {
    logger.error('Error al obtener historias:', error);
    res.status(500).json({ message: 'Error al obtener historias' });
  }
};

// Obtener historias de un usuario específico
exports.getUserStories = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user;
    
    const stories = await Story.find({
      author: userId,
      createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    })
      .sort({ createdAt: 1 })
      .populate('author', 'username _id');
    
    if (stories.length === 0) {
      return res.json({ stories: [] });
    }
    
    // Marcar como visto
    const viewedStoryIds = stories
      .filter(s => !s.viewers.includes(currentUserId))
      .map(s => s._id);
    
    if (viewedStoryIds.length > 0) {
      await Story.updateMany(
        { _id: { $in: viewedStoryIds } },
        { $addToSet: { viewers: currentUserId } }
      );
    }
    
    res.json({ stories });
  } catch (error) {
    logger.error('Error al obtener historias del usuario:', error);
    res.status(500).json({ message: 'Error al obtener historias' });
  }
};

// Crear historia
exports.createStory = async (req, res) => {
  try {
    const authorId = req.user;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Se requiere una imagen o video' });
    }
    
    // Determinar tipo de media
    const mediaType = req.file.mimetype.startsWith('video') ? 'video' : 'image';
    
    const story = new Story({
      author: authorId,
      imageUrl: `/uploads/stories/${req.file.filename}`,
      imageType: mediaType,
      viewers: [authorId] // El autor siempre la ve
    });
    
    await story.save();
    await story.populate('author', 'username _id');
    
    res.status(201).json(story);
  } catch (error) {
    logger.error('Error al crear historia:', error);
    res.status(500).json({ message: 'Error al crear historia' });
  }
};

// Obtener historias propias
exports.getMyStories = async (req, res) => {
  try {
    const authorId = req.user;
    
    const stories = await Story.find({ author: authorId })
      .sort({ createdAt: -1 })
      .populate('viewers', 'username');
    
    res.json({ stories });
  } catch (error) {
    logger.error('Error al obtener mis historias:', error);
    res.status(500).json({ message: 'Error al obtener historias' });
  }
};

// Eliminar historia
exports.deleteStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const currentUserId = req.user;
    
    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: 'Historia no encontrada' });
    }
    
    // Verificar que el usuario es el autor
    if (story.author.toString() !== currentUserId.toString()) {
      return res.status(403).json({ message: 'No tienes permisos para eliminar esta historia' });
    }
    
    // Eliminar archivo
    if (story.imageUrl) {
      const fs = require('fs');
      const path = require('path');
      try {
        let filePath;
        if (story.imageUrl.startsWith('/uploads/')) {
          filePath = path.join(__dirname, '..', 'public', story.imageUrl);
        } else {
          filePath = path.join(__dirname, '..', 'public', 'uploads', 'stories', story.imageUrl);
        }
        
        const normalizedPath = path.normalize(filePath);
        const publicPath = path.normalize(path.join(__dirname, '..', 'public'));
        if (!normalizedPath.startsWith(publicPath)) {
          throw new Error('Invalid path');
        }
        
        if (fs.existsSync(normalizedPath)) {
          fs.unlinkSync(normalizedPath);
        }
      } catch (err) {
        logger.error('Error al eliminar archivo de historia:', err);
      }
    }
    
    await Story.findByIdAndDelete(storyId);
    res.json({ message: 'Historia eliminada' });
  } catch (error) {
    logger.error('Error al eliminar historia:', error);
    res.status(500).json({ message: 'Error al eliminar historia' });
  }
};
