import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Easing, useCurrentFrame } from 'remotion';
import { lerp, pop, ramp } from '../anim';
import { C, mono, sans } from '../theme';

// The app's mark: lucide's "aperture" icon next to a lowercase wordmark.
export const Aperture = ({
  size,
  color = C.green,
  stroke = 2,
  style,
}: {
  size: number;
  color?: string;
  stroke?: number;
  style?: CSSProperties;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="m14.31 8 5.74 9.94" />
    <path d="M9.69 8h11.48" />
    <path d="m7.38 12 5.74-9.94" />
    <path d="M9.69 16 3.95 6.06" />
    <path d="M14.31 16H2.83" />
    <path d="m16.62 12-5.74 9.94" />
  </svg>
);

export const Wordmark = ({
  size,
  color = C.text,
  dot = C.green,
}: {
  size: number;
  color?: string;
  dot?: string;
}) => (
  <span
    style={{
      fontFamily: sans,
      fontSize: size,
      fontWeight: 600,
      letterSpacing: -size * 0.052,
      color,
      lineHeight: 1,
    }}
  >
    lookout<span style={{ color: dot }}>.</span>
  </span>
);

// The dark stage every scene sits on: dot grid, vignette and a green floor glow.
export const Backdrop = () => {
  const frame = useCurrentFrame();
  const drift = (frame / 60) * 6;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.13) 1.3px, transparent 1.3px)',
          backgroundSize: '48px 48px',
          backgroundPosition: `${drift}px ${drift * 0.6}px`,
          maskImage:
            'radial-gradient(ellipse 75% 70% at 50% 45%, black 20%, transparent 78%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 75% 70% at 50% 45%, black 20%, transparent 78%)',
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(1100px 560px at 50% 112%, rgba(134,183,106,0.22), transparent 70%)',
        }}
      />
    </AbsoluteFill>
  );
};

// Fades a scene in at its start and out at its end.
export const Shell = ({
  duration,
  children,
  exit = true,
  enter = true,
}: {
  duration: number;
  children: ReactNode;
  exit?: boolean;
  enter?: boolean;
}) => {
  const frame = useCurrentFrame();
  const a = enter ? ramp(frame, 0, 18) : 1;
  const b = exit ? ramp(frame, duration - 12, 12, Easing.in(Easing.cubic)) : 0;
  const blur = (1 - a) * 14 + b * 10;
  return (
    <AbsoluteFill
      style={{
        opacity: a * (1 - b),
        transform: `scale(${lerp(a, 1.05, 1) * lerp(b, 1, 0.975)})`,
        filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
        fontFamily: sans,
        color: C.text,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const Label = ({
  children,
  color = C.muted,
  size = 19,
  style,
}: {
  children: ReactNode;
  color?: string;
  size?: number;
  style?: CSSProperties;
}) => (
  <div
    style={{
      fontFamily: mono,
      fontSize: size,
      letterSpacing: size * 0.14,
      textTransform: 'uppercase',
      color,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Chip = ({
  children,
  color = C.lime,
  filled = false,
  size = 20,
  style,
}: {
  children: ReactNode;
  color?: string;
  filled?: boolean;
  size?: number;
  style?: CSSProperties;
}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: size * 0.45,
      fontFamily: mono,
      fontSize: size,
      fontWeight: 500,
      padding: `${size * 0.4}px ${size * 0.75}px`,
      borderRadius: 999,
      color: filled ? C.ink : color,
      background: filled ? color : `${color}1c`,
      border: `1.5px solid ${filled ? color : `${color}55`}`,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </div>
);

export const Dot = ({ color, size = 10 }: { color: string; size?: number }) => (
  <span
    style={{
      width: size,
      height: size,
      borderRadius: size,
      background: color,
      boxShadow: `0 0 ${size * 1.4}px ${color}`,
      display: 'inline-block',
      flexShrink: 0,
    }}
  />
);

export const Check = ({
  size = 22,
  color = C.ink,
}: {
  size?: number;
  color?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={3.2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const Cross = ({
  size = 22,
  color = C.ink,
}: {
  size?: number;
  color?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={3.2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

// A round badge that pops in with a check or a cross.
export const Badge = ({
  kind,
  at,
  size = 54,
}: {
  kind: 'check' | 'cross';
  at: number;
  size?: number;
}) => {
  const frame = useCurrentFrame();
  const scale = pop(frame, at);
  const color = kind === 'check' ? C.lime : C.alert;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size,
        background: color,
        display: 'grid',
        placeItems: 'center',
        transform: `scale(${scale})`,
        boxShadow: `0 0 ${size * 0.7}px ${color}66`,
        flexShrink: 0,
      }}
    >
      {kind === 'check' ? (
        <Check size={size * 0.5} />
      ) : (
        <Cross size={size * 0.48} />
      )}
    </div>
  );
};

// App window chrome.
export const Window = ({
  title,
  width,
  height,
  children,
  right,
  style,
}: {
  title: ReactNode;
  width: number;
  height: number;
  children: ReactNode;
  right?: ReactNode;
  style?: CSSProperties;
}) => (
  <div
    style={{
      width,
      height,
      borderRadius: 22,
      background: C.panel,
      border: `1.5px solid ${C.lineStrong}`,
      boxShadow:
        '0 50px 120px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      ...style,
    }}
  >
    <div
      style={{
        height: 58,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 22px',
        borderBottom: `1.5px solid ${C.line}`,
        background: 'rgba(255,255,255,0.025)',
      }}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 13,
            height: 13,
            borderRadius: 13,
            background: 'rgba(255,255,255,0.16)',
          }}
        />
      ))}
      <div
        style={{
          fontFamily: mono,
          fontSize: 19,
          color: C.muted,
          marginLeft: 14,
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {right}
      </div>
    </div>
    <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
      {children}
    </div>
  </div>
);

// A mouse pointer that glides between points and shows a ring when it clicks.
export const Pointer = ({
  path,
  clickAt,
}: {
  path: { frame: number; x: number; y: number }[];
  clickAt?: number;
}) => {
  const frame = useCurrentFrame();
  let x = path[0].x;
  let y = path[0].y;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    if (frame >= a.frame) {
      const progress = ramp(
        frame,
        a.frame,
        b.frame - a.frame,
        Easing.bezier(0.5, 0, 0.1, 1),
      );
      x = lerp(progress, a.x, b.x);
      y = lerp(progress, a.y, b.y);
    }
  }
  const visible = ramp(frame, path[0].frame, 10);
  const press =
    clickAt === undefined
      ? 0
      : ramp(frame, clickAt - 4, 4) - ramp(frame, clickAt, 8);
  const ring = clickAt === undefined ? 0 : ramp(frame, clickAt, 26);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        opacity: visible,
        zIndex: 50,
      }}
    >
      {clickAt !== undefined && frame >= clickAt && ring < 1 && (
        <div
          style={{
            position: 'absolute',
            left: -40,
            top: -40,
            width: 80,
            height: 80,
            borderRadius: 80,
            border: `3px solid ${C.lime}`,
            opacity: 1 - ring,
            transform: `scale(${lerp(ring, 0.3, 1.5)})`,
          }}
        />
      )}
      <svg
        width="46"
        height="46"
        viewBox="0 0 24 24"
        style={{
          transform: `translate(-6px, -4px) scale(${1 - press * 0.16})`,
          transformOrigin: '6px 4px',
          filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.5))',
        }}
      >
        <path
          d="M5 3l14 7.5-6.2 1.6L10.6 19 5 3z"
          fill="#fff"
          stroke="#0b1012"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
