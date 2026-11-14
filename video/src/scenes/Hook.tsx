import type { ReactNode } from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { clamp, lerp, pop, ramp, rise } from '../anim';
import { Aperture, Badge, Label, Shell } from '../components/ui';
import { C, mono } from '../theme';
import { said, scenes } from '../timeline';

const RULE = 'Alert me if someone steals.';
export const HOOK_TYPE_FROM = 12;
export const HOOK_TYPE_TO = said('hook', 'steals') + 26;

const Card = ({
  at,
  label,
  title,
  note,
  kind,
  badgeAt,
}: {
  at: number;
  label: string;
  title: string;
  note: ReactNode;
  kind: 'check' | 'cross';
  badgeAt: number;
}) => {
  const frame = useCurrentFrame();
  const enter = pop(frame, at, 16, 150);
  const tone = kind === 'check' ? C.lime : C.alert;
  return (
    <div
      style={{
        width: 590,
        height: 300,
        borderRadius: 26,
        padding: '34px 38px',
        background: C.panel,
        border: `1.5px solid ${frame >= badgeAt ? `${tone}66` : C.lineStrong}`,
        boxShadow: `0 40px 90px rgba(0,0,0,0.45)${frame >= badgeAt ? `, 0 0 80px ${tone}1f` : ''}`,
        opacity: Math.min(1, enter * 1.4),
        transform: `translateY(${lerp(enter, 60, 0)}px) scale(${lerp(enter, 0.94, 1)})`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Label>{label}</Label>
        <Badge kind={kind} at={badgeAt} />
      </div>
      <div
        style={{
          fontSize: 50,
          fontWeight: 600,
          letterSpacing: -1.6,
          lineHeight: 1.08,
          marginTop: 26,
        }}
      >
        {title}
      </div>
      <div style={{ marginTop: 'auto', fontSize: 25, color: C.muted }}>
        {note}
      </div>
    </div>
  );
};

export const Hook = () => {
  const frame = useCurrentFrame();
  const { duration } = scenes.hook;
  const typed = Math.floor(
    interpolate(frame, [HOOK_TYPE_FROM, HOOK_TYPE_TO], [0, RULE.length], clamp),
  );
  const person = said('hook', 'Obvious');
  const model = said('hook', 'But');
  const lift = ramp(frame, person - 14, 40);
  const caret = typed < RULE.length || Math.floor(frame / 16) % 2 === 0;
  return (
    <Shell duration={duration} enter={false}>
      <AbsoluteFill style={{ alignItems: 'center' }}>
        <div
          style={{
            marginTop: lerp(lift, 400, 196),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Label style={rise(frame, 0, 24, 14)}>
            The rule you actually want
          </Label>
          <div
            style={{
              marginTop: 30,
              width: 1220,
              height: 138,
              borderRadius: 34,
              background: C.panel,
              border: `1.5px solid ${C.lineStrong}`,
              boxShadow:
                '0 40px 100px rgba(0,0,0,0.5), 0 0 120px rgba(134,183,106,0.14)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 44px',
              gap: 28,
              opacity: ramp(frame, 0, 18),
              transform: `scale(${lerp(ramp(frame, 0, 26), 0.96, 1)})`,
            }}
          >
            <Aperture size={50} />
            <div style={{ fontSize: 62, fontWeight: 500, letterSpacing: -1.8 }}>
              {RULE.slice(0, typed)}
              <span
                style={{
                  display: 'inline-block',
                  width: 4,
                  height: 64,
                  marginLeft: 6,
                  background: C.lime,
                  verticalAlign: -12,
                  borderRadius: 2,
                  opacity: caret ? 1 : 0,
                }}
              />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 40, marginTop: 64 }}>
          <Card
            at={person - 6}
            label="For a person"
            title="Obvious."
            note="You know it when you see it."
            kind="check"
            badgeAt={said('hook', 'person') + 4}
          />
          <Card
            at={model - 6}
            label="For a model"
            title="No obvious way to train it."
            note={
              <span style={{ fontFamily: mono, fontSize: 23 }}>
                theft_dataset/ <span style={{ color: C.alert }}>0 clips</span>
              </span>
            }
            kind="cross"
            badgeAt={said('hook', 'train')}
          />
        </div>
      </AbsoluteFill>
    </Shell>
  );
};
