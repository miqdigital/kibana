/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { HttpSetup } from '@kbn/core/public';
import { Status } from '../../../../../common/types/api';
import {
  ConvertConnectorApiLogic,
  ConvertConnectorApiLogicArgs,
  ConvertConnectorApiLogicResponse,
} from '../../../../api/connector/convert_connector_api_logic';
import { ConnectorViewLogic } from '../../../connector_detail/connector_view_logic';
import { IndexViewLogic } from '../../index_view_logic';
import { Actions } from '../../../../api/api_logic/create_api_logic';

interface ConvertConnectorValues {
  connectorId: typeof IndexViewLogic.values.connectorId;
  isLoading: boolean;
  isModalVisible: boolean;
  status: Status;
}

type ConvertConnectorActions = Pick<
  Actions<ConvertConnectorApiLogicArgs, ConvertConnectorApiLogicResponse>,
  'apiError' | 'apiSuccess' | 'makeRequest'
> & {
  convertConnector(): void;
  hideModal(): void;
  showModal(): void;
};

export interface ConvertConnectorLogicProps {
  http?: HttpSetup;
}

export const ConvertConnectorLogic = kea<
  MakeLogicType<ConvertConnectorValues, ConvertConnectorActions, ConvertConnectorLogicProps>
>({
  actions: {
    convertConnector: () => true,
    deleteDomain: () => true,
    hideModal: () => true,
    showModal: () => true,
  },
  key: (props) => props.http,
  connect: {
    actions: [ConvertConnectorApiLogic, ['apiError', 'apiSuccess', 'makeRequest']],
    values: [ConvertConnectorApiLogic, ['status'], ConnectorViewLogic, ['connectorId']],
    keys: [ConnectorViewLogic, ['http']],
  },
  listeners: ({ actions, values, props }) => ({
    apiSuccess: () => {
      actions.hideModal();
    },
    convertConnector: () => {
      if (values.connectorId) {
        actions.makeRequest({ connectorId: values.connectorId, http: props.http });
      }
    },
  }),
  path: ['content_connectors', 'convert_connector_modal'],
  reducers: {
    isModalVisible: [
      false,
      {
        apiError: () => false,
        apiSuccess: () => false,
        hideModal: () => false,
        showModal: () => true,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    isLoading: [() => [selectors.status], (status: Status) => status === Status.LOADING],
  }),
});
