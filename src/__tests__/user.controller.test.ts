import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User';
import userRoutes from '../routes/user.routes';

// Mock external dependencies
jest.mock('google-auth-library');
jest.mock('axios');

// Create Express app for testing
const app = express();
app.use(express.json());

// Mount user routes
app.use('/api/users', userRoutes);

// Mock environment variables
process.env.JWT_SECRET = 'test-secret-key';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';

describe('User Controller', () => {
  let mockUser: any;
  let mockToken: string;

  beforeEach(async () => {
    // Create mock user
    const hashedPassword = await bcrypt.hash('password123', 10);
    mockUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword,
      oauthProvider: null,
      skillsToTeach: [],
      skillsToLearn: [],
      points: 500,
      hasReceivedFreePoints: true,
    });

    mockToken = jwt.sign(
      { id: mockUser._id, email: mockUser.email, name: mockUser.name },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
  });

  describe('POST /api/users/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/users/register')
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
        .post('/api/users/register')
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
        .post('/api/users/register')
        .send(userData)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/users/login', () => {
    it('should login user with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/users/login')
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
        .post('/api/users/login')
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
        .post('/api/users/login')
        .send(loginData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });
  });

  describe('GET /api/users', () => {
    it('should get all users', async () => {
      // Create additional users
      await User.create({
        name: 'User 1',
        email: 'user1@example.com',
        password: await bcrypt.hash('password123', 10),
        oauthProvider: null,
        skillsToTeach: [],
        skillsToLearn: [],
        points: 500,
        hasReceivedFreePoints: true,
      });

      await User.create({
        name: 'User 2',
        email: 'user2@example.com',
        password: await bcrypt.hash('password123', 10),
        oauthProvider: null,
        skillsToTeach: [],
        skillsToLearn: [],
        points: 500,
        hasReceivedFreePoints: true,
      });

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3); // Including mockUser
    });

    it('should return error without authentication', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access token required');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by valid ID', async () => {
      const response = await request(app)
        .get(`/api/users/${mockUser._id}`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('_id', mockUser._id.toString());
      expect(response.body).toHaveProperty('name', mockUser.name);
      expect(response.body).toHaveProperty('email', mockUser.email);
    });

    it('should return error for invalid user ID', async () => {
      const response = await request(app)
        .get('/api/users/invalid-id')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid user ID');
    });

    it('should return error for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'User not found');
    });

    it('should return error without authentication', async () => {
      const response = await request(app)
        .get(`/api/users/${mockUser._id}`)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access token required');
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        points: 1000,
      };

      const response = await request(app)
        .put(`/api/users/${mockUser._id}`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('name', updateData.name);
      expect(response.body).toHaveProperty('points', updateData.points);
    });

    it('should return error for invalid user ID', async () => {
      const updateData = {
        name: 'Updated Name',
      };

      const response = await request(app)
        .put('/api/users/invalid-id')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid user ID');
    });

    it('should return error for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const updateData = {
        name: 'Updated Name',
      };

      const response = await request(app)
        .put(`/api/users/${fakeId}`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'User not found');
    });

    it('should return error without authentication', async () => {
      const updateData = {
        name: 'Updated Name',
      };

      const response = await request(app)
        .put(`/api/users/${mockUser._id}`)
        .send(updateData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access token required');
    });
  });

  describe('GET /api/users/search/by-skill', () => {
    it('should search users by skill ID', async () => {
      const { Skill } = require('../models/Skill');
      const skill = await Skill.create({ name: 'JavaScript' });

      // Update mockUser to learn this skill
      await User.findByIdAndUpdate(mockUser._id, {
        skillsToLearn: [skill._id]
      });

      const response = await request(app)
        .get(`/api/users/search/by-skill?skillId=${skill._id}`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].email).toBe(mockUser.email);
    });

    it('should return error for missing skillId parameter', async () => {
      const response = await request(app)
        .get('/api/users/search/by-skill')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'skillId query parameter is required');
    });

    it('should return empty array for non-existent skill', async () => {
      const fakeSkillId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/users/search/by-skill?skillId=${fakeSkillId}`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should return error without authentication', async () => {
      const { Skill } = require('../models/Skill');
      const skill = await Skill.create({ name: 'JavaScript' });

      const response = await request(app)
        .get(`/api/users/search/by-skill?skillId=${skill._id}`)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access token required');
    });
  });
}); 