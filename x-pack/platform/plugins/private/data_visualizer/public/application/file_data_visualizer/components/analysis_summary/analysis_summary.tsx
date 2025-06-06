/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import type { FC } from 'react';
import React from 'react';

import { EuiTitle, EuiSpacer, EuiDescriptionList } from '@elastic/eui';
import type { FindFileStructureResponse } from '@kbn/file-upload-plugin/common';
import { FILE_FORMATS } from '@kbn/file-upload-common';
import { getTikaDisplayType } from '@kbn/file-upload/file_upload_manager/tika_utils';

interface Props {
  results: FindFileStructureResponse;
  showTitle?: boolean;
}

export const AnalysisSummary: FC<Props> = ({ results, showTitle = true }) => {
  const items = createDisplayItems(results);

  return (
    <>
      {showTitle ? (
        <EuiTitle size="s">
          <h2>
            <FormattedMessage
              id="xpack.dataVisualizer.file.analysisSummary.summaryTitle"
              defaultMessage="Summary"
            />
          </h2>
        </EuiTitle>
      ) : null}

      <EuiSpacer size="m" />

      <EuiDescriptionList
        type="column"
        columnWidths={showTitle ? [15, 85] : [50, 50]}
        listItems={items}
        className="analysis-summary-list"
        compressed
      />
    </>
  );
};

function createDisplayItems(results: FindFileStructureResponse) {
  const items: Array<{ title: any; description: string | number }> = [
    {
      title: (
        <FormattedMessage
          id="xpack.dataVisualizer.file.analysisSummary.analyzedLinesNumberTitle"
          defaultMessage="Number of lines analyzed"
        />
      ),
      description: results.num_lines_analyzed,
    },
    // {
    //   title: 'Charset',
    //   description: results.charset,
    // }
  ];

  if (results.format !== undefined) {
    items.push({
      title: (
        <FormattedMessage
          id="xpack.dataVisualizer.file.analysisSummary.formatTitle"
          defaultMessage="Format"
        />
      ),
      description: getFormatLabel(results),
    });

    if (results.format === FILE_FORMATS.DELIMITED) {
      items.push({
        title: (
          <FormattedMessage
            id="xpack.dataVisualizer.file.analysisSummary.delimiterTitle"
            defaultMessage="Delimiter"
          />
        ),
        description: results.delimiter,
      });

      items.push({
        title: (
          <FormattedMessage
            id="xpack.dataVisualizer.file.analysisSummary.hasHeaderRowTitle"
            defaultMessage="Has header row"
          />
        ),
        description: `${results.has_header_row}`,
      });
    }
  }

  if (results.grok_pattern !== undefined) {
    items.push({
      title: (
        <FormattedMessage
          id="xpack.dataVisualizer.file.analysisSummary.grokPatternTitle"
          defaultMessage="Grok pattern"
        />
      ),
      description: results.grok_pattern,
    });
  }

  if (results.timestamp_field !== undefined) {
    items.push({
      title: (
        <FormattedMessage
          id="xpack.dataVisualizer.file.analysisSummary.timeFieldTitle"
          defaultMessage="Time field"
        />
      ),
      description: results.timestamp_field,
    });
  }

  if (results.java_timestamp_formats !== undefined) {
    items.push({
      title: (
        <FormattedMessage
          id="xpack.dataVisualizer.file.analysisSummary.timeFormatTitle"
          defaultMessage="Time {timestampFormats, plural, zero {format} one {format} other {formats}}"
          values={{
            timestampFormats: results.java_timestamp_formats.length,
          }}
        />
      ),
      description: results.java_timestamp_formats.join(', '),
    });
  }

  return items;
}

function getFormatLabel(results: FindFileStructureResponse) {
  return results.format === FILE_FORMATS.TIKA && results.document_type !== undefined
    ? getTikaDisplayType(results.document_type).label
    : results.format;
}
