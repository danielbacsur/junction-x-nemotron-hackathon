import type { ReactNode } from 'react';
import { useCurrentFrame } from 'remotion';
import { C, mono } from '../theme';

export const SKILL = [
  '# Shoplifting',
  '',
  'Observe these actions in order.',
  '',
  '- conceal: An item goes into a bag or pocket.',
  '- leave: The person leaves without paying.',
].join('\n');

// Colours one Markdown line the way the skill editor reads: heading, step id, prose.
function paint(line: string, shown: number): ReactNode {
  const parts: { text: string; color: string; weight?: number }[] = [];
  const step = /^(- )([a-z-]+:)(.*)$/.exec(line);
  if (line.startsWith('#'))
    parts.push({ text: line, color: C.lime, weight: 500 });
  else if (step) {
    parts.push({ text: step[1], color: C.dim });
    parts.push({ text: step[2], color: C.green, weight: 500 });
    parts.push({ text: step[3], color: C.text });
  } else parts.push({ text: line, color: C.soft });
  let left = shown;
  return parts.map((part, i) => {
    const text = part.text.slice(0, Math.max(0, left));
    left -= part.text.length;
    return (
      <span
        key={i}
        style={{ color: part.color, fontWeight: part.weight ?? 400 }}
      >
        {text}
      </span>
    );
  });
}

export const Editor = ({
  text,
  chars,
  fontSize = 30,
  selection,
  caret,
}: {
  text: string;
  chars: number;
  fontSize?: number;
  selection?: { line: number; from: number; to: number };
  caret?: { line: number; col: number };
}) => {
  const frame = useCurrentFrame();
  const lines = text.split('\n');
  const lineHeight = fontSize * 1.75;
  const charWidth = fontSize * 0.6;
  let left = chars;
  let caretAt = caret ?? { line: 0, col: 0 };
  const rows = lines.map((line, i) => {
    const shown = Math.max(0, Math.min(line.length, left));
    if (!caret && left >= 0) caretAt = { line: i, col: shown };
    left -= line.length + 1;
    return { line, shown };
  });
  const blink = Math.floor(frame / 16) % 2 === 0 || chars < text.length;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        padding: '30px 0',
        fontFamily: mono,
        fontSize,
        lineHeight: `${lineHeight}px`,
        whiteSpace: 'pre',
      }}
    >
      {rows.map(({ line, shown }, i) => (
        <div
          key={i}
          style={{ display: 'flex', height: lineHeight, position: 'relative' }}
        >
          <span
            style={{
              width: 86,
              textAlign: 'right',
              paddingRight: 30,
              color: C.dim,
              flexShrink: 0,
              fontSize: fontSize * 0.8,
            }}
          >
            {i + 1}
          </span>
          <span style={{ position: 'relative' }}>
            {selection && selection.line === i ? (
              <span
                style={{
                  position: 'absolute',
                  left: selection.from * charWidth,
                  width: (selection.to - selection.from) * charWidth,
                  top: lineHeight * 0.14,
                  height: lineHeight * 0.74,
                  background: 'rgba(213,245,164,0.26)',
                  borderRadius: 5,
                }}
              />
            ) : null}
            <span style={{ position: 'relative' }}>{paint(line, shown)}</span>
            {caretAt.line === i && blink ? (
              <span
                style={{
                  position: 'absolute',
                  left: caretAt.col * charWidth,
                  top: lineHeight * 0.16,
                  width: 3,
                  height: lineHeight * 0.7,
                  background: C.lime,
                  borderRadius: 2,
                }}
              />
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
};
