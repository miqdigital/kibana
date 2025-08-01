/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { hasTestsInPlaywrightConfig } from './run_tests';
import { execPromise } from '../utils';

jest.mock('../utils', () => ({
  execPromise: jest.fn(),
}));

describe('hasTestsInPlaywrightConfig', () => {
  let mockLog: ToolingLog;
  const execPromiseMock = execPromise as jest.Mock;

  beforeEach(() => {
    mockLog = {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    } as unknown as ToolingLog;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it(`should log the last line of stdout when tests are found and return '0'`, async () => {
    execPromiseMock.mockImplementationOnce(() =>
      Promise.resolve({
        stdout: 'Listing tests:\n[local] > spec.ts > Suite > Test\nTotal: 1 test in 1 file\n',
        stderr: '',
      })
    );

    const exitCode = await hasTestsInPlaywrightConfig(
      mockLog,
      'playwright',
      ['test pwArgs'],
      'configPath/playwright.config.ts'
    );

    expect(mockLog.debug).toHaveBeenCalledWith(
      `scout: running 'SCOUT_REPORTER_ENABLED=false playwright test pwArgs --list'`
    );
    expect(mockLog.info).toHaveBeenCalledTimes(2);
    expect(mockLog.info).toHaveBeenNthCalledWith(1, 'scout: Validate Playwright config has tests');
    expect(mockLog.info).toHaveBeenNthCalledWith(2, 'scout: Total: 1 test in 1 file');
    expect(exitCode).toEqual(0);
  });

  it(`should log an error and return '2' when no tests are found`, async () => {
    execPromiseMock.mockRejectedValueOnce(new Error('No tests found'));

    const exitCode = await hasTestsInPlaywrightConfig(
      mockLog,
      'playwright',
      ['test pwArgs'],
      'configPath/playwright.config.ts'
    );

    expect(mockLog.info).toHaveBeenCalledWith('scout: Validate Playwright config has tests');
    expect(mockLog.error).toHaveBeenCalledWith(
      'scout: No tests found in [configPath/playwright.config.ts]'
    );
    expect(exitCode).toEqual(2);
  });

  it(`should log an error and return '1' when test command throws error`, async () => {
    execPromiseMock.mockRejectedValueOnce(new Error(`unknown command 'test'`));

    const exitCode = await hasTestsInPlaywrightConfig(
      mockLog,
      'playwright',
      ['test pwArgs'],
      'configPath/playwright.config.ts'
    );

    expect(mockLog.info).toHaveBeenCalledWith('scout: Validate Playwright config has tests');
    expect(mockLog.error).toHaveBeenCalledWith(
      expect.stringMatching(/^scout: Playwright CLI is probably broken\./)
    );
    expect(exitCode).toEqual(1);
  });

  it(`should log an error and return '1' when unknown error occurs`, async () => {
    execPromiseMock.mockRejectedValueOnce(new Error(`unknown error`));

    const exitCode = await hasTestsInPlaywrightConfig(
      mockLog,
      'playwright',
      ['test pwArgs'],
      'configPath/playwright.config.ts'
    );

    expect(mockLog.info).toHaveBeenCalledWith('scout: Validate Playwright config has tests');
    expect(mockLog.error).toHaveBeenCalledWith(
      expect.stringMatching(/^scout: Unknown error occurred\./)
    );
    expect(exitCode).toEqual(1);
  });
});
