const mongoose = require('mongoose');
require('dotenv').config();
const logger = require('../utils/logger');

const conectarDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('✅ Conectado a MongoDB correctamente!');
  } catch (error) {
    logger.error('❌ Error al conectar a MongoDB: ' + error.message);
    process.exit(1);
  }
};

module.exports = conectarDB;
