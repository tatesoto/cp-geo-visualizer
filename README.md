[日本語版（Japanese Version）のREADMEはこちら](./README-ja.md)

# CP Geometry Visualizer

A tool to assist in debugging and visualizing geometry problems in Competitive Programming.
By inputting text-based commands, you can easily draw and visually verify points, lines, circles, polygons, and more.

[
    Web Page
](https://tatesoto.github.io/cp-geo-visualizer)

> This application was created using Google AI Studio.

## Key Features

- **Real-time Rendering**: Shapes are drawn immediately as you type in the editor.
- **Various Shapes**: Supports points, lines, segments, circles, polygons, text, etc.
- **Variables and Loops**: Supports reading input values with `Read` command and loop processing with `rep` command.
- **Grouping**: Group shapes with `Group` command to toggle visibility individually.
- **Image Export**: Save the drawing results as an image.

## Getting Started

### Prerequisites
- Node.js

### Installation and Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Access the URL displayed in the browser (usually `http://localhost:5173`).

## Syntax Guide

Enter the following commands in the editor to draw shapes.
For coordinates and numbers, you can use numeric literals, pre-defined variables, and mathematical expressions (`+`, `-`, `*`, `/`, `%`).
Optionally, you can add a label string like `TOP` or a color code like `#ff0000` at the end of each command.

### Basic Shapes

- **Point**
  ```
  Point x y [label] [#color]
  ```
- **Line**
  ```
  Line x1 y1 x2 y2 [label] [#color]
  ```
- **Segment**
  ```
  Seg x1 y1 x2 y2 [label] [#color]
  ```
- **Circle**
  ```
  Circle x y r [label] [#color]
  ```
- **Polygon**
  ```
  Poly x1 y1 x2 y2 ... [label] [#color]
  ```
  Alternatively, you can add vertices to the buffer using the `Push` command and then call `Poly` without arguments.
  ```
  Push x1 y1
  Push x2 y2
  Poly
  ```
- **Text**
  ```
  Text x y "content" [fontSize] [#color]
  ```

### Variables and Control Flow

- **Read Input (Read)**
  ```
  Read n m
  ```
  Reads values from space-separated input data and assigns them to variables `n`, `m`.

- **Loop (Rep)**
  ```
  rep n:
      // Repeat n times
      Point ...
  
  rep i n:
      // Repeat while varying variable i from 0 to n-1
      Point i i*2
  ```

- **Conditional (If / Elif / Else)**
  ```
  if n % 2 == 0:
      Point n 0
  elif n % 3 == 0:
      Point n 10
  else:
      Point n 20
  ```
  `else if` is also supported as an alias for `elif`.

- **Loop Control (break / continue)**
  ```
  rep i 10:
      if i == 5:
          break
      if i % 2 == 0:
          continue
      Point i i
  ```

- **Group**
  ```
  Group 1:
      // Shapes belonging to Group 1
      Seg ...
  ```

### Comments

- Everything after `//` is ignored as a comment.

## Sample

```
// Draw a triangle
Read x1 y1 x2 y2 x3 y3
Poly x1 y1 x2 y2 x3 y3 "Triangle" #blue

// Draw a circle
Circle 0 0 10 #red
```
