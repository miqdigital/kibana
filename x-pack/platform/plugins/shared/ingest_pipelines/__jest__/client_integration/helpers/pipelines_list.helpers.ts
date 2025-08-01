/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { HttpSetup } from '@kbn/core/public';

import {
  registerTestBed,
  TestBed,
  AsyncTestBedConfig,
  findTestSubject,
} from '@kbn/test-jest-helpers';
import { PipelinesList } from '../../../public/application/sections/pipelines_list';
import { WithAppDependencies } from './setup_environment';
import { getListPath, ROUTES } from '../../../public/application/services/navigation';

export type PipelineListTestBed = TestBed<PipelineListTestSubjects> & {
  actions: ReturnType<typeof createActions>;
};

const createActions = (testBed: TestBed) => {
  /**
   * User Actions
   */
  const clickReloadButton = async () => {
    const { component, find } = testBed;

    await act(async () => {
      find('reloadButton').simulate('click');
    });

    component.update();
  };

  const clickPipelineAt = async (index: number) => {
    const { component, table } = testBed;
    const { rows } = table.getMetaData('pipelinesTable');
    const pipelineLink = findTestSubject(rows[index].reactWrapper, 'pipelineDetailsLink');

    act(() => {
      pipelineLink.simulate('click');
    });

    component.update();
  };

  const clickActionMenu = (pipelineName: string) => {
    const { component } = testBed;

    act(() => {
      // When a table has > 2 actions, EUI displays an overflow menu with an id "<pipeline_name>-actions"
      component.find(`div[id="${pipelineName}-actions"] button`).simulate('click');
    });

    component.update();
  };

  const clickPipelineAction = (pipelineName: string, action: 'edit' | 'clone' | 'delete') => {
    const actions = ['edit', 'clone', 'delete'];
    const { component } = testBed;

    clickActionMenu(pipelineName);

    act(() => {
      component.find('button.euiContextMenuItem').at(actions.indexOf(action)).simulate('click');
    });

    component.update();
  };

  return {
    clickReloadButton,
    clickPipelineAt,
    clickPipelineAction,
    clickActionMenu,
  };
};

export const setup = async (
  httpSetup: HttpSetup,
  queryParams: string = ''
): Promise<PipelineListTestBed> => {
  const testBedConfig: AsyncTestBedConfig = {
    memoryRouter: {
      initialEntries: [`${getListPath()}${queryParams}`],
      componentRoutePath: ROUTES.list,
    },
    doMountAsync: true,
  };

  const initTestBed = registerTestBed(WithAppDependencies(PipelinesList, httpSetup), testBedConfig);
  const testBed = await initTestBed();

  return {
    ...testBed,
    actions: createActions(testBed),
  };
};

export type PipelineListTestSubjects =
  | 'appTitle'
  | 'documentationLink'
  | 'createPipelineDropdown'
  | 'pipelinesTable'
  | 'pipelineDetails'
  | 'detailsPanelTitle'
  | 'deletePipelinesConfirmation'
  | 'emptyList'
  | 'emptyList.title'
  | 'sectionLoading'
  | 'pipelineLoadError'
  | 'jsonCodeBlock'
  | 'reloadButton'
  | 'pipelineErrorFlyout'
  | 'pipelineErrorFlyout.title'
  | 'pipelineError'
  | 'pipelineError.cause'
  | 'missingCustomPipeline'
  | 'missingCustomPipeline.cause'
  | 'createCustomPipeline'
  | 'pipelineTreePanel';
