import express, { RequestHandler } from 'express';
import {
  createSkill,
  getAllSkills,
  getSkillById,
  updateSkill,
  deleteSkill,
} from '../controllers/skill.controller';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// 🔒 All skill routes require authentication
router.post('/', authenticateToken, createSkill as RequestHandler);
router.get('/', authenticateToken, getAllSkills as RequestHandler);
router.get('/:id', authenticateToken, getSkillById as RequestHandler);
router.put('/:id', authenticateToken, updateSkill as RequestHandler);
router.delete('/:id', authenticateToken, deleteSkill as RequestHandler);

export default router;
