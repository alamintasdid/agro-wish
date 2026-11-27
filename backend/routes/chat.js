/**
 * agroWish Backend - Bangla AI Agricultural Assistant & Knowledge Grounding API
 * SRS Reference:
 * - Section 5: FR-18 (Bangla Chat Interface), FR-19 (Context-Aware Advice),
 *              FR-20 (Knowledge Base Retrieval), FR-27 (Data Isolation),
 *              FR-28 (Graceful Fallback), FR-29 (Source Attribution), FR-35 (No-Match Fallback)
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { searchAgriculturalKnowledge } = require('../services/ragService');

router.use(authenticateToken);

// Common Bangla inflection suffixes to strip for fuzzy keyword stems
const BANGLA_SUFFIXES = ['গুলো', 'গুলি', 'দের', 'য়ের', 'ের', 'তে', 'কে', 'য়', 'র', 'ে'];

function tokenizeQuery(text) {
  const cleaned = String(text || '')
    .toLowerCase()
    .replace(/[?!.,;:()'"“”‘’।\-_/\\]/g, ' ');
  const rawTokens = cleaned.split(/\s+/).filter((t) => t.length >= 2);
  const tokenSet = new Set();

  for (const tok of rawTokens) {
    tokenSet.add(tok);
    for (const suf of BANGLA_SUFFIXES) {
      if (tok.endsWith(suf) && tok.length - suf.length >= 2) {
        tokenSet.add(tok.slice(0, tok.length - suf.length));
      }
    }
  }
  return [...tokenSet];
}

/**
 * Retrieves top relevant curated documents from `knowledge_documents` (FR-20)
 * Combines MySQL FULLTEXT relevance with Bangla/English token scoring.
 */
async function retrieveKnowledgeDocuments(queryText) {
  // Use advanced hybrid semantic retrieval with BARI/BRRI/DAE/FAO grounding
  try {
    const results = await searchAgriculturalKnowledge(queryText, 3);
    if (results && results.length > 0) return results;
  } catch (err) {
    console.warn('[RAG Search Notice]', err.message);
  }

  // Resilient DB fallback
  try {
    const [allDocs] = await pool.execute(
      'SELECT doc_id, title, source, category, keywords, content, updated_at FROM knowledge_documents'
    );
    if (allDocs.length === 0) return [];
    const tokens = tokenizeQuery(queryText);
    return allDocs
      .map((doc) => {
        let score = 0;
        for (const tok of tokens) {
          if ((doc.title || '').toLowerCase().includes(tok)) score += 5;
          if ((doc.content || '').toLowerCase().includes(tok)) score += 2;
        }
        return { ...doc, relevance_score: score };
      })
      .filter((d) => d.relevance_score > 0)
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, 3);
  } catch {
    return [];
  }
}

/**
 * Attempts grounded Bangla synthesis via configured LLM (Gemini or OpenAI)
 * Returns null on missing key or network/API failure to trigger FR-28 fallback
 */
async function generateGroundedLlmResponse(question, matchedDocs, farmProfile) {
  const geminiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim();
  const openaiKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim();
  if (!geminiKey && !openaiKey) return null;

  const contextBlock = matchedDocs
    .map((d, i) => `[নথি ${i + 1}] শিরোনাম: ${d.title}\nউৎস: ${d.source}\nবিবরণ: ${d.content}`)
    .join('\n\n');

  const profileLine = farmProfile
    ? `কৃষকের খামার তথ্য: জেলা ${farmProfile.district || 'অনির্দিষ্ট'}, জমি ${farmProfile.land_size || 0} শতক, মাটি ${farmProfile.soil_type || 'দোআঁশ'}, মৌসুম ${farmProfile.season || 'রবি'}।`
    : '';

  const systemPrompt = `আপনি "agroWish" কৃষি সহায়ক এআই। শুধুমাত্র নিচে প্রদত্ত যাচাইকৃত কৃষি তথ্যভাণ্ডারের তথ্যের ভিত্তিতে সহজ, স্পষ্ট ও বিনয়ী বাংলায় উত্তর দিন। উত্তর শেষে প্রদত্ত উৎস (তথ্যসূত্র) উল্লেখ করুন। তথ্যভাণ্ডারের বাইরে কোনো কাল্পনিক পরামর্শ দেবেন না।`;
  const userPrompt = `${profileLine}\n\nতথ্যভাণ্ডার:\n${contextBlock}\n\nকৃষকের প্রশ্ন: ${question}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    if (geminiKey) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(geminiKey)}`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 600 }
        })
      });
      if (resp.ok) {
        const json = await resp.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim()) return text.trim();
      }
    }

    if (openaiKey) {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          max_tokens: 600,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        })
      });
      if (resp.ok) {
        const json = await resp.json();
        const text = json?.choices?.[0]?.message?.content;
        if (text && text.trim()) return text.trim();
      }
    }
  } catch (err) {
    console.warn('[Chat LLM Fallback Triggered]', err.message);
  } finally {
    clearTimeout(timer);
  }

  return null;
}

/**
 * GET /api/chat/sessions
 * FR-18, FR-27: List authenticated farmer's chat sessions
 */
router.get('/sessions', async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;
    const [sessions] = await pool.execute(
      `SELECT s.session_id, s.title, s.started_at,
              COUNT(m.message_id) AS message_count,
              MAX(m.sent_at) AS last_message_at
       FROM chat_sessions s
       LEFT JOIN chat_messages m ON s.session_id = m.session_id
       WHERE s.user_id = ?
       GROUP BY s.session_id, s.title, s.started_at
       ORDER BY COALESCE(MAX(m.sent_at), s.started_at) DESC
       LIMIT 30`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      sessions
    });
  } catch (error) {
    console.error('[GET /api/chat/sessions Error]', error);
    return res.status(500).json({ success: false, message: 'চ্যাট সেশন লোড করতে সমস্যা হয়েছে।' });
  }
});

/**
 * GET /api/chat/sessions/:sessionId/messages
 * FR-18, FR-27: Load message history for a specific session owned by the user
 */
router.get('/sessions/:sessionId/messages', async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;
    const sessionId = parseInt(req.params.sessionId, 10);
    if (isNaN(sessionId) || sessionId <= 0) {
      return res.status(400).json({ success: false, message: 'অবৈধ সেশন আইডি।' });
    }

    const [sessions] = await pool.execute(
      'SELECT session_id, title, started_at FROM chat_sessions WHERE session_id = ? AND user_id = ? LIMIT 1',
      [sessionId, userId]
    );
    if (sessions.length === 0) {
      return res.status(404).json({ success: false, message: 'আলোচনা সেশনটি খুঁজে পাওয়া যায়নি।' });
    }

    const [messages] = await pool.execute(
      `SELECT message_id, session_id, sender, message_text, source_title, source_org, is_fallback, sent_at
       FROM chat_messages
       WHERE session_id = ?
       ORDER BY message_id ASC`,
      [sessionId]
    );

    return res.status(200).json({
      success: true,
      session: sessions[0],
      messages: messages.map((m) => ({ ...m, is_fallback: Boolean(m.is_fallback) }))
    });
  } catch (error) {
    console.error('[GET /api/chat/sessions/:id/messages Error]', error);
    return res.status(500).json({ success: false, message: 'চ্যাট বার্তা লোড করতে সমস্যা হয়েছে।' });
  }
});

/**
 * POST /api/chat/message
 * FR-18, FR-19, FR-20, FR-28, FR-29, FR-35:
 * Grounded Bangla agricultural chat with automatic fallback when LLM key is absent/unavailable
 */
router.post('/message', async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;
    const { message, session_id } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'অনুগ্রহ করে আপনার কৃষি বিষয়ক প্রশ্ন লিখুন।'
      });
    }

    const cleanMessage = message.trim().slice(0, 1000);
    let activeSessionId = session_id ? parseInt(session_id, 10) : null;

    if (activeSessionId) {
      const [owned] = await pool.execute(
        'SELECT session_id FROM chat_sessions WHERE session_id = ? AND user_id = ? LIMIT 1',
        [activeSessionId, userId]
      );
      if (owned.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'নির্বাচিত চ্যাট সেশনটি পাওয়া যায়নি।'
        });
      }
    } else {
      const sessionTitle = cleanMessage.length > 50 ? `${cleanMessage.slice(0, 47)}...` : cleanMessage;
      const [newSess] = await pool.execute(
        'INSERT INTO chat_sessions (user_id, title) VALUES (?, ?)',
        [userId, sessionTitle]
      );
      activeSessionId = newSess.insertId;
    }

    // Store user message
    const [userMsgInsert] = await pool.execute(
      `INSERT INTO chat_messages (session_id, sender, message_text, is_fallback)
       VALUES (?, 'USER', ?, 0)`,
      [activeSessionId, cleanMessage]
    );

    // Fetch farmer profile context for FR-19
    const [profileRows] = await pool.execute(
      'SELECT district, land_size, soil_type, season FROM farmer_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );
    const farmProfile = profileRows[0] || null;

    // Search verified knowledge base (FR-20)
    const matchedDocs = await retrieveKnowledgeDocuments(cleanMessage);

    let replyText = '';
    let sourceTitle = null;
    let sourceOrg = null;
    let isFallback = false;
    let usedLlm = false;

    if (matchedDocs.length > 0) {
      const topDoc = matchedDocs[0];
      sourceTitle = topDoc.title;
      sourceOrg = topDoc.source;

      const llmReply = await generateGroundedLlmResponse(cleanMessage, matchedDocs, farmProfile);
      if (llmReply) {
        replyText = llmReply;
        usedLlm = true;
        isFallback = false;
      } else {
        // FR-28: Graceful fallback returning curated Bangla knowledge entry directly with source attribution (FR-29)
        isFallback = true;
        const contextPrefix = farmProfile && farmProfile.district
          ? `আপনার খামার প্রোফাইল (${farmProfile.district}, ${farmProfile.soil_type || 'দোআঁশ'} মাটি, ${farmProfile.season || 'রবি'} মৌসুম) বিবেচনায় আমাদের যাচাইকৃত কৃষি তথ্যভাণ্ডার থেকে প্রাসঙ্গিক পরামর্শ:\n\n`
          : 'আমাদের যাচাইকৃত কৃষি তথ্যভাণ্ডার থেকে প্রাপ্ত প্রাসঙ্গিক পরামর্শ:\n\n';
        replyText = `${contextPrefix}📌 ${topDoc.title}\n\n${topDoc.content}`;
        if (matchedDocs.length > 1) {
          replyText += `\n\nআরও সম্পর্কিত বিষয়: ${matchedDocs[1].title} (${matchedDocs[1].source})`;
        }
      }
    } else {
      // FR-35: No match safe fallback
      isFallback = true;
      replyText =
        'তথ্য পাওয়া যায়নি, উপজেলা কৃষি কর্মকর্তার পরামর্শ নিন।\n\n' +
        'দুঃখিত, আপনার প্রশ্নটির সাথে সরাসরি সামঞ্জস্যপূর্ণ তথ্য আমাদের যাচাইকৃত কৃষি তথ্যভাণ্ডারে খুঁজে পাওয়া যায়নি। ' +
        'সঠিক রোগ নির্ণয় ও ফসল ব্যবস্থাপনার জন্য অনুগ্রহ করে আপনার স্থানীয় উপজেলা কৃষি অফিস (DAE) অথবা নিকটস্থ উপ-সহকারী কৃষি কর্মকর্তার পরামর্শ নিন।';
    }

    const [botMsgInsert] = await pool.execute(
      `INSERT INTO chat_messages (session_id, sender, message_text, source_title, source_org, is_fallback)
       VALUES (?, 'ASSISTANT', ?, ?, ?, ?)`,
      [activeSessionId, replyText, sourceTitle, sourceOrg, isFallback ? 1 : 0]
    );

    return res.status(200).json({
      success: true,
      session_id: activeSessionId,
      used_llm: usedLlm,
      is_fallback: isFallback,
      user_message: {
        message_id: userMsgInsert.insertId,
        session_id: activeSessionId,
        sender: 'USER',
        message_text: cleanMessage
      },
      assistant_message: {
        message_id: botMsgInsert.insertId,
        session_id: activeSessionId,
        sender: 'ASSISTANT',
        message_text: replyText,
        source_title: sourceTitle,
        source_org: sourceOrg,
        is_fallback: isFallback
      },
      matched_documents: matchedDocs.map((d) => ({
        doc_id: d.doc_id,
        title: d.title,
        source: d.source,
        category: d.category
      }))
    });
  } catch (error) {
    console.error('[POST /api/chat/message Error]', error);
    return res.status(500).json({
      success: false,
      message: 'সহায়ক বার্তা প্রক্রিয়াকরণে সার্ভারে ত্রুটি দেখা দিয়েছে।'
    });
  }
});

module.exports = router;
