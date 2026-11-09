/**
 * agroWish Backend - Protected Authentication Middleware
 * SE-331 Software Engineering Design Capstone Project
 * Member 2: Most Tasnim Jahan Rifa (ID: 241-35-116)
 * 
 * SRS Reference: Section 5 (FR-01, FR-02), Section 6 (NFR-04)
 */

const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'agrowish_secret_key_jwt_2026';

/**
 * Middleware to authenticate requests using JWT Bearer Token
 * FR-01: User Authentication & Session Security
 * NFR-04: Security and Role Handling
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  // Check for presence of Authorization header (Return 401 if missing)
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'অননুমোদিত অ্যাক্সেস! টোকেন অনুপস্থিত। (Unauthorized: Missing token)'
    });
  }

  // Parse "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer' || !parts[1]) {
    return res.status(401).json({
      success: false,
      message: 'টোকেনের বিন্যাস সঠিক নয়। ফরম্যাট: Bearer <token> (Unauthorized: Invalid token format)'
    });
  }

  const token = parts[1];

  // Verify JWT signature and expiration (Return 403 if invalid or expired)
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'অবৈধ অথবা মেয়াদোত্তীর্ণ টোকেন। (Forbidden: Invalid or expired token)'
      });
    }

    // Bind decoded payload to req.user: { id, name, full_name, email, role }
    const userId = decoded.id || decoded.user_id;
    const userName = decoded.full_name || decoded.name;

    req.user = {
      id: userId,
      user_id: userId,
      name: userName,
      full_name: userName,
      email: decoded.email,
      role: decoded.role || 'FARMER'
    };

    next();
  });
}

/**
 * Role-Based Access Control (FR-02)
 * Restricts access to specific user roles (e.g. 'ADMIN', 'FARMER')
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'এই সুবিধায় অ্যাক্সেস করার অনুমতি আপনার নেই। (Forbidden: Access denied for role)'
      });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles
};
