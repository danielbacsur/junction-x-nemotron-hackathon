import type { ReactNode } from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { between, clamp, inOut, lerp, pop, ramp } from '../anim';
import { CamScene } from '../components/CamScene';
import { Shell } from '../components/ui';
import { C, mono } from '../theme';
import { said, scenes } from '../timeline';

const TILES = [
  { label: 'CAM 01 · ENTRANCE', start: 2, speed: 1.4 },
  { label: 'CAM 02 · AISLE 4', start: 8.6, speed: 1 },
  { label: 'CAM 03 · AISLE 7', start: 15, speed: 1.3 },
  { label: 'CAM 04 · CHECKOUT', start: 5, speed: 1.2 },
  { label: 'CAM 05 · STOCK ROOM', start: 17, speed: 1.1 },
  { label: 'CAM 06 · EXIT', start: 0, speed: 1.5 },
];
const TILE = 548;
const GAP = 26;

const Headline = ({
  from,
  to,
  children,
}: {
  from: number;
  to: number;
  children: ReactNode;
}) => {
  const frame = useCurrentFrame();
  const visible = between(frame, from, to, 10);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 850,
        textAlign: 'center',
        fontSize: 76,
        fontWeight: 600,
        letterSpacing: -2.6,
        opacity: visible,
        transform: `translateY(${lerp(ramp(frame, from, 22), 26, 0)}px)`,
      }}
    >
      {children}
    </div>
  );
};

export const Problem = () => {
  const frame = useCurrentFrame();
  const { duration } = scenes.problem;
  const so = said('problem', 'So');
  const tape = said('problem', 'tape') - 10;
  const reviewed = said('problem', 'reviewed');
  const loss = said('problem', 'loss');
  const focus = ramp(frame, tape, 30, inOut);
  const rewind = interpolate(frame, [reviewed - 6, loss + 22], [20.6, 11.4], {
    ...clamp,
    easing: inOut,
  });
  const rewinding = frame > reviewed - 6 && frame < loss + 22;
  const stamp = pop(frame, loss + 14, 11, 220);
  const lift = ramp(frame, 8, 34, inOut) - ramp(frame, so - 16, 30, inOut);
  return (
    <Shell duration={duration}>
      {/* The camera wall */}
      <AbsoluteFill style={{ perspective: 2200, alignItems: 'center' }}>
        <div
          style={{
            marginTop: 104,
            width: TILE * 3 + GAP * 2,
            display: 'flex',
            flexWrap: 'wrap',
            gap: GAP,
            transform: `rotateX(${lerp(focus, 9, 14)}deg) scale(${lerp(ramp(frame, 0, duration, inOut), 0.98, 1.035) * lerp(focus, 1, 0.94)})`,
            transformOrigin: '50% 60%',
            opacity: lerp(focus, 1, 0.22),
            filter: focus > 0.02 ? `blur(${focus * 7}px)` : undefined,
          }}
        >
          {TILES.map((tile, i) => {
            const enter = pop(frame, 2 + i * 4, 16, 140);
            const t = (tile.start + (frame / 60) * tile.speed) % 21;
            return (
              <div
                key={tile.label}
                style={{
                  opacity: Math.min(1, enter * 1.5),
                  position: 'relative',
                  zIndex: i === 1 ? 2 : 1,
                  transform:
                    i === 1
                      ? `translateY(${lerp(enter, 50, 0) + lift * 150}px) scale(${lerp(enter, 0.92, 1) * lerp(lift, 1, 1.72)})`
                      : `translateY(${lerp(enter, 50, 0)}px) scale(${lerp(enter, 0.92, 1)})`,
                  filter:
                    i !== 1 && lift > 0.02
                      ? `brightness(${lerp(lift, 1, 0.45)})`
                      : undefined,
                  boxShadow:
                    i === 1
                      ? `0 ${lift * 50}px ${lift * 120}px rgba(0,0,0,${lift * 0.7})`
                      : undefined,
                  borderRadius: 16,
                }}
              >
                <CamScene
                  t={i === 1 ? Math.min(12.6, t) : t}
                  width={TILE}
                  label={tile.label}
                  boxes={
                    i === 1
                      ? {
                          person: ramp(frame, said('problem', 'No') + 2, 10),
                          bag: ramp(frame, said('problem', 'dataset') + 2, 10),
                          theft: ramp(frame, said('problem', 'theft') - 4, 12),
                        }
                      : undefined
                  }
                />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      {/* One tape, rewound after the fact */}
      {focus > 0 ? (
        <AbsoluteFill style={{ alignItems: 'center' }}>
          <div
            style={{
              marginTop: 150,
              position: 'relative',
              opacity: focus,
              transform: `scale(${lerp(focus, 0.82, 1)}) translateX(${rewinding ? Math.sin(frame * 2.3) * 3 : 0}px)`,
              boxShadow: '0 60px 140px rgba(0,0,0,0.6)',
              borderRadius: 20,
            }}
          >
            <CamScene
              t={rewind}
              width={1120}
              label="CAM 02 · AISLE 4"
              rec={false}
              radius={20}
            />
            {rewinding
              ? [0.18, 0.47, 0.72].map((y, i) => (
                  <div
                    key={y}
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: `${((y * 100 + frame * (3 + i)) % 100).toFixed(2)}%`,
                      height: 10 + i * 6,
                      background: 'rgba(255,255,255,0.09)',
                      filter: 'blur(1px)',
                    }}
                  />
                ))
              : null}
            <div
              style={{
                position: 'absolute',
                top: 26,
                right: 30,
                fontFamily: mono,
                fontSize: 26,
                letterSpacing: 3,
                color: C.amber,
                opacity: frame > reviewed - 6 ? 1 : 0,
              }}
            >
              ◀◀ REVIEW ×16
            </div>
            <div
              style={{
                position: 'absolute',
                right: 70,
                bottom: 80,
                padding: '10px 34px',
                border: `6px solid ${C.alert}`,
                borderRadius: 14,
                color: C.alert,
                fontSize: 92,
                fontWeight: 700,
                letterSpacing: 2,
                background: 'rgba(9,14,15,0.72)',
                opacity: Math.min(1, stamp * 2),
                transform: `rotate(-7deg) scale(${lerp(stamp, 2.2, 1)})`,
              }}
            >
              TOO LATE
            </div>
          </div>
        </AbsoluteFill>
      ) : null}

      <Headline from={scenes.problem.lead - 6} to={so}>
        No dataset defines <span style={{ color: C.alert }}>theft.</span>
      </Headline>
      <Headline from={so} to={tape}>
        So cameras just record.
      </Headline>
      <Headline from={tape} to={duration + 30}>
        The tape gets reviewed{' '}
        <span style={{ color: C.alert }}>after the loss.</span>
      </Headline>
    </Shell>
  );
};
