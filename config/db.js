const mongoose = require('mongoose');
require('dotenv').config();
const logger = require('../utils/logger');

const conectarDB = async () => {
  try {
    logger.info(`📡 Conectando a MongoDB: ${process.env.MONGO_URI?.substring(0, 50)}...`);
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('✅ Conectado a MongoDB correctamente!');
  } catch (error) {
    logger.error('❌ Error al conectar a MongoDB:', error.message);
    logger.warn('⚠️ Continuando sin MongoDB... Solo APIs disponibles');
    // No hacer exit(1) - permitir que el servidor continúe
  }
};

module.exports = conectarDB;
