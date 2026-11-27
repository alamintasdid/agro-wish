/**
 * agroWish Backend - Crop Recommendation Engine, History, Feedback & Cost Breakdown API
 * SE-331 Software Engineering Design Capstone Project
 * 
 * SRS Reference:
 * - Section 5: FR-08, FR-09, FR-10, FR-11, FR-12, FR-13, FR-14, FR-15, FR-16,
 *              FR-21, FR-22, FR-23, FR-24, FR-27, FR-32, FR-34, FR-35
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { generateFullSrsRecommendation, normalizeSeason, soilMatches } = require('../services/recommendationEngine');
const { MIXED_CROPPING_DATABASE } = require('../services/mixedCroppingEngine');
const { calculateItemizedBudget, compareWithMonocultureBaseline, generateCultivationRoadmap } = require('../services/profitAndRoadmapEngine');
const { logAudit } = require('../utils/auditLogger');

/**
 * Loads all farm context and master reference tables needed by the SRS decision engine
 */
async function loadDecisionInputs(userId) {
  const [profileRows] = await pool.execute(
    'SELECT * FROM farmer_profiles WHERE user_id = ? LIMIT 1',
    [userId]
  );

  if (profileRows.length === 0 || !profileRows[0].land_size || parseFloat(profileRows[0].land_size) <= 0) {
    return { errorStatus: 400, errorMessage: 'প্রথমে আপনার খামারের তথ্য ও জমির পরিমাপ সম্পূর্ণ করুন।' };
  }

  const farmer = profileRows[0];

  const [resources] = await pool.execute(
    'SELECT * FROM resources WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );

  const [crops] = await pool.execute('SELECT * FROM crops ORDER BY crop_id ASC');
  const [varieties] = await pool.execute('SELECT * FROM crop_varieties ORDER BY variety_id ASC');
  const [costItems] = await pool.execute('SELECT * FROM cost_items ORDER BY cost_item_id ASC');
  const [integratedCombos] = await pool.execute('SELECT * FROM integrated_combinations ORDER BY combo_id ASC');
  const [wasteRules] = await pool.execute('SELECT * FROM waste_to_value_rules ORDER BY rule_id ASC');

  const varietiesByCrop = {};
  for (const v of varieties) {
    if (!varietiesByCrop[v.crop_id]) varietiesByCrop[v.crop_id] = [];
    varietiesByCrop[v.crop_id].push(v);
  }

  const costItemsByCrop = {};
  for (const ci of costItems) {
    if (!costItemsByCrop[ci.crop_id]) costItemsByCrop[ci.crop_id] = [];
    costItemsByCrop[ci.crop_id].push(ci);
  }

  return {
    farmer,
    resources,
    crops,
    varietiesByCrop,
    costItemsByCrop,
    integratedCombos,
    wasteRules
  };
}

/**
 * 1. GET /api/recommendations/history
 * FR-24, FR-27, FR-34: Fetch authenticated farmer's past recommendations with full traceability
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;

    const [recRows] = await pool.execute(
      `SELECT r.recommendation_id, r.user_id, r.request_data, r.recommendation_type,
              r.explanation_bn, r.uncertainty_note, r.expert_verification_notice,
              r.model_version, r.created_at,
              f.feedback_id, f.rating, f.is_helpful, f.comment AS feedback_comment, f.created_at AS feedback_at
       FROM recommendations r
       LEFT JOIN feedbacks f ON r.recommendation_id = f.recommendation_id AND f.user_id = ?
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC
       LIMIT 30`,
      [userId, userId]
    );

    if (recRows.length === 0) {
      return res.status(200).json({ success: true, count: 0, history: [] });
    }

    const recIds = recRows.map((r) => r.recommendation_id);
    const placeholders = recIds.map(() => '?').join(',');
    const [itemRows] = await pool.execute(
      `SELECT ri.*, c.crop_name, c.bengali_name AS crop_bengali_name, v.variety_name, v.bengali_name AS variety_bengali_name
       FROM recommendation_items ri
       LEFT JOIN crops c ON ri.crop_id = c.crop_id
       LEFT JOIN crop_varieties v ON ri.variety_id = v.variety_id
       WHERE ri.recommendation_id IN (${placeholders})
       ORDER BY ri.item_id ASC`,
      recIds
    );

    const itemsByRec = {};
    for (const item of itemRows) {
      if (!itemsByRec[item.recommendation_id]) itemsByRec[item.recommendation_id] = [];
      let parsedMeta = null;
      if (item.metadata) {
        try {
          parsedMeta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
        } catch {
          parsedMeta = null;
        }
      }
      itemsByRec[item.recommendation_id].push({
        ...item,
        est_cost_min: parseFloat(item.est_cost_min),
        est_cost_max: parseFloat(item.est_cost_max),
        est_return_min: parseFloat(item.est_return_min),
        est_return_max: parseFloat(item.est_return_max),
        confidence_score: parseFloat(item.confidence_score),
        expert_verification_needed: Boolean(item.expert_verification_needed),
        metadata: parsedMeta
      });
    }

    const history = recRows.map((rec) => {
      let reqData = {};
      try {
        reqData = typeof rec.request_data === 'string' ? JSON.parse(rec.request_data) : rec.request_data;
      } catch {
        reqData = {};
      }
      const items = itemsByRec[rec.recommendation_id] || [];
      return {
        recommendation_id: rec.recommendation_id,
        recommendation_type: rec.recommendation_type,
        model_version: rec.model_version,
        created_at: rec.created_at,
        request_data: reqData,
        explanation_bn: rec.explanation_bn,
        uncertainty_note: rec.uncertainty_note,
        expert_verification_notice: rec.expert_verification_notice,
        crop_options: items.filter((i) => i.item_type === 'CROP'),
        integrated_options: items.filter((i) => i.item_type === 'INTEGRATED'),
        waste_to_value_options: items.filter((i) => i.item_type === 'WASTE_TO_VALUE'),
        feedback: rec.feedback_id ? {
          feedback_id: rec.feedback_id,
          rating: rec.rating,
          is_helpful: rec.is_helpful !== null ? Boolean(rec.is_helpful) : rec.rating >= 4,
          comment: rec.feedback_comment,
          created_at: rec.feedback_at
        } : null
      };
    });

    return res.status(200).json({
      success: true,
      count: history.length,
      history
    });
  } catch (error) {
    console.error('[GET /api/recommendations/history Error]', error);
    return res.status(500).json({
      success: false,
      message: 'সুপারিশের ইতিহাস লোড করতে ব্যর্থ হয়েছে।'
    });
  }
});

/**
 * 2. POST /api/recommendations/generate
 * FR-08..FR-16, FR-21..FR-24, FR-34, FR-35:
 * Generates and persists comprehensive multi-option crop, integrated farming, and waste-to-value recommendations
 */
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;
    const inputs = await loadDecisionInputs(userId);
    if (inputs.errorStatus) {
      return res.status(inputs.errorStatus).json({ success: false, message: inputs.errorMessage });
    }

    // Optional per-request overrides (e.g. testing scenario budget/season/soil/water/land) without mutating profile
    const farmerSnapshot = {
      ...inputs.farmer,
      budget: req.body?.budget !== undefined && req.body.budget !== '' ? parseFloat(req.body.budget) : inputs.farmer.budget,
      season: req.body?.season || inputs.farmer.season,
      soil_type: req.body?.soil_type || inputs.farmer.soil_type,
      water_availability: req.body?.water_availability || inputs.farmer.water_availability,
      land_size: req.body?.land_size !== undefined && req.body.land_size !== '' ? parseFloat(req.body.land_size) : inputs.farmer.land_size,
      risk_preference: req.body?.risk_preference || inputs.farmer.risk_preference
    };

    const result = generateFullSrsRecommendation({
      ...inputs,
      farmer: farmerSnapshot
    });

    // Persist trace record in `recommendations` (FR-24, FR-34)
    const requestSnapshot = {
      ...result.farmer_summary,
      resources_count: inputs.resources.length,
      resources: inputs.resources.map((r) => ({
        resource_name: r.resource_name,
        resource_type: r.resource_type,
        quantity: parseFloat(r.quantity),
        unit: r.unit
      }))
    };

    const [recInsert] = await pool.execute(
      `INSERT INTO recommendations
       (user_id, request_data, recommendation_type, explanation_bn, uncertainty_note, expert_verification_notice, model_version)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        JSON.stringify(requestSnapshot),
        result.recommendation_type,
        result.explanation_bn,
        result.uncertainty_note.slice(0, 255),
        result.expert_verification_notice,
        result.model_version
      ]
    );

    const recommendationId = recInsert.insertId;

    // Persist comparable items in `recommendation_items` & `farm_options`
    for (const c of result.crop_options) {
      await pool.execute(
        `INSERT INTO recommendation_items
         (recommendation_id, item_type, title, crop_id, variety_id, est_cost_min, est_cost_max, est_return_min, est_return_max, confidence_score, reason, assumptions, expert_verification_needed, metadata)
         VALUES (?, 'CROP', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          recommendationId,
          `${c.bengali_name} (${c.crop_name})`,
          c.crop_id || null,
          c.variety_id || null,
          c.est_cost_min,
          c.est_cost_max,
          c.est_return_min,
          c.est_return_max,
          c.confidence_score,
          c.reason,
          c.assumptions,
          c.expert_verification_needed ? 1 : 0,
          JSON.stringify({ cost_breakdown: c.cost_breakdown, varieties: c.varieties, synergy_badges: c.synergy_badges })
        ]
      );

      if (c.crop_id) {
        await pool.execute(
          `INSERT INTO farm_options
           (recommendation_id, crop_id, variety_id, estimated_cost, potential_return_min, potential_return_max, assumptions)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            recommendationId,
            c.crop_id,
            c.variety_id || null,
            c.total_estimated_cost,
            c.est_return_min,
            c.est_return_max,
            c.assumptions
          ]
        );
      }
    }

    for (const combo of result.integrated_options) {
      await pool.execute(
        `INSERT INTO recommendation_items
         (recommendation_id, item_type, title, combo_id, est_cost_min, est_cost_max, est_return_min, est_return_max, confidence_score, reason, assumptions, safety_note, expert_verification_needed, metadata)
         VALUES (?, 'INTEGRATED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          recommendationId,
          combo.title,
          combo.combo_id || null,
          combo.est_cost_min,
          combo.est_cost_max,
          combo.est_return_min,
          combo.est_return_max,
          combo.confidence_score,
          combo.reason,
          combo.assumptions,
          combo.risk_note || combo.safety_note,
          combo.expert_verification_needed ? 1 : 0,
          JSON.stringify({ description: combo.description, compatibility_rule: combo.compatibility_rule, matched_resources: combo.matched_resources })
        ]
      );
    }

    for (const rule of result.waste_to_value_options) {
      await pool.execute(
        `INSERT INTO recommendation_items
         (recommendation_id, item_type, title, rule_id, est_cost_min, est_cost_max, est_return_min, est_return_max, confidence_score, reason, assumptions, safety_note, expert_verification_needed, metadata)
         VALUES (?, 'WASTE_TO_VALUE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          recommendationId,
          rule.title,
          rule.rule_id || null,
          rule.est_cost_min,
          rule.est_cost_max,
          rule.est_return_min,
          rule.est_return_max,
          rule.confidence_score,
          rule.reason,
          rule.assumptions,
          rule.safety_note,
          rule.expert_verification_needed ? 1 : 0,
          JSON.stringify({ source_activity: rule.source_activity, by_product: rule.by_product, target_activity: rule.target_activity, usage_method: rule.usage_method })
        ]
      );
    }

    await logAudit(userId, 'GENERATE_RECOMMENDATION', `recommendations:${recommendationId}`, req, {
      season: result.farmer_summary.season,
      land_size: result.farmer_summary.land_size,
      is_fallback: result.is_fallback
    });

    return res.status(201).json({
      success: true,
      recommendation_id: recommendationId,
      count: result.crop_options.length,
      recommendations: result.crop_options, // backward-compatible key
      ...result
    });
  } catch (error) {
    console.error('[POST /api/recommendations/generate Error]', error);
    return res.status(500).json({
      success: false,
      message: 'সমন্বিত সুপারিশ তৈরি করতে সার্ভারে ত্রুটি দেখা দিয়েছে।',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 3. GET /api/recommendations
 * Preserved backward-compatible endpoint returning current recommendations plus integrated & waste-to-value options
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;
    const inputs = await loadDecisionInputs(userId);
    if (inputs.errorStatus) {
      return res.status(inputs.errorStatus).json({ success: false, message: inputs.errorMessage });
    }

    const result = generateFullSrsRecommendation(inputs);

    return res.status(200).json({
      success: true,
      count: result.crop_options.length,
      is_fallback: result.is_fallback,
      fallback_reason: result.fallback_reason,
      farmer_summary: result.farmer_summary,
      primary_recommendation: result.primary_recommendation,
      primary_type: result.primary_type,
      mixed_crop_options: result.mixed_crop_options,
      alternative_single_crops: result.alternative_single_crops,
      profit_comparison: result.profit_comparison,
      cultivation_roadmap: result.cultivation_roadmap,
      recommendations: result.crop_options,
      crop_options: result.crop_options,
      integrated_options: result.integrated_options,
      waste_to_value_options: result.waste_to_value_options,
      explanation_bn: result.explanation_bn,
      uncertainty_note: result.uncertainty_note,
      expert_verification_notice: result.expert_verification_notice,
      model_version: result.model_version
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

/**
 * 4. GET /api/recommendations/:id
 * FR-24, FR-27: Retrieve a specific past recommendation owned by the logged-in farmer
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;
    const recId = parseInt(req.params.id, 10);
    if (isNaN(recId) || recId <= 0) {
      return res.status(400).json({ success: false, message: 'অবৈধ সুপারিশ আইডি।' });
    }

    const [recs] = await pool.execute(
      'SELECT * FROM recommendations WHERE recommendation_id = ? AND user_id = ? LIMIT 1',
      [recId, userId]
    );
    if (recs.length === 0) {
      return res.status(404).json({ success: false, message: 'সুপারিশটি খুঁজে পাওয়া যায়নি।' });
    }

    const [items] = await pool.execute(
      'SELECT * FROM recommendation_items WHERE recommendation_id = ? ORDER BY item_id ASC',
      [recId]
    );

    const [fb] = await pool.execute(
      'SELECT * FROM feedbacks WHERE recommendation_id = ? AND user_id = ? LIMIT 1',
      [recId, userId]
    );

    return res.status(200).json({
      success: true,
      recommendation: {
        ...recs[0],
        request_data: typeof recs[0].request_data === 'string' ? JSON.parse(recs[0].request_data) : recs[0].request_data,
        items,
        feedback: fb[0] || null
      }
    });
  } catch (error) {
    console.error('[GET /api/recommendations/:id Error]', error);
    return res.status(500).json({ success: false, message: 'সুপারিশ লোড করতে সমস্যা হয়েছে।' });
  }
});

/**
 * 5. POST /api/recommendations/:id/feedback
 * FR-27, FR-32: Save farmer usefulness rating & optional comment for a recommendation
 */
router.post('/:id/feedback', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;
    const recId = parseInt(req.params.id, 10);
    if (isNaN(recId) || recId <= 0) {
      return res.status(400).json({ success: false, message: 'অবৈধ সুপারিশ আইডি।' });
    }

    // Verify ownership (FR-27)
    const [recRows] = await pool.execute(
      'SELECT recommendation_id FROM recommendations WHERE recommendation_id = ? AND user_id = ? LIMIT 1',
      [recId, userId]
    );
    if (recRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'সংশ্লিষ্ট সুপারিশটি খুঁজে পাওয়া যায়নি অথবা আপনার অনুমতি নেই।'
      });
    }

    const { rating, is_helpful, comment } = req.body;
    let cleanRating = parseInt(rating, 10);
    let cleanHelpful = is_helpful !== undefined ? Boolean(is_helpful) : null;

    if (isNaN(cleanRating)) {
      if (cleanHelpful === true) cleanRating = 5;
      else if (cleanHelpful === false) cleanRating = 2;
      else {
        return res.status(400).json({
          success: false,
          message: 'অনুগ্রহ করে ১ থেকে ৫ রেটিং অথবা সহায়ক হয়েছে কিনা নির্বাচন করুন।'
        });
      }
    }

    if (cleanRating < 1 || cleanRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'রেটিং অবশ্যই ১ থেকে ৫ এর মধ্যে হতে হবে।'
      });
    }

    if (cleanHelpful === null) {
      cleanHelpful = cleanRating >= 4;
    }

    const cleanComment = comment && typeof comment === 'string' ? comment.trim().slice(0, 1000) : null;

    await pool.execute(
      `INSERT INTO feedbacks (recommendation_id, user_id, rating, is_helpful, comment)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), is_helpful = VALUES(is_helpful), comment = VALUES(comment), created_at = CURRENT_TIMESTAMP`,
      [recId, userId, cleanRating, cleanHelpful ? 1 : 0, cleanComment]
    );

    await logAudit(userId, 'SUBMIT_FEEDBACK', `recommendations:${recId}`, req, {
      rating: cleanRating,
      is_helpful: cleanHelpful
    });

    return res.status(200).json({
      success: true,
      message: 'আপনার মূল্যবান মতামতের জন্য ধন্যবাদ! এটি ভবিষ্যতের পরামর্শ উন্নত করতে সাহায্য করবে।',
      feedback: {
        recommendation_id: recId,
        rating: cleanRating,
        is_helpful: cleanHelpful,
        comment: cleanComment
      }
    });
  } catch (error) {
    console.error('[POST /api/recommendations/:id/feedback Error]', error);
    return res.status(500).json({
      success: false,
      message: 'মতামত সংরক্ষণ করতে সার্ভারে সমস্যা হয়েছে।'
    });
  }
});

/**
 * 5. GET /api/recommendations/mixed-crops
 * Returns master list of all scientifically validated mixed cropping combinations in Bangladesh
 */
router.get('/mixed-crops', (req, res) => {
  return res.status(200).json({
    success: true,
    count: MIXED_CROPPING_DATABASE.length,
    combinations: MIXED_CROPPING_DATABASE
  });
});

/**
 * 6. POST /api/recommendations/profit-analysis
 * On-demand side-by-side profit analysis for customized land size and crop choice
 */
router.post('/profit-analysis', authenticateToken, (req, res) => {
  try {
    const { land_size = 50, cost_per_decimal = 600, expected_revenue_per_decimal = 1300, baseline_cost_per_decimal = 400, baseline_revenue_per_decimal = 700 } = req.body;
    const land = Math.max(0.5, parseFloat(land_size) || 1);

    const mixedBudget = calculateItemizedBudget(cost_per_decimal, land);
    const mixedRev = expected_revenue_per_decimal * land;
    const mixedProfit = mixedRev - mixedBudget.total_cost;

    const baselineTotalCost = baseline_cost_per_decimal * land;
    const baselineRev = baseline_revenue_per_decimal * land;
    const baselineProfit = baselineRev - baselineTotalCost;

    const profitDiff = mixedProfit - baselineProfit;
    const improvementPct = baselineProfit > 0 ? parseFloat(((profitDiff / baselineProfit) * 100).toFixed(1)) : 0;

    const comparison = compareWithMonocultureBaseline(
      {
        total_cost: mixedBudget.total_cost,
        total_return: mixedRev,
        est_net_profit: mixedProfit,
        ler: 1.35
      },
      {
        total_cost: baselineTotalCost,
        total_return: baselineRev,
        est_net_profit: baselineProfit
      }
    );

    return res.status(200).json({
      success: true,
      land_decimals: land,
      mixed_cropping: {
        total_investment: mixedBudget.total_cost,
        expected_revenue: mixedRev,
        net_profit: mixedProfit,
        roi_percentage: mixedBudget.total_cost > 0 ? parseFloat(((mixedProfit / mixedBudget.total_cost) * 100).toFixed(1)) : 0,
        itemized_budget: mixedBudget.breakdown
      },
      baseline_monoculture: {
        total_investment: baselineTotalCost,
        expected_revenue: baselineRev,
        net_profit: baselineProfit,
        roi_percentage: baselineTotalCost > 0 ? parseFloat(((baselineProfit / baselineTotalCost) * 100).toFixed(1)) : 0
      },
      comparison: {
        profit_difference: profitDiff,
        improvement_percentage: improvementPct,
        ...comparison
      },
      sensitivity_scenarios: comparison.sensitivity_scenarios || [],
      cash_flow_timeline: comparison.cash_flow_timeline || []
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'মুনাফা বিশ্লেষণ গণনায় ত্রুটি।' });
  }
});

module.exports = router;
