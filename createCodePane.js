// createCodePane.js
// Robust code pane: textarea editor + optional <pre> readonly view (NO swapping), overlay syntax + error lines,
// line numbers, scroll sync, Tab / Shift+Tab (tabs-first).
export function createCodePane({
  value = '',
  language = '',
  indent = '\t',
  readonly = false,
  showLineNumbers = true,
  enableOverlay = true,
  readonlyRenderer = 'textarea', // 'textarea' | 'pre'
  validate = null,
  diagnostics = null,
  syntaxToHtml = null,
  onChange = null
} = {}) {
  // ---------- DOM Structure ----------
  // Mimics the original: highlight div contains line divs with syntax content
  // textarea sits on top with transparent text

  const root = document.createElement('div');
  root.className = 'code-pane';
  if (language) root.dataset.lang = language;

  const lineNums = document.createElement('div');
  lineNums.className = 'code-pane__lines';

  const body = document.createElement('div');
  body.className = 'code-pane__body';

  const ta = document.createElement('textarea');
  ta.className = 'code-pane__editor';
  ta.spellcheck = false;

  const pre = document.createElement('pre');
  pre.className = 'code-pane__editor code-pane__viewer';

  // Highlight div - will contain line-by-line divs with syntax + error backgrounds
  const highlight = document.createElement('div');
  highlight.className = 'code-pane__highlight';

  // Assemble DOM
  body.appendChild(highlight);
  body.appendChild(ta);
  body.appendChild(pre);
  if (showLineNumbers) root.appendChild(lineNums);
  root.appendChild(body);

  // ---------- State ----------
  let _readonly = !!readonly;
  let _diagnostics = Array.isArray(diagnostics) ? diagnostics : [];
  let _validate = validate;
  let _syntaxToHtml = syntaxToHtml;
  let _onChange = onChange;
  let _destroyed = false;

  // ---------- Utilities ----------
  const escapeHtml = (s) =>
    s.replace(/&/g, '&amp;')
     .replace(/</g, '&lt;')
     .replace(/>/g, '&gt;')
     .replace(/"/g, '&quot;')
     .replace(/'/g, '&#039;');

  const activeEl = () => (readonlyRenderer === 'pre' && _readonly) ? pre : ta;
  const getText = () => ta.value;
  const setText = (t) => { ta.value = t; pre.textContent = t; };

  const getLineStart = (text, idx) => text.lastIndexOf('\n', idx - 1) + 1;
  const getLineEnd = (text, idx) => {
    const n = text.indexOf('\n', idx);
    return n === -1 ? text.length : n;
  };

  const outdentLine = (line) => {
    if (line.startsWith('\t')) return { line: line.slice(1), removed: 1 };
    const m = line.match(/^( {1,4})/);
    if (m) return { line: line.slice(m[1].length), removed: m[1].length };
    return { line, removed: 0 };
  };

  const computeDiagnostics = (text) => {
    if (Array.isArray(diagnostics)) return _diagnostics;
    return _validate ? (_validate(text) || []) : [];
  };

  // ---------- Scroll Sync (like original) ----------
  const syncScroll = () => {
    const el = activeEl();
    const scrollTop = el.scrollTop || 0;
    const scrollLeft = el.scrollLeft || 0;

    if (enableOverlay) {
      // Move highlight in opposite direction using transform (both X and Y)
      highlight.style.transform = `translate(${-scrollLeft}px, ${-scrollTop}px)`;
    }
    if (showLineNumbers) {
      lineNums.style.top = `${-scrollTop}px`;
    }
  };

  // ---------- Render Line Numbers ----------
  const renderLineNumbers = (lineCount) => {
    if (!showLineNumbers) return;
    lineNums.innerHTML = Array.from({ length: lineCount }, (_, i) => `<div>${i + 1}</div>`).join('');
    const el = activeEl();
    lineNums.style.height = `${el.scrollHeight}px`;
  };

  // ---------- Render Highlight (syntax + error backgrounds combined) ----------
  // This is the key function - like the original updateHighlight()
  const renderHighlight = (text, diags) => {
    if (!enableOverlay) return;

    const lines = text.split('\n');
    const errLines = new Set(
      (diags || []).map(d => d.lineNumber).filter(n => Number.isFinite(n))
    );

    // If we have a syntax highlighter, highlight the whole text then split by lines
    let highlightedLines;
    if (_syntaxToHtml) {
      // Highlight entire text
      const fullHtml = _syntaxToHtml(text, language) || escapeHtml(text);
      // Split by newlines - but we need to be careful with HTML tags spanning lines
      // Simpler approach: highlight line by line
      highlightedLines = lines.map(line => {
        const html = _syntaxToHtml(line, language);
        return html || escapeHtml(line) || '&nbsp;';
      });
    } else {
      highlightedLines = lines.map(line => escapeHtml(line) || '&nbsp;');
    }

    // Build line divs with error backgrounds and syntax content
    const html = highlightedLines.map((lineHtml, i) => {
      const lineNum = i + 1;
      const isError = errLines.has(lineNum);
      const cls = isError ? 'code-pane__errline code-pane__errline--on' : 'code-pane__errline';
      return `<div class="${cls}">${lineHtml}</div>`;
    }).join('');

    highlight.innerHTML = html;

    // Match highlight size to editor
    const el = activeEl();
    highlight.style.width = `${el.scrollWidth}px`;
    highlight.style.height = `${el.scrollHeight}px`;
  };

  // ---------- Apply Readonly Mode ----------
  const applyReadonlyMode = () => {
    // Capture scroll position before switching
    const scrollTop = activeEl().scrollTop;
    const scrollLeft = activeEl().scrollLeft;

    if (readonlyRenderer === 'textarea') {
      ta.style.display = '';
      pre.style.display = 'none';
      ta.readOnly = _readonly;
      ta.style.caretColor = _readonly ? 'transparent' : '';
    } else {
      if (_readonly) {
        pre.style.display = '';
        ta.style.display = 'none';
      } else {
        ta.style.display = '';
        pre.style.display = 'none';
        ta.readOnly = false;
        ta.style.caretColor = '';
      }
    }

    // Restore scroll position
    const newEl = activeEl();
    newEl.scrollTop = scrollTop;
    newEl.scrollLeft = scrollLeft;
    syncScroll();
  };

  // ---------- Main Refresh ----------
  const refresh = () => {
    if (_destroyed) return;
    const text = getText();
    const lineCount = text.split('\n').length;
    const diags = computeDiagnostics(text);
    if (!Array.isArray(diagnostics)) _diagnostics = diags;

    renderHighlight(text, diags);
    renderLineNumbers(lineCount);

    // Auto-size: ensure the active element expands to fit content
    const el = activeEl();
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';

    syncScroll();

    _onChange?.(text, { diagnostics: diags });
  };

  // ---------- Tab / Shift+Tab ----------
  const onKeyDown = (e) => {
    if (e.key !== 'Tab' || ta.readOnly) return;
    e.preventDefault();

    const value = ta.value;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;

    if (start === end) {
      if (!e.shiftKey) {
        ta.value = value.slice(0, start) + indent + value.slice(end);
        ta.selectionStart = ta.selectionEnd = start + indent.length;
      } else {
        const ls = getLineStart(value, start);
        const le = getLineEnd(value, start);
        const line = value.slice(ls, le);
        const { line: newLine, removed } = outdentLine(line);
        if (removed) {
          ta.value = value.slice(0, ls) + newLine + value.slice(le);
          ta.selectionStart = ta.selectionEnd = start - Math.min(removed, start - ls);
        }
      }
    } else {
      const blockStart = getLineStart(value, start);
      const effectiveEnd = (end > start && value[end - 1] === '\n') ? end - 1 : end;
      const blockEnd = getLineEnd(value, effectiveEnd);
      const before = value.slice(0, blockStart);
      const block = value.slice(blockStart, blockEnd);
      const after = value.slice(blockEnd);
      const blockLines = block.split('\n');

      if (!e.shiftKey) {
        const modified = blockLines.map(l => indent + l).join('\n');
        ta.value = before + modified + after;
        ta.selectionStart = start + indent.length;
        ta.selectionEnd = end + blockLines.length * indent.length;
      } else {
        let removedFirst = 0;
        let removedTotal = 0;
        const modifiedLines = blockLines.map((l, i) => {
          const r = outdentLine(l);
          if (i === 0) removedFirst = r.removed;
          removedTotal += r.removed;
          return r.line;
        });
        ta.value = before + modifiedLines.join('\n') + after;
        ta.selectionStart = start - Math.min(removedFirst, start - blockStart);
        ta.selectionEnd = end - removedTotal;
      }
    }
    pre.textContent = ta.value;
    refresh();
  };

  const onInput = () => {
    pre.textContent = ta.value;
    refresh();
  };

  const onPaste = () => {
    if (ta.readOnly) return;
    setTimeout(() => {
      pre.textContent = ta.value;
      refresh();
    }, 0);
  };

  const onScroll = () => syncScroll();

  // ---------- Initialize ----------
  setText(value);

  // Set initial visibility
  pre.style.display = (readonlyRenderer === 'pre' && _readonly) ? '' : 'none';
  ta.style.display = (readonlyRenderer === 'pre' && _readonly) ? 'none' : '';
  if (readonlyRenderer === 'textarea') {
    ta.readOnly = _readonly;
    ta.style.caretColor = _readonly ? 'transparent' : '';
  }

  ta.addEventListener('keydown', onKeyDown);
  ta.addEventListener('input', onInput);
  ta.addEventListener('paste', onPaste);
  ta.addEventListener('scroll', onScroll);
  pre.addEventListener('scroll', onScroll);

  // Initial render - defer to let DOM settle
  setTimeout(() => refresh(), 0);

  // ---------- Public API ----------
  return {
    root,
    getValue: getText,
    setValue: (t) => {
      setText(String(t ?? ''));
      refresh();
    },
    setReadonly: (on) => {
      _readonly = !!on;
      applyReadonlyMode();
      refresh();
    },
    setDiagnostics: (diags) => {
      _diagnostics = Array.isArray(diags) ? diags : [];
      refresh();
    },
    setHooks: ({ validate, syntaxToHtml, onChange } = {}) => {
      if (validate !== undefined) _validate = validate;
      if (syntaxToHtml !== undefined) _syntaxToHtml = syntaxToHtml;
      if (onChange !== undefined) _onChange = onChange;
      refresh();
    },
    refresh,
    destroy: () => {
      if (_destroyed) return;
      _destroyed = true;
      ta.removeEventListener('keydown', onKeyDown);
      ta.removeEventListener('input', onInput);
      ta.removeEventListener('paste', onPaste);
      ta.removeEventListener('scroll', onScroll);
      pre.removeEventListener('scroll', onScroll);
    }
  };
}
