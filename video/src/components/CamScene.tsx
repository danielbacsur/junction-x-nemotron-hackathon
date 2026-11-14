import type { CSSProperties } from 'react';
import { timecode } from '../anim';
import { C, mono } from '../theme';

// A schematic shop camera. `t` is the footage time in seconds: an item is
// concealed in the bag at 00:12 and the person leaves without paying at 00:19.
export const CONCEAL = 12;
export const LEAVE = 19;

const smooth = (x: number, a: number, b: number) => {
  const p = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return p * p * (3 - 2 * p);
};
const mix = (a: number, b: number, p: number) => a + (b - a) * p;

const SHELF_ITEM = { x: 262, y: 200 };

export function pose(t: number) {
  const walk = smooth(t, 13.2, 19);
  const leave = smooth(t, 19, 20.2);
  const stride = smooth(t, 13.2, 13.8) * (1 - smooth(t, 19.6, 20.2));
  const x = 352 + walk * 206 + leave * 70;
  const bob =
    Math.abs(Math.sin(t * 7)) * 2.2 * stride + Math.sin(t * 1.3) * 0.9;
  const swing = Math.sin(t * 7) * 10 * stride;
  const bag = { x: x + 28, y: 206 + bob };
  const rest = { x: x - 22, y: 218 + bob };
  const reach = smooth(t, 8.4, 10.2);
  const carry = smooth(t, 10.8, 12.2);
  const back = smooth(t, 12.4, 13.2);
  let hand = {
    x: mix(rest.x, SHELF_ITEM.x, reach),
    y: mix(rest.y, SHELF_ITEM.y, reach),
  };
  hand = {
    x: mix(hand.x, bag.x, carry),
    y: mix(hand.y, bag.y + 14, carry) - Math.sin(carry * Math.PI) * 24,
  };
  hand = { x: mix(hand.x, rest.x, back), y: mix(hand.y, rest.y, back) };
  const item = {
    x: mix(SHELF_ITEM.x, bag.x, carry),
    y: mix(SHELF_ITEM.y, bag.y + 16, carry) - Math.sin(carry * Math.PI) * 24,
    opacity: 1 - smooth(t, 12, 12.3),
  };
  return {
    x,
    bob,
    swing,
    bag,
    hand,
    item,
    glow: smooth(t, 11.9, 12.3) * (1 - smooth(t, 13.6, 15.2)),
    opacity: 1 - smooth(t, 19.5, 20.2),
  };
}

// Deterministic shelf stock.
const products = [0, 1, 2].flatMap((row) => {
  const floor = [146, 214, 286][row];
  const list: { x: number; y: number; w: number; h: number; o: number }[] = [];
  let x = 52;
  let i = row * 7 + 3;
  while (x < 268) {
    const w = 15 + ((i * 7) % 9);
    const h = 24 + ((i * 13) % 26);
    if (!(row === 1 && x + w > 246)) {
      list.push({ x, y: floor - h - 2, w, h, o: 0.07 + ((i * 5) % 7) * 0.016 });
    }
    x += w + 7;
    i += 1;
  }
  return list;
});

type Props = {
  t: number;
  width: number;
  label?: string;
  overlay?: boolean;
  rec?: boolean;
  boxes?: { person?: number; bag?: number; theft?: number };
  mark?: { kind: 'bag' | 'exit'; progress: number };
  radius?: number;
  style?: CSSProperties;
};

export const CamScene = ({
  t,
  width,
  label = 'CAM 03 · AISLE 4',
  overlay = true,
  rec = true,
  boxes,
  mark,
  radius = 16,
  style,
}: Props) => {
  const p = pose(t);
  const person = '#dbe4de';
  const bodyTop = 152 + p.bob;
  const markAt =
    mark?.kind === 'exit'
      ? { x: 580, y: 196 }
      : { x: p.bag.x, y: p.bag.y + 22 };
  return (
    <div
      style={{
        width,
        height: (width * 9) / 16,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: radius,
        background: '#0c1315',
        ...style,
      }}
    >
      <svg
        viewBox="0 0 640 360"
        width="100%"
        height="100%"
        style={{ display: 'block' }}
      >
        <defs>
          <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#10191c" />
            <stop offset="1" stopColor="#0c1416" />
          </linearGradient>
          <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#141f22" />
            <stop offset="1" stopColor="#0a1012" />
          </linearGradient>
          <radialGradient id="lamp" cx="0.5" cy="0" r="0.9">
            <stop offset="0" stopColor="rgba(213,245,164,0.10)" />
            <stop offset="1" stopColor="rgba(213,245,164,0)" />
          </radialGradient>
        </defs>
        <rect width="640" height="286" fill="url(#wall)" />
        <rect y="286" width="640" height="74" fill="url(#floor)" />
        <rect width="640" height="286" fill="url(#lamp)" />
        <line
          x1="0"
          y1="286"
          x2="640"
          y2="286"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1.5"
        />
        {[306, 330].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="640"
            y2={y}
            stroke="rgba(255,255,255,0.05)"
          />
        ))}

        {/* Shelf */}
        <rect
          x="40"
          y="78"
          width="246"
          height="208"
          rx="3"
          fill="rgba(255,255,255,0.025)"
          stroke="rgba(255,255,255,0.24)"
          strokeWidth="1.5"
        />
        {[146, 214].map((y) => (
          <line
            key={y}
            x1="40"
            y1={y}
            x2="286"
            y2={y}
            stroke="rgba(255,255,255,0.24)"
            strokeWidth="1.5"
          />
        ))}
        {products.map((b, i) => (
          <rect
            key={i}
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            rx="2.5"
            fill={`rgba(255,255,255,${b.o})`}
          />
        ))}

        {/* Checkout */}
        <rect
          x="438"
          y="238"
          width="74"
          height="48"
          rx="3"
          fill="#182327"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1.5"
        />
        <rect
          x="452"
          y="218"
          width="24"
          height="18"
          rx="2.5"
          fill="#1d2b30"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1.2"
        />
        <text
          x="475"
          y="268"
          textAnchor="middle"
          fontFamily={mono}
          fontSize="9"
          letterSpacing="1.5"
          fill="rgba(255,255,255,0.4)"
        >
          PAY
        </text>

        {/* Exit */}
        <rect
          x="548"
          y="100"
          width="64"
          height="186"
          rx="2"
          fill="rgba(255,255,255,0.035)"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="1.5"
        />
        <rect
          x="556"
          y="76"
          width="48"
          height="17"
          rx="3"
          fill="rgba(134,183,106,0.2)"
          stroke="rgba(134,183,106,0.6)"
          strokeWidth="1"
        />
        <text
          x="580"
          y="88.5"
          textAnchor="middle"
          fontFamily={mono}
          fontSize="9.5"
          letterSpacing="2"
          fill={C.lime}
        >
          EXIT
        </text>

        {/* Person */}
        <g opacity={p.opacity}>
          <line
            x1={p.x - 9}
            y1={244 + p.bob}
            x2={p.x - 9 + p.swing}
            y2="286"
            stroke={person}
            strokeWidth="9"
            strokeLinecap="round"
          />
          <line
            x1={p.x + 9}
            y1={244 + p.bob}
            x2={p.x + 9 - p.swing}
            y2="286"
            stroke={person}
            strokeWidth="9"
            strokeLinecap="round"
          />
          <rect
            x={p.x - 23}
            y={bodyTop}
            width="46"
            height="98"
            rx="21"
            fill={person}
          />
          <circle cx={p.x} cy={128 + p.bob} r="17" fill={person} />
          <line
            x1={p.x - 13}
            y1={172 + p.bob}
            x2={p.hand.x}
            y2={p.hand.y}
            stroke="#b9c6be"
            strokeWidth="9"
            strokeLinecap="round"
          />
          {/* Tote bag */}
          <path
            d={`M ${p.bag.x - 11} ${p.bag.y} Q ${p.bag.x} ${p.bag.y - 34} ${p.bag.x + 11} ${p.bag.y}`}
            fill="none"
            stroke="#8fa0a6"
            strokeWidth="3"
          />
          <circle
            cx={p.bag.x}
            cy={p.bag.y + 24}
            r={30 * p.glow}
            fill="rgba(213,245,164,0.35)"
          />
          <path
            d={`M ${p.bag.x - 18} ${p.bag.y} L ${p.bag.x + 18} ${p.bag.y} L ${p.bag.x + 21} ${p.bag.y + 46} Q ${p.bag.x} ${p.bag.y + 51} ${p.bag.x - 21} ${p.bag.y + 46} Z`}
            fill="#4a5a60"
            stroke="#9db0b6"
            strokeWidth="1.5"
          />
        </g>

        {/* The item */}
        <g opacity={p.item.opacity}>
          <circle
            cx={p.item.x}
            cy={p.item.y}
            r="20"
            fill="rgba(213,245,164,0.18)"
          />
          <rect
            x={p.item.x - 11}
            y={p.item.y - 14}
            width="22"
            height="28"
            rx="3.5"
            fill={C.lime}
          />
        </g>

        {/* Detector boxes */}
        {boxes?.person ? (
          <g opacity={boxes.person}>
            <rect
              x={p.x - 38}
              y={100 + p.bob}
              width="64"
              height="192"
              rx="3"
              fill="none"
              stroke={C.lime}
              strokeWidth="1.8"
            />
            <rect
              x={p.x - 38}
              y={82 + p.bob}
              width="92"
              height="17"
              rx="2"
              fill={C.lime}
            />
            <text
              x={p.x - 32}
              y={94.5 + p.bob}
              fontFamily={mono}
              fontSize="10.5"
              fill={C.ink}
            >
              person 0.98
            </text>
          </g>
        ) : null}
        {boxes?.bag ? (
          <g opacity={boxes.bag}>
            <rect
              x={p.bag.x - 26}
              y={p.bag.y - 36}
              width="54"
              height="94"
              rx="3"
              fill="none"
              stroke={C.lime}
              strokeWidth="1.8"
            />
            <rect
              x={p.bag.x - 26}
              y={p.bag.y + 60}
              width="72"
              height="17"
              rx="2"
              fill={C.lime}
            />
            <text
              x={p.bag.x - 20}
              y={p.bag.y + 72.5}
              fontFamily={mono}
              fontSize="10.5"
              fill={C.ink}
            >
              bag 0.94
            </text>
          </g>
        ) : null}
        {boxes?.theft ? (
          <g opacity={boxes.theft}>
            <rect
              x={p.x - 52}
              y="64"
              width="124"
              height="246"
              rx="5"
              fill="rgba(255,106,61,0.07)"
              stroke={C.alert}
              strokeWidth="2"
              strokeDasharray="7 6"
            />
            <rect
              x={p.x + 4}
              y="46"
              width="68"
              height="18"
              rx="2"
              fill={C.alert}
            />
            <text
              x={p.x + 38}
              y="59"
              textAnchor="middle"
              fontFamily={mono}
              fontSize="11"
              fontWeight="500"
              fill={C.ink}
            >
              theft ?
            </text>
          </g>
        ) : null}

        {/* Evidence marker */}
        {mark ? (
          <circle
            cx={markAt.x}
            cy={markAt.y}
            r={mix(70, 44, mark.progress)}
            fill="rgba(213,245,164,0.08)"
            stroke={C.lime}
            strokeWidth="2.5"
            opacity={mark.progress}
          />
        ) : null}

        {overlay ? (
          <g fontFamily={mono} fontSize="11" letterSpacing="1.6">
            <text x="20" y="30" fill="rgba(255,255,255,0.72)">
              {label}
            </text>
            {rec ? (
              <g opacity={Math.floor(t * 1.6) % 2 === 0 ? 1 : 0.35}>
                <circle cx="578" cy="26" r="4.5" fill="#ff4d3d" />
                <text x="590" y="30" fill="rgba(255,255,255,0.72)">
                  REC
                </text>
              </g>
            ) : null}
            <text x="20" y="342" fill="rgba(255,255,255,0.72)">
              {timecode(t)}
            </text>
            {[
              'M12 22V12h10',
              'M628 22V12h-10',
              'M12 338v10h10',
              'M628 338v10h-10',
            ].map((d) => (
              <path
                key={d}
                d={d}
                fill="none"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="1.5"
              />
            ))}
          </g>
        ) : null}
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.028) 0px, rgba(255,255,255,0.028) 1px, transparent 1px, transparent 4px)',
          boxShadow: 'inset 0 0 90px rgba(0,0,0,0.55)',
          borderRadius: radius,
          border: `1.5px solid ${C.lineStrong}`,
        }}
      />
    </div>
  );
};
