import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { inOut, lerp, pop, ramp, rise } from '../anim';
import { Aperture, Wordmark } from '../components/ui';
import { C, mono, sans } from '../theme';
import { said, scenes } from '../timeline';

export const END_CTA = scenes.end.lead + scenes.end.voice + 8;

export const End = () => {
  const frame = useCurrentFrame();
  const describe = said('end', 'If') - 4;
  const watch = said('end', 'Lookout') - 4;
  const underline = ramp(frame, said('end', 'watch'), 34, inOut);
  const logo = pop(frame, 4, 13, 150);
  const glow = ramp(frame, 0, 120);
  const cta = pop(frame, END_CTA, 14, 170);
  return (
    <AbsoluteFill
      style={{
        background: C.light,
        fontFamily: sans,
        color: C.ink,
        alignItems: 'center',
      }}
    >
      {/* Soft colour rising from the floor */}
      {[
        { left: 360, color: 'rgba(213,245,164,0.95)', size: 780 },
        { left: 860, color: 'rgba(134,183,106,0.6)', size: 640 },
        { left: 1220, color: 'rgba(255,214,150,0.55)', size: 560 },
      ].map((blob, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: blob.left,
            top: lerp(glow, 1100, 760 + i * 40) + Math.sin(frame / 50 + i) * 16,
            width: blob.size,
            height: blob.size * 0.7,
            borderRadius: '50%',
            background: blob.color,
            filter: 'blur(110px)',
            transform: 'translateX(-50%)',
          }}
        />
      ))}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          marginTop: 250,
          opacity: Math.min(1, logo * 1.5),
          transform: `scale(${lerp(logo, 0.7, 1)})`,
        }}
      >
        <Aperture
          size={104}
          color="#608348"
          stroke={2.1}
          style={{
            transform: `rotate(${lerp(ramp(frame, 4, 80), -120, 0)}deg)`,
          }}
        />
        <Wordmark size={132} color={C.ink} dot="#719857" />
      </div>

      <div
        style={{
          fontSize: 68,
          fontWeight: 500,
          letterSpacing: -2.2,
          marginTop: 70,
          display: 'flex',
          gap: 18,
        }}
      >
        <span style={rise(frame, describe, 26, 26)}>
          If you can describe it,
        </span>
        <span style={{ ...rise(frame, watch, 26, 26), position: 'relative' }}>
          Lookout can{' '}
          <span style={{ color: C.greenDeep, fontWeight: 600 }}>
            watch for it.
          </span>
          <span
            style={{
              position: 'absolute',
              right: 0,
              bottom: -10,
              height: 6,
              width: 372 * underline,
              marginRight: 372 * (1 - underline),
              borderRadius: 6,
              background: '#719857',
            }}
          />
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 18,
          marginTop: 76,
          opacity: Math.min(1, cta * 1.5),
          transform: `translateY(${lerp(cta, 30, 0)}px)`,
        }}
      >
        <div
          style={{
            height: 78,
            padding: '0 38px',
            borderRadius: 18,
            background: C.ink,
            color: '#fff',
            fontSize: 30,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            boxShadow: '0 20px 50px rgba(24,33,38,0.28)',
          }}
        >
          Try the live demo <span style={{ fontSize: 34 }}>→</span>
        </div>
        <div
          style={{
            height: 78,
            padding: '0 32px',
            borderRadius: 18,
            background: '#fff',
            border: '1.5px solid #e5e8eb',
            fontFamily: mono,
            fontSize: 26,
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0 20px 50px rgba(24,33,38,0.08)',
          }}
        >
          nemotron.danielbacsur.dev
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 60,
          fontFamily: mono,
          fontSize: 19,
          letterSpacing: 2.8,
          color: '#5f6b63',
          ...rise(frame, END_CTA + 16, 30, 12),
        }}
      >
        BUILT WITH NVIDIA NEMOTRON 3.5 SUPER VL · JUNCTION 2026
      </div>
    </AbsoluteFill>
  );
};
