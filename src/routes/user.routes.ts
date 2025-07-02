import express, { RequestHandler } from 'express';
import {
  register,
  login,
  googleLogin,
  getAllUsers,
  getUserById,
  updateUser,
  searchUsersByTeachingSkill,
  addSkillToTeach,
  addSkillToLearn,
  removeSkillFromTeach,
  removeSkillFromLearn,
} from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// 🔐 Public Auth routes (no authentication required)
router.post('/register', register as RequestHandler);           // POST /api/users/register
router.post('/login', login as RequestHandler);                 // POST /api/users/login
router.post('/google-login', googleLogin as RequestHandler);    // POST /api/users/google-login

// 📄 Protected User CRUD routes (authentication required)
router.get('/', authenticateToken, getAllUsers as RequestHandler);                 // GET /api/users

// 🔍 Search users by skill to teach (MUST come before /:id routes)
router.get('/search/by-skill', authenticateToken, searchUsersByTeachingSkill as RequestHandler); // GET /api/users/search/by-skill?skillId=<id>

// 📄 Protected User CRUD routes with parameters (MUST come after specific routes)
router.get('/:id', authenticateToken, getUserById as RequestHandler);              // GET /api/users/:id
router.put('/:id', authenticateToken, updateUser as RequestHandler);               // PUT /api/users/:id

// 🎯 Protected Skill management routes
router.post('/:id/skills/teach', authenticateToken, addSkillToTeach as RequestHandler);
router.post('/:id/skills/learn', authenticateToken, addSkillToLearn as RequestHandler);
router.delete('/:id/skills/teach/:skillId', authenticateToken, removeSkillFromTeach as RequestHandler);
router.delete('/:id/skills/learn/:skillId', authenticateToken, removeSkillFromLearn as RequestHandler);

export default router;
