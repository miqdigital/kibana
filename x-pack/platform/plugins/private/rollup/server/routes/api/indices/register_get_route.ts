/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addBasePath } from '../../../services';
import { RouteDependencies } from '../../../types';

/**
 * Returns a list of all rollup index names
 */
export const registerGetRoute = ({
  router,
  license,
  lib: { handleEsError, getCapabilitiesForRollupIndices },
}: RouteDependencies) => {
  router.get(
    {
      // this endpoint is used by the data views plugin, see https://github.com/elastic/kibana/issues/152708
      path: addBasePath('/indices'),
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: false,
    },
    license.guardApiRoute(async (context, request, response) => {
      try {
        const { client: clusterClient } = (await context.core).elasticsearch;
        const data = await clusterClient.asCurrentUser.rollup.getRollupIndexCaps({
          index: '_all',
        });
        return response.ok({ body: getCapabilitiesForRollupIndices(data) });
      } catch (err) {
        return handleEsError({ error: err, response });
      }
    })
  );
};
