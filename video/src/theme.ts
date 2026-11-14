import { loadFont as loadSans } from '@remotion/google-fonts/DMSans';
import { loadFont as loadMono } from '@remotion/google-fonts/IBMPlexMono';

export const sans = loadSans('normal', {
  weights: ['400', '500', '600', '700'],
  subsets: ['latin'],
}).fontFamily;
export const mono = loadMono('normal', {
  weights: ['400', '500'],
  subsets: ['latin'],
}).fontFamily;

// The app's palette (apps/web/app/globals.css), extended with a dark stage.
export const C = {
  bg: '#090e0f',
  panel: '#11191b',
  panel2: '#172124',
  line: 'rgba(255,255,255,0.09)',
  lineStrong: 'rgba(255,255,255,0.18)',
  text: '#f1f5f2',
  soft: '#c3ccc7',
  muted: '#8b959b',
  dim: '#566067',
  lime: '#d5f5a4',
  green: '#86b76a',
  greenDeep: '#486e42',
  alert: '#ff6a3d',
  amber: '#f2c14e',
  light: '#f7f8fa',
  ink: '#182126',
};

export const WIDTH = 1920;
export const HEIGHT = 1080;
