import { Request, Response } from 'express';
import { Skill } from '../models/Skill';

// @desc    Create a new skill
// @route   POST /api/skills
export const createSkill = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Skill name is required' });
    }

    const existingSkill = await Skill.findOne({ name: name.trim() });
    if (existingSkill) {
      return res.status(400).json({ error: 'Skill already exists' });
    }

    const skill = await Skill.create({ name: name.trim() });
    res.status(201).json(skill);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Get all skills
// @route   GET /api/skills
export const getAllSkills = async (req: Request, res: Response) => {
  try {
    const skills = await Skill.find().sort({ name: 1 });
    res.json(skills);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Get a skill by ID
// @route   GET /api/skills/:id
export const getSkillById = async (req: Request, res: Response) => {
  try {
    const skill = await Skill.findById(req.params.id);
    if (!skill) return res.status(404).json({ error: 'Skill not found' });

    res.json(skill);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Update a skill by ID
// @route   PUT /api/skills/:id
export const updateSkill = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Skill name is required' });
    }

    const skill = await Skill.findByIdAndUpdate(
      req.params.id,
      { name: name.trim() },
      { new: true }
    );

    if (!skill) return res.status(404).json({ error: 'Skill not found' });

    res.json(skill);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Delete a skill by ID
// @route   DELETE /api/skills/:id
export const deleteSkill = async (req: Request, res: Response) => {
  try {
    const skill = await Skill.findByIdAndDelete(req.params.id);
    if (!skill) return res.status(404).json({ error: 'Skill not found' });

    res.json({ message: 'Skill deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
