/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiHorizontalRule, EuiSpacer, EuiTitle, useEuiTheme } from '@elastic/eui';

import React from 'react';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useHasVulnerabilities } from '@kbn/cloud-security-posture/src/hooks/use_has_vulnerabilities';
import { useHasMisconfigurations } from '@kbn/cloud-security-posture/src/hooks/use_has_misconfigurations';
import type { EntityIdentifierFields } from '../../../common/entity_analytics/types';
import { MisconfigurationsPreview } from './misconfiguration/misconfiguration_preview';
import { VulnerabilitiesPreview } from './vulnerabilities/vulnerabilities_preview';
import { AlertsPreview } from './alerts/alerts_preview';
import { useGlobalTime } from '../../common/containers/use_global_time';
import { DETECTION_RESPONSE_ALERTS_BY_STATUS_ID } from '../../overview/components/detection_response/alerts_by_status/types';
import { useNonClosedAlerts } from '../hooks/use_non_closed_alerts';
import type { EntityDetailsPath } from '../../flyout/entity_details/shared/components/left_panel/left_panel_header';

export type CloudPostureEntityIdentifier =
  | Extract<
      EntityIdentifierFields,
      | EntityIdentifierFields.hostName
      | EntityIdentifierFields.userName
      | EntityIdentifierFields.generic
    >
  | 'related.entity'; // related.entity is not an entity identifier field, but it includes entity ids which we use to filter for related entities

export const EntityInsight = <T,>({
  value,
  field,
  isPreviewMode,
  isLinkEnabled,
  openDetailsPanel,
}: {
  value: string;
  field: CloudPostureEntityIdentifier;
  isPreviewMode?: boolean;
  isLinkEnabled: boolean;
  openDetailsPanel: (path: EntityDetailsPath) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const insightContent: React.ReactElement[] = [];

  const { hasMisconfigurationFindings: showMisconfigurationsPreview } = useHasMisconfigurations(
    field,
    value
  );

  const { hasVulnerabilitiesFindings } = useHasVulnerabilities(field, value);

  const showVulnerabilitiesPreview = hasVulnerabilitiesFindings && field === 'host.name';

  const { to, from } = useGlobalTime();

  const { hasNonClosedAlerts: showAlertsPreview, filteredAlertsData } = useNonClosedAlerts({
    field,
    value,
    to,
    from,
    queryId: DETECTION_RESPONSE_ALERTS_BY_STATUS_ID,
  });

  if (showAlertsPreview) {
    insightContent.push(
      <>
        <AlertsPreview
          alertsData={filteredAlertsData}
          isPreviewMode={isPreviewMode}
          isLinkEnabled={isLinkEnabled}
          openDetailsPanel={openDetailsPanel}
        />
        <EuiSpacer size="s" />
      </>
    );
  }

  if (showMisconfigurationsPreview)
    insightContent.push(
      <>
        <MisconfigurationsPreview
          value={value}
          field={field}
          isPreviewMode={isPreviewMode}
          isLinkEnabled={isLinkEnabled}
          openDetailsPanel={openDetailsPanel}
        />
        <EuiSpacer size="s" />
      </>
    );
  if (showVulnerabilitiesPreview)
    insightContent.push(
      <>
        <VulnerabilitiesPreview
          value={value}
          field={field}
          isPreviewMode={isPreviewMode}
          isLinkEnabled={isLinkEnabled}
          openDetailsPanel={openDetailsPanel}
        />
        <EuiSpacer size="s" />
      </>
    );
  return (
    <>
      {insightContent.length > 0 && (
        <>
          <EuiAccordion
            initialIsOpen={true}
            id="entityInsight-accordion"
            data-test-subj="entityInsightTestSubj"
            buttonProps={{
              'data-test-subj': 'entityInsight-accordion-button',
              css: css`
                color: ${euiTheme.colors.primary};
              `,
            }}
            buttonContent={
              <EuiTitle size="xs">
                <h3>
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.insightsTitle"
                    defaultMessage="Insights"
                  />
                </h3>
              </EuiTitle>
            }
          >
            <EuiSpacer size="m" />
            {insightContent}
          </EuiAccordion>
          <EuiHorizontalRule />
        </>
      )}
    </>
  );
};
