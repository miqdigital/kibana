/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { EuiBadge, EuiCodeBlock, EuiForm, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';

import { formatHumanReadableDateTimeSeconds } from '@kbn/ml-date-utils';
import { DataGrid } from '@kbn/ml-data-grid';
import { isDefaultQuery, isMatchAllQuery } from '@kbn/ml-query-utils';

import { useToastNotifications } from '../../../../app_dependencies';
import {
  getTransformConfigQuery,
  getTransformPreviewDevConsoleStatement,
  getPreviewTransformRequestBody,
} from '../../../../common';
import { useTransformConfigData } from '../../../../hooks/use_transform_config_data';
import type { SearchItems } from '../../../../hooks/use_search_items';

import { AggListSummary } from '../aggregation_list';
import { GroupByListSummary } from '../group_by_list';

import type { StepDefineExposedState } from './common';
import { TRANSFORM_FUNCTION } from '../../../../../../common/constants';
import { isLatestPartialRequest } from './common/types';

interface Props {
  formState: StepDefineExposedState;
  searchItems: SearchItems;
}

export const StepDefineSummary: FC<Props> = ({
  formState: {
    isDatePickerApplyEnabled,
    timeRangeMs,
    runtimeMappings,
    searchString,
    searchQuery,
    groupByList,
    aggList,
    transformFunction,
    previewRequest: partialPreviewRequest,
    validationStatus,
  },
  searchItems,
}) => {
  const toastNotifications = useToastNotifications();

  const transformConfigQuery = getTransformConfigQuery(searchQuery);

  const previewRequest = getPreviewTransformRequestBody(
    searchItems.dataView,
    transformConfigQuery,
    partialPreviewRequest,
    runtimeMappings,
    isDatePickerApplyEnabled ? timeRangeMs : undefined
  );

  const pivotPreviewProps = useTransformConfigData(
    searchItems.dataView,
    transformConfigQuery,
    validationStatus,
    partialPreviewRequest,
    runtimeMappings,
    isDatePickerApplyEnabled ? timeRangeMs : undefined
  );

  const isModifiedQuery =
    typeof searchString === 'undefined' &&
    !isDefaultQuery(transformConfigQuery) &&
    !isMatchAllQuery(transformConfigQuery);

  let uniqueKeys: string[] = [];
  let sortField = '';
  if (isLatestPartialRequest(previewRequest)) {
    uniqueKeys = previewRequest.latest.unique_key;
    sortField = previewRequest.latest.sort;
  }

  return (
    <div data-test-subj="transformStepDefineSummary">
      <EuiForm>
        {searchItems.savedSearch === undefined && (
          <>
            <EuiFormRow
              label={i18n.translate('xpack.transform.stepDefineSummary.dataViewLabel', {
                defaultMessage: 'Data view',
              })}
            >
              <span>{searchItems.dataView.getIndexPattern()}</span>
            </EuiFormRow>
            {isDatePickerApplyEnabled && timeRangeMs && (
              <EuiFormRow
                label={i18n.translate('xpack.transform.stepDefineSummary.timeRangeLabel', {
                  defaultMessage: 'Time range',
                })}
              >
                <span>
                  {formatHumanReadableDateTimeSeconds(timeRangeMs.from)} -{' '}
                  {formatHumanReadableDateTimeSeconds(timeRangeMs.to)}
                </span>
              </EuiFormRow>
            )}
            {typeof searchString === 'string' && (
              <EuiFormRow
                label={i18n.translate('xpack.transform.stepDefineSummary.queryLabel', {
                  defaultMessage: 'Query',
                })}
              >
                <span>{searchString}</span>
              </EuiFormRow>
            )}
            {isModifiedQuery && (
              <EuiFormRow
                label={i18n.translate('xpack.transform.stepDefineSummary.queryCodeBlockLabel', {
                  defaultMessage: 'Query',
                })}
              >
                <EuiCodeBlock
                  language="js"
                  fontSize="s"
                  paddingSize="s"
                  color="light"
                  overflowHeight={300}
                  isCopyable
                >
                  {JSON.stringify(transformConfigQuery, null, 2)}
                </EuiCodeBlock>
              </EuiFormRow>
            )}
          </>
        )}

        {searchItems.savedSearch !== undefined && searchItems.savedSearch.id !== undefined && (
          <EuiFormRow
            label={i18n.translate('xpack.transform.stepDefineSummary.discoverSessionLabel', {
              defaultMessage: 'Discover session',
            })}
          >
            <span>{searchItems.savedSearch.title}</span>
          </EuiFormRow>
        )}

        {transformFunction === TRANSFORM_FUNCTION.PIVOT ? (
          <>
            <EuiFormRow
              label={i18n.translate('xpack.transform.stepDefineSummary.groupByLabel', {
                defaultMessage: 'Group by',
              })}
            >
              <GroupByListSummary list={groupByList} />
            </EuiFormRow>

            <EuiFormRow
              label={i18n.translate('xpack.transform.stepDefineSummary.aggregationsLabel', {
                defaultMessage: 'Aggregations',
              })}
            >
              <AggListSummary list={aggList} />
            </EuiFormRow>
          </>
        ) : (
          <>
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.transform.stepDefineForm.uniqueKeysLabel"
                  defaultMessage="Unique keys"
                />
              }
            >
              <>
                {uniqueKeys.map((k) => (
                  <EuiBadge color="hollow" key={k}>
                    {k}
                  </EuiBadge>
                ))}
              </>
            </EuiFormRow>

            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.transform.stepDefineForm.sortLabel"
                  defaultMessage="Sort field"
                />
              }
            >
              <EuiText>{sortField}</EuiText>
            </EuiFormRow>
          </>
        )}

        <EuiSpacer size="m" />
        <DataGrid
          {...pivotPreviewProps}
          copyToClipboard={getTransformPreviewDevConsoleStatement(previewRequest)}
          copyToClipboardDescription={i18n.translate(
            'xpack.transform.pivotPreview.copyClipboardTooltip',
            {
              defaultMessage:
                'Copy Dev Console statement of the transform preview to the clipboard.',
            }
          )}
          dataTestSubj="transformPivotPreview"
          title={i18n.translate('xpack.transform.pivotPreview.transformPreviewTitle', {
            defaultMessage: 'Transform preview',
          })}
          toastNotifications={toastNotifications}
        />
      </EuiForm>
    </div>
  );
};
