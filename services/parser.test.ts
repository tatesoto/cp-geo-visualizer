import { describe, it, expect } from 'vitest';
import { parseInput } from './parser';
import { ShapeType } from '../types';

const run = (format: string, input: string) => parseInput(format, input, 1000);

const expectSinglePoint = (result: ReturnType<typeof run>, x: number, y: number) => {
  expect(result.error).toBeNull();
  expect(result.shapes).toHaveLength(1);
  const shape = result.shapes[0];
  expect(shape.type).toBe(ShapeType.POINT);
  if (shape.type === ShapeType.POINT) {
    expect(shape.x).toBe(x);
    expect(shape.y).toBe(y);
  }
};

describe('parser control flow', () => {
  it('selects if/elif/else branches', () => {
    const format = `Read n
if n % 2 == 0:
  Point n 0
elif n % 3 == 0:
  Point n 10
else:
  Point n 20`;

    expectSinglePoint(run(format, `6`), 6, 0);
    expectSinglePoint(run(format, `9`), 9, 10);
    expectSinglePoint(run(format, `7`), 7, 20);
  });

  it('supports "else if" as an alias for elif', () => {
    const format = `Read n
if n == 0:
  Point 0 0
else if n == 1:
  Point 1 1
else:
  Point 2 2`;

    expectSinglePoint(run(format, `1`), 1, 1);
  });

  it('supports logical operators in conditions', () => {
    const format = `Read a b
if a < b && !(a == 0):
  Point 1 1
else:
  Point 2 2`;

    expectSinglePoint(run(format, `1 2`), 1, 1);
    expectSinglePoint(run(format, `0 2`), 2, 2);
  });

  it('respects operator precedence in conditions', () => {
    const format = `Read a b c
if a == 1 || b == 2 && c == 3:
  Point 1 1
else:
  Point 2 2`;

    expectSinglePoint(run(format, `0 2 3`), 1, 1);
    expectSinglePoint(run(format, `0 2 4`), 2, 2);
    expectSinglePoint(run(format, `1 0 0`), 1, 1);
  });

  it('break exits the nearest rep loop', () => {
    const format = `Read n
rep i n:
  if i == 2:
    break
  Point i i`;

    const result = run(format, `5`);
    expect(result.error).toBeNull();
    expect(result.shapes).toHaveLength(2);
    const [p0, p1] = result.shapes;
    expect(p0.type).toBe(ShapeType.POINT);
    expect(p1.type).toBe(ShapeType.POINT);
    if (p0.type === ShapeType.POINT) {
      expect(p0.x).toBe(0);
      expect(p0.y).toBe(0);
    }
    if (p1.type === ShapeType.POINT) {
      expect(p1.x).toBe(1);
      expect(p1.y).toBe(1);
    }
  });

  it('continue skips to the next loop iteration', () => {
    const format = `Read n
rep i n:
  if i % 2 == 0:
    continue
  Point i i`;

    const result = run(format, `5`);
    expect(result.error).toBeNull();
    expect(result.shapes).toHaveLength(2);
    const [p0, p1] = result.shapes;
    expect(p0.type).toBe(ShapeType.POINT);
    expect(p1.type).toBe(ShapeType.POINT);
    if (p0.type === ShapeType.POINT) {
      expect(p0.x).toBe(1);
      expect(p0.y).toBe(1);
    }
    if (p1.type === ShapeType.POINT) {
      expect(p1.x).toBe(3);
      expect(p1.y).toBe(3);
    }
  });

  it('break/continue only affect the nearest loop', () => {
    const format = `Read n
rep i n:
  rep j n:
    if j == 1:
      continue
    if j == 2:
      break
    Point i j`;

    const result = run(format, `3`);
    expect(result.error).toBeNull();
    // For each i: j=0 -> point, j=1 continue, j=2 break => one point per i.
    expect(result.shapes).toHaveLength(3);
  });

  it('rejects break/continue outside loops', () => {
    const breakResult = run(`break`, ``);
    expect(breakResult.error).toMatch(/outside of a loop/i);
    expect(breakResult.shapes).toHaveLength(0);

    const continueResult = run(`continue`, ``);
    expect(continueResult.error).toMatch(/outside of a loop/i);
    expect(continueResult.shapes).toHaveLength(0);
  });

  it('rejects elif/else without matching if', () => {
    const result = run(`elif 1:
  Point 0 0`, ``);
    expect(result.error).toMatch(/without matching 'if'/i);
    expect(result.shapes).toHaveLength(0);
  });
});

describe('parser control flow errors', () => {
  it('rejects if/elif without condition or missing colon', () => {
    const missingCond = run(`if:
  Point 0 0`, ``);
    expect(missingCond.error).toMatch(/requires a condition/i);

    const missingColon = run(`if 1
  Point 0 0`, ``);
    expect(missingColon.error).toMatch(/must end with ':'/i);

    const elifMissingColon = run(`if 1:
  Point 0 0
elif 1
  Point 1 1`, ``);
    expect(elifMissingColon.error).toMatch(/must end with ':'/i);
  });

  it('rejects else with a condition', () => {
    const result = run(`if 0:
  Point 0 0
else 1:
  Point 1 1`, ``);
    expect(result.error).toMatch(/cannot have a condition/i);
  });

  it('rejects break/continue with arguments', () => {
    const breakArgs = run(`rep i 1:
  break 1`, ``);
    expect(breakArgs.error).toMatch(/does not take any arguments/i);

    const continueArgs = run(`rep i 1:
  continue x`, ``);
    expect(continueArgs.error).toMatch(/does not take any arguments/i);
  });

  it('rejects chained comparisons', () => {
    const result = run(`if 1 < 2 < 3:
  Point 0 0`, ``);
    expect(result.error).toMatch(/Unexpected token/);
  });
});
