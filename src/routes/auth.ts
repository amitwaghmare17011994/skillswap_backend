import { User } from "../models/User";
import express from "express";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

router.post("/google", async (req, res) => {
  let { uid, name, email, photo } = req.body;

  try {
    // Check if user already exists by email
    let user = await User.findOne({ email });

    // If not found, create a new user
    if (!user) {
      uid = uid || uuidv4(); // generate uid if not provided
      user = new User({ uid, name, email, photo });
      await user.save();
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Auth error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
