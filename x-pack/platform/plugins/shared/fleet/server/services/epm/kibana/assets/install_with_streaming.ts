/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import type { PackageInstallContext } from '../../../../../common/types';
import {
  KibanaSavedObjectType,
  type KibanaAssetReference,
  type KibanaAssetType,
  type PackageSpecTags,
} from '../../../../types';
import { getPathParts } from '../../archive';
import { appContextService } from '../../../app_context';

import { saveKibanaAssetsRefs } from '../../packages/install';

import type { ArchiveAsset, InstallAssetContext } from './install';
import {
  KibanaSavedObjectTypeMapping,
  createSavedObjectKibanaAsset,
  installManagedIndexPattern,
  isKibanaAssetType,
  toAssetReference,
} from './install';
import { getSpaceAwareSaveobjectsClients } from './saved_objects';

interface InstallKibanaAssetsWithStreamingArgs {
  pkgName: string;
  packageInstallContext: PackageInstallContext;
  spaceId: string;
  assetTags?: PackageSpecTags[];
  savedObjectsClient: SavedObjectsClientContract;
}

const MAX_ASSETS_TO_INSTALL_IN_PARALLEL = 100;

export async function installKibanaAssetsWithStreaming({
  spaceId,
  packageInstallContext,
  savedObjectsClient,
  assetTags,
  pkgName,
}: InstallKibanaAssetsWithStreamingArgs): Promise<KibanaAssetReference[]> {
  const { archiveIterator } = packageInstallContext;

  const { savedObjectClientWithSpace, savedObjectsImporter } =
    getSpaceAwareSaveobjectsClients(spaceId);

  await installManagedIndexPattern({
    savedObjectsImporter,
    savedObjectsClient,
  });

  const assetRefs: KibanaAssetReference[] = [];
  let batch: ArchiveAsset[] = [];

  const context: InstallAssetContext = {
    pkgName,
    spaceId,
    assetTags,
  };

  await archiveIterator.traverseEntries(async ({ path, buffer }) => {
    if (!buffer || !isKibanaAssetType(path)) {
      return;
    }
    const savedObject = JSON.parse(buffer.toString('utf8')) as ArchiveAsset;
    const assetType = getPathParts(path).type as KibanaAssetType;
    const soType = KibanaSavedObjectTypeMapping[assetType];
    if (savedObject.type !== soType) {
      return;
    }

    if (
      soType === KibanaSavedObjectType.alert &&
      !appContextService.getExperimentalFeatures().enableAgentStatusAlerting
    ) {
      return;
    }

    batch.push(savedObject);
    assetRefs.push(toAssetReference(savedObject));

    if (batch.length >= MAX_ASSETS_TO_INSTALL_IN_PARALLEL) {
      await bulkCreateSavedObjects({
        savedObjectsClient: savedObjectClientWithSpace,
        kibanaAssets: batch,
        context,
        refresh: false,
      });
      batch = [];
    }
  });

  // install any remaining assets
  if (batch.length) {
    await bulkCreateSavedObjects({
      savedObjectsClient: savedObjectClientWithSpace,
      kibanaAssets: batch,
      context,
      // Use wait_for with the last batch to ensure all assets are readable once the install is complete
      refresh: 'wait_for',
    });
  }

  // Update the installation saved object with installed kibana assets
  await saveKibanaAssetsRefs(savedObjectsClient, pkgName, assetRefs);

  return assetRefs;
}

async function bulkCreateSavedObjects({
  savedObjectsClient,
  kibanaAssets,
  refresh,
  context,
}: {
  kibanaAssets: ArchiveAsset[];
  savedObjectsClient: SavedObjectsClientContract;
  refresh?: boolean | 'wait_for';
  context: InstallAssetContext;
}) {
  if (!kibanaAssets.length) {
    return [];
  }

  const toBeSavedObjects = kibanaAssets.map((asset) =>
    createSavedObjectKibanaAsset(asset, context)
  );

  const { saved_objects: createdSavedObjects } = await savedObjectsClient.bulkCreate(
    toBeSavedObjects,
    {
      // We only want to install new saved objects without overwriting existing ones
      overwrite: false,
      managed: true,
      refresh,
    }
  );

  return createdSavedObjects;
}
