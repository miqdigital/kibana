/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import path from 'path';

const PACKAGES_PATH = path.join(path.dirname(__filename), '../../fixtures/packages');

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(
    require.resolve('../../../../configs/ess/rules_management.basic.config')
  );

  return {
    ...functionalConfig.getAll(),
    testFiles: [
      require.resolve('../../import_export/import_with_installing_package'),
      require.resolve('../../prebuilt_rules_package/air_gapped'),
    ],
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),
        /*  Tests in this directory simulate an air-gapped environment in which the instance doesn't have access to EPR.
         *  To do that, we point the Fleet url to an invalid URL, and instruct Fleet to fetch bundled packages at the
         *  location defined in BUNDLED_PACKAGE_DIR.
         */
        `--xpack.fleet.isAirGapped=true`,
        `--xpack.fleet.developer.bundledPackageLocation=${PACKAGES_PATH}`,
      ],
    },
    junit: {
      reportName:
        'Rules Management - Prebuilt Rules (Common) Integration Tests - ESS Basic License (Air Gapped)',
    },
  };
}
