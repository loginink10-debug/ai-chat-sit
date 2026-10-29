/**
 * Vercel Serverless Function — POST /api/chat
 * نفس منطق server.js بس في صورة function واحدة.
 * المفتاح بيتقرأ من Environment Variables على Vercel (مش من المتصفح).
 */
'use strict';

const DEFAULTS = {
  provider: 'pollinations',
  apiKey: '',
  baseUrl: '',
  model: '',
  botName: 'مساعد الموقع',
  systemPrompt:
    'انت مساعد ذكي ودود اسمه «{botName}» وبتشتغل على موقع العميل وبتساعد الزوار. ' +
    'اتكلم باللهجة المصرية البسيطة والودودة، وخلي ردودك مختصرة وواضحة ومفيدة.',
  temperature: 0.7,
  maxTokens: 900
};

function cfg() {
  return { ...DEFAULTS, ...(process.env.SYSTEM_PROMPT ? { systemPrompt: process.env.SYSTEM_PROMPT } : {}) };
}

function provider() {
  const env = process.env;
  const name = String(env.LLM_PROVIDER || DEFAULTS.provider).toLowerCase();

  if (name === 'gemini') {
    return {
      type: 'gemini',
      baseUrl: (env.LLM_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, ''),
      model: env.LLM_MODEL || 'gemini-2.5-flash',
      apiKey: env.LLM_API_KEY || ''
    };
  }
  if (name === 'pollinations') {
    return {
      type: 'openai',
      baseUrl: (env.LLM_BASE_URL || 'https://text.pollinations.ai/openai').replace(/\/+$/, ''),
      model: env.LLM_MODEL || 'openai',
      apiKey: env.LLM_API_KEY || ''
    };
  }
  return {
    type: 'openai',
    baseUrl: (env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    model: env.LLM_MODEL || 'gpt-4o-mini',
    apiKey: env.LLM_API_KEY || ''
  };
}

function sysPrompt() {
  const c = cfg();
  return String(c.systemPrompt).replace(/\{botName\}/g, c.botName);
}

async function callOpenAI(p, messages) {
  const headers = { 'content-type': 'application/json' };
  if (p.apiKey) headers.authorization = 'Bearer ' + p.apiKey;

  const r = await fetch(p.baseUrl + '/chat/completions', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: p.model,
      messages: [{ role: 'system', content: sysPrompt() }, ...messages],
      temperature: cfg().temperature,
      max_tokens: cfg().maxTokens
    })
  });
  const raw = await r.text();
  if (!r.ok) throw new Error('upstream ' + r.status + ': ' + raw.slice(0, 300));
  const j = JSON.parse(raw);
  const m = j && j.choices && j.choices[0] && j.choices[0].message;
  const text = String((m && (m.content ?? m.reasoning)) || '').trim();
  if (!text) throw new Error('empty reply');
  return text;
}

async function callGemini(p, messages) {
  if (!p.apiKey) throw new Error('missing api key');
  const url = p.baseUrl + '/models/' + encodeURIComponent(p.model) + ':generateContent?key=' + encodeURIComponent(p.apiKey);
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: sysPrompt() }] },
      contents: messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      generationConfig: { temperature: cfg().temperature, maxOutputTokens: cfg().maxTokens }
    })
  });
  const raw = await r.text();
  if (!r.ok) throw new Error('upstream ' + r.status + ': ' + raw.slice(0, 300));
  const j = JSON.parse(raw);
  const parts = (j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
  const text = parts.map((x) => x.text || '').join('').trim();
  if (!text) throw new Error('empty reply');
  return text;
}

module.exports = async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!body || typeof body !== 'object') body = {};

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const messages = incoming
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))
    .slice(-20);

  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    res.status(400).json({ error: 'ابعت رسالة أولاً.' });
    return;
  }

  const p = provider();
  try {
    const reply = p.type === 'gemini' ? await callGemini(p, messages) : await callOpenAI(p, messages);
    res.status(200).json({ reply });
  } catch (e) {
    console.error('[chat error]', e.message);
    const msg = String(e.message || '');
    let user = 'حصلت مشكلة عند مزوّد الذكاء الاصطناعي. جرب تاني بعد لحظات.';
    if (/ 401| 403/.test(msg)) user = 'مفتاح الـ API مش صحيح أو مش عنده صلاحية. راجع إعدادات Vercel.';
    if (/ 429/.test(msg)) user = 'المزوّد تحت ضغط دلوقتي ⏳ استنى شوية وجرب تاني.';
    if (/ 404/.test(msg)) user = 'اسم الموديل أو رابط المزوّد مش صح. راجع LLM_MODEL.';
    res.status(502).json({ error: user });
  }
};
