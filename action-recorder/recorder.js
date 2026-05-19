/**
 * Web Action Recorder — Bookmarklet Script
 *
 * A self-contained, dependency-free DOM click recorder.
 * When injected into any page, it creates a Shadow DOM panel
 * that captures click events, resolves unique CSS selectors,
 * replays recorded clicks, and exports automation scripts.
 *
 * Usage: paste into a bookmarklet, or use the companion index.html
 * to generate a draggable bookmarklet button.
 */
(function () {
  'use strict';

  /* ── Dedup: toggle visibility if already injected ── */
  var CONTAINER_ID = '__war_container__';
  var existing = document.getElementById(CONTAINER_ID);
  if (existing && existing.shadowRoot) {
    var existingPanel = existing.shadowRoot.querySelector('.war-panel');
    if (existingPanel) {
      existingPanel.style.display = existingPanel.style.display === 'none' ? 'flex' : 'none';
    }
    return;
  }

  /* ═══════════════════════════════════════════
     State
     ═══════════════════════════════════════════ */
  var isRecording = true;
  var records = [];
  var recordIdCounter = 0;
  var isMinimized = false;
  var isDragging = false;
  var dragStartX = 0;
  var dragStartY = 0;
  var panelLeft = 0;
  var panelTop = 0;
  var clickHandler = null;
  var toastTimer = null;

  // Replay state
  var isReplaying = false;
  var replayAborted = false;
  var replayTimers = [];

  /* ═══════════════════════════════════════════
     CSS.escape polyfill (for very old browsers)
     ═══════════════════════════════════════════ */
  var cssEscape = (typeof CSS !== 'undefined' && CSS.escape)
    ? function (v) { return CSS.escape(v); }
    : function (v) {
        return String(v).replace(/([^\w-])/g, '\\$1');
      };

  /* ═══════════════════════════════════════════
     Build a unique CSS selector for an element
     ═══════════════════════════════════════════ */
  function getSelector(el) {
    if (!el || el.nodeType !== 1) return '';
    if (el === document.body) return 'body';
    if (el === document.documentElement) return 'html';

    if (el.id) {
      return '#' + cssEscape(el.id);
    }

    var parts = [];
    var node = el;

    while (node && node.nodeType === 1 && node !== document.body && node !== document.documentElement) {
      var seg = node.tagName.toLowerCase();

      if (node.id) {
        parts.unshift('#' + cssEscape(node.id));
        break;
      }

      var classes = Array.from(node.classList).filter(function (c) {
        return c.length > 0 && !/^(ng-|_|js-|css-|svelte-)/i.test(c);
      }).slice(0, 2);
      if (classes.length) {
        seg += '.' + classes.map(cssEscape).join('.');
      }

      var parent = node.parentElement;
      if (parent) {
        var siblings = Array.from(parent.children);
        var idx = siblings.indexOf(node) + 1;
        seg += ':nth-child(' + idx + ')';
      }

      parts.unshift(seg);
      node = node.parentElement;

      try {
        if (parts.length > 1 && document.querySelectorAll(parts.join(' > ')).length === 1) {
          break;
        }
      } catch (_) { /* edge case: invalid intermediate selector; keep climbing */ }
    }

    return parts.join(' > ');
  }

  /* ═══════════════════════════════════════════
     Flash highlight on the clicked element
     ═══════════════════════════════════════════ */
  function flash(el) {
    var prevOutline = el.style.outline;
    var prevOffset = el.style.outlineOffset;
    var prevTransition = el.style.transition;

    el.style.transition = 'outline 0.12s ease';
    el.style.outline = '3px solid #ff3b30';
    el.style.outlineOffset = '2px';

    setTimeout(function () {
      el.style.outline = '3px solid rgba(255,59,48,0)';
      setTimeout(function () {
        el.style.outline = prevOutline;
        el.style.outlineOffset = prevOffset;
        el.style.transition = prevTransition;
      }, 180);
    }, 650);
  }

  /* ═══════════════════════════════════════════
     Copy text to clipboard (with fallback)
     ═══════════════════════════════════════════ */
  function copyToClipboard(text, onSuccess) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(onSuccess).catch(function () {
        fallbackCopy(text, onSuccess);
      });
    } else {
      fallbackCopy(text, onSuccess);
    }
  }

  function fallbackCopy(text, onSuccess) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      onSuccess();
    } catch (_) { /* silently fail */ }
    document.body.removeChild(ta);
  }

  /* ═══════════════════════════════════════════
     Show a transient toast message
     ═══════════════════════════════════════════ */
  function showToast(shadowRoot, msg) {
    var toast = shadowRoot.querySelector('.war-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'war-toast';
      shadowRoot.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('war-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('war-show');
    }, 1600);
  }

  /* ═══════════════════════════════════════════
     Build the Shadow DOM UI
     ═══════════════════════════════════════════ */
  var container = document.createElement('div');
  container.id = CONTAINER_ID;

  var shadow = container.attachShadow({ mode: 'open' });

  // ── Stylesheets (fully isolated) ──
  var style = document.createElement('style');
  style.textContent = [
    '*{margin:0;padding:0;box-sizing:border-box}',
    ':host{all:initial}',

    '.war-panel{',
      'position:fixed;bottom:20px;right:20px;width:370px;max-height:560px;',
      'background:#1a1a2e;color:#e0e0e0;',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;',
      'font-size:13px;line-height:1.4;',
      'border-radius:14px;',
      'box-shadow:0 12px 40px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.07);',
      'z-index:2147483647;',
      'display:flex;flex-direction:column;overflow:hidden;',
      'user-select:none;-webkit-user-select:none;',
      'transition:transform .2s ease,opacity .2s ease,box-shadow .2s ease',
    '}',
    '.war-panel.war-minimized .war-body,',
    '.war-panel.war-minimized .war-footer,',
    '.war-panel.war-minimized .war-status{display:none}',
    '.war-panel.war-minimized{max-height:none}',

    '.war-header{',
      'display:flex;align-items:center;gap:10px;',
      'padding:12px 16px;',
      'background:#16213e;',
      'border-bottom:1px solid rgba(255,255,255,.05);',
      'cursor:grab;flex-shrink:0',
    '}',
    '.war-header:active{cursor:grabbing}',

    '.war-logo{',
      'width:22px;height:22px;border-radius:50%;',
      'background:linear-gradient(135deg,#ff3b30,#ff6b5b);',
      'flex-shrink:0;position:relative;',
      'box-shadow:0 0 10px rgba(255,59,48,.4)',
    '}',
    '.war-logo::after{',
      'content:"";position:absolute;top:50%;left:50%;',
      'transform:translate(-50%,-50%);',
      'width:9px;height:9px;border-radius:50%;background:#fff',
    '}',

    '.war-title{',
      'flex:1;font-weight:600;font-size:13px;color:#fff;',
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;',
      'letter-spacing:.01em',
    '}',

    '.war-btn{',
      'width:30px;height:30px;border:none;',
      'background:rgba(255,255,255,.05);color:#999;',
      'border-radius:8px;cursor:pointer;',
      'display:flex;align-items:center;justify-content:center;',
      'font-size:15px;line-height:1;',
      'transition:background .15s,color .15s,transform .1s;',
      'flex-shrink:0',
    '}',
    '.war-btn:hover{background:rgba(255,255,255,.12);color:#fff}',
    '.war-btn:active{transform:scale(.93)}',
    '.war-btn-close:hover{background:#ff3b30!important;color:#fff!important}',

    '.war-status{',
      'padding:9px 16px;font-size:11px;',
      'display:flex;align-items:center;gap:8px;',
      'background:rgba(255,255,255,.015);flex-shrink:0',
    '}',
    '.war-status-dot{',
      'width:8px;height:8px;border-radius:50%;',
      'background:#34c759;flex-shrink:0;',
      'box-shadow:0 0 6px rgba(52,199,89,.5);',
      'transition:background .25s,box-shadow .25s',
    '}',
    '.war-status-dot.war-paused{background:#ff9500;box-shadow:0 0 6px rgba(255,149,0,.5)}',
    '.war-status-dot.war-replaying{background:#5e5ce6;box-shadow:0 0 6px rgba(94,92,230,.5)}',
    '.war-status-text{color:#888}',
    '.war-status-count{color:#555;margin-left:auto;font-variant-numeric:tabular-nums}',

    '.war-body{',
      'flex:1;overflow-y:auto;padding:2px 0;',
      'min-height:50px;max-height:260px',
    '}',
    '.war-body::-webkit-scrollbar{width:5px}',
    '.war-body::-webkit-scrollbar-track{background:transparent}',
    '.war-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:3px}',

    '.war-empty{',
      'padding:36px 16px;text-align:center;color:#444;font-size:12px;',
      'letter-spacing:.02em',
    '}',

    '.war-record{',
      'display:flex;align-items:flex-start;gap:8px;',
      'padding:9px 16px;',
      'border-bottom:1px solid rgba(255,255,255,.025);',
      'transition:background .12s',
    '}',
    '.war-record:hover{background:rgba(255,255,255,.025)}',
    '.war-record:last-child{border-bottom:none}',

    '.war-record-num{',
      'color:#444;font-size:10px;min-width:22px;flex-shrink:0;',
      'padding-top:2px;font-variant-numeric:tabular-nums',
    '}',

    '.war-record-path{',
      'flex:1;font-family:"SF Mono","Fira Code","Cascadia Code",Consolas,monospace;',
      'font-size:11px;color:#ff9f43;word-break:break-all;line-height:1.55;',
      'padding:2px 0',
    '}',

    '.war-record-copy{',
      'width:26px;height:26px;border:none;background:transparent;color:#555;',
      'cursor:pointer;border-radius:6px;flex-shrink:0;font-size:12px;',
      'display:flex;align-items:center;justify-content:center;',
      'transition:color .12s,background .12s;margin-top:1px',
    '}',
    '.war-record-copy:hover{color:#fff;background:rgba(255,255,255,.07)}',

    /* ── Footer with two rows ── */
    '.war-footer{',
      'display:flex;flex-direction:column;gap:6px;',
      'padding:10px 16px 12px;',
      'border-top:1px solid rgba(255,255,255,.05);flex-shrink:0',
    '}',
    '.war-footer-row{',
      'display:flex;gap:6px',
    '}',

    '.war-action{',
      'flex:1;min-width:0;padding:7px 8px;',
      'border:1px solid rgba(255,255,255,.08);',
      'background:rgba(255,255,255,.03);color:#bbb;',
      'border-radius:8px;cursor:pointer;font-size:11px;font-weight:500;',
      'transition:all .15s;white-space:nowrap;text-align:center;',
      'letter-spacing:.01em;overflow:hidden;text-overflow:ellipsis',
    '}',
    '.war-action:hover{background:rgba(255,255,255,.08);color:#fff;border-color:rgba(255,255,255,.16)}',
    '.war-action.war-paused{background:#ff9500;border-color:#ff9500;color:#fff}',
    '.war-action.war-replay-active{background:#5e5ce6;border-color:#5e5ce6;color:#fff;font-weight:600}',

    '.war-toast{',
      'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);',
      'background:#2a2a3e;color:#fff;padding:8px 22px;border-radius:20px;',
      'font-size:12px;z-index:2147483647;pointer-events:none;',
      'opacity:0;transition:opacity .3s ease;',
      'box-shadow:0 4px 16px rgba(0,0,0,.4);white-space:nowrap',
    '}',
    '.war-toast.war-show{opacity:1}',
  ].join('');

  shadow.appendChild(style);

  // ── DOM structure ──
  var panel = document.createElement('div');
  panel.className = 'war-panel';
  panel.innerHTML =
    '<div class="war-header" data-war-drag>' +
      '<div class="war-logo"></div>' +
      '<span class="war-title">Web Action Recorder</span>' +
      '<button class="war-btn war-btn-min" title="Minimize">−</button>' +
      '<button class="war-btn war-btn-close" title="Close">✕</button>' +
    '</div>' +
    '<div class="war-status">' +
      '<span class="war-status-dot"></span>' +
      '<span class="war-status-text">Recording…</span>' +
      '<span class="war-status-count">0 clicks</span>' +
    '</div>' +
    '<div class="war-body">' +
      '<div class="war-empty">Click anywhere on the page to start recording</div>' +
    '</div>' +
    '<div class="war-footer">' +
      '<div class="war-footer-row">' +
        '<button class="war-action" data-war-action="pause">⏸ Pause</button>' +
        '<button class="war-action" data-war-action="replay">▶ Play</button>' +
        '<button class="war-action" data-war-action="clear">✗ Clear</button>' +
      '</div>' +
      '<div class="war-footer-row">' +
        '<button class="war-action" data-war-action="copy-all">⎘ JSON</button>' +
        '<button class="war-action" data-war-action="export-playwright">📄 Playwright</button>' +
        '<button class="war-action" data-war-action="export-puppeteer">📄 Puppeteer</button>' +
      '</div>' +
    '</div>';

  shadow.appendChild(panel);

  /* ═══════════════════════════════════════════
     Render the records list
     ═══════════════════════════════════════════ */
  function renderRecords() {
    var body = shadow.querySelector('.war-body');
    var countEl = shadow.querySelector('.war-status-count');

    if (records.length === 0) {
      body.innerHTML = '<div class="war-empty">Click anywhere on the page to start recording</div>';
    } else {
      var recent = records.slice(-10);
      body.innerHTML = recent.map(function (r, i) {
        var globalIdx = records.length - recent.length + i + 1;
        return (
          '<div class="war-record">' +
            '<span class="war-record-num">#' + globalIdx + '</span>' +
            '<span class="war-record-path" title="' + r.selector.replace(/"/g, '&quot;') + '">' +
              r.selector +
            '</span>' +
            '<button class="war-record-copy" data-war-copy="' + r.id + '" title="Copy selector">📋</button>' +
          '</div>'
        );
      }).join('');
    }

    countEl.textContent = records.length + ' click' + (records.length !== 1 ? 's' : '');
  }

  /* ═══════════════════════════════════════════
     Add a new record
     ═══════════════════════════════════════════ */
  function addRecord(selector, tagName) {
    var id = ++recordIdCounter;
    records.push({
      id: id,
      selector: selector,
      tag: tagName,
      url: location.href,
      time: new Date().toISOString()
    });
    if (records.length > 300) {
      records = records.slice(-200);
    }
    renderRecords();
  }

  /* ═══════════════════════════════════════════
     Update status bar (recording / paused / replaying)
     ═══════════════════════════════════════════ */
  function setStatus(state) {
    var dot = shadow.querySelector('.war-status-dot');
    var text = shadow.querySelector('.war-status-text');
    dot.classList.remove('war-paused', 'war-replaying');
    if (state === 'paused') {
      dot.classList.add('war-paused');
      text.textContent = 'Paused';
    } else if (state === 'replaying') {
      dot.classList.add('war-replaying');
    } else {
      text.textContent = 'Recording…';
    }
  }

  /* ═══════════════════════════════════════════
     Update play/stop button
     ═══════════════════════════════════════════ */
  var playBtn = shadow.querySelector('[data-war-action="replay"]');

  function setPlayButtonState(state) {
    if (state === 'replaying') {
      playBtn.textContent = '⏹ Stop';
      playBtn.classList.add('war-replay-active');
    } else {
      playBtn.textContent = '▶ Play';
      playBtn.classList.remove('war-replay-active');
    }
  }

  /* ═══════════════════════════════════════════
     Clear all replay timers
     ═══════════════════════════════════════════ */
  function clearReplayTimers() {
    for (var i = 0; i < replayTimers.length; i++) {
      clearTimeout(replayTimers[i]);
    }
    replayTimers = [];
  }

  /* ═══════════════════════════════════════════
     Delay helper (returns cancellable Promise)
     ═══════════════════════════════════════════ */
  function delay(ms) {
    return new Promise(function (resolve) {
      var t = setTimeout(resolve, ms);
      replayTimers.push(t);
    });
  }

  /* ═══════════════════════════════════════════
     Calculate step delay from record timestamps
     ═══════════════════════════════════════════ */
  function calcStepDelay(current, next) {
    var t1 = new Date(current.time).getTime();
    var t2 = new Date(next.time).getTime();
    var diff = t2 - t1;
    if (diff > 0 && diff < 5000) return diff;
    return 800;
  }

  /* ═══════════════════════════════════════════
     ══════════  REPLAY ENGINE  ══════════════
     ═══════════════════════════════════════════ */
  async function replay() {
    if (records.length === 0) {
      showToast(shadow, 'No records to replay');
      return;
    }

    // Already replaying — stop
    if (isReplaying) {
      replayAborted = true;
      clearReplayTimers();
      isReplaying = false;
      setPlayButtonState('idle');
      setStatus('recording');
      showToast(shadow, 'Replay stopped');
      return;
    }

    isReplaying = true;
    replayAborted = false;
    setPlayButtonState('replaying');
    setStatus('replaying');

    var total = records.length;
    var statusText = shadow.querySelector('.war-status-text');

    for (var i = 0; i < total; i++) {
      if (replayAborted) break;

      var r = records[i];
      statusText.textContent = 'Replaying (' + (i + 1) + '/' + total + ')…';

      var el = document.querySelector(r.selector);

      if (el) {
        flash(el);

        el.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
          button: 0
        }));

        await delay(200);
      } else {
        showToast(shadow, 'Not found: ' + r.selector);
      }

      if (i < total - 1 && !replayAborted) {
        var stepDelay = calcStepDelay(r, records[i + 1]);
        await delay(stepDelay);
      }
    }

    isReplaying = false;
    clearReplayTimers();
    setPlayButtonState('idle');
    setStatus('recording');

    if (!replayAborted) {
      statusText.textContent = 'Recording…';
      showToast(shadow, 'Replay complete (' + total + ' steps)');
    }
  }

  /* ═══════════════════════════════════════════
     ═══════  CODE GENERATORS  ═══════════════
     ═══════════════════════════════════════════ */

  function generateCommonHeader() {
    return [
      '/**',
      ' * Auto-generated by Web Action Recorder',
      ' * Source URL: ' + (records.length > 0 ? records[0].url : ''),
      ' * Total steps: ' + records.length,
      ' * Generated at: ' + new Date().toISOString(),
      ' */',
      ''
    ].join('\n');
  }

  function generatePlaywright() {
    if (records.length === 0) return '';

    var lines = [generateCommonHeader()];
    lines.push("const { chromium } = require('playwright');");
    lines.push('');
    lines.push('(async () => {');
    lines.push('  const browser = await chromium.launch({ headless: false });');
    lines.push('  const context = await browser.newContext();');
    lines.push('  const page = await context.newPage();');
    lines.push('');
    lines.push("  // Navigate to the initial page");
    lines.push("  await page.goto('" + records[0].url.replace(/'/g, "\\'") + "');");
    lines.push('  await page.waitForLoadState("domcontentloaded");');
    lines.push('');

    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      var delayMs = (i < records.length - 1) ? calcStepDelay(r, records[i + 1]) : 800;
      var safeSelector = r.selector.replace(/'/g, "\\'");

      lines.push('  // Step ' + (i + 1) + ': ' + r.tag);
      lines.push("  await page.locator('" + safeSelector + "').click();");
      if (delayMs > 100) {
        lines.push('  await page.waitForTimeout(' + delayMs + ');');
      }
      lines.push('');
    }

    lines.push('  await browser.close();');
    lines.push('})();');

    return lines.join('\n');
  }

  function generatePuppeteer() {
    if (records.length === 0) return '';

    var lines = [generateCommonHeader()];
    lines.push("const puppeteer = require('puppeteer');");
    lines.push('');
    lines.push('(async () => {');
    lines.push('  const browser = await puppeteer.launch({ headless: false });');
    lines.push('  const page = await browser.newPage();');
    lines.push('');
    lines.push("  // Navigate to the initial page");
    lines.push("  await page.goto('" + records[0].url.replace(/'/g, "\\'") + "');");
    lines.push('  await page.waitForSelector("body");');
    lines.push('');

    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      var delayMs = (i < records.length - 1) ? calcStepDelay(r, records[i + 1]) : 800;
      var safeSelector = r.selector.replace(/'/g, "\\'");

      lines.push('  // Step ' + (i + 1) + ': ' + r.tag);
      lines.push("  await page.waitForSelector('" + safeSelector + "', { timeout: 5000 });");
      lines.push("  await page.click('" + safeSelector + "');");
      if (delayMs > 100) {
        lines.push('  await new Promise(r => setTimeout(r, ' + delayMs + '));');
      }
      lines.push('');
    }

    lines.push('  await browser.close();');
    lines.push('})();');

    return lines.join('\n');
  }

  function exportToPlaywright() {
    if (records.length === 0) {
      showToast(shadow, 'No records to export');
      return;
    }
    var code = generatePlaywright();
    copyToClipboard(code, function () {
      showToast(shadow, 'Playwright script copied (' + records.length + ' steps)');
    });
  }

  function exportToPuppeteer() {
    if (records.length === 0) {
      showToast(shadow, 'No records to export');
      return;
    }
    var code = generatePuppeteer();
    copyToClipboard(code, function () {
      showToast(shadow, 'Puppeteer script copied (' + records.length + ' steps)');
    });
  }

  /* ═══════════════════════════════════════════
     Global click handler
     ═══════════════════════════════════════════ */
  clickHandler = function (e) {
    // Ignore clicks from our own panel
    if (container.contains(e.target)) return;

    // Don't record during replay or when paused
    if (!isRecording || isReplaying) return;

    var el = e.target;
    if (!el || el.nodeType !== 1) return;

    flash(el);

    var selector = getSelector(el);

    addRecord(selector, el.tagName.toLowerCase());

    var link = el.closest('a[href]');
    if (link && link.getAttribute('href') !== '#') {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  document.addEventListener('click', clickHandler, true);

  /* ═══════════════════════════════════════════
     Panel button event bindings
     ═══════════════════════════════════════════ */

  // Pause / Resume
  shadow.querySelector('[data-war-action="pause"]').addEventListener('click', function (e) {
    e.stopPropagation();
    if (isReplaying) {
      showToast(shadow, 'Stop replay first');
      return;
    }
    isRecording = !isRecording;

    if (isRecording) {
      this.textContent = '⏸ Pause';
      this.classList.remove('war-paused');
      setStatus('recording');
    } else {
      this.textContent = '▶ Resume';
      this.classList.add('war-paused');
      setStatus('paused');
    }
  });

  // Replay / Stop
  playBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    replay();
  });

  // Copy all as JSON
  shadow.querySelector('[data-war-action="copy-all"]').addEventListener('click', function (e) {
    e.stopPropagation();
    if (records.length === 0) {
      showToast(shadow, 'No records to copy');
      return;
    }
    var json = JSON.stringify(records, null, 2);
    copyToClipboard(json, function () {
      showToast(shadow, 'Copied ' + records.length + ' records as JSON');
    });
  });

  // Export Playwright
  shadow.querySelector('[data-war-action="export-playwright"]').addEventListener('click', function (e) {
    e.stopPropagation();
    exportToPlaywright();
  });

  // Export Puppeteer
  shadow.querySelector('[data-war-action="export-puppeteer"]').addEventListener('click', function (e) {
    e.stopPropagation();
    exportToPuppeteer();
  });

  // Clear all
  shadow.querySelector('[data-war-action="clear"]').addEventListener('click', function (e) {
    e.stopPropagation();
    if (isReplaying) {
      showToast(shadow, 'Stop replay first');
      return;
    }
    if (records.length === 0) return;
    records = [];
    renderRecords();
    showToast(shadow, 'All records cleared');
  });

  // Individual record copy (event delegation on the body)
  shadow.querySelector('.war-body').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-war-copy]');
    if (!btn) return;
    e.stopPropagation();
    var id = parseInt(btn.getAttribute('data-war-copy'), 10);
    var record = null;
    for (var i = records.length - 1; i >= 0; i--) {
      if (records[i].id === id) { record = records[i]; break; }
    }
    if (record) {
      copyToClipboard(record.selector, function () {
        showToast(shadow, 'Copied selector');
      });
    }
  });

  // Minimize / Expand
  shadow.querySelector('.war-btn-min').addEventListener('click', function (e) {
    e.stopPropagation();
    isMinimized = !isMinimized;
    if (isMinimized) {
      panel.classList.add('war-minimized');
      this.textContent = '+';
      this.title = 'Expand';
    } else {
      panel.classList.remove('war-minimized');
      this.textContent = '−';
      this.title = 'Minimize';
    }
  });

  // Close (with replay cleanup)
  shadow.querySelector('.war-btn-close').addEventListener('click', function (e) {
    e.stopPropagation();
    if (isReplaying) {
      replayAborted = true;
      isReplaying = false;
      clearReplayTimers();
    }
    document.removeEventListener('click', clickHandler, true);
    container.remove();
  });

  /* ═══════════════════════════════════════════
     Drag-to-move (pointer events)
     ═══════════════════════════════════════════ */
  var dragHandle = shadow.querySelector('[data-war-drag]');

  dragHandle.addEventListener('pointerdown', function (e) {
    if (e.target.closest('button')) return;
    isDragging = true;
    var rect = panel.getBoundingClientRect();
    dragStartX = e.clientX - rect.left;
    dragStartY = e.clientY - rect.top;
    panel.style.transition = 'none';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.style.left = rect.left + 'px';
    panel.style.top = rect.top + 'px';
    dragHandle.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  document.addEventListener('pointermove', function (e) {
    if (!isDragging) return;
    var x = e.clientX - dragStartX;
    var y = e.clientY - dragStartY;

    var pw = panel.offsetWidth;
    var ph = panel.offsetHeight;
    x = Math.max(0, Math.min(x, window.innerWidth - pw));
    y = Math.max(0, Math.min(y, window.innerHeight - ph));

    panel.style.left = x + 'px';
    panel.style.top = y + 'px';
  });

  document.addEventListener('pointerup', function () {
    if (isDragging) {
      isDragging = false;
      panel.style.transition = 'transform .2s ease, opacity .2s ease, box-shadow .2s ease';
    }
  });

  /* ═══════════════════════════════════════════
     Inject into the page
     ═══════════════════════════════════════════ */
  document.body.appendChild(container);
  renderRecords();

})();
