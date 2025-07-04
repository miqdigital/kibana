/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FC } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { MlEntityFieldOperation } from '@kbn/ml-anomaly-utils';
import type { TimeBuckets } from '@kbn/ml-time-buckets';
import type { SeverityThreshold } from '../../../../common/types/anomalies';
import { ExplorerChartsContainer } from './explorer_charts_container';
import { SelectSeverityUI } from '../../components/controls/select_severity';
import type { ExplorerChartsData } from './explorer_charts_container_service';
import type { MlLocator } from '../../../../common/types/locator';
import type { AnomaliesTableData } from '../explorer_utils';
import type { SeverityOption } from '../hooks/use_severity_options';

interface ExplorerAnomaliesContainerProps {
  id: string;
  chartsData: ExplorerChartsData;
  showCharts: boolean;
  severity: SeverityThreshold[];
  setSeverity: (severity: SeverityOption[]) => void;
  mlLocator: MlLocator;
  tableData: AnomaliesTableData;
  timeBuckets: TimeBuckets;
  timefilter: TimefilterContract;
  onSelectEntity: (
    fieldName: string,
    fieldValue: string,
    operation: MlEntityFieldOperation
  ) => void;
  showSelectedInterval?: boolean;
  chartsService: ChartsPluginStart;
  timeRange: { from: string; to: string } | undefined;
  showFilterIcons: boolean;
}

const tooManyBucketsCalloutMsg = i18n.translate(
  'xpack.ml.explorer.charts.dashboardTooManyBucketsDescription',
  {
    defaultMessage:
      'This selection contains too many buckets to be displayed. You should shorten the time range of the view.',
  }
);

export const ExplorerAnomaliesContainer: FC<ExplorerAnomaliesContainerProps> = ({
  id,
  chartsData,
  showCharts,
  severity,
  setSeverity,
  mlLocator,
  tableData,
  timeBuckets,
  timefilter,
  onSelectEntity,
  showSelectedInterval,
  chartsService,
  timeRange,
  showFilterIcons,
}) => {
  return (
    // TODO: Remove data-shared-item and data-rendering-count as part of https://github.com/elastic/kibana/issues/179376
    // These attributes are temporarily needed for reporting to not have any warning
    <div data-shared-item="" data-rendering-count={1}>
      <EuiFlexGroup id={id} direction="row" gutterSize="l" responsive={true}>
        <EuiFlexItem grow={false}>
          <SelectSeverityUI severity={severity} onChange={setSeverity} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {Array.isArray(chartsData.seriesToPlot) &&
        chartsData.seriesToPlot.length === 0 &&
        chartsData.errorMessages === undefined && (
          <EuiText textAlign={'center'} data-test-subj={'mlNoMatchingAnomaliesMessage'}>
            <h4>
              <FormattedMessage
                id="xpack.ml.explorer.noMatchingAnomaliesFoundTitle"
                defaultMessage="No matching anomalies found"
              />
            </h4>
          </EuiText>
        )}
      {showCharts && (
        <ExplorerChartsContainer
          {...{
            ...chartsData,
            isEmbeddable: true,
            severity,
            mlLocator,
            tableData,
            timeBuckets,
            timefilter,
            timeRange,
            onSelectEntity,
            tooManyBucketsCalloutMsg,
            showSelectedInterval,
            chartsService,
            id,
            showFilterIcons,
          }}
        />
      )}
    </div>
  );
};
