import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User';
import {
  register,
  login,
  googleLogin,
  getAllUsers,
  getUserById,
  updateUser,
  searchUsersByLearningSkill,
} from '../controllers/user.controller';

// Mock external dependencies
jest.mock('google-auth-library');
jest.mock('axios');

// Create Express app for testing
const app = express();
app.use(express.json());

// Mock environment variables
process.env.JWT_SECRET = 'test-secret-key';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';

describe('User Controller', () => {
  let mockUser: any;
  let mockToken: string;

  beforeEach(async () => {
    // Clear database
    await User.deleteMany({});

    // Create mock user
    const hashedPassword = await bcrypt.hash('password123', 10);
    mockUser = await User.create({
      uid: 'test@example.com',
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword,
      oauthProvider: null,
      points: 500,
      hasReceivedFreePoints: true,
    });

    mockToken = jwt.sign(
      { id: mockUser._id, email: mockUser.email, name: mockUser.name },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
  });

  describe('POST /register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/register')
        .send(userData)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.name).toBe(userData.name);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.password).toBeUndefined(); // Password should not be returned
    });

    it('should return error if user already exists', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'User already exists');
    });

    it('should return error for invalid data', async () => {
      const userData = {
        name: '',
        email: 'invalid-email',
        password: '',
      };

      const response = await request(app)
        .post('/register')
        .send(userData)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /login', () => {
    it('should login user with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(loginData.email);
    });

    it('should return error for invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const response = await request(app)
        .post('/login')
        .send(loginData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should return error for non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/login')
        .send(loginData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should give free points on first login', async () => {
      // Create user without free points
      const hashedPassword = await bcrypt.hash('password123', 10);
      const newUser = await User.create({
        uid: 'newuser@example.com',
        name: 'New User',
        email: 'newuser@example.com',
        password: hashedPassword,
        oauthProvider: null,
        points: 0,
        hasReceivedFreePoints: false,
      });

      const loginData = {
        email: 'newuser@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/login')
        .send(loginData)
        .expect(200);

      expect(response.body.user.points).toBe(500);
      expect(response.body.user.hasReceivedFreePoints).toBe(true);
    });
  });

  describe('POST /google-login', () => {
    it('should handle Google login for new user', async () => {
      const { OAuth2Client } = require('google-auth-library');
      const mockVerifyIdToken = jest.fn().mockResolvedValue({
        getPayload: () => ({
          sub: 'google123',
          email: 'google@example.com',
          name: 'Google User',
          picture: 'https://example.com/photo.jpg',
        }),
      });

      OAuth2Client.mockImplementation(() => ({
        verifyIdToken: mockVerifyIdToken,
      }));

      const googleData = {
        idToken: 'mock-google-token',
      };

      const response = await request(app)
        .post('/google-login')
        .send(googleData)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('google@example.com');
      expect(response.body.user.oauthProvider).toBe('google');
    });

    it('should handle Google login for existing user', async () => {
      // Create existing Google user
      await User.create({
        uid: 'google123',
        name: 'Google User',
        email: 'google@example.com',
        photoURL: 'https://example.com/photo.jpg',
        oauthProvider: 'google',
        points: 500,
        hasReceivedFreePoints: true,
      });

      const { OAuth2Client } = require('google-auth-library');
      const mockVerifyIdToken = jest.fn().mockResolvedValue({
        getPayload: () => ({
          sub: 'google123',
          email: 'google@example.com',
          name: 'Google User',
          picture: 'https://example.com/photo.jpg',
        }),
      });

      OAuth2Client.mockImplementation(() => ({
        verifyIdToken: mockVerifyIdToken,
      }));

      const googleData = {
        idToken: 'mock-google-token',
      };

      const response = await request(app)
        .post('/google-login')
        .send(googleData)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
    });
  });

  describe('GET /users', () => {
    it('should get all users', async () => {
      // Create additional users
      await User.create({
        uid: 'user2@example.com',
        name: 'User 2',
        email: 'user2@example.com',
        oauthProvider: null,
        points: 500,
        hasReceivedFreePoints: true,
      });

      const response = await request(app)
        .get('/users')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });
  });

  describe('GET /users/:id', () => {
    it('should get user by valid ID', async () => {
      const response = await request(app)
        .get(`/users/${mockUser._id}`)
        .expect(200);

      expect(response.body).toHaveProperty('_id', mockUser._id.toString());
      expect(response.body).toHaveProperty('name', mockUser.name);
      expect(response.body).toHaveProperty('email', mockUser.email);
    });

    it('should return error for invalid user ID', async () => {
      const response = await request(app)
        .get('/users/invalid-id')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid user ID');
    });

    it('should return error for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/users/${fakeId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'User not found');
    });
  });

  describe('PUT /users/:id', () => {
    it('should update user successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        points: 1000,
      };

      const response = await request(app)
        .put(`/users/${mockUser._id}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('name', updateData.name);
      expect(response.body).toHaveProperty('points', updateData.points);
    });

    it('should return error for invalid user ID', async () => {
      const response = await request(app)
        .put('/users/invalid-id')
        .send({ name: 'Updated Name' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid user ID');
    });

    it('should return error for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/users/${fakeId}`)
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body).toHaveProperty('error', 'User not found');
    });
  });

  describe('GET /users/search/by-skill', () => {
    it('should search users by skill ID', async () => {
      const skillId = new mongoose.Types.ObjectId();
      
      // Create user with skill to learn
      await User.create({
        uid: 'learner@example.com',
        name: 'Skill Learner',
        email: 'learner@example.com',
        skillsToLearn: [skillId],
        oauthProvider: null,
        points: 500,
        hasReceivedFreePoints: true,
      });

      const response = await request(app)
        .get(`/users/search/by-skill?skillId=${skillId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].email).toBe('learner@example.com');
    });

    it('should return error for missing skillId parameter', async () => {
      const response = await request(app)
        .get('/users/search/by-skill')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'skillId query parameter is required');
    });

    it('should return empty array for non-existent skill', async () => {
      const fakeSkillId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/users/search/by-skill?skillId=${fakeSkillId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });
}); 