#!/usr/bin/env node
/**
 * =====================================================================
 *  موقع شات ذكي — سيرفر بدون أي مكتبات خارجية (محتاج Node.js 18+)
 * =====================================================================
 *  الشغلانة:
 *   1) بيقدّم ملفات الواجهة من فولدر public
 *   2) بيعمل endpoint اسمه POST /api/chat بيبعت المحادثة لمزوّد
 *      الذكاء الاصطناعي (OpenAI / Gemini / OpenRouter / Groq / Ollama ...
 *      أو مزوّد Pollinations المجاني للتجربة) وبيرجّع الرد
 *   3) مفتاح الـ API بيفضل على السيرفر — عمره ما بيتبعت للمتصفح
 *
 *  التشغيل:  node server.js   (أو: npm start)
 *  الإعدادات: ملف config.json أو ملف .env أو متغيرات بيئة
 * =====================================================================
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');

/* ------------------------------------------------------------------ */
/*  1. تحميل الإعدادات                                                */
/* ------------------------------------------------------------------ */

function loadDotEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  try {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue; // سطر فاضي أو تعليق
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(m[1] in process.env)) process.env[m[1]] = val;
    }
  } catch (e) {
    console.warn('⚠️  مشكلة في قراءة ملف .env:', e.message);
  }
}

const DEFAULTS = {
  // pollinations  = مجاني ومن غير مفتاح (للتجربة فقط)
  // openai        = OpenAI أو أي مزوّد متوافق مع OpenAI (OpenRouter/Groq/DeepSeek/Ollama...)
  // gemini        = Google Gemini
  // demo          = ردود تجريبية بدون ذكاء اصطناعي
  provider: 'pollinations',
  apiKey: '',
  baseUrl: '',   // سيبه فاضي لاستخدام القيمة الافتراضية للمزوّد
  model: '',     // سيبه فاضي لاستخدام القيمة الافتراضية للمزوّد

  botName: 'مساعد الموقع',
  greeting: 'أهلاً بيك 👋 أنا المساعد الذكي بتاع الموقع. اسألني في أي حاجة وأنا هساعدك على طول.',
  suggestions: [
    'إنت بتقدم إيه بالظبط؟',
    'ساعدني أختار الحل المناسب ليا',
    'إيه أسعار الخدمات؟',
    'ازاي أقدر أتواصل معاكم؟'
  ],
  systemPrompt:
    'انت مساعد ذكي ودود اسمه «{botName}» وبتشتغل على موقع العميل وبتساعد الزوار. ' +
    'اتكلم باللهجة المصرية البسيطة والودودة، وخلي ردودك مختصرة وواضحة ومفيدة. ' +
    'لو الإجابة محتاجة تفاصيل، نظّمها في نقاط أو خطوات مرقّمة. ' +
    'استخدم التنسيق (خط عريض / قوائم / كود) لما يخلي الإجابة أوضح. ' +
    'متخترعش معلومات مش متأكد منها، ولو مش عارف حاجة قول إنك مش متأكد واقترح بدائل. ' +
    'خليك مهذب ومحترم ومتردش على أي طلبات مؤذية أو مخالفة للقانون.',
  temperature: 0.7,
  maxTokens: 900,
  maxMessagesPerMinute: 20
};

function loadConfig() {
  let fileCfg = {};
  const cfgPath = path.join(ROOT, 'config.json');
  if (fs.existsSync(cfgPath)) {
    try {
      fileCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    } catch (e) {
      console.warn('⚠️  ملف config.json فيه خطأ في الصيغة — هستخدم الإعدادات الافتراضية.', e.message);
    }
  }

  const cfg = { ...DEFAULTS, ...fileCfg };

  // متغيرات البيئة ليها الأولوية (مناسبة للنشر على Render/Railway/VPS)
  const env = process.env;
  if (env.LLM_PROVIDER) cfg.provider = env.LLM_PROVIDER;
  if (env.LLM_API_KEY) cfg.apiKey = env.LLM_API_KEY;
  if (env.LLM_BASE_URL) cfg.baseUrl = env.LLM_BASE_URL;
  if (env.LLM_MODEL) cfg.model = env.LLM_MODEL;
  if (env.BOT_NAME) cfg.botName = env.BOT_NAME;
  if (env.SYSTEM_PROMPT) cfg.systemPrompt = env.SYSTEM_PROMPT;
  if (env.MAX_MESSAGES_PER_MINUTE) cfg.maxMessagesPerMinute = Number(env.MAX_MESSAGES_PER_MINUTE) || cfg.maxMessagesPerMinute;

  return cfg;
}

/* ------------------------------------------------------------------ */
/*  2. المزوّدات                                                      */
/* ------------------------------------------------------------------ */

function resolveProvider(cfg) {
  const name = String(cfg.provider || '').trim().toLowerCase();

  if (name === 'pollinations') {
    return {
      type: 'openai',
      label: 'Pollinations (مجاني للتجربة)',
      baseUrl: (cfg.baseUrl || 'https://text.pollinations.ai/openai').replace(/\/+$/, ''),
      model: cfg.model || 'openai',
      apiKey: cfg.apiKey || ''
    };
  }
  if (name === 'gemini') {
    return {
      type: 'gemini',
      label: 'Google Gemini',
      baseUrl: (cfg.baseUrl || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, ''),
      model: cfg.model || 'gemini-2.5-flash',
      apiKey: cfg.apiKey || ''
    };
  }
  if (name === 'openai' || cfg.baseUrl) {
    // أي مزوّد متوافق مع OpenAI:
    // OpenAI · OpenRouter · Groq · DeepSeek · Together · Ollama (محلي) ...
    const isOfficialOpenAI = name === 'openai' || (!cfg.baseUrl && name !== 'demo');
    return {
      type: 'openai',
      label: name === 'openai' ? 'OpenAI' : (cfg.provider || 'OpenAI-compatible'),
      baseUrl: (cfg.baseUrl || (isOfficialOpenAI ? 'https://api.openai.com/v1' : '')).replace(/\/+$/, ''),
      model: cfg.model || 'gpt-4o-mini',
      apiKey: cfg.apiKey || ''
    };
  }
  return { type: 'demo', label: 'وضع تجريبي', model: 'demo', baseUrl: '', apiKey: '' };
}

loadDotEnv();
const cfg = loadConfig();
const provider = resolveProvider(cfg);

class UpstreamError extends Error {
  constructor(status, detail) {
    super('Upstream error ' + status);
    this.name = 'UpstreamError';
    this.status = status;
    this.detail = String(detail || '').slice(0, 500);
  }
}

async function fetchWithTimeout(url, options, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/* ---------- مزوّد متوافق مع OpenAI ---------- */
async function chatOpenAI(p, messages) {
  const url = p.baseUrl + '/chat/completions';
  const headers = { 'content-type': 'application/json', accept: 'application/json' };
  if (p.apiKey) headers.authorization = 'Bearer ' + p.apiKey;

  const body = {
    model: p.model,
    messages: [{ role: 'system', content: systemsPrompt() }, ...messages],
    temperature: Number(cfg.temperature) || 0.7,
    max_tokens: Number(cfg.maxTokens) || 900
  };

  const res = await fetchWithTimeout(url, { method: 'POST', headers, body: JSON.stringify(body) }, 60000);
  const raw = await res.text();
  if (!res.ok) throw new UpstreamError(res.status, raw);

  let data;
  try { data = JSON.parse(raw); } catch { throw new UpstreamError(502, raw); }

  const msg = data && data.choices && data.choices[0] && data.choices[0].message;
  const text = String((msg && (msg.content ?? msg.reasoning)) || '').trim();
  if (!text) throw new UpstreamError(502, 'رد فاضي من المزوّد');
  return text;
}

/* ---------- مزوّد Google Gemini ---------- */
async function chatGemini(p, messages) {
  if (!p.apiKey) throw new UpstreamError(401, 'مفيش مفتاح API');
  const url = p.baseUrl + '/models/' + encodeURIComponent(p.model) + ':generateContent?key=' + encodeURIComponent(p.apiKey);

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const body = {
    systemInstruction: { parts: [{ text: systemsPrompt() }] },
    contents,
    generationConfig: {
      temperature: Number(cfg.temperature) || 0.7,
      maxOutputTokens: Number(cfg.maxTokens) || 900
    }
  };

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  }, 60000);

  const raw = await res.text();
  if (!res.ok) throw new UpstreamError(res.status, raw);

  let data;
  try { data = JSON.parse(raw); } catch { throw new UpstreamError(502, raw); }

  const parts = (data && data.candidates && data.candidates[0] &&
    data.candidates[0].content && data.candidates[0].content.parts) || [];
  const text = parts.map((x) => x.text || '').join('').trim();
  if (!text) throw new UpstreamError(502, 'رد فاضي من Gemini');
  return text;
}

/* ---------- وضع تجريبي بدون ذكاء اصطناعي ---------- */
function chatDemo(messages) {
  const last = [...messages].reverse().find((m) => m.role === 'user');
  const q = last ? last.content.trim() : '';
  return (
    'أنا شغّال دلوقتي في **الوضع التجريبي** — يعني مفيش موديل ذكاء اصطناعي متوصل لسه.\n\n' +
    'استلمت رسالتك: 「 ' + (q.length > 120 ? q.slice(0, 120) + '…' : q) + ' 」\n\n' +
    'عشان الأجوبة الحقيقية تشتغل، صاحب الموقع يظبط مزوّد الذكاء الاصطناعي في `config.json` أو ملف `.env`:\n' +
    '- `LLM_PROVIDER=openai` + `LLM_API_KEY=sk-...` (أو أي مزوّد متوافق مع OpenAI)\n' +
    '- `LLM_PROVIDER=gemini` + `LLM_API_KEY=...` (مفتاح Google Gemini)\n' +
    '- أو يسيبه `pollinations` (مجاني للتجربة وبدون مفتاح)\n\n' +
    'بعد كده أعد تشغيل السيرفر وهتلاقيني بردّ عليك في أي حاجة. 😉'
  );
}

function systemsPrompt() {
  return String(cfg.systemPrompt || DEFAULTS.systemPrompt).replace(/\{botName\}/g, cfg.botName || DEFAULTS.botName);
}

async function generateReply(messages) {
  if (provider.type === 'demo') return chatDemo(messages);
  if (provider.type === 'gemini') return chatGemini(provider, messages);
  return chatOpenAI(provider, messages);
}

/* ------------------------------------------------------------------ */
/*  3. أدوات السيرفر                                                   */
/* ------------------------------------------------------------------ */

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body)
  });
  res.end(body);
}

function readJsonBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('PAYLOAD_TOO_LARGE'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(new Error('BAD_JSON'));
      }
    });
    req.on('error', reject);
  });
}

/* حد أقصى للطلبات لكل IP في الدقيقة — حماية بسيطة من الإساءة */
const hits = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const limit = Number(cfg.maxMessagesPerMinute) || 20;
  const arr = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear(); // حماية من تضخّم الذاكرة
  return arr.length > limit;
}

/* ---------- خدمة الملفات الثابتة ---------- */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.woff2': 'font/woff2'
};

function serveStatic(pathname, req, res) {
  let rel;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    res.writeHead(400); return res.end('Bad request');
  }
  if (rel === '/' || rel === '') rel = '/index.html';

  const safeRel = path.normalize(rel).replace(/^([/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safeRel);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end('الصفحة غير موجودة');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'content-type': MIME[ext] || 'application/octet-stream',
      'cache-control': 'no-cache'
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
}

/* ------------------------------------------------------------------ */
/*  4. معالجة /api/chat                                                */
/* ------------------------------------------------------------------ */

async function handleChat(req, res) {
  const ip =
    String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket.remoteAddress ||
    'unknown';

  if (isRateLimited(ip)) {
    return sendJson(res, 429, { error: 'بعتنّي رسايل كتير في وقت قصير 🙏 استنى دقيقة وجرب تاني.' });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (e) {
    if (e.message === 'PAYLOAD_TOO_LARGE') return sendJson(res, 413, { error: 'الرسالة كبيرة جداً.' });
    return sendJson(res, 400, { error: 'صيغة الطلب غير صحيحة.' });
  }

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const messages = incoming
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))
    .slice(-20);

  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return sendJson(res, 400, { error: 'ابعت رسالة أولاً.' });
  }

  try {
    const reply = await generateReply(messages);
    return sendJson(res, 200, { reply });
  } catch (e) {
    console.error('[chat error]', e.name, '-', e.message, e.detail ? '| ' + e.detail : '');

    if (e.name === 'AbortError') {
      return sendJson(res, 504, { error: 'مزوّد الذكاء الاصطناعي اتأخر في الرد. جرب تاني بعد لحظات.' });
    }
    if (e instanceof UpstreamError) {
      const s = e.status;
      if (s === 401 || s === 403) return sendJson(res, 502, { error: 'مفتاح الـ API مش صحيح أو مش عنده صلاحية. راجع الإعدادات على السيرفر.' });
      if (s === 429) return sendJson(res, 502, { error: 'المزوّد تحت ضغط دلوقتي ⏳ استنى شوية وجرب تاني.' });
      if (s === 404) return sendJson(res, 502, { error: 'اسم الموديل أو رابط المزوّد مش صح. راجع model و baseUrl في الإعدادات.' });
      return sendJson(res, 502, { error: 'حصلت مشكلة عند مزوّد الذكاء الاصطناعي. جرب تاني بعد لحظات.' });
    }
    return sendJson(res, 500, { error: 'حصل خطأ غير متوقع في السيرفر. جرب تاني.' });
  }
}

/* ------------------------------------------------------------------ */
/*  5. تشغيل السيرفر                                                  */
/* ------------------------------------------------------------------ */

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');

    if (req.method === 'GET' && url.pathname === '/api/config') {
      return sendJson(res, 200, {
        botName: cfg.botName,
        greeting: cfg.greeting,
        suggestions: Array.isArray(cfg.suggestions) ? cfg.suggestions.slice(0, 8) : [],
        provider: provider.label + (provider.model && provider.model !== 'demo' ? ' · ' + provider.model : ''),
        isDemo: provider.type === 'demo'
      });
    }

    if (req.method === 'GET' && url.pathname === '/api/health') {
      return sendJson(res, 200, { ok: true, provider: provider.type, uptime: Math.round(process.uptime()) });
    }

    if (req.method === 'POST' && url.pathname === '/api/chat') {
      return await handleChat(req, res);
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      return serveStatic(url.pathname, req, res);
    }

    res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Method not allowed');
  } catch (e) {
    console.error('خطأ غير متوقع:', e);
    try { sendJson(res, 500, { error: 'خطأ داخلي في السيرفر' }); } catch {}
  }
});

const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('==============================================');
  console.log('  ✅ السيرفر اشتغل على:  http://localhost:' + PORT);
  console.log('  🤖 المزوّد: ' + provider.label + (provider.model ? '  (model: ' + provider.model + ')' : ''));
  if (provider.type === 'openai' && provider.label.indexOf('Pollinations') === -1 && !provider.apiKey) {
    console.log('  ⚠️  مفيش API key متظبط — الردود ممكن تفشل.');
  }
  if (provider.type === 'demo') {
    console.log('  ℹ️  الوضع التجريبي شغّال (من غير ذكاء اصطناعي حقيقي).');
  }
  console.log('==============================================');
});
