# 🤖 موقع شات ذكي — مساعد بيرد على زوار موقعك تلقائياً

موقع كامل فيه واجهة شات عربية (RTL) + سيرفر Node.js بيوصل لواحد من مزوّدات
الذكاء الاصطناعي، وبيرد على أي زائر بيكتب. **مفيش أي مكتبات خارجية** —
محتاج Node.js 18 أو أحدث بس.

---

## ✨ فيه إيه؟

- واجهة شات عربية حديثة، متوافقة مع الموبايل، وبتدعم الماركداون (نقاط، كود، خط عريض، روابط).
- مؤشر «بيكتب…»، زرار نسخ الرد، إعادة المحاولة عند الخطأ، وحفظ المحادثة مؤقتاً في التاب.
- **ويدجت جاهز** (زرار عايم) يتحط في أي موقع تاني بسطر واحد.
- مفتاح الـ API بيقعد على السيرفر — عمرو ما بيتبعت للمتصفح.
- حد أقصى للرسايل لكل مستخدم في الدقيقة (حماية من الإساءة).
- يدعم: OpenAI · Google Gemini · OpenRouter · Groq · DeepSeek · Ollama (محلي)
  · ومزوّد **Pollinations** المجاني للتجربة من غير أي مفتاح.

---

## 🚀 التشغيل في 3 خطوات

```bash
cd ai-chat-site
npm start          # أو: node server.js
```

بعدين افتح: **http://localhost:3000**

> محتاج Node.js 18+ (لأن الكود بيستخدم `fetch` المدمج). متأكد من الإصدار:
> `node -v`

أول ما تشغّل هتلاقي المزوّد الافتراضي **Pollinations** (مجاني، من غير مفتاح)
عشان تجرب الموقع فوراً. **للاستخدام الجدي غيّره لمزوّد مدفوع/رسمي** (تحت).

---

## ⚙️ الإعدادات

في إعدادين، وأي واحد فيهم كفاية:

| الطريقة | الاستخدام |
|---|---|
| `config.json` | تعديل سريع ومناسب للتجربة |
| `.env` (انسخه من `.env.example`) | **الأفضل** — وليه أولوية على `config.json` |
| متغيرات بيئة | لما تنشر على Render / Railway / VPS |

### الخيارات الأساسية

| الإعداد | المعنى |
|---|---|
| `provider` | `pollinations` (مجاني للتجربة) · `openai` · `gemini` · `demo` |
| `apiKey` / `LLM_API_KEY` | مفتاح المزوّد |
| `baseUrl` / `LLM_BASE_URL` | رابط المزوّد (لو مش OpenAI أو Gemini) |
| `model` / `LLM_MODEL` | اسم الموديل |
| `botName` | اسم المساعد اللي يظهر في الواجهة |
| `greeting` | رسالة الترحيب |
| `suggestions` | الأسئلة الجاهزة اللي تظهر تحت الترحيب |
| `systemPrompt` | شخصية المساعد وتعليماته — **ده أهم إعداد** |
| `maxMessagesPerMinute` | حد الرسايل لكل مستخدم في الدقيقة |

### أمثلة جاهزة

**OpenAI (الأنصح للجودة):**
```env
LLM_PROVIDER=openai
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini
```

**Google Gemini (فيه باقة مجانية):**
```env
LLM_PROVIDER=gemini
LLM_API_KEY=AIza...
LLM_MODEL=gemini-2.5-flash
```

**OpenRouter (موديلات كتير بمفتاح واحد):**
```env
LLM_PROVIDER=openai
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=sk-or-...
LLM_MODEL=openai/gpt-4o-mini
```

**Groq (سريع جداً):**
```env
LLM_PROVIDER=openai
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_API_KEY=gsk_...
LLM_MODEL=llama-3.3-70b-versatile
```

**موديل محلي بـ Ollama (مجاني تماماً وبيدور على جهازك):**
```env
LLM_PROVIDER=openai
LLM_BASE_URL=http://localhost:11434/v1
LLM_API_KEY=ollama
LLM_MODEL=llama3.1
```

### تخصيص شخصية المساعد

عدّل `systemPrompt` في `config.json` وحط معلوماتك الحقيقية. مثال:

```json
"systemPrompt": "انت «{botName}»، مساعد ودود على موقع شركة النور للتصميم. بتتكلم مصري بسيط. الخدمات: تصميم هويات، سوشيال ميديا، ومواقع. الأسعار بتبدأ من 3000 جنيه. لو حد سأل عن حاجة مش موجودة في بياناتك قول إنك هتوصله لفريق الدعم. الأرقام: 01000000000."
```

> كل ما تحط معلوماتك الحقيقية (خدمات، أسعار، طرق تواصل) كل ما الردود تبقى أدق.

---

## 🧩 تركيبه في موقعك الحالي (الويدجت)

1. حمّل المشروع على سيرفر وخلّيه شغّال (مثلاً `https://chat.yoursite.com`).
2. حط السطر ده قبل `</body>` في **أي** صفحة عندك:

```html
<script src="https://chat.yoursite.com/widget.js"
        data-src="https://chat.yoursite.com"
        data-title="مساعد الموقع"
        data-position="left"
        data-color="#6366f1"></script>
```

| الخاصية | الوظيفة |
|---|---|
| `data-src` | رابط موقع الشات (لو مش مكتوب، بيتاخد من مكان السكريبت) |
| `data-title` | الاسم اللي يظهر فوق البانل |
| `data-position` | `left` (افتراضي، مناسب للعربي) أو `right` |
| `data-color` | لون الزرار |
| `data-open` | `"1"` لو عايز البانل يفتح لوحده أول ما الصفحة تحمّل |

**جرّبه محلياً:** افتح `http://localhost:3000/demo.html` — دي صفحة موقع وهمي
الويدجت شغّال عليها.

---

## 🌍 النشر على الإنترنت

### الخيار الأسهل: Render (فيه باقة مجانية)

1. ارفع الفولدر على GitHub.
2. في [Render](https://render.com) → **New → Web Service** → اختار المستودع.
3. الإعدادات:
   - **Build Command:** (سيبه فاضي)
   - **Start Command:** `node server.js`
   - **Environment Variables:** `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL` …
4. Deploy، وهيديك رابط زي `https://your-chat.onrender.com`.

> على باقة Render المجانية السيرفر بينام بعد فترة خمول وأول طلب بيصحّاه —
> مناسب للتجربة، وللاستخدام الجدي استخدم باقة مدفوعة أو VPS.

### VPS (DigitalOcean / Hetzner / أي سيرفر)

```bash
sudo apt update && sudo apt install -y nodejs npm nginx
cd /var/www && git clone <repo> && cd ai-chat-site
cp .env.example .env && nano .env      # حط المفتاح
npm i -g pm2
pm2 start server.js --name ai-chat
pm2 save && pm2 startup
```

**Nginx كـ reverse proxy** (`/etc/nginx/sites-available/chat`) لشهادة SSL
ونطاق زي `chat.yoursite.com`:

```nginx
server {
    listen 80;
    server_name chat.yoursite.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 120s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/chat /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d chat.yoursite.com     # SSL مجاني
```

### Docker (اختياري)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
docker build -t ai-chat . && docker run -d -p 3000:3000 --env-file .env --name ai-chat ai-chat
```

---

## 🔒 ملاحظات أمان

- **مت** تحط مفتاح الـ API في ملفات الواجهة (`public/`) — دايماً في `.env` على السيرفر.
- ملف `.env` مستبعد من Git (شوف `.gitignore`).
- الـ Rate limit الافتراضي 20 رسالة/دقيقة لكل IP — عدّله من `maxMessagesPerMinute`.
- لو الموقع هيبقى عليه زوار كتير، ضيف حماية إضافية (Cloudflare / Turnstile)
  وراقب الاستهلاك من لوحة المزوّد.
- التخزين مؤقت في `sessionStorage` — مفيش رسايل بتتخزن على السيرفر، وكل زائر
  محادثته منفصلة عن التانية.

---

## 🧪 نقاط النهاية (API)

| المسار | الوصف |
|---|---|
| `GET /` | واجهة الشات |
| `GET /demo.html` | صفحة تجريبية للويدجت |
| `GET /api/config` | إعدادات الواجهة (اسم المساعد، الترحيب، الاقتراحات) |
| `GET /api/health` | فحص حالة السيرفر |
| `POST /api/chat` | يستقبل `{ "messages": [{role, content}] }` ويرجّع `{ "reply": "..." }` |

---

## 🧯 حل المشاكل

| المشكلة | الحل |
|---|---|
| «مش قادر أوصل للسيرفر» | اتأكد إن `node server.js` شغّال وإنك فاتح `http://localhost:3000` |
| «مفتاح الـ API مش صحيح» | راجع المفتاح في `.env` واعمل restart للسيرفر |
| «الموديل أو الرابط مش صح» | راجع `LLM_MODEL` و`LLM_BASE_URL` |
| «المزوّد تحت ضغط» أو ردود بطيئة | جرّب موديل تاني أو استنى شوية (المزوّد المجاني أبطأ) |
| الردود طالعة عامة مش عن نشاطك | عدّل `systemPrompt` وحط معلوماتك الحقيقية |
| عدّلت `.env` ومفيش تغيير | لازم تعيد تشغيل السيرفر (Ctrl+C ثم `npm start`) |

---

## 📁 شكل المشروع

```
ai-chat-site/
├─ server.js            # السيرفر + التوجيه للمزوّد (بدون مكتبات)
├─ config.json          # الإعدادات الظاهرة
├─ .env.example         # نموذج الأسرار (انسخه لـ .env)
├─ package.json
└─ public/
   ├─ index.html        # واجهة الشات (HTML/CSS/JS)
   ├─ widget.js         # زرار الشات العايم لأي موقع
   └─ demo.html         # صفحة تجريبية للويدجت
```

---

بالهنا والشفا 🎉 — لو حابب نضيف حاجات زي حفظ المحادثات في قاعدة بيانات،
أو تسجيل الإيميلات، أو مساعد بيعرف محتوى موقعك (RAG)، قولي.
