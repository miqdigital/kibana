/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useRef, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { i18n } from '@kbn/i18n';
import {
  LegendValue,
  Axis,
  Chart,
  Position,
  Settings,
  AnnotationDomainType,
  LineAnnotation,
  TooltipType,
  StackMode,
  Placement,
  Tooltip,
} from '@elastic/charts';
import { renderEndzoneTooltip, useActiveCursor } from '@kbn/charts-plugin/public';
import { EuiIcon } from '@elastic/eui';
import { getTimeZone } from '@kbn/visualization-utils';
import { getUISettings, getCharts } from '../../../../services';
import { GRID_LINE_CONFIG, ICON_TYPES_MAP, STACKED_OPTIONS } from '../../constants';
import { AreaSeriesDecorator } from './decorators/area_decorator';
import { BarSeriesDecorator } from './decorators/bar_decorator';
import { getStackAccessors } from './utils/stack_format';
import { getBaseTheme, getChartClasses } from './utils/theme';
import { TOOLTIP_MODES } from '../../../../../common/enums';
import { getValueOrEmpty } from '../../../../../common/empty_label';
import { getSplitByTermsColor } from '../../../lib/get_split_by_terms_color';
import { getAxisLabelString } from '../../../components/lib/get_axis_label_string';
import { calculateDomainForSeries } from './utils/series_domain_calculation';

const generateAnnotationData = (values, formatter) =>
  values.map(({ key, docs }) => ({
    dataValue: key,
    details: docs[0],
    header: formatter({
      value: key,
    }),
  }));

const decorateFormatter =
  (formatter) =>
  ({ value }) =>
    formatter(value);

/** When displaying the annotation, we must slightly shift the labels for
 * the x-axis so that they do not overlap the annotations. **/
const TICK_LABEL_WITH_ANNOTATIONS_PADDING = 19;

export const TimeSeries = ({
  backgroundColor,
  showGrid,
  legend,
  legendPosition,
  truncateLegend,
  maxLegendLines,
  tooltipMode,
  series,
  yAxis,
  onBrush,
  onFilterClick,
  xAxisFormatter,
  annotations,
  syncColors,
  syncTooltips,
  syncCursor,
  palettesService,
  interval,
  isLastBucketDropped,
  initialRender,
}) => {
  // If the color isn't configured by the user, use the color mapping service
  // to assign a color from the Kibana palette. Colors will be shared across the
  // session, including dashboards.
  const { theme: themeService, activeCursor: activeCursorService } = getCharts();

  const chartRef = useRef();
  const chartBaseTheme = getBaseTheme(themeService.useChartsBaseTheme(), backgroundColor);

  const handleCursorUpdate = useActiveCursor(activeCursorService, chartRef, {
    isDateHistogram: true,
  });

  const hasVisibleAnnotations = useMemo(
    () => (annotations ?? []).some((annotation) => Boolean(annotation.data?.length)),
    [annotations]
  );

  const onRenderChange = useCallback(
    (isRendered) => {
      if (isRendered) {
        initialRender?.();
      }
    },
    [initialRender]
  );

  let tooltipFormatter = decorateFormatter(xAxisFormatter);
  if (!isLastBucketDropped) {
    const domainBounds = calculateDomainForSeries(series);
    tooltipFormatter = renderEndzoneTooltip(
      interval,
      domainBounds?.domainStart,
      domainBounds?.domainEnd,
      xAxisFormatter
    );
  }

  const uiSettings = getUISettings();
  const timeZone = getTimeZone(uiSettings);
  const hasBarChart = series.some(({ bars }) => bars?.show);

  // apply legend style change if bgColor is configured
  const classes = classNames(getChartClasses(backgroundColor));

  const onBrushEndListener = ({ x }) => {
    if (!x) {
      return;
    }
    const [min, max] = x;
    onBrush(min, max, series);
  };

  const handleElementClick = (points) => {
    onFilterClick(series, points);
  };

  const getSeriesColor = useCallback(
    (seriesName, seriesGroupId, seriesId) => {
      const seriesById = series.filter((s) => s.seriesId === seriesGroupId);
      const props = {
        seriesById,
        seriesName,
        seriesId,
        baseColor: seriesById[0].baseColor,
        seriesPalette: seriesById[0].palette,
        palettesRegistry: palettesService,
        syncColors,
      };
      return getSplitByTermsColor(props) || null;
    },
    [palettesService, series, syncColors]
  );

  const gridLineStyle = {
    ...GRID_LINE_CONFIG,
    visible: showGrid,
  };

  return (
    <Chart ref={chartRef} renderer="canvas" className={classes}>
      <Tooltip
        snap
        type={
          tooltipMode === TOOLTIP_MODES.SHOW_FOCUSED
            ? TooltipType.Follow
            : TooltipType.VerticalCursor
        }
        boundary={document.getElementById('app-fixed-viewport') ?? undefined}
        headerFormatter={tooltipFormatter}
      />
      <Settings
        debugState={window._echDebugStateFlag ?? false}
        showLegend={legend}
        legendValues={[LegendValue.CurrentAndLastValue]}
        onRenderChange={onRenderChange}
        allowBrushingLastHistogramBin={true}
        legendPosition={legendPosition}
        onBrushEnd={onBrushEndListener}
        onElementClick={(args) => handleElementClick(args)}
        animateData={false}
        onPointerUpdate={syncCursor ? handleCursorUpdate : undefined}
        pointerUpdateDebounce={0}
        theme={[
          {
            axes: {
              tickLabel: {
                padding: {
                  inner: hasVisibleAnnotations
                    ? TICK_LABEL_WITH_ANNOTATIONS_PADDING
                    : chartBaseTheme.axes.tickLabel.padding.inner,
                },
              },
            },
          },
          hasBarChart
            ? {}
            : {
                crosshair: {
                  band: {
                    fill: '#F00',
                  },
                },
              },
          {
            background: {
              color: backgroundColor,
            },
            legend: {
              labelOptions: { maxLines: truncateLegend ? maxLegendLines ?? 1 : 0 },
            },
          },
        ]}
        baseTheme={chartBaseTheme}
        externalPointerEvents={{
          tooltip: { visible: syncTooltips, placement: Placement.Right },
        }}
        locale={i18n.getLocale()}
      />

      {annotations.map(({ id, data, icon, color }) => {
        const dataValues = generateAnnotationData(data, tooltipFormatter);
        const style = { line: { stroke: color } };

        return (
          <LineAnnotation
            key={id}
            id={id}
            domainType={AnnotationDomainType.XDomain}
            dataValues={dataValues}
            marker={<EuiIcon type={ICON_TYPES_MAP[icon] || 'asterisk'} />}
            hideLinesTooltips={true}
            style={style}
          />
        );
      })}

      {series.map(
        ({
          id,
          seriesId,
          label,
          bars,
          lines,
          data,
          hideInLegend,
          truncateLegend,
          xScaleType,
          yScaleType,
          groupId,
          color,
          isSplitByTerms,
          stack,
          points,
          y1AccessorFormat,
          y0AccessorFormat,
          tickFormat,
        }) => {
          const stackAccessors = getStackAccessors(stack);
          const isPercentage = stack === STACKED_OPTIONS.PERCENT;
          const isStacked = stack !== STACKED_OPTIONS.NONE;
          const key = `${id}-${label}`;
          const seriesName = label.toString();

          // The colors from the paletteService should be applied only when the timeseries is split by terms
          const splitColor = getSeriesColor(seriesName, seriesId, id);
          const finalColor = isSplitByTerms && splitColor ? splitColor : color;
          if (bars?.show) {
            return (
              <BarSeriesDecorator
                key={key}
                seriesId={id}
                seriesGroupId={groupId}
                name={getValueOrEmpty(seriesName)}
                data={data}
                hideInLegend={hideInLegend}
                truncateLegend={truncateLegend}
                bars={bars}
                color={finalColor}
                stackAccessors={stackAccessors}
                stackMode={isPercentage ? StackMode.Percentage : undefined}
                xScaleType={xScaleType}
                yScaleType={yScaleType}
                timeZone={timeZone}
                enableHistogramMode={isStacked}
                y1AccessorFormat={y1AccessorFormat}
                y0AccessorFormat={y0AccessorFormat}
                tickFormat={tickFormat}
              />
            );
          }

          if (lines?.show) {
            return (
              <AreaSeriesDecorator
                key={key}
                seriesId={id}
                seriesGroupId={groupId}
                name={getValueOrEmpty(seriesName)}
                data={data}
                hideInLegend={hideInLegend}
                truncateLegend={truncateLegend}
                lines={lines}
                color={finalColor}
                stackAccessors={stackAccessors}
                stackMode={isPercentage ? StackMode.Percentage : undefined}
                points={points}
                xScaleType={xScaleType}
                yScaleType={yScaleType}
                timeZone={timeZone}
                enableHistogramMode={isStacked}
                y1AccessorFormat={y1AccessorFormat}
                y0AccessorFormat={y0AccessorFormat}
                tickFormat={tickFormat}
              />
            );
          }

          return null;
        }
      )}

      {yAxis.map(({ id, groupId, position, tickFormatter, domain, hide }) => (
        <Axis
          key={groupId}
          groupId={groupId}
          id={id}
          position={position}
          domain={domain}
          hide={hide}
          gridLine={gridLineStyle}
          ticks={5}
          tickFormat={tickFormatter}
        />
      ))}

      <Axis
        id="bottom"
        position={Position.Bottom}
        title={getAxisLabelString(interval)}
        tickFormat={xAxisFormatter}
        gridLine={gridLineStyle}
      />
    </Chart>
  );
};

TimeSeries.defaultProps = {
  showGrid: true,
  legend: true,
  legendPosition: 'right',
};

TimeSeries.propTypes = {
  backgroundColor: PropTypes.string,
  showGrid: PropTypes.bool,
  legend: PropTypes.bool,
  legendPosition: PropTypes.string,
  truncateLegend: PropTypes.bool,
  maxLegendLines: PropTypes.number,
  series: PropTypes.array,
  yAxis: PropTypes.array,
  onBrush: PropTypes.func,
  xAxisFormatter: PropTypes.func,
  annotations: PropTypes.array,
  interval: PropTypes.number,
  isLastBucketDropped: PropTypes.bool,
};
