// @flow

import type { Value } from './types';
const toString = String;

function getCase(input: string): string {
  if (input.toLowerCase() === input) {
    return 'lower';
  }

  if (input.toUpperCase() === input) {
    return 'upper';
  }

  return 'title';
}

function getWhitespace(input: string): string {
  const whitespace = input.match(/^(\s+)/);
  if (!whitespace) {
    throw new Error();
  }

  return whitespace[0];
}

const valueParsers = [
  { // multiline literal
    test: /^(\|)\r?\n(.+)$/s,
    value: (_, token: string, input: string): { value: string, metadata: string } => {
      const prefix = getWhitespace(input);

      return {
        value: input.split('\n').map(l => l.slice(prefix.length)).join('\n'),
        metadata: `multiline-literal-${prefix}`,
      };
    },
  },
  { // multiline folded
    test: /^(>)\r?\n(.+)$/s,
    value: (_, token: string, input: string): { value: string, metadata: string } => {
      const prefix = getWhitespace(input);
      const lines = input.split('\n');

      return {
        value: input.split('\n').map(l => l.slice(prefix.length)).join(' '),
        metadata: `multiline-${token === '>' ? 'folded' : 'literal'}-${Math.max(...lines.map(v => v.length))}-${prefix}`,
      };
    },
  },
  { // null
    test: /^(null|Null|NULL|~|)$/,
    value: (input: string): { value: null, metadata: string } => ({
      value: null,
      metadata: input.length > 1 ? getCase(input) : input,
    }),
  },
  { // nan
    test: /^(nan|NaN|NAN)$/,
    value: (input: string): { value: null, metadata: string } => ({
      value: null,
      metadata: getCase(input),
    }),
  },
  { // infinity
    test: /^[-+]?(\.inf|\.Inf|\.INF)$/,
    value: (input: string): { value: number, metadata: string } => ({
      value: input[0] === '-' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      metadata: getCase(input.slice(-3)),
    }),
  },
  { // true
    test: /^(true|True|TRUE)$/,
    value: (input: string): { value: bool, metadata: string } => ({
      value: true,
      metadata: getCase(input),
    }),
  },
  { // false
    test: /^(false|False|FALSE)$/,
    value: (input: string): { value: bool, metadata: string } => ({
      value: false,
      metadata: getCase(input),
    }),
  },
  { // integer 10
    test: /^([-+]?[0-9]+)$/,
    value: (_, input: string): { value: number, metadata: string } => ({
      value: parseInt(input, 10),
      metadata: `integer-10-${input.length}`,
    }),
  },
  { // integer 8
    test: /^0o([0-7]+)$/,
    value: (_, input: string): { value: number, metadata: string } => ({
      value: parseInt(input, 8),
      metadata: `integer-8-${input.length}`,
    }),
  },
  { // integer 16
    test: /^0x([0-9a-fA-F]+)$/,
    value: (_, input: string): { value: number, metadata: string } => ({
      value: parseInt(input, 16),
      metadata: `integer-16-${input.toLowerCase() === input ? 'lower' : 'upper'}-${input.length}`,
    }),
  },
  { // float
    test: /^[-+]?(\.[0-9]+|[0-9]+(?:\.[0-9]*)?)([eE][-+]?[0-9]+)?$/,
    value: (input: string, value: string, exp: string): { value: number, metadata: string } => ({
      value: parseFloat(input),
      metadata: `float-${exp || ''}-${value.slice(value.indexOf('.') + 1).length}`,
    }),
  },
];

const integerPrefixes = {
  '8' : '0o',
  '16': '0x',
};

export function parseValue(token: string): { value: Value, metadata: string } {
  for (const { test, value } of valueParsers) {
    const match = token.match(test);
    if (match) {
      return value(...match);
    }
  }

  return { value: token, metadata: '' };
}

export function stringifyValue(value: Value, metadata: string): string {
  if (typeof metadata === 'undefined') {
    return value;
  }

  if (value === null) {
    if (metadata === '~' || metadata === '') {
      return metadata;
    }
  }

  if (metadata === 'lower') {
    return toString(value).toLowerCase();
  }

  if (metadata === 'upper') {
    return toString(value).toUpperCase();
  }

  if (metadata === 'title') {
    return toString(value).replace(/\w\S*/g, (word) => {
      return word[0].toUpperCase() + word.slice(1).toLowerCase();
    });
  }

  const multilineLiteral = metadata.match(/^multiline-literal-(\s+)$/);
  if (multilineLiteral) {
    const prefix = multilineLiteral[1];

    return `|\n${value.split('\n').map(v => `${prefix}${v}`).join('\n')}`;
  }

  const multilineFolded = metadata.match(/^multiline-folded-([0-9]+)-(\s+)$/);
  if (multilineFolded) {
    const length = parseInt(multilineFolded[1]);
    const prefix = multilineFolded[2];
    const lines = [];

    let index = -1;
    while (index < value.length) {
      const next = value.lastIndexOf(' ', index + 1 + length);
      if (next === -1 || next === index || index + length > value.length) {
        lines.push(`${prefix}${value.slice(index + 1)}`);
        index = value.length;
      }
      else {
        lines.push(`${prefix}${value.slice(index + 1, next)}`);
        index = next;
      }
    }

    return `>\n${lines.join('\n')}`;
  }

  const integerTest = metadata.match(/^integer-([0-9]+)(-.+)?$/);
  if (integerTest) {
    const integer = parseInt(integerTest[1]);
    const options = integerTest[2];

    const prefix = integerPrefixes[integer] || '';
    let output = value.toString(integer);

    if (options) {
      if (options.includes('-upper-')) {
        output = output.toUpperCase();
      }
      if (options.includes('-lower-')) {
        output = output.toLowerCase();
      }

      const lengthTest = options.match(/-([0-9]+)$/);
      if (lengthTest) {
        const length = parseInt(lengthTest[1]);

        while (output.length < length) {
          output = `0${output}`;
        }
      }
    }

    return `${prefix}${output}`;
  }

  const float = metadata.match(/^float-(?:e([-+]?[0-9]+))?-([0-9]+)$/);
  if (float) {
    const points = parseInt(float[2]);

    const pow10 = parseInt(float[1]);
    if (pow10) {
      return `${(value / Math.pow(10, pow10)).toFixed(points)}e${float[1]}`;
    }

    return value.toFixed(points);
  }

  if (typeof value === 'string' && value.includes('\\') || value.includes('\n')) {
    return JSON.stringify(value).replace(/\\\\/g, '\\');
  }

  return toString(value);
}