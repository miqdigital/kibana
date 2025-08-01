/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { isValidKuery } from '../../query_bar/query_bar';
import * as labels from '../translations';
import { useUptimeDataView } from '../../../../hooks';
import { ClientPluginsStart } from '../../../../../plugin';

interface Props {
  query: string;
  onChange: (query: string) => void;
}

export const AlertQueryBar = ({ query = '', onChange }: Props) => {
  const dataView = useUptimeDataView();
  const { services } = useKibana<ClientPluginsStart>();

  const {
    appName,
    unifiedSearch: {
      ui: { QueryStringInput },
    },
  } = services;

  const [inputVal, setInputVal] = useState<string>(query);

  useEffect(() => {
    onChange(query);
    setInputVal(query);
  }, [onChange, query]);

  return (
    <QueryStringInput
      indexPatterns={dataView ? [dataView] : []}
      iconType="search"
      isClearable={true}
      onChange={(queryN) => {
        setInputVal(queryN?.query as string);
        if (isValidKuery(queryN?.query as string)) {
          // we want to submit when user clears or paste a complete kuery
          onChange(queryN.query as string);
        }
      }}
      onSubmit={(queryN) => {
        if (queryN) onChange(queryN.query as string);
      }}
      query={{ query: inputVal, language: 'kuery' }}
      aria-label={labels.ALERT_KUERY_BAR_ARIA}
      dataTestSubj="xpack.synthetics.alerts.monitorStatus.filterBar"
      autoSubmit={true}
      disableLanguageSwitcher={true}
      isInvalid={!!(inputVal && !query)}
      placeholder={i18n.translate('xpack.uptime.alerts.searchPlaceholder.kql', {
        defaultMessage: 'Filter using kql syntax',
      })}
      appName={appName}
    />
  );
};
