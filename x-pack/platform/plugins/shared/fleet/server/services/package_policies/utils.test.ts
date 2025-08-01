/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';

import { createPackageInfoMock } from '../../../common/mocks';
import { PackagePolicyMocks } from '../../mocks';

import { appContextService } from '../app_context';
import { licenseService } from '../license';
import { outputService } from '../output';

import {
  canDeployCustomPackageAsAgentlessOrThrow,
  mapPackagePolicySavedObjectToPackagePolicy,
  preflightCheckPackagePolicy,
} from './utils';

describe('Package Policy Utils', () => {
  describe('mapPackagePolicySavedObjectToPackagePolicy()', () => {
    it('should return only exposed SO properties', () => {
      const soItem =
        PackagePolicyMocks.generatePackagePolicySavedObjectFindResponse().saved_objects.at(0)!;

      expect(mapPackagePolicySavedObjectToPackagePolicy(soItem)).toEqual({
        agents: 2,
        created_at: '2024-01-24T15:21:13.389Z',
        created_by: 'elastic',
        description: 'Policy for things',
        elasticsearch: {
          privileges: {
            cluster: [],
          },
        },
        enabled: true,
        id: 'so-123',
        inputs: [],
        is_managed: false,
        name: 'Package Policy 1',
        namespace: 'default',
        package: {
          name: 'endpoint',
          title: 'Elastic Endpoint',
          version: '1.0.0',
        },
        policy_id: '444-555-666',
        policy_ids: ['444-555-666'],
        output_id: 'output-123',
        revision: 1,
        secret_references: [],
        updated_at: '2024-01-25T15:21:13.389Z',
        updated_by: 'user-a',
        vars: {},
        version: 'abc',
      });
    });
  });

  describe('preflightCheckPackagePolicy', () => {
    beforeEach(() => {
      jest.spyOn(licenseService, 'hasAtLeast').mockClear();
      jest.spyOn(appContextService, 'getExperimentalFeatures').mockClear();
    });
    const soClient = savedObjectsClientMock.create();
    const testPolicy = {
      name: 'Test Package Policy',
      namespace: 'test',
      enabled: true,
      policy_ids: ['test'],
      inputs: [],
      package: {
        name: 'test',
        title: 'Test',
        version: '0.0.1',
      },
    };

    it('should throw if no enterprise license and multiple policy_ids is provided', async () => {
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(false);

      await expect(
        preflightCheckPackagePolicy(soClient, { ...testPolicy, policy_ids: ['1', '2'] })
      ).rejects.toThrowError(
        'Reusable integration policies are only available with an Enterprise license'
      );
    });

    it('should throw if no enterprise license and no policy_ids is provided', async () => {
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(false);

      await expect(
        preflightCheckPackagePolicy(soClient, { ...testPolicy, policy_ids: [] })
      ).rejects.toThrowError(
        'Reusable integration policies are only available with an Enterprise license'
      );
    });

    it('should not throw if enterprise license and multiple policy_ids is provided', async () => {
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(true);
      await expect(
        preflightCheckPackagePolicy(soClient, { ...testPolicy, policy_ids: ['1', '2'] })
      ).resolves.not.toThrow();
    });

    it('should not throw if enterprise license and no policy_ids is provided', async () => {
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(true);
      await expect(
        preflightCheckPackagePolicy(soClient, { ...testPolicy, policy_ids: [] })
      ).resolves.not.toThrow();
    });

    it('should throw if no valid license and output_id is provided', async () => {
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(false);

      await expect(
        preflightCheckPackagePolicy(soClient, { ...testPolicy, output_id: 'some-output' })
      ).rejects.toThrowError('Output per integration is only available with an enterprise license');
    });

    it('should throw if valid license and an incompatible output_id for the package is given', async () => {
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(true);
      jest
        .spyOn(outputService, 'get')
        .mockResolvedValueOnce({ id: 'non-es-output', type: 'kafka' } as any);

      await expect(
        preflightCheckPackagePolicy(soClient, {
          ...testPolicy,
          output_id: 'non-es-output',
          package: { name: 'apm', version: '1.0.0', title: 'APM' },
        })
      ).rejects.toThrowError('Output type "kafka" is not usable with package "apm"');
    });

    it('should throw if content package is being used', async () => {
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(true);
      jest
        .spyOn(outputService, 'get')
        .mockResolvedValueOnce({ id: 'es-output', type: 'elasticsearch' } as any);
      await expect(
        preflightCheckPackagePolicy(
          soClient,
          {
            ...testPolicy,
            output_id: 'es-output',
          },
          {
            type: 'content',
          }
        )
      ).rejects.toThrowError('Cannot create policy for content only packages');
    });

    it('should not throw if valid license and valid output_id is provided and is not content package', async () => {
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(true);
      jest
        .spyOn(outputService, 'get')
        .mockResolvedValueOnce({ id: 'es-output', type: 'elasticsearch' } as any);
      await expect(
        preflightCheckPackagePolicy(
          soClient,
          {
            ...testPolicy,
            output_id: 'es-output',
          },
          {
            type: 'integration',
          }
        )
      ).resolves.not.toThrow();
    });
  });
});

describe('canDeployAsAgentlessOrThrow', () => {
  const getTestPolicy = (supportsAgentless: boolean = true) => ({
    name: 'Test Package Policy',
    namespace: 'test',
    enabled: true,
    policy_ids: ['test'],
    inputs: [],
    package: {
      name: 'test',
      title: 'Test',
      version: '0.0.1',
    },
    supports_agentless: supportsAgentless,
  });

  const getMockConfig = (agentlessCustomIntegrations: boolean = false) => ({
    enabled: true,
    agents: { enabled: true, elasticsearch: {} },
    agentless: { enabled: true, customIntegrations: { enabled: agentlessCustomIntegrations } },
  });

  it('should throw if policy supports agentless, is custom package, and is not allowed', () => {
    jest.spyOn(appContextService, 'getConfig').mockReturnValue(getMockConfig());
    let error = null;
    try {
      canDeployCustomPackageAsAgentlessOrThrow(
        getTestPolicy(),
        createPackageInfoMock({ installSource: 'custom' })
      );
    } catch (e) {
      error = e;
    }

    expect(error).not.toBe(null);
  });

  it('should not throw if policy supports agentless, is not custom package, and is not allowed', () => {
    jest.spyOn(appContextService, 'getConfig').mockReturnValue(getMockConfig());
    let error = null;
    try {
      canDeployCustomPackageAsAgentlessOrThrow(getTestPolicy(), createPackageInfoMock());
    } catch (e) {
      error = e;
    }

    expect(error).toBe(null);
  });

  it('should not throw if policy does not support agentless, is custom package, and is not allowed', () => {
    jest.spyOn(appContextService, 'getConfig').mockReturnValue(getMockConfig());
    let error = null;
    try {
      canDeployCustomPackageAsAgentlessOrThrow(
        getTestPolicy(false),
        createPackageInfoMock({ installSource: 'upload' })
      );
    } catch (e) {
      error = e;
    }

    expect(error).toBe(null);
  });

  it('should not throw if policy supports agentless, is custom package, and is allowed', () => {
    jest.spyOn(appContextService, 'getConfig').mockReturnValue(getMockConfig(true));
    let error = null;
    try {
      canDeployCustomPackageAsAgentlessOrThrow(
        getTestPolicy(),
        createPackageInfoMock({ installSource: 'custom' })
      );
    } catch (e) {
      error = e;
    }

    expect(error).toBe(null);
  });
});
