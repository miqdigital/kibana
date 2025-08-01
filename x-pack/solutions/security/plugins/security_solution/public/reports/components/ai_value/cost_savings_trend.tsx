/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { getExcludeAlertsFilters } from './utils';
import * as i18n from './translations';
import { VisualizationContextMenuActions } from '../../../common/components/visualization_actions/types';
import { SourcererScopeName } from '../../../sourcerer/store/model';
import { VisualizationEmbeddable } from '../../../common/components/visualization_actions/visualization_embeddable';
import { getCostSavingsTrendAreaLensAttributes } from '../../../common/components/visualization_actions/lens_attributes/ai/cost_savings_trend_area';

interface Props {
  from: string;
  to: string;
  attackAlertIds: string[];
  minutesPerAlert: number;
  analystHourlyRate: number;
}
const ID = 'CostSavingsTrendQuery';

/**
 * Renders a Lens embeddable area chart visualization showing the estimated cost savings trend
 * over time, based on the number of AI filtered alerts, minutes saved per alert, and analyst hourly rate
 * for a given time range.
 */

const CostSavingsTrendComponent: React.FC<Props> = ({
  attackAlertIds,
  minutesPerAlert,
  analystHourlyRate,
  from,
  to,
}) => {
  const extraVisualizationOptions = useMemo(
    () => ({
      filters: getExcludeAlertsFilters(attackAlertIds),
    }),
    [attackAlertIds]
  );
  const timerange = useMemo(() => ({ from, to }), [from, to]);

  return (
    <EuiPanel paddingSize="l" hasBorder hasShadow={false} data-test-subj="cost-savings-trend-panel">
      <EuiTitle size="s">
        <h3>{i18n.COST_SAVINGS_TREND}</h3>
      </EuiTitle>
      <EuiText size="s">
        <p>{i18n.COST_SAVINGS_SOC}</p>
      </EuiText>
      <EuiSpacer size="l" />
      <VisualizationEmbeddable
        data-test-subj="embeddable-area-chart"
        extraOptions={extraVisualizationOptions}
        getLensAttributes={(args) =>
          getCostSavingsTrendAreaLensAttributes({ ...args, minutesPerAlert, analystHourlyRate })
        }
        timerange={timerange}
        id={`${ID}-area-embeddable`}
        height={300}
        inspectTitle={i18n.COST_SAVINGS_TREND}
        scopeId={SourcererScopeName.detections}
        withActions={[
          VisualizationContextMenuActions.addToExistingCase,
          VisualizationContextMenuActions.addToNewCase,
          VisualizationContextMenuActions.inspect,
        ]}
      />
    </EuiPanel>
  );
};

export const CostSavingsTrend = React.memo(CostSavingsTrendComponent);
