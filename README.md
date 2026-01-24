# createCodePane

A lightweight, dependency-free code editor component with syntax highlighting, error line highlighting, line numbers, and scroll synchronization.

## Features

- **Syntax highlighting** via pluggable highlighter (Prism, highlight.js, or custom)
- **Error line highlighting** with validation callback
- **Line numbers** with synchronized scrolling
- **Tab/Shift+Tab indentation** (tabs-first approach)
- **Readonly mode** with optional `<pre>` renderer
- **Scroll sync** between textarea and overlay layers

## Installation

Copy `createCodePane.js` to your project and import it:

```js
import { createCodePane } from './createCodePane.js';
```

## Basic Usage

```js
const pane = createCodePane({
  value: 'console.log("Hello, World!");',
  language: 'javascript'
});

document.getElementById('editor').appendChild(pane.root);
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `value` | `string` | `''` | Initial code content |
| `language` | `string` | `''` | Language identifier (used for syntax highlighting) |
| `indent` | `string` | `'\t'` | Indentation string for Tab key |
| `readonly` | `boolean` | `false` | Whether the editor is read-only |
| `showLineNumbers` | `boolean` | `true` | Show line numbers gutter |
| `enableOverlay` | `boolean` | `true` | Enable syntax/error overlay |
| `readonlyRenderer` | `'textarea' \| 'pre'` | `'textarea'` | How to render in readonly mode |
| `validate` | `function` | `null` | Validation function `(text) => diagnostics[]` |
| `diagnostics` | `array` | `null` | External diagnostics (push mode) |
| `syntaxToHtml` | `function` | `null` | Syntax highlighter `(text, lang) => html` |
| `onChange` | `function` | `null` | Change callback `(text, { diagnostics }) => void` |

## API Methods

```js
const pane = createCodePane({ ... });

// Get/set value
const code = pane.getValue();
pane.setValue('new code');

// Toggle readonly
pane.setReadonly(true);

// Push diagnostics externally
pane.setDiagnostics([{ lineNumber: 5, message: 'Error here' }]);

// Update hooks at runtime
pane.setHooks({
  validate: newValidator,
  syntaxToHtml: newHighlighter,
  onChange: newCallback
});

// Force refresh
pane.refresh();

// Cleanup
pane.destroy();
```

## Required CSS

Add this CSS to your page (customize as needed):

```css
.code-pane {
  position: relative;
  height: 100%;
  background: #fafafa;
}

.code-pane__lines {
  position: absolute;
  left: 0;
  top: 0;
  width: 40px;
  height: 100%;
  padding: 10px 5px;
  background-color: #f0f0f0;
  border-right: 1px solid #ccc;
  text-align: right;
  font-family: 'Courier New', Courier, monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #999;
  user-select: none;
  overflow: hidden;
  pointer-events: none;
  z-index: 2;
}

.code-pane__body {
  position: relative;
  height: 100%;
  overflow: hidden;
}

/* Textarea and highlight must share IDENTICAL styling */
.code-pane__editor,
.code-pane__highlight {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  margin: 0;
  padding: 10px;
  padding-left: 50px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 13px;
  line-height: 1.5;
  border: none;
  white-space: pre;
  word-wrap: break-word;
  box-sizing: border-box;
  overflow: hidden;
  width: 100%;
  height: 100%;
  tab-size: 4;
  -moz-tab-size: 4;
}

.code-pane__editor {
  background: transparent;
  color: transparent;
  caret-color: black;
  z-index: 1;
  resize: none;
  outline: none;
}

.code-pane__editor:hover,
.code-pane__editor:focus {
  overflow: auto;
}

.code-pane__viewer {
  color: transparent;
  background: transparent;
  cursor: default;
}

.code-pane__viewer:hover {
  overflow: auto;
}

.code-pane__highlight {
  z-index: 0;
  pointer-events: none;
  color: #333;
  background-color: transparent;
}

/* Error line backgrounds */
.code-pane__errline {
  display: block;
  width: 100%;
}

.code-pane__errline--on {
  background-color: #ffcccc;
}
```

## Adding Syntax Highlighting

### With Prism.js

```html
<link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js"></script>
```

```js
const syntaxToHtml = (text, lang) => {
  const grammar = Prism.languages[lang] || Prism.languages.javascript;
  return Prism.highlight(text, grammar, lang || 'javascript');
};

const pane = createCodePane({
  value: 'const x = 42;',
  language: 'javascript',
  syntaxToHtml
});
```

### With highlight.js

```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/default.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
```

```js
const syntaxToHtml = (text, lang) => {
  return hljs.highlight(text, { language: lang }).value;
};

const pane = createCodePane({
  value: 'const x = 42;',
  language: 'javascript',
  syntaxToHtml
});
```

### Prism Token Colors (optional)

If Prism colors don't show well on your background, add explicit overrides:

```css
.code-pane__highlight .token.comment { color: #708090; }
.code-pane__highlight .token.punctuation { color: #333; }
.code-pane__highlight .token.property,
.code-pane__highlight .token.tag,
.code-pane__highlight .token.boolean,
.code-pane__highlight .token.number,
.code-pane__highlight .token.constant,
.code-pane__highlight .token.symbol { color: #905; }
.code-pane__highlight .token.selector,
.code-pane__highlight .token.attr-name,
.code-pane__highlight .token.string,
.code-pane__highlight .token.char,
.code-pane__highlight .token.builtin { color: #690; }
.code-pane__highlight .token.operator,
.code-pane__highlight .token.entity,
.code-pane__highlight .token.url,
.code-pane__highlight .token.variable { color: #9a6e3a; }
.code-pane__highlight .token.atrule,
.code-pane__highlight .token.attr-value,
.code-pane__highlight .token.keyword { color: #07a; }
.code-pane__highlight .token.function,
.code-pane__highlight .token.class-name { color: #DD4A68; }
.code-pane__highlight .token.regex,
.code-pane__highlight .token.important { color: #e90; }
```

## Adding Code Validation

### Validation Function

The `validate` function receives the current text and returns an array of diagnostics:

```js
function validateJS(text) {
  const errors = [];
  const lines = text.split('\n');
  
  lines.forEach((line, i) => {
    const lineNum = i + 1;
    
    // Example: check for common typos
    if (line.includes('cosnt ')) {
      errors.push({ 
        lineNumber: lineNum, 
        message: "Typo: 'cosnt' should be 'const'" 
      });
    }
  });
  
  return errors;
}
```

### Using Validation with onChange

```js
const diagnosticsPanel = document.getElementById('diagnostics');

function updateDiagnostics(diagnostics) {
  if (diagnostics.length === 0) {
    diagnosticsPanel.innerHTML = '<span class="success">No errors</span>';
  } else {
    diagnosticsPanel.innerHTML = diagnostics
      .map(d => `<div class="error">Line ${d.lineNumber}: ${d.message}</div>`)
      .join('');
  }
}

const pane = createCodePane({
  value: initialCode,
  language: 'javascript',
  validate: validateJS,
  syntaxToHtml,
  onChange: (text, { diagnostics }) => {
    updateDiagnostics(diagnostics);
  }
});

// Initial validation display
updateDiagnostics(validateJS(initialCode));
```

### External Diagnostics (Push Mode)

If you validate externally (e.g., from a server or web worker), use `setDiagnostics`:

```js
const pane = createCodePane({
  value: initialCode,
  language: 'javascript',
  syntaxToHtml
});

// Later, push diagnostics from external source
async function validateExternally(code) {
  const response = await fetch('/api/validate', {
    method: 'POST',
    body: JSON.stringify({ code })
  });
  const { errors } = await response.json();
  pane.setDiagnostics(errors);
}
```

## Complete Example

See `index.html` for a full working example with:
- Two synchronized panes (editor + readonly preview)
- Prism.js syntax highlighting
- Simple JavaScript validation
- Diagnostics panel
- Readonly toggle

## Diagnostic Object Format

```ts
interface Diagnostic {
  lineNumber: number;  // 1-indexed line number
  message: string;     // Error message (for display)
}
```

## Known Limitations

- Readonly toggle may reset scroll position in some cases
- The validator runs synchronously; for heavy validation, consider debouncing or using a web worker
- Line-by-line syntax highlighting may break tokens that span multiple lines (e.g., multi-line strings)

## License

MIT
