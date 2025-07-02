import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { Skill } from '../models/Skill';
import skillRoutes from '../routes/skill.routes';
import { authenticateToken } from '../middleware/auth';

// Create Express app for testing
const app = express();
app.use(express.json());

// Mount skill routes
app.use('/api/skills', skillRoutes);

// Mock authentication middleware for testing
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => next(),
}));

describe('Skill Controller', () => {
  let mockSkill: any;

  beforeEach(async () => {
    // Create mock skill
    mockSkill = await Skill.create({
      name: 'JavaScript',
    });
  });

  describe('POST /api/skills', () => {
    it('should create a new skill successfully', async () => {
      const skillData = {
        name: 'Python',
      };

      const response = await request(app)
        .post('/api/skills')
        .send(skillData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('name', skillData.name);
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should return error for empty skill name', async () => {
      const skillData = {
        name: '',
      };

      const response = await request(app)
        .post('/api/skills')
        .send(skillData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Skill name is required');
    });

    it('should return error for whitespace-only skill name', async () => {
      const skillData = {
        name: '   ',
      };

      const response = await request(app)
        .post('/api/skills')
        .send(skillData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Skill name is required');
    });

    it('should return error for missing skill name', async () => {
      const skillData = {};

      const response = await request(app)
        .post('/api/skills')
        .send(skillData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Skill name is required');
    });

    it('should return error for duplicate skill name', async () => {
      const skillData = {
        name: 'JavaScript',
      };

      const response = await request(app)
        .post('/api/skills')
        .send(skillData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Skill already exists');
    });

    it('should trim whitespace from skill name', async () => {
      const skillData = {
        name: '  React  ',
      };

      const response = await request(app)
        .post('/api/skills')
        .send(skillData)
        .expect(201);

      expect(response.body).toHaveProperty('name', 'React');
    });

    it('should handle server error gracefully', async () => {
      // Mock Skill.create to throw an error
      jest.spyOn(Skill, 'create').mockRejectedValueOnce(new Error('Database error'));

      const skillData = {
        name: 'Test Skill',
      };

      const response = await request(app)
        .post('/api/skills')
        .send(skillData)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Database error');
    });
  });

  describe('GET /api/skills', () => {
    it('should get all skills sorted by name', async () => {
      // Create additional skills
      await Skill.create({ name: 'Python' });
      await Skill.create({ name: 'React' });
      await Skill.create({ name: 'Angular' });

      const response = await request(app)
        .get('/api/skills')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(4);
      
      // Check if sorted alphabetically
      const skillNames = response.body.map((skill: any) => skill.name);
      expect(skillNames).toEqual(['Angular', 'JavaScript', 'Python', 'React']);
    });

    it('should return empty array when no skills exist', async () => {
      await Skill.deleteMany({});

      const response = await request(app)
        .get('/api/skills')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should handle server error gracefully', async () => {
      // Mock Skill.find to throw an error
      jest.spyOn(Skill, 'find').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/skills')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Database error');
    });
  });

  describe('GET /api/skills/:id', () => {
    it('should get skill by valid ID', async () => {
      const response = await request(app)
        .get(`/api/skills/${mockSkill._id}`)
        .expect(200);

      expect(response.body).toHaveProperty('_id', mockSkill._id.toString());
      expect(response.body).toHaveProperty('name', mockSkill.name);
    });

    it('should return error for invalid skill ID', async () => {
      const response = await request(app)
        .get('/api/skills/invalid-id')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should return error for non-existent skill', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/skills/${fakeId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Skill not found');
    });

    it('should handle server error gracefully', async () => {
      // Mock Skill.findById to throw an error
      jest.spyOn(Skill, 'findById').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get(`/api/skills/${mockSkill._id}`)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Database error');
    });
  });

  describe('PUT /api/skills/:id', () => {
    it('should update skill successfully', async () => {
      const updateData = {
        name: 'Updated JavaScript',
      };

      const response = await request(app)
        .put(`/api/skills/${mockSkill._id}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('_id', mockSkill._id.toString());
      expect(response.body).toHaveProperty('name', updateData.name);
    });

    it('should return error for empty skill name', async () => {
      const updateData = {
        name: '',
      };

      const response = await request(app)
        .put(`/api/skills/${mockSkill._id}`)
        .send(updateData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Skill name is required');
    });

    it('should return error for whitespace-only skill name', async () => {
      const updateData = {
        name: '   ',
      };

      const response = await request(app)
        .put(`/api/skills/${mockSkill._id}`)
        .send(updateData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Skill name is required');
    });

    it('should return error for missing skill name', async () => {
      const updateData = {};

      const response = await request(app)
        .put(`/api/skills/${mockSkill._id}`)
        .send(updateData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Skill name is required');
    });

    it('should return error for invalid skill ID', async () => {
      const updateData = {
        name: 'Updated Name',
      };

      const response = await request(app)
        .put('/api/skills/invalid-id')
        .send(updateData)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should return error for non-existent skill', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const updateData = {
        name: 'Updated Name',
      };

      const response = await request(app)
        .put(`/api/skills/${fakeId}`)
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Skill not found');
    });

    it('should trim whitespace from skill name', async () => {
      const updateData = {
        name: '  Updated React  ',
      };

      const response = await request(app)
        .put(`/api/skills/${mockSkill._id}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('name', 'Updated React');
    });

    it('should handle server error gracefully', async () => {
      // Mock Skill.findByIdAndUpdate to throw an error
      jest.spyOn(Skill, 'findByIdAndUpdate').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const updateData = {
        name: 'Updated Name',
      };

      const response = await request(app)
        .put(`/api/skills/${mockSkill._id}`)
        .send(updateData)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Database error');
    });
  });

  describe('DELETE /api/skills/:id', () => {
    it('should delete skill successfully', async () => {
      const response = await request(app)
        .delete(`/api/skills/${mockSkill._id}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Skill deleted');

      // Verify skill is actually deleted
      const deletedSkill = await Skill.findById(mockSkill._id);
      expect(deletedSkill).toBeNull();
    });

    it('should return error for invalid skill ID', async () => {
      const response = await request(app)
        .delete('/api/skills/invalid-id')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should return error for non-existent skill', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/skills/${fakeId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Skill not found');
    });

    it('should handle server error gracefully', async () => {
      // Mock Skill.findByIdAndDelete to throw an error
      jest.spyOn(Skill, 'findByIdAndDelete').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .delete(`/api/skills/${mockSkill._id}`)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Database error');
    });
  });

  describe('Skill Name Validation', () => {
    it('should handle case-insensitive duplicate detection', async () => {
      const skillData = {
        name: 'javascript',
      };

      const response = await request(app)
        .post('/api/skills')
        .send(skillData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Skill already exists');
    });

    it('should handle special characters in skill names', async () => {
      const skillData = {
        name: 'C++ Programming',
      };

      const response = await request(app)
        .post('/api/skills')
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
        .send(skillData)
        .expect(201);

      expect(response.body).toHaveProperty('name', longName);
    });
  });

  describe('Database Operations', () => {
    it('should maintain data integrity across operations', async () => {
      // Create a skill
      const createResponse = await request(app)
        .post('/api/skills')
        .send({ name: 'Test Skill' })
        .expect(201);

      const skillId = createResponse.body._id;

      // Update the skill
      const updateResponse = await request(app)
        .put(`/api/skills/${skillId}`)
        .send({ name: 'Updated Test Skill' })
        .expect(200);

      expect(updateResponse.body.name).toBe('Updated Test Skill');

      // Get the skill
      const getResponse = await request(app)
        .get(`/api/skills/${skillId}`)
        .expect(200);

      expect(getResponse.body.name).toBe('Updated Test Skill');

      // Delete the skill
      await request(app)
        .delete(`/api/skills/${skillId}`)
        .expect(200);

      // Verify it's deleted
      await request(app)
        .get(`/api/skills/${skillId}`)
        .expect(404);
    });
  });
}); 