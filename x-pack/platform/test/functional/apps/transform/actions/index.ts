/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const transform = getService('transform');

  describe('transform - actions', function () {
    this.tags('transform');

    before(async () => {
      await transform.securityCommon.createTransformRoles();
      await transform.securityCommon.createTransformUsers();
    });

    after(async () => {
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await transform.securityUI.logout();

      await transform.securityCommon.cleanTransformUsers();
      await transform.securityCommon.cleanTransformRoles();

      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/ml/farequote');
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/ml/ecommerce');

      await transform.testResources.resetKibanaTimeZone();
    });

    loadTestFile(require.resolve('./deleting'));
    loadTestFile(require.resolve('./reauthorizing'));
    loadTestFile(require.resolve('./resetting'));
    loadTestFile(require.resolve('./starting'));
  });
}
