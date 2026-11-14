import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { lerp, pop, rise } from '../anim';
import { Chip, Dot, Shell } from '../components/ui';
import { C, mono } from '../theme';
import { said, scenes } from '../timeline';

const stroke = {
  fill: 'none',
  stroke: C.lime,
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;
const USES = [
  {
    title: 'Loss prevention',
    file: 'shoplifting.md',
    rule: 'An item goes into a bag or pocket, then the person leaves without paying.',
    at: said('business', 'Loss'),
    icon: (
      <>
        <path d="M6 8h12l1.2 12H4.8L6 8z" {...stroke} />
        <path d="M9 8V6.5a3 3 0 0 1 6 0V8" {...stroke} />
      </>
    ),
  },
  {
    title: 'Packing accuracy',
    file: 'packing.md',
    rule: 'The box is sealed before every item on the order is inside.',
    at: said('business', 'Packing'),
    icon: (
      <>
        <path d="M3.5 8 12 3.5 20.5 8v8L12 20.5 3.5 16V8z" {...stroke} />
        <path d="M3.5 8 12 12.5 20.5 8M12 12.5v8" {...stroke} />
      </>
    ),
  },
  {
    title: 'Safety procedures',
    file: 'machine-guard.md',
    rule: 'The machine is started while the safety guard is off.',
    at: said('business', 'Safety'),
    icon: (
      <>
        <path
          d="M12 3.5 19 6v6c0 4.2-3 7.2-7 8.5-4-1.3-7-4.3-7-8.5V6l7-2.5z"
          {...stroke}
        />
        <path d="m9 12 2.2 2.2L15.2 10" {...stroke} />
      </>
    ),
  },
];
export const BUSINESS_CARDS = USES.map((use) => use.at - 6);

export const Business = () => {
  const frame = useCurrentFrame();
  const { duration } = scenes.business;
  const people = said('business', 'The') - 6;
  const write = said('business', 'write') - 4;
  return (
    <Shell duration={duration}>
      <AbsoluteFill style={{ alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 34, marginTop: 130 }}>
          {USES.map((use, i) => {
            const enter = pop(frame, BUSINESS_CARDS[i], 14, 150);
            return (
              <div
                key={use.file}
                style={{
                  width: 552,
                  height: 470,
                  borderRadius: 28,
                  padding: 38,
                  background: C.panel,
                  border: `1.5px solid ${C.lineStrong}`,
                  boxShadow: '0 50px 120px rgba(0,0,0,0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  opacity: Math.min(1, enter * 1.5),
                  transform: `translateY(${lerp(enter, 80, 0)}px) scale(${lerp(enter, 0.92, 1)})`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div
                    style={{
                      width: 84,
                      height: 84,
                      borderRadius: 22,
                      background: 'rgba(213,245,164,0.1)',
                      border: `1.5px solid rgba(213,245,164,0.3)`,
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <svg width="46" height="46" viewBox="0 0 24 24">
                      {use.icon}
                    </svg>
                  </div>
                  <Chip size={18} color={C.lime}>
                    <Dot color={C.lime} size={9} />
                    watching
                  </Chip>
                </div>
                <div
                  style={{
                    fontSize: 54,
                    fontWeight: 600,
                    letterSpacing: -2,
                    marginTop: 34,
                  }}
                >
                  {use.title}
                </div>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 22,
                    color: C.green,
                    marginTop: 12,
                  }}
                >
                  skills/{use.file}
                </div>
                <div
                  style={{
                    fontSize: 28,
                    lineHeight: 1.35,
                    color: C.soft,
                    marginTop: 'auto',
                    fontStyle: 'italic',
                  }}
                >
                  &ldquo;{use.rule}&rdquo;
                </div>
              </div>
            );
          })}
        </div>
        <div
          style={{
            fontSize: 82,
            fontWeight: 600,
            letterSpacing: -3.2,
            marginTop: 92,
            display: 'flex',
            gap: 22,
          }}
        >
          <span style={rise(frame, people, 26, 30)}>
            The people who know the rule
          </span>
          <span style={{ ...rise(frame, write, 26, 30), color: C.lime }}>
            write the monitor.
          </span>
        </div>
      </AbsoluteFill>
    </Shell>
  );
};
