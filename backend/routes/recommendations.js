/**
 * agroWish Backend - Crop Recommendation Engine & Cost Breakdown API
 * SE-331 Software Engineering Design Capstone Project
 * Member 1: Md Adnan Ul Islam (ID: 241-35-103)
 * Lead: AI, Algorithm & Backend Engineer
 * 
 * SRS Reference:
 * - Section 5: FR-08 (Crop Recommendation), FR-09 (Variety Recommendation), FR-10 (Season Context),
 *              FR-11 (Resource Planning), FR-12 (Integrated Farming), FR-14 (Production Cost),
 *              FR-15 (Return & Margin), FR-16 (Budget Filtering & Synergy), FR-35 (Fallback Algorithm)
 * - Section 6: NFR-01 (Performance & Precision)
 * - Section 7.4: ERD (crops, crop_varieties, farmer_profiles)
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Seed reference data used when DB tables are being queried or as resilient baseline
const DEFAULT_CROPS = [
  {
    crop_id: 1,
    crop_name: 'Boro Rice',
    bengali_name: 'বোরো ধান',
    season: 'রবি',
    season_en: 'Rabi',
    crop_category: 'দানাদার খাদ্যশস্য (Cereal)',
    recommended_soil: 'দোআঁশ, এঁটেল, পলি',
    water_requirement: 'উচ্চ',
    avg_cost_per_decimal: 420.00,
    avg_revenue_per_decimal: 730.00,
    duration_days: 145,
    varieties: [
      { name: 'BRRI dhan28', name_bn: 'ব্রি ধান২৮', duration_days: 140, yield_kg: '২২.৫ কেজি/শতক', notes: 'স্বল্পমেয়াদী ও প্রচলিত' },
      { name: 'BRRI dhan29', name_bn: 'ব্রি ধান২৯', duration_days: 160, yield_kg: '২৮.০ কেজি/শতক', notes: 'উচ্চ ফলনশীল মেগা জাত' },
      { name: 'BRRI dhan89', name_bn: 'ব্রি ধান৮৯', duration_days: 155, yield_kg: '৩০.০ কেজি/শতক', notes: 'আধুনিক ব্লাস্ট প্রতিরোধী জাত' },
      { name: 'Bangabandhu dhan100', name_bn: 'বঙ্গবন্ধু ধান১০০', duration_days: 148, yield_kg: '২৬.৫ কেজি/শতক', notes: 'জিংক সমৃদ্ধ ও রোগ প্রতিরোধী' }
    ]
  },
  {
    crop_id: 2,
    crop_name: 'Aman Rice',
    bengali_name: 'আমন ধান',
    season: 'খরিপ-২',
    season_en: 'Kharif-2',
    crop_category: 'দানাদার খাদ্যশস্য (Cereal)',
    recommended_soil: 'দোআঁশ, এঁটেল, পলি',
    water_requirement: 'মাঝারি',
    avg_cost_per_decimal: 320.00,
    avg_revenue_per_decimal: 570.00,
    duration_days: 130,
    varieties: [
      { name: 'BRRI dhan49', name_bn: 'ব্রি ধান৪৯', duration_days: 135, yield_kg: '২০.০ কেজি/শতক', notes: 'জনপ্রিয় নাজিরশাইল বিকল্প' },
      { name: 'BRRI dhan75', name_bn: 'ব্রি ধান৭৫', duration_days: 115, yield_kg: '১৮.৫ কেজি/শতক', notes: 'স্বল্পমেয়াদী সুগন্ধি জাত' },
      { name: 'BR11 (Mukta)', name_bn: 'বিআর১১ (মুক্তা)', duration_days: 145, yield_kg: '২২.০ কেজি/শতক', notes: 'বৃষ্টি-নির্ভর মধ্যম জমিতে উপযোগী' }
    ]
  },
  {
    crop_id: 3,
    crop_name: 'Wheat',
    bengali_name: 'গম',
    season: 'রবি',
    season_en: 'Rabi',
    crop_category: 'দানাদার খাদ্যশস্য (Cereal)',
    recommended_soil: 'দোআঁশ, বেলে, পলি',
    water_requirement: 'স্বল্প',
    avg_cost_per_decimal: 300.00,
    avg_revenue_per_decimal: 520.00,
    duration_days: 110,
    varieties: [
      { name: 'BARI Gom-28', name_bn: 'বারি গম-২৮', duration_days: 105, yield_kg: '১৬.০ কেজি/শতক', notes: 'তাপসহনশীল ও আগাম জাত' },
      { name: 'BARI Gom-33', name_bn: 'বারি গম-৩৩', duration_days: 110, yield_kg: '১৮.৫ কেজি/শতক', notes: 'ব্লাস্ট প্রতিরোধী ও জিংক সমৃদ্ধ' }
    ]
  },
  {
    crop_id: 4,
    crop_name: 'Potato',
    bengali_name: 'আলু',
    season: 'রবি',
    season_en: 'Rabi',
    crop_category: 'কন্দজাত সবজি (Tuber)',
    recommended_soil: 'দোআঁশ, বেলে',
    water_requirement: 'মাঝারি',
    avg_cost_per_decimal: 950.00,
    avg_revenue_per_decimal: 1850.00,
    duration_days: 90,
    varieties: [
      { name: 'Diamant', name_bn: 'ডায়মন্ট', duration_days: 90, yield_kg: '১১০.০ কেজি/শতক', notes: 'উচ্চ ফলনশীল গোল আলু' },
      { name: 'Cardinal', name_bn: 'কার্ডিনাল', duration_days: 90, yield_kg: '১০৫.০ কেজি/শতক', notes: 'লাল চামড়ার জনপ্রিয় টেবিল আলু' },
      { name: 'Granola', name_bn: 'গ্রানোলা', duration_days: 85, yield_kg: '৯৫.০ কেজি/শতক', notes: 'নাবি ধসা রোগ সহনশীল' }
    ]
  },
  {
    crop_id: 5,
    crop_name: 'Maize',
    bengali_name: 'ভুট্টা',
    season: 'রবি',
    season_en: 'Rabi',
    crop_category: 'অর্থকরী খাদ্যশস্য (Cash Crop)',
    recommended_soil: 'দোআঁশ, বেলে, পলি',
    water_requirement: 'মাঝারি',
    avg_cost_per_decimal: 450.00,
    avg_revenue_per_decimal: 890.00,
    duration_days: 140,
    varieties: [
      { name: 'BARI Hybrid Maize-9', name_bn: 'বারি হাইব্রিড ভুট্টা-৯', duration_days: 145, yield_kg: '৪২.০ কেজি/শতক', notes: 'হেলে পড়া প্রতিরোধী ও উচ্চ ফলন' },
      { name: 'Pioneer P3396', name_bn: 'পায়োনিয়ার পি৩৩৯৬', duration_days: 140, yield_kg: '৪৫.০ কেজি/শতক', notes: 'বাণিজ্যিক হাইব্রিড জাত' }
    ]
  },
  {
    crop_id: 6,
    crop_name: 'Mustard',
    bengali_name: 'সরিষা',
    season: 'রবি',
    season_en: 'Rabi',
    crop_category: 'তৈলবীজ (Oilseed)',
    recommended_soil: 'দোআঁশ, বেলে, পলি',
    water_requirement: 'স্বল্প',
    avg_cost_per_decimal: 220.00,
    avg_revenue_per_decimal: 500.00,
    duration_days: 85,
    varieties: [
      { name: 'BARI Sarisha-14', name_bn: 'বারি সরিষা-১৪', duration_days: 80, yield_kg: '৬.৫ কেজি/শতক', notes: 'স্বল্পমেয়াদী ও তেলের মান ভালো' },
      { name: 'BARI Sarisha-17', name_bn: 'বারি সরিষা-১৭', duration_days: 85, yield_kg: '৭.২ কেজি/শতক', notes: 'উচ্চ ফলনশীল হলুদ সরিষা' }
    ]
  },
  {
    crop_id: 7,
    crop_name: 'Summer Vegetables & Jute',
    bengali_name: 'গ্রীষ্মকালীন সবজি ও পাট',
    season: 'খরিপ-১',
    season_en: 'Kharif-1',
    crop_category: 'সবজি ও আঁশজাত ফসল',
    recommended_soil: 'দোআঁশ, বেলে, পলি',
    water_requirement: 'মাঝারি',
    avg_cost_per_decimal: 340.00,
    avg_revenue_per_decimal: 680.00,
    duration_days: 100,
    varieties: [
      { name: 'BJRI Tossa Pat-8', name_bn: 'তোষা পাট-৮', duration_days: 110, yield_kg: '১২.০ কেজি/শতক', notes: 'উন্নত মানের সোনালী আঁশ' },
      { name: 'BARI Dhekrash-1', name_bn: 'বারি ঢেঁড়শ-১', duration_days: 90, yield_kg: '৪০.০ কেজি/শতক', notes: 'উচ্চ ফলনশীল গ্রীষ্মকালীন ঢেঁড়শ' }
    ]
  }
];

// Helper to normalize season string
function normalizeSeason(season) {
  if (!season) return 'রবি';
  const s = season.toLowerCase();
  if (s.includes('rabi') || s.includes('রবি')) return 'রবি';
  if (s.includes('kharif-1') || s.includes('খরিপ-১') || s.includes('kharif 1')) return 'খরিপ-১';
  if (s.includes('kharif-2') || s.includes('খরিপ-২') || s.includes('kharif 2')) return 'খরিপ-২';
  return 'রবি';
}

/**
 * GET /api/recommendations
 * FR-08, FR-09, FR-10, FR-14, FR-15, FR-16, FR-35: Crop Recommendation Engine with Fallback & Cost Breakdown
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;

    // 1. Fetch current farmer's profile data
    const [profileRows] = await pool.execute(
      'SELECT * FROM farmer_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (profileRows.length === 0 || !profileRows[0].land_size || parseFloat(profileRows[0].land_size) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'প্রথমে আপনার খামারের তথ্য ও জমির পরিমাপ সম্পূর্ণ করুন।'
      });
    }

    const farmer = profileRows[0];
    const landSize = parseFloat(farmer.land_size);
    const budget = farmer.budget !== null && farmer.budget !== undefined ? parseFloat(farmer.budget) : 0;
    const soilType = farmer.soil_type || 'দোআঁশ';
    const season = normalizeSeason(farmer.season);
    const hasPond = Boolean(farmer.has_pond);

    // Parse existing resources
    let resources = [];
    if (farmer.existing_resources) {
      try {
        resources = typeof farmer.existing_resources === 'string'
          ? JSON.parse(farmer.existing_resources)
          : farmer.existing_resources;
      } catch {
        resources = [];
      }
    }

    // Determine Organic Resource Synergy (FR-16)
    // If livestock (dairy) or poultry or compost exists, give a 15-20% discount on fertilizer costs
    const hasOrganicResource = resources.includes('dairy') || resources.includes('poultry') || resources.includes('compost');
    const fertilizerDiscountRate = hasOrganicResource ? 0.18 : 0.0; // 18% savings

    // 2. Fetch or load eligible crops from database / catalog
    let allCrops = DEFAULT_CROPS;
    try {
      const [dbCrops] = await pool.execute('SELECT * FROM crops');
      if (dbCrops.length > 0) {
        // Merge with our rich variety metadata if available
        allCrops = dbCrops.map((c) => {
          const matchedDefault = DEFAULT_CROPS.find((dc) => dc.crop_id === c.crop_id || dc.crop_name.toLowerCase() === c.crop_name.toLowerCase());
          return {
            crop_id: c.crop_id,
            crop_name: c.crop_name,
            bengali_name: c.bengali_name || (matchedDefault ? matchedDefault.bengali_name : c.crop_name),
            season: normalizeSeason(c.season),
            crop_category: c.crop_category || 'সাধারণ ফসল',
            recommended_soil: c.recommended_soil || 'দোআঁশ, এঁটেল, বেলে',
            water_requirement: c.water_requirement || 'মাঝারি',
            avg_cost_per_decimal: parseFloat(c.avg_cost_per_decimal || 400),
            avg_revenue_per_decimal: parseFloat(c.avg_revenue_per_decimal || 700),
            duration_days: matchedDefault ? matchedDefault.duration_days : 120,
            varieties: matchedDefault ? matchedDefault.varieties : []
          };
        });
      }
    } catch (dbErr) {
      console.warn('[Recommendations] Falling back to grounded memory catalog:', dbErr.message);
    }

    // 3. Exact Matching Filter:
    // Match: season === farmer.season AND recommended_soil contains farmer.soil_type
    let matchingCrops = allCrops.filter((crop) => {
      const seasonMatch = normalizeSeason(crop.season) === season;
      const soilMatch = crop.recommended_soil.includes(soilType);
      return seasonMatch && soilMatch;
    });

    let is_fallback = false;
    let fallback_reason = '';

    // 4. Fallback Logic (SRS FR-35):
    // If no exact match or if budget is strictly exceeded
    if (matchingCrops.length === 0) {
      is_fallback = true;
      fallback_reason = `${season} মৌসুমে ${soilType} মাটির জন্য নির্দিষ্ট বিকল্প শস্য নির্ধারণ করা হয়েছে।`;
      // Relaxed rule: match season only with adaptable soils
      matchingCrops = allCrops.filter((crop) => normalizeSeason(crop.season) === season);

      // If still empty, provide general low-cost crops
      if (matchingCrops.length === 0) {
        matchingCrops = allCrops.slice(0, 3);
        fallback_reason = 'বাজেট ও পরিবেশের উপযোগী বিকল্প শস্য সুপারিশ করা হলো।';
      }
    }

    // If farmer has an active budget > 0, check if crops fit or sort by affordability
    if (budget > 0) {
      const budgetFitting = matchingCrops.filter((c) => (c.avg_cost_per_decimal * landSize) <= budget * 1.15);
      if (budgetFitting.length > 0) {
        matchingCrops = budgetFitting;
      } else {
        is_fallback = true;
        fallback_reason = 'আপনার নির্ধারিত বাজেটের কাছাকাছি সাশ্রয়ী বিকল্প ফসলসমূহ প্রদর্শন করা হচ্ছে।';
      }
    }

    // 5. Compute Detailed Cost Breakdown & Margins (FR-14, FR-15)
    const recommendations = matchingCrops.map((crop) => {
      const baseCost = crop.avg_cost_per_decimal * landSize;
      const grossReturn = crop.avg_revenue_per_decimal * landSize;

      // Realistic Itemized Sub-Costs (FR-14)
      const baseSeedCost = Math.round(baseCost * 0.15);
      const standardFertilizerCost = Math.round(baseCost * 0.35);
      const fertilizerSavings = Math.round(standardFertilizerCost * fertilizerDiscountRate);
      const effectiveFertilizerCost = standardFertilizerCost - fertilizerSavings;
      const irrigationCost = Math.round(baseCost * 0.25);
      const laborAndOperations = Math.round(baseCost * 0.25);

      // Total Cost after applying organic synergy discount
      const totalEstimatedCost = baseSeedCost + effectiveFertilizerCost + irrigationCost + laborAndOperations;
      const netProfit = Math.round(grossReturn - totalEstimatedCost);
      const roiPercentage = totalEstimatedCost > 0 ? Math.round((netProfit / totalEstimatedCost) * 100) : 0;

      // Synergy Bonuses (FR-16)
      const synergy_badges = [];
      if (hasOrganicResource && fertilizerSavings > 0) {
        synergy_badges.push({
          type: 'ORGANIC_SAVINGS',
          text: `জৈব সার ব্যবহারের কারণে ৳${fertilizerSavings} সাশ্রয়`,
          savings_amount: fertilizerSavings
        });
      }
      if (hasPond) {
        synergy_badges.push({
          type: 'POND_SYNERGY',
          text: 'পুকুরপাড় ও পানির সমন্বিত ব্যবহার উপযোগী',
          savings_amount: 0
        });
      }

      return {
        crop_id: crop.crop_id,
        crop_name: crop.crop_name,
        bengali_name: crop.bengali_name,
        season: crop.season,
        crop_category: crop.crop_category,
        duration_days: crop.duration_days,
        recommended_soil: crop.recommended_soil,
        water_requirement: crop.water_requirement,
        cost_per_decimal: crop.avg_cost_per_decimal,
        return_per_decimal: crop.avg_revenue_per_decimal,
        total_estimated_cost: totalEstimatedCost,
        base_cost_before_savings: baseCost,
        total_gross_return: Math.round(grossReturn),
        projected_net_profit: netProfit,
        profit_margin_roi: roiPercentage,
        is_fallback: is_fallback,
        fallback_tag: is_fallback ? 'বাজেট বা মাটির উপযোগী বিকল্প সুপারিশ' : 'অনুকূল ও সর্বোত্তম সুপারিশ',
        cost_breakdown: {
          seed_cost: baseSeedCost,
          fertilizer_cost: effectiveFertilizerCost,
          standard_fertilizer_cost: standardFertilizerCost,
          fertilizer_savings: fertilizerSavings,
          irrigation_cost: irrigationCost,
          labor_and_operations: laborAndOperations
        },
        synergy_badges,
        varieties: crop.varieties || []
      };
    });

    // Sort by projected net profit descending
    recommendations.sort((a, b) => b.projected_net_profit - a.projected_net_profit);

    return res.status(200).json({
      success: true,
      count: recommendations.length,
      is_fallback,
      fallback_reason,
      farmer_summary: {
        district: farmer.district,
        upazila: farmer.upazila,
        land_size: landSize,
        soil_type: soilType,
        season: season,
        budget: budget,
        has_pond: hasPond,
        has_organic_resource: hasOrganicResource
      },
      recommendations
    });

  } catch (error) {
    console.error('[GET /api/recommendations Error]', error);
    return res.status(500).json({
      success: false,
      message: 'ফসলের সুপারিশ তৈরি করতে সার্ভারে ত্রুটি দেখা দিয়েছে।',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

