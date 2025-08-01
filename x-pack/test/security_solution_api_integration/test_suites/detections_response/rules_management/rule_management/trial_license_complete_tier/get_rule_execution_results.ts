/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import dateMath from '@kbn/datemath';
import expect from '@kbn/expect';
import moment from 'moment';
import { set } from '@kbn/safer-lodash-set';
import { v4 as uuidv4 } from 'uuid';
import { getRuleExecutionResultsUrl } from '@kbn/security-solution-plugin/common/api/detection_engine/rule_monitoring';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import {
  deleteAllEventLogExecutionEvents,
  indexEventLogExecutionEvents,
  waitForEventLogExecuteComplete,
} from '../../../utils';
import {
  createRule,
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
  getRuleForAlertTesting,
  waitForRulePartialFailure,
  waitForRuleSuccess,
  manualRuleRun,
} from '../../../../../../common/utils/security_solution';
import {
  failedGapExecution,
  failedRanAfterDisabled,
  successfulExecution,
} from './template_data/execution_events';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { EsArchivePathBuilder } from '../../../../../es_archive_path_builder';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');
  // TODO: add a new service for loading archiver files similar to "getService('es')"
  const config = getService('config');
  const isServerless = config.get('serverless');
  const dataPathBuilder = new EsArchivePathBuilder(isServerless);
  const auditbeatPath = dataPathBuilder.getPath('auditbeat/hosts');

  // FLAKY: https://github.com/elastic/kibana/issues/177223
  // Failing: See https://github.com/elastic/kibana/issues/177223
  describe.skip('@ess @serverless Get Rule Execution Results', () => {
    before(async () => {
      await esArchiver.load(auditbeatPath);
      await esArchiver.load(
        'x-pack/solutions/security/test/fixtures/es_archives/security_solution/alias'
      );
      await createAlertsIndex(supertest, log);
    });

    after(async () => {
      await esArchiver.unload(auditbeatPath);
      await esArchiver.unload(
        'x-pack/solutions/security/test/fixtures/es_archives/security_solution/alias'
      );
      await deleteAllAlerts(supertest, log, es);
    });

    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllEventLogExecutionEvents(es, log);
    });

    it('should return an error if rule does not exist', async () => {
      const start = dateMath.parse('now-24h')?.utc().toISOString();
      const end = dateMath.parse('now', { roundUp: true })?.utc().toISOString();
      const response = await supertest
        .get(getRuleExecutionResultsUrl('1'))
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .query({ start, end });

      expect(response.status).to.eql(404);
      expect(response.text).to.eql(
        '{"message":"Saved object [alert/1] not found","status_code":404}'
      );
    });

    it('should return execution events for a rule that has executed successfully', async () => {
      const rule = {
        ...getRuleForAlertTesting(['auditbeat-*']),
        query: 'process.executable: "/usr/bin/sudo"',
      };
      const { id } = await createRule(supertest, log, rule);
      await waitForRuleSuccess({ supertest, log, id });
      await waitForEventLogExecuteComplete(es, log, id);

      const start = dateMath.parse('now-24h')?.utc().toISOString();
      const end = dateMath.parse('now', { roundUp: true })?.utc().toISOString();
      const response = await supertest
        .get(getRuleExecutionResultsUrl(id))
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .query({ start, end });

      expect(response.status).to.eql(200);
      expect(response.body.total).to.eql(1);
      expect(response.body.events[0].duration_ms).to.greaterThan(0);
      expect(response.body.events[0].search_duration_ms).to.greaterThan(0);
      expect(response.body.events[0].schedule_delay_ms).to.greaterThan(0);
      expect(response.body.events[0].indexing_duration_ms).to.greaterThan(0);
      expect(response.body.events[0].gap_duration_s).to.eql(0);
      expect(response.body.events[0].security_status).to.eql('succeeded');
      expect(response.body.events[0].security_message).to.eql(
        'Rule execution completed successfully'
      );
    });

    it('should return execution events for a rule that has executed in a warning state', async () => {
      const rule = getRuleForAlertTesting(['no-name-index']);
      const { id } = await createRule(supertest, log, rule);
      await waitForRulePartialFailure({ supertest, log, id });
      await waitForEventLogExecuteComplete(es, log, id);

      const start = dateMath.parse('now-24h')?.utc().toISOString();
      const end = dateMath.parse('now', { roundUp: true })?.utc().toISOString();
      const response = await supertest
        .get(getRuleExecutionResultsUrl(id))
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .query({ start, end });

      expect(response.status).to.eql(200);
      expect(response.body.total).to.eql(1);
      expect(response.body.events[0].duration_ms).to.greaterThan(0);
      expect(response.body.events[0].search_duration_ms).to.eql(0);
      expect(response.body.events[0].schedule_delay_ms).to.greaterThan(0);
      expect(response.body.events[0].indexing_duration_ms).to.eql(0);
      expect(response.body.events[0].gap_duration_s).to.eql(0);
      expect(response.body.events[0].security_status).to.eql('partial failure');
      expect(
        response.body.events[0].security_message.startsWith(
          'This rule is attempting to query data from Elasticsearch indices listed in the "Index patterns" section of the rule definition, however no index matching: ["no-name-index"] was found.'
        )
      ).to.eql(true);
    });

    it('should return execution events for a rule that has executed in a failure state with a gap', async () => {
      const rule = getRuleForAlertTesting(['auditbeat-*'], uuidv4(), false);
      const { id } = await createRule(supertest, log, rule);

      const start = dateMath.parse('now')?.utc().toISOString();
      const end = dateMath.parse('now+24h', { roundUp: true })?.utc().toISOString();

      // Create 5 timestamps (failedGapExecution.length) a minute apart to use in the templated data
      const dateTimes = [...Array(failedGapExecution.length).keys()].map((i) =>
        moment(start)
          .add(i + 1, 'm')
          .toDate()
          .toISOString()
      );

      const events = failedGapExecution.map((e, i) => {
        set(e, '@timestamp', dateTimes[i]);
        set(e, 'event.start', dateTimes[i]);
        set(e, 'event.end', dateTimes[i]);
        set(e, 'rule.id', id);
        set(e, 'kibana.saved_objects[0].id', id);
        return e;
      });

      await indexEventLogExecutionEvents(es, log, events);
      await waitForEventLogExecuteComplete(es, log, id);

      const response = await supertest
        .get(getRuleExecutionResultsUrl(id))
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .query({ start, end });

      expect(response.status).to.eql(200);
      expect(response.body.total).to.eql(1);
      expect(response.body.events[0].duration_ms).to.eql(1545);
      expect(response.body.events[0].search_duration_ms).to.eql(0);
      expect(response.body.events[0].schedule_delay_ms).to.eql(544808);
      expect(response.body.events[0].indexing_duration_ms).to.eql(0);
      expect(response.body.events[0].gap_duration_s).to.eql(245);
      expect(response.body.events[0].security_status).to.eql('failed');
      expect(
        response.body.events[0].security_message.startsWith(
          '4 minutes (244689ms) were not queried between this rule execution and the last execution, so signals may have been missed. Consider increasing your look behind time or adding more Kibana instances.'
        )
      ).to.eql(true);
    });

    // For details, see: https://github.com/elastic/kibana/issues/131382
    it('should return execution events ordered by @timestamp desc when a status filter is active and there are more than 1000 executions', async () => {
      const rule = getRuleForAlertTesting(['auditbeat-*'], uuidv4(), false);
      const { id } = await createRule(supertest, log, rule);

      // Daterange for which we'll generate execution events between
      const start = dateMath.parse('now')?.utc().toISOString();
      const end = dateMath.parse('now+24d', { roundUp: true })?.utc().toISOString();

      // 1002 total executions total, one minute apart
      const dateTimes = [...Array(1002).keys()].map((i) =>
        moment(start)
          .add(i + 1, 'm')
          .toDate()
          .toISOString()
      );

      // Create 1000 successful executions
      const events = dateTimes.slice(0, 1000).flatMap((dateTime) => {
        const executionId = uuidv4();
        return cloneDeep(successfulExecution).map((e, i) => {
          set(e, '@timestamp', dateTime);
          set(e, 'event.start', dateTime);
          set(e, 'event.end', dateTime);
          set(e, 'rule.id', id);
          set(e, 'kibana.saved_objects[0].id', id);
          set(e, 'kibana.alert.rule.execution.uuid', executionId);
          return e;
        });
      });

      await indexEventLogExecutionEvents(es, log, events);

      // Create 2 failed executions
      const failedEvents = dateTimes.slice(1000).flatMap((dateTime) => {
        const executionId = uuidv4();
        return cloneDeep(failedRanAfterDisabled).map((e, i) => {
          set(e, '@timestamp', dateTime);
          set(e, 'event.start', dateTime);
          set(e, 'event.end', dateTime);
          set(e, 'rule.id', id);
          set(e, 'kibana.saved_objects[0].id', id);
          set(e, 'kibana.alert.rule.execution.uuid', executionId);
          return e;
        });
      });

      await indexEventLogExecutionEvents(es, log, failedEvents);
      await waitForEventLogExecuteComplete(es, log, id, 1002);

      // Be sure to provide between 1-2 filters so that the server must prefetch events
      const response = await supertest
        .get(getRuleExecutionResultsUrl(id))
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .query({ start, end, status_filters: 'failed,succeeded' });

      // Verify the most recent execution was one of the failedRanAfterDisabled executions, which have a duration of 3ms and are made up of 2 docs per execution,
      // and not one of the successfulExecution executions, which have a duration of 3183ms and are made up of 5 docs per execution
      // The bug was because the prefetch of events was sorted by doc count by default, not `@timestamp`, which would result in the successful events pushing the 2 more recent
      // failed events out of the 1000 query size of the prefetch query, which would result in only the successful executions being returned even though there were more recent
      // failed executions
      expect(response.body.total).to.eql(1002);
      expect(response.body.events[0].duration_ms).to.eql(3);
    });

    it('should return execution events with backfill information', async () => {
      const rule = {
        ...getRuleForAlertTesting(['auditbeat-*']),
        query: 'process.executable: "/usr/bin/sudo"',
      };
      const { id } = await createRule(supertest, log, rule);
      const fromManualRuleRun = dateMath.parse('now-1m')?.utc().toISOString() ?? '';
      const toManualRuleRun = dateMath.parse('now', { roundUp: true })?.utc().toISOString() ?? '';
      await manualRuleRun({
        ruleId: id,
        supertest,
        start: fromManualRuleRun,
        end: toManualRuleRun,
      });

      await waitForRuleSuccess({ supertest, log, id });
      await waitForEventLogExecuteComplete(es, log, id, 1, 'execute-backfill');

      const start = dateMath.parse('now-24h')?.utc().toISOString();
      const end = dateMath.parse('now', { roundUp: true })?.utc().toISOString();
      const response = await supertest
        .get(getRuleExecutionResultsUrl(id))
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .query({ start, end, run_type_filters: ['backfill'] });

      expect(response.status).to.eql(200);
      expect(response.body.total).to.eql(1);
      expect(response.body.events[0].duration_ms).to.greaterThan(0);
      expect(response.body.events[0].search_duration_ms).to.greaterThan(0);
      expect(response.body.events[0].schedule_delay_ms).to.greaterThan(0);
      expect(response.body.events[0].indexing_duration_ms).to.greaterThan(0);
      expect(response.body.events[0].gap_duration_s).to.eql(0);
      expect(response.body.events[0].security_status).to.eql('succeeded');
      expect(response.body.events[0].security_message).to.eql(
        'Rule execution completed successfully'
      );
      const backfillStart = moment(fromManualRuleRun).add(5, 'm').toISOString();
      expect(response.body.events[0].backfill.to).to.eql(backfillStart);
      expect(response.body.events[0].backfill.from).to.eql(fromManualRuleRun);
    });

    it('should reflect run_type_filters in params', async () => {
      const rule = {
        ...getRuleForAlertTesting(['auditbeat-*']),
        query: 'process.executable: "/usr/bin/sudo"',
      };
      const { id } = await createRule(supertest, log, rule);
      const startManualRuleRun = dateMath.parse('now-1m')?.utc().toISOString() ?? '';
      const endManualRuleRun = dateMath.parse('now', { roundUp: true })?.utc().toISOString() ?? '';
      await manualRuleRun({
        ruleId: id,
        supertest,
        start: startManualRuleRun,
        end: endManualRuleRun,
      });
      await waitForRuleSuccess({ supertest, log, id });
      await waitForEventLogExecuteComplete(es, log, id, 1, 'execute-backfill');

      const start = dateMath.parse('now-24h')?.utc().toISOString();
      const end = dateMath.parse('now', { roundUp: true })?.utc().toISOString();
      const responseWithAllRunTypes = await supertest
        .get(getRuleExecutionResultsUrl(id))
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .query({ start, end, run_type_filters: [] });

      expect(responseWithAllRunTypes.status).to.eql(200);
      expect(responseWithAllRunTypes.body.total).to.eql(2);

      const responseWithOnlyStandard = await supertest
        .get(getRuleExecutionResultsUrl(id))
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .query({ start, end, run_type_filters: ['standard'] });

      expect(responseWithOnlyStandard.status).to.eql(200);
      expect(responseWithOnlyStandard.body.total).to.eql(1);
    });
  });
};
