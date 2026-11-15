// Recordings that must not complete a skill: either cut off before the
// forbidden steps happen, or shown to a skill they do not match. A model
// passes a case by not verifying any forbidden step.
export const cases = [
  {
    name: 'orientation-before-second-horizontal',
    clip: 'clip-2',
    skill: 'orientation',
    end: 8,
    forbidden: ['horizontal-again', 'second-can'],
  },
  {
    name: 'repack-before-replacement',
    clip: 'clip-3',
    skill: 'repack',
    end: 9,
    forbidden: ['replace-pringles'],
  },
  {
    name: 'packing-before-insertion',
    clip: 'clip-1',
    skill: 'pack',
    end: 0.5,
    forbidden: ['pack-can', 'put-away'],
  },
  {
    name: 'theft-before-concealment',
    clip: 'clip-4',
    skill: 'theft',
    end: 3,
    forbidden: ['leave'],
  },
  {
    name: 'theft-item-only-shown',
    clip: 'clip-5',
    skill: 'theft',
    end: 1.5,
    forbidden: ['leave'],
  },
  {
    name: 'theft-while-packing-a-bag',
    clip: 'clip-1',
    skill: 'theft',
    end: 7.5,
    forbidden: ['leave'],
  },
  {
    name: 'theft-while-repacking-a-bag',
    clip: 'clip-3',
    skill: 'theft',
    end: 15.5,
    forbidden: ['leave'],
  },
  {
    name: 'theft-while-holding-a-can',
    clip: 'clip-2',
    skill: 'theft',
    end: 16,
    forbidden: ['leave'],
  },
];
