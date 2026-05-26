// test/controllers/publicationController.test.js
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

// Mock de logger
jest.mock('../../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Mock de Publication model
jest.mock('../../models/Publication');
jest.mock('../../models/User');

const publicationController = require('../../controllers/publicationController');
const Publication = require('../../models/Publication');
const User = require('../../models/User');

describe('Publication Controller', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Middleware mock para auth
    app.use((req, res, next) => {
      req.user = new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'); // Mock user ID as ObjectId
      next();
    });

    app.post('/like/:id', publicationController.likePublication);
    app.post('/comment/:id', publicationController.commentPublication);
    app.delete('/:id', publicationController.deletePublication);

    jest.clearAllMocks();
  });

  describe('POST /like/:id', () => {
    it('should toggle like on publication', async () => {
      const mockPub = {
        _id: new mongoose.Types.ObjectId(),
        likes: [],
        save: jest.fn().mockResolvedValue()
      };

      Publication.findById.mockResolvedValue(mockPub);

      const res = await request(app)
        .post('/like/507f1f77bcf86cd799439011')
        .expect(200);

      expect(mockPub.save).toHaveBeenCalled();
      expect(res.body).toHaveProperty('likes');
      expect(res.body).toHaveProperty('count');
    });

    it('should return 404 if publication not found', async () => {
      Publication.findById.mockResolvedValue(null);

      await request(app)
        .post('/like/507f1f77bcf86cd799439011')
        .expect(404);
    });
  });

  describe('POST /comment/:id', () => {
    it('should add comment to publication', async () => {
      const mockPub = {
        _id: new mongoose.Types.ObjectId(),
        comments: [],
        save: jest.fn().mockResolvedValue()
      };
      const mockUser = { _id: new mongoose.Types.ObjectId(), username: 'testuser' };

      Publication.findById.mockResolvedValue(mockPub);
      User.findById.mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/comment/507f1f77bcf86cd799439011')
        .send({ text: 'Test comment' })
        .expect(200);

      expect(mockPub.save).toHaveBeenCalled();
      expect(res.body).toHaveProperty('comments');
      expect(res.body).toHaveProperty('commentsCount');
    });
  });

  describe('DELETE /:id', () => {
    it('should delete publication if author', async () => {
      const userId = new mongoose.Types.ObjectId();
      const mockPub = {
        _id: new mongoose.Types.ObjectId(),
        author: userId,
        imageUrl: null
      };

      app.use((req, res, next) => {
        req.user = userId;
        next();
      });

      Publication.findById.mockResolvedValue(mockPub);
      Publication.findByIdAndDelete.mockResolvedValue(mockPub);

      await request(app)
        .delete('/507f1f77bcf86cd799439011')
        .expect(200);

      expect(Publication.findByIdAndDelete).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });

    it('should return 403 if not author', async () => {
      const mockPub = {
        _id: new mongoose.Types.ObjectId(),
        author: new mongoose.Types.ObjectId()
      };

      Publication.findById.mockResolvedValue(mockPub);

      await request(app)
        .delete('/507f1f77bcf86cd799439011')
        .expect(403);
    });
  });
});