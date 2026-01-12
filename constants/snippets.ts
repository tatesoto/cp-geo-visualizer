export const SNIPPETS = {
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
70 30
`
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
0 50 100 50
`
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
50 80 15
`
  },
  polygon_simple: {
    label: "Simple Polygon",
    format: `Read n m k
rep n:
\tRead x y
\tPush x y
\tPoint x y
Poly
rep m:
\tRead x y
\tPush x y
\tPoint x y
Poly
rep k:
\tRead x y
\tPush x y
\tPoint x y
Poly`,
    input: `5 3 3
0 0
40 0
60 40
20 80
-20 40
-10 20
60 10
30 80
20 0
50 60
-20 50
`
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
50 0 50 1
`
  },
  multi_testcases: {
    label: "Multi-Testcases",
    format: `Read t
rep i t:
\tGroup i:
\t\tRead n
\t\trep n:
\t\t\tRead x y
\t\t\tPoint x y`,
    input: `3
10
0 0
10 10
20 5
30 15
40 10
50 20
60 15
70 25
80 20
90 30
5
0 50
20 50
40 50
60 50
80 50
4
50 0
50 20
30 10
70 10
`
  },
  multi_testcases_eof0: {
    label: "Multi-Testcases (EOF=0)",
    format: `rep i 100000:
\tRead n
\tif n == 0:
\t\tbreak
\tGroup i:
\t\trep n:
\t\t\tRead x y
\t\t\tPoint x y`,
    input: `10
0 0
10 10
20 5
30 15
40 10
50 20
60 15
70 25
80 20
90 30
5
0 50
20 50
40 50
60 50
80 50
4
50 0
50 20
30 10
70 10
0
`
  }
} as const;

export type SnippetKey = keyof typeof SNIPPETS;
