import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { clamp, inOut, lerp, pop, ramp, rise, timecode } from '../anim';
import { CamScene } from '../components/CamScene';
import { Aperture, Check, Chip, Dot, Label, Shell } from '../components/ui';
import { C, mono } from '../theme';
import { said, scenes } from '../timeline';

const READ_END = said('watch', 'judges');
const WALK_END = said('watch', 'order') + 16;
const CLOSER = said('watch', 'takes');
export const WATCH_UNCLEAR = said('watch', 'every') + 4;
export const WATCH_LEAVE =
  READ_END + Math.round(((19.2 - 12.6) / 8) * (WALK_END - READ_END));
export const WATCH_CLOSER = CLOSER;
export const WATCH_VERIFIED = said('watch', 'unclear') + 22;
const STRIP = Array.from({ length: 10 }, (_, i) => (i + 1) * 2);

// When the fast-forwarding footage reaches a given second.
const reaches = (second: number) =>
  second <= 12.6
    ? Math.max(0, ((second - 3) / 9.6) * READ_END)
    : READ_END + ((second - 12.6) / 8) * (WALK_END - READ_END);
export const WATCH_THUMBS = STRIP.map((second) => Math.round(reaches(second)));

type Status = 'watching' | 'unclear' | 'verified';
const tone = { watching: C.muted, unclear: C.amber, verified: C.lime };

const Step = ({
  id,
  text,
  status,
  since,
  evidence,
  at,
}: {
  id: string;
  text: string;
  status: Status;
  since: number;
  evidence: string;
  at: number;
}) => {
  const frame = useCurrentFrame();
  const bump = pop(frame, since, 12, 200);
  const color = tone[status];
  return (
    <div
      style={{
        padding: '26px 28px',
        borderRadius: 20,
        background: status === 'verified' ? 'rgba(213,245,164,0.07)' : C.panel2,
        border: `1.5px solid ${status === 'watching' ? C.line : `${color}77`}`,
        ...rise(frame, at, 24, 24),
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontFamily: mono,
            fontSize: 25,
            color: C.green,
            fontWeight: 500,
          }}
        >
          {id}
        </span>
        <div
          style={{
            transform: `scale(${status === 'watching' ? 1 : lerp(bump, 0.7, 1)})`,
            transformOrigin: '100% 50%',
          }}
        >
          <Chip size={19} color={color} filled={status === 'verified'}>
            {status === 'verified' ? (
              <Check size={18} />
            ) : (
              <Dot color={color} size={9} />
            )}
            {status}
          </Chip>
        </div>
      </div>
      <div style={{ fontSize: 30, marginTop: 14, lineHeight: 1.25 }}>
        {text}
      </div>
      <div
        style={{
          fontFamily: mono,
          fontSize: 20,
          color: status === 'verified' ? C.lime : C.dim,
          marginTop: 14,
        }}
      >
        {status === 'verified'
          ? evidence
          : status === 'unclear'
            ? 'evidence too thin'
            : 'no evidence yet'}
      </div>
    </div>
  );
};

export const Watch = () => {
  const frame = useCurrentFrame();
  const { duration } = scenes.watch;
  const closer = frame >= CLOSER;
  const t = closer
    ? interpolate(frame, [CLOSER + 10, WATCH_VERIFIED - 6], [10.4, 12.7], clamp)
    : frame < READ_END
      ? interpolate(frame, [0, READ_END], [3, 12.6], clamp)
      : interpolate(frame, [READ_END, WALK_END], [12.6, 20.6], clamp);
  const zoom =
    ramp(frame, CLOSER, 34, inOut) -
    ramp(frame, WATCH_VERIFIED + 34, 30, inOut);
  const conceal: Status =
    frame >= WATCH_VERIFIED
      ? 'verified'
      : frame >= WATCH_UNCLEAR
        ? 'unclear'
        : 'watching';
  const leave: Status = frame >= WATCH_LEAVE ? 'verified' : 'watching';
  const ordered = frame >= WATCH_VERIFIED + 16;
  const done = pop(frame, WATCH_VERIFIED + 30, 13, 180);
  return (
    <Shell duration={duration}>
      {/* Camera */}
      <div style={{ position: 'absolute', left: 80, top: 104 }}>
        <div
          style={{
            width: 1120,
            height: 630,
            borderRadius: 20,
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 50px 120px rgba(0,0,0,0.5)',
          }}
        >
          <div
            style={{
              transform: `scale(${1 + zoom * 1.25})`,
              transformOrigin: '60.5% 64%',
            }}
          >
            <CamScene
              t={t}
              width={1120}
              radius={20}
              mark={
                frame >= WATCH_VERIFIED
                  ? { kind: 'bag', progress: ramp(frame, WATCH_VERIFIED, 24) }
                  : undefined
              }
            />
          </div>
          <div
            style={{
              position: 'absolute',
              left: 26,
              bottom: 24,
              opacity:
                ramp(frame, CLOSER + 8, 14) *
                (1 - ramp(frame, WATCH_VERIFIED + 40, 20)),
            }}
          >
            <Chip
              size={22}
              color={frame >= WATCH_VERIFIED ? C.lime : C.amber}
              filled
            >
              {frame >= WATCH_VERIFIED
                ? 'Verified at 00:12'
                : 'Closer look · 00:11 to 00:13 · 8 frames'}
            </Chip>
          </div>
        </div>

        {/* Filmstrip */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            marginTop: 26,
            position: 'relative',
          }}
        >
          {STRIP.map((second, i) => {
            const at = WATCH_THUMBS[i];
            const enter = pop(frame, at, 14, 200);
            const reading = frame >= at && frame < at + 22;
            const dense =
              closer && (second === 10 || second === 12 || second === 14);
            return (
              <div
                key={second}
                style={{
                  opacity: Math.min(1, enter * 1.6),
                  transform: `translateY(${lerp(enter, 18, 0)}px)`,
                }}
              >
                <div
                  style={{
                    borderRadius: 8,
                    outline: `2.5px solid ${reading ? C.lime : dense ? C.amber : 'transparent'}`,
                    outlineOffset: 2,
                  }}
                >
                  <CamScene t={second} width={103} overlay={false} radius={7} />
                </div>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 17,
                    color: dense ? C.amber : C.muted,
                    marginTop: 10,
                    textAlign: 'center',
                  }}
                >
                  {timecode(second)}
                </div>
              </div>
            );
          })}
          {/* Denser sampling between 00:11 and 00:13 */}
          {closer
            ? Array.from({ length: 8 }, (_, i) => {
                const enter = pop(frame, CLOSER + 14 + i * 4, 12, 240);
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: 470 + i * 24.5,
                      top: -16,
                      width: 5,
                      height: 12,
                      borderRadius: 3,
                      background: C.amber,
                      transform: `scaleY(${enter})`,
                      transformOrigin: '50% 100%',
                    }}
                  />
                );
              })
            : null}
        </div>
      </div>

      {/* The agent's judgement */}
      <div
        style={{
          position: 'absolute',
          left: 1240,
          top: 104,
          width: 600,
          height: 800,
          borderRadius: 24,
          background: C.panel,
          border: `1.5px solid ${C.lineStrong}`,
          boxShadow: '0 50px 120px rgba(0,0,0,0.5)',
          padding: 30,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          ...rise(frame, 4, 30, 30),
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Aperture size={34} />
          <span style={{ fontFamily: mono, fontSize: 25 }}>shoplifting.md</span>
        </div>
        <Chip size={19} color={C.lime} style={{ alignSelf: 'flex-start' }}>
          <Dot color={C.lime} size={9} />
          NVIDIA Nemotron 3.5 Super VL
        </Chip>
        <Label size={16} style={{ marginTop: 8 }}>
          Steps
        </Label>
        <Step
          id="conceal"
          text="An item goes into a bag or pocket."
          status={conceal}
          since={frame >= WATCH_VERIFIED ? WATCH_VERIFIED : WATCH_UNCLEAR}
          evidence="00:12 · frames f11, f12"
          at={10}
        />
        <Step
          id="leave"
          text="The person leaves without paying."
          status={leave}
          since={WATCH_LEAVE}
          evidence="00:19 · frames f18, f19"
          at={18}
        />
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderRadius: 18,
            border: `1.5px solid ${ordered ? `${C.lime}77` : C.line}`,
            background: ordered ? 'rgba(213,245,164,0.07)' : 'transparent',
            fontFamily: mono,
            fontSize: 22,
            ...rise(frame, 26, 24, 24),
          }}
        >
          <span style={{ color: C.soft }}>
            order: conceal <span style={{ color: C.dim }}>→</span> leave
          </span>
          <span
            style={{
              color: ordered ? C.lime : C.dim,
              transform: `scale(${ordered ? lerp(done, 0.8, 1) : 1})`,
            }}
          >
            {ordered ? '✓ in order' : 'pending'}
          </span>
        </div>
      </div>

      <AbsoluteFill style={{ top: 932, height: 100, alignItems: 'center' }}>
        <Label size={21} color={C.soft} style={rise(frame, 8, 26, 16)}>
          02 · Nemotron watches
        </Label>
      </AbsoluteFill>
    </Shell>
  );
};
