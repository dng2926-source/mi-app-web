const User = require('../models/User');
const bcrypt = require('bcryptjs');

exports.registerUser = async (req, res) => {
  const { username, password, email } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({ message: 'Username y password son requeridos' });
    }

    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ message: 'El username ya está en uso' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      username: username,
      password: hashedPassword,
      email: email
    });

    await user.save();

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Error en el registro de usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor al registrar usuario' });
  }
};