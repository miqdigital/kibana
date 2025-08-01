/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import type { UninstallResponse } from '@kbn/product-doc-base-plugin/common/http_api/installation';
import { REACT_QUERY_KEYS } from '../constants';
import { useKibana } from './use_kibana';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useUninstallProductDoc() {
  const {
    productDocBase,
    notifications: { toasts },
  } = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation<UninstallResponse, ServerError, string>(
    [REACT_QUERY_KEYS.UNINSTALL_PRODUCT_DOC],
    (inferenceId: string) => {
      return productDocBase!.installation.uninstall({ inferenceId });
    },
    {
      networkMode: 'always',
      onSuccess: () => {
        toasts.addSuccess(
          i18n.translate(
            'xpack.observabilityAiAssistantManagement.kb.uninstallProductDoc.successNotification',
            {
              defaultMessage: 'The Elastic documentation was successfully uninstalled',
            }
          )
        );

        queryClient.invalidateQueries({
          queryKey: [REACT_QUERY_KEYS.GET_PRODUCT_DOC_STATUS],
          refetchType: 'all',
        });
      },
      onError: (error) => {
        toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate(
            'xpack.observabilityAiAssistantManagement.kb.uninstallProductDoc.errorNotification',
            {
              defaultMessage: 'Something went wrong while uninstalling the Elastic documentation',
            }
          ),
        });
      },
    }
  );
}
