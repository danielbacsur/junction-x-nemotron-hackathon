import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { clamp, lerp, pop, ramp } from '../anim';
import { CamScene, CONCEAL, LEAVE } from '../components/CamScene';
import { Aperture, Chip, Dot, Label, Pointer, Shell } from '../components/ui';
import { C, mono } from '../theme';
import { said, scenes } from '../timeline';

export const ALERT_IN = said('alert', 'alert') - 14;
export const ALERT_PROOF = [
  said('alert', 'with'),
  said('alert', 'timestamped'),
];
export const ALERT_CLICK = said('alert', 'proof') + 52;

const Evidence = ({
  at,
  second,
  step,
  kind,
  open,
}: {
  at: number;
  second: number;
  step: string;
  kind: 'bag' | 'exit';
  open: boolean;
}) => {
  const frame = useCurrentFrame();
  const enter = pop(frame, at, 13, 190);
  return (
    <div
      style={{
        opacity: Math.min(1, enter * 1.6),
        transform: `translateY(${lerp(enter, 40, 0)}px) scale(${lerp(enter, 0.9, 1)})`,
      }}
    >
      <div
        style={{
          borderRadius: 14,
          outline: `3px solid ${open ? C.lime : 'transparent'}`,
          outlineOffset: 3,
        }}
      >
        <CamScene
          t={second + 0.25}
          width={392}
          overlay={false}
          radius={13}
          mark={{ kind, progress: 1 }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginTop: 18,
        }}
      >
        <Chip size={24} filled>
          00:{second}
        </Chip>
        <span style={{ fontFamily: mono, fontSize: 24, color: C.green }}>
          {step}
        </span>
        {open ? (
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: mono,
              fontSize: 20,
              color: C.lime,
            }}
          >
            ▶ playing
          </span>
        ) : null}
      </div>
    </div>
  );
};

export const Alert = () => {
  const frame = useCurrentFrame();
  const { duration } = scenes.alert;
  const card = pop(frame, ALERT_IN, 13, 150);
  const opened = frame >= ALERT_CLICK;
  const t = opened
    ? interpolate(
        frame,
        [ALERT_CLICK, ALERT_CLICK + 50],
        [CONCEAL - 0.9, CONCEAL + 0.3],
        clamp,
      )
    : interpolate(frame, [0, ALERT_IN + 10], [18.3, 19.7], clamp);
  const pulse = (1 - ramp(frame, ALERT_IN, 50)) * ramp(frame, ALERT_IN - 8, 8);
  const live = 0.5 + 0.5 * Math.sin(frame / 5);
  return (
    <Shell duration={duration}>
      <AbsoluteFill>
        <CamScene t={t} width={1920} radius={0} label="CAM 03 · AISLE 4" />
        <AbsoluteFill
          style={{
            background: `rgba(9,14,15,${lerp(ramp(frame, ALERT_IN - 10, 30), 0.25, opened ? 0.62 : 0.76)})`,
            backdropFilter: `blur(${lerp(ramp(frame, ALERT_IN - 10, 30), 0, 9)}px)`,
          }}
        />
        <AbsoluteFill
          style={{
            boxShadow: `inset 0 0 ${220 + pulse * 200}px rgba(255,106,61,${0.16 + pulse * 0.5})`,
          }}
        />
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            width: 920,
            borderRadius: 30,
            padding: '38px 42px 40px',
            background: 'rgba(17,25,27,0.94)',
            border: `2px solid rgba(255,106,61,0.55)`,
            boxShadow:
              '0 60px 160px rgba(0,0,0,0.7), 0 0 140px rgba(255,106,61,0.22)',
            opacity: Math.min(1, card * 1.6),
            transform: `translateY(${lerp(card, 90, 0)}px) scale(${lerp(card, 0.86, 1)})`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ opacity: 0.45 + live * 0.55, display: 'flex' }}>
              <Dot color={C.alert} size={14} />
            </span>
            <Label color={C.alert} size={22}>
              Alert
            </Label>
            <span
              style={{
                marginLeft: 'auto',
                fontFamily: mono,
                fontSize: 20,
                color: C.muted,
              }}
            >
              CAM 03 · AISLE 4 · just now
            </span>
          </div>
          <div
            style={{
              fontSize: 82,
              fontWeight: 600,
              letterSpacing: -3,
              marginTop: 20,
              lineHeight: 1,
            }}
          >
            Shoplifting
          </div>
          <div style={{ fontSize: 31, color: C.soft, marginTop: 16 }}>
            Both steps verified, in order.
          </div>
          <div style={{ display: 'flex', gap: 28, marginTop: 34 }}>
            <Evidence
              at={ALERT_PROOF[0]}
              second={CONCEAL}
              step="conceal"
              kind="bag"
              open={opened}
            />
            <Evidence
              at={ALERT_PROOF[1]}
              second={LEAVE}
              step="leave"
              kind="exit"
              open={false}
            />
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 30,
              paddingTop: 24,
              borderTop: `1.5px solid ${C.line}`,
              fontFamily: mono,
              fontSize: 20,
              color: C.muted,
            }}
          >
            <Aperture size={26} />
            skills/shoplifting.md
            <span style={{ marginLeft: 'auto' }}>Nemotron 3.5 Super VL</span>
          </div>
        </div>
      </AbsoluteFill>

      <Pointer
        path={[
          { frame: ALERT_CLICK - 46, x: 1560, y: 1010 },
          { frame: ALERT_CLICK - 5, x: 760, y: 610 },
        ]}
        clickAt={ALERT_CLICK}
      />
    </Shell>
  );
};
