/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { createUsageCollectionSetupMock } from '@kbn/usage-collection-plugin/server/mocks';
import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';

const { makeUsageCollector } = createUsageCollectionSetupMock();

interface MyObject {
  total: number;
  type: boolean;
}

interface Usage {
  flat?: string;
  my_str?: string;
  my_objects: MyObject;
}

const SOME_NUMBER: number = 123;

const someSchema: MakeSchemaFrom<Pick<Usage, 'flat' | 'my_str'>> = {
  flat: {
    type: 'keyword',
  },
  my_str: {
    type: 'text',
  },
};

const someOtherSchema: MakeSchemaFrom<Pick<Usage, 'my_objects'>> = {
  my_objects: {
    total: {
      type: 'long',
    },
    type: { type: 'boolean' },
  },
};

export const myCollector = makeUsageCollector<Usage>({
  type: 'schema_defined_with_spreads',
  isReady: () => true,
  fetch() {
    const testString = '123';

    return {
      flat: 'hello',
      my_str: testString,
      my_objects: {
        total: SOME_NUMBER,
        type: true,
      },
    };
  },
  schema: {
    ...someSchema,
    ...someOtherSchema,
  },
});
