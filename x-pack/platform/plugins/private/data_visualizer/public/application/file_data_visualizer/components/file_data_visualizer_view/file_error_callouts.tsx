/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import type { FC } from 'react';
import React from 'react';

import { EuiCallOut, EuiSpacer, EuiButtonEmpty, EuiHorizontalRule } from '@elastic/eui';

import type { FindFileStructureErrorResponse } from '@kbn/file-upload-plugin/common';
import type { FileSizeChecker } from '@kbn/file-upload/file_upload_manager/file_size_check';

interface FileTooLargeProps {
  fileSizeChecker: FileSizeChecker;
}

export const FileTooLarge: FC<FileTooLargeProps> = ({ fileSizeChecker }) => {
  const fileSizeFormatted = fileSizeChecker.fileSizeFormatted();
  const maxFileSizeFormatted = fileSizeChecker.maxFileSizeFormatted();

  // Format the byte values, using the second format if the difference between
  // the file size and the max is so small that the formatted values are identical
  // e.g. 100.01 MB and 100.0 MB
  let errorText;
  if (fileSizeFormatted !== maxFileSizeFormatted) {
    errorText = (
      <p>
        <FormattedMessage
          id="xpack.dataVisualizer.file.fileErrorCallouts.fileSizeExceedsAllowedSizeErrorMessage"
          defaultMessage="The size of the file you selected for upload is {fileSizeFormatted} which
          exceeds the maximum permitted size of {maxFileSizeFormatted}"
          values={{
            fileSizeFormatted,
            maxFileSizeFormatted,
          }}
        />
      </p>
    );
  } else {
    const diffFormatted = fileSizeChecker.fileSizeDiffFormatted();
    errorText = (
      <p>
        <FormattedMessage
          id="xpack.dataVisualizer.file.fileErrorCallouts.fileSizeExceedsAllowedSizeByDiffFormatErrorMessage"
          defaultMessage="The size of the file you selected for upload exceeds the maximum
          permitted size of {maxFileSizeFormatted} by {diffFormatted}"
          values={{
            maxFileSizeFormatted,
            diffFormatted,
          }}
        />
      </p>
    );
  }

  return (
    <EuiCallOut
      title={
        <FormattedMessage
          id="xpack.dataVisualizer.file.fileErrorCallouts.fileSizeTooLargeTitle"
          defaultMessage="File size is too large"
        />
      }
      color="danger"
      iconType="cross"
      data-test-subj="dataVisualizerFileUploadErrorCallout fileTooLarge"
    >
      {errorText}
    </EuiCallOut>
  );
};

interface FileCouldNotBeReadProps {
  error: FindFileStructureErrorResponse;
  loaded: boolean;
  showEditFlyout(): void;
}

export const FileCouldNotBeRead: FC<FileCouldNotBeReadProps> = ({
  error,
  loaded,
  showEditFlyout,
}) => {
  const message = error?.body?.message || '';
  return (
    <>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.dataVisualizer.file.fileErrorCallouts.fileCouldNotBeReadTitle"
            defaultMessage="File structure cannot be determined"
          />
        }
        color="danger"
        iconType="cross"
        data-test-subj="dataVisualizerFileUploadErrorCallout fileCouldNotBeRead"
      >
        {loaded === false && (
          <>
            <FormattedMessage
              id="xpack.dataVisualizer.file.fileErrorCallouts.applyOverridesDescription"
              defaultMessage="If you know something about this data, such as the file format or timestamp format, adding initial overrides may help us to infer the rest of the structure."
            />
            <br />
            <EuiButtonEmpty onClick={showEditFlyout} flush="left" size="s">
              <FormattedMessage
                id="xpack.dataVisualizer.file.fileErrorCallouts.overrideButton"
                defaultMessage="Apply override settings"
              />
            </EuiButtonEmpty>
            <EuiHorizontalRule />
          </>
        )}
        {message}
        <Explanation error={error} />
        {loaded && (
          <>
            <EuiSpacer size="s" />
            <FormattedMessage
              id="xpack.dataVisualizer.file.fileErrorCallouts.revertingToPreviousSettingsDescription"
              defaultMessage="Reverting to previous settings"
            />
          </>
        )}
      </EuiCallOut>
    </>
  );
};

export const Explanation: FC<{ error: FindFileStructureErrorResponse }> = ({ error }) => {
  if (!error?.body?.attributes?.body?.error?.suppressed?.length) {
    return null;
  }
  const reason = error.body.attributes.body.error.suppressed[0].reason;
  return (
    <>
      <EuiSpacer size="s" />
      {reason.split('\n').map((m, i) => (
        <div key={i}>{m}</div>
      ))}
    </>
  );
};

export const FindFileStructurePermissionDenied: FC = () => {
  return (
    <>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.dataVisualizer.file.fileErrorCallouts.findFileStructurePermissionDenied.title"
            defaultMessage="Permission denied"
          />
        }
        color="danger"
        iconType="cross"
        data-test-subj="dataVisualizerFileStructurePermissionDeniedErrorCallout"
      >
        <FormattedMessage
          id="xpack.dataVisualizer.file.fileErrorCallouts.findFileStructurePermissionDenied.description"
          defaultMessage="You do not have sufficient privileges to analyze files."
        />
      </EuiCallOut>
    </>
  );
};
