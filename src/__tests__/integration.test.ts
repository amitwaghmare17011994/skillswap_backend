import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import userRoutes from '../routes/user.routes';
import skillRoutes from '../routes/skill.routes';
import chatRoutes from '../routes/chat.routes';
import { User } from '../models/User';
import { Skill } from '../models/Skill';

// Create Express app for testing
const app = express();
app.use(express.json());

// Mount routes
app.use('/api/users', userRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/chat', chatRoutes);

// Mock environment variables
process.env.JWT_SECRET = 'test-secret-key';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';

// Helper function to generate test token
const generateTestToken = (userId: string) => {
  return jwt.sign(
    { id: userId, email: 'test@example.com', name: 'Test User' },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );
};

describe('API Integration Tests', () => {
  let testToken: string;
  let testUserId: string;

  beforeEach(async () => {
    // Create a test user and generate token
    const hashedPassword = await require('bcryptjs').hash('password123', 10);
    const testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword,
      oauthProvider: null,
      skillsToTeach: [],
      skillsToLearn: [],
      points: 0,
      hasReceivedFreePoints: false,
    });
    
    testUserId = (testUser as any)._id.toString();
    testToken = generateTestToken(testUserId);
  });

  describe('User API Endpoints', () => {
    it('should register a new user via API', async () => {
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
    });

    it('should login user via API', async () => {
      // First register a user
      const userData = {
        name: 'Login User',
        email: 'login@example.com',
        password: 'password123',
      };

      await request(app)
        .post('/api/users/register')
        .send(userData);

      // Then login
      const loginData = {
        email: 'login@example.com',
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

    it('should get all users via API', async () => {
      // Create some users
      await User.create({
        name: 'User 1',
        email: 'user1@example.com',
        password: await require('bcryptjs').hash('password123', 10),
        oauthProvider: null,
        skillsToTeach: [],
        skillsToLearn: [],
        points: 500,
        hasReceivedFreePoints: true,
      });

      await User.create({
        name: 'User 2',
        email: 'user2@example.com',
        password: await require('bcryptjs').hash('password123', 10),
        oauthProvider: null,
        skillsToTeach: [],
        skillsToLearn: [],
        points: 500,
        hasReceivedFreePoints: true,
      });

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3); // Including the test user
    });

    it('should get user by ID via API', async () => {
      const user = await User.create({
        name: 'Get User',
        email: 'getuser@example.com',
        password: await require('bcryptjs').hash('password123', 10),
        oauthProvider: null,
        skillsToTeach: [],
        skillsToLearn: [],
        points: 500,
        hasReceivedFreePoints: true,
      }) as any;

      const response = await request(app)
        .get(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('_id', user._id.toString());
      expect(response.body).toHaveProperty('name', user.name);
      expect(response.body).toHaveProperty('email', user.email);
    });

    it('should update user via API', async () => {
      const user = await User.create({
        name: 'Update User',
        email: 'updateuser@example.com',
        password: await require('bcryptjs').hash('password123', 10),
        oauthProvider: null,
        skillsToTeach: [],
        skillsToLearn: [],
        points: 500,
        hasReceivedFreePoints: true,
      });

      const updateData = {
        name: 'Updated Name',
        points: 1000,
      };

      const response = await request(app)
        .put(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('name', updateData.name);
      expect(response.body).toHaveProperty('points', updateData.points);
    });

    it('should search users by skill via API', async () => {
      const skill = await Skill.create({ name: 'JavaScript' });
      
      const user = await User.create({
        name: 'Skill User',
        email: 'skilluser@example.com',
        password: await require('bcryptjs').hash('password123', 10),
        skillsToLearn: [skill._id],
        oauthProvider: null,
        skillsToTeach: [],
        points: 500,
        hasReceivedFreePoints: true,
      });

      const response = await request(app)
        .get(`/api/users/search/by-skill?skillId=${skill._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].email).toBe(user.email);
    });
  });

  describe('Skill API Endpoints', () => {
    it('should create a new skill via API', async () => {
      const skillData = {
        name: 'Python',
      };

      const response = await request(app)
        .post('/api/skills')
        .set('Authorization', `Bearer ${testToken}`)
        .send(skillData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('name', skillData.name);
    });

    it('should get all skills via API', async () => {
      // Create some skills
      await Skill.create({ name: 'JavaScript' });
      await Skill.create({ name: 'Python' });
      await Skill.create({ name: 'React' });

      const response = await request(app)
        .get('/api/skills')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);
    });

    it('should get skill by ID via API', async () => {
      const skill = await Skill.create({ name: 'JavaScript' }) as any;

      const response = await request(app)
        .get(`/api/skills/${skill._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('_id', skill._id.toString());
      expect(response.body).toHaveProperty('name', skill.name);
    });

    it('should update skill via API', async () => {
      const skill = await Skill.create({ name: 'JavaScript' });

      const updateData = {
        name: 'Updated JavaScript',
      };

      const response = await request(app)
        .put(`/api/skills/${skill._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('name', updateData.name);
    });

    it('should delete skill via API', async () => {
      const skill = await Skill.create({ name: 'JavaScript' });

      const response = await request(app)
        .delete(`/api/skills/${skill._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Skill deleted');

      // Verify skill is actually deleted
      const deletedSkill = await Skill.findById(skill._id);
      expect(deletedSkill).toBeNull();
    });
  });

  describe('Chat API Endpoints', () => {
    let otherUserId: string;
    let otherUserToken: string;

    beforeEach(async () => {
      // Create another user to chat with
      const hashedPassword = await require('bcryptjs').hash('password123', 10);
      const otherUser = await User.create({
        name: 'Other User',
        email: 'otheruser@example.com',
        password: hashedPassword,
        oauthProvider: null,
        skillsToTeach: [],
        skillsToLearn: [],
        points: 0,
        hasReceivedFreePoints: false,
      });
      otherUserId = (otherUser as any)._id.toString();
      otherUserToken = generateTestToken(otherUserId);
    });

    it('should send a message via API', async () => {
      const messageData = {
        recipientId: otherUserId,
        content: 'Hello, this is a test message!'
      };

      const response = await request(app)
        .post('/api/chat/send')
        .set('Authorization', `Bearer ${testToken}`)
        .send(messageData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('sender', testUserId);
      expect(response.body).toHaveProperty('recipient', otherUserId);
      expect(response.body).toHaveProperty('content', messageData.content);
    });

    it('should get messages between two users via API', async () => {
      // Send a message first
      await request(app)
        .post('/api/chat/send')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ recipientId: otherUserId, content: 'Hello, this is a test message!' });

      const response = await request(app)
        .get(`/api/chat/${otherUserId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('sender');
      expect(response.body[0]).toHaveProperty('recipient');
      expect(response.body[0]).toHaveProperty('content');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid user ID format', async () => {
      const response = await request(app)
        .get('/api/users/invalid-id')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid user ID');
    });

    it('should handle invalid skill ID format', async () => {
      const response = await request(app)
        .get('/api/skills/invalid-id')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle missing skillId parameter', async () => {
      const response = await request(app)
        .get('/api/users/search/by-skill')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'skillId query parameter is required');
    });

    it('should handle duplicate skill creation', async () => {
      await Skill.create({ name: 'JavaScript' });

      const skillData = {
        name: 'JavaScript',
      };

      const response = await request(app)
        .post('/api/skills')
        .set('Authorization', `Bearer ${testToken}`)
        .send(skillData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Skill already exists');
    });

    it('should handle empty skill name', async () => {
      const skillData = {
        name: '',
      };

      const response = await request(app)
        .post('/api/skills')
        .set('Authorization', `Bearer ${testToken}`)
        .send(skillData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Skill name is required');
    });
  });

  describe('Data Validation', () => {
    it('should trim whitespace from skill names', async () => {
      const skillData = {
        name: '  React  ',
      };

      const response = await request(app)
        .post('/api/skills')
        .set('Authorization', `Bearer ${testToken}`)
        .send(skillData)
        .expect(201);

      expect(response.body).toHaveProperty('name', 'React');
    });

    it('should handle special characters in skill names', async () => {
      const skillData = {
        name: 'C++ Programming',
      };

      const response = await request(app)
        .post('/api/skills')
        .set('Authorization', `Bearer ${testToken}`)
        .send(skillData)
        .expect(201);

      expect(response.body).toHaveProperty('name', 'C++ Programming');
    });

    it('should handle very long skill names', async () => {
      const longName = 'A'.repeat(100);
      const skillData = {
        name: longName,
      };

      const response = await request(app)
        .post('/api/skills')
        .set('Authorization', `Bearer ${testToken}`)
        .send(skillData)
        .expect(201);

      expect(response.body).toHaveProperty('name', longName);
    });
  });
}); 