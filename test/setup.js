// test/setup.js - Configuración inicial para tests
// NO cargar dotenv aquí, déjalo para jest.config.js

// Mock de logger - DEBE mockearse ANTES de importar cualquier módulo que lo use
jest.mock('../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Mock de bcryptjs
jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('mocksalt'),
  hash: jest.fn().mockResolvedValue('$2a$10$mocked.hashed.password'),
  compare: jest.fn()
}));

// Variables de entorno para tests
process.env.JWT_SECRET = 'test_secret_key_minimo_32_caracteres_para_testing';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_key_minimo_32_caracteres_testing';
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://localhost:27017/test';
