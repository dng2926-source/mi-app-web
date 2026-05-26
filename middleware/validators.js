const { body, param, validationResult } = require('express-validator');

// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: 'Errores de validación',
      errors: errors.array().map(e => ({ field: e.param, message: e.msg }))
    });
  }
  next();
};

// Validadores para registro
const validateRegister = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username debe tener entre 3 y 30 caracteres')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username solo puede contener letras, números, guiones y guiones bajos'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Email no válido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Contraseña debe tener mayúsculas, minúsculas y números'),
  handleValidationErrors
];

// Validadores para login
const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Email no válido')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password requerido'),
  handleValidationErrors
];

// Validadores para publicación
const validatePublication = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Contenido debe tener entre 1 y 500 caracteres')
    .escape(),
  handleValidationErrors
];

// Validadores para comentario
const validateComment = [
  body('text')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Comentario debe tener entre 1 y 200 caracteres')
    .escape(),
  handleValidationErrors
];

// Validador para ObjectId
const validateObjectId = [
  param('id')
    .matches(/^[0-9a-fA-F]{24}$/)
    .withMessage('ID no válido'),
  handleValidationErrors
];

module.exports = {
  validateRegister,
  validateLogin,
  validatePublication,
  validateComment,
  validateObjectId,
  handleValidationErrors
};
