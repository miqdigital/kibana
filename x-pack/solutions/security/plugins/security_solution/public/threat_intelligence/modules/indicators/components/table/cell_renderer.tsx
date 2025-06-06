/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/display-name */

import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import React, { useContext, useEffect } from 'react';
import { euiDarkVars as themeDark, euiLightVars as themeLight } from '@kbn/ui-theme';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';
import { useStyles } from './styles';
import type { Indicator } from '../../../../../../common/threat_intelligence/types/indicator';
import { IndicatorFieldValue } from '../common/field_value';
import { IndicatorsTableContext } from '../../hooks/use_table_context';
import { ActionsRowCell } from './actions_row_cell';

export const cellRendererFactory = (from: number) => {
  return ({ rowIndex, columnId, setCellProps }: EuiDataGridCellValueElementProps) => {
    const styles = useStyles();

    const indicatorsTableContext = useContext(IndicatorsTableContext);

    if (!indicatorsTableContext) {
      throw new Error('this can only be used inside indicators table');
    }

    const darkMode = useKibanaIsDarkMode();

    const { indicators, expanded } = indicatorsTableContext;

    const indicator: Indicator | undefined = indicators[rowIndex - from];

    useEffect(() => {
      if (expanded && indicator && expanded._id === indicator._id) {
        setCellProps({
          style: {
            backgroundColor: darkMode ? themeDark.euiColorHighlight : themeLight.euiColorHighlight,
          },
        });
      } else {
        setCellProps({ style: undefined });
      }
    }, [darkMode, expanded, indicator, setCellProps]);

    if (!indicator) {
      return null;
    }

    const renderContent =
      columnId === 'Actions' ? (
        <ActionsRowCell indicator={indicator} />
      ) : (
        <IndicatorFieldValue indicator={indicator} field={columnId} />
      );

    return <div css={styles.tableCell}>{renderContent}</div>;
  };
};
