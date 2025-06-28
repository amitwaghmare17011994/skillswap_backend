import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { Skill } from '../models/Skill';
import {
  createSkill,
  getAllSkills,
  getSkillById,
  updateSkill,
  deleteSkill,
} from '../controllers/skill.controller';

// Create Express app for testing
const app = express();
app.use(express.json());

describe('Skill Controller', () => {
  let mockSkill: any;

  beforeEach(async () => {
    // Clear database
    await Skill.deleteMany({});

    // Create mock skill
    mockSkill = await Skill.create({
      name: 'JavaScript',
    });
  });

  describe('POST /skills', () => {
    it('should create a new skill successfully', async () => {
      const skillData = {
        name: 'Python',
      };

      const response = await request(app)
        .post('/skills')
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
        .post('/skills')
        .send(skillData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Skill name is required');
    });

    it('should return error for whitespace-only skill name', async () => {
      const skillData = {
        name: '   ',
      };

      const response = await request(app)
        .post('/skills')
        .send(skillData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Skill name is required');
    });

    it('should return error for missing skill name', async () => {
      const skillData = {};

      const response = await request(app)
        .post('/skills')
        .send(skillData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Skill name is required');
    });

    it('should return error for duplicate skill name', async () => {
      const skillData = {
        name: 'JavaScript',
      };

      const response = await request(app)
        .post('/skills')
        .send(skillData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Skill already exists');
    });

    it('should trim whitespace from skill name', async () => {
      const skillData = {
        name: '  React  ',
      };

      const response = await request(app)
        .post('/skills')
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
        .post('/skills')
        .send(skillData)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Database error');
    });
  });

  describe('GET /skills', () => {
    it('should get all skills sorted by name', async () => {
      // Create additional skills
      await Skill.create({ name: 'Python' });
      await Skill.create({ name: 'React' });
      await Skill.create({ name: 'Angular' });

      const response = await request(app)
        .get('/skills')
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
        .get('/skills')
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
        .get('/skills')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Database error');
    });
  });

  describe('GET /skills/:id', () => {
    it('should get skill by valid ID', async () => {
      const response = await request(app)
        .get(`/skills/${mockSkill._id}`)
        .expect(200);

      expect(response.body).toHaveProperty('_id', mockSkill._id.toString());
      expect(response.body).toHaveProperty('name', mockSkill.name);
    });

    it('should return error for invalid skill ID', async () => {
      const response = await request(app)
        .get('/skills/invalid-id')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should return error for non-existent skill', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/skills/${fakeId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Skill not found');
    });

    it('should handle server error gracefully', async () => {
      // Mock Skill.findById to throw an error
      jest.spyOn(Skill, 'findById').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get(`/skills/${mockSkill._id}`)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Database error');
    });
  });

  describe('PUT /skills/:id', () => {
    it('should update skill successfully', async () => {
      const updateData = {
        name: 'Updated JavaScript',
      };

      const response = await request(app)
        .put(`/skills/${mockSkill._id}`)
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
        .put(`/skills/${mockSkill._id}`)
        .send(updateData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Skill name is required');
    });

    it('should return error for whitespace-only skill name', async () => {
      const updateData = {
        name: '   ',
      };

      const response = await request(app)
        .put(`/skills/${mockSkill._id}`)
        .send(updateData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Skill name is required');
    });

    it('should return error for missing skill name', async () => {
      const updateData = {};

      const response = await request(app)
        .put(`/skills/${mockSkill._id}`)
        .send(updateData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Skill name is required');
    });

    it('should return error for invalid skill ID', async () => {
      const updateData = {
        name: 'Updated Skill',
      };

      const response = await request(app)
        .put('/skills/invalid-id')
        .send(updateData)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should return error for non-existent skill', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const updateData = {
        name: 'Updated Skill',
      };

      const response = await request(app)
        .put(`/skills/${fakeId}`)
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Skill not found');
    });

    it('should trim whitespace from skill name', async () => {
      const updateData = {
        name: '  Updated React  ',
      };

      const response = await request(app)
        .put(`/skills/${mockSkill._id}`)
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
        name: 'Updated Skill',
      };

      const response = await request(app)
        .put(`/skills/${mockSkill._id}`)
        .send(updateData)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Database error');
    });
  });

  describe('DELETE /skills/:id', () => {
    it('should delete skill successfully', async () => {
      const response = await request(app)
        .delete(`/skills/${mockSkill._id}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Skill deleted');

      // Verify skill is actually deleted
      const deletedSkill = await Skill.findById(mockSkill._id);
      expect(deletedSkill).toBeNull();
    });

    it('should return error for invalid skill ID', async () => {
      const response = await request(app)
        .delete('/skills/invalid-id')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should return error for non-existent skill', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/skills/${fakeId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Skill not found');
    });

    it('should handle server error gracefully', async () => {
      // Mock Skill.findByIdAndDelete to throw an error
      jest.spyOn(Skill, 'findByIdAndDelete').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .delete(`/skills/${mockSkill._id}`)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Database error');
    });
  });

  describe('Skill Name Validation', () => {
    it('should handle case-insensitive duplicate detection', async () => {
      // Create skill with different case
      const skillData = {
        name: 'javascript',
      };

      const response = await request(app)
        .post('/skills')
        .send(skillData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Skill already exists');
    });

    it('should handle special characters in skill names', async () => {
      const skillData = {
        name: 'C++ Programming',
      };

      const response = await request(app)
        .post('/skills')
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
        .post('/skills')
        .send(skillData)
        .expect(201);

      expect(response.body).toHaveProperty('name', longName);
    });
  });

  describe('Database Operations', () => {
    it('should maintain data integrity across operations', async () => {
      // Create multiple skills
      const skill1 = await Skill.create({ name: 'Skill 1' });
      const skill2 = await Skill.create({ name: 'Skill 2' });

      // Verify all skills exist
      let allSkills = await Skill.find().sort({ name: 1 });
      expect(allSkills.length).toBe(3); // Including mockSkill

      // Update one skill
      await Skill.findByIdAndUpdate(skill1._id, { name: 'Updated Skill 1' });

      // Delete another skill
      await Skill.findByIdAndDelete(skill2._id);

      // Verify final state
      allSkills = await Skill.find().sort({ name: 1 });
      expect(allSkills.length).toBe(2);
      expect(allSkills[0].name).toBe('JavaScript'); // mockSkill
      expect(allSkills[1].name).toBe('Updated Skill 1');
    });
  });
}); 