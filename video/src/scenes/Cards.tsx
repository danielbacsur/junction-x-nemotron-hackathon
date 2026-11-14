import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { lerp, ramp } from '../anim';
import { Aperture, Wordmark } from '../components/ui';
import { C, mono, sans } from '../theme';
import { said, scenes } from '../timeline';

export const CARD_STARTS = [
  0,
  said('cards', 'No', 1) - 5,
  said('cards', 'No', 2) - 5,
];

const CARDS = [
  {
    text: 'No dataset.',
    background: C.lime,
    color: C.ink,
    accent: C.greenDeep,
  },
  {
    text: 'No training.',
    background: C.light,
    color: C.ink,
    accent: C.greenDeep,
  },
  {
    text: 'No ML team.',
    background:
      'radial-gradient(1200px 800px at 50% 60%, #2d4a2b, #0d1a12 75%)',
    color: C.lime,
    accent: C.lime,
  },
];

const Card = ({ index }: { index: number }) => {
  const frame = useCurrentFrame();
  const card = CARDS[index];
  const punch = ramp(frame, 0, 20);
  return (
    <AbsoluteFill
      style={{
        background: card.background,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 46,
          left: 56,
          right: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: mono,
          fontSize: 20,
          letterSpacing: 2.6,
          color: card.accent,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Aperture size={26} color={card.accent} />
          <Wordmark size={26} color={card.color} dot={card.accent} />
        </span>
        <span>0{index + 1} / 03</span>
      </div>
      <div
        style={{
          fontFamily: sans,
          fontSize: 250,
          fontWeight: 600,
          letterSpacing: -12,
          color: card.color,
          transform: `scale(${lerp(punch, 1.22, 1)})`,
          filter: punch < 0.98 ? `blur(${(1 - punch) * 16}px)` : undefined,
          textShadow:
            index === 2 ? '0 0 120px rgba(213,245,164,0.4)' : undefined,
        }}
      >
        {card.text}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 52,
          left: 56,
          right: 56,
          height: 3,
          background: `${card.accent}33`,
        }}
      >
        <div
          style={{
            width: `${Math.min(100, (frame / 60) * 100)}%`,
            height: '100%',
            background: card.accent,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

export const Cards = () => {
  const { duration } = scenes.cards;
  return (
    <AbsoluteFill>
      {CARD_STARTS.map((from, i) => (
        <Sequence
          key={from}
          from={from}
          durationInFrames={(CARD_STARTS[i + 1] ?? duration) - from}
        >
          <Card index={i} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
