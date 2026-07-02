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

describe('parser geometry keys', () => {
  it('references keyed points from query endpoints', () => {
    const format = `Read n m
rep i n:
  Read x y
  Point x y key=i
rep m:
  Read u v
  Seg @u @v`;

    const result = run(format, `3 2
0 0
10 0
10 10
0 1
1 2`);

    expect(result.error).toBeNull();
    expect(result.shapes).toHaveLength(5);
    const firstSeg = result.shapes[3];
    const secondSeg = result.shapes[4];
    expect(firstSeg.type).toBe(ShapeType.SEGMENT);
    expect(secondSeg.type).toBe(ShapeType.SEGMENT);
    if (firstSeg.type === ShapeType.SEGMENT) {
      expect(firstSeg.p1).toEqual({ x: 0, y: 0 });
      expect(firstSeg.p2).toEqual({ x: 10, y: 0 });
    }
    if (secondSeg.type === ShapeType.SEGMENT) {
      expect(secondSeg.p1).toEqual({ x: 10, y: 0 });
      expect(secondSeg.p2).toEqual({ x: 10, y: 10 });
    }
  });

  it('supports expression-based keys for 1-indexed input references', () => {
    const format = `Read n m
rep i n:
  Read x y
  Point x y key=i+1
rep m:
  Read u v
  Seg @u @v`;

    const result = run(format, `2 1
5 5
9 9
1 2`);

    expect(result.error).toBeNull();
    const seg = result.shapes[2];
    expect(seg.type).toBe(ShapeType.SEGMENT);
    if (seg.type === ShapeType.SEGMENT) {
      expect(seg.p1).toEqual({ x: 5, y: 5 });
      expect(seg.p2).toEqual({ x: 9, y: 9 });
    }
  });

  it('expands keyed segments, polygons, and circle centers', () => {
    const format = `Seg 0 0 10 0 key=e
Seg @e "#ff0000"
Poly 0 0 10 0 5 8 key=tri
Poly @tri "#00aa00"
Circle 3 4 2 key=c
Circle @c 9`;

    const result = run(format, ``);

    expect(result.error).toBeNull();
    expect(result.shapes).toHaveLength(6);

    const seg = result.shapes[1];
    expect(seg.type).toBe(ShapeType.SEGMENT);
    if (seg.type === ShapeType.SEGMENT) {
      expect(seg.p1).toEqual({ x: 0, y: 0 });
      expect(seg.p2).toEqual({ x: 10, y: 0 });
      expect(seg.color).toBe('#ff0000');
    }

    const poly = result.shapes[3];
    expect(poly.type).toBe(ShapeType.POLYGON);
    if (poly.type === ShapeType.POLYGON) {
      expect(poly.points).toEqual([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 5, y: 8 },
      ]);
      expect(poly.color).toBe('#00aa00');
    }

    const circle = result.shapes[5];
    expect(circle.type).toBe(ShapeType.CIRCLE);
    if (circle.type === ShapeType.CIRCLE) {
      expect(circle.x).toBe(3);
      expect(circle.y).toBe(4);
      expect(circle.r).toBe(9);
    }
  });

  it('rejects undefined keys, duplicate keys, and incompatible references', () => {
    const undefinedKey = run(`Seg @a @b`, ``);
    expect(undefinedKey.error).toMatch(/Undefined geometry key/);

    const duplicateKey = run(`Point 0 0 key=a
Point 1 1 key=a`, ``);
    expect(duplicateKey.error).toMatch(/Duplicate geometry key/);

    const incompatible = run(`Seg 0 0 10 0 key=e
Circle @e 5`, ``);
    expect(incompatible.error).toMatch(/arity mismatch/i);
  });

  it('selects keyed shapes without creating new objects', () => {
    const format = `Read n
rep i n:
  Read x y
  Point x y key=i
Read q
rep q:
  Read i
  Select @i`;

    const result = run(format, `3
0 0
10 0
20 0
2
0
2`);

    expect(result.error).toBeNull();
    expect(result.shapes).toHaveLength(3);
    expect(result.shapes[0].selected).toBe(true);
    expect(result.shapes[0].selectOrders).toEqual([0]);
    expect(result.shapes[1].selected).toBeUndefined();
    expect(result.shapes[2].selected).toBe(true);
    expect(result.shapes[2].selectOrders).toEqual([1]);
  });

  it('preserves Select call order including duplicate references', () => {
    const format = `Point 0 0 key=0
Point 10 0 key=1
Select @1
Select @0
Select @1`;

    const result = run(format, ``);

    expect(result.error).toBeNull();
    expect(result.shapes).toHaveLength(2);
    expect(result.shapes[0].selectOrders).toEqual([1]);
    expect(result.shapes[1].selectOrders).toEqual([0, 2]);
  });

  it('rejects Select without a geometry reference', () => {
    const result = run(`Select 1`, ``);
    expect(result.error).toMatch(/Select requires/i);
    expect(result.shapes).toHaveLength(0);
  });
});
