/**
 * agroWish Evaluation & SRS Verification Test Suite (NFR-06 & SRS Section 6.1)
 * Tests 10 documented agricultural, safety, fallback, AI grounding, and security scenarios.
 *
 * Usage:
 *   cd backend
 *   node tests/evaluate.js
 * (or `npm test`)
 */

const { spawn } = require('child_process');
const path = require('path');

const BACKEND_DIR = path.resolve(__dirname, '..');
const EVAL_PORT = 5056;
const BASE = `http://127.0.0.1:${EVAL_PORT}/api`;

const scenarioResults = [];

function recordScenario(id, title, srsRef, passed, detail) {
  scenarioResults.push({ id, title, srsRef, passed, detail });
  const badge = passed ? 'PASS' : 'FAIL';
  console.log(`[${badge}] ${id} | ${title} (${srsRef})`);
  console.log(`       -> ${detail}`);
}

async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const r = await fetch(`${BASE}/health`);
      if (r.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 350));
  }
  throw new Error('Evaluation server failed to start within timeout');
}

async function runEvaluation() {
  console.log('=========================================================================');
  console.log('       agroWish Full SRS Automated Evaluation Suite (10 Scenarios)       ');
  console.log('=========================================================================\n');

  const srv = spawn('node', ['server.js'], {
    cwd: BACKEND_DIR,
    env: { ...process.env, PORT: String(EVAL_PORT) },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stderrBuf = '';
  srv.stderr.on('data', (d) => { stderrBuf += d.toString(); });

  const createdRecIds = [];

  try {
    await waitForServer();

    // Authenticate Demo Farmer & Default Admin (admin@agrowish.com)
    const farmerLoginRes = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'farmer@agrowish.bd', password: 'Farmer@123' })
    });
    const farmerLogin = await farmerLoginRes.json();
    if (!farmerLoginRes.ok || !farmerLogin.token) {
      throw new Error(`Demo farmer login failed: ${farmerLogin.message || farmerLoginRes.status}`);
    }

    const adminLoginRes = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@agrowish.com', password: 'Admin@123' })
    });
    const adminLogin = await adminLoginRes.json();
    if (!adminLoginRes.ok || !adminLogin.token) {
      throw new Error(`Default admin login failed: ${adminLogin.message || adminLoginRes.status}`);
    }

    const fh = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${farmerLogin.token}` };
    const ah = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminLogin.token}` };

    // -------------------------------------------------------------------------
    // S01: Rabi Season Valid Crop & Variety Matching
    // -------------------------------------------------------------------------
    const s1Res = await fetch(`${BASE}/recommendations/generate`, {
      method: 'POST',
      headers: fh,
      body: JSON.stringify({ season: 'রবি', soil_type: 'দোআঁশ', water_availability: 'উচ্চ', land_size: 50, budget: 35000 })
    });
    const s1 = await s1Res.json();
    if (s1.recommendation_id) createdRecIds.push(s1.recommendation_id);
    const s1Ok = s1Res.status === 201 && !s1.is_fallback && s1.crop_options?.length > 0 && s1.crop_options[0].varieties?.length > 0;
    recordScenario(
      'S01',
      'Rabi Season Valid Crop & Variety Matching',
      'FR-08, FR-09, FR-10',
      s1Ok,
      `Matched ${s1.crop_options?.length || 0} crops (Top: ${s1.crop_options?.[0]?.bengali_name}, cost ৳${s1.crop_options?.[0]?.est_cost_min}-${s1.crop_options?.[0]?.est_cost_max})`
    );

    // -------------------------------------------------------------------------
    // S02: Kharif-1 Season Valid Crop Matching (Jute / পাট)
    // -------------------------------------------------------------------------
    const s2Res = await fetch(`${BASE}/recommendations/generate`, {
      method: 'POST',
      headers: fh,
      body: JSON.stringify({ season: 'খরিপ-১', soil_type: 'পলি', water_availability: 'মাঝারি', land_size: 40, budget: 25000 })
    });
    const s2 = await s2Res.json();
    if (s2.recommendation_id) createdRecIds.push(s2.recommendation_id);
    const hasJute = (s2.crop_options || []).some((c) => /jute|পাট/i.test(`${c.crop_name} ${c.bengali_name}`));
    recordScenario(
      'S02',
      'Kharif-1 Season Crop Matching (Jute)',
      'FR-08, FR-10',
      s2Res.status === 201 && !s2.is_fallback && hasJute,
      `Kharif-1 crops: ${(s2.crop_options || []).map((c) => c.bengali_name).join(', ')}`
    );

    // -------------------------------------------------------------------------
    // S03: Kharif-2 Season Valid Crop Matching (Aman Rice / আমন ধান)
    // -------------------------------------------------------------------------
    const s3Res = await fetch(`${BASE}/recommendations/generate`, {
      method: 'POST',
      headers: fh,
      body: JSON.stringify({ season: 'খরিপ-২', soil_type: 'এঁটেল', water_availability: 'মাঝারি', land_size: 40, budget: 20000 })
    });
    const s3 = await s3Res.json();
    if (s3.recommendation_id) createdRecIds.push(s3.recommendation_id);
    const hasAman = (s3.crop_options || []).some((c) => /aman|আমন/i.test(`${c.crop_name} ${c.bengali_name}`));
    recordScenario(
      'S03',
      'Kharif-2 Season Crop Matching (Aman Rice)',
      'FR-08, FR-10',
      s3Res.status === 201 && !s3.is_fallback && hasAman,
      `Kharif-2 crops: ${(s3.crop_options || []).map((c) => c.bengali_name).join(', ')}`
    );

    // -------------------------------------------------------------------------
    // S04: Tight Budget Filtering (Excludes High-Capital Potato/Tomato)
    // -------------------------------------------------------------------------
    const s4Res = await fetch(`${BASE}/recommendations/generate`, {
      method: 'POST',
      headers: fh,
      body: JSON.stringify({ season: 'রবি', soil_type: 'দোআঁশ', water_availability: 'উচ্চ', land_size: 50, budget: 12000 })
    });
    const s4 = await s4Res.json();
    if (s4.recommendation_id) createdRecIds.push(s4.recommendation_id);
    const s4Names = (s4.crop_options || []).map((c) => c.crop_name);
    const excludesCostly = !s4Names.includes('Potato') && !s4Names.includes('Tomato');
    const fitsBudget = (s4.crop_options || []).every((c) => c.est_cost_min <= 12000 * 1.15);
    recordScenario(
      'S04',
      'Tight Budget Filtering (৳12,000 for 50 decimals)',
      'FR-14, FR-15, FR-16',
      s4Res.status === 201 && excludesCostly && fitsBudget && s4.crop_options?.length > 0,
      `Affordable crops selected: ${(s4.crop_options || []).map((c) => `${c.bengali_name}(৳${c.est_cost_min})`).join(', ')}`
    );

    // -------------------------------------------------------------------------
    // S05: Pond + Poultry Integrated Farming Compatibility
    // -------------------------------------------------------------------------
    const combos = s1.integrated_options || [];
    const hasPondPoultry = combos.some((c) => String(c.compatibility_rule || '').includes('pond,poultry'));
    const allHaveRiskAndExpert = combos.length > 0 && combos.every((c) => Boolean(c.risk_note) && c.expert_verification_needed === true);
    recordScenario(
      'S05',
      'Pond + Poultry Integrated Farming Compatibility',
      'FR-12, FR-22',
      hasPondPoultry && allHaveRiskAndExpert,
      `Matched ${combos.length} integrated combos (Includes pond+poultry & expert verification flag)`
    );

    // -------------------------------------------------------------------------
    // S06: Waste-to-Value Rules with Mandatory Safety & Expert Flags
    // -------------------------------------------------------------------------
    const wastes = s1.waste_to_value_options || [];
    const hasLivestockAndStraw =
      wastes.some((w) => w.source_activity === 'livestock') &&
      wastes.some((w) => w.source_activity === 'crop_residue');
    const allSafe = wastes.length > 0 && wastes.every((w) => Boolean(w.safety_note) && w.expert_verification_needed === true);
    recordScenario(
      'S06',
      'Waste-to-Value Safety Rules & Expert Warning',
      'FR-13, FR-22',
      hasLivestockAndStraw && allSafe,
      `Matched ${wastes.length} rules; all carry mandatory safety_note & expert_verification_needed=true`
    );

    // -------------------------------------------------------------------------
    // S07: Unsupported / Extreme Budget Fallback + Uncertainty Notice
    // -------------------------------------------------------------------------
    const s7Res = await fetch(`${BASE}/recommendations/generate`, {
      method: 'POST',
      headers: fh,
      body: JSON.stringify({ season: 'রবি', soil_type: 'দোআঁশ', land_size: 100, budget: 500 })
    });
    const s7 = await s7Res.json();
    if (s7.recommendation_id) createdRecIds.push(s7.recommendation_id);
    const s7Ok =
      s7Res.status === 201 &&
      s7.is_fallback === true &&
      Boolean(s7.fallback_reason) &&
      Boolean(s7.uncertainty_note) &&
      s7.crop_options?.length > 0;
    recordScenario(
      'S07',
      'Extreme Condition Graceful Fallback & Uncertainty Disclaimer',
      'FR-21, FR-35',
      s7Ok,
      `is_fallback=${s7.is_fallback}, reason="${String(s7.fallback_reason || '').slice(0, 60)}..."`
    );

    // -------------------------------------------------------------------------
    // S08: Bangla AI Assistant Knowledge Grounding & No-Match Safe Fallback
    // -------------------------------------------------------------------------
    const chatHitRes = await fetch(`${BASE}/chat/message`, {
      method: 'POST',
      headers: fh,
      body: JSON.stringify({ message: 'আলুর নাবি ধসা রোগের প্রতিকার কী?' })
    });
    const chatHit = await chatHitRes.json();

    const chatMissRes = await fetch(`${BASE}/chat/message`, {
      method: 'POST',
      headers: fh,
      body: JSON.stringify({ message: 'unmatched_xyz_998877_query', session_id: chatHit.session_id })
    });
    const chatMiss = await chatMissRes.json();

    const s8Ok =
      chatHitRes.status === 200 &&
      String(chatHit.assistant_message?.source_org || '').includes('BARI') &&
      chatMissRes.status === 200 &&
      chatMiss.is_fallback === true &&
      String(chatMiss.assistant_message?.message_text || '').includes('তথ্য পাওয়া যায়নি, উপজেলা কৃষি কর্মকর্তার পরামর্শ নিন');
    recordScenario(
      'S08',
      'Bangla AI Knowledge Grounding & No-Match Safe Fallback',
      'FR-18, FR-20, FR-28, FR-29, FR-35',
      s8Ok,
      `Grounded source="${chatHit.assistant_message?.source_org}"; unmatched fallback verified`
    );

    // -------------------------------------------------------------------------
    // S09: Recommendation History Traceability & Usefulness Feedback
    // -------------------------------------------------------------------------
    const histRes = await fetch(`${BASE}/recommendations/history`, { headers: fh });
    const hist = await histRes.json();
    const traced = (hist.history || []).find((h) => h.recommendation_id === s1.recommendation_id);
    const fbRes = await fetch(`${BASE}/recommendations/${s1.recommendation_id}/feedback`, {
      method: 'POST',
      headers: fh,
      body: JSON.stringify({ is_helpful: true, rating: 5, comment: 'সঠিক ও কার্যকরী পরামর্শ।' })
    });
    const fb = await fbRes.json();
    const s9Ok =
      histRes.status === 200 &&
      Boolean(traced?.request_data) &&
      Boolean(traced?.model_version) &&
      fbRes.status === 200 &&
      fb.success === true;
    recordScenario(
      'S09',
      'Recommendation History Traceability & Feedback Persistence',
      'FR-24, FR-32, FR-34',
      s9Ok,
      `Traced rec #${s1.recommendation_id} (${traced?.model_version}) & saved 5/5 feedback`
    );

    // -------------------------------------------------------------------------
    // S10: Unauthorized Access Protection (RBAC + IDOR) & Admin Audit Trail
    // -------------------------------------------------------------------------
    // 1) Farmer denied admin route
    const rbacDeny = await fetch(`${BASE}/admin/crops`, { headers: fh });

    // 2) Cross-user IDOR denied (Admin account attempting to view Farmer's recommendation or delete Farmer's resource)
    const idorRec = await fetch(`${BASE}/recommendations/${s1.recommendation_id}`, { headers: ah });
    const resList = await (await fetch(`${BASE}/resources`, { headers: fh })).json();
    const farmerResId = resList.resources?.[0]?.resource_id;
    const idorResource = farmerResId
      ? await fetch(`${BASE}/resources/${farmerResId}`, { method: 'DELETE', headers: ah })
      : { status: 404 };

    // 3) Admin CRUD + Audit log verification
    const admCreate = await (await fetch(`${BASE}/admin/knowledge`, {
      method: 'POST',
      headers: ah,
      body: JSON.stringify({ title: 'Eval Doc', source: 'DAE Eval', content: 'Eval content' })
    })).json();
    const evalDocId = admCreate.document?.doc_id;
    if (evalDocId) {
      await fetch(`${BASE}/admin/knowledge/${evalDocId}`, { method: 'DELETE', headers: ah });
    }
    const auditRes = await fetch(`${BASE}/admin/audit-logs?limit=15`, { headers: ah });
    const auditData = await auditRes.json();
    const hasAudit = (auditData.audit_logs || []).some((l) => l.action === 'CREATE_KNOWLEDGE');

    const s10Ok =
      rbacDeny.status === 403 &&
      idorRec.status === 404 &&
      idorResource.status === 404 &&
      hasAudit;
    recordScenario(
      'S10',
      'Security: RBAC (403), IDOR Protection (404) & Admin Audit Trail',
      'FR-02, FR-27, FR-33',
      s10Ok,
      `RBAC=${rbacDeny.status}, IDOR Rec=${idorRec.status}, IDOR Res=${idorResource.status}, AuditLogged=${hasAudit}`
    );

    // Summary Table
    const passedCount = scenarioResults.filter((r) => r.passed).length;
    console.log('\n=========================================================================');
    console.log(`EVALUATION RESULT: ${passedCount}/${scenarioResults.length} SCENARIOS PASSED`);
    console.log('=========================================================================');

    if (passedCount !== scenarioResults.length) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('\nEVALUATION FAILED WITH ERROR:', err.message);
    if (stderrBuf) console.error('Server STDERR:', stderrBuf);
    process.exitCode = 1;
  } finally {
    srv.kill('SIGTERM');
  }
}

runEvaluation();
