const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // Not strictly needed here if you use the User.methods.matchPassword, but good for understanding
require('dotenv').config();

// Email format check
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// REGISTER
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email format' });

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email is already registered' });

    const user = new User({ email, password }); // Password will be hashed by the pre('save') hook in User.js
    await user.save();
    res.status(201).json({ message: 'Registration successful' });
  } catch (err) {
    // Log the error for debugging purposes
    console.error("Registration error:", err);
    res.status(500).json({ error: 'Server error' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  try {
    console.log('LOGIN attempt for:', email); // Added for debugging
    const user = await User.findOne({ email });
    if (!user) {
        console.log('User not found:', email); // Added for debugging
        return res.status(404).json({ error: 'Email not registered' });
    }
    console.log('FOUND user:', user.email); // Added for debugging

    // --- THIS IS THE CRITICAL CHANGE ---
    const isMatch = await bcrypt.compare(password, user.password); // Compare hashed password

    if (!isMatch) { // Check the result of bcrypt.compare
        console.log('Password mismatch for user:', email); // Added for debugging
        return res.status(400).json({ error: 'Invalid credentials' });
    }
    // --- END CRITICAL CHANGE ---

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1d' });

    console.log('Login successful for:', email); // Added for debugging
    res.json({ message: 'Login successful', token });
  } catch (err) {
    console.error('LOGIN ERROR:', err); // Use console.error for errors
    res.status(500).json({ error: 'Server error' });
  }
});


// PROTECTED ROUTE (Example)
router.get('/me', require('../middleware/authMiddleware'), (req, res) => {
  res.json({ message: 'Welcome to protected route', user: req.user });
});

module.exports = router;