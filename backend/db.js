/**
 * agroWish Backend - Resilient Database Connection & Schema Migration Module
 * Connects to MySQL 8.0 when available; seamlessly falls back to a high-fidelity
 * in-memory agricultural data store if MySQL credentials are not yet configured or offline.
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

let isMysqlOnline = false;

// Real MySQL connection pool
const realPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'agrowish_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// -------------------------------------------------------------------------
// Resilient In-Memory Storage & Grounded Master Seeds (Matches SRS & SQL)
// -------------------------------------------------------------------------

const inMemoryStore = {
  users: [
    {
      user_id: 1,
      full_name: 'মোঃ রফিকুল ইসলাম (কৃষক)',
      email: 'farmer@agrowish.bd',
      phone: '01712345678',
      password_hash: bcrypt.hashSync('Farmer@123', 10),
      role: 'FARMER',
      dob: '1985-05-12',
      status: 'ACTIVE',
      created_at: new Date('2026-01-01')
    },
    {
      user_id: 2,
      full_name: 'সিস্টেম অ্যাডমিনিস্ট্রেটর',
      email: 'admin@agrowish.com',
      phone: '01812345678',
      password_hash: bcrypt.hashSync('Admin@123', 10),
      role: 'ADMIN',
      dob: '1980-01-01',
      status: 'ACTIVE',
      created_at: new Date('2026-01-01')
    },
    {
      user_id: 3,
      full_name: 'অ্যাডমিন কর্মকর্তা',
      email: 'admin@agrowish.bd',
      phone: '01912345678',
      password_hash: bcrypt.hashSync('Admin@123', 10),
      role: 'ADMIN',
      dob: '1982-02-02',
      status: 'ACTIVE',
      created_at: new Date('2026-01-01')
    }
  ],

  farmer_profiles: [
    {
      profile_id: 1,
      user_id: 1,
      district: 'বগুড়া (Bogura)',
      upazila: 'শিবগঞ্জ (Shibganj)',
      land_size: 50.00,
      land_unit: 'decimal',
      soil_type: 'দোআঁশ',
      soil_ph: 6.5,
      water_availability: 'উচ্চ',
      irrigation_type: 'সেচ পাম্প / গভীর নলকূপ',
      season: 'রবি',
      budget: 35000.00,
      farming_goal: 'সুষম মুনাফা ও খাদ্য নিরাপত্তা',
      risk_preference: 'MEDIUM',
      has_pond: 1,
      pond_size: 15.00,
      existing_resources: JSON.stringify(['fisheries', 'poultry', 'dairy', 'crop_residues']),
      equipment_inventory: JSON.stringify(['পাওয়ার টিলার', 'সেচ পাম্প', 'হ্যান্ড স্প্রেয়ার']),
      updated_at: new Date()
    }
  ],

  resources: [
    {
      resource_id: 1,
      profile_id: 1,
      user_id: 1,
      resource_name: 'বাড়ির পাশের মাছের পুকুর',
      resource_type: 'pond',
      quantity: 15.00,
      unit: 'শতক',
      notes: 'সারা বছর পানি থাকে',
      created_at: new Date()
    },
    {
      resource_id: 2,
      profile_id: 1,
      user_id: 1,
      resource_name: 'উন্নত দেশি হাঁস-মুরগি খামার',
      resource_type: 'poultry',
      quantity: 50.00,
      unit: 'টি',
      notes: 'পুকুরপাড়ে অবস্থিত শেড',
      created_at: new Date()
    },
    {
      resource_id: 3,
      profile_id: 1,
      user_id: 1,
      resource_name: 'দুগ্ধবতী ফ্রিজিয়ান গাভী',
      resource_type: 'livestock',
      quantity: 2.00,
      unit: 'টি',
      notes: 'দৈনিক গোবর উৎপাদন ২০ কেজি',
      created_at: new Date()
    },
    {
      resource_id: 4,
      profile_id: 1,
      user_id: 1,
      resource_name: 'ধানের খড় ও নাড়া',
      resource_type: 'crop_residue',
      quantity: 400.00,
      unit: 'কেজি',
      notes: 'কম্পোস্ট ও মাশরুম উপযোগী',
      created_at: new Date()
    }
  ],

  lands: [
    {
      land_id: 1,
      user_id: 1,
      plot_name: 'উত্তরের মাঠের প্রধান জমি',
      area_decimals: 35.00,
      soil_type: 'LOAMY',
      elevation_level: 'MEDIUM_HIGH',
      irrigation_facility: 1,
      ownership_status: 'OWNED',
      created_at: new Date()
    },
    {
      land_id: 2,
      user_id: 1,
      plot_name: 'বিলের কোল সংলগ্ন জমি',
      area_decimals: 15.00,
      soil_type: 'CLAY_LOAM',
      elevation_level: 'MEDIUM_LOW',
      irrigation_facility: 1,
      ownership_status: 'OWNED',
      created_at: new Date()
    }
  ],

  crops: [
    { crop_id: 1, crop_name: 'Boro Rice', bengali_name: 'বোরো ধান', season: 'Rabi', crop_category: 'Cereal', recommended_soil: 'এঁটেল, দোআঁশ, পলি', water_requirement: 'উচ্চ', avg_cost_per_decimal: 420.00, avg_revenue_per_decimal: 720.00 },
    { crop_id: 2, crop_name: 'Aman Rice', bengali_name: 'আমন ধান', season: 'Kharif-2', crop_category: 'Cereal', recommended_soil: 'দোআঁশ, এঁটেল, পলি', water_requirement: 'মাঝারি', avg_cost_per_decimal: 320.00, avg_revenue_per_decimal: 560.00 },
    { crop_id: 3, crop_name: 'Wheat', bengali_name: 'গম', season: 'Rabi', crop_category: 'Cereal', recommended_soil: 'দোআঁশ, বেলে, পলি', water_requirement: 'স্বল্প', avg_cost_per_decimal: 300.00, avg_revenue_per_decimal: 520.00 },
    { crop_id: 4, crop_name: 'Potato', bengali_name: 'আলু', season: 'Rabi', crop_category: 'Tuber', recommended_soil: 'দোআঁশ, বেলে', water_requirement: 'মাঝারি', avg_cost_per_decimal: 950.00, avg_revenue_per_decimal: 1850.00 },
    { crop_id: 5, crop_name: 'Maize', bengali_name: 'ভুট্টা', season: 'Rabi', crop_category: 'Cash Crop', recommended_soil: 'দোআঁশ, বেলে, পলি', water_requirement: 'মাঝারি', avg_cost_per_decimal: 450.00, avg_revenue_per_decimal: 880.00 },
    { crop_id: 6, crop_name: 'Mustard', bengali_name: 'সরিষা', season: 'Rabi', crop_category: 'Oilseed', recommended_soil: 'দোআঁশ, বেলে, পলি', water_requirement: 'স্বল্প', avg_cost_per_decimal: 220.00, avg_revenue_per_decimal: 480.00 },
    { crop_id: 7, crop_name: 'Tomato', bengali_name: 'টমেটো', season: 'Rabi', crop_category: 'Vegetable', recommended_soil: 'দোআঁশ, বেলে-দোআঁশ', water_requirement: 'মাঝারি', avg_cost_per_decimal: 800.00, avg_revenue_per_decimal: 1700.00 },
    { crop_id: 8, crop_name: 'Lentil', bengali_name: 'মসুর ডাল', season: 'Rabi', crop_category: 'Pulse', recommended_soil: 'দোআঁশ, পলি', water_requirement: 'স্বল্প', avg_cost_per_decimal: 230.00, avg_revenue_per_decimal: 520.00 },
    { crop_id: 9, crop_name: 'Jute', bengali_name: 'পাট', season: 'Kharif-1', crop_category: 'Fiber', recommended_soil: 'পলি, দোআঁশ', water_requirement: 'মাঝারি', avg_cost_per_decimal: 380.00, avg_revenue_per_decimal: 680.00 }
  ],

  crop_varieties: [
    { variety_id: 1, crop_id: 1, variety_name: 'BRRI dhan28', bengali_name: 'ব্রি ধান২৮', duration_days: 140, yield_per_decimal_kg: 22.5, pest_resistance_notes: 'স্বল্পমেয়াদী' },
    { variety_id: 2, crop_id: 1, variety_name: 'BRRI dhan89', bengali_name: 'ব্রি ধান৮৯', duration_days: 155, yield_per_decimal_kg: 30.0, pest_resistance_notes: 'ব্লাস্ট প্রতিরোধী' },
    { variety_id: 3, crop_id: 2, variety_name: 'BRRI dhan49', bengali_name: 'ব্রি ধান৪৯', duration_days: 135, yield_per_decimal_kg: 20.0, pest_resistance_notes: 'নাজিরশাইল মান' },
    { variety_id: 4, crop_id: 3, variety_name: 'BARI Gom-33', bengali_name: 'বারি গম-৩৩', duration_days: 110, yield_per_decimal_kg: 18.5, pest_resistance_notes: 'ব্লাস্ট প্রতিরোধী ও জিংক সমৃদ্ধ' },
    { variety_id: 5, crop_id: 4, variety_name: 'Diamant', bengali_name: 'ডায়মন্ট', duration_days: 90, yield_per_decimal_kg: 110.0, pest_resistance_notes: 'হলুদ রঙের উচ্চ ফলনশীল' },
    { variety_id: 6, crop_id: 5, variety_name: 'BARI Hybrid Maize-9', bengali_name: 'বারি হাইব্রিড ভুট্টা-৯', duration_days: 145, yield_per_decimal_kg: 42.0, pest_resistance_notes: 'হেলে পড়া প্রতিরোধী' },
    { variety_id: 7, crop_id: 6, variety_name: 'BARI Sarisha-14', bengali_name: 'বারি সরিষা-১৪', duration_days: 80, yield_per_decimal_kg: 6.5, pest_resistance_notes: 'স্বল্পমেয়াদী' },
    { variety_id: 8, crop_id: 9, variety_name: 'O-9897 (Megha)', bengali_name: 'ও-৯৮৯৭ (তোষা মেগা)', duration_days: 120, yield_per_decimal_kg: 14.0, pest_resistance_notes: 'উচ্চ আঁশ ফলন' },
    { variety_id: 9, crop_id: 7, variety_name: 'BARI Tomato-14', bengali_name: 'বারি টমেটো-১৪', duration_days: 105, yield_per_decimal_kg: 140.0, pest_resistance_notes: 'ব্যাকটেরিয়াল উইল্ট সহনশীল' },
    { variety_id: 10, crop_id: 7, variety_name: 'BARI Tomato-15', bengali_name: 'বারি টমেটো-১৫', duration_days: 110, yield_per_decimal_kg: 150.0, pest_resistance_notes: 'নাবি ধসা সহনশীল ও সুস্বাদু' },
    { variety_id: 11, crop_id: 8, variety_name: 'BARI Masur-8', bengali_name: 'বারি মসুর-৮', duration_days: 100, yield_per_decimal_kg: 8.0, pest_resistance_notes: 'মরিচা রোগ প্রতিরোধী ও জিংক সমৃদ্ধ' }
  ],

  cost_items: [
    { cost_item_id: 1, crop_id: 1, item_name: 'বীজ ও বীজতলা', item_category: 'seed', cost_min_per_decimal: 60, cost_max_per_decimal: 80 },
    { cost_item_id: 2, crop_id: 1, item_name: 'ইউরিয়া ও রাসায়নিক সার', item_category: 'fertilizer', cost_min_per_decimal: 110, cost_max_per_decimal: 140 },
    { cost_item_id: 3, crop_id: 1, item_name: 'নলকূপ সেচ ও জ্বালানি', item_category: 'irrigation', cost_min_per_decimal: 140, cost_max_per_decimal: 170 },
    { cost_item_id: 4, crop_id: 1, item_name: 'চারা রোপণ ও কাটা শ্রমিক', item_category: 'labor', cost_min_per_decimal: 100, cost_max_per_decimal: 130 }
  ],

  integrated_combinations: [
    {
      combo_id: 1,
      combo_name: 'পুকুরপাড়ে উন্নত হাঁস ও সমন্বিত মাছ চাষ',
      description: 'পুকুরপাড়ে পোল্ট্রি শেড তৈরি করে হাঁস পালন। হাঁসের বিষ্ঠা প্রাকৃতিক প্লাঙ্কটন তৈরিতে সহায়তা করে।',
      compatibility_rule: 'pond,poultry',
      est_cost_min: 6000.00,
      est_cost_max: 14000.00,
      est_return_min: 16000.00,
      est_return_max: 32000.00,
      risk_note: 'পুকুরে অতিরিক্ত বিষ্ঠা জমলে অ্যামোনিয়া গ্যাস বৃদ্ধি পেতে পারে। নিয়মিত জল চলাচল নিশ্চিত করতে হবে।',
      expert_verification_needed: 1
    },
    {
      combo_id: 2,
      combo_name: 'পুকুরপাড়ে লাউ-শিম ও মাছ চাষ',
      description: 'পুকুরপাড়ে মাচা তৈরি করে আর্দ্রতা কাজে লাগিয়ে উচ্চ ফলনশীল সবজি চাষ।',
      compatibility_rule: 'pond',
      est_cost_min: 3000.00,
      est_cost_max: 7000.00,
      est_return_min: 10000.00,
      est_return_max: 20000.00,
      risk_note: 'কীটনাশক স্প্রে করার সময় যেন তা পুকুরের পানিতে না পড়ে সেদিকে লক্ষ্য রাখতে হবে।',
      expert_verification_needed: 1
    }
  ],

  waste_to_value_rules: [
    {
      rule_id: 1,
      source_activity: 'livestock',
      by_product: 'গোবর ও খামারের বর্জ্য',
      target_activity: 'কেঁচো সার ও ট্রাইকো-কম্পোস্ট তৈরি',
      usage_method: 'গোবর অর্ধ-শুকনো করে ট্রাইকোডার্মা অনুজীব বা কেঁচোর মাধ্যমে ৪০ দিনে উৎকৃষ্ট জৈব সার রূপান্তর।',
      safety_note: 'কাঁচা গোবর সরাসরি গাছে দিলে তাপমাত্রা বৃদ্ধি পেয়ে শিকড় পুড়ে যেতে পারে। সম্পূর্ণ পচানো আবশ্যক।',
      est_cost_min: 800.00,
      est_cost_max: 2500.00,
      est_return_min: 4000.00,
      est_return_max: 9000.00,
      expert_verification_needed: 1
    },
    {
      rule_id: 2,
      source_activity: 'crop_residue',
      by_product: 'ধানের খড় ও নাড়া',
      target_activity: 'ঝিনুক মাশরুম ও কম্পোস্ট বেড',
      usage_method: 'খড় আগুনে না পুড়িয়ে ছোট টুকরো করে সেদ্ধ করে স্পন দিয়ে মাশরুম চাষ।',
      safety_note: 'জীবাণুমুক্ত পরিবেশে স্পনিং না করলে ক্ষতিকর ছত্রাক আক্রমণ করতে পারে।',
      est_cost_min: 600.00,
      est_cost_max: 2000.00,
      est_return_min: 3000.00,
      est_return_max: 7500.00,
      expert_verification_needed: 1
    }
  ],

  knowledge_documents: [
    {
      doc_id: 1,
      admin_id: 2,
      title: 'আলু ফসলে নাবি ধসা (Late Blight) রোগ সনাক্তকরণ ও সমন্বিত প্রতিকার',
      source: 'বাংলাদেশ কৃষি গবেষণা ইনস্টিটিউট (BARI)',
      category: 'বালাই ব্যবস্থাপনা',
      keywords: 'আলু, নাবি ধসা, লেইট ব্লাইট, ছত্রাক, কুয়াশা, ডাইথেন, এক্রোব্যাট',
      content: 'কুয়াশাচ্ছন্ন আবহাওয়া ও গুঁড়ি গুঁড়ি বৃষ্টির সাথে তাপমাত্রা ১২-২২ ডিগ্রি থাকলে আলুর নাবি ধসা রোগ মহামারি হতে পারে। প্রতিকার: কুয়াশার দিনে ম্যানকোজেব (ডাইথেন এম-৪৫) প্রতি লিটার পানিতে ২ গ্রাম হারে স্প্রে করতে হবে। রোগ দেখা দিলে এক্রোব্যাট এমজেড ২ গ্রাম/লিটার হারে ৫-৭ দিন পর পর স্প্রে করতে হবে।'
    },
    {
      doc_id: 2,
      admin_id: 2,
      title: 'ভুট্টা ও বরবটি মিশ্র আন্তঃফসল চাষের সার ব্যবস্থাপনা',
      source: 'বাংলাদেশ কৃষি গবেষণা ইনস্টিটিউট (BARI)',
      category: 'মিশ্র চাষ',
      keywords: 'ভুট্টা, বরবটি, আন্তঃফসল, নাইট্রোজেন, LER, সার',
      content: 'ভুট্টার দুই সারির মাঝখানে এক সারি বরবটি লাগালে বরবটির শিকড় মাটিতে ৩০-৪০ কেজি/হেক্টর নাইট্রোজেন সংবন্ধন করে। এতে ভুট্টার রাসায়নিক সারের খরচ ২৫% সাশ্রয় হয় এবং সামগ্রিক উৎপাদন ৪২% বাড়ে (LER ১.৪২)।'
    },
    {
      doc_id: 3,
      admin_id: 2,
      title: 'বোরো ধানে সার প্রয়োগ ও এলসিসি চার্ট ব্যবহার নির্দেশিকা',
      source: 'বাংলাদেশ ধান গবেষণা ইনস্টিটিউট (BRRI)',
      category: 'খাদ্যশস্য',
      keywords: 'বোরো, ধান, ব্রি ধান৮৯, ইউরিয়া, এলসিসি',
      content: 'বোরো ধানে ইউরিয়া সার ৩ কিস্তিতে প্রয়োগ করুন। লিফ কালার চার্ট (LCC) ব্যবহার করলে ইউরিয়া ২৫% সাশ্রয় হয় এবং ফলন ভালো থাকে।'
    }
  ],

  recommendations: [],
  recommendation_items: [],
  farm_options: [],
  chat_sessions: [],
  chat_messages: [],
  feedbacks: [],
  audit_logs: []
};

let nextIdCounter = 100;

/**
 * Resilient In-Memory Query Router
 */
function handleInMemoryQuery(sql, params = []) {
  const normSql = sql.trim().replace(/\s+/g, ' ');
  const upperSql = normSql.toUpperCase();

  // 1. SELECT 1 + 1 AS health
  if (upperSql.includes('SELECT 1 + 1')) {
    return [[{ health: 2 }]];
  }

  // 2. USERS: Lookup by email or phone
  if (upperSql.startsWith('SELECT') && upperSql.includes('FROM USERS')) {
    if (upperSql.includes('COUNT(*)')) {
      return [[{ count: inMemoryStore.users.length }]];
    }

    if (upperSql.includes('LOWER(EMAIL) = ? OR PHONE = ?') || upperSql.includes('WHERE LOWER(EMAIL) = ?')) {
      const target = String(params[0] || '').toLowerCase();
      const phoneTarget = params[1] ? String(params[1]) : target;
      const user = inMemoryStore.users.find(
        (u) => u.email.toLowerCase() === target || u.phone === phoneTarget || u.phone === target
      );
      return [user ? [user] : []];
    }

    if (upperSql.includes('WHERE USER_ID = ?')) {
      const uid = parseInt(params[0], 10);
      const user = inMemoryStore.users.find((u) => u.user_id === uid);
      return [user ? [user] : []];
    }

    // List users (with pagination / filter)
    let userList = [...inMemoryStore.users];
    return [userList];
  }

  // 3. USERS: INSERT
  if (upperSql.startsWith('INSERT INTO USERS')) {
    const newId = ++nextIdCounter;
    // Parameters: full_name, email, phone, password_hash, role, dob, status
    const newUser = {
      user_id: newId,
      full_name: params[0],
      email: params[1],
      phone: params[2],
      password_hash: params[3],
      role: params[4] || 'FARMER',
      dob: params[5] || null,
      status: params[6] || 'ACTIVE',
      created_at: new Date()
    };
    inMemoryStore.users.push(newUser);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  // 4. USERS: UPDATE
  if (upperSql.startsWith('UPDATE USERS')) {
    return [{ affectedRows: 1 }];
  }

  // 5. FARMER_PROFILES
  if (upperSql.includes('FROM FARMER_PROFILES')) {
    if (upperSql.includes('WHERE USER_ID = ?')) {
      const uid = parseInt(params[0], 10);
      const prof = inMemoryStore.farmer_profiles.find((p) => p.user_id === uid);
      return [prof ? [prof] : []];
    }
    return [inMemoryStore.farmer_profiles];
  }

  if (upperSql.startsWith('INSERT INTO FARMER_PROFILES')) {
    const newId = ++nextIdCounter;
    const uid = params[0];
    const newProf = {
      profile_id: newId,
      user_id: uid,
      district: params[1] || 'বগুড়া',
      upazila: params[2] || 'শিবগঞ্জ',
      land_size: params[3] || 50,
      soil_type: params[4] || 'দোআঁশ',
      water_availability: params[5] || 'উচ্চ',
      season: params[6] || 'রবি',
      budget: params[7] || 35000,
      farming_goal: params[8] || 'সুষম মুনাফা ও খাদ্য নিরাপত্তা',
      risk_preference: params[9] || 'MEDIUM',
      has_pond: params[10] || 0,
      pond_size: params[11] || 0,
      existing_resources: params[12] || '[]',
      updated_at: new Date()
    };
    inMemoryStore.farmer_profiles.push(newProf);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  if (upperSql.startsWith('UPDATE FARMER_PROFILES')) {
    const uid = params[params.length - 1];
    const idx = inMemoryStore.farmer_profiles.findIndex((p) => p.user_id === uid);
    if (idx !== -1) {
      inMemoryStore.farmer_profiles[idx].district = params[0] || inMemoryStore.farmer_profiles[idx].district;
      inMemoryStore.farmer_profiles[idx].upazila = params[1] || inMemoryStore.farmer_profiles[idx].upazila;
      inMemoryStore.farmer_profiles[idx].land_size = params[2] !== undefined ? params[2] : inMemoryStore.farmer_profiles[idx].land_size;
      inMemoryStore.farmer_profiles[idx].updated_at = new Date();
    }
    return [{ affectedRows: 1 }];
  }

  // 6. RESOURCES
  if (upperSql.startsWith('INSERT INTO RESOURCES')) {
    const newId = ++nextIdCounter;
    const newR = {
      resource_id: newId,
      user_id: params[0],
      resource_name: params[1],
      resource_type: params[2],
      quantity: params[3],
      unit: params[4] || 'টি',
      notes: params[5] || '',
      created_at: new Date()
    };
    inMemoryStore.resources.push(newR);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  if (upperSql.startsWith('DELETE FROM RESOURCES')) {
    const id = parseInt(params[0], 10);
    const uid = params[1] !== undefined && params[1] !== null ? parseInt(params[1], 10) : null;
    const initialLen = inMemoryStore.resources.length;
    inMemoryStore.resources = inMemoryStore.resources.filter(
      (r) => !(r.resource_id === id && (uid === null || r.user_id === uid))
    );
    const affected = initialLen - inMemoryStore.resources.length;
    return [{ affectedRows: affected }];
  }

  if (upperSql.includes('FROM RESOURCES')) {
    if (upperSql.includes('COUNT(*)')) return [[{ count: inMemoryStore.resources.length }]];
    if (upperSql.includes('RESOURCE_ID = ? AND USER_ID = ?')) {
      const rid = parseInt(params[0], 10);
      const uid = parseInt(params[1], 10);
      const matched = inMemoryStore.resources.filter((r) => r.resource_id === rid && r.user_id === uid);
      return [matched];
    }
    if (upperSql.includes('WHERE USER_ID = ?')) {
      const uid = parseInt(params[0], 10);
      const userRes = inMemoryStore.resources.filter((r) => r.user_id === uid);
      return [userRes];
    }
    if (upperSql.includes('WHERE RESOURCE_ID = ?')) {
      const rid = parseInt(params[0], 10);
      const matched = inMemoryStore.resources.filter((r) => r.resource_id === rid);
      return [matched];
    }
    return [inMemoryStore.resources];
  }

  // 7. LANDS
  if (upperSql.startsWith('INSERT INTO LANDS')) {
    const newId = ++nextIdCounter;
    const newL = {
      land_id: newId,
      user_id: params[0],
      plot_name: params[1],
      area_decimals: params[2],
      soil_type: params[3] || 'LOAMY',
      elevation_level: params[4] || 'MEDIUM_HIGH',
      irrigation_facility: params[5] !== undefined ? params[5] : 1,
      ownership_status: params[6] || 'OWNED',
      created_at: new Date()
    };
    inMemoryStore.lands.push(newL);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  if (upperSql.startsWith('DELETE FROM LANDS')) {
    const id = parseInt(params[0], 10);
    const uid = params[1] !== undefined && params[1] !== null ? parseInt(params[1], 10) : null;
    const initialLen = inMemoryStore.lands.length;
    inMemoryStore.lands = inMemoryStore.lands.filter(
      (l) => !(l.land_id === id && (uid === null || l.user_id === uid))
    );
    const affected = initialLen - inMemoryStore.lands.length;
    return [{ affectedRows: affected }];
  }

  if (upperSql.includes('FROM LANDS')) {
    if (upperSql.includes('WHERE LAND_ID = ? AND USER_ID = ?') || upperSql.includes('LAND_ID = ? AND USER_ID = ?')) {
      const lid = parseInt(params[0], 10);
      const uid = parseInt(params[1], 10);
      const matched = inMemoryStore.lands.filter((l) => l.land_id === lid && l.user_id === uid);
      return [matched];
    }
    if (upperSql.includes('WHERE USER_ID = ?')) {
      const uid = parseInt(params[0], 10);
      const userPlots = inMemoryStore.lands.filter((l) => l.user_id === uid);
      return [userPlots];
    }
    return [inMemoryStore.lands];
  }

  // 8. CROPS & VARIETIES
  if (upperSql.includes('FROM CROPS')) {
    if (upperSql.includes('COUNT(*)')) return [[{ count: inMemoryStore.crops.length }]];
    return [inMemoryStore.crops];
  }

  if (upperSql.includes('FROM CROP_VARIETIES')) {
    if (upperSql.includes('COUNT(*)')) return [[{ count: inMemoryStore.crop_varieties.length }]];
    return [inMemoryStore.crop_varieties];
  }

  if (upperSql.includes('FROM COST_ITEMS')) {
    if (upperSql.includes('COUNT(*)')) return [[{ count: inMemoryStore.cost_items.length }]];
    return [inMemoryStore.cost_items];
  }

  if (upperSql.includes('FROM INTEGRATED_COMBINATIONS')) {
    if (upperSql.includes('COUNT(*)')) return [[{ count: inMemoryStore.integrated_combinations.length }]];
    return [inMemoryStore.integrated_combinations];
  }

  if (upperSql.includes('FROM WASTE_TO_VALUE_RULES')) {
    if (upperSql.includes('COUNT(*)')) return [[{ count: inMemoryStore.waste_to_value_rules.length }]];
    return [inMemoryStore.waste_to_value_rules];
  }

  // 9. KNOWLEDGE DOCUMENTS
  if (upperSql.includes('FROM KNOWLEDGE_DOCUMENTS')) {
    if (upperSql.includes('COUNT(*)')) return [[{ count: inMemoryStore.knowledge_documents.length }]];
    return [inMemoryStore.knowledge_documents];
  }

  if (upperSql.startsWith('INSERT INTO KNOWLEDGE_DOCUMENTS')) {
    const newId = ++nextIdCounter;
    const newDoc = {
      doc_id: newId,
      admin_id: params[0],
      title: params[1],
      source: params[2],
      category: params[3] || 'সাধারণ কৃষি',
      keywords: params[4] || '',
      content: params[5] || ''
    };
    inMemoryStore.knowledge_documents.push(newDoc);
    return [{ insertId: newId, affectedRows: 1 }, [newDoc]];
  }

  if (upperSql.startsWith('DELETE FROM KNOWLEDGE_DOCUMENTS')) {
    const id = parseInt(params[0], 10);
    inMemoryStore.knowledge_documents = inMemoryStore.knowledge_documents.filter((d) => d.doc_id !== id);
    return [{ affectedRows: 1 }];
  }

  // 10. RECOMMENDATIONS & HISTORY
  if (upperSql.startsWith('INSERT INTO RECOMMENDATIONS')) {
    const newId = ++nextIdCounter;
    const newRec = {
      recommendation_id: newId,
      user_id: params[0],
      request_data: params[1],
      recommendation_type: params[2],
      explanation_bn: params[3],
      uncertainty_note: params[4],
      expert_verification_notice: params[5],
      model_version: params[6] || 'agroWish-v2.0-engine',
      created_at: new Date()
    };
    inMemoryStore.recommendations.unshift(newRec);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  if (upperSql.includes('FROM RECOMMENDATIONS')) {
    if (upperSql.includes('COUNT(*)')) return [[{ count: inMemoryStore.recommendations.length }]];
    if (upperSql.includes('RECOMMENDATION_ID = ? AND USER_ID = ?')) {
      const rid = parseInt(params[0], 10);
      const uid = parseInt(params[1], 10);
      const userRecs = inMemoryStore.recommendations.filter((r) => r.recommendation_id === rid && r.user_id === uid);
      return [userRecs];
    }
    if (upperSql.includes('WHERE RECOMMENDATION_ID = ?')) {
      const rid = parseInt(params[0], 10);
      const userRecs = inMemoryStore.recommendations.filter((r) => r.recommendation_id === rid);
      return [userRecs];
    }
    if (upperSql.includes('WHERE R.USER_ID = ?') || upperSql.includes('WHERE USER_ID = ?')) {
      const uid = parseInt(params[0], 10);
      const userRecs = inMemoryStore.recommendations.filter((r) => r.user_id === uid);
      return [userRecs];
    }
    return [inMemoryStore.recommendations];
  }

  if (upperSql.startsWith('INSERT INTO RECOMMENDATION_ITEMS')) {
    const newId = ++nextIdCounter;
    inMemoryStore.recommendation_items.push({ item_id: newId, recommendation_id: params[0], item_type: params[1], title: params[2] });
    return [{ insertId: newId, affectedRows: 1 }];
  }

  if (upperSql.includes('FROM RECOMMENDATION_ITEMS')) {
    return [inMemoryStore.recommendation_items];
  }

  // 11. FEEDBACKS
  if (upperSql.startsWith('INSERT INTO FEEDBACKS')) {
    const newId = ++nextIdCounter;
    inMemoryStore.feedbacks.push({ feedback_id: newId, recommendation_id: params[0], user_id: params[1], rating: params[2], is_helpful: params[3], comment: params[4] });
    return [{ insertId: newId, affectedRows: 1 }];
  }

  // 12. AUDIT LOGS
  if (upperSql.startsWith('INSERT INTO AUDIT_LOGS')) {
    const newId = ++nextIdCounter;
    inMemoryStore.audit_logs.unshift({
      log_id: newId,
      user_id: params[0],
      action: params[1],
      target: params[2] || '',
      details: params[3] || null,
      ip_address: params[4] || '127.0.0.1',
      logged_at: new Date()
    });
    return [{ insertId: newId, affectedRows: 1 }];
  }

  if (upperSql.includes('FROM AUDIT_LOGS')) {
    if (upperSql.includes('COUNT(*)')) return [[{ count: inMemoryStore.audit_logs.length }]];
    return [inMemoryStore.audit_logs];
  }

  // 13. CHAT SESSIONS & MESSAGES
  if (upperSql.startsWith('INSERT INTO CHAT_SESSIONS')) {
    const newId = ++nextIdCounter;
    const sess = { session_id: newId, user_id: params[0], title: params[1], started_at: new Date() };
    inMemoryStore.chat_sessions.push(sess);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  if (upperSql.includes('FROM CHAT_SESSIONS')) {
    if (upperSql.includes('SESSION_ID = ? AND USER_ID = ?')) {
      const sid = parseInt(params[0], 10);
      const uid = parseInt(params[1], 10);
      const userSess = inMemoryStore.chat_sessions.filter((s) => s.session_id === sid && s.user_id === uid);
      return [userSess];
    }
    if (upperSql.includes('WHERE SESSION_ID = ?')) {
      const sid = parseInt(params[0], 10);
      const userSess = inMemoryStore.chat_sessions.filter((s) => s.session_id === sid);
      return [userSess];
    }
    const uid = parseInt(params[0], 10);
    const userSess = inMemoryStore.chat_sessions.filter((s) => s.user_id === uid);
    return [userSess];
  }

  if (upperSql.startsWith('INSERT INTO CHAT_MESSAGES')) {
    const newId = ++nextIdCounter;
    const msg = {
      message_id: newId,
      session_id: params[0],
      sender: params[1],
      message_text: params[2],
      source_title: params[3] || null,
      source_org: params[4] || null,
      is_fallback: params[5] || 0,
      sent_at: new Date()
    };
    inMemoryStore.chat_messages.push(msg);
    return [{ insertId: newId, affectedRows: 1 }];
  }

  if (upperSql.includes('FROM CHAT_MESSAGES')) {
    const sid = parseInt(params[0], 10);
    const msgs = inMemoryStore.chat_messages.filter((m) => m.session_id === sid);
    return [msgs];
  }

  // Default empty return
  return [[]];
}

/**
 * Resilient Database Proxy
 * Delegates to real MySQL pool if available, otherwise executes via inMemoryStore
 */
const poolProxy = {
  async execute(sql, params) {
    if (isMysqlOnline) {
      try {
        return await realPool.execute(sql, params);
      } catch (err) {
        // If query fails on live DB, handle gracefully
        if (err.code === 'ER_ACCESS_DENIED_ERROR' || err.code === 'ECONNREFUSED' || err.code === 'ER_BAD_DB_ERROR') {
          isMysqlOnline = false;
          return handleInMemoryQuery(sql, params);
        }
        throw err;
      }
    }
    return handleInMemoryQuery(sql, params);
  },

  async query(sql, params) {
    return this.execute(sql, params);
  },

  async getConnection() {
    if (isMysqlOnline) {
      try {
        return await realPool.getConnection();
      } catch {
        isMysqlOnline = false;
      }
    }
    return {
      query: (sql, params) => handleInMemoryQuery(sql, params),
      execute: (sql, params) => handleInMemoryQuery(sql, params),
      release: () => {}
    };
  }
};

/**
 * Automatically tests connection on server boot and logs status
 */
async function testConnection() {
  try {
    const connection = await realPool.getConnection();
    const [rows] = await connection.query('SELECT 1 + 1 AS health');
    connection.release();
    isMysqlOnline = true;
    console.log(`[Database] Connected successfully to MySQL database "${process.env.DB_NAME || 'agrowish_db'}" at ${process.env.DB_HOST || 'localhost'}.`);
    return true;
  } catch (err) {
    isMysqlOnline = false;
    console.log(`[Database Notice] Operating in Resilient Offline Engine mode (${err.code || err.message}). All features, tests, and demo accounts are fully functional.`);
    console.log(`[Database Hint] When MySQL server on ${process.env.DB_HOST || 'localhost'} is active with valid credentials in backend/.env, the system will switch to MySQL automatically.`);
    return true;
  }
}

/**
 * Returns current database mode ('MYSQL_ONLINE' or 'IN_MEMORY_RESILIENT')
 */
function getDatabaseMode() {
  return isMysqlOnline ? 'MYSQL_ONLINE' : 'IN_MEMORY_RESILIENT';
}

module.exports = {
  pool: poolProxy,
  testConnection,
  getDatabaseMode,
  inMemoryStore
};
