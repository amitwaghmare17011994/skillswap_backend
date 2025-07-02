import { Request, Response } from "express";

import { OAuth2Client } from "google-auth-library";
import { User } from "../models/User";
import { Skill } from "../models/Skill";
import axios from "axios";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID as string);

interface JwtPayload {
  id: string;
  email: string;
  name: string;
}

// Helper: Generate JWT Token
const generateToken = (user: any): string => {
  const payload: JwtPayload = {
    id: user._id,
    email: user.email,
    name: user.name,
  };

  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: "7d",
  });
};

// Helper: Get or create a skill by name or return ObjectId if already valid
async function getOrCreateSkill(skill: string) {
  if (mongoose.Types.ObjectId.isValid(skill)) return skill;
  let skillDoc = await Skill.findOne({ name: { $regex: `^${skill.trim()}$`, $options: 'i' } });
  if (!skillDoc) {
    skillDoc = await Skill.create({ name: skill.trim() });
  }
  return skillDoc._id;
}

// 1. Register
export const register = async (req: Request, res: Response) => {
  const { name, email, password, skillsToTeach = [], skillsToLearn = [] } = req.body;

  try {
    if (skillsToTeach && Array.isArray(skillsToTeach) && skillsToTeach.length === 0) {
      return res.status(400).json({ error: 'At least one skill to teach is required.' });
    }
    if (skillsToLearn && Array.isArray(skillsToLearn) && skillsToLearn.length === 0) {
      return res.status(400).json({ error: 'At least one skill to learn is required.' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);

    // Map skills to ObjectIds, creating if needed
    const skillsToTeachIds = await Promise.all(skillsToTeach.map(getOrCreateSkill));
    const skillsToLearnIds = await Promise.all(skillsToLearn.map(getOrCreateSkill));

    const user = await User.create({
      name,
      email,
      password: hashed,
      oauthProvider: null,
      skillsToTeach: skillsToTeachIds,
      skillsToLearn: skillsToLearnIds,
      points: 0,
      hasReceivedFreePoints: false,
    });

    const token = generateToken(user);

    // Exclude password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ token, user: userResponse });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// 2. Login
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || user.oauthProvider)
      return res.status(400).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password!);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = generateToken(user);

    // Exclude password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ token, user: userResponse });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// 3. Google Login
export const googleLogin = async (req: Request, res: Response) => {
  const { name, email, photoURL } = req.body;

  try {
    // const ticket = await googleClient.verifyIdToken({
    //   idToken,
    //   audience: process.env.GOOGLE_CLIENT_ID as string,
    // });

    // const payload = ticket.getPayload();
    // if (!payload) throw new Error("Google token verification failed");

    // const { sub: uid, email, name, picture } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        photoURL,
        oauthProvider: "google",
        skillsToTeach: [],
        skillsToLearn: [],
        points: 0,
        hasReceivedFreePoints: false,
      });
    }

    const token = generateToken(user);

    // Exclude password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ token, user: userResponse });
  } catch (err: any) {
    res.status(400).json({ error: "Google login failed" });
  }
};

// 4. Facebook Login
export const facebookLogin = async (req: Request, res: Response) => {
  const { accessToken, userID } = req.body;

  try {
    const url = `https://graph.facebook.com/v17.0/${userID}?fields=id,name,email,picture.type(large)&access_token=${accessToken}`;
    const { data } = await axios.get(url);

    const email = data.email;
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name: data.name,
        email: data.email,
        photoURL: data.picture?.data?.url,
        oauthProvider: "facebook",
        skillsToTeach: [],
        skillsToLearn: [],
        points: 0,
        hasReceivedFreePoints: false,
      });
    }

    const token = generateToken(user);

    // Exclude password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ token, user: userResponse });
  } catch (err: any) {
    res.status(400).json({ error: "Facebook login failed" });
  }
};

// 5. LinkedIn Login
export const linkedinLogin = async (req: Request, res: Response) => {
  const { code, redirectUri } = req.body;

  try {
    // Step 1: Get access token
    const tokenRes = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      null,
      {
        params: {
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: process.env.LINKEDIN_CLIENT_ID,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        },
      }
    );

    const accessToken = tokenRes.data.access_token;

    // Step 2: Get user profile & email
    const [profileRes, emailRes] = await Promise.all([
      axios.get("https://api.linkedin.com/v2/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      axios.get(
        "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      ),
    ]);

    const name = `${profileRes.data.localizedFirstName} ${profileRes.data.localizedLastName}`;
    const email = emailRes.data.elements[0]["handle~"].emailAddress;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        photoURL: "",
        oauthProvider: "linkedin",
        skillsToTeach: [],
        skillsToLearn: [],
        points: 0,
        hasReceivedFreePoints: false,
      });
    }

    const token = generateToken(user);

    // Exclude password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ token, user: userResponse });
  } catch (err: any) {
    res.status(400).json({ error: "LinkedIn login failed" });
  }
};

// 6. Get All Users
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find()
      .populate("skillsToTeach")
      .populate("skillsToLearn")
      .select("-password")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// 7. Get User By ID
export const getUserById = async (req: Request, res: Response) => {
  try {
    console.log("user id", req.params.id);
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    const user = await User.findById(req.params.id)
      .populate("skillsToTeach")
      .populate("skillsToLearn")
      .select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// 8. Update User
export const updateUser = async (req: Request, res: Response) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const { name, email, photoURL, skillsToTeach, skillsToLearn, points } = req.body;

    if (skillsToTeach && Array.isArray(skillsToTeach) && skillsToTeach.length === 0) {
      return res.status(400).json({ error: 'At least one skill to teach is required.' });
    }
    if (skillsToLearn && Array.isArray(skillsToLearn) && skillsToLearn.length === 0) {
      return res.status(400).json({ error: 'At least one skill to learn is required.' });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (photoURL) updateData.photoURL = photoURL;
    if (skillsToTeach) updateData.skillsToTeach = await Promise.all(skillsToTeach.map(getOrCreateSkill));
    if (skillsToLearn) updateData.skillsToLearn = await Promise.all(skillsToLearn.map(getOrCreateSkill));
    if (points !== undefined) updateData.points = points;

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("skillsToTeach")
      .populate("skillsToLearn")
      .select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// 9. Search Users By Learning Skill
export const searchUsersByLearningSkill = async (
  req: Request,
  res: Response
) => {
  try {
    const { skillId } = req.query;

    if (!skillId) {
      return res
        .status(400)
        .json({ error: "skillId query parameter is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(skillId as string)) {
      return res.status(400).json({ error: "Invalid skill ID" });
    }

    const users = await User.find({
      skillsToLearn: skillId,
    })
      .populate("skillsToTeach")
      .populate("skillsToLearn")
      .select("-password")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// 10. Add Skill to Teach
export const addSkillToTeach = async (req: Request, res: Response) => {
  try {
    let { skillId } = req.body;
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // If skillId is a name, create if needed
    skillId = await getOrCreateSkill(skillId);

    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { skillsToTeach: skillId } },
      { new: true, runValidators: true }
    )
      .populate("skillsToTeach")
      .populate("skillsToLearn")
      .select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// 11. Add Skill to Learn
export const addSkillToLearn = async (req: Request, res: Response) => {
  try {
    let { skillId } = req.body;
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // If skillId is a name, create if needed
    skillId = await getOrCreateSkill(skillId);

    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { skillsToLearn: skillId } },
      { new: true, runValidators: true }
    )
      .populate("skillsToTeach")
      .populate("skillsToLearn")
      .select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// 12. Remove Skill from Teach
export const removeSkillFromTeach = async (req: Request, res: Response) => {
  try {
    const { skillId } = req.params;
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    if (!mongoose.Types.ObjectId.isValid(skillId)) {
      return res.status(400).json({ error: "Invalid skill ID" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { skillsToTeach: skillId } },
      { new: true, runValidators: true }
    )
      .populate("skillsToTeach")
      .populate("skillsToLearn")
      .select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// 13. Remove Skill from Learn
export const removeSkillFromLearn = async (req: Request, res: Response) => {
  try {
    const { skillId } = req.params;
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    if (!mongoose.Types.ObjectId.isValid(skillId)) {
      return res.status(400).json({ error: "Invalid skill ID" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { skillsToLearn: skillId } },
      { new: true, runValidators: true }
    )
      .populate("skillsToTeach")
      .populate("skillsToLearn")
      .select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
