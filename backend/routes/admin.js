/**
 * agroWish Backend - Admin Management & Audit Logs API
 * SRS Reference:
 * - Section 5: FR-02 (RBAC Admin Only), FR-07 (Validation),
 *              FR-25 (Crop/Variety/Cost CRUD), FR-26 (Rules & Knowledge Base CRUD),
 *              FR-33 (Automatic Audit Logging)
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, adminMiddleware } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

// Strictly require both valid JWT AND ADMIN role (FR-02)
router.use(authenticateToken);
router.use(adminMiddleware);

const VALID_SEASONS = ['Kharif-1', 'Kharif-2', 'Rabi', 'Year-round'];
const VALID_COST_CATEGORIES = ['seed', 'fertilizer', 'irrigation', 'labor', 'pesticide', 'other'];

/**
 * GET /api/admin/stats
 * Overview metrics for Admin Panel dashboard
 */
router.get('/stats', async (req, res) => {
  try {
    const [[users]] = await pool.execute('SELECT COUNT(*) AS count FROM users');
    const [[crops]] = await pool.execute('SELECT COUNT(*) AS count FROM crops');
    const [[varieties]] = await pool.execute('SELECT COUNT(*) AS count FROM crop_varieties');
    const [[costItems]] = await pool.execute('SELECT COUNT(*) AS count FROM cost_items');
    const [[combos]] = await pool.execute('SELECT COUNT(*) AS count FROM integrated_combinations');
    const [[wasteRules]] = await pool.execute('SELECT COUNT(*) AS count FROM waste_to_value_rules');
    const [[knowledge]] = await pool.execute('SELECT COUNT(*) AS count FROM knowledge_documents');
    const [[recs]] = await pool.execute('SELECT COUNT(*) AS count FROM recommendations');
    const [[audits]] = await pool.execute('SELECT COUNT(*) AS count FROM audit_logs');

    return res.status(200).json({
      success: true,
      stats: {
        users: users.count,
        crops: crops.count,
        varieties: varieties.count,
        cost_items: costItems.count,
        integrated_combinations: combos.count,
        waste_rules: wasteRules.count,
        knowledge_documents: knowledge.count,
        recommendations: recs.count,
        audit_logs: audits.count
      }
    });
  } catch (error) {
    console.error('[GET /api/admin/stats Error]', error);
    return res.status(500).json({ success: false, message: 'পরিসংখ্যান লোড করতে ব্যর্থ হয়েছে।' });
  }
});

// =====================================================================
// 1. CROPS CRUD (/api/admin/crops)
// =====================================================================

router.get('/crops', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM crops ORDER BY crop_id ASC');
    return res.status(200).json({ success: true, crops: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'ফসলের তালিকা লোড করতে সমস্যা হয়েছে।' });
  }
});

router.post('/crops', async (req, res) => {
  try {
    const { crop_name, bengali_name, season, crop_category, recommended_soil, water_requirement, avg_cost_per_decimal, avg_revenue_per_decimal } = req.body;

    if (!crop_name || !bengali_name || !recommended_soil || !water_requirement) {
      return res.status(400).json({ success: false, message: 'ফসলের ইংরেজি নাম, বাংলা নাম, মাটি ও পানির চাহিদা আবশ্যক।' });
    }
    const cleanSeason = VALID_SEASONS.includes(season) ? season : 'Rabi';
    const cleanCost = parseFloat(avg_cost_per_decimal);
    const cleanRev = parseFloat(avg_revenue_per_decimal);
    if (isNaN(cleanCost) || cleanCost < 0 || isNaN(cleanRev) || cleanRev < 0) {
      return res.status(400).json({ success: false, message: 'গড় খরচ এবং আয় অবশ্যই অ-ঋণাত্মক সংখ্যা হতে হবে।' });
    }

    const [ins] = await pool.execute(
      `INSERT INTO crops (crop_name, bengali_name, season, crop_category, recommended_soil, water_requirement, avg_cost_per_decimal, avg_revenue_per_decimal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(crop_name).trim(),
        String(bengali_name).trim(),
        cleanSeason,
        crop_category ? String(crop_category).trim() : 'Cereal',
        String(recommended_soil).trim(),
        String(water_requirement).trim(),
        cleanCost,
        cleanRev
      ]
    );

    const [rows] = await pool.execute('SELECT * FROM crops WHERE crop_id = ? LIMIT 1', [ins.insertId]);
    await logAudit(req.user.user_id, 'CREATE_CROP', `crops:${ins.insertId}`, req, { crop_name, bengali_name });

    return res.status(201).json({ success: true, message: 'নতুন ফসল যোগ করা হয়েছে।', crop: rows[0] });
  } catch (error) {
    console.error('[POST /api/admin/crops Error]', error);
    return res.status(500).json({ success: false, message: 'ফসল সংরক্ষণ করতে সমস্যা হয়েছে।' });
  }
});

router.put('/crops/:id', async (req, res) => {
  try {
    const cropId = parseInt(req.params.id, 10);
    const [existing] = await pool.execute('SELECT * FROM crops WHERE crop_id = ? LIMIT 1', [cropId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'ফসল খুঁজে পাওয়া যায়নি।' });
    }
    const c = existing[0];
    const {
      crop_name = c.crop_name,
      bengali_name = c.bengali_name,
      season = c.season,
      crop_category = c.crop_category,
      recommended_soil = c.recommended_soil,
      water_requirement = c.water_requirement,
      avg_cost_per_decimal = c.avg_cost_per_decimal,
      avg_revenue_per_decimal = c.avg_revenue_per_decimal
    } = req.body;

    const cleanSeason = VALID_SEASONS.includes(season) ? season : c.season;
    const cleanCost = parseFloat(avg_cost_per_decimal);
    const cleanRev = parseFloat(avg_revenue_per_decimal);
    if (isNaN(cleanCost) || cleanCost < 0 || isNaN(cleanRev) || cleanRev < 0) {
      return res.status(400).json({ success: false, message: 'গড় খরচ এবং আয় সঠিক সংখ্যা হতে হবে।' });
    }

    await pool.execute(
      `UPDATE crops
       SET crop_name = ?, bengali_name = ?, season = ?, crop_category = ?, recommended_soil = ?, water_requirement = ?, avg_cost_per_decimal = ?, avg_revenue_per_decimal = ?
       WHERE crop_id = ?`,
      [String(crop_name).trim(), String(bengali_name).trim(), cleanSeason, String(crop_category).trim(), String(recommended_soil).trim(), String(water_requirement).trim(), cleanCost, cleanRev, cropId]
    );

    const [updated] = await pool.execute('SELECT * FROM crops WHERE crop_id = ? LIMIT 1', [cropId]);
    await logAudit(req.user.user_id, 'UPDATE_CROP', `crops:${cropId}`, req, { crop_name, bengali_name });

    return res.status(200).json({ success: true, message: 'ফসলের তথ্য হালনাগাদ হয়েছে।', crop: updated[0] });
  } catch (error) {
    console.error('[PUT /api/admin/crops/:id Error]', error);
    return res.status(500).json({ success: false, message: 'ফসল হালনাগাদ করতে সমস্যা হয়েছে।' });
  }
});

router.delete('/crops/:id', async (req, res) => {
  try {
    const cropId = parseInt(req.params.id, 10);
    const [result] = await pool.execute('DELETE FROM crops WHERE crop_id = ?', [cropId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'ফসল খুঁজে পাওয়া যায়নি।' });
    }
    await logAudit(req.user.user_id, 'DELETE_CROP', `crops:${cropId}`, req);
    return res.status(200).json({ success: true, message: 'ফসলটি মুছে ফেলা হয়েছে।' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'ফসল মুছতে সমস্যা হয়েছে।' });
  }
});

// =====================================================================
// 2. CROP VARIETIES CRUD (/api/admin/varieties)
// =====================================================================

router.get('/varieties', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT v.*, c.crop_name, c.bengali_name AS crop_bengali_name
       FROM crop_varieties v
       LEFT JOIN crops c ON v.crop_id = c.crop_id
       ORDER BY v.variety_id ASC`
    );
    return res.status(200).json({ success: true, varieties: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'জাতের তালিকা লোড করতে সমস্যা হয়েছে।' });
  }
});

router.post('/varieties', async (req, res) => {
  try {
    const { crop_id, variety_name, bengali_name, duration_days, yield_per_decimal_kg, recommended_regions, pest_resistance_notes } = req.body;
    const cleanCropId = parseInt(crop_id, 10);
    const cleanDuration = parseInt(duration_days, 10);
    const cleanYield = parseFloat(yield_per_decimal_kg);

    if (isNaN(cleanCropId) || !variety_name || isNaN(cleanDuration) || cleanDuration <= 0 || isNaN(cleanYield) || cleanYield <= 0) {
      return res.status(400).json({ success: false, message: 'ফসল, জাতের নাম, মেয়াদ (দিন) এবং ফলন সঠিকভাবে দিন।' });
    }

    const [ins] = await pool.execute(
      `INSERT INTO crop_varieties (crop_id, variety_name, bengali_name, duration_days, yield_per_decimal_kg, recommended_regions, pest_resistance_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cleanCropId, String(variety_name).trim(), bengali_name ? String(bengali_name).trim() : null, cleanDuration, cleanYield, recommended_regions || 'All Bangladesh', pest_resistance_notes || null]
    );

    const [rows] = await pool.execute('SELECT * FROM crop_varieties WHERE variety_id = ? LIMIT 1', [ins.insertId]);
    await logAudit(req.user.user_id, 'CREATE_VARIETY', `crop_varieties:${ins.insertId}`, req, { variety_name, crop_id: cleanCropId });

    return res.status(201).json({ success: true, message: 'নতুন ফসলের জাত যোগ হয়েছে।', variety: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'জাত সংরক্ষণ করতে সমস্যা হয়েছে।' });
  }
});

router.put('/varieties/:id', async (req, res) => {
  try {
    const varietyId = parseInt(req.params.id, 10);
    const [existing] = await pool.execute('SELECT * FROM crop_varieties WHERE variety_id = ? LIMIT 1', [varietyId]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'জাত খুঁজে পাওয়া যায়নি।' });

    const v = existing[0];
    const {
      crop_id = v.crop_id,
      variety_name = v.variety_name,
      bengali_name = v.bengali_name,
      duration_days = v.duration_days,
      yield_per_decimal_kg = v.yield_per_decimal_kg,
      recommended_regions = v.recommended_regions,
      pest_resistance_notes = v.pest_resistance_notes
    } = req.body;

    await pool.execute(
      `UPDATE crop_varieties
       SET crop_id = ?, variety_name = ?, bengali_name = ?, duration_days = ?, yield_per_decimal_kg = ?, recommended_regions = ?, pest_resistance_notes = ?
       WHERE variety_id = ?`,
      [parseInt(crop_id, 10), String(variety_name).trim(), bengali_name, parseInt(duration_days, 10), parseFloat(yield_per_decimal_kg), recommended_regions, pest_resistance_notes, varietyId]
    );

    const [updated] = await pool.execute('SELECT * FROM crop_varieties WHERE variety_id = ? LIMIT 1', [varietyId]);
    await logAudit(req.user.user_id, 'UPDATE_VARIETY', `crop_varieties:${varietyId}`, req, { variety_name });

    return res.status(200).json({ success: true, message: 'জাতের তথ্য হালনাগাদ হয়েছে।', variety: updated[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'জাত হালনাগাদ করতে সমস্যা হয়েছে।' });
  }
});

router.delete('/varieties/:id', async (req, res) => {
  try {
    const varietyId = parseInt(req.params.id, 10);
    const [result] = await pool.execute('DELETE FROM crop_varieties WHERE variety_id = ?', [varietyId]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'জাত খুঁজে পাওয়া যায়নি।' });
    await logAudit(req.user.user_id, 'DELETE_VARIETY', `crop_varieties:${varietyId}`, req);
    return res.status(200).json({ success: true, message: 'জাতটি মুছে ফেলা হয়েছে।' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'জাত মুছতে সমস্যা হয়েছে।' });
  }
});

// =====================================================================
// 3. COST ITEMS CRUD (/api/admin/cost-items)
// =====================================================================

router.get('/cost-items', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT ci.*, c.crop_name, c.bengali_name AS crop_bengali_name
       FROM cost_items ci
       LEFT JOIN crops c ON ci.crop_id = c.crop_id
       ORDER BY ci.crop_id ASC, ci.cost_item_id ASC`
    );
    return res.status(200).json({ success: true, cost_items: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'খরচের উপকরণ লোড করতে সমস্যা হয়েছে।' });
  }
});

router.post('/cost-items', async (req, res) => {
  try {
    const { crop_id, item_name, item_category, cost_min_per_decimal, cost_max_per_decimal, unit_note } = req.body;
    const cleanCropId = parseInt(crop_id, 10);
    const minC = parseFloat(cost_min_per_decimal);
    const maxC = parseFloat(cost_max_per_decimal);

    if (isNaN(cleanCropId) || !item_name || isNaN(minC) || minC < 0 || isNaN(maxC) || maxC < minC) {
      return res.status(400).json({ success: false, message: 'সঠিক ফসল, উপকরণের নাম এবং সর্বনিম্ন/সর্বোচ্চ ব্যয় প্রদান করুন।' });
    }
    const cleanCat = VALID_COST_CATEGORIES.includes(item_category) ? item_category : 'other';

    const [ins] = await pool.execute(
      `INSERT INTO cost_items (crop_id, item_name, item_category, cost_min_per_decimal, cost_max_per_decimal, unit_note)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [cleanCropId, String(item_name).trim(), cleanCat, minC, maxC, unit_note || 'প্রতি শতক (টাকা)']
    );

    const [rows] = await pool.execute('SELECT * FROM cost_items WHERE cost_item_id = ? LIMIT 1', [ins.insertId]);
    await logAudit(req.user.user_id, 'CREATE_COST_ITEM', `cost_items:${ins.insertId}`, req, { item_name, crop_id: cleanCropId });

    return res.status(201).json({ success: true, message: 'খরচের উপকরণ যুক্ত হয়েছে।', cost_item: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'খরচের উপকরণ সংরক্ষণে সমস্যা হয়েছে।' });
  }
});

router.put('/cost-items/:id', async (req, res) => {
  try {
    const itemId = parseInt(req.params.id, 10);
    const [existing] = await pool.execute('SELECT * FROM cost_items WHERE cost_item_id = ? LIMIT 1', [itemId]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'খরচের উপকরণ খুঁজে পাওয়া যায়নি।' });

    const ci = existing[0];
    const {
      crop_id = ci.crop_id,
      item_name = ci.item_name,
      item_category = ci.item_category,
      cost_min_per_decimal = ci.cost_min_per_decimal,
      cost_max_per_decimal = ci.cost_max_per_decimal,
      unit_note = ci.unit_note
    } = req.body;

    const cleanCat = VALID_COST_CATEGORIES.includes(item_category) ? item_category : ci.item_category;

    await pool.execute(
      `UPDATE cost_items
       SET crop_id = ?, item_name = ?, item_category = ?, cost_min_per_decimal = ?, cost_max_per_decimal = ?, unit_note = ?
       WHERE cost_item_id = ?`,
      [parseInt(crop_id, 10), String(item_name).trim(), cleanCat, parseFloat(cost_min_per_decimal), parseFloat(cost_max_per_decimal), unit_note, itemId]
    );

    const [updated] = await pool.execute('SELECT * FROM cost_items WHERE cost_item_id = ? LIMIT 1', [itemId]);
    await logAudit(req.user.user_id, 'UPDATE_COST_ITEM', `cost_items:${itemId}`, req, { item_name });

    return res.status(200).json({ success: true, message: 'খরচের উপকরণ হালনাগাদ হয়েছে।', cost_item: updated[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'হালনাগাদ করতে সমস্যা হয়েছে।' });
  }
});

router.delete('/cost-items/:id', async (req, res) => {
  try {
    const itemId = parseInt(req.params.id, 10);
    const [result] = await pool.execute('DELETE FROM cost_items WHERE cost_item_id = ?', [itemId]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'উপকরণ খুঁজে পাওয়া যায়নি।' });
    await logAudit(req.user.user_id, 'DELETE_COST_ITEM', `cost_items:${itemId}`, req);
    return res.status(200).json({ success: true, message: 'খরচের উপকরণটি মুছে ফেলা হয়েছে।' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'মুছে ফেলতে সমস্যা হয়েছে।' });
  }
});

// =====================================================================
// 4. INTEGRATED COMBINATIONS CRUD (/api/admin/integrated-combinations)
// =====================================================================

router.get('/integrated-combinations', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM integrated_combinations ORDER BY combo_id ASC');
    return res.status(200).json({ success: true, combinations: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'সমন্বিত চাষ তালিকা লোড করতে সমস্যা হয়েছে।' });
  }
});

router.post('/integrated-combinations', async (req, res) => {
  try {
    const { combo_name, description, compatibility_rule, est_cost_min = 5000, est_cost_max = 15000, est_return_min = 12000, est_return_max = 28000, risk_note, expert_verification_needed = true } = req.body;
    if (!combo_name || !description || !compatibility_rule || !risk_note) {
      return res.status(400).json({ success: false, message: 'সমন্বিত চাষের নাম, বিবরণ, সামঞ্জস্য বিধি এবং ঝুঁকি নোট আবশ্যক।' });
    }

    const [ins] = await pool.execute(
      `INSERT INTO integrated_combinations (combo_name, description, compatibility_rule, est_cost_min, est_cost_max, est_return_min, est_return_max, risk_note, expert_verification_needed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [String(combo_name).trim(), String(description).trim(), String(compatibility_rule).trim(), parseFloat(est_cost_min) || 0, parseFloat(est_cost_max) || 0, parseFloat(est_return_min) || 0, parseFloat(est_return_max) || 0, String(risk_note).trim(), expert_verification_needed ? 1 : 0]
    );

    const [rows] = await pool.execute('SELECT * FROM integrated_combinations WHERE combo_id = ? LIMIT 1', [ins.insertId]);
    await logAudit(req.user.user_id, 'CREATE_INTEGRATED_COMBO', `integrated_combinations:${ins.insertId}`, req, { combo_name });

    return res.status(201).json({ success: true, message: 'নতুন সমন্বিত চাষ বিধি যুক্ত হয়েছে।', combination: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'সংরক্ষণ করতে সমস্যা হয়েছে।' });
  }
});

router.put('/integrated-combinations/:id', async (req, res) => {
  try {
    const comboId = parseInt(req.params.id, 10);
    const [existing] = await pool.execute('SELECT * FROM integrated_combinations WHERE combo_id = ? LIMIT 1', [comboId]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'সমন্বিত বিধি খুঁজে পাওয়া যায়নি।' });

    const c = existing[0];
    const {
      combo_name = c.combo_name,
      description = c.description,
      compatibility_rule = c.compatibility_rule,
      est_cost_min = c.est_cost_min,
      est_cost_max = c.est_cost_max,
      est_return_min = c.est_return_min,
      est_return_max = c.est_return_max,
      risk_note = c.risk_note,
      expert_verification_needed = c.expert_verification_needed
    } = req.body;

    await pool.execute(
      `UPDATE integrated_combinations
       SET combo_name = ?, description = ?, compatibility_rule = ?, est_cost_min = ?, est_cost_max = ?, est_return_min = ?, est_return_max = ?, risk_note = ?, expert_verification_needed = ?
       WHERE combo_id = ?`,
      [String(combo_name).trim(), String(description).trim(), String(compatibility_rule).trim(), parseFloat(est_cost_min), parseFloat(est_cost_max), parseFloat(est_return_min), parseFloat(est_return_max), String(risk_note).trim(), expert_verification_needed ? 1 : 0, comboId]
    );

    const [updated] = await pool.execute('SELECT * FROM integrated_combinations WHERE combo_id = ? LIMIT 1', [comboId]);
    await logAudit(req.user.user_id, 'UPDATE_INTEGRATED_COMBO', `integrated_combinations:${comboId}`, req, { combo_name });

    return res.status(200).json({ success: true, message: 'সমন্বিত চাষ বিধি হালনাগাদ হয়েছে।', combination: updated[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'হালনাগাদ করতে সমস্যা হয়েছে।' });
  }
});

router.delete('/integrated-combinations/:id', async (req, res) => {
  try {
    const comboId = parseInt(req.params.id, 10);
    const [result] = await pool.execute('DELETE FROM integrated_combinations WHERE combo_id = ?', [comboId]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'সমন্বিত বিধি খুঁজে পাওয়া যায়নি।' });
    await logAudit(req.user.user_id, 'DELETE_INTEGRATED_COMBO', `integrated_combinations:${comboId}`, req);
    return res.status(200).json({ success: true, message: 'সমন্বিত চাষ বিধি মুছে ফেলা হয়েছে।' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'মুছতে সমস্যা হয়েছে।' });
  }
});

// =====================================================================
// 5. WASTE-TO-VALUE RULES CRUD (/api/admin/waste-rules)
// =====================================================================

router.get('/waste-rules', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM waste_to_value_rules ORDER BY rule_id ASC');
    return res.status(200).json({ success: true, waste_rules: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'বর্জ্য-থেকে-সম্পদ বিধি লোড করতে সমস্যা হয়েছে।' });
  }
});

router.post('/waste-rules', async (req, res) => {
  try {
    const { source_activity, by_product, target_activity, usage_method, safety_note, est_cost_min = 500, est_cost_max = 3000, est_return_min = 2000, est_return_max = 8000, expert_verification_needed = true } = req.body;
    if (!source_activity || !by_product || !target_activity || !usage_method || !safety_note) {
      return res.status(400).json({ success: false, message: 'উৎস, উপজাত, লক্ষ্য কার্যক্রম, ব্যবহার পদ্ধতি এবং নিরাপত্তা সতর্কতা আবশ্যক।' });
    }

    const [ins] = await pool.execute(
      `INSERT INTO waste_to_value_rules (source_activity, by_product, target_activity, usage_method, safety_note, est_cost_min, est_cost_max, est_return_min, est_return_max, expert_verification_needed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [String(source_activity).trim(), String(by_product).trim(), String(target_activity).trim(), String(usage_method).trim(), String(safety_note).trim(), parseFloat(est_cost_min) || 0, parseFloat(est_cost_max) || 0, parseFloat(est_return_min) || 0, parseFloat(est_return_max) || 0, expert_verification_needed ? 1 : 0]
    );

    const [rows] = await pool.execute('SELECT * FROM waste_to_value_rules WHERE rule_id = ? LIMIT 1', [ins.insertId]);
    await logAudit(req.user.user_id, 'CREATE_WASTE_RULE', `waste_to_value_rules:${ins.insertId}`, req, { by_product, target_activity });

    return res.status(201).json({ success: true, message: 'নতুন বর্জ্য-থেকে-সম্পদ বিধি যুক্ত হয়েছে।', waste_rule: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'সংরক্ষণ করতে সমস্যা হয়েছে।' });
  }
});

router.put('/waste-rules/:id', async (req, res) => {
  try {
    const ruleId = parseInt(req.params.id, 10);
    const [existing] = await pool.execute('SELECT * FROM waste_to_value_rules WHERE rule_id = ? LIMIT 1', [ruleId]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'বিধি খুঁজে পাওয়া যায়নি।' });

    const r = existing[0];
    const {
      source_activity = r.source_activity,
      by_product = r.by_product,
      target_activity = r.target_activity,
      usage_method = r.usage_method,
      safety_note = r.safety_note,
      est_cost_min = r.est_cost_min,
      est_cost_max = r.est_cost_max,
      est_return_min = r.est_return_min,
      est_return_max = r.est_return_max,
      expert_verification_needed = r.expert_verification_needed
    } = req.body;

    await pool.execute(
      `UPDATE waste_to_value_rules
       SET source_activity = ?, by_product = ?, target_activity = ?, usage_method = ?, safety_note = ?, est_cost_min = ?, est_cost_max = ?, est_return_min = ?, est_return_max = ?, expert_verification_needed = ?
       WHERE rule_id = ?`,
      [String(source_activity).trim(), String(by_product).trim(), String(target_activity).trim(), String(usage_method).trim(), String(safety_note).trim(), parseFloat(est_cost_min), parseFloat(est_cost_max), parseFloat(est_return_min), parseFloat(est_return_max), expert_verification_needed ? 1 : 0, ruleId]
    );

    const [updated] = await pool.execute('SELECT * FROM waste_to_value_rules WHERE rule_id = ? LIMIT 1', [ruleId]);
    await logAudit(req.user.user_id, 'UPDATE_WASTE_RULE', `waste_to_value_rules:${ruleId}`, req, { by_product, target_activity });

    return res.status(200).json({ success: true, message: 'বর্জ্য-থেকে-সম্পদ বিধি হালনাগাদ হয়েছে।', waste_rule: updated[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'হালনাগাদ করতে সমস্যা হয়েছে।' });
  }
});

router.delete('/waste-rules/:id', async (req, res) => {
  try {
    const ruleId = parseInt(req.params.id, 10);
    const [result] = await pool.execute('DELETE FROM waste_to_value_rules WHERE rule_id = ?', [ruleId]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'বিধি খুঁজে পাওয়া যায়নি।' });
    await logAudit(req.user.user_id, 'DELETE_WASTE_RULE', `waste_to_value_rules:${ruleId}`, req);
    return res.status(200).json({ success: true, message: 'বিধিটি মুছে ফেলা হয়েছে।' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'মুছতে সমস্যা হয়েছে।' });
  }
});

// =====================================================================
// 6. KNOWLEDGE DOCUMENTS CRUD (/api/admin/knowledge)
// =====================================================================

router.get('/knowledge', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT k.*, u.full_name AS admin_name
       FROM knowledge_documents k
       LEFT JOIN users u ON k.admin_id = u.user_id
       ORDER BY k.doc_id ASC`
    );
    return res.status(200).json({ success: true, documents: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'তথ্যভাণ্ডার লোড করতে সমস্যা হয়েছে।' });
  }
});

router.post('/knowledge', async (req, res) => {
  try {
    const { title, source, category, keywords, content } = req.body;
    if (!title || !source || !content) {
      return res.status(400).json({ success: false, message: 'শিরোনাম, তথ্যসূত্র এবং মূল বিষয়বস্তু আবশ্যক।' });
    }

    const [ins] = await pool.execute(
      `INSERT INTO knowledge_documents (admin_id, title, source, category, keywords, content)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.user_id, String(title).trim(), String(source).trim(), category ? String(category).trim() : 'সাধারণ কৃষি', keywords ? String(keywords).trim() : null, String(content).trim()]
    );

    const [rows] = await pool.execute('SELECT * FROM knowledge_documents WHERE doc_id = ? LIMIT 1', [ins.insertId]);
    await logAudit(req.user.user_id, 'CREATE_KNOWLEDGE', `knowledge_documents:${ins.insertId}`, req, { title, source });

    return res.status(201).json({ success: true, message: 'নতুন কৃষি নথি তথ্যভাণ্ডারে যুক্ত হয়েছে।', document: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'নথি সংরক্ষণ করতে সমস্যা হয়েছে।' });
  }
});

router.put('/knowledge/:id', async (req, res) => {
  try {
    const docId = parseInt(req.params.id, 10);
    const [existing] = await pool.execute('SELECT * FROM knowledge_documents WHERE doc_id = ? LIMIT 1', [docId]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'নথি খুঁজে পাওয়া যায়নি।' });

    const d = existing[0];
    const {
      title = d.title,
      source = d.source,
      category = d.category,
      keywords = d.keywords,
      content = d.content
    } = req.body;

    await pool.execute(
      `UPDATE knowledge_documents
       SET admin_id = ?, title = ?, source = ?, category = ?, keywords = ?, content = ?
       WHERE doc_id = ?`,
      [req.user.user_id, String(title).trim(), String(source).trim(), String(category || 'সাধারণ কৃষি').trim(), keywords, String(content).trim(), docId]
    );

    const [updated] = await pool.execute('SELECT * FROM knowledge_documents WHERE doc_id = ? LIMIT 1', [docId]);
    await logAudit(req.user.user_id, 'UPDATE_KNOWLEDGE', `knowledge_documents:${docId}`, req, { title });

    return res.status(200).json({ success: true, message: 'তথ্যভাণ্ডার নথি হালনাগাদ হয়েছে।', document: updated[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'হালনাগাদ করতে সমস্যা হয়েছে।' });
  }
});

router.delete('/knowledge/:id', async (req, res) => {
  try {
    const docId = parseInt(req.params.id, 10);
    const [result] = await pool.execute('DELETE FROM knowledge_documents WHERE doc_id = ?', [docId]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'নথি খুঁজে পাওয়া যায়নি।' });
    await logAudit(req.user.user_id, 'DELETE_KNOWLEDGE', `knowledge_documents:${docId}`, req);
    return res.status(200).json({ success: true, message: 'নথিটি মুছে ফেলা হয়েছে।' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'মুছতে সমস্যা হয়েছে।' });
  }
});

// =====================================================================
// 7. AUDIT LOGS (/api/admin/audit-logs) (FR-33)
// =====================================================================

router.get('/audit-logs', async (req, res) => {
  try {
    const actionFilter = req.query.action ? String(req.query.action).trim() : '';
    const limit = Math.min(200, Math.max(10, parseInt(req.query.limit, 10) || 100));

    let sql = `
      SELECT l.log_id, l.user_id, u.full_name, u.email, u.role,
             l.action, l.target, l.details, l.ip_address, l.logged_at
      FROM audit_logs l
      LEFT JOIN users u ON l.user_id = u.user_id
    `;
    const params = [];
    if (actionFilter) {
      sql += ' WHERE l.action LIKE ?';
      params.push(`%${actionFilter}%`);
    }
    sql += ` ORDER BY l.log_id DESC LIMIT ${limit}`;

    const [rows] = await pool.execute(sql, params);
    return res.status(200).json({
      success: true,
      count: rows.length,
      audit_logs: rows.map((r) => ({
        ...r,
        details: typeof r.details === 'string' ? (() => { try { return JSON.parse(r.details); } catch { return r.details; } })() : r.details
      }))
    });
  } catch (error) {
    console.error('[GET /api/admin/audit-logs Error]', error);
    return res.status(500).json({ success: false, message: 'অডিট লগ লোড করতে সমস্যা হয়েছে।' });
  }
});

// =====================================================================
// 8. USER MANAGEMENT (/api/admin/users)
// =====================================================================

/**
 * GET /api/admin/users
 * Searchable, filterable, and paginated user list for administrators
 */
router.get('/users', async (req, res) => {
  try {
    const q = req.query.q ? String(req.query.q).trim().toLowerCase() : '';
    const roleFilter = req.query.role ? String(req.query.role).trim().toUpperCase() : '';
    const statusFilter = req.query.status ? String(req.query.status).trim().toUpperCase() : '';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    let whereClauses = [];
    let params = [];

    if (q) {
      whereClauses.push('(LOWER(u.full_name) LIKE ? OR LOWER(u.email) LIKE ? OR u.phone LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (roleFilter && (roleFilter === 'FARMER' || roleFilter === 'ADMIN')) {
      whereClauses.push('u.role = ?');
      params.push(roleFilter);
    }
    if (statusFilter && (statusFilter === 'ACTIVE' || statusFilter === 'SUSPENDED')) {
      whereClauses.push('u.status = ?');
      params.push(statusFilter);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) AS total FROM users u ${whereSql}`;
    const [countRows] = await pool.execute(countSql, params);
    const totalUsers = countRows[0].total;

    const dataSql = `
      SELECT u.user_id, u.full_name, u.email, u.phone, u.role, u.created_at,
             fp.district, fp.upazila, fp.land_size, fp.season
      FROM users u
      LEFT JOIN farmer_profiles fp ON u.user_id = fp.user_id
      ${whereSql}
      ORDER BY u.user_id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [userRows] = await pool.execute(dataSql, params);

    return res.status(200).json({
      success: true,
      total: totalUsers,
      page,
      limit,
      totalPages: Math.ceil(totalUsers / limit),
      users: userRows
    });
  } catch (error) {
    console.error('[GET /api/admin/users Error]', error);
    return res.status(500).json({ success: false, message: 'ব্যবহারকারীদের তালিকা লোড করতে সমস্যা হয়েছে।' });
  }
});

/**
 * GET /api/admin/users/:id
 * Detailed farmer profile, recorded lands, and recommendation count
 */
router.get('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const [userRows] = await pool.execute(
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

    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'ব্যবহারকারী খুঁজে পাওয়া যায়নি।' });
    }

    const [[recCount]] = await pool.execute('SELECT COUNT(*) AS count FROM recommendations WHERE user_id = ?', [userId]);
    const [[landCount]] = await pool.execute('SELECT COUNT(*) AS count FROM lands WHERE user_id = ?', [userId]);
    const [resources] = await pool.execute('SELECT * FROM resources WHERE user_id = ? ORDER BY created_at DESC', [userId]);

    return res.status(200).json({
      success: true,
      user: {
        ...userRows[0],
        total_recommendations: recCount.count,
        total_lands: landCount.count,
        resources
      }
    });
  } catch (error) {
    console.error('[GET /api/admin/users/:id Error]', error);
    return res.status(500).json({ success: false, message: 'ব্যবহারকারীর তথ্য লোড করতে সমস্যা হয়েছে।' });
  }
});

/**
 * PUT /api/admin/users/:id/role
 * Change user role (FARMER <-> ADMIN)
 */
router.put('/users/:id/role', async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const { role } = req.body;

    if (!role || (role !== 'FARMER' && role !== 'ADMIN')) {
      return res.status(400).json({ success: false, message: 'সঠিক রোল নির্বাচন করুন (FARMER অথবা ADMIN)।' });
    }

    if (targetUserId === req.user.user_id && role !== 'ADMIN') {
      return res.status(400).json({ success: false, message: 'আপনি নিজের অ্যাডমিন অনুমতি বাতিল করতে পারবেন না।' });
    }

    const [existing] = await pool.execute('SELECT user_id, full_name, email, role FROM users WHERE user_id = ? LIMIT 1', [targetUserId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'ব্যবহারকারী খুঁজে পাওয়া যায়নি।' });
    }

    await pool.execute('UPDATE users SET role = ? WHERE user_id = ?', [role, targetUserId]);
    await logAudit(req.user.user_id, 'CHANGE_USER_ROLE', `users:${targetUserId}`, req, {
      from: existing[0].role,
      to: role,
      target_user: existing[0].email
    });

    return res.status(200).json({
      success: true,
      message: `ব্যবহারকারীর রোল '${role}' এ পরিবর্তিত হয়েছে।`,
      user_id: targetUserId,
      role
    });
  } catch (error) {
    console.error('[PUT /api/admin/users/:id/role Error]', error);
    return res.status(500).json({ success: false, message: 'রোল পরিবর্তন করতে সমস্যা হয়েছে।' });
  }
});

/**
 * PUT /api/admin/users/:id/status
 * Toggle user account status (ACTIVE <-> SUSPENDED)
 */
router.put('/users/:id/status', async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (!status || (status !== 'ACTIVE' && status !== 'SUSPENDED')) {
      return res.status(400).json({ success: false, message: 'সঠিক স্ট্যাটাস নির্বাচন করুন (ACTIVE অথবা SUSPENDED)।' });
    }

    if (targetUserId === req.user.user_id) {
      return res.status(400).json({ success: false, message: 'আপনি নিজের অ্যাকাউন্ট স্থগিত করতে পারবেন না।' });
    }

    const [existing] = await pool.execute('SELECT user_id, full_name, email, status FROM users WHERE user_id = ? LIMIT 1', [targetUserId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'ব্যবহারকারী খুঁজে পাওয়া যায়নি।' });
    }

    await pool.execute('UPDATE users SET status = ? WHERE user_id = ?', [status, targetUserId]);
    await logAudit(req.user.user_id, 'CHANGE_USER_STATUS', `users:${targetUserId}`, req, {
      from: existing[0].status,
      to: status,
      target_user: existing[0].email
    });

    return res.status(200).json({
      success: true,
      message: `ব্যবহারকারীর স্ট্যাটাস '${status}' এ পরিবর্তিত হয়েছে।`,
      user_id: targetUserId,
      status
    });
  } catch (error) {
    console.error('[PUT /api/admin/users/:id/status Error]', error);
    return res.status(500).json({ success: false, message: 'স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে।' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Remove user account with safeguard
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);

    if (targetUserId === req.user.user_id) {
      return res.status(400).json({ success: false, message: 'আপনি নিজের অ্যাকাউন্ট মুছে ফেলতে পারবেন না।' });
    }

    const [existing] = await pool.execute('SELECT user_id, full_name, email, role FROM users WHERE user_id = ? LIMIT 1', [targetUserId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'ব্যবহারকারী খুঁজে পাওয়া যায়নি।' });
    }

    await pool.execute('DELETE FROM users WHERE user_id = ?', [targetUserId]);
    await logAudit(req.user.user_id, 'DELETE_USER', `users:${targetUserId}`, req, {
      deleted_user_email: existing[0].email,
      full_name: existing[0].full_name
    });

    return res.status(200).json({ success: true, message: 'ব্যবহারকারী অ্যাকাউন্ট সফলভাবে মুছে ফেলা হয়েছে।' });
  } catch (error) {
    console.error('[DELETE /api/admin/users/:id Error]', error);
    return res.status(500).json({ success: false, message: 'ব্যবহারকারী মুছতে সমস্যা হয়েছে।' });
  }
});

// =====================================================================
// 9. SYSTEM SETTINGS (/api/admin/settings)
// =====================================================================

let systemSettings = {
  platform_name: 'agroWish - স্মার্ট কৃষি সিদ্ধান্ত গ্রহণ ও সমন্বিত খামার পরিকল্পনা',
  default_language: 'bn',
  enable_ai_synthesis: true,
  max_recommendation_results: 5,
  ler_threshold_minimum: 1.15,
  support_phone: '+8801700000000',
  support_email: 'support@agrowish.bd'
};

router.get('/settings', (req, res) => {
  return res.status(200).json({ success: true, settings: systemSettings });
});

router.post('/settings', async (req, res) => {
  try {
    const updates = req.body;
    systemSettings = { ...systemSettings, ...updates };
    await logAudit(req.user.user_id, 'UPDATE_SETTINGS', 'system:settings', req, updates);
    return res.status(200).json({ success: true, message: 'সিস্টেম সেটিংস সফলভাবে সংরক্ষিত হয়েছে।', settings: systemSettings });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'সেটিংস সংরক্ষণে ব্যর্থ।' });
  }
});

module.exports = router;
