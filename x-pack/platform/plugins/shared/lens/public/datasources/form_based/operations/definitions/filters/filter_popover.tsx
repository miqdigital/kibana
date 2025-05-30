/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiPopover, EuiSpacer } from '@elastic/eui';
import type { Query } from '@kbn/es-query';
// Need to keep it separate to make it work Jest mocks in dimension_panel tests
// import { QueryInput } from '../../../../shared_components/query_input';
import { isQueryValid, QueryInput } from '@kbn/visualization-ui-components';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { LENS_APP_NAME } from '../../../../../../common/constants';
import { IndexPattern } from '../../../../../types';
import { FilterValue, defaultLabel } from '.';
import { LabelInput } from '../shared_components';
import { LensAppServices } from '../../../../../app_plugin/types';

export const FilterPopover = ({
  filter,
  setFilter,
  indexPattern,
  button,
  isOpen,
  triggerClose,
}: {
  filter: FilterValue;
  setFilter: Function;
  indexPattern: IndexPattern;
  button: React.ReactChild;
  isOpen: boolean;
  triggerClose: () => void;
}) => {
  const inputRef = React.useRef<HTMLInputElement>();
  const [localFilter, setLocalFilter] = useState(() => filter);

  const setFilterLabel = (label: string) => {
    setLocalFilter({ ...localFilter, label });
    setFilter({ ...filter, label });
  };
  const setFilterQuery = (input: Query) => {
    setLocalFilter({ ...localFilter, input });
    if (isQueryValid(input, indexPattern)) {
      setFilter({ ...filter, input });
    }
  };

  const getPlaceholder = (query: Query['query']) => {
    if (query === '') {
      return defaultLabel;
    }
    if (query === 'object') return JSON.stringify(query);
    else {
      return String(query);
    }
  };
  const closePopover = () => {
    setLocalFilter({ ...localFilter, input: filter.input });
    triggerClose();
  };

  return (
    <EuiPopover
      data-test-subj="indexPattern-filters-existingFilterContainer"
      panelStyle={{
        width: '960px',
      }}
      isOpen={isOpen}
      ownFocus
      closePopover={closePopover}
      button={button}
    >
      <QueryInput
        isInvalid={!isQueryValid(localFilter.input, indexPattern)}
        value={localFilter.input}
        dataView={
          indexPattern.id
            ? { type: 'id', value: indexPattern.id }
            : { type: 'title', value: indexPattern.title }
        }
        disableAutoFocus
        onChange={setFilterQuery}
        onSubmit={() => {
          if (inputRef.current) inputRef.current.focus();
        }}
        appName={LENS_APP_NAME}
        services={useKibana<LensAppServices>().services}
      />
      <EuiSpacer size="s" />
      <LabelInput
        value={localFilter.label || ''}
        onChange={setFilterLabel}
        placeholder={getPlaceholder(localFilter.input.query)}
        inputRef={inputRef}
        onSubmit={closePopover}
        dataTestSubj="indexPattern-filters-label"
      />
    </EuiPopover>
  );
};
