import mongoose, { Schema, Document } from 'mongoose';

export interface ISkill extends Document {
  name: string;
}

const skillSchema: Schema<ISkill> = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  { timestamps: true }
);

export const Skill = mongoose.model<ISkill>('Skill', skillSchema);
