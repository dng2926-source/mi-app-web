// test/controllers/userController.test.js - Tests correctamente configurados
const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');

// Mock de logger ANTES de requerir el controlador
jest.mock('../../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Mock de User model
jest.mock('../../models/User');

// Mock de tokenManager
jest.mock('../../utils/tokenManager', () => ({
  generateAccessToken: jest.fn(() => 'mock_access_token'),
  generateRefreshToken: jest.fn(() => 'mock_refresh_token'),
  refreshAccessToken: jest.fn()
}));

const userController = require('../../controllers/userController');
const User = require('../../models/User');
const { generateAccessToken, generateRefreshToken } = require('../../utils/tokenManager');

describe('User Controller', () => {
  let app;

  beforeEach(() => {
    // Crear app para cada test
    app = express();
    app.use(express.json());
    
    // Rutas sin validación para tests (la validación se testea por separado)
    app.post('/register', userController.registerUser);
    app.post('/login', userController.loginUser);

    // Limpiar mocks
    jest.clearAllMocks();
    
    // Reset token generators
    generateAccessToken.mockImplementation(() => 'mock_access_token');
    generateRefreshToken.mockImplementation(() => 'mock_refresh_token');
  });

  describe('POST /register', () => {
    it('should register a new user with valid data', async () => {
      // Mock User.findOne para retornar null (usuario no existe)
      User.findOne = jest.fn().mockResolvedValue(null);
      
      // Mock el constructor y save
      const mockUser = {
        _id: '123456789',
        username: 'testuser',
        email: 'test@example.com',
        save: jest.fn().mockResolvedValue({
          _id: '123456789',
          username: 'testuser',
          email: 'test@example.com'
        })
      };

      // Mock el constructor de User
      User.mockImplementation(() => mockUser);

      const res = await request(app)
        .post('/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Test1234'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken', 'mock_access_token');
      expect(res.body).toHaveProperty('refreshToken', 'mock_refresh_token');
      expect(res.body.user.username).toBe('testuser');
      expect(User.findOne).toHaveBeenCalledWith({
        $or: [{ email: 'test@example.com' }, { username: 'testuser' }]
      });
    });

    it('should reject if user already exists', async () => {
      // Mock User.findOne para retornar un usuario existente
      User.findOne = jest.fn().mockResolvedValue({
        email: 'test@example.com',
        username: 'testuser'
      });

      const res = await request(app)
        .post('/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Test1234'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('ya registrado');
    });

    it('should handle database errors gracefully', async () => {
      // Mock User.findOne para lanzar error
      User.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Test1234'
        });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Error al registrar usuario');
    });
  });

  describe('POST /login', () => {
    it('should login user with valid credentials', async () => {
      // Mock bcrypt.compare para retornar true
      bcrypt.compare = jest.fn().mockResolvedValue(true);

      // Mock User.findOne para retornar un usuario válido
      User.findOne = jest.fn().mockResolvedValue({
        _id: '123456789',
        username: 'testuser',
        email: 'test@example.com',
        password: '$2a$10$mocked.hashed.password'
      });

      const res = await request(app)
        .post('/login')
        .send({
          email: 'test@example.com',
          password: 'Test1234'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken', 'mock_access_token');
      expect(res.body).toHaveProperty('refreshToken', 'mock_refresh_token');
      expect(res.body.user.username).toBe('testuser');
      expect(bcrypt.compare).toHaveBeenCalledWith('Test1234', '$2a$10$mocked.hashed.password');
    });

    it('should reject with invalid email', async () => {
      // Mock User.findOne para retornar null (usuario no existe)
      User.findOne = jest.fn().mockResolvedValue(null);

      const res = await request(app)
        .post('/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test1234'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('inválidas');
    });

    it('should reject with invalid password', async () => {
      // Mock bcrypt.compare para retornar false
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      // Mock User.findOne para retornar un usuario válido
      User.findOne = jest.fn().mockResolvedValue({
        _id: '123456789',
        username: 'testuser',
        email: 'test@example.com',
        password: '$2a$10$mocked.hashed.password'
      });

      const res = await request(app)
        .post('/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('inválidas');
    });

    it('should handle database errors gracefully', async () => {
      // Mock User.findOne para lanzar error
      User.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/login')
        .send({
          email: 'test@example.com',
          password: 'Test1234'
        });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Error en el servidor');
    });
  });
});
