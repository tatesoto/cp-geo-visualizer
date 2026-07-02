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
  'point',
  'line',
  'seg', 
  'circle',
  'poly',
  'push',
  'text',
  'select',
  'read',
  'rep',
  'group',
  'if',
  'elif',
  'else',
  'break',
  'continue'
]);

// Improved Regex: matches non-whitespace/quotes OR quoted strings
// Using 'g' flag for stateful exec
const TOKEN_REGEX = /[^\s"']+|"([^"]*)"|'([^']*)'/g;

class BreakSignal extends Error {
  constructor() {
    super('Break');
  }
}

class ContinueSignal extends Error {
  constructor() {
    super('Continue');
  }
}

class ParserContext {
  input: string;
  regex: RegExp;
  variables: Map<string, number>;
  keyedShapes: Map<string, Shape>;
  shapes: Shape[];
  pointBuffer: {x: number, y: number}[];
  counts: Record<ShapeType, number>;
  selectCount: number;
  startTime: number;
  timeoutMs: number;
  
  // Group state
  currentGroupId: string | undefined = undefined;

  // Loop depth for break/continue
  loopDepth: number;
  
  // Lookahead buffer
  currentToken: string | null = null;

  constructor(input: string, timeoutMs: number) {
    this.input = input;
    this.regex = new RegExp(TOKEN_REGEX); // New instance to manage lastIndex
    this.variables = new Map();
    this.keyedShapes = new Map();
    this.shapes = [];
    this.pointBuffer = [];
    this.selectCount = 0;
    this.startTime = Date.now();
    this.timeoutMs = timeoutMs;
    this.loopDepth = 0;
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
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return { shapes: [], error: message };
  }

  return { shapes: ctx.shapes, error: null };
};

const INDENT_TAB_WIDTH = 4;

function getIndent(line: string): number {
  let count = 0;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === ' ') {
      count += 1;
    } else if (char === '\t') {
      const spaces = INDENT_TAB_WIDTH - (count % INDENT_TAB_WIDTH);
      count += spaces;
    } else {
      break;
    }
  }
  return count;
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

function tokenizeExpression(expr: string): string[] {
    const tokens: string[] = [];
    const regex = /[a-zA-Z_][a-zA-Z0-9_]*|\d+(?:\.\d+)?|==|!=|<=|>=|\|\||&&|[+\-*/()%<>!]/g;
    let match;
    let lastIndex = 0;
    while ((match = regex.exec(expr)) !== null) {
        if (match.index > lastIndex) {
            const skipped = expr.slice(lastIndex, match.index);
            if (skipped.trim() !== '') {
                throw new Error(`Unexpected token '${skipped.trim()}' in expression "${expr}"`);
            }
        }
        tokens.push(match[0]);
        lastIndex = regex.lastIndex;
    }
    if (expr.slice(lastIndex).trim() !== '') {
        throw new Error(`Unexpected token '${expr.slice(lastIndex).trim()}' in expression "${expr}"`);
    }
    return tokens;
}

function evaluateExpression(expr: string, ctx: ParserContext): number {
    const tokens = tokenizeExpression(expr);
    if (tokens.length === 0) throw new Error("Empty expression");

    let pos = 0;
    const peek = () => tokens[pos];
    const consume = () => tokens[pos++];
    const toBool = (val: number) => val !== 0;

    const parsePrimary = (): number => {
        const token = consume();
        if (!token) throw new Error("Unexpected end of expression");

        if (token === '(') {
            const val = parseOr();
            if (consume() !== ')') throw new Error("Expected ')'");
            return val;
        }

        return ctx.resolveValue(token);
    }

    const parseUnary = (): number => {
        const token = peek();
        if (token === '+' || token === '-') {
            consume();
            const val = parseUnary();
            return token === '-' ? -val : val;
        }
        if (token === '!') {
            consume();
            const val = parseUnary();
            return toBool(val) ? 0 : 1;
        }
        return parsePrimary();
    }

    const parseTerm = (): number => {
        let left = parseUnary();
        while (pos < tokens.length) {
            const op = peek();
            if (op === '*' || op === '/' || op === '%') {
                consume();
                const right = parseUnary();
                if (op === '*') left *= right;
                else if (op === '/') left /= right;
                else if (op === '%') left %= right;
            } else {
                break;
            }
        }
        return left;
    }

    const parseAddSub = (): number => {
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

    const parseComparison = (): number => {
        let left = parseAddSub();
        const op = peek();
        if (op === '==' || op === '!=' || op === '<' || op === '<=' || op === '>' || op === '>=') {
            consume();
            const right = parseAddSub();
            if (op === '==') left = left === right ? 1 : 0;
            else if (op === '!=') left = left !== right ? 1 : 0;
            else if (op === '<') left = left < right ? 1 : 0;
            else if (op === '<=') left = left <= right ? 1 : 0;
            else if (op === '>') left = left > right ? 1 : 0;
            else if (op === '>=') left = left >= right ? 1 : 0;
        }
        return left;
    }

    const parseAnd = (): number => {
        let left = parseComparison();
        while (pos < tokens.length) {
            const op = peek();
            if (op === '&&') {
                consume();
                const right = parseComparison();
                left = (toBool(left) && toBool(right)) ? 1 : 0;
            } else {
                break;
            }
        }
        return left;
    }

    const parseOr = (): number => {
        let left = parseAnd();
        while (pos < tokens.length) {
            const op = peek();
            if (op === '||') {
                consume();
                const right = parseAnd();
                left = (toBool(left) || toBool(right)) ? 1 : 0;
            } else {
                break;
            }
        }
        return left;
    }

    const result = parseOr();
    if (pos < tokens.length) {
        throw new Error(`Unexpected token '${tokens[pos]}' in expression "${expr}"`);
    }
    return result;
}

function extractIndentedBlock(lines: string[], startIndex: number, parentIndent: number, header: string) {
    const blockLines: string[] = [];
    let j = startIndex;
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
            if (nextIndent <= parentIndent) break;
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
        throw new Error(`Indentation Error: Expected an indented block after "${header}"`);
    }

    return { blockLines, blockIndent, nextIndex: j };
}

type ConditionalHeader = { kind: 'if' | 'elif' | 'else', condition?: string };

function parseConditionalHeader(trimmed: string): ConditionalHeader | null {
    const elseIfMatch = trimmed.match(/^else\s+if\b(.*)$/i);
    if (elseIfMatch) {
        return parseConditionalWithCondition(elseIfMatch[1], 'elif', 'else if');
    }

    const ifMatch = trimmed.match(/^if\b(.*)$/i);
    if (ifMatch) {
        return parseConditionalWithCondition(ifMatch[1], 'if', 'if');
    }

    const elifMatch = trimmed.match(/^elif\b(.*)$/i);
    if (elifMatch) {
        return parseConditionalWithCondition(elifMatch[1], 'elif', 'elif');
    }

    const elseMatch = trimmed.match(/^else\b(.*)$/i);
    if (elseMatch) {
        const rest = elseMatch[1].trim();
        if (!rest.endsWith(':')) {
            throw new Error(`Syntax Error: else statement must end with ':' (e.g. "else:")`);
        }
        if (rest.trim() !== ':') {
            throw new Error(`Syntax Error: else statement cannot have a condition (use "else if" or "elif").`);
        }
        return { kind: 'else' };
    }

    return null;
}

function parseConditionalWithCondition(rest: string, kind: 'if' | 'elif', label: string): ConditionalHeader {
    let content = rest.trim();
    if (!content.endsWith(':')) {
        throw new Error(`Syntax Error: ${label} statement must end with ':' (e.g. "${label} x > 0:")`);
    }
    content = content.slice(0, -1).trim();
    if (!content) {
        throw new Error(`Syntax Error: ${label} statement requires a condition.`);
    }
    return { kind, condition: content };
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
      
      const { blockLines: loopBlockLines, blockIndent, nextIndex } = extractIndentedBlock(lines, i + 1, currentIndent, trimmed);

      const initialVars = Array.from(ctx.variables.keys());

      ctx.loopDepth++;
      try {
          for (let k = 0; k < count; k++) {
              ctx.checkTimeout();
              
              if (loopVar) {
                  ctx.variables.set(loopVar, k);
              }

              let shouldBreak = false;
              let shouldContinue = false;

              try {
                  processBlock(loopBlockLines, blockIndent, ctx);
              } catch (e) {
                  if (e instanceof BreakSignal) {
                      shouldBreak = true;
                  } else if (e instanceof ContinueSignal) {
                      shouldContinue = true;
                  } else {
                      throw e;
                  }
              }
              
              // Restore variable state
              if (ctx.variables.size > initialVars.length) {
                  const currentKeys = Array.from(ctx.variables.keys());
                  for (let vIndex = initialVars.length; vIndex < currentKeys.length; vIndex++) {
                      ctx.variables.delete(currentKeys[vIndex]);
                  }
              }

              if (shouldBreak) break;
              if (shouldContinue) continue;
          }
      } finally {
          ctx.loopDepth--;
      }

      i = nextIndex;

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

        const { blockLines, blockIndent, nextIndex } = extractIndentedBlock(lines, i + 1, currentIndent, trimmed);

        processBlock(blockLines, blockIndent, ctx);
        
        ctx.currentGroupId = prevGroupId;
        i = nextIndex;

    } else if (/^if\b/i.test(trimmed)) {
        // Parse if/else-if/else chain
        let j = i;
        let executed = false;

        while (j < lines.length) {
            const headerLine = lines[j];
            const headerContent = stripComment(headerLine);
            const headerTrimmed = headerContent.trim();
            if (!headerTrimmed) {
                j++;
                continue;
            }

            const header = parseConditionalHeader(headerTrimmed);
            if (!header) break;
            if (j !== i && header.kind === 'if') break;

            const { blockLines, blockIndent, nextIndex } = extractIndentedBlock(lines, j + 1, currentIndent, headerTrimmed);

            if (!executed) {
                if (header.kind === 'else') {
                    processBlock(blockLines, blockIndent, ctx);
                    executed = true;
                } else if (header.condition) {
                    const condVal = evaluateExpression(header.condition, ctx);
                    if (condVal !== 0) {
                        processBlock(blockLines, blockIndent, ctx);
                        executed = true;
                    }
                }
            }

            j = nextIndex;

            if (header.kind === 'else') break;
        }

        i = j;

    } else if (/^elif\b/i.test(trimmed) || /^else\b/i.test(trimmed)) {
        if (/^else\s+if\b/i.test(trimmed)) {
            throw new Error(`Syntax Error: 'else if' without matching 'if'.`);
        }
        const keyword = trimmed.toLowerCase().startsWith('elif') ? 'elif' : 'else';
        throw new Error(`Syntax Error: '${keyword}' without matching 'if'.`);

    } else if (lowerTrimmed === 'break' || lowerTrimmed === 'continue') {
        if (ctx.loopDepth <= 0) {
            throw new Error(`Syntax Error: '${lowerTrimmed}' used outside of a loop.`);
        }
        if (lowerTrimmed === 'break') throw new BreakSignal();
        throw new ContinueSignal();

    } else if (lowerTrimmed.startsWith('break ') || lowerTrimmed.startsWith('continue ')) {
        const keyword = lowerTrimmed.startsWith('break') ? 'break' : 'continue';
        throw new Error(`Syntax Error: '${keyword}' does not take any arguments.`);

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

  executeShapeCommand(command, parseShapeArgs(args, ctx), ctx);
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

type Coordinate = { x: number; y: number };

type CoordinateItem =
  | { kind: 'number'; value: number }
  | { kind: 'coordinates'; value: Coordinate[] };

interface ParsedShapeArgs {
  color?: string;
  label?: string;
  key?: string;
  numbers: number[];
  coordinateItems: CoordinateItem[];
  referencedShapes: Shape[];
  hasReferences: boolean;
}

function resolveKeyToken(raw: string, ctx: ParserContext): string {
    if (raw.length === 0) {
        throw new Error('Syntax Error: key cannot be empty.');
    }
    try {
        return String(evaluateExpression(raw, ctx));
    } catch {
        return raw;
    }
}

function shapeToCoordinates(shape: Shape): Coordinate[] {
    switch (shape.type) {
        case ShapeType.POINT:
        case ShapeType.CIRCLE:
        case ShapeType.TEXT:
            return [{ x: shape.x, y: shape.y }];
        case ShapeType.LINE:
        case ShapeType.SEGMENT:
            return [shape.p1, shape.p2];
        case ShapeType.POLYGON:
            return shape.points;
    }
}

function resolveShapeByKey(raw: string, ctx: ParserContext): Shape {
    const key = resolveKeyToken(raw, ctx);
    const shape = ctx.keyedShapes.get(key);
    if (!shape) {
        throw new Error(`Undefined geometry key: '${key}'`);
    }
    return shape;
}

function parseShapeArgs(args: (string | number)[], ctx: ParserContext): ParsedShapeArgs {
  const parsed: ParsedShapeArgs = {
      numbers: [],
      coordinateItems: [],
      referencedShapes: [],
      hasReferences: false,
  };

  for (const a of args) {
      if (typeof a === 'number') {
          parsed.numbers.push(a);
          parsed.coordinateItems.push({ kind: 'number', value: a });
          continue;
      }

      if (a.startsWith('key=')) {
          parsed.key = resolveKeyToken(a.slice(4), ctx);
          continue;
      }

      if (a.startsWith('@')) {
          parsed.hasReferences = true;
          const shape = resolveShapeByKey(a.slice(1), ctx);
          parsed.referencedShapes.push(shape);
          parsed.coordinateItems.push({ kind: 'coordinates', value: shapeToCoordinates(shape) });
          continue;
      }

      if (a.startsWith('#')) parsed.color = a;
      else parsed.label = a;
  }

  return parsed;
}

function splitNumericParams(items: CoordinateItem[], paramCount: number): { coordinateItems: CoordinateItem[]; params: number[] } {
    if (paramCount === 0) return { coordinateItems: items, params: [] };

    const coordinateItems = items.slice();
    const params: number[] = [];

    for (let i = coordinateItems.length - 1; i >= 0 && params.length < paramCount; i--) {
        const item = coordinateItems[i];
        if (item.kind === 'number') {
            params.unshift(item.value);
            coordinateItems.splice(i, 1);
        }
    }

    if (params.length !== paramCount) {
        throw new Error(`Geometry reference arity mismatch: expected ${paramCount} numeric parameter(s).`);
    }

    return { coordinateItems, params };
}

function expandCoordinateItems(items: CoordinateItem[]): Coordinate[] {
    const coordinates: Coordinate[] = [];
    const pendingNumbers: number[] = [];

    const flushPendingNumbers = () => {
        if (pendingNumbers.length % 2 !== 0) {
            throw new Error('Geometry reference arity mismatch: coordinates must be provided as x y pairs.');
        }
        for (let i = 0; i < pendingNumbers.length; i += 2) {
            coordinates.push({ x: pendingNumbers[i], y: pendingNumbers[i + 1] });
        }
        pendingNumbers.length = 0;
    };

    for (const item of items) {
        if (item.kind === 'number') {
            pendingNumbers.push(item.value);
        } else {
            flushPendingNumbers();
            coordinates.push(...item.value);
        }
    }

    flushPendingNumbers();
    return coordinates;
}

function getReferencedCoordinates(args: ParsedShapeArgs, expectedCount: number, numericParamCount = 0): { coordinates: Coordinate[]; params: number[] } {
    const { coordinateItems, params } = splitNumericParams(args.coordinateItems, numericParamCount);
    const coordinates = expandCoordinateItems(coordinateItems);
    if (coordinates.length !== expectedCount) {
        throw new Error(`Geometry reference arity mismatch: expected ${expectedCount} coordinate(s), got ${coordinates.length}.`);
    }
    return { coordinates, params };
}

function getReferencedPolygonCoordinates(args: ParsedShapeArgs): Coordinate[] {
    const coordinates = expandCoordinateItems(args.coordinateItems);
    if (coordinates.length < 3) {
        throw new Error(`Geometry reference arity mismatch: polygon requires at least 3 coordinates, got ${coordinates.length}.`);
    }
    return coordinates;
}

function registerShape(ctx: ParserContext, shape: Shape, key: string | undefined) {
    if (key !== undefined) {
        if (ctx.keyedShapes.has(key)) {
            throw new Error(`Duplicate geometry key: '${key}'`);
        }
        shape.key = key;
    }

    ctx.shapes.push(shape);

    if (key !== undefined) {
        ctx.keyedShapes.set(key, shape);
    }
}

function executeShapeCommand(command: string, parsedArgs: ParsedShapeArgs, ctx: ParserContext) {
  let color: string | undefined;
  let label: string | undefined;
  const nums: number[] = [];
  const strs: string[] = [];

  color = parsedArgs.color;
  label = parsedArgs.label;
  nums.push(...parsedArgs.numbers);
  if (label) strs.push(label);

  // Auto assign color if not specified
  if (!color) {
      color = COLORS[ctx.shapes.length % COLORS.length];
  }
  
  const groupId = ctx.currentGroupId;

  if (command === 'select') {
    if (parsedArgs.referencedShapes.length === 0) {
      throw new Error(`Syntax Error: Select requires at least one geometry reference (e.g. "Select @i").`);
    }
    for (const shape of parsedArgs.referencedShapes) {
      shape.selected = true;
      if (!shape.selectOrders) shape.selectOrders = [];
      shape.selectOrders.push(ctx.selectCount++);
    }
  } else if (command === 'point') {
    if (parsedArgs.hasReferences) {
      const { coordinates } = getReferencedCoordinates(parsedArgs, 1);
      const id = ctx.generateId(ShapeType.POINT);
      registerShape(ctx, { id, type: ShapeType.POINT, x: coordinates[0].x, y: coordinates[0].y, color, label, groupId }, parsedArgs.key);
    } else if (nums.length >= 2) {
      const id = ctx.generateId(ShapeType.POINT);
      registerShape(ctx, { id, type: ShapeType.POINT, x: nums[0], y: nums[1], color, label, groupId }, parsedArgs.key);
    }
  } else if (command === 'push') {
    if (parsedArgs.hasReferences) {
      const { coordinates } = getReferencedCoordinates(parsedArgs, 1);
      ctx.pointBuffer.push(coordinates[0]);
    } else if (nums.length >= 2) {
      ctx.pointBuffer.push({ x: nums[0], y: nums[1] });
    }
  } else if (command === 'line') {
    if (parsedArgs.hasReferences) {
      const { coordinates } = getReferencedCoordinates(parsedArgs, 2);
      const id = ctx.generateId(ShapeType.LINE);
      registerShape(ctx, { id, type: ShapeType.LINE, p1: coordinates[0], p2: coordinates[1], color, label, groupId }, parsedArgs.key);
    } else if (nums.length >= 4) {
      const id = ctx.generateId(ShapeType.LINE);
      registerShape(ctx, { id, type: ShapeType.LINE, p1: { x: nums[0], y: nums[1] }, p2: { x: nums[2], y: nums[3] }, color, label, groupId }, parsedArgs.key);
    }
  } else if (command === 'seg') {
    if (parsedArgs.hasReferences) {
      const { coordinates } = getReferencedCoordinates(parsedArgs, 2);
      const id = ctx.generateId(ShapeType.SEGMENT);
      registerShape(ctx, { id, type: ShapeType.SEGMENT, p1: coordinates[0], p2: coordinates[1], color, label, groupId }, parsedArgs.key);
    } else if (nums.length >= 4) {
      const id = ctx.generateId(ShapeType.SEGMENT);
      registerShape(ctx, { id, type: ShapeType.SEGMENT, p1: { x: nums[0], y: nums[1] }, p2: { x: nums[2], y: nums[3] }, color, label, groupId }, parsedArgs.key);
    }
  } else if (command === 'circle') {
    if (parsedArgs.hasReferences) {
      const { coordinates, params } = getReferencedCoordinates(parsedArgs, 1, 1);
      const id = ctx.generateId(ShapeType.CIRCLE);
      registerShape(ctx, { id, type: ShapeType.CIRCLE, x: coordinates[0].x, y: coordinates[0].y, r: params[0], color, label, groupId }, parsedArgs.key);
    } else if (nums.length >= 3) {
      const id = ctx.generateId(ShapeType.CIRCLE);
      registerShape(ctx, { id, type: ShapeType.CIRCLE, x: nums[0], y: nums[1], r: nums[2], color, label, groupId }, parsedArgs.key);
    }
  } else if (command === 'poly') {
    if (parsedArgs.hasReferences) {
      const points = getReferencedPolygonCoordinates(parsedArgs);
      const id = ctx.generateId(ShapeType.POLYGON);
      registerShape(ctx, { id, type: ShapeType.POLYGON, points, color, label, groupId }, parsedArgs.key);
    } else if (nums.length === 0) {
       if (ctx.pointBuffer.length > 0) {
           const id = ctx.generateId(ShapeType.POLYGON);
           registerShape(ctx, { id, type: ShapeType.POLYGON, points: ctx.pointBuffer.slice(), color, label, groupId }, parsedArgs.key);
           ctx.pointBuffer.length = 0; 
       }
    } else if (nums.length >= 6 && nums.length % 2 === 0) {
      const points = [];
      for(let k=0; k<nums.length; k+=2) {
        points.push({x: nums[k], y: nums[k+1]});
      }
      const id = ctx.generateId(ShapeType.POLYGON);
      registerShape(ctx, { id, type: ShapeType.POLYGON, points, color, label, groupId }, parsedArgs.key);
    }
  } else if (command === 'text') {
      if (parsedArgs.hasReferences && label) {
          const numericParamCount = nums.length > 0 ? 1 : 0;
          const { coordinates, params } = getReferencedCoordinates(parsedArgs, 1, numericParamCount);
          const id = ctx.generateId(ShapeType.TEXT);
          registerShape(ctx, {
              id, type: ShapeType.TEXT, x: coordinates[0].x, y: coordinates[0].y, content: label, fontSize: params[0] || 12, color, groupId
          }, parsedArgs.key);
      } else if (nums.length >= 2 && label) {
          const id = ctx.generateId(ShapeType.TEXT);
          registerShape(ctx, {
              id, type: ShapeType.TEXT, x: nums[0], y: nums[1], content: label, fontSize: nums[2] || 12, color, groupId
          }, parsedArgs.key);
      }
  }
}
