/**
 * agroWish Backend - Farmer Farm Condition & Resource Inventory Module
 * SE-331 Software Engineering Design Capstone Project
 * Member 3: Tasdid Al Amin (ID: 241-35-108)
 * Lead: Frontend & Usability Lead (Assisted by Member 2 Data Architecture)
 * 
 * SRS Reference:
 * - Section 5: FR-03 (Farmer Profile), FR-04 (Farm Condition Input), FR-05 (Budget/Goal), 
 *              FR-06 (Existing Resource Inventory), FR-07 (Validation), FR-17 (Bangla Display), FR-30 (Status)
 * - Section 6: NFR-03 (Usability & Responsiveness)
 * - Section 7.4: ERD (farmer_profiles, users)
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// All profile endpoints are strictly protected by JWT authentication
router.use(authenticateToken);

// Approved enum lists matching SRS and Bangla UX
const VALID_SOIL_TYPES = ['দোআঁশ', 'বেলে', 'এঁটেল', 'পলি'];
const VALID_WATER_AVAILABILITY = ['উচ্চ', 'মাঝারি', 'স্বল্প'];
const VALID_SEASONS = ['রবি', 'খরিপ-১', 'খরিপ-২'];

/**
 * Helper to validate positive decimal numbers
 */
function isPositiveNumber(val) {
  if (val === undefined || val === null || val === '') return false;
  const num = parseFloat(val);
  return !isNaN(num) && num > 0;
}

/**
 * Helper to validate non-negative numbers (zero or greater)
 */
function isNonNegativeNumber(val) {
  if (val === undefined || val === null || val === '') return false;
  const num = parseFloat(val);
  return !isNaN(num) && num >= 0;
}

/**
 * POST /api/profile
 * FR-03, FR-04, FR-05, FR-06, FR-07: Save or update farmer farm conditions & resource inventory
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'ব্যবহারকারী প্রমাণীকরণ ব্যর্থ হয়েছে।'
      });
    }

    const {
      district,
      upazila,
      land_size,
      soil_type,
      water_availability,
      season,
      budget,
      has_pond,
      pond_size,
      existing_resources
    } = req.body;

    // 1. Validate District (required string)
    if (!district || typeof district !== 'string' || !district.trim()) {
      return res.status(400).json({
        success: false,
        message: 'অনুগ্রহ করে আপনার জেলা নির্বাচন করুন।'
      });
    }

    // 2. Validate Upazila (required string)
    if (!upazila || typeof upazila !== 'string' || !upazila.trim()) {
      return res.status(400).json({
        success: false,
        message: 'অনুগ্রহ করে আপনার উপজেলা প্রদান করুন।'
      });
    }

    // 3. Validate Land Size (positive decimal in শতক/decimal)
    if (!isPositiveNumber(land_size)) {
      return res.status(400).json({
        success: false,
        message: 'জমির পরিমাণ শূন্যের বেশি হতে হবে (শতক এককে লিখুন)।'
      });
    }
    const cleanLandSize = parseFloat(land_size);

    // 4. Validate Soil Type
    if (!soil_type || !VALID_SOIL_TYPES.includes(soil_type.trim())) {
      return res.status(400).json({
        success: false,
        message: `সঠিক মাটির ধরন নির্বাচন করুন (${VALID_SOIL_TYPES.join(', ')})।`
      });
    }

    // 5. Validate Water Availability
    if (!water_availability || !VALID_WATER_AVAILABILITY.includes(water_availability.trim())) {
      return res.status(400).json({
        success: false,
        message: `সঠিক পানির প্রাপ্যতা নির্বাচন করুন (${VALID_WATER_AVAILABILITY.join(', ')})।`
      });
    }

    // 6. Validate Season
    if (!season || !VALID_SEASONS.includes(season.trim())) {
      return res.status(400).json({
        success: false,
        message: `সঠিক কৃষি মৌসুম নির্বাচন করুন (${VALID_SEASONS.join(', ')})।`
      });
    }

    // 7. Validate Budget (minimum 0)
    if (!isNonNegativeNumber(budget)) {
      return res.status(400).json({
        success: false,
        message: 'বাজেট সঠিকভাবে লিখুন (কমপক্ষে ০ টাকা)।'
      });
    }
    const cleanBudget = parseFloat(budget);

    // 8. Process Pond attributes
    const cleanHasPond = has_pond === true || has_pond === 'true' || has_pond === 1;
    let cleanPondSize = 0;
    if (cleanHasPond) {
      if (pond_size !== undefined && pond_size !== null && pond_size !== '') {
        const pSize = parseFloat(pond_size);
        if (isNaN(pSize) || pSize < 0) {
          return res.status(400).json({
            success: false,
            message: 'পুকুরের পরিমাপ সঠিক সংখ্যায় দিন (শতক এককে)।'
          });
        }
        cleanPondSize = pSize;
      }
    }

    // 9. Process Existing Resources (Array or JSON string)
    let resourcesJson = null;
    if (existing_resources) {
      if (Array.isArray(existing_resources)) {
        resourcesJson = JSON.stringify(existing_resources);
      } else if (typeof existing_resources === 'string') {
        try {
          // Verify if it's already a JSON string
          JSON.parse(existing_resources);
          resourcesJson = existing_resources;
        } catch {
          // If comma-separated or plain string, wrap in array
          resourcesJson = JSON.stringify([existing_resources]);
        }
      }
    }

    // 10. Upsert logic into farmer_profiles
    const [existing] = await pool.execute(
      'SELECT profile_id FROM farmer_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (existing.length > 0) {
      // Update existing record
      await pool.execute(
        `UPDATE farmer_profiles 
         SET district = ?, upazila = ?, land_size = ?, soil_type = ?, 
             water_availability = ?, season = ?, budget = ?, 
             has_pond = ?, pond_size = ?, existing_resources = ?
         WHERE user_id = ?`,
        [
          district.trim(),
          upazila.trim(),
          cleanLandSize,
          soil_type.trim(),
          water_availability.trim(),
          season.trim(),
          cleanBudget,
          cleanHasPond ? 1 : 0,
          cleanPondSize,
          resourcesJson,
          userId
        ]
      );
    } else {
      // Insert new record
      await pool.execute(
        `INSERT INTO farmer_profiles 
         (user_id, district, upazila, land_size, soil_type, water_availability, season, budget, has_pond, pond_size, existing_resources)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          district.trim(),
          upazila.trim(),
          cleanLandSize,
          soil_type.trim(),
          water_availability.trim(),
          season.trim(),
          cleanBudget,
          cleanHasPond ? 1 : 0,
          cleanPondSize,
          resourcesJson
        ]
      );
    }

    // 11. Retrieve updated record for confirmation
    const [rows] = await pool.execute(
      'SELECT * FROM farmer_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );

    const savedProfile = rows[0];
    let parsedResources = [];
    if (savedProfile.existing_resources) {
      try {
        parsedResources = typeof savedProfile.existing_resources === 'string'
          ? JSON.parse(savedProfile.existing_resources)
          : savedProfile.existing_resources;
      } catch {
        parsedResources = [];
      }
    }

    return res.status(200).json({
      success: true,
      message: 'আপনার খামারের তথ্য সফলভাবে সংরক্ষিত হয়েছে!',
      profile: {
        ...savedProfile,
        has_pond: Boolean(savedProfile.has_pond),
        existing_resources: parsedResources
      }
    });

  } catch (error) {
    console.error('[POST /api/profile Error]', error);
    return res.status(500).json({
      success: false,
      message: 'খামারের তথ্য সংরক্ষণ করতে সার্ভারে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/profile/me
 * FR-03, FR-04: Returns the authenticated user's saved profile & farm conditions for prefilling
 */
router.get('/me', async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;

    const [rows] = await pool.execute(
      `SELECT u.user_id, u.full_name, u.email, u.phone, u.role,
              fp.profile_id, fp.district, fp.upazila, fp.land_size, fp.soil_type,
              fp.water_availability, fp.season, fp.budget, fp.has_pond, fp.pond_size,
              fp.existing_resources, fp.updated_at
       FROM users u
       LEFT JOIN farmer_profiles fp ON u.user_id = fp.user_id
       WHERE u.user_id = ?
       LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ব্যবহারকারী খুঁজে পাওয়া যায়নি।'
      });
    }

    const data = rows[0];

    let parsedResources = [];
    if (data.existing_resources) {
      try {
        parsedResources = typeof data.existing_resources === 'string'
          ? JSON.parse(data.existing_resources)
          : data.existing_resources;
      } catch {
        parsedResources = [];
      }
    }

    const isProfileComplete = Boolean(
      data.district &&
      data.upazila &&
      data.land_size &&
      parseFloat(data.land_size) > 0 &&
      data.soil_type &&
      data.season
    );

    return res.status(200).json({
      success: true,
      user: {
        id: data.user_id,
        user_id: data.user_id,
        full_name: data.full_name,
        name: data.full_name,
        email: data.email,
        phone: data.phone,
        role: data.role
      },
      profile: data.profile_id ? {
        profile_id: data.profile_id,
        district: data.district || '',
        upazila: data.upazila || '',
        land_size: data.land_size !== null ? parseFloat(data.land_size) : '',
        soil_type: data.soil_type || 'দোআঁশ',
        water_availability: data.water_availability || 'মাঝারি',
        season: data.season || 'রবি',
        budget: data.budget !== null ? parseFloat(data.budget) : '',
        has_pond: Boolean(data.has_pond),
        pond_size: data.pond_size !== null ? parseFloat(data.pond_size) : 0,
        existing_resources: parsedResources,
        updated_at: data.updated_at
      } : null,
      isComplete: isProfileComplete
    });

  } catch (error) {
    console.error('[GET /api/profile/me Error]', error);
    return res.status(500).json({
      success: false,
      message: 'খামারের তথ্য লোড করতে ব্যর্থ হয়েছে।',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Alias for GET /api/profile
router.get('/', (req, res) => {
  res.redirect(307, '/api/profile/me');
});

module.exports = router;
