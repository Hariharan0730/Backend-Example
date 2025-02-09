const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

router.post("/reg", async (req, res) => {
    const { name, email, password, role } = req.body;
  
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required!" });
    }
  
    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "User already exists!" });
      }
  
      
      const newUser = new User({ name, email, password  , role });
  
      await newUser.save();
      res.status(201).json({ message: "User registered successfully!" });
    } catch (err) {
      console.error("Signup Error:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  

  router.post("/log", async (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
        return res.status(400).json({ message: "All fields are required!" });
    }

    try {
        const user = await User.findOne({ email, role });

        if (!user) {
            return res.status(401).json({ message: "Invalid email or role!" });
        }

        const isMatch = password === user.password; 

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid password!" });
        }

        const token = jwt.sign({ userId: user._id, role: user.role }, "secret", { expiresIn: "1d" });

        res.json({ token, role: user.role ,userId: user._id});
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


router.get("/prof/:userId", async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select("-password"); 
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    } catch (err) {
        console.error("Error fetching user profile:", err);
        res.status(500).json({ message: "Server error" });
    }
});
  
module.exports = router;
