const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generar Access Token (corta duración)
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

// Generar Refresh Token (larga duración)
const generateRefreshToken = (userId) => {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET no configurado en variables de entorno');
  }
  return jwt.sign({ id: userId, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '7d'
  });
};

// Verificar y refrescar token
const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token requerido' });
    }

    if (!process.env.JWT_REFRESH_SECRET) {
      return res.status(500).json({ message: 'Configuración de servidor incompleta' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ message: 'Token inválido' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const newAccessToken = generateAccessToken(user._id);
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    console.error('Error al refrescar token:', error);
    res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  refreshAccessToken
};
