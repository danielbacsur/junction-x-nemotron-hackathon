import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { clamp, lerp, pop, ramp, rise } from '../anim';
import { Editor, SKILL } from '../components/Editor';
import { Check, Chip, Dot, Label, Shell, Window } from '../components/ui';
import { C, mono } from '../theme';
import { said, scenes } from '../timeline';

const LINES = SKILL.split('\n');
const LAST = LINES.length - 1;
const OLD = 'leaves without paying.';
const NEW = 'skips the checkout.';
const COL = LINES[LAST].indexOf(OLD);

export const EDIT_SELECT = 8;
export const EDIT_TYPE_FROM = said('edit', 'sentence') - 6;
export const EDIT_TYPE_TO = said('edit', 'monitor') + 6;
export const EDIT_UPDATED = said('edit', 'changes') + 4;

export const Edit = () => {
  const frame = useCurrentFrame();
  const { duration } = scenes.edit;
  const typing = frame >= EDIT_TYPE_FROM;
  const typed = Math.floor(
    interpolate(frame, [EDIT_TYPE_FROM, EDIT_TYPE_TO], [0, NEW.length], clamp),
  );
  const selected = Math.round(ramp(frame, EDIT_SELECT, 16) * OLD.length);
  const line = typing
    ? LINES[LAST].slice(0, COL) + NEW.slice(0, typed)
    : LINES[LAST];
  const text = [...LINES.slice(0, LAST), line].join('\n');
  const updated = frame >= EDIT_UPDATED;
  const bump = pop(frame, EDIT_UPDATED, 12, 190);
  return (
    <Shell duration={duration}>
      <AbsoluteFill style={{ perspective: 2400 }}>
        <div
          style={{
            position: 'absolute',
            left: 90,
            top: 250,
            transform: 'rotateY(5deg) rotateX(2deg)',
            transformOrigin: '0% 50%',
          }}
        >
          <Window
            title="skills/shoplifting.md"
            width={1010}
            height={560}
            right={
              <Chip size={17} color={C.amber}>
                editing
              </Chip>
            }
          >
            <Editor
              text={text}
              chars={text.length}
              fontSize={28}
              selection={
                typing
                  ? undefined
                  : {
                      line: LAST,
                      from: COL + OLD.length - selected,
                      to: COL + OLD.length,
                    }
              }
              caret={{
                line: LAST,
                col: typing ? COL + typed : COL + OLD.length - selected,
              }}
            />
          </Window>
        </div>
      </AbsoluteFill>

      <div style={{ position: 'absolute', left: 1190, top: 196, width: 680 }}>
        <div
          style={{
            fontSize: 62,
            fontWeight: 600,
            letterSpacing: -2.4,
            lineHeight: 1.08,
          }}
        >
          <div style={rise(frame, said('edit', 'Change') - 4)}>
            Change a sentence.
          </div>
          <div
            style={{
              ...rise(frame, said('edit', 'monitor') - 6),
              color: C.lime,
            }}
          >
            The monitor changes.
          </div>
        </div>
      </div>

      {/* The live monitor */}
      <div
        style={{
          position: 'absolute',
          left: 1190,
          top: 400,
          width: 620,
          padding: 30,
          borderRadius: 24,
          background: C.panel,
          border: `1.5px solid ${updated ? `${C.lime}88` : C.lineStrong}`,
          boxShadow: `0 50px 120px rgba(0,0,0,0.5)${updated ? `, 0 0 ${lerp(ramp(frame, EDIT_UPDATED, 40), 130, 60)}px rgba(213,245,164,0.2)` : ''}`,
          ...rise(frame, 4, 26, 30),
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Label size={17}>Live monitor · CAM 03</Label>
          <Chip size={18} color={C.lime}>
            <Dot color={C.lime} size={9} />
            watching
          </Chip>
        </div>
        <div
          style={{
            fontFamily: mono,
            fontSize: 24,
            color: C.green,
            marginTop: 28,
          }}
        >
          leave
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 500,
            letterSpacing: -0.8,
            marginTop: 12,
            lineHeight: 1.2,
            height: 88,
          }}
        >
          The person{' '}
          <span style={{ color: updated ? C.lime : C.text }}>
            {updated ? NEW : OLD}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginTop: 20,
            opacity: Math.min(1, bump * 1.5),
            transform: `scale(${lerp(bump, 0.8, 1)})`,
            transformOrigin: '0 50%',
          }}
        >
          <Chip size={21} filled>
            <Check size={19} />
            Monitor updated
          </Chip>
          <Chip size={21} color={C.soft}>
            no retraining
          </Chip>
        </div>
      </div>
    </Shell>
  );
};
