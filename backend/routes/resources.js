/**
 * agroWish Backend - Farmer Resource Inventory & Farming Goals API
 * SRS Reference:
 * - Section 5: FR-05 (Budget & Farming Goals), FR-06 (Existing Resource Inventory),
 *              FR-07 (Input Validation), FR-11 (Resource-Based Planning), FR-27 (Data Isolation)
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

const VALID_RESOURCE_TYPES = ['pond', 'livestock', 'poultry', 'crop_residue', 'organic_material', 'water'];
const VALID_RISK_PREFS = ['LOW', 'MEDIUM', 'HIGH'];

const RESOURCE_TYPE_TO_LEGACY_KEY = {
  pond: 'fisheries',
  livestock: 'dairy',
  poultry: 'poultry',
  crop_residue: 'crop_residues',
  organic_material: 'compost'
};

/**
 * Ensures the authenticated farmer has a farmer_profiles row and returns its profile_id
 */
async function ensureFarmerProfile(userId) {
  const [rows] = await pool.execute(
    'SELECT profile_id, has_pond, pond_size, existing_resources FROM farmer_profiles WHERE user_id = ? LIMIT 1',
    [userId]
  );
  if (rows.length > 0) return rows[0];

  const [ins] = await pool.execute(
    'INSERT INTO farmer_profiles (user_id) VALUES (?)',
    [userId]
  );
  return {
    profile_id: ins.insertId,
    has_pond: 0,
    pond_size: 0,
    existing_resources: null
  };
}

/**
 * Synchronizes `resources` table changes back to `farmer_profiles.existing_resources` and pond flags
 * so legacy endpoints remain 100% consistent.
 */
async function syncResourcesToProfile(userId) {
  try {
    const [resRows] = await pool.execute(
      'SELECT resource_type, quantity FROM resources WHERE user_id = ?',
      [userId]
    );
    const [profRows] = await pool.execute(
      'SELECT existing_resources, has_pond, pond_size FROM farmer_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );
    if (profRows.length === 0) return;

    let legacyList = [];
    if (profRows[0].existing_resources) {
      try {
        legacyList = typeof profRows[0].existing_resources === 'string'
          ? JSON.parse(profRows[0].existing_resources)
          : profRows[0].existing_resources;
        if (!Array.isArray(legacyList)) legacyList = [];
      } catch {
        legacyList = [];
      }
    }

    const mappedSet = new Set(legacyList);
    let pondTotal = 0;
    let hasPondRow = false;

    for (const r of resRows) {
      if (r.resource_type === 'pond') {
        hasPondRow = true;
        pondTotal += parseFloat(r.quantity) || 0;
      }
      const key = RESOURCE_TYPE_TO_LEGACY_KEY[r.resource_type];
      if (key) mappedSet.add(key);
    }

    const nextHasPond = hasPondRow ? 1 : profRows[0].has_pond;
    const nextPondSize = hasPondRow ? pondTotal : profRows[0].pond_size;

    await pool.execute(
      'UPDATE farmer_profiles SET has_pond = ?, pond_size = ?, existing_resources = ? WHERE user_id = ?',
      [nextHasPond ? 1 : 0, nextPondSize || 0, JSON.stringify([...mappedSet]), userId]
    );
  } catch (err) {
    console.warn('[syncResourcesToProfile Warning]', err.message);
  }
}

/**
 * GET /api/resources
 * FR-05, FR-06, FR-27: Fetch authenticated farmer's recorded resources & farming goals
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;

    const [resources] = await pool.execute(
      `SELECT resource_id, profile_id, user_id, resource_name, resource_type, quantity, unit, notes, created_at, updated_at
       FROM resources
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    const [profileRows] = await pool.execute(
      `SELECT profile_id, budget, farming_goal, risk_preference, season, land_size, district, upazila, soil_type, water_availability, has_pond, pond_size
       FROM farmer_profiles
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );

    const profile = profileRows[0] || null;

    return res.status(200).json({
      success: true,
      count: resources.length,
      resources: resources.map((r) => ({
        ...r,
        quantity: parseFloat(r.quantity)
      })),
      goals: profile ? {
        budget: profile.budget !== null ? parseFloat(profile.budget) : 0,
        farming_goal: profile.farming_goal || 'সুষম মুনাফা ও খাদ্য নিরাপত্তা',
        risk_preference: profile.risk_preference || 'MEDIUM',
        season: profile.season || 'রবি',
        land_size: profile.land_size !== null ? parseFloat(profile.land_size) : 0
      } : {
        budget: 0,
        farming_goal: 'সুষম মুনাফা ও খাদ্য নিরাপত্তা',
        risk_preference: 'MEDIUM',
        season: 'রবি',
        land_size: 0
      }
    });
  } catch (error) {
    console.error('[GET /api/resources Error]', error);
    return res.status(500).json({
      success: false,
      message: 'খামারের সম্পদ তালিকা লোড করতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * POST /api/resources
 * FR-06, FR-07, FR-27: Add a new farm resource (pond, livestock, poultry, crop_residue, organic_material, water)
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;
    const { resource_name, resource_type, quantity, unit, notes } = req.body;

    if (!resource_name || typeof resource_name !== 'string' || resource_name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'সম্পদের সঠিক নাম লিখুন (কমপক্ষে ২ অক্ষর)।'
      });
    }

    if (!resource_type || !VALID_RESOURCE_TYPES.includes(resource_type.trim())) {
      return res.status(400).json({
        success: false,
        message: `সঠিক সম্পদের ধরন নির্বাচন করুন (${VALID_RESOURCE_TYPES.join(', ')})।`
      });
    }

    const numQty = parseFloat(quantity);
    if (quantity === undefined || quantity === null || quantity === '' || isNaN(numQty) || numQty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'সম্পদের পরিমাণ শূন্যের বেশি সংখ্যা হতে হবে।'
      });
    }

    if (!unit || typeof unit !== 'string' || !unit.trim()) {
      return res.status(400).json({
        success: false,
        message: 'সম্পদের একক উল্লেখ করুন (যেমন: শতক, টি, কেজি)।'
      });
    }

    const profile = await ensureFarmerProfile(userId);

    const [insertResult] = await pool.execute(
      `INSERT INTO resources (profile_id, user_id, resource_name, resource_type, quantity, unit, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        profile.profile_id,
        userId,
        resource_name.trim().slice(0, 120),
        resource_type.trim(),
        numQty,
        unit.trim().slice(0, 40),
        notes ? String(notes).trim().slice(0, 255) : null
      ]
    );

    await syncResourcesToProfile(userId);

    const [rows] = await pool.execute(
      'SELECT * FROM resources WHERE resource_id = ? LIMIT 1',
      [insertResult.insertId]
    );

    return res.status(201).json({
      success: true,
      message: 'নতুন খামার সম্পদ সফলভাবে যুক্ত হয়েছে!',
      resource: {
        ...rows[0],
        quantity: parseFloat(rows[0].quantity)
      }
    });
  } catch (error) {
    console.error('[POST /api/resources Error]', error);
    return res.status(500).json({
      success: false,
      message: 'খামারের সম্পদ সংরক্ষণ করতে সার্ভারে ত্রুটি হয়েছে।'
    });
  }
});

/**
 * PUT /api/resources/goals & POST /api/resources/goals
 * FR-05, FR-07, FR-11: Update farming budget, goal, and risk preference
 */
async function updateGoalsHandler(req, res) {
  try {
    const userId = req.user.id || req.user.user_id;
    const { budget, farming_goal, risk_preference } = req.body;

    const numBudget = parseFloat(budget);
    if (budget === undefined || budget === null || budget === '' || isNaN(numBudget) || numBudget < 0) {
      return res.status(400).json({
        success: false,
        message: 'বাজেট সঠিকভাবে লিখুন (কমপক্ষে ০ টাকা)।'
      });
    }

    const cleanGoal = farming_goal && typeof farming_goal === 'string' && farming_goal.trim()
      ? farming_goal.trim().slice(0, 120)
      : 'সুষম মুনাফা ও খাদ্য নিরাপত্তা';

    const cleanRisk = risk_preference && VALID_RISK_PREFS.includes(String(risk_preference).toUpperCase())
      ? String(risk_preference).toUpperCase()
      : 'MEDIUM';

    await ensureFarmerProfile(userId);

    await pool.execute(
      `UPDATE farmer_profiles
       SET budget = ?, farming_goal = ?, risk_preference = ?
       WHERE user_id = ?`,
      [numBudget, cleanGoal, cleanRisk, userId]
    );

    return res.status(200).json({
      success: true,
      message: 'চাষাবাদের লক্ষ্য ও বাজেট সফলভাবে হালনাগাদ হয়েছে!',
      goals: {
        budget: numBudget,
        farming_goal: cleanGoal,
        risk_preference: cleanRisk
      }
    });
  } catch (error) {
    console.error('[PUT /api/resources/goals Error]', error);
    return res.status(500).json({
      success: false,
      message: 'লক্ষ্য ও বাজেট সংরক্ষণ করতে সমস্যা হয়েছে।'
    });
  }
}

router.put('/goals', updateGoalsHandler);
router.post('/goals', updateGoalsHandler);

/**
 * PUT /api/resources/:id
 * FR-06, FR-07, FR-27: Update an existing farm resource owned by the authenticated farmer
 */
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;
    const resourceId = parseInt(req.params.id, 10);
    if (isNaN(resourceId) || resourceId <= 0) {
      return res.status(400).json({ success: false, message: 'অবৈধ সম্পদ আইডি।' });
    }

    const [existing] = await pool.execute(
      'SELECT * FROM resources WHERE resource_id = ? AND user_id = ? LIMIT 1',
      [resourceId, userId]
    );
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'সম্পদটি খুঁজে পাওয়া যায়নি অথবা আপনার পরিবর্তনের অনুমতি নেই।'
      });
    }

    const { resource_name, resource_type, quantity, unit, notes } = req.body;
    const curr = existing[0];

    const nextName = resource_name !== undefined ? String(resource_name).trim() : curr.resource_name;
    if (nextName.length < 2) {
      return res.status(400).json({ success: false, message: 'সম্পদের সঠিক নাম লিখুন।' });
    }

    const nextType = resource_type !== undefined ? String(resource_type).trim() : curr.resource_type;
    if (!VALID_RESOURCE_TYPES.includes(nextType)) {
      return res.status(400).json({ success: false, message: 'অবৈধ সম্পদের ধরন।' });
    }

    const nextQty = quantity !== undefined ? parseFloat(quantity) : parseFloat(curr.quantity);
    if (isNaN(nextQty) || nextQty <= 0) {
      return res.status(400).json({ success: false, message: 'পরিমাণ শূন্যের বেশি হতে হবে।' });
    }

    const nextUnit = unit !== undefined ? String(unit).trim() : curr.unit;
    if (!nextUnit) {
      return res.status(400).json({ success: false, message: 'একক প্রদান করুন।' });
    }

    const nextNotes = notes !== undefined ? (notes ? String(notes).trim().slice(0, 255) : null) : curr.notes;

    await pool.execute(
      `UPDATE resources
       SET resource_name = ?, resource_type = ?, quantity = ?, unit = ?, notes = ?
       WHERE resource_id = ? AND user_id = ?`,
      [nextName.slice(0, 120), nextType, nextQty, nextUnit.slice(0, 40), nextNotes, resourceId, userId]
    );

    await syncResourcesToProfile(userId);

    const [updated] = await pool.execute('SELECT * FROM resources WHERE resource_id = ? LIMIT 1', [resourceId]);
    return res.status(200).json({
      success: true,
      message: 'খামার সম্পদ সফলভাবে হালনাগাদ হয়েছে।',
      resource: {
        ...updated[0],
        quantity: parseFloat(updated[0].quantity)
      }
    });
  } catch (error) {
    console.error('[PUT /api/resources/:id Error]', error);
    return res.status(500).json({
      success: false,
      message: 'খামার সম্পদ হালনাগাদ করতে সমস্যা হয়েছে।'
    });
  }
});

/**
 * DELETE /api/resources/:id
 * FR-06, FR-27: Delete a resource owned by the authenticated farmer
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;
    const resourceId = parseInt(req.params.id, 10);
    if (isNaN(resourceId) || resourceId <= 0) {
      return res.status(400).json({ success: false, message: 'অবৈধ সম্পদ আইডি।' });
    }

    const [result] = await pool.execute(
      'DELETE FROM resources WHERE resource_id = ? AND user_id = ?',
      [resourceId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'সম্পদটি খুঁজে পাওয়া যায়নি অথবা আপনার মুছে ফেলার অনুমতি নেই।'
      });
    }

    await syncResourcesToProfile(userId);

    return res.status(200).json({
      success: true,
      message: 'খামার সম্পদটি সফলভাবে মুছে ফেলা হয়েছে।'
    });
  } catch (error) {
    console.error('[DELETE /api/resources/:id Error]', error);
    return res.status(500).json({
      success: false,
      message: 'খামার সম্পদ মুছে ফেলতে সমস্যা হয়েছে।'
    });
  }
});

module.exports = router;
