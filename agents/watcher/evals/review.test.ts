import { test, expect } from 'bun:test';
import { reviewInterval } from '../agent/tools/review-footage';
test('a future-only review cannot extract invented evidence', () => {
  expect(reviewInterval({ start: 1000, end: 15000 }, 16)).toBeNull();
});
test('review is clipped to the available recording', () => {
  expect(reviewInterval({ start: 2, end: 99 }, 16)).toEqual({
    start: 2,
    end: 16,
  });
});
test('a reversed interval cannot seek backward forever', () => {
  expect(reviewInterval({ start: 8, end: 4 }, 16)).toBeNull();
});
