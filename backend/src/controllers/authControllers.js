import bcrypt from "bcryptjs";
import { User } from "../models/schema.js";

export const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already registered" });

    // const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password,
    });

    res.status(201).json({ _id: user._id });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid email" });
    // const match = await bcrypt.compare(password, user.password);
    if (password != user.password)
      return res.status(400).json({ message: "Incorrect password" });
    res.status(200).json({ _id: user._id });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
