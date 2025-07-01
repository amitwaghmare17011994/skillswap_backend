import mongoose, { Document, Schema } from "mongoose";

import { v4 as uuidv4 } from "uuid";

// User Type Interface
export interface IUser extends Document {
  uid: string;
  name: string;
  email: string;
  password?: string;
  photoURL?: string;
  skillsToTeach: mongoose.Types.ObjectId[];
  skillsToLearn: mongoose.Types.ObjectId[];
  points: number;
  hasReceivedFreePoints: boolean;
  oauthProvider?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// User Schema
const userSchema: Schema<IUser> = new mongoose.Schema(
  {
    uid: {
      type: String,
      required: true,
      unique: true,
      default: () => uuidv4(),
      validate: {
        validator: function (v: string) {
          // UUID v4 validation regex
          const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          return uuidRegex.test(v);
        },
        message: "UID must be a valid UUID v4",
      },
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: function (this: IUser) {
        return !this.oauthProvider;
      },
    },
    photoURL: {
      type: String,
      default:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcToK4qEfbnd-RN82wdL2awn_PMviy_pelocqQ",
    },
    skillsToTeach: [
      {
        type: String,
        // type: mongoose.Schema.Types.ObjectId,
        // ref: 'Skill',
      },
    ],
    skillsToLearn: [
      {
        type: String,

        // type: mongoose.Schema.Types.ObjectId,
        // ref: 'Skill',
      },
    ],
    points: {
      type: Number,
      default: 0,
    },
    hasReceivedFreePoints: {
      type: Boolean,
      default: false,
    },
    oauthProvider: {
      type: String,
      default: null,
      enum: [null, "google", "facebook", "linkedin"],
    },
  },
  { timestamps: true }
);

// Pre-save middleware to ensure uid is set
userSchema.pre("save", function (next) {
  if (!this.uid) {
    this.uid = uuidv4();
  }
  next();
});

export const User = mongoose.model<IUser>("User", userSchema);
