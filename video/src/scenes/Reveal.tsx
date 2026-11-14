import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { lerp, pop, ramp, rise } from '../anim';
import { Aperture, Label, Shell } from '../components/ui';
import { C, sans } from '../theme';
import { said, scenes } from '../timeline';

export const Reveal = () => {
  const frame = useCurrentFrame();
  const { duration } = scenes.reveal;
  const name = said('reveal', 'Lookout') - 6;
  const icon = pop(frame, 4, 12, 150);
  const harness = said('reveal', 'A') - 4;
  const nemotron = said('reveal', 'NVIDIA') - 4;
  return (
    <Shell duration={duration}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        {/* Rings */}
        {[0, 1, 2, 3].map((i) => {
          const progress = ramp(frame, 2 + i * 9, 150);
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: 360,
                height: 360,
                borderRadius: 2000,
                border: `2px solid ${C.lime}`,
                opacity: (1 - progress) * 0.5,
                transform: `scale(${lerp(progress, 0.3, 5.4 - i * 0.5)})`,
              }}
            />
          );
        })}
        <div
          style={{
            position: 'absolute',
            width: 1300,
            height: 700,
            background:
              'radial-gradient(closest-side, rgba(213,245,164,0.2), transparent)',
            opacity: ramp(frame, 0, 30),
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 34,
            marginTop: -70,
          }}
        >
          <Aperture
            size={176}
            color={C.lime}
            stroke={1.9}
            style={{
              transform: `scale(${icon}) rotate(${lerp(ramp(frame, 4, 70), -160, 0)}deg)`,
              filter: 'drop-shadow(0 0 40px rgba(213,245,164,0.45))',
            }}
          />
          <div
            style={{
              display: 'flex',
              fontFamily: sans,
              fontSize: 236,
              fontWeight: 600,
              letterSpacing: -12,
              lineHeight: 1,
            }}
          >
            {'lookout.'.split('').map((letter, i) => {
              const progress = ramp(frame, name + i * 3, 30);
              return (
                <span
                  key={i}
                  style={{
                    display: 'inline-block',
                    color: letter === '.' ? C.lime : C.text,
                    opacity: progress,
                    transform: `translateY(${lerp(progress, 90, 0)}px)`,
                    filter:
                      progress < 0.98
                        ? `blur(${(1 - progress) * 14}px)`
                        : undefined,
                  }}
                >
                  {letter}
                </span>
              );
            })}
          </div>
        </div>
        <div
          style={{
            fontSize: 60,
            fontWeight: 500,
            letterSpacing: -1.6,
            marginTop: 52,
            display: 'flex',
            gap: 16,
          }}
        >
          <span style={{ ...rise(frame, harness, 26, 26), color: C.soft }}>
            A visual harness for
          </span>
          <span
            style={{
              ...rise(frame, nemotron, 26, 26),
              color: C.lime,
              fontWeight: 600,
            }}
          >
            NVIDIA Nemotron
          </span>
        </div>
        <Label
          style={{
            position: 'absolute',
            bottom: 86,
            ...rise(frame, nemotron + 30, 30, 16),
          }}
        >
          Powered by NVIDIA Nemotron 3.5 Super VL
        </Label>
      </AbsoluteFill>
    </Shell>
  );
};
