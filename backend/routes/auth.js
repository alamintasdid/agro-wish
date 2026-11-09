/**
 * agroWish Backend - Authentication and Session Routes
 * SE-331 Software Engineering Design Capstone Project
 * Member 2: Most Tasnim Jahan Rifa (ID: 241-35-116)
 * 
 * SRS Reference:
 * - Section 5: FR-01 (User Registration and Login), FR-02 (RBAC), FR-03 (Profile), FR-07 (Input Validation), FR-31 (Session/Logout)
 * - Section 6: NFR-04 (Security, Bcrypt Salt Rounds = 10, JWT)
 * - Section 7.4: ERD (users, farmer_profiles)
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'agrowish_secret_key_jwt_2026';
const JWT_EXPIRES_IN = '1d'; // 24-hour session expiration as per SRS

// RFC 5322 compliant regex for email validation
const RFC_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Standard Bangladeshi mobile number format
const BD_PHONE_REGEX = /^(?:\+8801|01)[3-9]\d{8}$/;

/**
 * Generates signed JWT token containing id, full_name, email, and role
 */
function generateToken(payload) {
  return jwt.sign(
    {
      id: payload.id,
      user_id: payload.id,
      full_name: payload.full_name,
      name: payload.full_name,
      email: payload.email,
      role: payload.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * POST /api/auth/register
 * FR-01, FR-07, NFR-04: Farmer registration with input validation & bcrypt hashing
 */
router.post('/register', async (req, res) => {
  try {
    const { email, phone, password, role } = req.body;
    // Support both full_name and name
    const full_name = req.body.full_name || req.body.name;

    // 1. Validate presence of full_name, email, phone, password (FR-07)
    if (!full_name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'সকল তথ্য পূরণ করুন (নাম, ইমেইল, মোবাইল নম্বর এবং পাসওয়ার্ড আবশ্যক)। (Bad Request: All fields required)'
      });
    }

    const trimmedName = full_name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.toString().replace(/\s+/g, '');

    if (trimmedName.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'সঠিক পূর্ণ নাম প্রদান করুন। (Full name must be at least 2 characters)'
      });
    }

    // 2. Validate email format using RFC-compliant regex
    if (!RFC_EMAIL_REGEX.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'সঠিক ইমেইল ঠিকানা দিন (RFC মানসম্মত)। (Invalid RFC email format)'
      });
    }

    // 3. Validate Bangladeshi mobile number
    if (!BD_PHONE_REGEX.test(trimmedPhone)) {
      return res.status(400).json({
        success: false,
        message: 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)। (Invalid Bangladeshi phone number)'
      });
    }

    // 4. Enforce password minimum 6 characters (NFR-04)
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে। (Password must be at least 6 characters)'
      });
    }

    // 5. Check users table for duplicate email
    const [existingUsers] = await pool.execute(
      'SELECT user_id FROM users WHERE LOWER(email) = ? LIMIT 1',
      [trimmedEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'এই ইমেইলটি ইতিমধ্যে নিবন্ধিত হয়েছে। (Conflict: Email is already registered)'
      });
    }

    // 6. Hash password using bcryptjs with salt rounds = 10 (NFR-04)
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // 7. Insert new record into users table with default role 'FARMER'
    const assignedRole = (role && role.toUpperCase() === 'ADMIN') ? 'ADMIN' : 'FARMER';

    const [insertResult] = await pool.execute(
      'INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [trimmedName, trimmedEmail, trimmedPhone, password_hash, assignedRole]
    );

    const newUserId = insertResult.insertId;

    // Auto-create initial farmer_profile for farmers (FR-03)
    if (assignedRole === 'FARMER') {
      try {
        await pool.execute(
          'INSERT INTO farmer_profiles (user_id) VALUES (?)',
          [newUserId]
        );
      } catch (profileErr) {
        console.warn(`[Profile Initialization Warning] Deferred profile creation for user ${newUserId}: ${profileErr.message}`);
      }
    }

    const userData = {
      id: newUserId,
      user_id: newUserId,
      full_name: trimmedName,
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      role: assignedRole
    };

    const token = generateToken(userData);

    return res.status(201).json({
      success: true,
      message: 'ব্যবহারকারী সফলভাবে নিবন্ধিত হয়েছে। (User registered successfully)',
      token,
      user: {
        id: userData.id,
        full_name: userData.full_name,
        email: userData.email,
        role: userData.role
      }
    });
  } catch (error) {
    console.error('[Register API Error]', error);
    return res.status(500).json({
      success: false,
      message: 'সার্ভারে অভ্যন্তরীণ ত্রুটি দেখা দিয়েছে। দয়া করে আবার চেষ্টা করুন।',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/auth/login
 * FR-01, NFR-04: User login, bcrypt comparison, and 1-day JWT token issuance
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'ইমেইল এবং পাসওয়ার্ড প্রদান করুন। (Email and password are required)'
      });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // 1. Lookup user by email in users table
    const [rows] = await pool.execute(
      'SELECT user_id, full_name, email, phone, password_hash, role FROM users WHERE LOWER(email) = ? LIMIT 1',
      [trimmedEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'ভুল ইমেইল বা পাসওয়ার্ড। (Invalid email or password)'
      });
    }

    const user = rows[0];

    // 2. Compare input password with bcrypt.compare
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'ভুল ইমেইল বা পাসওয়ার্ড। (Invalid email or password)'
      });
    }

    // 3. Generate a JWT signed token (1d expiration) containing user id, full_name, email, and role
    const payload = {
      id: user.user_id,
      user_id: user.user_id,
      full_name: user.full_name,
      name: user.full_name,
      email: user.email,
      role: user.role
    };

    const token = generateToken(payload);

    // 4. Return token and user object
    return res.status(200).json({
      success: true,
      message: 'লগইন সফল হয়েছে!',
      token,
      user: {
        id: user.user_id,
        full_name: user.full_name,
        name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error('[Login API Error]', error);
    return res.status(500).json({
      success: false,
      message: 'সার্ভারে অভ্যন্তরীণ ত্রুটি দেখা দিয়েছে। দয়া করে আবার চেষ্টা করুন।',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/auth/me
 * FR-01, FR-03: Protected route returning the current authenticated user's details
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;
    const [rows] = await pool.execute(
      `SELECT u.user_id, u.full_name, u.email, u.phone, u.role, u.created_at,
              fp.profile_id, fp.district, fp.upazila, fp.land_size, fp.soil_type,
              fp.water_availability, fp.season, fp.budget, fp.has_pond, fp.pond_size, fp.existing_resources
       FROM users u
       LEFT JOIN farmer_profiles fp ON u.user_id = fp.user_id
       WHERE u.user_id = ?
       LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ব্যবহারকারীর তথ্য খুঁজে পাওয়া যায়নি। (User not found)'
      });
    }

    const userData = rows[0];

    // Safely parse JSON existing_resources if present
    let parsedResources = [];
    if (userData.existing_resources) {
      try {
        parsedResources = typeof userData.existing_resources === 'string'
          ? JSON.parse(userData.existing_resources)
          : userData.existing_resources;
      } catch {
        parsedResources = [];
      }
    }

    return res.status(200).json({
      success: true,
      user: {
        id: userData.user_id,
        user_id: userData.user_id,
        full_name: userData.full_name,
        name: userData.full_name,
        email: userData.email,
        phone: userData.phone,
        role: userData.role,
        created_at: userData.created_at,
        profile: {
          profile_id: userData.profile_id,
          district: userData.district,
          upazila: userData.upazila,
          land_size: userData.land_size ? parseFloat(userData.land_size) : null,
          soil_type: userData.soil_type,
          water_availability: userData.water_availability,
          season: userData.season,
          budget: userData.budget ? parseFloat(userData.budget) : 0,
          has_pond: Boolean(userData.has_pond),
          pond_size: userData.pond_size ? parseFloat(userData.pond_size) : 0,
          existing_resources: parsedResources
        }
      }
    });
  } catch (error) {
    console.error('[Me API Error]', error);
    return res.status(500).json({
      success: false,
      message: 'প্রোফাইল তথ্য লোড করতে সমস্যা হয়েছে।',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/auth/logout
 * FR-31: Logout and Session Handling
 */
router.post('/logout', authenticateToken, (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'সফলভাবে লগআউট সম্পন্ন হয়েছে। (Logged out successfully)'
  });
});

module.exports = router;
