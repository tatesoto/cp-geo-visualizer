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
  '#14b8a6', // teal-500
];

export const KEYWORDS = new Set([
  'point', 'p',
  'line', 'l',
  'segment', 's', 'seg',
  'circle', 'c',
  'poly', 'polygon',
  'push',
  'text',
  'read',
  'rep',
  'group'
]);

// Improved Regex: matches non-whitespace/quotes OR quoted strings
// Using 'g' flag for stateful exec
const TOKEN_REGEX = /[^\s"']+|"([^"]*)"|'([^']*)'/g;

class ParserContext {
  input: string;
  regex: RegExp;
  variables: Map<string, number>;
  shapes: Shape[];
  pointBuffer: {x: number, y: number}[];
  counts: Record<ShapeType, number>;
  startTime: number;
  timeoutMs: number;
  
  // Group state
  currentGroupId: string | undefined = undefined;
  
  // Lookahead buffer
  currentToken: string | null = null;

  constructor(input: string, timeoutMs: number) {
    this.input = input;
    this.regex = new RegExp(TOKEN_REGEX); // New instance to manage lastIndex
    this.variables = new Map();
    this.shapes = [];
    this.pointBuffer = [];
    this.startTime = Date.now();
    this.timeoutMs = timeoutMs;
    this.counts = {
      [ShapeType.POINT]: 0,
      [ShapeType.LINE]: 0,
      [ShapeType.SEGMENT]: 0,
      [ShapeType.CIRCLE]: 0,
      [ShapeType.POLYGON]: 0,
      [ShapeType.TEXT]: 0,
    };
  }

  checkTimeout() {
    if (Date.now() - this.startTime > this.timeoutMs) {
        throw new Error(`Execution timed out (> ${this.timeoutMs}ms). Please optimize your script, reduce input size, or increase the timeout limit in Settings.`);
    }
  }

  // Fetch next token without advancing if already buffered
  peek(): string | null {
    if (this.currentToken !== null) return this.currentToken;
    
    const match = this.regex.exec(this.input);
    if (match === null) return null;

    // Extract the actual value (handling quotes)
    if (match[1] !== undefined) this.currentToken = `"${match[1]}"`;
    else if (match[2] !== undefined) this.currentToken = `"${match[2]}"`;
    else this.currentToken = match[0];

    return this.currentToken;
  }

  // Return current token and advance
  consume(): string {
    const token = this.peek();
    if (token === null) throw new Error("Unexpected end of input");
    this.currentToken = null; // Clear buffer to allow next read
    return token;
  }

  hasNext(): boolean {
    return this.peek() !== null;
  }

  consumeNumber(): number {
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

  generateId(type: ShapeType): string {
    const count = this.counts[type]++;
    let prefix = '';
    switch (type) {
      case ShapeType.POINT: prefix = 'P'; break;
      case ShapeType.LINE: prefix = 'L'; break;
      case ShapeType.SEGMENT: prefix = 'S'; break;
      case ShapeType.CIRCLE: prefix = 'C'; break;
      case ShapeType.POLYGON: prefix = 'Pg'; break;
      case ShapeType.TEXT: prefix = 'Tx'; break;
    }
    return `${prefix}${count}`;
  }
}

export const parseInput = (format: string, input: string, timeoutMs: number = 3000): ParseResult => {
  const rawFormatLines = format.split('\n');
  const ctx = new ParserContext(input, timeoutMs);
  
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

// Strips comments starting with //, ignoring those inside quotes
function stripComment(line: string): string {
  let inQuote = false;
  let quoteChar = '';
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuote) {
      if (char === quoteChar) {
        inQuote = false;
      }
    } else {
      if (char === '"' || char === "'") {
        inQuote = true;
        quoteChar = char;
      } else if (char === '/' && line[i + 1] === '/') {
        return line.substring(0, i);
      }
    }
  }
  return line;
}

function validateVariableName(name: string) {
    if (KEYWORDS.has(name.toLowerCase())) {
        throw new Error(`Syntax Error: '${name}' is a reserved keyword and cannot be used as a variable name.`);
    }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
        throw new Error(`Syntax Error: '${name}' is not a valid variable name. Must start with a letter or underscore.`);
    }
}

function evaluateExpression(expr: string, ctx: ParserContext): number {
    const tokens: string[] = [];
    const regex = /(\d+(?:\.\d+)?)|([a-zA-Z_][a-zA-Z0-9_]*)|([\+\-\*\/\(\)%])/g;
    let match;
    while ((match = regex.exec(expr)) !== null) {
        tokens.push(match[0]);
    }
  
    if (tokens.length === 0) throw new Error("Empty expression");
  
    let pos = 0;
    const peek = () => tokens[pos];
    const consume = () => tokens[pos++];
  
    const parseFactor = (): number => {
        const token = consume();
        if (!token) throw new Error("Unexpected end of expression");
  
        if (token === '(') {
            const val = parseExpr(); 
            if (consume() !== ')') throw new Error("Expected ')'");
            return val;
        }
        
        if (token === '-') {
            return -parseFactor();
        }

        if (token === '+') {
            return parseFactor();
        }
  
        return ctx.resolveValue(token);
    }
  
    const parseTerm = (): number => {
        let left = parseFactor();
        while (pos < tokens.length) {
            const op = peek();
            if (op === '*' || op === '/' || op === '%') {
                consume();
                const right = parseFactor();
                if (op === '*') left *= right;
                else if (op === '/') left /= right;
                else if (op === '%') left %= right;
            } else {
                break;
            }
        }
        return left;
    }
  
    const parseExpr = (): number => {
        let left = parseTerm();
        while (pos < tokens.length) {
            const op = peek();
            if (op === '+' || op === '-') {
                consume();
                const right = parseTerm();
                if (op === '+') left += right;
                else left -= right;
            } else {
                break;
            }
        }
        return left;
    }
  
    const result = parseExpr();
    if (pos < tokens.length) {
        // Did not consume all tokens, meaning the expression is invalid or has extra stuff
        throw new Error(`Unexpected token '${tokens[pos]}' in expression "${expr}"`);
    }
    return result;
}

function processBlock(lines: string[], baseIndent: number, ctx: ParserContext) {
  let i = 0;
  while (i < lines.length) {
    ctx.checkTimeout();

    const line = lines[i];
    const content = stripComment(line);
    const trimmed = content.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    const currentIndent = getIndent(line);
    if (currentIndent < baseIndent) break;
    if (currentIndent > baseIndent) {
       throw new Error(`Indentation Error: Line "${trimmed}" is indented too much.`);
    }

    const lowerTrimmed = trimmed.toLowerCase();

    if (lowerTrimmed.startsWith('rep ')) {
      // Parse rep statement: rep [loop_var] <expr>:
      let stmtContent = trimmed.slice(4).trim();
      if (stmtContent.endsWith(':')) stmtContent = stmtContent.slice(0, -1).trim();

      let count: number;
      let loopVar: string | null = null;

      try {
        count = evaluateExpression(stmtContent, ctx);
      } catch (e) {
        const firstSpace = stmtContent.indexOf(' ');
        if (firstSpace === -1) {
             throw e;
        }

        const potentialVar = stmtContent.substring(0, firstSpace).trim();
        const potentialExpr = stmtContent.substring(firstSpace).trim();
        
        try {
            validateVariableName(potentialVar);
            loopVar = potentialVar;
            count = evaluateExpression(potentialExpr, ctx);
        } catch (innerE) {
            throw new Error(`Invalid rep statement: "${stmtContent}". Expected "rep count:" or "rep var count:"`);
        }
      }
      
      const loopBlockLines: string[] = [];
      let j = i + 1;
      let blockIndent = -1;

      while (j < lines.length) {
        const nextLine = lines[j];
        const nextContent = stripComment(nextLine);
        const nextTrimmed = nextContent.trim();
        
        if (!nextTrimmed) { 
           loopBlockLines.push(nextLine); 
           j++; 
           continue; 
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

      const initialVars = Array.from(ctx.variables.keys());
      
      for (let k = 0; k < count; k++) {
        ctx.checkTimeout();
        
        if (loopVar) {
            ctx.variables.set(loopVar, k);
        }

        processBlock(loopBlockLines, blockIndent, ctx);
        
        // Restore variable state
        if (ctx.variables.size > initialVars.length) {
             const currentKeys = Array.from(ctx.variables.keys());
             for (let vIndex = initialVars.length; vIndex < currentKeys.length; vIndex++) {
                 ctx.variables.delete(currentKeys[vIndex]);
             }
        }
      }
      i = j;

    } else if (lowerTrimmed.startsWith('group ')) {
        // Parse Group statement: Group [id]:
        let stmtContent = trimmed.slice(6).trim();
        if (!stmtContent.endsWith(':')) {
             throw new Error(`Syntax Error: Group statement must end with ':' (e.g. "Group i:")`);
        }
        stmtContent = stmtContent.slice(0, -1).trim();

        let groupId: string;
        // Check for quoted string
        if ((stmtContent.startsWith('"') && stmtContent.endsWith('"')) || (stmtContent.startsWith("'") && stmtContent.endsWith("'"))) {
            groupId = stmtContent.slice(1, -1);
        } else {
            try {
                const val = evaluateExpression(stmtContent, ctx);
                groupId = String(val);
            } catch (e) {
                 throw new Error(`Invalid Group ID: "${stmtContent}". Expected a number, variable, or quoted string.`);
            }
        }

        const prevGroupId = ctx.currentGroupId;
        ctx.currentGroupId = groupId;

        // Extract Block
        const blockLines: string[] = [];
        let j = i + 1;
        let blockIndent = -1;

        while (j < lines.length) {
            const nextLine = lines[j];
            const nextContent = stripComment(nextLine);
            const nextTrimmed = nextContent.trim();
            
            if (!nextTrimmed) { 
               blockLines.push(nextLine); 
               j++; 
               continue; 
            }

            const nextIndent = getIndent(nextLine);
            if (blockIndent === -1) {
                if (nextIndent <= currentIndent) break;
                blockIndent = nextIndent;
            }

            if (nextIndent >= blockIndent) {
                blockLines.push(nextLine);
                j++;
            } else {
                break;
            }
        }

        if (blockLines.length === 0 || blockIndent === -1) {
             throw new Error(`Indentation Error: Expected an indented block after "${trimmed}"`);
        }

        processBlock(blockLines, blockIndent, ctx);
        
        ctx.currentGroupId = prevGroupId;
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

    // Try resolve as expression (variable or math)
    try {
        const val = evaluateExpression(p, ctx);
        return val;
    } catch {
        // If it fails (e.g. it's a label string like "Label"), return as is
        return p;
    }
}

function executeShapeCommand(command: string, args: (string|number)[], ctx: ParserContext) {
  let color: string | undefined;
  let label: string | undefined;
  const nums: number[] = [];
  const strs: string[] = [];

  for (const a of args) {
      if (typeof a === 'number') {
          nums.push(a);
      } else if (typeof a === 'string') {
          if (a.startsWith('#')) color = a;
          else {
              label = a;
              strs.push(a);
          }
      }
  }

  // Auto assign color if not specified
  if (!color) {
      color = COLORS[ctx.shapes.length % COLORS.length];
  }
  
  const groupId = ctx.currentGroupId;

  if (command === 'point' || command === 'p') {
    if (nums.length >= 2) {
      const id = ctx.generateId(ShapeType.POINT);
      ctx.shapes.push({ id, type: ShapeType.POINT, x: nums[0], y: nums[1], color, label, groupId });
    }
  } else if (command === 'push') {
    if (nums.length >= 2) {
      ctx.pointBuffer.push({ x: nums[0], y: nums[1] });
    }
  } else if (command === 'line' || command === 'l') {
    if (nums.length >= 4) {
      const id = ctx.generateId(ShapeType.LINE);
      ctx.shapes.push({ id, type: ShapeType.LINE, p1: { x: nums[0], y: nums[1] }, p2: { x: nums[2], y: nums[3] }, color, label, groupId });
    }
  } else if (command === 'segment' || command === 's' || command === 'seg') {
    if (nums.length >= 4) {
      const id = ctx.generateId(ShapeType.SEGMENT);
      ctx.shapes.push({ id, type: ShapeType.SEGMENT, p1: { x: nums[0], y: nums[1] }, p2: { x: nums[2], y: nums[3] }, color, label, groupId });
    }
  } else if (command === 'circle' || command === 'c') {
    if (nums.length >= 3) {
      const id = ctx.generateId(ShapeType.CIRCLE);
      ctx.shapes.push({ id, type: ShapeType.CIRCLE, x: nums[0], y: nums[1], r: nums[2], color, label, groupId });
    }
  } else if (command === 'poly' || command === 'polygon') {
    if (nums.length === 0) {
       if (ctx.pointBuffer.length > 0) {
           const id = ctx.generateId(ShapeType.POLYGON);
           ctx.shapes.push({ id, type: ShapeType.POLYGON, points: ctx.pointBuffer.slice(), color, label, groupId });
           ctx.pointBuffer.length = 0; 
       }
    } else if (nums.length >= 6 && nums.length % 2 === 0) {
      const points = [];
      for(let k=0; k<nums.length; k+=2) {
        points.push({x: nums[k], y: nums[k+1]});
      }
      const id = ctx.generateId(ShapeType.POLYGON);
      ctx.shapes.push({ id, type: ShapeType.POLYGON, points, color, label, groupId });
    }
  } else if (command === 'text') {
      if (nums.length >= 2 && label) {
          const id = ctx.generateId(ShapeType.TEXT);
          ctx.shapes.push({
              id, type: ShapeType.TEXT, x: nums[0], y: nums[1], content: label, fontSize: nums[2] || 12, color, groupId
          });
      }
  }
}
