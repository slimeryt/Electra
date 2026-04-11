import { useState } from 'react';

// ── Inline token types ────────────────────────────────────────────────────────
type InlineToken =
  | { t: 'text'; v: string }
  | { t: 'bold'; children: InlineToken[] }
  | { t: 'italic'; children: InlineToken[] }
  | { t: 'strike'; children: InlineToken[] }
  | { t: 'code'; v: string }
  | { t: 'spoiler'; children: InlineToken[] }
  | { t: 'url'; href: string; label: string };

const URL_RE = /https?:\/\/[^\s<>)"]+/g;

function parseInline(src: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let i = 0;
  while (i < src.length) {
    // Spoiler ||text||
    if (src[i] === '|' && src[i+1] === '|') {
      const end = src.indexOf('||', i + 2);
      if (end !== -1) { tokens.push({ t: 'spoiler', children: parseInline(src.slice(i+2, end)) }); i = end + 2; continue; }
    }
    // Bold **text** or __text__
    if ((src[i] === '*' && src[i+1] === '*') || (src[i] === '_' && src[i+1] === '_')) {
      const delim = src.slice(i, i+2);
      const end = src.indexOf(delim, i + 2);
      if (end !== -1) { tokens.push({ t: 'bold', children: parseInline(src.slice(i+2, end)) }); i = end + 2; continue; }
    }
    // Italic *text* or _text_
    if ((src[i] === '*' || src[i] === '_') && src[i+1] !== src[i]) {
      const delim = src[i];
      const end = src.indexOf(delim, i + 1);
      if (end !== -1 && src[end+1] !== delim) { tokens.push({ t: 'italic', children: parseInline(src.slice(i+1, end)) }); i = end + 1; continue; }
    }
    // Strikethrough ~~text~~
    if (src[i] === '~' && src[i+1] === '~') {
      const end = src.indexOf('~~', i + 2);
      if (end !== -1) { tokens.push({ t: 'strike', children: parseInline(src.slice(i+2, end)) }); i = end + 2; continue; }
    }
    // Inline code `code`
    if (src[i] === '`') {
      const end = src.indexOf('`', i + 1);
      if (end !== -1) { tokens.push({ t: 'code', v: src.slice(i+1, end) }); i = end + 1; continue; }
    }
    // URL
    if (src[i] === 'h' && src.slice(i, i+4) === 'http') {
      URL_RE.lastIndex = i;
      const m = URL_RE.exec(src);
      if (m && m.index === i) { tokens.push({ t: 'url', href: m[0], label: m[0] }); i += m[0].length; continue; }
    }
    // Text: accumulate until next special char
    const start = i;
    while (i < src.length && !'*_~`|h'.includes(src[i])) i++;
    if (i === start) i++; // avoid infinite loop on unmatched delimiters
    tokens.push({ t: 'text', v: src.slice(start, i) });
  }
  // Merge consecutive text tokens
  return tokens.reduce<InlineToken[]>((acc, tok) => {
    const last = acc[acc.length - 1];
    if (tok.t === 'text' && last?.t === 'text') { last.v += tok.v; return acc; }
    return [...acc, tok];
  }, []);
}

function renderInline(tokens: InlineToken[], key = 0): React.ReactNode[] {
  return tokens.map((tok, i) => {
    const k = `${key}-${i}`;
    switch (tok.t) {
      case 'text': return <span key={k}>{tok.v}</span>;
      case 'bold': return <strong key={k} style={{ fontWeight: 700 }}>{renderInline(tok.children, i)}</strong>;
      case 'italic': return <em key={k} style={{ fontStyle: 'italic' }}>{renderInline(tok.children, i)}</em>;
      case 'strike': return <s key={k}>{renderInline(tok.children, i)}</s>;
      case 'code': return (
        <code key={k} style={{
          background: 'var(--bg-overlay)', border: '1px solid var(--border)',
          borderRadius: 3, padding: '1px 5px', fontSize: '0.88em',
          fontFamily: '"Courier New", monospace', color: 'var(--text-primary)',
        }}>{tok.v}</code>
      );
      case 'spoiler': return <SpoilerSpan key={k}>{renderInline(tok.children, i)}</SpoilerSpan>;
      case 'url': return (
        <a key={k} href={tok.href} target="_blank" rel="noopener noreferrer"
          style={{ color: 'var(--accent)', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
          onClick={e => e.stopPropagation()}
        >{tok.label}</a>
      );
    }
  });
}

function SpoilerSpan({ children }: { children: React.ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span
      onClick={() => setRevealed(r => !r)}
      style={{
        background: revealed ? 'transparent' : 'var(--text-muted)',
        color: revealed ? 'inherit' : 'transparent',
        borderRadius: 3, padding: '0 3px', cursor: 'pointer',
        userSelect: revealed ? 'text' : 'none', transition: 'all 150ms',
      }}
    >{children}</span>
  );
}

// ── Block parsing ─────────────────────────────────────────────────────────────
type Block =
  | { t: 'codeblock'; lang: string; code: string }
  | { t: 'blockquote'; lines: string[] }
  | { t: 'para'; text: string };

function parseBlocks(src: string): Block[] {
  const lines = src.split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Code block ```lang\n...\n```
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++; }
      i++; // consume closing ```
      blocks.push({ t: 'codeblock', lang, code: codeLines.join('\n') });
      continue;
    }
    // Blockquote: consecutive > lines
    if (line.startsWith('> ') || line === '>') {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i].startsWith('> ') || lines[i] === '>')) {
        quoteLines.push(lines[i].replace(/^> ?/, ''));
        i++;
      }
      blocks.push({ t: 'blockquote', lines: quoteLines });
      continue;
    }
    // Paragraph: accumulate non-special lines
    const paraLines: string[] = [];
    while (i < lines.length && !lines[i].startsWith('```') && !lines[i].startsWith('> ')) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.some(l => l.trim())) blocks.push({ t: 'para', text: paraLines.join('\n') });
  }
  return blocks;
}

// ── Main component ────────────────────────────────────────────────────────────
interface MarkdownContentProps {
  content: string;
  style?: React.CSSProperties;
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{
      background: 'var(--bg-base)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)', overflow: 'hidden', margin: '4px 0',
    }}>
      {lang && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '4px 12px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg-overlay)',
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{lang}</span>
          <button
            onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, padding: '2px 6px', borderRadius: 4 }}
          >{copied ? '✓ Copied' : 'Copy'}</button>
        </div>
      )}
      <pre style={{
        margin: 0, padding: '10px 14px', overflowX: 'auto',
        fontFamily: '"Courier New", Courier, monospace', fontSize: 13,
        lineHeight: 1.5, color: 'var(--text-primary)',
        whiteSpace: 'pre',
      }}><code>{code}</code></pre>
    </div>
  );
}

export function MarkdownContent({ content, style }: MarkdownContentProps) {
  const blocks = parseBlocks(content);
  return (
    <div style={{ lineHeight: 1.5, ...style }}>
      {blocks.map((block, bi) => {
        switch (block.t) {
          case 'codeblock':
            return <CodeBlock key={bi} lang={block.lang} code={block.code} />;
          case 'blockquote':
            return (
              <div key={bi} style={{
                borderLeft: '3px solid var(--accent)', paddingLeft: 10, margin: '4px 0',
                color: 'var(--text-secondary)',
              }}>
                {block.lines.map((l, li) => (
                  <div key={li}>{renderInline(parseInline(l))}</div>
                ))}
              </div>
            );
          case 'para':
            return (
              <div key={bi} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {renderInline(parseInline(block.text))}
              </div>
            );
        }
      })}
    </div>
  );
}
