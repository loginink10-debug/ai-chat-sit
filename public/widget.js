/*!
 * widget.js — زرار شات عايم تتحطه في أي موقع
 * ------------------------------------------------------------------
 * الاستخدام (قبل </body>):
 *
 *   <script src="https://YOUR-SITE.com/widget.js"
 *           data-src="https://YOUR-SITE.com"
 *           data-title="مساعد الموقع"
 *           data-position="left"
 *           data-color="#6366f1"></script>
 *
 *  data-src       : رابط موقع الشات (لو مش مكتوب، بياخده من مكان السكريبت نفسه)
 *  data-title     : الاسم اللي يظهر فوق البانل
 *  data-position  : left (افتراضي، مناسب للعربي) أو right
 *  data-color     : لون الزرار (أي لون CSS)
 *  data-open      : "1" لو عايز البانل يفتح لوحده أول ما الصفحة تحمّل
 * ------------------------------------------------------------------
 */
(function () {
  'use strict';

  var script = document.currentScript || (function () {
    var all = document.getElementsByTagName('script');
    for (var i = all.length - 1; i >= 0; i--) {
      if (all[i].src && /widget\.js(\?|$)/.test(all[i].src)) return all[i];
    }
    return null;
  })();

  var cfg = {
    src: (script && script.getAttribute('data-src')) || (script && script.src ? new URL(script.src).origin : ''),
    title: (script && script.getAttribute('data-title')) || 'المساعد الذكي',
    position: (script && script.getAttribute('data-position')) === 'right' ? 'right' : 'left',
    color: (script && script.getAttribute('data-color')) || '#6366f1',
    openOnLoad: (script && script.getAttribute('data-open')) === '1'
  };

  if (!cfg.src) {
    console.warn('[chat-widget] محتاج تحدد data-src برابط موقع الشات.');
    return;
  }
  cfg.src = cfg.src.replace(/\/+$/, '');
  if (document.getElementById('ai-chat-widget-host')) return; // اتحمّل قبل كده

  var host = document.createElement('div');
  host.id = 'ai-chat-widget-host';
  host.style.cssText = 'position:fixed;z-index:2147483000;' +
    (cfg.position === 'right' ? 'right:20px;' : 'left:20px;') + 'bottom:20px;';
  document.body.appendChild(host);

  var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

  var style = document.createElement('style');
  style.textContent = [
    ':host{all:initial}',
    '*{box-sizing:border-box}',
    '.wrap{position:relative;font-family:"Segoe UI","Noto Kufi Arabic",Tahoma,Arial,sans-serif;direction:rtl}',
    '.btn{width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;display:grid;place-items:center;',
    '  background:' + cfg.color + ';color:#fff;box-shadow:0 12px 28px -8px rgba(15,23,42,.45),0 4px 10px -4px rgba(15,23,42,.25);',
    '  transition:transform .2s ease,box-shadow .2s ease;position:relative}',
    '.btn:hover{transform:translateY(-2px) scale(1.04);box-shadow:0 18px 34px -10px rgba(15,23,42,.5)}',
    '.btn:active{transform:scale(.97)}',
    '.btn svg{width:26px;height:26px;transition:.2s ease}',
    '.btn .x{display:none}',
    '.open .btn .chat{display:none}',
    '.open .btn .x{display:block}',
    '.badge{position:absolute;top:-2px;inset-inline-end:-2px;width:14px;height:14px;border-radius:50%;',
    '  background:#10b981;border:3px solid #fff;box-shadow:0 0 0 3px rgba(16,185,129,.2)}',
    '.bubble-hint{position:absolute;bottom:74px;inset-inline-end:0;background:#fff;color:#0f172a;',
    '  border-radius:14px;padding:10px 14px;font-size:13px;line-height:1.6;white-space:nowrap;',
    '  box-shadow:0 10px 30px -10px rgba(15,23,42,.4);border:1px solid #e6e9f2;display:none;cursor:pointer}',
    '.bubble-hint b{display:block;font-size:12.5px}',
    '.bubble-hint span{color:#64748b;font-size:11.5px}',
    '.panel{position:absolute;bottom:74px;' + (cfg.position === 'right' ? 'right:0;' : 'left:0;') +
      'width:392px;height:620px;max-height:calc(100dvh - 120px);background:#fff;border-radius:22px;overflow:hidden;',
    '  box-shadow:0 30px 70px -20px rgba(15,23,42,.45),0 0 0 1px rgba(15,23,42,.06);',
    '  display:none;flex-direction:column;animation:pop .22s cubic-bezier(.2,.9,.3,1.2)}',
    '.open .panel{display:flex}',
    '@keyframes pop{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}',
    '.head{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #eef1f7;',
    '  background:linear-gradient(135deg,' + cfg.color + ',#06b6d4);color:#fff;flex:0 0 auto}',
    '.head .av{width:36px;height:36px;border-radius:11px;background:rgba(255,255,255,.22);display:grid;place-items:center;flex:0 0 auto}',
    '.head .av svg{width:19px;height:19px}',
    '.head .t{line-height:1.3;min-width:0}',
    '.head .t b{display:block;font-size:14px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.head .t i{font-style:normal;font-size:11px;opacity:.9;display:flex;align-items:center;gap:5px}',
    '.head .t i::before{content:"";width:6px;height:6px;border-radius:50%;background:#bbf7d0;display:inline-block}',
    '.head .close{margin-inline-start:auto;background:rgba(255,255,255,.16);border:none;color:#fff;width:30px;height:30px;',
    '  border-radius:9px;cursor:pointer;display:grid;place-items:center;flex:0 0 auto}',
    '.head .close:hover{background:rgba(255,255,255,.3)}',
    '.head .close svg{width:15px;height:15px}',
    'iframe{border:0;width:100%;height:100%;flex:1;background:#f6f7fb}',
    '.body{flex:1;display:flex;overflow:hidden}',
    '@media (max-width:480px){',
    '  .panel{width:calc(100vw - 24px);height:calc(100dvh - 110px)}',
    '  .bubble-hint{display:none!important}',
    '}'
  ].join('');

  var wrap = document.createElement('div');
  wrap.className = 'wrap';
  wrap.innerHTML = [
    '<div class="panel" role="dialog" aria-label="محادثة">',
    '  <div class="head">',
    '    <div class="av"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></div>',
    '    <div class="t"><b></b><i>متصل دلوقتي</i></div>',
    '    <button class="close" aria-label="إغلاق"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>',
    '  </div>',
    '  <div class="body"></div>',
    '</div>',
    '<div class="bubble-hint"><b>محتاج مساعدة؟</b><span>اسألني في أي حاجة 👋</span></div>',
    '<button class="btn" aria-label="افتح المحادثة">',
    '  <span class="badge"></span>',
    '  <svg class="chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
    '  <svg class="x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    '</button>'
  ].join('');

  root.appendChild(style);
  root.appendChild(wrap);

  wrap.querySelector('.head .t b').textContent = cfg.title;

  var panel = wrap.querySelector('.panel');
  var body = wrap.querySelector('.body');
  var hint = wrap.querySelector('.bubble-hint');
  var btn = wrap.querySelector('.btn');
  var loaded = false;
  var isOpen = false;

  function ensureIframe() {
    if (loaded) return;
    var iframe = document.createElement('iframe');
    iframe.src = cfg.src + '/?embed=1';
    iframe.title = cfg.title;
    iframe.setAttribute('loading', 'lazy');
    body.appendChild(iframe);
    loaded = true;
  }

  function open() {
    isOpen = true;
    ensureIframe();
    wrap.classList.add('open');
    hideHint();
    try { sessionStorage.setItem('ai-widget-open', '1'); } catch (e) {}
  }
  function close() {
    isOpen = false;
    wrap.classList.remove('open');
    try { sessionStorage.setItem('ai-widget-open', '0'); } catch (e) {}
  }

  btn.addEventListener('click', function () { isOpen ? close() : open(); });
  wrap.querySelector('.head .close').addEventListener('click', close);
  hint.addEventListener('click', open);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen) close(); });

  // تلميح صغير بعد شوية وقت لو الزائر لسه مفتحش المحادثة
  var hintTimer = setTimeout(function () {
    if (isOpen) return;
    try { if (sessionStorage.getItem('ai-widget-open') === '1') return; } catch (e) {}
    hint.style.display = 'block';
    setTimeout(hideHint, 9000);
  }, 6000);

  function hideHint() {
    clearTimeout(hintTimer);
    hint.style.display = 'none';
  }

  if (cfg.openOnLoad) {
    setTimeout(open, 300);
  } else {
    try {
      if (sessionStorage.getItem('ai-widget-open') === '1') open();
    } catch (e) {}
  }
})();
