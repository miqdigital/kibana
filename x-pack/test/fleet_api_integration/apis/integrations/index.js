/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function loadTests({ loadTestFile }) {
  describe('Integrations', () => {
    loadTestFile(require.resolve('./elastic_agent'));
    loadTestFile(require.resolve('./inputs_with_standalone_docker_agent'));
  });
}
