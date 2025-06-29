/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiCallOut,
  EuiLink,
  EuiFlyout,
  EuiCodeBlock,
  EuiPortal,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import styled from 'styled-components';

import type {
  DryRunPackagePolicy,
  PackagePolicy,
  RegistryVarsEntry,
} from '../../../../../../../common';

import type { UpgradePackagePolicyDryRunResponse } from '../../../../../../../common/types/rest_spec';
import { useStartServices } from '../../../../hooks';
import { MAX_FLYOUT_WIDTH } from '../../../../constants';

const FlyoutBody = styled(EuiFlyoutBody)`
  .euiFlyoutBody__overflowContent {
    padding: 0;
  }
`;

const HasNewSecretsCallOut = ({ newSecrets }: { newSecrets: RegistryVarsEntry[] }) => {
  const { docLinks } = useStartServices();

  return (
    <EuiCallOut
      title={i18n.translate('xpack.fleet.upgradePackagePolicy.statusCallOut.hasNewSecretsTitle', {
        defaultMessage: 'New secrets added',
      })}
      color="primary"
      iconType="info"
    >
      <FormattedMessage
        id="xpack.fleet.upgradePackagePolicy.statusCallout.hasNewSecrets"
        defaultMessage="Some of this integration's form fields have been converted to secrets in this version. Your existing values are autofilled in each secret input during this upgrade, but you won't be able to view them again after saving. {learnMoreLink}"
        values={{
          learnMoreLink: (
            <EuiLink href={docLinks.links.fleet.policySecrets} target="_blank">
              Learn more.
            </EuiLink>
          ),
        }}
      />

      <EuiSpacer size="s" />

      <FormattedMessage
        id="xpack.fleet.upgradePackagePolicy.statusCallout.hasNewSecretsList"
        defaultMessage="New secrets: {secrets}"
        values={{
          secrets: (
            <ul>
              {newSecrets.map((secret) => (
                <li key={secret.title}>{secret.title}</li>
              ))}
            </ul>
          ),
        }}
      />
    </EuiCallOut>
  );
};

const HasConflictsCallout = ({
  currentPackagePolicy,
  proposedUpgradePackagePolicy,
  onPreviousConfigurationClick,
}: {
  currentPackagePolicy?: PackagePolicy;
  proposedUpgradePackagePolicy?: DryRunPackagePolicy;
  onPreviousConfigurationClick?: () => void;
}) => {
  return (
    <EuiCallOut
      title={i18n.translate('xpack.fleet.upgradePackagePolicy.statusCallOut.errorTitle', {
        defaultMessage: 'Review field conflicts',
      })}
      color="warning"
      iconType="warning"
    >
      <FormattedMessage
        id="xpack.fleet.upgradePackagePolicy.statusCallout.errorContent"
        defaultMessage="This integration has conflicting fields from version {currentVersion} to {upgradeVersion} Review the configuration and save to perform the upgrade. You may reference your {previousConfigurationLink} for comparison."
        values={{
          currentVersion: currentPackagePolicy?.package?.version,
          upgradeVersion: proposedUpgradePackagePolicy?.package?.version,
          previousConfigurationLink: (
            <EuiLink onClick={onPreviousConfigurationClick}>
              <FormattedMessage
                id="xpack.fleet.upgradePackagePolicy.statusCallout.previousConfigurationLink"
                defaultMessage="previous configuration"
              />
            </EuiLink>
          ),
        }}
      />
    </EuiCallOut>
  );
};

const ReadyToUpgradeCallOut = ({
  currentPackagePolicy,
  proposedUpgradePackagePolicy,
}: {
  currentPackagePolicy?: PackagePolicy;
  proposedUpgradePackagePolicy?: DryRunPackagePolicy;
}) => {
  return (
    <EuiCallOut
      title={i18n.translate('xpack.fleet.upgradePackagePolicy.statusCallOut.successTitle', {
        defaultMessage: 'Ready to upgrade',
      })}
      color="success"
      iconType="checkInCircleFilled"
    >
      <FormattedMessage
        id="xpack.fleet.upgradePackagePolicy.statusCallout.successContent"
        defaultMessage="This integration is ready to be upgraded from version {currentVersion} to {upgradeVersion}. Review the changes below and save to upgrade."
        values={{
          currentVersion: currentPackagePolicy?.package?.version,
          upgradeVersion: proposedUpgradePackagePolicy?.package?.version,
        }}
      />
    </EuiCallOut>
  );
};

export const UpgradeStatusCallout: React.FunctionComponent<{
  dryRunData: UpgradePackagePolicyDryRunResponse;
  newSecrets: RegistryVarsEntry[];
}> = ({ dryRunData, newSecrets }) => {
  const [isPreviousVersionFlyoutOpen, setIsPreviousVersionFlyoutOpen] = useState<boolean>(false);

  if (!dryRunData) {
    return null;
  }

  const hasNewSecrets = newSecrets.length > 0;
  const [currentPackagePolicy, proposedUpgradePackagePolicy] = dryRunData[0].diff || [];
  const isReadyForUpgrade = currentPackagePolicy && !dryRunData[0].hasErrors;

  return (
    <>
      {isPreviousVersionFlyoutOpen && currentPackagePolicy && (
        <EuiPortal>
          <EuiFlyout
            onClose={() => setIsPreviousVersionFlyoutOpen(false)}
            maxWidth={MAX_FLYOUT_WIDTH}
          >
            <EuiFlyoutHeader hasBorder>
              <EuiTitle size="m">
                <h2 id="FleetPackagePolicyPreviousVersionFlyoutTitle">
                  <FormattedMessage
                    id="xpack.fleet.upgradePackagePolicy.previousVersionFlyout.title"
                    defaultMessage="''{name}'' integration policy"
                    values={{ name: currentPackagePolicy?.name }}
                  />
                </h2>
              </EuiTitle>
            </EuiFlyoutHeader>
            <FlyoutBody>
              <EuiCodeBlock isCopyable fontSize="m" whiteSpace="pre">
                {JSON.stringify(dryRunData[0].agent_diff?.[0] || [], null, 2)}
              </EuiCodeBlock>
            </FlyoutBody>
          </EuiFlyout>
        </EuiPortal>
      )}

      {isReadyForUpgrade ? (
        <ReadyToUpgradeCallOut
          currentPackagePolicy={currentPackagePolicy}
          proposedUpgradePackagePolicy={proposedUpgradePackagePolicy}
        />
      ) : (
        <HasConflictsCallout
          currentPackagePolicy={currentPackagePolicy}
          proposedUpgradePackagePolicy={proposedUpgradePackagePolicy}
          onPreviousConfigurationClick={() => setIsPreviousVersionFlyoutOpen(true)}
        />
      )}
      {hasNewSecrets && (
        <>
          <EuiSpacer size="m" />
          <HasNewSecretsCallOut newSecrets={newSecrets} />
        </>
      )}
    </>
  );
};
