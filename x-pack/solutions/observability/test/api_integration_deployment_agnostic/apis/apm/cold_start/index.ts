/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('cold_start', () => {
    loadTestFile(require.resolve('./cold_start.spec.ts'));
    loadTestFile(require.resolve('./cold_start_by_transaction_name.spec.ts'));
  });
}
