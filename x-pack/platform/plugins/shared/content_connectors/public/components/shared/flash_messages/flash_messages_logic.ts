/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import type { NotificationsStart } from '@kbn/core-notifications-browser';

import { ScopedHistory } from '@kbn/core/public';
import { IFlashMessage } from './types';

interface FlashMessagesValues {
  historyListener: Function | null;
  messages: IFlashMessage[];
  notifications: NotificationsStart;
  queuedMessages: IFlashMessage[];
  history: ScopedHistory;
}
interface FlashMessagesActions {
  setFlashMessages(messages: IFlashMessage | IFlashMessage[]): { messages: IFlashMessage[] };
  clearFlashMessages(): void;
  setQueuedMessages(messages: IFlashMessage | IFlashMessage[]): { messages: IFlashMessage[] };
  clearQueuedMessages(): void;
  setHistoryListener(historyListener: Function): { historyListener: Function };
}

interface FlashMessagesLogicProps {
  notifications: NotificationsStart;
  history: ScopedHistory;
}

const convertToArray = (messages: IFlashMessage | IFlashMessage[]) =>
  !Array.isArray(messages) ? [messages] : messages;

export const FlashMessagesLogic = kea<
  MakeLogicType<FlashMessagesValues, FlashMessagesActions, FlashMessagesLogicProps>
>({
  actions: {
    clearFlashMessages: () => null,
    clearQueuedMessages: () => null,
    setFlashMessages: (messages) => ({ messages: convertToArray(messages) }),
    setHistoryListener: (historyListener) => ({ historyListener }),
    setQueuedMessages: (messages) => ({ messages: convertToArray(messages) }),
  },
  path: ['content_connectors', 'flash_messages_logic'],
  reducers: ({ props }) => ({
    historyListener: [
      null,
      {
        setHistoryListener: (_, { historyListener }) => historyListener,
      },
    ],
    messages: [
      [],
      {
        clearFlashMessages: () => [],
        setFlashMessages: (_, { messages }) => messages,
      },
    ],
    notifications: [props.notifications || {}, {}],
    history: [props.history || {}, {}],
    queuedMessages: [
      [],
      {
        clearQueuedMessages: () => [],
        setQueuedMessages: (_, { messages }) => messages,
      },
    ],
  }),
  events: ({ values, actions }) => ({
    afterMount: () => {
      if (values.history.listen) {
        // On React Router navigation, clear previous flash messages and load any queued messages
        const unlisten = values.history.listen(() => {
          actions.clearFlashMessages();
          actions.setFlashMessages(values.queuedMessages);
          actions.clearQueuedMessages();
        });
        actions.setHistoryListener(unlisten);
      }
    },
    beforeUnmount: () => {
      const { historyListener: removeHistoryListener } = values;
      if (removeHistoryListener) removeHistoryListener();
    },
  }),
});

/**
 * Mount/props helper
 */
export const mountFlashMessagesLogic = (props: FlashMessagesLogicProps) => {
  FlashMessagesLogic(props);
  const unmount = FlashMessagesLogic.mount();
  return unmount;
};
