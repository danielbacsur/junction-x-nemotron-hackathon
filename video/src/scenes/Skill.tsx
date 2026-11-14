import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { clamp, lerp, pop, ramp, rise } from '../anim';
import { Editor, SKILL } from '../components/Editor';
import { Check, Chip, Label, Pointer, Shell, Window } from '../components/ui';
import { C, mono } from '../theme';
import { said, scenes } from '../timeline';

export const SKILL_TYPE_FROM = 10;
export const SKILL_TYPE_TO = said('skill', "That's") - 4;
export const SKILL_SAVE = scenes.skill.lead + scenes.skill.voice + 10;

export const Skill = () => {
  const frame = useCurrentFrame();
  const { duration } = scenes.skill;
  const chars = Math.floor(
    interpolate(
      frame,
      [SKILL_TYPE_FROM, SKILL_TYPE_TO],
      [0, SKILL.length],
      clamp,
    ),
  );
  const saved = frame >= SKILL_SAVE;
  const flash = ramp(frame, SKILL_SAVE, 30);
  const toast = pop(frame, SKILL_SAVE + 4, 15, 160);
  return (
    <Shell duration={duration}>
      <AbsoluteFill style={{ perspective: 2400 }}>
        <div
          style={{
            position: 'absolute',
            left: 100,
            top: 190,
            transform: `rotateY(${lerp(ramp(frame, 0, 60), 11, 5)}deg) rotateX(2deg)`,
            transformOrigin: '0% 50%',
          }}
        >
          <Window
            title="skills/shoplifting.md"
            width={1060}
            height={640}
            right={
              <Chip size={17} color={C.muted}>
                Markdown
              </Chip>
            }
          >
            <Editor text={SKILL} chars={chars} />
            <div
              style={{
                position: 'absolute',
                right: 30,
                bottom: 28,
                height: 68,
                padding: '0 34px',
                borderRadius: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: 27,
                fontWeight: 600,
                color: C.ink,
                background: C.lime,
                boxShadow: `0 0 ${lerp(flash, 70, 24)}px rgba(213,245,164,${saved ? lerp(flash, 0.7, 0.25) : 0.22})`,
                transform: `scale(${saved ? lerp(ramp(frame, SKILL_SAVE, 14), 0.93, 1) : 1})`,
              }}
            >
              {saved ? <Check size={26} /> : null}
              {saved ? 'Saved' : 'Save skill'}
            </div>
          </Window>
        </div>
      </AbsoluteFill>

      <div style={{ position: 'absolute', left: 1250, top: 280, width: 600 }}>
        <Label color={C.green} style={rise(frame, 6, 24, 16)}>
          01 · Write a skill
        </Label>
        <div
          style={{
            fontSize: 84,
            fontWeight: 600,
            letterSpacing: -3.2,
            lineHeight: 1.03,
            marginTop: 26,
          }}
        >
          <div style={rise(frame, said('skill', 'Describe') - 4)}>
            Describe it
          </div>
          <div style={rise(frame, said('skill', 'plain') - 4)}>
            in plain <span style={{ color: C.lime }}>Markdown.</span>
          </div>
        </div>
        <div
          style={{
            fontSize: 40,
            color: C.soft,
            marginTop: 34,
            ...rise(frame, said('skill', 'step') - 4),
          }}
        >
          Step by step.
        </div>
        <div
          style={{
            marginTop: 46,
            opacity: Math.min(1, pop(frame, said('skill', "That's")) * 1.5),
            transform: `scale(${lerp(pop(frame, said('skill', "That's")), 0.8, 1)})`,
            transformOrigin: '0 50%',
          }}
        >
          <Chip size={26} filled>
            That&apos;s a skill.
          </Chip>
        </div>
      </div>

      {/* Saved toast */}
      <div
        style={{
          position: 'absolute',
          left: 1250,
          top: 800,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '20px 28px',
          borderRadius: 18,
          background: C.panel2,
          border: `1.5px solid ${C.lineStrong}`,
          fontSize: 27,
          opacity: Math.min(1, toast * 1.5),
          transform: `translateY(${lerp(toast, 40, 0)}px)`,
        }}
      >
        <span
          style={{
            width: 38,
            height: 38,
            borderRadius: 38,
            background: C.lime,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Check size={20} />
        </span>
        <span>
          <span style={{ fontFamily: mono, color: C.lime }}>
            shoplifting.md
          </span>{' '}
          is watching
        </span>
      </div>

      <Pointer
        path={[
          { frame: SKILL_SAVE - 56, x: 1320, y: 1010 },
          { frame: SKILL_SAVE - 6, x: 1020, y: 800 },
        ]}
        clickAt={SKILL_SAVE}
      />
    </Shell>
  );
};
