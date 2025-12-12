import { Shape, ShapeType, ParseResult } from '../types';

// Predefined colors for auto-assignment
const COLORS = [
  '#ef4444', // red-500
  '#3b82f6', // blue-500
  '#22c55e', // green-500
  '#eab308', // yellow-500
  '#a855f7', // purple-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
];

const KEYWORDS = new Set([
  'point', 'p',
  'line', 'l',
  'segment', 's', 'seg',
  'circle', 'c',
  'poly', 'polygon',
  'push',
  'text', // Removed 't' to allow it as variable
  'read', // Removed 'r' to allow it as variable
  'rep'
]);

class ParserContext {
  tokens: string[];
  tokenIndex: number;
  variables: Map<string, number>;
  shapes: Shape[];
  pointBuffer: {x: number, y: number}[];

  constructor(input: string) {
    // Tokenize input by splitting whitespace
    // We want to preserve quoted strings for Text command
    const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
    this.tokens = [];
    let match;
    while ((match = regex.exec(input.trim())) !== null) {
      if (match[1] !== undefined) this.tokens.push(`"${match[1]}"`);
      else if (match[2] !== undefined) this.tokens.push(`"${match[2]}"`);
      else this.tokens.push(match[0]);
    }

    this.tokenIndex = 0;
    this.variables = new Map();
    this.shapes = [];
    this.pointBuffer = [];
  }

  hasNext() {
    return this.tokenIndex < this.tokens.length;
  }

  consume() {
    if (!this.hasNext()) throw new Error("Unexpected end of input");
    return this.tokens[this.tokenIndex++];
  }

  consumeNumber() {
    const token = this.consume();
    const val = parseFloat(token);
    if (isNaN(val)) throw new Error(`Expected number, found '${token}'`);
    return val;
  }

  resolveValue(valStr: string): number {
    // 1. Try variable lookup first
    if (this.variables.has(valStr)) {
      return this.variables.get(valStr)!;
    }

    // 2. Try literal number
    const num = parseFloat(valStr);
    if (!isNaN(num)) return num;

    // 3. Error
    throw new Error(`Undefined variable or invalid number: '${valStr}'`);
  }
}

export const parseInput = (format: string, input: string): ParseResult => {
  const ctx = new ParserContext(input);
  const rawFormatLines = format.split('\n');
  
  try {
    processBlock(rawFormatLines, 0, ctx);
  } catch (e: any) {
    return { shapes: [], error: e.message };
  }

  return { shapes: ctx.shapes, error: null };
};

function getIndent(line: string): number {
  const expanded = line.replace(/\t/g, '  ');
  const match = expanded.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

function validateVariableName(name: string) {
    if (KEYWORDS.has(name.toLowerCase())) {
        throw new Error(`Syntax Error: '${name}' is a reserved keyword and cannot be used as a variable name.`);
    }
    // Simple validation: must start with letter/underscore and contain only alphanumeric/underscore
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
        throw new Error(`Syntax Error: '${name}' is not a valid variable name. Must start with a letter or underscore.`);
    }
}

function processBlock(lines: string[], baseIndent: number, ctx: ParserContext) {
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) {
      i++;
      continue;
    }

    const currentIndent = getIndent(line);
    if (currentIndent < baseIndent) break;
    if (currentIndent > baseIndent) {
       throw new Error(`Indentation Error: Line "${trimmed}" is indented too much.`);
    }

    // Check for "rep" command
    if (trimmed.startsWith('rep ')) {
      const parts = trimmed.split(/\s+/); // rep n:
      let countVar = parts[1];
      if (countVar.endsWith(':')) countVar = countVar.slice(0, -1);

      const count = ctx.resolveValue(countVar);
      
      const loopBlockLines: string[] = [];
      let j = i + 1;
      let blockIndent = -1;

      while (j < lines.length) {
        const nextLine = lines[j];
        const nextTrimmed = nextLine.trim();
        
        if (!nextTrimmed || nextTrimmed.startsWith('//')) {
          if (!nextTrimmed) { loopBlockLines.push(nextLine); j++; continue; }
        }

        const nextIndent = getIndent(nextLine);
        if (blockIndent === -1) {
            if (nextIndent <= currentIndent) break;
            blockIndent = nextIndent;
        }

        if (nextIndent >= blockIndent) {
          loopBlockLines.push(nextLine);
          j++;
        } else {
          break;
        }
      }

      if (loopBlockLines.length === 0 || blockIndent === -1) {
          throw new Error(`Indentation Error: Expected an indented block after "${trimmed}"`);
      }

      for (let k = 0; k < count; k++) {
        const varsBefore = new Set(ctx.variables.keys());
        processBlock(loopBlockLines, blockIndent, ctx);
        const currentVars = Array.from(ctx.variables.keys());
        for (const key of currentVars) {
            if (!varsBefore.has(key)) ctx.variables.delete(key);
        }
      }
      i = j;
    } else {
      parseCommand(trimmed, ctx);
      i++;
    }
  }
}

function parseCommand(line: string, ctx: ParserContext) {
  const argsRegex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
  const parts: string[] = [];
  let match;
  while ((match = argsRegex.exec(line)) !== null) {
      if (match[1] !== undefined) parts.push(match[1]);
      else if (match[2] !== undefined) parts.push(match[2]);
      else parts.push(match[0]);
  }

  if (parts.length === 0) return;

  const firstToken = parts[0].toLowerCase();

  // Handle 'read' command
  if (firstToken === 'read') {
      for (let k = 1; k < parts.length; k++) {
          const varName = parts[k];
          validateVariableName(varName);

          const val = ctx.consumeNumber();
          ctx.variables.set(varName, val);
      }
      return;
  }

  let args: (string | number)[];
  let command: string | null = null;

  if (KEYWORDS.has(firstToken)) {
      command = firstToken;
      args = parts.slice(1).map(p => processArg(p, ctx));
  } else {
      // Unknown command error
      throw new Error(`Syntax Error: Unknown command '${parts[0]}'`);
  }

  executeShapeCommand(command, args, ctx);
}

function processArg(p: string, ctx: ParserContext): string | number {
    if (p.startsWith('#')) return p;
    
    // Quoted string literal
    if ((p.startsWith('"') && p.endsWith('"')) || (p.startsWith("'") && p.endsWith("'"))) {
        return p.slice(1, -1);
    }

    // Try resolve as variable or number
    try {
        const val = ctx.resolveValue(p);
        return val;
    } catch {
        // If not a number/variable, return as string (label)
        return p;
    }
}

function executeShapeCommand(command: string, args: (string|number)[], ctx: ParserContext) {
  const getColor = () => {
      const colorArg = args.find(a => typeof a === 'string' && a.startsWith('#'));
      return (colorArg as string) || COLORS[ctx.shapes.length % COLORS.length];
  }

  const getLabel = () => {
     const labelArg = args.find(a => typeof a === 'string' && !a.startsWith('#'));
     return (labelArg as string) || undefined;
  }

  const nums = args.filter(a => typeof a === 'number') as number[];
  const id = ctx.shapes.length.toString();
  const color = getColor();
  const label = getLabel();

  if (command === 'point' || command === 'p') {
    if (nums.length >= 2) {
      ctx.shapes.push({ id, type: ShapeType.POINT, x: nums[0], y: nums[1], color, label });
    }
  } else if (command === 'push') {
    if (nums.length >= 2) {
      ctx.pointBuffer.push({ x: nums[0], y: nums[1] });
    }
  } else if (command === 'line' || command === 'l') {
    if (nums.length >= 4) {
      ctx.shapes.push({ id, type: ShapeType.LINE, p1: { x: nums[0], y: nums[1] }, p2: { x: nums[2], y: nums[3] }, color, label });
    }
  } else if (command === 'segment' || command === 's' || command === 'seg') {
    if (nums.length >= 4) {
      ctx.shapes.push({ id, type: ShapeType.SEGMENT, p1: { x: nums[0], y: nums[1] }, p2: { x: nums[2], y: nums[3] }, color, label });
    }
  } else if (command === 'circle' || command === 'c') {
    if (nums.length >= 3) {
      ctx.shapes.push({ id, type: ShapeType.CIRCLE, x: nums[0], y: nums[1], r: nums[2], color, label });
    }
  } else if (command === 'poly' || command === 'polygon') {
    if (nums.length === 0) {
       if (ctx.pointBuffer.length > 0) {
           ctx.shapes.push({ id, type: ShapeType.POLYGON, points: [...ctx.pointBuffer], color, label });
           ctx.pointBuffer = [];
       }
    } else if (nums.length >= 6 && nums.length % 2 === 0) {
      const points = [];
      for(let k=0; k<nums.length; k+=2) {
        points.push({x: nums[k], y: nums[k+1]});
      }
      ctx.shapes.push({ id, type: ShapeType.POLYGON, points, color, label });
    }
  } else if (command === 'text') {
      if (nums.length >= 2 && label) {
          ctx.shapes.push({
              id, type: ShapeType.TEXT, x: nums[0], y: nums[1], content: label, fontSize: nums[2] || 12, color
          });
      }
  }
}