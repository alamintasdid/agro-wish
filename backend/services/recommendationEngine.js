/**
 * agroWish Backend - AI Crop Recommendation & Agricultural Decision Engine
 * SE-331 Software Engineering Design Capstone Project
 * Member 1: Md Adnan Ul Islam (Student ID: 241-35-081)
 * Lead: AI & Recommendation Lead
 * 
 * SRS Reference:
 * - Section 5: FR-08 (Crop Recommendation), FR-09 (Variety Recommendation), FR-10 (Season/Weather Context),
 *              FR-11 (Resource-Based Planning), FR-12 (Integrated Farming), FR-13 (Waste-to-Value),
 *              FR-14 (Cost Estimation), FR-15 (Return Comparison), FR-16 (Budget Filtering),
 *              FR-17 (Bangla Display), FR-19 (Explanation), FR-21 (Uncertainty Notice),
 *              FR-22 (Expert Verification Notice), FR-23 (Alternatives), FR-30 (Processing Status)
 * - Section 6: NFR-06 (AI Quality & Grounded Heuristics)
 */

// Certified Agricultural Crop Knowledge Base (BRRI & BARI Grounded Data)
const CROP_DATABASE = [
  {
    crop_id: 1,
    name: 'Boro Rice',
    name_bn: 'বোরো ধান',
    category: 'দানাদার খাদ্যশস্য (Cereal)',
    seasons: ['রবি'],
    suitable_soils: ['এঁটেল', 'দোআঁশ', 'পলি'],
    water_need: 'উচ্চ',
    base_cost_per_decimal: 420.00,
    base_return_min_per_decimal: 680.00,
    base_return_max_per_decimal: 780.00,
    risk_level: 'কম (Low)',
    varieties: [
      { name: 'BRRI dhan28', name_bn: 'ব্রি ধান২৮', duration: '১৪০ দিন', yield_kg: '২২.৫ কেজি/শতক', note: 'স্বল্পমেয়াদী ও বহুল প্রচলিত' },
      { name: 'BRRI dhan29', name_bn: 'ব্রি ধান২৯', duration: '১৬০ দিন', yield_kg: '২৮.০ কেজি/শতক', note: 'উচ্চ ফলনশীল মেগা জাত' },
      { name: 'BRRI dhan89', name_bn: 'ব্রি ধান৮৯', duration: '১৫৫ দিন', yield_kg: '৩০.০ কেজি/শতক', note: 'ব্রি ২৯ এর আধুনিক প্রতিস্থাপন, ব্লাস্ট প্রতিরোধী' },
      { name: 'Bangabandhu dhan100', name_bn: 'বঙ্গবন্ধু ধান১০০', duration: '১৪৮ দিন', yield_kg: '২৬.৫ কেজি/শতক', note: 'জিংক সমৃদ্ধ পুষ্টিমান ও পোকা প্রতিরোধী' }
    ],
    rationale_bn: 'বোরো মৌসুমে সেচ নিশ্চিত থাকলে এঁটেল ও দোআঁশ মাটিতে এটি সর্বোচ্চ খাদ্য নিরাপত্তা ও নিয়মিত লাভ প্রদান করে।'
  },
  {
    crop_id: 2,
    name: 'Aman Rice',
    name_bn: 'আমন ধান',
    category: 'দানাদার খাদ্যশস্য (Cereal)',
    seasons: ['খরিপ-২'],
    suitable_soils: ['দোআঁশ', 'এঁটেল', 'পলি'],
    water_need: 'মাঝারি',
    base_cost_per_decimal: 320.00,
    base_return_min_per_decimal: 520.00,
    base_return_max_per_decimal: 620.00,
    risk_level: 'মাঝারি (Medium - বন্যা ঝুঁকি)',
    varieties: [
      { name: 'BRRI dhan49', name_bn: 'ব্রি ধান৪৯', duration: '১৩৫ দিন', yield_kg: '২০.০ কেজি/শতক', note: 'জনপ্রিয় নাজিরশাইল বিকল্প' },
      { name: 'BRRI dhan75', name_bn: 'ব্রি ধান৭৫', duration: '১১৫ দিন', yield_kg: '১৮.৫ কেজি/শতক', note: 'স্বল্পমেয়াদী সুগন্ধি ধান, আগাম কাটার পর রবি ফসল করা যায়' },
      { name: 'BR11 (Mukta)', name_bn: 'বিআর১১ (মুক্তা)', duration: '১৪৫ দিন', yield_kg: '২২.০ কেজি/শতক', note: 'বৃষ্টি-নির্ভর মধ্যম জমিতে নির্ভরযোগ্য' }
    ],
    rationale_bn: 'বর্ষা মৌসুমে কম খরচে বৃষ্টির পানি কাজে লাগিয়ে আমন ধান চাষ লাভজনক।'
  },
  {
    crop_id: 3,
    name: 'Wheat',
    name_bn: 'গম',
    category: 'দানাদার খাদ্যশস্য (Cereal)',
    seasons: ['রবি'],
    suitable_soils: ['দোআঁশ', 'বেলে', 'পলি'],
    water_need: 'স্বল্প',
    base_cost_per_decimal: 300.00,
    base_return_min_per_decimal: 480.00,
    base_return_max_per_decimal: 560.00,
    risk_level: 'কম (Low)',
    varieties: [
      { name: 'BARI Gom-28', name_bn: 'বারি গম-২৮', duration: '১০৫ দিন', yield_kg: '১৬.০ কেজি/শতক', note: 'তাপসহনশীল ও আগাম কাটার উপযোগী' },
      { name: 'BARI Gom-33', name_bn: 'বারি গম-৩৩', duration: '১১০ দিন', yield_kg: '১৮.৫ কেজি/শতক', note: 'প্রথম ব্লাস্ট রোগ প্রতিরোধী ও জিংক সমৃদ্ধ জাত' }
    ],
    rationale_bn: 'কম সেচ খরচ ও স্বল্প মেয়াদে গম চাষ রবি মৌসুমে বোরোর বিকল্প হিসেবে ব্যয়সাশ্রয়ী।'
  },
  {
    crop_id: 4,
    name: 'Potato',
    name_bn: 'আলু',
    category: 'কন্দজাত সবজি (Tuber)',
    seasons: ['রবি'],
    suitable_soils: ['দোআঁশ', 'বেলে'],
    water_need: 'মাঝারি',
    base_cost_per_decimal: 950.00,
    base_return_min_per_decimal: 1600.00,
    base_return_max_per_decimal: 2100.00,
    risk_level: 'উচ্চ (High - বাজারদর ও নাবি ধসা রোগ)',
    varieties: [
      { name: 'Diamant', name_bn: 'ডায়মন্ট', duration: '৯০ দিন', yield_kg: '১১০.০ কেজি/শতক', note: 'হলুদ রঙের উচ্চ ফলনশীল গোল আলু' },
      { name: 'Cardinal', name_bn: 'কার্ডিনাল', duration: '৯০ দিন', yield_kg: '১০৫.০ কেজি/শতক', note: 'লাল চামড়ার জনপ্রিয় টেবিল আলু' },
      { name: 'Granola', name_bn: 'গ্রানোলা', duration: '৮৫ দিন', yield_kg: '৯৫.০ কেজি/শতক', note: 'নাবি ধসা রোগ সহনশীল' }
    ],
    rationale_bn: 'বেলে-দোআঁশ মাটিতে সঠিক বীজ ও সারের ব্যবস্থাপনায় আলু সর্বোচ্চ বাণিজ্যিক মুনাফা নিশ্চিত করতে সক্ষম।'
  },
  {
    crop_id: 5,
    name: 'Maize',
    name_bn: 'ভুট্টা',
    category: 'দানাদার অর্থকরী ফসল (Cash Crop)',
    seasons: ['রবি', 'খরিপ-১'],
    suitable_soils: ['দোআঁশ', 'বেলে', 'পলি'],
    water_need: 'মাঝারি',
    base_cost_per_decimal: 450.00,
    base_return_min_per_decimal: 800.00,
    base_return_max_per_decimal: 980.00,
    risk_level: 'কম থেকে মাঝারি (Low-Medium)',
    varieties: [
      { name: 'BARI Hybrid Maize-9', name_bn: 'বারি হাইব্রিড ভুট্টা-৯', duration: '১৪৫ দিন', yield_kg: '৪২.০ কেজি/শতক', note: 'হেলে পড়া প্রতিরোধী ও বড় মোচা' },
      { name: 'Pioneer P3396', name_bn: 'পায়োনিয়ার পি৩৩৯৬', duration: '১৪০ দিন', yield_kg: '৪৫.০ কেজি/শতক', note: 'উচ্চ পুষ্টিমানসম্পন্ন বাণিজ্যিক জাত' }
    ],
    rationale_bn: 'পোল্ট্রি ও মাছের খাদ্য তৈরিতে ভুট্টার ব্যাপক চাহিদা রয়েছে, ফলে বিক্রয় নিশ্চিত ও লাভজনক।'
  },
  {
    crop_id: 6,
    name: 'Mustard',
    name_bn: 'সরিষা',
    category: 'তৈলবীজ (Oilseed)',
    seasons: ['রবি'],
    suitable_soils: ['দোআঁশ', 'বেলে', 'পলি'],
    water_need: 'স্বল্প',
    base_cost_per_decimal: 220.00,
    base_return_min_per_decimal: 450.00,
    base_return_max_per_decimal: 550.00,
    risk_level: 'কম (Low)',
    varieties: [
      { name: 'BARI Sarisha-14', name_bn: 'বারি সরিষা-১৪', duration: '৮০ দিন', yield_kg: '৬.৫ কেজি/শতক', note: 'স্বল্পমেয়াদী, সরিষা তোলার পর বোরো করা যায়' },
      { name: 'BARI Sarisha-17', name_bn: 'বারি সরিষা-১৭', duration: '৮৫ দিন', yield_kg: '৭.২ কেজি/শতক', note: 'তেলের পরিমাণ বেশি ও উজ্জ্বল হলুদ বীজ' }
    ],
    rationale_bn: 'আমন ও বোরোর মধ্যবর্তী সময়ে মাত্র ৮০-৮৫ দিনে অতিরিক্ত আয় নিশ্চিত করার জন্য সরিষা আদর্শ।'
  }
];

/**
 * Calculates suitability score for a crop given farm conditions
 */
function scoreCrop(crop, farmConditions) {
  let score = 0;
  const reasons = [];

  // 1. Season Matching (Mandatory: 40 points)
  if (crop.seasons.includes(farmConditions.season)) {
    score += 40;
    reasons.push(`${farmConditions.season} মৌসুমের জন্য উপযোগী`);
  } else {
    // If season doesn't match, heavily penalize
    score -= 100;
    return { score: -1, reasons: ['চলতি মৌসুমের সাথে সামঞ্জস্যপূর্ণ নয়'] };
  }

  // 2. Soil Compatibility (30 points)
  if (crop.suitable_soils.includes(farmConditions.soil_type)) {
    score += 30;
    reasons.push(`${farmConditions.soil_type} মাটিতে খুব ভালো জন্মায়`);
  } else {
    score += 10;
    reasons.push(`${farmConditions.soil_type} মাটিতে অতিরিক্ত পরিচর্যা আবশ্যক`);
  }

  // 3. Water Availability Compatibility (20 points)
  if (crop.water_need === farmConditions.water_availability) {
    score += 20;
    reasons.push(`খামারের ${farmConditions.water_availability} পানির প্রাপ্যতা এর সাথে সম্পূর্ণ সামঞ্জস্যপূর্ণ`);
  } else if (farmConditions.water_availability === 'উচ্চ') {
    score += 18;
    reasons.push(`পর্যাপ্ত সেচ ব্যবস্থা বিদ্যমান`);
  } else if (crop.water_need === 'উচ্চ' && farmConditions.water_availability === 'স্বল্প') {
    score -= 25;
    reasons.push(`উচ্চ সেচ চাহিদার তুলনায় খামারে পানির প্রাপ্যতা স্বল্প`);
  } else {
    score += 12;
  }

  // 4. Budget Constraint Alignment (10 points)
  const totalCost = crop.base_cost_per_decimal * farmConditions.land_size;
  if (farmConditions.budget && farmConditions.budget > 0) {
    if (totalCost <= farmConditions.budget) {
      score += 10;
      reasons.push(`নির্ধারিত বাজেটের মধ্যে উৎপাদন সম্ভব`);
    } else {
      score -= 15;
      reasons.push(`মোট আনুমানিক খরচ (${Math.round(totalCost)} টাকা) বাজেটের চেয়ে বেশি`);
    }
  } else {
    score += 8;
  }

  return { score, reasons };
}

/**
 * Generates Integrated Farming Strategies (FR-12)
 */
function evaluateIntegratedFarming(farmConditions, selectedCrops) {
  const strategies = [];
  const resources = farmConditions.existing_resources || [];

  // Pond + Poultry/Fisheries integration
  if (farmConditions.has_pond) {
    if (resources.includes('poultry')) {
      strategies.push({
        title: 'পুকুরে হাঁস-মুরগি ও সমন্বিত মাছ চাষ',
        benefit_bn: 'পুকুরপাড়ে পোল্ট্রি শেড তৈরি করলে হাঁস-মুরগির বিষ্ঠা পুকুরে সরাসরি মাছের প্রাকৃতিক খাদ্য (প্লাঙ্কটন) তৈরি করে, যা কৃত্রিম খাবারের খরচ ২৫-৩০% পর্যন্ত কমিয়ে দেয়।',
        cost_saving: 'খাবারের খরচ ৩০% হ্রাস'
      });
    } else {
      strategies.push({
        title: 'পুকুরপাড়ে উন্নত সবজি ও মাছের সমন্বিত চাষ',
        benefit_bn: 'পুকুরের পাড়ে লাউ, শিম, পেঁপে বা কলা চাষ করলে পুকুরের আর্দ্রতা কাজে লাগিয়ে অতিরিক্ত লাভ করা যায় এবং পুকুরে ছায়া নিয়ন্ত্রণ করা সম্ভব হয়।',
        cost_saving: 'অতিরিক্ত জমি ছাড়াই বাড়তি আয়'
      });
    }
  }

  // Dairy + Crops
  if (resources.includes('dairy')) {
    strategies.push({
      title: 'গোবর ও বায়োগ্যাস স্লারি থেকে জৈব পুষ্টিচক্র',
      benefit_bn: 'গরু/মহিষের গোবর থেকে ট্রাইকো-কম্পোস্ট ও কেঁচো সার তৈরি করে জমিতে প্রয়োগ করলে রাসায়নিক ইউরিয়া ও টিএসপি সারের ওপর নির্ভরতা ৩৫% কমে যায় এবং মাটির আর্দ্রতা বৃদ্ধি পায়।',
      cost_saving: 'রাসায়নিক সারের খরচ ৩৫% সাশ্রয়'
    });
  }

  return strategies;
}

/**
 * Generates Waste-to-Value Strategies (FR-13)
 */
function evaluateWasteToValue(farmConditions, selectedCrops) {
  const initiatives = [];
  const resources = farmConditions.existing_resources || [];

  if (resources.includes('crop_residues') || selectedCrops.some((c) => c.name.includes('Rice'))) {
    initiatives.push({
      item: 'ধানের খড় ও নাড়া (Rice Straw)',
      application_bn: 'খড় আগুনে না পুড়িয়ে মাটিতে মিশিয়ে কম্পোস্ট তৈরি অথবা স্বল্প খরচে পুষ্টিকর ঝিনুক মাশরুম (Oyster Mushroom) চাষ করে প্রতি বেডে ৩০০-৫০০ টাকা নিট আয় করা সম্ভব।',
      impact: 'মাটির অনুজীব বৃদ্ধি ও উপরি আয়'
    });
  }

  if (resources.includes('compost') || resources.includes('dairy')) {
    initiatives.push({
      item: 'উচ্ছিষ্ট জৈব বর্জ্য ও গোবর',
      application_bn: 'কেঁচো সার (Vermicompost) উৎপাদন করে নিজের ফসলে ব্যবহারের পর অতিরিক্ত সার কেজিপ্রতি ১০-১৫ টাকায় স্থানীয় বাজারে বিক্রি করা যায়।',
      impact: 'বাণিজ্যিক জৈব সার প্রস্তুত'
    });
  }

  return initiatives;
}

/**
 * Main Recommendation Generation Function
 */
function generateRecommendation(farmConditions) {
  const landSize = parseFloat(farmConditions.land_size) || 1;
  const budget = parseFloat(farmConditions.budget) || 0;

  // Filter and score crops for current season
  const evaluatedCrops = CROP_DATABASE
    .map((crop) => {
      const { score, reasons } = scoreCrop(crop, farmConditions);
      return { ...crop, score, reasons };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);

  if (evaluatedCrops.length === 0) {
    // Fallback if strict season didn't match
    const fallbackCrop = CROP_DATABASE[0];
    evaluatedCrops.push({
      ...fallbackCrop,
      score: 50,
      reasons: ['সাধারণ রবি মৌসুমের জন্য প্রস্তাবিত']
    });
  }

  // Generate 3 Distinct Comparative Options (FR-15, FR-23)
  // Option 1: Max Profitability
  const maxProfitCrop = [...evaluatedCrops].sort((a, b) => {
    const profitA = (a.base_return_max_per_decimal - a.base_cost_per_decimal);
    const profitB = (b.base_return_max_per_decimal - b.base_cost_per_decimal);
    return profitB - profitA;
  })[0] || evaluatedCrops[0];

  // Option 2: Low-Risk & Stable
  const lowRiskCrop = evaluatedCrops.find((c) => c.risk_level.includes('Low') && c.crop_id !== maxProfitCrop.crop_id) 
    || evaluatedCrops[1] 
    || evaluatedCrops[0];

  // Option 3: Resource-Efficient / Alternative
  const alternativeCrop = evaluatedCrops.find((c) => c.crop_id !== maxProfitCrop.crop_id && c.crop_id !== lowRiskCrop.crop_id)
    || evaluatedCrops[2]
    || evaluatedCrops[0];

  const candidateCrops = [
    { crop: maxProfitCrop, type: 'MAX_PROFIT', badge: 'সর্বোচ্চ সম্ভাব্য মুনাফা (High Return)' },
    { crop: lowRiskCrop, type: 'LOW_RISK', badge: 'কম ঝুঁকি ও সুষম ব্যয় (Safe & Stable)' },
    { crop: alternativeCrop, type: 'BALANCED', badge: 'সম্পদ-বান্ধব বিকল্প (Resource Efficient)' }
  ];

  // Deduplicate in case list is short
  const uniqueCandidates = [];
  const seenIds = new Set();
  for (const item of candidateCrops) {
    if (!seenIds.has(item.crop.crop_id)) {
      uniqueCandidates.push(item);
      seenIds.add(item.crop.crop_id);
    }
  }

  // Build Detailed Options with financial calculations
  const options = uniqueCandidates.map((item, index) => {
    const crop = item.crop;
    const estCost = Math.round(crop.base_cost_per_decimal * landSize);
    const estReturnMin = Math.round(crop.base_return_min_per_decimal * landSize);
    const estReturnMax = Math.round(crop.base_return_max_per_decimal * landSize);
    const estNetProfitMin = estReturnMin - estCost;
    const estNetProfitMax = estReturnMax - estCost;
    const avgProfit = Math.round((estNetProfitMin + estNetProfitMax) / 2);
    const roiPercentage = estCost > 0 ? Math.round((avgProfit / estCost) * 100) : 0;

    // Cost Breakdown (Seed 15%, Fert 35%, Irrigation 25%, Labor 25%)
    const costBreakdown = {
      seed_cost: Math.round(estCost * 0.15),
      fertilizer_cost: Math.round(estCost * 0.35),
      irrigation_cost: Math.round(estCost * 0.25),
      labor_and_operations: Math.round(estCost * 0.25)
    };

    return {
      option_id: index + 1,
      option_type: item.type,
      badge_text: item.badge,
      crop_id: crop.crop_id,
      crop_name: crop.name,
      crop_name_bn: crop.name_bn,
      category: crop.category,
      risk_level: crop.risk_level,
      suitability_score: Math.min(100, Math.max(60, crop.score)),
      estimated_cost: estCost,
      potential_return_min: estReturnMin,
      potential_return_max: estReturnMax,
      estimated_net_profit_min: estNetProfitMin,
      estimated_net_profit_max: estNetProfitMax,
      roi_percentage: roiPercentage,
      cost_breakdown: costBreakdown,
      recommended_varieties: crop.varieties,
      assumptions: `প্রতি শতকে আনুমানিক খরচ ৳${crop.base_cost_per_decimal} এবং গড় ফলন বাজারদর অনুযায়ী প্রাক্কলিত।`,
      rationale: crop.rationale_bn,
      suitability_reasons: crop.reasons
    };
  });

  // Evaluate integrated farming & waste to value
  const integratedTips = evaluateIntegratedFarming(farmConditions, uniqueCandidates.map((c) => c.crop));
  const wasteToValueTips = evaluateWasteToValue(farmConditions, uniqueCandidates.map((c) => c.crop));

  // Explanatory narrative in clear Bangla (FR-17, FR-19)
  const explanation_bn = `আপনার খামারের জেলা: ${farmConditions.district || 'উক্ত অঞ্চল'}, জমির পরিমাণ: ${landSize} শতক, মাটির ধরন: ${farmConditions.soil_type} এবং বর্তমান কৃষি মৌসুম: ${farmConditions.season}। মাটির পুষ্টিগুণ এবং পানির প্রাপ্যতার প্রেক্ষিতে শীর্ষ প্রস্তাবিত ফসল হিসেবে '${options[0].crop_name_bn}' সবচেয়ে লাভজনক। পাশাপাশি মাঝারি ঝুঁকিতে খাদ্য নিরাপত্তা ও স্থায়ী আয়ের জন্য '${options[1]?.crop_name_bn || options[0].crop_name_bn}' একটি নির্ভরযোগ্য বিকল্প।`;

  // Uncertainty Notice (FR-21)
  const uncertainty_note = 'প্রদর্শিত ব্যয় ও সম্ভাব্য মুনাফা একটি প্রাথমিক প্রাক্কলন। জলবায়ু বিপর্যয়, সার সংকট বা স্থানীয় পাইকারি বাজারদরের ওঠানামার কারণে বাস্তব ফলাফল ভিন্ন হতে পারে। এটি নিশ্চিত মুনাফার কোনো নিশ্চয়তা প্রদান করে না।';

  // Expert Verification Notice (FR-22)
  const expert_notice = 'যেকোনো বৃহৎ বাণিজ্যিক চাষাবাদ বা অতিরিক্ত পুঁজি বিনিয়োগের পূর্বে আপনার উপজেলা কৃষি কর্মকর্তা (DAE) বা উপ-সহকারী কৃষি কর্মকর্তার সাথে মাটির নমুনা পরীক্ষা ও পরামর্শ করে নিন।';

  return {
    recommendation_type: options[0]?.option_type || 'BALANCED',
    model_version: 'agroWish-v1.2-heuristics',
    generated_at: new Date().toISOString(),
    farm_conditions: {
      district: farmConditions.district,
      upazila: farmConditions.upazila,
      land_size: landSize,
      soil_type: farmConditions.soil_type,
      water_availability: farmConditions.water_availability,
      season: farmConditions.season,
      budget: budget,
      has_pond: farmConditions.has_pond,
      pond_size: farmConditions.pond_size,
      existing_resources: farmConditions.existing_resources || []
    },
    options,
    explanation_bn,
    integrated_tips: integratedTips,
    waste_to_value_tips: wasteToValueTips,
    uncertainty_note,
    expert_notice
  };
}

/**
 * Normalizes season label across English/Bangla DB & profile values
 */
function normalizeSeason(raw) {
  if (!raw) return 'রবি';
  const s = String(raw).trim().toLowerCase();
  if (s === 'rabi' || s === 'রবি') return 'রবি';
  if (s === 'kharif-1' || s === 'খরিপ-১' || s === 'kharif 1') return 'খরিপ-১';
  if (s === 'kharif-2' || s === 'খরিপ-২' || s === 'kharif 2') return 'খরিপ-২';
  if (s === 'year-round' || s === 'সারা বছর') return 'সারা বছর';
  return String(raw).trim();
}

/**
 * Bilingual soil compatibility matcher (supports both English DB strings and Bangla soil_type enums)
 */
function soilMatches(recommendedSoilStr, farmerSoilBn) {
  if (!recommendedSoilStr || !farmerSoilBn) return true;
  const rec = String(recommendedSoilStr).toLowerCase();
  const f = String(farmerSoilBn).trim();
  if (rec.includes(f.toLowerCase())) return true;
  const map = {
    'দোআঁশ': ['loam', 'loamy'],
    'বেলে': ['sandy', 'sandy loam'],
    'এঁটেল': ['clay', 'clayey', 'clay loam'],
    'পলি': ['silt', 'silty', 'alluvial']
  };
  const aliases = map[f] || [];
  return aliases.some((kw) => rec.includes(kw));
}

/**
 * Bilingual water requirement compatibility check
 */
function waterLevelFromText(waterReqStr) {
  if (!waterReqStr) return 'মাঝারি';
  const w = String(waterReqStr).toLowerCase();
  if (w.includes('উচ্চ') || w.includes('high') || w.includes('mandatory')) return 'উচ্চ';
  if (w.includes('স্বল্প') || w.includes('low')) return 'স্বল্প';
  return 'মাঝারি';
}

/**
 * Full SRS Multi-Option Decision Engine (FR-08, FR-09, FR-10, FR-11, FR-12, FR-13, FR-14, FR-15, FR-16, FR-21, FR-22, FR-23, FR-35)
 */
function generateFullSrsRecommendation({
  farmer,
  resources = [],
  crops = [],
  varietiesByCrop = {},
  costItemsByCrop = {},
  integratedCombos = [],
  wasteRules = []
}) {
  const landSize = Math.max(0.5, parseFloat(farmer.land_size) || 1);
  const budget = parseFloat(farmer.budget) || 0;
  const soilType = farmer.soil_type || 'দোআঁশ';
  const waterAvail = farmer.water_availability || 'মাঝারি';
  const season = normalizeSeason(farmer.season || 'রবি');
  const riskPref = farmer.risk_preference || 'MEDIUM';
  const hasPond = Boolean(farmer.has_pond) || resources.some((r) => r.resource_type === 'pond');

  // Parse legacy existing_resources array
  let legacyResources = [];
  if (farmer.existing_resources) {
    try {
      legacyResources = typeof farmer.existing_resources === 'string'
        ? JSON.parse(farmer.existing_resources)
        : farmer.existing_resources;
      if (!Array.isArray(legacyResources)) legacyResources = [];
    } catch {
      legacyResources = [];
    }
  }

  // Build unified resource_type Set
  const resourceTypeSet = new Set();
  for (const r of resources) {
    if (r.resource_type) resourceTypeSet.add(r.resource_type);
  }
  if (hasPond) resourceTypeSet.add('pond');
  if (waterAvail === 'উচ্চ') resourceTypeSet.add('water');
  if (legacyResources.includes('dairy')) resourceTypeSet.add('livestock');
  if (legacyResources.includes('poultry')) resourceTypeSet.add('poultry');
  if (legacyResources.includes('crop_residues')) resourceTypeSet.add('crop_residue');
  if (legacyResources.includes('compost')) resourceTypeSet.add('organic_material');
  if (legacyResources.includes('fisheries')) resourceTypeSet.add('pond');

  const hasOrganicResource =
    resourceTypeSet.has('livestock') ||
    resourceTypeSet.has('poultry') ||
    resourceTypeSet.has('organic_material');
  const fertilizerDiscountRate = hasOrganicResource ? 0.18 : 0.0;

  // Source crop list (DB crops preferred; fallback to CROP_DATABASE if empty)
  const sourceCrops = crops.length > 0
    ? crops.map((c) => ({
        crop_id: c.crop_id,
        crop_name: c.crop_name,
        bengali_name: c.bengali_name || c.crop_name,
        season: normalizeSeason(c.season),
        crop_category: c.crop_category || 'ফসল',
        recommended_soil: c.recommended_soil || 'দোআঁশ',
        water_requirement: c.water_requirement || 'মাঝারি',
        avg_cost_per_decimal: parseFloat(c.avg_cost_per_decimal) || 350,
        avg_revenue_per_decimal: parseFloat(c.avg_revenue_per_decimal) || 600,
        varieties: varietiesByCrop[c.crop_id] || []
      }))
    : CROP_DATABASE.map((dc) => ({
        crop_id: dc.crop_id,
        crop_name: dc.name,
        bengali_name: dc.name_bn,
        season: normalizeSeason(dc.seasons[0]),
        crop_category: dc.category,
        recommended_soil: dc.suitable_soils.join(', '),
        water_requirement: dc.water_need,
        avg_cost_per_decimal: dc.base_cost_per_decimal,
        avg_revenue_per_decimal: Math.round((dc.base_return_min_per_decimal + dc.base_return_max_per_decimal) / 2),
        varieties: dc.varieties.map((v, idx) => ({
          variety_id: null,
          variety_name: v.name,
          bengali_name: v.name_bn,
          duration_days: parseInt(String(v.duration).replace(/\D/g, ''), 10) || 120,
          yield_per_decimal_kg: parseFloat(String(v.yield_kg).replace(/[^\d.]/g, '')) || 20,
          pest_resistance_notes: v.note
        }))
      }));

  // Evaluate every crop
  const evaluated = sourceCrops.map((crop) => {
    const seasonMatch = crop.season === season || crop.season === 'সারা বছর';
    const soilMatch = soilMatches(crop.recommended_soil, soilType);
    const cropWaterLvl = waterLevelFromText(crop.water_requirement);
    const waterMatch =
      cropWaterLvl === waterAvail ||
      waterAvail === 'উচ্চ' ||
      (waterAvail === 'মাঝারি' && cropWaterLvl === 'স্বল্প');

    // Compute cost breakdown using DB cost_items if present
    const dbCostItems = costItemsByCrop[crop.crop_id] || [];
    let estCostMin = 0;
    let estCostMax = 0;
    let seedCost = 0;
    let standardFertCost = 0;
    let irrigationCost = 0;
    let laborCost = 0;
    let pesticideCost = 0;

    if (dbCostItems.length > 0) {
      for (const item of dbCostItems) {
        const minTotal = Math.round(parseFloat(item.cost_min_per_decimal) * landSize);
        const maxTotal = Math.round(parseFloat(item.cost_max_per_decimal) * landSize);
        const midTotal = Math.round((minTotal + maxTotal) / 2);
        estCostMin += minTotal;
        estCostMax += maxTotal;
        if (item.item_category === 'seed') seedCost += midTotal;
        else if (item.item_category === 'fertilizer') standardFertCost += midTotal;
        else if (item.item_category === 'irrigation') irrigationCost += midTotal;
        else if (item.item_category === 'pesticide') pesticideCost += midTotal;
        else laborCost += midTotal;
      }
    } else {
      const baseCost = Math.round(crop.avg_cost_per_decimal * landSize);
      estCostMin = Math.round(baseCost * 0.9);
      estCostMax = Math.round(baseCost * 1.15);
      seedCost = Math.round(baseCost * 0.15);
      standardFertCost = Math.round(baseCost * 0.35);
      irrigationCost = Math.round(baseCost * 0.25);
      laborCost = Math.round(baseCost * 0.25);
    }

    const fertSavings = Math.round(standardFertCost * fertilizerDiscountRate);
    const effectiveFertCost = Math.max(0, standardFertCost - fertSavings);
    estCostMin = Math.max(0, estCostMin - fertSavings);
    estCostMax = Math.max(estCostMin, estCostMax - Math.round(fertSavings * 0.8));
    const totalEstCost = seedCost + effectiveFertCost + irrigationCost + laborCost + pesticideCost;

    const estReturnMin = Math.round(crop.avg_revenue_per_decimal * 0.9 * landSize);
    const estReturnMax = Math.round(crop.avg_revenue_per_decimal * 1.2 * landSize);
    const avgReturn = Math.round((estReturnMin + estReturnMax) / 2);
    const netProfit = avgReturn - totalEstCost;
    const roi = totalEstCost > 0 ? Math.round((netProfit / totalEstCost) * 100) : 0;
    const fitsBudget = budget <= 0 || estCostMin <= budget * 1.15;

    // Confidence score (0 - 100)
    let confidence = 45;
    const reasons = [];
    if (seasonMatch) {
      confidence += 28;
      reasons.push(`${season} মৌসুমের উপযোগী`);
    }
    if (soilMatch) {
      confidence += 15;
      reasons.push(`${soilType} মাটির জন্য অনুকূল`);
    } else {
      reasons.push(`${soilType} মাটিতে বাড়তি জৈব সার ও পরিচর্যা প্রয়োজন`);
    }
    if (waterMatch) {
      confidence += 7;
      reasons.push(`পানির প্রাপ্যতার (${waterAvail}) সাথে সামঞ্জস্যপূর্ণ`);
    } else {
      confidence -= 10;
      reasons.push(`ফসলের সেচ চাহিদা (${cropWaterLvl}) খামারের পানির প্রাপ্যতার চেয়ে বেশি`);
    }
    if (fitsBudget) {
      confidence += 5;
      if (budget > 0) reasons.push(`বাজেটের (৳${budget}) মধ্যে বাস্তবায়নযোগ্য`);
    } else {
      confidence -= 12;
      reasons.push(`ন্যূনতম ব্যয় (৳${estCostMin}) নির্ধারিত বাজেটের চেয়ে বেশি`);
    }
    if (riskPref === 'LOW' && crop.avg_cost_per_decimal <= 400) confidence += 4;
    if (riskPref === 'HIGH' && roi >= 65) confidence += 4;

    confidence = Math.min(98, Math.max(40, confidence));

    const synergyBadges = [];
    if (hasOrganicResource && fertSavings > 0) {
      synergyBadges.push({
        type: 'ORGANIC_SAVINGS',
        text: `খামারের জৈব সম্পদে সারের খরচ ৳${fertSavings} সাশ্রয়`,
        savings_amount: fertSavings
      });
    }
    if (hasPond) {
      synergyBadges.push({
        type: 'POND_SYNERGY',
        text: 'পুকুরের পানি ও পাড় সমন্বিতভাবে ব্যবহারযোগ্য',
        savings_amount: 0
      });
    }

    const topVariety = crop.varieties && crop.varieties.length > 0 ? crop.varieties[0] : null;
    const avgDuration = topVariety ? topVariety.duration_days : 120;

    return {
      item_type: 'CROP',
      crop_id: crop.crop_id,
      variety_id: topVariety ? topVariety.variety_id : null,
      crop_name: crop.crop_name,
      bengali_name: crop.bengali_name,
      season: crop.season,
      crop_category: crop.crop_category,
      duration_days: avgDuration,
      recommended_soil: crop.recommended_soil,
      water_requirement: crop.water_requirement,
      cost_per_decimal: crop.avg_cost_per_decimal,
      return_per_decimal: crop.avg_revenue_per_decimal,
      est_cost_min: estCostMin,
      est_cost_max: estCostMax,
      total_estimated_cost: totalEstCost,
      est_return_min: estReturnMin,
      est_return_max: estReturnMax,
      total_gross_return: avgReturn,
      projected_net_profit: netProfit,
      profit_margin_roi: roi,
      confidence_score: confidence,
      season_match: seasonMatch,
      soil_match: soilMatch,
      fits_budget: fitsBudget,
      reason: reasons.join('। ') + '।',
      assumptions: `প্রতি শতকে গড় ব্যয় ৳${crop.avg_cost_per_decimal} ও গড় ফলনমূল্য ৳${crop.avg_revenue_per_decimal} ধরে ${landSize} শতক জমির জন্য হিসাবকৃত।`,
      expert_verification_needed: !soilMatch || !fitsBudget,
      cost_breakdown: {
        seed_cost: seedCost,
        fertilizer_cost: effectiveFertCost,
        standard_fertilizer_cost: standardFertCost,
        fertilizer_savings: fertSavings,
        irrigation_cost: irrigationCost,
        pesticide_cost: pesticideCost,
        labor_and_operations: laborCost,
        items: dbCostItems.map((ci) => ({
          item_name: ci.item_name,
          category: ci.item_category,
          min_total: Math.round(parseFloat(ci.cost_min_per_decimal) * landSize),
          max_total: Math.round(parseFloat(ci.cost_max_per_decimal) * landSize)
        }))
      },
      synergy_badges: synergyBadges,
      varieties: crop.varieties.map((v) => ({
        variety_id: v.variety_id,
        name: v.variety_name,
        name_bn: v.bengali_name || v.variety_name,
        duration_days: v.duration_days,
        yield_kg: `${v.yield_per_decimal_kg} কেজি/শতক`,
        notes: v.pest_resistance_notes
      }))
    };
  });

  // Strict season + soil + budget matching (FR-08, FR-16)
  let selectedCrops = evaluated.filter((c) => c.season_match && c.soil_match && c.fits_budget);
  let isFallback = false;
  let fallbackReason = '';

  if (selectedCrops.length === 0) {
    isFallback = true;
    // Fallback 1: season + budget (relaxed soil)
    selectedCrops = evaluated.filter((c) => c.season_match && c.fits_budget);
    if (selectedCrops.length > 0) {
      fallbackReason = `${season} মৌসুমে ${soilType} মাটির জন্য সরাসরি উপযোগী বাজেট-সম্মত ফসল না থাকায় কাছাকাছি অনুকূল বিকল্প ফসল সুপারিশ করা হলো।`;
    }
  }

  if (selectedCrops.length === 0) {
    isFallback = true;
    // Fallback 2: season only (relaxed budget)
    selectedCrops = evaluated.filter((c) => c.season_match);
    if (selectedCrops.length > 0) {
      fallbackReason = `নির্ধারিত বাজেটের (৳${budget}) মধ্যে ${season} মৌসুমের পূর্ণ জমির ফসল সংকুলান না হওয়ায় সবচেয়ে সাশ্রয়ী বিকল্পগুলো ক্রমানুসারে দেখানো হলো।`;
    }
  }

  if (selectedCrops.length === 0) {
    isFallback = true;
    selectedCrops = [...evaluated].sort((a, b) => a.est_cost_min - b.est_cost_min).slice(0, 3);
    fallbackReason = 'বর্তমান প্রোফাইলের ভিত্তিতে সর্বনিম্ন ঝুঁকি ও খরচের সাধারণ বিকল্প ফসল সুপারিশ করা হলো।';
  }

  selectedCrops.sort((a, b) => {
    if (b.confidence_score !== a.confidence_score) return b.confidence_score - a.confidence_score;
    return b.projected_net_profit - a.projected_net_profit;
  });

  const cropOptions = selectedCrops.slice(0, 4).map((c) => ({
    ...c,
    is_fallback: isFallback,
    fallback_tag: isFallback ? 'বিকল্প সুপারিশ (Fallback)' : 'অনুকূল ও সর্বোত্তম সুপারিশ'
  }));

  // Evaluate Integrated Farming Combinations (FR-12)
  const integratedOptions = [];
  for (const combo of integratedCombos) {
    const reqTypes = String(combo.compatibility_rule || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const matchedTypes = reqTypes.filter((t) => resourceTypeSet.has(t));
    if (reqTypes.length === 0 || matchedTypes.length === reqTypes.length) {
      integratedOptions.push({
        item_type: 'INTEGRATED',
        combo_id: combo.combo_id,
        title: combo.combo_name,
        description: combo.description,
        compatibility_rule: combo.compatibility_rule,
        matched_resources: matchedTypes,
        est_cost_min: parseFloat(combo.est_cost_min),
        est_cost_max: parseFloat(combo.est_cost_max),
        est_return_min: parseFloat(combo.est_return_min),
        est_return_max: parseFloat(combo.est_return_max),
        confidence_score: matchedTypes.length >= 2 ? 92 : 85,
        reason: `আপনার খামারের রেকর্ডকৃত সম্পদের (${matchedTypes.join(', ') || 'সাধারণ'}) সাথে সরাসরি সামঞ্জস্যপূর্ণ।`,
        assumptions: 'মাঝারি আকারের খামারে ১ মৌসুমে সমন্বিত ব্যবস্থাপনা ধরে প্রাক্কলিত।',
        risk_note: combo.risk_note,
        safety_note: combo.risk_note,
        expert_verification_needed: Boolean(combo.expert_verification_needed)
      });
    }
  }

  // If no integrated combo matched user's exact resources, provide top general guidance combo with note
  if (integratedOptions.length === 0 && integratedCombos.length > 0) {
    const fallbackCombo = integratedCombos[0];
    integratedOptions.push({
      item_type: 'INTEGRATED',
      combo_id: fallbackCombo.combo_id,
      title: fallbackCombo.combo_name,
      description: fallbackCombo.description,
      compatibility_rule: fallbackCombo.compatibility_rule,
      matched_resources: [],
      est_cost_min: parseFloat(fallbackCombo.est_cost_min),
      est_cost_max: parseFloat(fallbackCombo.est_cost_max),
      est_return_min: parseFloat(fallbackCombo.est_return_min),
      est_return_max: parseFloat(fallbackCombo.est_return_max),
      confidence_score: 62,
      reason: 'সমন্বিত খামার শুরু করার জন্য প্রাথমিক মডেল (প্রয়োজনীয় সম্পদ: পুকুর/গবাদিপশু যুক্ত করলে পূর্ণ সুবিধা মিলবে)।',
      assumptions: 'নতুন সমন্বিত ইউনিট স্থাপন খরচ অন্তর্ভুক্ত করে আনুমানিক হিসাব।',
      risk_note: fallbackCombo.risk_note,
      safety_note: fallbackCombo.risk_note,
      expert_verification_needed: true
    });
  }

  // Evaluate Waste-to-Value Rules (FR-13, FR-22)
  const hasCerealCrop = cropOptions.some((c) => /rice|wheat|maize|ধান|গম|ভুট্টা/i.test(`${c.crop_name} ${c.bengali_name}`));
  const wasteOptions = [];
  for (const rule of wasteRules) {
    const src = String(rule.source_activity || '').trim();
    const matched = resourceTypeSet.has(src) || (src === 'crop_residue' && hasCerealCrop);
    if (matched) {
      wasteOptions.push({
        item_type: 'WASTE_TO_VALUE',
        rule_id: rule.rule_id,
        title: `${rule.by_product} → ${rule.target_activity}`,
        source_activity: rule.source_activity,
        by_product: rule.by_product,
        target_activity: rule.target_activity,
        usage_method: rule.usage_method,
        safety_note: rule.safety_note,
        est_cost_min: parseFloat(rule.est_cost_min),
        est_cost_max: parseFloat(rule.est_cost_max),
        est_return_min: parseFloat(rule.est_return_min),
        est_return_max: parseFloat(rule.est_return_max),
        confidence_score: 88,
        reason: `আপনার খামারের '${src}' উপজাত থেকে কম খরচে বাড়তি আয় ও সার সাশ্রয় সম্ভব।`,
        assumptions: 'খামারের নিজস্ব উপজাত ব্যবহার করে ১ চক্র উৎপাদন খরচ ও বাজারদর প্রাক্কলন।',
        expert_verification_needed: Boolean(rule.expert_verification_needed !== undefined ? rule.expert_verification_needed : true)
      });
    }
  }

  // Ensure at least 1 safe crop_residue/compost rule is visible if user has no matching resources yet
  if (wasteOptions.length === 0 && wasteRules.length > 0) {
    const rule = wasteRules.find((r) => r.source_activity === 'organic_material') || wasteRules[0];
    wasteOptions.push({
      item_type: 'WASTE_TO_VALUE',
      rule_id: rule.rule_id,
      title: `${rule.by_product} → ${rule.target_activity}`,
      source_activity: rule.source_activity,
      by_product: rule.by_product,
      target_activity: rule.target_activity,
      usage_method: rule.usage_method,
      safety_note: rule.safety_note,
      est_cost_min: parseFloat(rule.est_cost_min),
      est_cost_max: parseFloat(rule.est_cost_max),
      est_return_min: parseFloat(rule.est_return_min),
      est_return_max: parseFloat(rule.est_return_max),
      confidence_score: 70,
      reason: 'সাধারণ জৈব বর্জ্য পুনর্ব্যবহার মডেল (খামার সম্পদ যোগ করলে আরও নির্দিষ্ট পরামর্শ পাওয়া যাবে)।',
      assumptions: 'প্রাথমিক ক্ষুদ্র পরিসরে কম্পোস্ট উৎপাদন হিসাব।',
      expert_verification_needed: true
    });
  }

  const topName = cropOptions[0]?.bengali_name || 'উপযুক্ত ফসল';
  const secondName = cropOptions[1]?.bengali_name || topName;
  const explanationBn = `আপনার খামারের অবস্থান (${farmer.district || 'বাংলাদেশ'}), ${landSize} শতক ${soilType} মাটি এবং ${season} মৌসুমের ভিত্তিতে '${topName}' সর্বোচ্চ উপযোগী হিসেবে নির্বাচিত হয়েছে। পাশাপাশি ঝুঁকি ও ব্যয় ভারসাম্যের জন্য '${secondName}' একটি চমৎকার বিকল্প। আপনার ${resources.length}টি নিবন্ধিত খামার সম্পদের সাথে মিলিয়ে ${integratedOptions.length}টি সমন্বিত চাষ ও ${wasteOptions.length}টি বর্জ্য-থেকে-সম্পদ পরিকল্পনা যুক্ত করা হয়েছে।`;

  const uncertaintyNote = 'প্রদর্শিত খরচ ও সম্ভাব্য আয় BRRI, BARI এবং DAE-এর আদর্শ তথ্যের ওপর ভিত্তি করে একটি আনুমানিক পরিসর মাত্র। আবহাওয়া, বাজারদর ও মাটির স্থানীয় গুণের কারণে বাস্তব ফলাফল পরিবর্তিত হতে পারে।';
  const expertNotice = 'নতুন সমন্বিত খামার, জৈব বর্জ্য প্রক্রিয়াজাতকরণ বা বৃহৎ বিনিয়োগের আগে অবশ্যই স্থানীয় উপজেলা কৃষি কর্মকর্তা (DAE), মৎস্য কর্মকর্তা (DoF) বা প্রাণিসম্পদ কর্মকর্তার (DLS) পরামর্শ ও যাচাইকরণ গ্রহণ করুন।';

  return {
    recommendation_type: riskPref === 'LOW' ? 'LOW_RISK' : (riskPref === 'HIGH' ? 'MAX_PROFIT' : 'BALANCED'),
    model_version: 'agroWish-v2.0-srs-engine',
    generated_at: new Date().toISOString(),
    is_fallback: isFallback,
    fallback_reason: fallbackReason,
    explanation_bn: explanationBn,
    uncertainty_note: uncertaintyNote,
    expert_verification_notice: expertNotice,
    farmer_summary: {
      district: farmer.district,
      upazila: farmer.upazila,
      land_size: landSize,
      soil_type: soilType,
      water_availability: waterAvail,
      season: season,
      budget: budget,
      farming_goal: farmer.farming_goal || 'সুষম মুনাফা ও খাদ্য নিরাপত্তা',
      risk_preference: riskPref,
      has_pond: hasPond,
      has_organic_resource: hasOrganicResource,
      recorded_resource_types: [...resourceTypeSet]
    },
    crop_options: cropOptions,
    integrated_options: integratedOptions,
    waste_to_value_options: wasteOptions
  };
}

module.exports = {
  generateRecommendation,
  generateFullSrsRecommendation,
  normalizeSeason,
  soilMatches,
  CROP_DATABASE
};

