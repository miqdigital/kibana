/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState, useContext, useEffect, useMemo } from 'react';
import {
  useEuiTheme,
  EuiComboBox,
  type EuiComboBoxOptionOption,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { JobCreatorContext } from '../../../job_creator_context';
import { tabColor } from '../../../../../../../../../common/util/group_color_utils';
import { Description } from './description';

export const GroupsInput: FC = () => {
  const { euiTheme } = useEuiTheme();

  const { jobCreator, jobCreatorUpdate, jobValidator, jobValidatorUpdated } =
    useContext(JobCreatorContext);
  const { existingJobsAndGroups } = useContext(JobCreatorContext);
  const [selectedGroups, setSelectedGroups] = useState(jobCreator.groups);
  const titleId = useGeneratedHtmlId({ prefix: 'groupsInput' });

  const validation = useMemo(() => {
    const valid =
      jobValidator.groupIds.valid === true &&
      jobValidator.latestValidationResult.groupIdsExist?.valid === true;
    const message =
      jobValidator.groupIds.message ?? jobValidator.latestValidationResult.groupIdsExist?.message;

    return {
      valid,
      message,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobValidatorUpdated]);

  useEffect(() => {
    jobCreator.groups = selectedGroups;
    jobCreatorUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroups.join()]);

  const options: EuiComboBoxOptionOption[] = existingJobsAndGroups.groupIds.map((g: string) => ({
    label: g,
    color: tabColor(g, euiTheme),
  }));

  const selectedOptions: EuiComboBoxOptionOption[] = selectedGroups.map((g: string) => ({
    label: g,
    color: tabColor(g, euiTheme),
  }));

  function onChange(optionsIn: EuiComboBoxOptionOption[]) {
    setSelectedGroups(optionsIn.map((g) => g.label));
  }

  function onCreateGroup(input: string, flattenedOptions: EuiComboBoxOptionOption[]) {
    const normalizedSearchValue = input.trim().toLowerCase();

    if (!normalizedSearchValue) {
      return;
    }

    const newGroup: EuiComboBoxOptionOption = {
      label: input,
      color: tabColor(input, euiTheme),
    };

    if (
      flattenedOptions.findIndex(
        (option) => option.label.trim().toLowerCase() === normalizedSearchValue
      ) === -1
    ) {
      options.push(newGroup);
    }

    setSelectedGroups([...selectedOptions, newGroup].map((g) => g.label));
  }

  return (
    <Description validation={validation} titleId={titleId}>
      <EuiComboBox
        placeholder={i18n.translate(
          'xpack.ml.newJob.wizard.jobDetailsStep.jobGroupSelect.placeholder',
          {
            defaultMessage: 'Select or create groups',
          }
        )}
        options={options}
        selectedOptions={selectedOptions}
        onChange={onChange}
        onCreateOption={onCreateGroup}
        isClearable={true}
        isInvalid={validation.valid === false}
        data-test-subj="mlJobWizardComboBoxJobGroups"
        aria-labelledby={titleId}
      />
    </Description>
  );
};
