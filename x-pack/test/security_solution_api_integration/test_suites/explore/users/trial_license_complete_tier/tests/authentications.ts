/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  AuthStackByField,
  Direction,
  UserAuthenticationsStrategyResponse,
  UsersQueries,
} from '@kbn/security-solution-plugin/common/search_strategy';
import type { UserAuthenticationsRequestOptions } from '@kbn/security-solution-plugin/common/api/search_strategy';
import TestAgent from 'supertest/lib/agent';

import { SearchService } from '@kbn/ftr-common-functional-services';
import { FtrProviderContextWithSpaces } from '../../../../../ftr_provider_context_with_spaces';

const FROM = '2000-01-01T00:00:00.000Z';
const TO = '3000-01-01T00:00:00.000Z';

// typical values that have to change after an update from "scripts/es_archiver"
const HOST_NAME = 'zeek-newyork-sha-aa8df15';
const LAST_SUCCESS_SOURCE_IP = '8.42.77.171';
const TOTAL_COUNT = 3;
const EDGE_LENGTH = 1;

export default function ({ getService }: FtrProviderContextWithSpaces) {
  const esArchiver = getService('esArchiver');
  const utils = getService('securitySolutionUtils');

  describe('authentications', () => {
    let supertest: TestAgent;
    let search: SearchService;

    before(async () => {
      supertest = await utils.createSuperTest();
      search = await utils.createSearch();
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/auditbeat/hosts');
    });

    after(
      async () =>
        await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/auditbeat/hosts')
    );

    it('Make sure that we get Authentication data', async () => {
      const requestOptions: UserAuthenticationsRequestOptions = {
        factoryQueryType: UsersQueries.authentications,
        timerange: {
          interval: '12h',
          to: TO,
          from: FROM,
        },
        pagination: {
          activePage: 0,
          cursorStart: 0,
          fakePossibleCount: 3,
          querySize: 1,
        },
        defaultIndex: ['auditbeat-*'],
        stackByField: AuthStackByField.userName,
        sort: { field: 'timestamp', direction: Direction.asc },
        filterQuery: '',
      };

      const authentications = await search.send<UserAuthenticationsStrategyResponse>({
        supertest,
        options: requestOptions,
        strategy: 'securitySolutionSearchStrategy',
      });

      expect(authentications.edges.length).to.be(EDGE_LENGTH);
      expect(authentications.totalCount).to.be(TOTAL_COUNT);
      expect(authentications.pageInfo.fakeTotalCount).to.equal(3);
    });

    it('Make sure that pagination is working in Authentications query', async () => {
      const requestOptions: UserAuthenticationsRequestOptions = {
        factoryQueryType: UsersQueries.authentications,
        timerange: {
          interval: '12h',
          to: TO,
          from: FROM,
        },
        pagination: {
          activePage: 2,
          cursorStart: 1,
          fakePossibleCount: 5,
          querySize: 2,
        },
        defaultIndex: ['auditbeat-*'],
        stackByField: AuthStackByField.userName,
        sort: { field: 'timestamp', direction: Direction.asc },
        filterQuery: '',
      };

      const authentications = await search.send<UserAuthenticationsStrategyResponse>({
        supertest,
        options: requestOptions,
        strategy: 'securitySolutionSearchStrategy',
      });

      expect(authentications.edges.length).to.be(EDGE_LENGTH);
      expect(authentications.totalCount).to.be(TOTAL_COUNT);
      expect(authentications.edges[0].node.lastSuccess?.source?.ip).to.eql([
        LAST_SUCCESS_SOURCE_IP,
      ]);
      expect(authentications.edges[0].node.lastSuccess?.host?.name).to.eql([HOST_NAME]);
    });
  });
}
