/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { ESQLAst, ESQLAstCompletionCommand, ESQLCommand, ESQLMessage } from '../../../types';
import type { ICommandContext, ICommandCallbacks } from '../../types';
import { getExpressionType } from '../../../definitions/utils/expressions';
import { validateCommandArguments } from '../../../definitions/utils/validation';

const supportedPromptTypes = ['text', 'keyword', 'unknown', 'param'];

export const validate = (
  command: ESQLCommand,
  ast: ESQLAst,
  context?: ICommandContext,
  callbacks?: ICommandCallbacks
): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];

  const { prompt, location, targetField } = command as ESQLAstCompletionCommand;

  const promptExpressionType = getExpressionType(
    prompt,
    context?.fields,
    context?.userDefinedColumns
  );

  if (!supportedPromptTypes.includes(promptExpressionType)) {
    messages.push({
      location: 'location' in prompt ? prompt?.location : location,
      text: i18n.translate('kbn-esql-ast.esql.validation.completionUnsupportedFieldType', {
        defaultMessage:
          '[COMPLETION] prompt must be of type [text] but is [{promptExpressionType}]',
        values: { promptExpressionType },
      }),
      type: 'error',
      code: 'completionUnsupportedFieldType',
    });
  }

  messages.push(...validateCommandArguments(command, ast, context, callbacks));

  const targetName = targetField?.name || 'completion';

  // Sets the target field so the column is recognized after the command is applied
  context?.userDefinedColumns.set(targetName, [
    {
      name: targetName,
      location: targetField?.location || command.location,
      type: 'keyword',
    },
  ]);

  return messages;
};
