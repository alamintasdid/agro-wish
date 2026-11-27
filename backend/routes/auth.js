/**
 * agroWish Backend - Enhanced Authentication and Session Routes
 * Supports full Bangladeshi farmer authentication (Email or Mobile), DOB, strong password policy,
 * token refresh, and dedicated Admin Login.
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { logAudit } = require('../utils/auditLogger');

const JWT_SECRET = process.env.JWT_SECRET || 'agrowish_secret_key_jwt_2026';
const JWT_EXPIRES_IN = '1d';

// RFC 5322 compliant regex for email validation
const RFC_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Standard Bangladeshi mobile number format (013-019, 11 digits)
const BD_PHONE_REGEX = /^(?:\+8801|01)[3-9]\d{8}$/;

// Common weak passwords to reject
const TRIVIAL_PASSWORDS = new Set(['123456', '12345678', 'password', 'pass123', '000000', '111111', '123123', 'admin123']);

/**
 * Generates signed JWT token containing id, full_name, email, phone, and role
 */
function generateToken(payload) {
  return jwt.sign(
    {
      id: payload.id,
      user_id: payload.id,
      full_name: payload.full_name,
      name: payload.full_name,
      email: payload.email,
      phone: payload.phone,
      role: payload.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Helper to validate DOB (YYYY-MM-DD)
 */
function isValidDob(dobString) {
  if (!dobString) return true; // Optional if not provided
  const parsed = new Date(dobString);
  if (isNaN(parsed.getTime())) return false;
  const now = new Date();
  const ageYears = (now - parsed) / (365.25 * 24 * 60 * 60 * 1000);
  return ageYears >= 12 && ageYears <= 110;
}

/**
 * Helper to validate password policy
 */
function validatePasswordStrength(password, phone, name) {
  if (!password || typeof password !== 'string') {
    return 'পাসওয়ার্ড প্রদান করা আবশ্যক। (Password is required)';
  }
  if (password.length < 6) {
    return 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে। (Password must be at least 6 characters)';
  }
  if (password.length > 100) {
    return 'পাসওয়ার্ড ১০০ অক্ষরের বেশি হতে পারবে না। (Password too long)';
  }
  if (TRIVIAL_PASSWORDS.has(password.toLowerCase())) {
    return 'এই পাসওয়ার্ডটি অত্যন্ত সহজ ও ঝুঁকিপূর্ণ। ভিন্ন এবং শক্তিশালী পাসওয়ার্ড দিন। (Password is too common)';
  }
  if (phone && password === phone.replace(/\s+/g, '')) {
    return 'পাসওয়ার্ড মোবাইল নম্বরের সমান হতে পারবে না। (Password cannot be your phone number)';
  }
  return null;
}

/**
 * POST /api/auth/register
 * Farmer and Admin registration with DOB, Bangladeshi phone, email, and password hashing
 */
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { phone, password, role, dob } = req.body;
    let { email } = req.body;
    const full_name = req.body.full_name || req.body.name;

    // 1. Validate required fields
    if (!full_name || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'সকল আবশ্যক তথ্য পূরণ করুন (নাম, মোবাইল নম্বর এবং পাসওয়ার্ড আবশ্যক)। (Name, phone, and password required)'
      });
    }

    const trimmedName = full_name.trim();
    const cleanPhone = phone.toString().replace(/\s+/g, '').replace(/^\+88/, '');
    const standardPhone = cleanPhone.startsWith('01') ? cleanPhone : `0${cleanPhone}`;

    if (trimmedName.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'সঠিক পূর্ণ নাম প্রদান করুন (কমপক্ষে ২ অক্ষর)। (Full name must be at least 2 characters)'
      });
    }

    // 2. Validate Bangladeshi mobile number
    if (!BD_PHONE_REGEX.test(standardPhone)) {
      return res.status(400).json({
        success: false,
        message: 'সঠিক ১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)। (Invalid Bangladeshi phone number)'
      });
    }

    // 3. Process & validate Email (generate default if not provided)
    let trimmedEmail = '';
    if (email && email.trim()) {
      trimmedEmail = email.trim().toLowerCase();
      if (!RFC_EMAIL_REGEX.test(trimmedEmail)) {
        return res.status(400).json({
          success: false,
          message: 'সঠিক ইমেইল ঠিকানা দিন (RFC মানসম্মত)। (Invalid RFC email format)'
        });
      }
    } else {
      trimmedEmail = `farmer_${standardPhone}@agrowish.bd`;
    }

    // 4. Validate DOB if provided
    let cleanDob = null;
    if (dob) {
      if (!isValidDob(dob)) {
        return res.status(400).json({
          success: false,
          message: 'সঠিক জন্ম তারিখ প্রদান করুন (বয়স কমপক্ষে ১২ বছর হতে হবে)। (Invalid Date of Birth)'
        });
      }
      cleanDob = new Date(dob).toISOString().split('T')[0];
    }

    // 5. Enforce password policy
    const pwdErr = validatePasswordStrength(password, standardPhone, trimmedName);
    if (pwdErr) {
      return res.status(400).json({ success: false, message: pwdErr });
    }

    // 6. Check for duplicate email or phone
    const [existingUsers] = await pool.execute(
      'SELECT user_id, email, phone FROM users WHERE LOWER(email) = ? OR phone = ? LIMIT 1',
      [trimmedEmail, standardPhone]
    );

    if (existingUsers.length > 0) {
      const match = existingUsers[0];
      const isPhone = match.phone === standardPhone;
      return res.status(409).json({
        success: false,
        message: isPhone
          ? 'এই মোবাইল নম্বরটি ইতিমধ্যে নিবন্ধিত হয়েছে। লগইন করুন। (Phone number already registered)'
          : 'এই ইমেইলটি ইতিমধ্যে নিবন্ধিত হয়েছে। (Email is already registered)'
      });
    }

    // 7. Hash password using bcryptjs (salt rounds = 10)
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const assignedRole = (role && role.toUpperCase() === 'ADMIN') ? 'ADMIN' : 'FARMER';

    // 8. Insert record into users table
    let newUserId;
    try {
      const [insertResult] = await pool.execute(
        'INSERT INTO users (full_name, email, phone, password_hash, role, dob, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [trimmedName, trimmedEmail, standardPhone, password_hash, assignedRole, cleanDob, 'ACTIVE']
      );
      newUserId = insertResult.insertId;
    } catch (insertErr) {
      // Fallback if dob or status column is not yet present
      const [insertFallback] = await pool.execute(
        'INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        [trimmedName, trimmedEmail, standardPhone, password_hash, assignedRole]
      );
      newUserId = insertFallback.insertId;
    }

    // 9. Auto-create initial farmer_profile for farmers
    if (assignedRole === 'FARMER') {
      try {
        await pool.execute('INSERT INTO farmer_profiles (user_id) VALUES (?)', [newUserId]);
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
      phone: standardPhone,
      role: assignedRole,
      dob: cleanDob
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
        phone: userData.phone,
        role: userData.role,
        dob: userData.dob
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
 * User login with Email OR Mobile Number, bcrypt comparison, and 1-day JWT token issuance
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    // Support identifier (email or phone) or explicit email/phone fields
    const identifier = (req.body.identifier || req.body.email || req.body.phone || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'মোবাইল নম্বর/ইমেইল এবং পাসওয়ার্ড প্রদান করুন। (Identifier and password are required)'
      });
    }

    const cleanIdentifier = identifier.toLowerCase();
    const cleanPhone = identifier.replace(/\s+/g, '').replace(/^\+88/, '');
    const standardPhone = cleanPhone.startsWith('01') ? cleanPhone : `0${cleanPhone}`;

    // 1. Lookup user by email OR phone
    const [rows] = await pool.execute(
      `SELECT user_id, full_name, email, phone, password_hash, role,
              ${pool ? 'status' : "'ACTIVE'"} AS status
       FROM users
       WHERE LOWER(email) = ? OR phone = ? OR phone = ?
       LIMIT 1`,
      [cleanIdentifier, identifier, standardPhone]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'ভুল মোবাইল নম্বর/ইমেইল বা পাসওয়ার্ড। (Invalid credentials)'
      });
    }

    const user = rows[0];

    // Check account status
    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'আপনার অ্যাকাউন্টটি সাময়িকভাবে স্থগিত রয়েছে। অ্যাডমিনের সাথে যোগাযোগ করুন। (Account suspended)'
      });
    }

    // 2. Compare password hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'ভুল মোবাইল নম্বর/ইমেইল বা পাসওয়ার্ড। (Invalid credentials)'
      });
    }

    // 3. Update last_login timestamp
    try {
      await pool.execute('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?', [user.user_id]);
    } catch {
      // Ignore if last_login column is absent
    }

    // 4. Generate JWT
    const payload = {
      id: user.user_id,
      user_id: user.user_id,
      full_name: user.full_name,
      name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role
    };

    const token = generateToken(payload);

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
 * POST /api/auth/admin-login
 * Dedicated admin authentication endpoint with strict ADMIN role verification
 */
router.post('/admin-login', authLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    const identifier = (req.body.identifier || req.body.email || req.body.phone || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'অ্যাডমিন ইমেইল/ইউজারনেম এবং পাসওয়ার্ড প্রদান করুন।'
      });
    }

    const cleanIdentifier = identifier.toLowerCase();

    const [rows] = await pool.execute(
      'SELECT user_id, full_name, email, phone, password_hash, role, status FROM users WHERE LOWER(email) = ? OR phone = ? LIMIT 1',
      [cleanIdentifier, identifier]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'অ্যাডমিন অ্যাকাউন্ট পাওয়া যায়নি।' });
    }

    const user = rows[0];

    if (user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'প্রবেশাধিকার সংরক্ষিত! এই ইন্টারফেসে শুধুমাত্র অ্যাডমিন প্রবেশ করতে পারবেন। (Access denied: Admin role required)'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'ভুল অ্যাডমিন পাসওয়ার্ড।' });
    }

    try {
      await pool.execute('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?', [user.user_id]);
    } catch {}

    const payload = {
      id: user.user_id,
      user_id: user.user_id,
      full_name: user.full_name,
      name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: 'ADMIN'
    };

    const token = generateToken(payload);
    await logAudit(user.user_id, 'ADMIN_LOGIN', `users:${user.user_id}`, req, { email: user.email });

    return res.status(200).json({
      success: true,
      message: 'অ্যাডমিন লগইন সফল হয়েছে!',
      token,
      user: payload
    });
  } catch (error) {
    console.error('[Admin Login Error]', error);
    return res.status(500).json({ success: false, message: 'সার্ভারে অভ্যন্তরীণ ত্রুটি।' });
  }
});

/**
 * POST /api/auth/refresh
 * Issues a refreshed token if the current token is active and valid
 */
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;
    const [rows] = await pool.execute(
      'SELECT user_id, full_name, email, phone, role, status FROM users WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (rows.length === 0 || rows[0].status === 'SUSPENDED') {
      return res.status(403).json({ success: false, message: 'অ্যাকাউন্টটি অবৈধ বা স্থগিত।' });
    }

    const user = rows[0];
    const token = generateToken({
      id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role
    });

    return res.status(200).json({
      success: true,
      message: 'টোকেন নবায়ন সফল হয়েছে।',
      token,
      user: {
        id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'টোকেন নবায়ন ব্যর্থ হয়েছে।' });
  }
});

/**
 * GET /api/auth/me
 * Protected route returning the current authenticated user's details & farm profile
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;
    const [rows] = await pool.execute(
      `SELECT u.user_id, u.full_name, u.email, u.phone, u.role, u.created_at,
              fp.profile_id, fp.district, fp.upazila, fp.land_size, fp.soil_type,
              fp.water_availability, fp.season, fp.budget, fp.has_pond, fp.pond_size,
              fp.existing_resources
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
 */
router.post('/logout', authenticateToken, (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'সফলভাবে লগআউট সম্পন্ন হয়েছে। (Logged out successfully)'
  });
});

module.exports = router;
