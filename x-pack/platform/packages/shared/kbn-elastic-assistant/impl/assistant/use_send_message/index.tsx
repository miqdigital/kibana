/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core-http-browser';
import { useCallback, useRef, useState } from 'react';
import { ApiConfig, Replacements } from '@kbn/elastic-assistant-common';
import moment from 'moment';
import { useAssistantContext } from '../../assistant_context';
import { fetchConnectorExecuteAction, FetchConnectorExecuteResponse } from '../api';

interface SendMessageProps {
  apiConfig: ApiConfig;
  http: HttpSetup;
  message?: string;
  conversationId: string;
  replacements: Replacements;
}

interface UseSendMessage {
  abortStream: () => void;
  isLoading: boolean;
  sendMessage: ({
    apiConfig,
    http,
    message,
  }: SendMessageProps) => Promise<FetchConnectorExecuteResponse>;
}

export const useSendMessage = (): UseSendMessage => {
  const { alertsIndexPattern, assistantStreamingEnabled, knowledgeBase, traceOptions } =
    useAssistantContext();
  const [isLoading, setIsLoading] = useState(false);
  const abortController = useRef(new AbortController());
  const sendMessage = useCallback(
    async ({ apiConfig, http, message, conversationId, replacements }: SendMessageProps) => {
      setIsLoading(true);

      try {
        return await fetchConnectorExecuteAction({
          conversationId,
          alertsIndexPattern,
          apiConfig,
          assistantStreamingEnabled,
          http,
          message,
          replacements,
          signal: abortController.current.signal,
          size: knowledgeBase.latestAlerts,
          traceOptions,
          screenContext: {
            timeZone: moment.tz.guess(),
          },
        });
      } finally {
        setIsLoading(false);
      }
    },
    [alertsIndexPattern, assistantStreamingEnabled, knowledgeBase.latestAlerts, traceOptions]
  );

  const cancelRequest = useCallback(() => {
    abortController.current.abort();
    abortController.current = new AbortController();
  }, []);

  return { isLoading, sendMessage, abortStream: cancelRequest };
};
