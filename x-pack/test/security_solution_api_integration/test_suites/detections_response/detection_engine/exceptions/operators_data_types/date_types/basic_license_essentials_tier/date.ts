/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  createListsIndex,
  deleteAllExceptions,
  deleteListsIndex,
  importFile,
} from '../../../../../../lists_and_exception_lists/utils';
import { createRuleWithExceptionEntries } from '../../../../../utils';
import {
  createRule,
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
  getRuleForAlertTesting,
  getAlertsById,
  waitForRuleSuccess,
  waitForAlertsToBePresent,
} from '../../../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const es = getService('es');

  describe('@serverless @serverlessQA @ess Rule exception operators for data type date', () => {
    before(async () => {
      await esArchiver.load(
        'x-pack/solutions/security/test/fixtures/es_archives/rule_exceptions/date'
      );
    });

    after(async () => {
      await esArchiver.unload(
        'x-pack/solutions/security/test/fixtures/es_archives/rule_exceptions/date'
      );
    });

    beforeEach(async () => {
      await createAlertsIndex(supertest, log);
      await createListsIndex(supertest, log);
    });

    afterEach(async () => {
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
      await deleteAllExceptions(supertest, log);
      await deleteListsIndex(supertest, log);
    });

    describe('"is" operator', () => {
      it('should find all the dates from the data set when no exceptions are set on the rule', async () => {
        const rule = getRuleForAlertTesting(['date']);
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 4, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.date).sort();
        expect(hits).to.eql([
          '2020-10-01T05:08:53.000Z',
          '2020-10-02T05:08:53.000Z',
          '2020-10-03T05:08:53.000Z',
          '2020-10-04T05:08:53.000Z',
        ]);
      });

      it('should filter 1 single date if it is set as an exception', async () => {
        const rule = getRuleForAlertTesting(['date']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'date',
              operator: 'included',
              type: 'match',
              value: '2020-10-01T05:08:53.000Z',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 3, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.date).sort();
        expect(hits).to.eql([
          '2020-10-02T05:08:53.000Z',
          '2020-10-03T05:08:53.000Z',
          '2020-10-04T05:08:53.000Z',
        ]);
      });

      it('should filter 2 dates if both are set as exceptions', async () => {
        const rule = getRuleForAlertTesting(['date']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'date',
              operator: 'included',
              type: 'match',
              value: '2020-10-01T05:08:53.000Z',
            },
          ],
          [
            {
              field: 'date',
              operator: 'included',
              type: 'match',
              value: '2020-10-02T05:08:53.000Z',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 2, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.date).sort();
        expect(hits).to.eql(['2020-10-03T05:08:53.000Z', '2020-10-04T05:08:53.000Z']);
      });

      it('should filter 3 dates if all 3 are set as exceptions', async () => {
        const rule = getRuleForAlertTesting(['date']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'date',
              operator: 'included',
              type: 'match',
              value: '2020-10-01T05:08:53.000Z',
            },
          ],
          [
            {
              field: 'date',
              operator: 'included',
              type: 'match',
              value: '2020-10-02T05:08:53.000Z',
            },
          ],
          [
            {
              field: 'date',
              operator: 'included',
              type: 'match',
              value: '2020-10-03T05:08:53.000Z',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 1, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.date).sort();
        expect(hits).to.eql(['2020-10-04T05:08:53.000Z']);
      });

      it('should filter 4 dates if all are set as exceptions', async () => {
        const rule = getRuleForAlertTesting(['date']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'date',
              operator: 'included',
              type: 'match',
              value: '2020-10-01T05:08:53.000Z',
            },
          ],
          [
            {
              field: 'date',
              operator: 'included',
              type: 'match',
              value: '2020-10-02T05:08:53.000Z',
            },
          ],
          [
            {
              field: 'date',
              operator: 'included',
              type: 'match',
              value: '2020-10-03T05:08:53.000Z',
            },
          ],
          [
            {
              field: 'date',
              operator: 'included',
              type: 'match',
              value: '2020-10-04T05:08:53.000Z',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.date).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"is not" operator', () => {
      it('will return 0 results if it cannot find what it is excluding', async () => {
        const rule = getRuleForAlertTesting(['date']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'date',
              operator: 'excluded',
              type: 'match',
              value: '2021-10-01T05:08:53.000Z', // date is not in data set
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.date).sort();
        expect(hits).to.eql([]);
      });

      it('will return just 1 result we excluded', async () => {
        const rule = getRuleForAlertTesting(['date']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'date',
              operator: 'excluded',
              type: 'match',
              value: '2020-10-01T05:08:53.000Z',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 1, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.date).sort();
        expect(hits).to.eql(['2020-10-01T05:08:53.000Z']);
      });

      it('will return 0 results if we exclude two dates', async () => {
        const rule = getRuleForAlertTesting(['date']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'date',
              operator: 'excluded',
              type: 'match',
              value: '2020-10-01T05:08:53.000Z',
            },
          ],
          [
            {
              field: 'date',
              operator: 'excluded',
              type: 'match',
              value: '2020-10-02T05:08:53.000Z',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.date).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"is one of" operator', () => {
      it('should filter 1 single date if it is set as an exception', async () => {
        const rule = getRuleForAlertTesting(['date']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'date',
              operator: 'included',
              type: 'match_any',
              value: ['2020-10-01T05:08:53.000Z'],
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 3, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.date).sort();
        expect(hits).to.eql([
          '2020-10-02T05:08:53.000Z',
          '2020-10-03T05:08:53.000Z',
          '2020-10-04T05:08:53.000Z',
        ]);
      });

      it('should filter 2 dates if both are set as exceptions', async () => {
        const rule = getRuleForAlertTesting(['date']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'date',
              operator: 'included',
              type: 'match_any',
              value: ['2020-10-01T05:08:53.000Z', '2020-10-02T05:08:53.000Z'],
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 2, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.date).sort();
        expect(hits).to.eql(['2020-10-03T05:08:53.000Z', '2020-10-04T05:08:53.000Z']);
      });

      it('should filter 3 dates if all 3 are set as exceptions', async () => {
        const rule = getRuleForAlertTesting(['date']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'date',
              operator: 'included',
              type: 'match_any',
              value: [
                '2020-10-01T05:08:53.000Z',
                '2020-10-02T05:08:53.000Z',
                '2020-10-03T05:08:53.000Z',
              ],
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 1, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.date).sort();
        expect(hits).to.eql(['2020-10-04T05:08:53.000Z']);
      });

      it('should filter 4 dates if all are set as exceptions', async () => {
        const rule = getRuleForAlertTesting(['date']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'date',
              operator: 'included',
              type: 'match_any',
              value: [
                '2020-10-01T05:08:53.000Z',
                '2020-10-02T05:08:53.000Z',
                '2020-10-03T05:08:53.000Z',
                '2020-10-04T05:08:53.000Z',
              ],
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.date).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"is not one of" operator', () => {
      it('will return 0 results if it cannot find what it is excluding', async () => {
        const rule = getRuleForAlertTesting(['date']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'date',
              operator: 'excluded',
              type: 'match_any',
              value: ['2021-10-01T05:08:53.000Z', '2022-10-01T05:08:53.000Z'],
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.date).sort();
        expect(hits).to.eql([]);
      });

      it('will return just the result we excluded', async () => {
        const rule = getRuleForAlertTesting(['date']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'date',
              operator: 'excluded',
              type: 'match_any',
              value: ['2020-10-01T05:08:53.000Z', '2020-10-04T05:08:53.000Z'],
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 2, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.date).sort();
        expect(hits).to.eql(['2020-10-01T05:08:53.000Z', '2020-10-04T05:08:53.000Z']);
      });
    });

    describe('"exists" operator', () => {
      it('will return 0 results if matching against date', async () => {
        const rule = getRuleForAlertTesting(['date']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'date',
              operator: 'included',
              type: 'exists',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.date).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"does not exist" operator', () => {
      it('will return 4 results if matching against date', async () => {
        const rule = getRuleForAlertTesting(['date']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'date',
              operator: 'excluded',
              type: 'exists',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 4, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.date).sort();
        expect(hits).to.eql([
          '2020-10-01T05:08:53.000Z',
          '2020-10-02T05:08:53.000Z',
          '2020-10-03T05:08:53.000Z',
          '2020-10-04T05:08:53.000Z',
        ]);
      });
    });

    describe('"is in list" operator', () => {
      it('will return 3 results if we have a list that includes 1 date', async () => {
        await importFile(supertest, log, 'date', ['2020-10-01T05:08:53.000Z'], 'list_items.txt');
        const rule = getRuleForAlertTesting(['date']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'date',
              list: {
                id: 'list_items.txt',
                type: 'date',
              },
              operator: 'included',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 3, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.date).sort();
        expect(hits).to.eql([
          '2020-10-02T05:08:53.000Z',
          '2020-10-03T05:08:53.000Z',
          '2020-10-04T05:08:53.000Z',
        ]);
      });

      it('will return 2 results if we have a list that includes 2 dates', async () => {
        await importFile(
          supertest,
          log,
          'date',
          ['2020-10-01T05:08:53.000Z', '2020-10-03T05:08:53.000Z'],
          'list_items.txt'
        );
        const rule = getRuleForAlertTesting(['date']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'date',
              list: {
                id: 'list_items.txt',
                type: 'date',
              },
              operator: 'included',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 2, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.date).sort();
        expect(hits).to.eql(['2020-10-02T05:08:53.000Z', '2020-10-04T05:08:53.000Z']);
      });

      it('will return 0 results if we have a list that includes all dates', async () => {
        await importFile(
          supertest,
          log,
          'date',
          [
            '2020-10-01T05:08:53.000Z',
            '2020-10-02T05:08:53.000Z',
            '2020-10-03T05:08:53.000Z',
            '2020-10-04T05:08:53.000Z',
          ],
          'list_items.txt'
        );
        const rule = getRuleForAlertTesting(['date']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'date',
              list: {
                id: 'list_items.txt',
                type: 'date',
              },
              operator: 'included',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.date).sort();
        expect(hits).to.eql([]);
      });
    });

    describe('"is not in list" operator', () => {
      it('will return 1 result if we have a list that excludes 1 date', async () => {
        await importFile(supertest, log, 'date', ['2020-10-01T05:08:53.000Z'], 'list_items.txt');
        const rule = getRuleForAlertTesting(['date']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'date',
              list: {
                id: 'list_items.txt',
                type: 'date',
              },
              operator: 'excluded',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 1, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.date).sort();
        expect(hits).to.eql(['2020-10-01T05:08:53.000Z']);
      });

      it('will return 2 results if we have a list that excludes 2 dates', async () => {
        await importFile(
          supertest,
          log,
          'date',
          ['2020-10-01T05:08:53.000Z', '2020-10-03T05:08:53.000Z'],
          'list_items.txt'
        );
        const rule = getRuleForAlertTesting(['date']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'date',
              list: {
                id: 'list_items.txt',
                type: 'date',
              },
              operator: 'excluded',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 2, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.date).sort();
        expect(hits).to.eql(['2020-10-01T05:08:53.000Z', '2020-10-03T05:08:53.000Z']);
      });

      it('will return 4 results if we have a list that excludes all dates', async () => {
        await importFile(
          supertest,
          log,
          'date',
          [
            '2020-10-01T05:08:53.000Z',
            '2020-10-02T05:08:53.000Z',
            '2020-10-03T05:08:53.000Z',
            '2020-10-04T05:08:53.000Z',
          ],
          'list_items.txt'
        );
        const rule = getRuleForAlertTesting(['date']);
        const { id } = await createRuleWithExceptionEntries(supertest, log, rule, [
          [
            {
              field: 'date',
              list: {
                id: 'list_items.txt',
                type: 'date',
              },
              operator: 'excluded',
              type: 'list',
            },
          ],
        ]);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForAlertsToBePresent(supertest, log, 4, [id]);
        const alertsOpen = await getAlertsById(supertest, log, id);
        const hits = alertsOpen.hits.hits.map((hit) => hit._source?.date).sort();
        expect(hits).to.eql([
          '2020-10-01T05:08:53.000Z',
          '2020-10-02T05:08:53.000Z',
          '2020-10-03T05:08:53.000Z',
          '2020-10-04T05:08:53.000Z',
        ]);
      });
    });
  });
};
