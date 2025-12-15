export const SNIPPETS = {
  default: {
    label: "Test Cases (Polygons)",
    format: `Read t
rep t:
\tRead n
\trep n:
\t\tRead x y
\t\tPush x y
\t\tPoint x y
\tPoly`,
    input: `2
3
0 0
50 -20
20 40
4
-50 -50
-20 -50
-20 -20
-50 -20`
  },
  points: {
    label: "Points Cloud",
    format: `Read n
rep n:
\tRead x y
\tPoint x y`,
    input: `10
10 10
20 50
50 20
80 80
30 40
60 10
90 50
20 90
40 60
70 30`
  },
  segments: {
    label: "Line Segments",
    format: `Read n
rep n:
\tRead x1 y1 x2 y2
\tSeg x1 y1 x2 y2`,
    input: `5
0 0 50 50
10 80 90 20
20 20 20 80
80 20 80 80
0 50 100 50`
  },
  circles: {
    label: "Circles",
    format: `Read n
rep n:
\tRead x y r
\tCircle x y r`,
    input: `4
20 20 15
50 50 25
80 20 10
50 80 15`
  },
  polygon_simple: {
    label: "Simple Polygon",
    format: `Read n
rep n:
\tRead x y
\tPush x y
\tPoint x y
Poly`,
    input: `5
0 0
40 0
60 40
20 80
-20 40`
  },
  lines: {
      label: "Lines",
      format: `Read n
rep n:
\tRead x1 y1 x2 y2
\tLine x1 y1 x2 y2`,
      input: `3
0 0 1 1
0 50 1 50
50 0 50 1`
  }
} as const;

export type SnippetKey = keyof typeof SNIPPETS;
