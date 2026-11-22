/**
 * agroWish Backend - Audit Logging Utility
 * SRS Reference: Section 5 (FR-33: System Audit Trail & Administrative Action Logging)
 */

const { pool } = require('../db');

/**
 * Persists an audit record into `audit_logs` safely without crashing the request flow
 * @param {number|null} userId
 * @param {string} action - e.g. CREATE_CROP, UPDATE_KNOWLEDGE, DELETE_WASTE_RULE, GENERATE_RECOMMENDATION
 * @param {string} target - e.g. crops:1, knowledge_documents:4
 * @param {import('express').Request|null} req
 * @param {object|null} details
 */
async function logAudit(userId, action, target = null, req = null, details = null) {
  try {
    const ipAddress = req
      ? (req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress || null)
      : null;
    const userAgent = req && req.headers['user-agent']
      ? String(req.headers['user-agent']).slice(0, 250)
      : null;
    const detailsJson = details ? JSON.stringify(details) : null;

    await pool.execute(
      `INSERT INTO audit_logs (user_id, action, target, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId || null, String(action).slice(0, 100), target ? String(target).slice(0, 255) : null, detailsJson, ipAddress, userAgent]
    );
  } catch (err) {
    console.warn('[AuditLogger Warning] Failed to record audit log:', err.message);
  }
}

module.exports = {
  logAudit
};
