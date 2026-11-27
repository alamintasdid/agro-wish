/**
 * agroWish Backend - Farmer Farm Condition & Resource Inventory Module
 * Supports Bangladeshi land measurement units (Decimal, Katha, Bigha, Acre, Hectare),
 * soil attributes, irrigation facilities, and agricultural equipment inventory.
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { convertToDecimals, convertFromDecimals, LAND_UNITS } = require('../utils/landUnits');

// All profile endpoints are strictly protected by JWT authentication
router.use(authenticateToken);

// Approved enum lists matching SRS and Bangla UX
const VALID_SOIL_TYPES = ['দোআঁশ', 'বেলে', 'এঁটেল', 'পলি'];
const VALID_WATER_AVAILABILITY = ['উচ্চ', 'মাঝারি', 'স্বল্প'];
const VALID_SEASONS = ['রবি', 'খরিপ-১', 'খরিপ-২'];
const VALID_RISK_PREFS = ['LOW', 'MEDIUM', 'HIGH'];

function isPositiveNumber(val) {
  if (val === undefined || val === null || val === '') return false;
  const num = parseFloat(val);
  return !isNaN(num) && num > 0;
}

function isNonNegativeNumber(val) {
  if (val === undefined || val === null || val === '') return false;
  const num = parseFloat(val);
  return !isNaN(num) && num >= 0;
}

/**
 * Generates conversion equivalents across all Bangladeshi land units
 */
function getLandConversions(decimals) {
  const dec = parseFloat(decimals) || 0;
  return {
    decimal: dec,
    katha: convertFromDecimals(dec, 'katha'),
    bigha: convertFromDecimals(dec, 'bigha'),
    acre: convertFromDecimals(dec, 'acre'),
    hectare: convertFromDecimals(dec, 'hectare')
  };
}

/**
 * POST /api/profile
 * Save or update farmer farm conditions & resource inventory
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
      land_unit = 'decimal',
      soil_type,
      soil_ph,
      water_availability,
      irrigation_type = 'সেচ পাম্প / গভীর নলকূপ',
      season,
      budget,
      farming_goal,
      risk_preference,
      has_pond,
      pond_size,
      existing_resources,
      equipment_inventory
    } = req.body;

    // 1. Validate District
    if (!district || typeof district !== 'string' || !district.trim()) {
      return res.status(400).json({
        success: false,
        message: 'অনুগ্রহ করে আপনার জেলা নির্বাচন করুন।'
      });
    }

    // 2. Validate Upazila
    if (!upazila || typeof upazila !== 'string' || !upazila.trim()) {
      return res.status(400).json({
        success: false,
        message: 'অনুগ্রহ করে আপনার উপজেলা প্রদান করুন।'
      });
    }

    // 3. Validate and Convert Land Size
    if (!isPositiveNumber(land_size)) {
      return res.status(400).json({
        success: false,
        message: 'জমির পরিমাণ শূন্যের বেশি হতে হবে।'
      });
    }

    const rawLandNum = parseFloat(land_size);
    // Convert to standard decimals based on provided unit
    const cleanLandSize = convertToDecimals(rawLandNum, land_unit);

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

    // 7. Validate Budget
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
    if (cleanHasPond && isPositiveNumber(pond_size)) {
      cleanPondSize = parseFloat(pond_size);
    }

    // 9. Process Existing Resources
    let resourcesJson = null;
    if (existing_resources) {
      if (Array.isArray(existing_resources)) {
        resourcesJson = JSON.stringify(existing_resources);
      } else if (typeof existing_resources === 'string') {
        try {
          JSON.parse(existing_resources);
          resourcesJson = existing_resources;
        } catch {
          resourcesJson = JSON.stringify([existing_resources]);
        }
      }
    }

    // 10. Process Equipment Inventory
    let equipJson = null;
    if (equipment_inventory) {
      if (Array.isArray(equipment_inventory)) {
        equipJson = JSON.stringify(equipment_inventory);
      } else if (typeof equipment_inventory === 'string') {
        try {
          JSON.parse(equipment_inventory);
          equipJson = equipment_inventory;
        } catch {
          equipJson = JSON.stringify([equipment_inventory]);
        }
      }
    }

    // Optional Soil pH
    let cleanPh = null;
    if (soil_ph !== undefined && soil_ph !== null && soil_ph !== '') {
      const phNum = parseFloat(soil_ph);
      if (!isNaN(phNum) && phNum >= 3.5 && phNum <= 9.5) {
        cleanPh = phNum;
      }
    }

    const cleanGoal = (farming_goal && typeof farming_goal === 'string' && farming_goal.trim())
      ? farming_goal.trim()
      : 'সুষম মুনাফা ও খাদ্য নিরাপত্তা';

    const cleanRisk = (risk_preference && VALID_RISK_PREFS.includes(risk_preference.trim().toUpperCase()))
      ? risk_preference.trim().toUpperCase()
      : 'MEDIUM';

    // 11. Check if profile exists for this user
    const [existingProfiles] = await pool.execute(
      'SELECT profile_id FROM farmer_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (existingProfiles.length > 0) {
      try {
        await pool.execute(
          `UPDATE farmer_profiles 
           SET district = ?, upazila = ?, land_size = ?, land_unit = ?, soil_type = ?, soil_ph = ?,
               water_availability = ?, irrigation_type = ?, season = ?, budget = ?,
               farming_goal = ?, risk_preference = ?, has_pond = ?, pond_size = ?,
               existing_resources = ?, equipment_inventory = ?
           WHERE user_id = ?`,
          [
            district.trim(),
            upazila.trim(),
            cleanLandSize,
            land_unit,
            soil_type.trim(),
            cleanPh,
            water_availability.trim(),
            irrigation_type.trim(),
            season.trim(),
            cleanBudget,
            cleanGoal,
            cleanRisk,
            cleanHasPond ? 1 : 0,
            cleanPondSize,
            resourcesJson,
            equipJson,
            userId
          ]
        );
      } catch (colErr) {
        // Fallback for legacy columns
        await pool.execute(
          `UPDATE farmer_profiles 
           SET district = ?, upazila = ?, land_size = ?, soil_type = ?,
               water_availability = ?, season = ?, budget = ?,
               farming_goal = ?, risk_preference = ?, has_pond = ?, pond_size = ?,
               existing_resources = ?
           WHERE user_id = ?`,
          [
            district.trim(),
            upazila.trim(),
            cleanLandSize,
            soil_type.trim(),
            water_availability.trim(),
            season.trim(),
            cleanBudget,
            cleanGoal,
            cleanRisk,
            cleanHasPond ? 1 : 0,
            cleanPondSize,
            resourcesJson,
            userId
          ]
        );
      }
    } else {
      try {
        await pool.execute(
          `INSERT INTO farmer_profiles 
           (user_id, district, upazila, land_size, land_unit, soil_type, soil_ph, water_availability, irrigation_type, season, budget, farming_goal, risk_preference, has_pond, pond_size, existing_resources, equipment_inventory)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            district.trim(),
            upazila.trim(),
            cleanLandSize,
            land_unit,
            soil_type.trim(),
            cleanPh,
            water_availability.trim(),
            irrigation_type.trim(),
            season.trim(),
            cleanBudget,
            cleanGoal,
            cleanRisk,
            cleanHasPond ? 1 : 0,
            cleanPondSize,
            resourcesJson,
            equipJson
          ]
        );
      } catch (insertColErr) {
        await pool.execute(
          `INSERT INTO farmer_profiles 
           (user_id, district, upazila, land_size, soil_type, water_availability, season, budget, farming_goal, risk_preference, has_pond, pond_size, existing_resources)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            district.trim(),
            upazila.trim(),
            cleanLandSize,
            soil_type.trim(),
            water_availability.trim(),
            season.trim(),
            cleanBudget,
            cleanGoal,
            cleanRisk,
            cleanHasPond ? 1 : 0,
            cleanPondSize,
            resourcesJson
          ]
        );
      }
    }

    // 12. Retrieve updated record for response
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

    let parsedEquip = [];
    if (savedProfile.equipment_inventory) {
      try {
        parsedEquip = typeof savedProfile.equipment_inventory === 'string'
          ? JSON.parse(savedProfile.equipment_inventory)
          : savedProfile.equipment_inventory;
      } catch {
        parsedEquip = [];
      }
    }

    return res.status(200).json({
      success: true,
      message: 'আপনার খামারের তথ্য সফলভাবে সংরক্ষিত হয়েছে!',
      profile: {
        ...savedProfile,
        land_size: parseFloat(savedProfile.land_size),
        land_conversions: getLandConversions(savedProfile.land_size),
        has_pond: Boolean(savedProfile.has_pond),
        existing_resources: parsedResources,
        equipment_inventory: parsedEquip
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
 */
router.get('/me', async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;

    const [rows] = await pool.execute(
      `SELECT u.user_id, u.full_name, u.email, u.phone, u.role,
              fp.profile_id, fp.district, fp.upazila, fp.land_size, fp.soil_type,
              fp.water_availability, fp.season, fp.budget, fp.farming_goal, fp.risk_preference,
              fp.has_pond, fp.pond_size, fp.existing_resources, fp.updated_at
       FROM users u
       LEFT JOIN farmer_profiles fp ON u.user_id = fp.user_id
       WHERE u.user_id = ?
       LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ব্যবহারকারী খুঁজে পাওয়া যায়নি।' });
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

    const landDecimals = data.land_size !== null ? parseFloat(data.land_size) : 0;

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
        land_size: landDecimals || '',
        land_conversions: getLandConversions(landDecimals),
        soil_type: data.soil_type || 'দোআঁশ',
        water_availability: data.water_availability || 'মাঝারি',
        season: data.season || 'রবি',
        budget: data.budget !== null ? parseFloat(data.budget) : '',
        farming_goal: data.farming_goal || 'সুষম মুনাফা ও খাদ্য নিরাপত্তা',
        risk_preference: data.risk_preference || 'MEDIUM',
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
      message: 'খামারের তথ্য লোড করতে ব্যর্থ হয়েছে।'
    });
  }
});

router.get('/', (req, res) => {
  res.redirect(307, '/api/profile/me');
});

module.exports = router;
