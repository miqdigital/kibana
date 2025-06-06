/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import stripAnsi from 'strip-ansi';
import hasAnsi from 'has-ansi';
import { LogLevel, LogRecord } from '@kbn/logging';
import { PatternLayout } from './pattern_layout';

const stripAnsiSnapshotSerializer: jest.SnapshotSerializerPlugin = {
  serialize(value: string) {
    return stripAnsi(value);
  },

  test(value: any) {
    return typeof value === 'string' && hasAnsi(value);
  },
};

const timestamp = new Date(Date.UTC(2012, 1, 1, 14, 30, 22, 11));
const error = new Error('Meta error');
error.stack = 'Meta error stack';
const records: LogRecord[] = [
  {
    context: 'context-1',
    error: {
      message: 'Some error message',
      name: 'Some error name',
      stack: 'Some error stack',
    },
    meta: {
      error,
    },
    level: LogLevel.Fatal,
    message: 'message-1',
    timestamp,
    pid: 5355,
  },
  {
    context: 'context-2',
    level: LogLevel.Error,
    message: 'message-2',
    timestamp,
    pid: 5355,
  },
  {
    context: 'context-3',
    level: LogLevel.Warn,
    message: 'message-3',
    timestamp,
    pid: 5355,
  },
  {
    context: 'context-4',
    level: LogLevel.Debug,
    message: 'message-4',
    timestamp,
    pid: 5355,
  },
  {
    context: 'context-5',
    level: LogLevel.Info,
    message: 'message-5',
    timestamp,
    pid: 5355,
  },
  {
    context: 'context-6',
    level: LogLevel.Trace,
    message: 'message-6',
    timestamp,
    pid: 5355,
  },
];

expect.addSnapshotSerializer(stripAnsiSnapshotSerializer);

test('`format()` correctly formats record with full pattern.', () => {
  const layout = new PatternLayout();

  for (const record of records) {
    expect(layout.format(record)).toMatchSnapshot();
  }
});

test('`format()` correctly formats record with custom pattern.', () => {
  const layout = new PatternLayout({ pattern: 'mock-%message-%logger-%message' });

  for (const record of records) {
    expect(layout.format(record)).toMatchSnapshot();
  }
});

test('`format()` correctly formats record with meta data.', () => {
  const layout = new PatternLayout({ pattern: '[%date][%level][%logger]%meta %message' });

  expect(
    layout.format({
      context: 'context-meta',
      level: LogLevel.Debug,
      message: 'message-meta',
      timestamp,
      pid: 5355,
      meta: {
        // @ts-expect-error not valid ECS field
        from: 'v7',
        to: 'v8',
      },
    })
  ).toBe(
    '[2012-02-01T09:30:22.011-05:00][DEBUG][context-meta]{"from":"v7","to":"v8"} message-meta'
  );

  expect(
    layout.format({
      context: 'context-meta',
      level: LogLevel.Debug,
      message: 'message-meta',
      timestamp,
      pid: 5355,
      meta: {},
    })
  ).toBe('[2012-02-01T09:30:22.011-05:00][DEBUG][context-meta]{} message-meta');

  expect(
    layout.format({
      context: 'context-meta',
      level: LogLevel.Debug,
      message: 'message-meta',
      timestamp,
      pid: 5355,
    })
  ).toBe('[2012-02-01T09:30:22.011-05:00][DEBUG][context-meta] message-meta');
});

test('allows specifying the PID in custom pattern', () => {
  const layout = new PatternLayout({ pattern: '%pid-%logger-%message' });

  for (const record of records) {
    expect(layout.format(record)).toMatchSnapshot();
  }
});

test('`format()` allows specifying pattern with meta.', () => {
  const layout = new PatternLayout({ pattern: '%logger-%meta-%message' });
  const record = {
    context: 'context',
    level: LogLevel.Debug,
    message: 'message',
    timestamp,
    pid: 5355,
    meta: {
      from: 'v7',
      to: 'v8',
    },
  };
  // @ts-expect-error not valid ECS field
  expect(layout.format(record)).toBe('context-{"from":"v7","to":"v8"}-message');
});

describe('format', () => {
  describe('timestamp', () => {
    const record = {
      context: 'context',
      level: LogLevel.Debug,
      message: 'message',
      timestamp,
      pid: 5355,
    };
    it('uses ISO8601_TZ as default', () => {
      const layout = new PatternLayout();

      expect(layout.format(record)).toBe('[2012-02-01T09:30:22.011-05:00][DEBUG][context] message');
    });

    describe('supports specifying a predefined format', () => {
      it('ISO8601', () => {
        const layout = new PatternLayout({ pattern: '[%date{ISO8601}][%logger]' });

        expect(layout.format(record)).toBe('[2012-02-01T14:30:22.011Z][context]');
      });

      it('ISO8601_TZ', () => {
        const layout = new PatternLayout({ pattern: '[%date{ISO8601_TZ}][%logger]' });

        expect(layout.format(record)).toBe('[2012-02-01T09:30:22.011-05:00][context]');
      });

      it('ABSOLUTE', () => {
        const layout = new PatternLayout({ pattern: '[%date{ABSOLUTE}][%logger]' });

        expect(layout.format(record)).toBe('[09:30:22.011][context]');
      });

      it('UNIX', () => {
        const layout = new PatternLayout({ pattern: '[%date{UNIX}][%logger]' });

        expect(layout.format(record)).toBe('[1328106622][context]');
      });

      it('UNIX_MILLIS', () => {
        const layout = new PatternLayout({ pattern: '[%date{UNIX_MILLIS}][%logger]' });

        expect(layout.format(record)).toBe('[1328106622011][context]');
      });
    });

    describe('supports specifying a predefined format and timezone', () => {
      it('ISO8601', () => {
        const layout = new PatternLayout({
          pattern: '[%date{ISO8601}{America/Los_Angeles}][%logger]',
        });

        expect(layout.format(record)).toBe('[2012-02-01T14:30:22.011Z][context]');
      });

      it('ISO8601_TZ', () => {
        const layout = new PatternLayout({
          pattern: '[%date{ISO8601_TZ}{America/Los_Angeles}][%logger]',
        });

        expect(layout.format(record)).toBe('[2012-02-01T06:30:22.011-08:00][context]');
      });

      it('ABSOLUTE', () => {
        const layout = new PatternLayout({
          pattern: '[%date{ABSOLUTE}{America/Los_Angeles}][%logger]',
        });

        expect(layout.format(record)).toBe('[06:30:22.011][context]');
      });

      it('UNIX', () => {
        const layout = new PatternLayout({
          pattern: '[%date{UNIX}{America/Los_Angeles}][%logger]',
        });

        expect(layout.format(record)).toBe('[1328106622][context]');
      });

      it('UNIX_MILLIS', () => {
        const layout = new PatternLayout({
          pattern: '[%date{UNIX_MILLIS}{America/Los_Angeles}][%logger]',
        });

        expect(layout.format(record)).toBe('[1328106622011][context]');
      });
    });
    it('formats several conversions patterns correctly', () => {
      const layout = new PatternLayout({
        pattern: '[%date{ABSOLUTE}{America/Los_Angeles}][%logger][%date{UNIX}]',
      });

      expect(layout.format(record)).toBe('[06:30:22.011][context][1328106622]');
    });
  });
});
