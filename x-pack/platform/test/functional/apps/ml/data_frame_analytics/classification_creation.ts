/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIME_RANGE_TYPE } from '@kbn/ml-plugin/public/application/components/custom_urls/custom_url_editor/constants';
import type { AnalyticsTableRowDetails } from '../../../services/ml/data_frame_analytics_table';
import {
  type DiscoverUrlConfig,
  type DashboardUrlConfig,
  type OtherUrlConfig,
} from '../../../services/ml/data_frame_analytics_edit';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import type { FieldStatsType } from '../common/types';

const testDiscoverCustomUrl: DiscoverUrlConfig = {
  label: 'Show data',
  indexName: 'ft_bank_marketing',
  queryEntityFieldNames: ['day'],
  timeRange: TIME_RANGE_TYPE.AUTO,
};

const testDashboardCustomUrl: DashboardUrlConfig = {
  label: 'Show dashboard',
  dashboardName: 'ML Test',
  queryEntityFieldNames: ['day'],
  timeRange: TIME_RANGE_TYPE.AUTO,
};

const testOtherCustomUrl: OtherUrlConfig = {
  label: 'elastic.co',
  url: 'https://www.elastic.co/',
};

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const editedDescription = 'Edited description';

  describe('classification creation', function () {
    let testDashboardId: string | null = null;
    before(async () => {
      await esArchiver.loadIfNeeded(
        'x-pack/platform/test/fixtures/es_archives/ml/bm_classification'
      );
      await ml.testResources.createDataViewIfNeeded('ft_bank_marketing');
      await ml.testResources.setKibanaTimeZoneToUTC();
      testDashboardId = await ml.testResources.createMLTestDashboardIfNeeded();

      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await ml.testResources.deleteDataViewByTitle('ft_bank_marketing');
    });

    const jobId = `bm_1_${Date.now()}`;
    const testDataList = [
      {
        suiteTitle: 'bank marketing',
        jobType: 'classification',
        jobId,
        jobDescription:
          "Classification job based on 'ft_bank_marketing' dataset with dependentVariable 'y' and trainingPercent '20'",
        source: 'ft_bank_marketing',
        get destinationIndex(): string {
          return `user-${this.jobId}`;
        },
        runtimeFields: {
          uppercase_y: {
            type: 'keyword',
            script: 'emit(params._source.y.toUpperCase())',
          },
        },
        dependentVariable: 'y',
        trainingPercent: 20,
        modelMemory: '60mb',
        createDataView: true,
        fieldStatsEntries: [
          {
            fieldName: 'age',
            type: 'number' as FieldStatsType,
            isDependentVariableInput: true,
          },
          {
            fieldName: 'balance.keyword',
            type: 'keyword' as FieldStatsType,
            isDependentVariableInput: true,
          },
        ],
        advancedEditorContent: [
          '{',
          `  "description": "Classification job based on 'ft_bank_marketing' dataset with dependentVariable 'y' and trainingPercent '20'",`,
          '  "source": {',
        ],
        expected: {
          rocCurveColorState: [
            // tick/grid/axis
            { color: '#DDDDDD', percentage: 50 },
            // line
            { color: '#98A2B3', percentage: 10 },
          ],
          scatterplotMatrixColorStats: [
            // marker colors
            { color: '#7FC6B3', percentage: 1 },
            { color: '#88ADD0', percentage: 0.03 },
            // tick/grid/axis
            { color: '#DDDDDD', percentage: 8 },
            { color: '#D3DAE6', percentage: 8 },
            { color: '#F5F7FA', percentage: 15 },
          ],
          runtimeFieldsEditorContent: ['{', '  "uppercase_y": {', '    "type": "keyword",'],
          row: {
            memoryStatus: 'ok',
            type: 'classification',
            status: 'stopped',
            progress: '100',
          },
          rowDetails: {
            jobDetails: [
              {
                section: 'state',
                // Don't include the 'Create time' value entry as it's not stable.
                expectedEntries: [
                  'Status',
                  'stopped',
                  'Create time',
                  'Model memory limit',
                  '25mb',
                  'Version',
                ],
              },
              {
                section: 'stats',
                // Don't include the 'timestamp' or 'peak usage bytes' value entries as it's not stable.
                expectedEntries: ['Memory usage', 'Timestamp', 'Peak usage bytes', 'Status', 'ok'],
              },
              {
                section: 'counts',
                expectedEntries: [
                  'Data counts',
                  'Training docs',
                  '1862',
                  'Test docs',
                  '7452',
                  'Skipped docs',
                  '0',
                ],
              },
              {
                section: 'progress',
                expectedEntries: [
                  'Phase 8/8',
                  'reindexing',
                  '100%',
                  'loading_data',
                  '100%',
                  'feature_selection',
                  '100%',
                  'coarse_parameter_search',
                  '100%',
                  'fine_tuning_parameters',
                  '100%',
                  'final_training',
                  '100%',
                  'writing_results',
                  '100%',
                  'inference',
                  '100%',
                ],
              },
              {
                section: 'analysisStats',
                expectedEntries: {
                  '': '',
                  timestamp: 'February 24th 2023, 22:47:21',
                  timing_stats: '{"elapsed_time":106,"iteration_time":75}',
                  class_assignment_objective: 'maximize_minimum_recall',
                  alpha: '7.472711200701066',
                  downsample_factor: '0.3052602404313446',
                  eta: '0.5195489124616268',
                  eta_growth_rate_per_tree: '1.2597744562308133',
                  feature_bag_fraction: '0.2828427124746191',
                  gamma: '2.02003625000462',
                  lambda: '0.5454579969846399',
                  max_attempts_to_add_tree: '3',
                  max_optimization_rounds_per_hyperparameter: '2',
                  max_trees: '5',
                  num_folds: '5',
                  num_splits_per_feature: '75',
                  soft_tree_depth_limit: '8.425554156072732',
                  soft_tree_depth_tolerance: '0.15',
                },
              },
            ],
          } as AnalyticsTableRowDetails,
        },
      },
    ];
    for (const testData of testDataList) {
      describe(`${testData.suiteTitle}`, function () {
        after(async () => {
          await ml.api.deleteIndices(testData.destinationIndex);
          await ml.testResources.deleteDataViewByTitle(testData.destinationIndex);
        });

        it('loads the data frame analytics wizard', async () => {
          await ml.testExecution.logTestStep('loads the data frame analytics page');
          await ml.navigation.navigateToStackManagementMlSection('analytics', 'mlAnalyticsJobList');

          await ml.testExecution.logTestStep('loads the source selection modal');

          // Disable anti-aliasing to stabilize canvas image rendering assertions
          await ml.commonUI.disableAntiAliasing();

          await ml.dataFrameAnalytics.startAnalyticsCreation();

          await ml.testExecution.logTestStep(
            'selects the source data and loads the job wizard page'
          );
          await ml.jobSourceSelection.selectSourceForAnalyticsJob(testData.source);
          await ml.dataFrameAnalyticsCreation.assertConfigurationStepActive();
        });

        it('navigates through the wizard and sets all needed fields', async () => {
          await ml.testExecution.logTestStep('selects the job type');
          await ml.dataFrameAnalyticsCreation.assertJobTypeSelectExists();
          await ml.dataFrameAnalyticsCreation.selectJobType(testData.jobType);

          await ml.testExecution.logTestStep('displays the runtime mappings editor switch');
          await ml.dataFrameAnalyticsCreation.assertRuntimeMappingSwitchExists();

          await ml.testExecution.logTestStep('enables the runtime mappings editor');
          await ml.dataFrameAnalyticsCreation.toggleRuntimeMappingsEditorSwitch(true);
          await ml.dataFrameAnalyticsCreation.assertRuntimeMappingsEditorContent(['']);

          await ml.testExecution.logTestStep('sets runtime mappings');
          await ml.dataFrameAnalyticsCreation.setRuntimeMappingsEditorContent(
            JSON.stringify(testData.runtimeFields)
          );
          await ml.dataFrameAnalyticsCreation.applyRuntimeMappings();
          await ml.dataFrameAnalyticsCreation.assertRuntimeMappingsEditorContent(
            testData.expected.runtimeFieldsEditorContent
          );

          await ml.testExecution.logTestStep(
            'opens field stats flyout from dependent variable input'
          );
          await ml.dataFrameAnalyticsCreation.assertDependentVariableInputExists();
          for (const { fieldName, type: fieldType } of testData.fieldStatsEntries.filter(
            (e) => e.isDependentVariableInput
          )) {
            await ml.dataFrameAnalyticsCreation.assertFieldStatsFlyoutContentFromDependentVariableInputTrigger(
              fieldName,
              fieldType
            );
          }

          await ml.testExecution.logTestStep('inputs the dependent variable');
          await ml.dataFrameAnalyticsCreation.selectDependentVariable(testData.dependentVariable);

          await ml.testExecution.logTestStep('inputs the training percent');
          await ml.dataFrameAnalyticsCreation.assertTrainingPercentInputExists();
          await ml.dataFrameAnalyticsCreation.setTrainingPercent(testData.trainingPercent);

          await ml.testExecution.logTestStep('displays the source data preview');
          await ml.dataFrameAnalyticsCreation.assertSourceDataPreviewExists();

          await ml.testExecution.logTestStep('displays the include fields selection');
          await ml.dataFrameAnalyticsCreation.assertIncludeFieldsSelectionExists();

          await ml.testExecution.logTestStep(
            'sets the sample size to 10000 for the scatterplot matrix'
          );
          await ml.dataFrameAnalyticsCreation.setScatterplotMatrixSampleSizeSelectValue('10000');

          await ml.testExecution.logTestStep(
            'sets the randomize query switch to true for the scatterplot matrix'
          );
          await ml.dataFrameAnalyticsCreation.setScatterplotMatrixRandomizeQueryCheckState(true);

          await ml.testExecution.logTestStep('displays the scatterplot matrix');
          // TODO Revisit after Borealis update is fully done
          // await ml.dataFrameAnalyticsCreation.assertScatterplotMatrix(
          //   testData.expected.scatterplotMatrixColorStats
          // );

          await ml.testExecution.logTestStep('continues to the additional options step');
          await ml.dataFrameAnalyticsCreation.continueToAdditionalOptionsStep();

          await ml.testExecution.logTestStep('accepts the suggested model memory limit');
          await ml.dataFrameAnalyticsCreation.assertModelMemoryInputExists();
          await ml.dataFrameAnalyticsCreation.assertModelMemoryInputPopulated();

          await ml.testExecution.logTestStep('continues to the details step');
          await ml.dataFrameAnalyticsCreation.continueToDetailsStep();

          await ml.testExecution.logTestStep('inputs the job id');
          await ml.dataFrameAnalyticsCreation.assertJobIdInputExists();
          await ml.dataFrameAnalyticsCreation.setJobId(testData.jobId);

          await ml.testExecution.logTestStep('inputs the job description');
          await ml.dataFrameAnalyticsCreation.assertJobDescriptionInputExists();
          await ml.dataFrameAnalyticsCreation.setJobDescription(testData.jobDescription);

          await ml.testExecution.logTestStep(
            'should default the set destination index to job id switch to true'
          );
          await ml.dataFrameAnalyticsCreation.assertDestIndexSameAsIdSwitchExists();
          await ml.dataFrameAnalyticsCreation.assertDestIndexSameAsIdCheckState(true);

          await ml.testExecution.logTestStep('should input the destination index');
          await ml.dataFrameAnalyticsCreation.setDestIndexSameAsIdCheckState(false);
          await ml.dataFrameAnalyticsCreation.assertDestIndexInputExists();
          await ml.dataFrameAnalyticsCreation.setDestIndex(testData.destinationIndex);

          await ml.testExecution.logTestStep('displays the create data view switch');
          await ml.dataFrameAnalyticsCreation.assertCreateDataViewSwitchExists();
          await ml.dataFrameAnalyticsCreation.assertCreateDataViewSwitchCheckState(true);

          await ml.testExecution.logTestStep('continues to the validation step');
          await ml.dataFrameAnalyticsCreation.continueToValidationStep();

          await ml.testExecution.logTestStep('checks validation callouts exist');
          await ml.dataFrameAnalyticsCreation.assertValidationCalloutsExists();
          // Expect the follow callouts:
          // - ✓ Dependent variable
          // - ✓ Training percent
          // - ✓ Top classes
          // - ⚠ Analysis fields
          await ml.dataFrameAnalyticsCreation.assertAllValidationCalloutsPresent(4);

          // switch to json editor and back
          await ml.testExecution.logTestStep('switches to advanced editor then back to form');
          await ml.dataFrameAnalyticsCreation.openAdvancedEditor();
          await ml.dataFrameAnalyticsCreation.assertAdvancedEditorCodeEditorContent(
            testData.advancedEditorContent
          );
          await ml.dataFrameAnalyticsCreation.closeAdvancedEditor();

          await ml.testExecution.logTestStep('continues to the create step');
          await ml.dataFrameAnalyticsCreation.continueToCreateStep();
        });

        it('runs the analytics job and displays it correctly in the job list', async () => {
          await ml.testExecution.logTestStep('creates and starts the analytics job');
          await ml.dataFrameAnalyticsCreation.assertCreateButtonExists();
          await ml.dataFrameAnalyticsCreation.assertStartJobSwitchCheckState(true);
          await ml.dataFrameAnalyticsCreation.createAnalyticsJob(testData.jobId);

          await ml.testExecution.logTestStep('finishes analytics processing');
          await ml.dataFrameAnalytics.waitForAnalyticsCompletion(testData.jobId);

          await ml.testExecution.logTestStep('displays the analytics table');
          await ml.navigation.navigateToStackManagementMlSection('analytics', 'mlAnalyticsJobList');
          await ml.dataFrameAnalytics.assertAnalyticsTableExists();

          await ml.testExecution.logTestStep('displays the stats bar');
          await ml.dataFrameAnalytics.assertAnalyticsStatsBarExists();

          await ml.testExecution.logTestStep('displays the created job in the analytics table');
          await ml.dataFrameAnalyticsTable.refreshAnalyticsTable();
          await ml.dataFrameAnalyticsTable.filterWithSearchString(testData.jobId, 1);

          await ml.testExecution.logTestStep(
            'displays details for the created job in the analytics table'
          );
          await ml.dataFrameAnalyticsTable.assertAnalyticsRowFields(testData.jobId, {
            id: testData.jobId,
            description: testData.jobDescription,
            memoryStatus: testData.expected.row.memoryStatus,
            sourceIndex: testData.source,
            destinationIndex: testData.destinationIndex,
            type: testData.expected.row.type,
            status: testData.expected.row.status,
            progress: testData.expected.row.progress,
          });

          await ml.dataFrameAnalyticsTable.assertAnalyticsRowDetails(
            testData.jobId,
            testData.expected.rowDetails
          );
        });

        it('adds discover custom url to the analytics job', async () => {
          await ml.testExecution.logTestStep('opens edit flyout for discover url');
          await ml.dataFrameAnalyticsTable.openEditFlyout(testData.jobId);

          await ml.testExecution.logTestStep('adds discover custom url for the analytics job');
          await ml.dataFrameAnalyticsEdit.addDiscoverCustomUrl(
            testData.jobId,
            testDiscoverCustomUrl
          );
        });

        it('adds dashboard custom url to the analytics job', async () => {
          await ml.testExecution.logTestStep('opens edit flyout for dashboard url');
          await ml.dataFrameAnalyticsTable.openEditFlyout(testData.jobId);

          await ml.testExecution.logTestStep('adds dashboard custom url for the analytics job');
          await ml.dataFrameAnalyticsEdit.addDashboardCustomUrl(
            testData.jobId,
            testDashboardCustomUrl,
            {
              index: 1,
              url: `dashboards#/view/${testDashboardId}?_g=(filters:!(),time:(from:'$earliest$',mode:absolute,to:'$latest$'))&_a=(filters:!(),query:(language:kuery,query:'day:\"$day$\"'))`,
            }
          );
        });

        it('adds other custom url type to the analytics job', async () => {
          await ml.testExecution.logTestStep('opens edit flyout for other url');
          await ml.dataFrameAnalyticsTable.openEditFlyout(testData.jobId);

          await ml.testExecution.logTestStep('adds other type custom url for the analytics job');
          await ml.dataFrameAnalyticsEdit.addOtherTypeCustomUrl(testData.jobId, testOtherCustomUrl);
        });

        it('edits the analytics job and displays it correctly in the job list', async () => {
          await ml.testExecution.logTestStep(
            'should open the edit form for the created job in the analytics table'
          );
          await ml.dataFrameAnalyticsTable.openEditFlyout(testData.jobId);

          await ml.testExecution.logTestStep('should input the description in the edit form');
          await ml.dataFrameAnalyticsEdit.assertJobDescriptionEditInputExists();
          await ml.dataFrameAnalyticsEdit.setJobDescriptionEdit(editedDescription);

          await ml.testExecution.logTestStep(
            'should input the model memory limit in the edit form'
          );
          await ml.dataFrameAnalyticsEdit.assertJobMmlEditInputExists();
          await ml.dataFrameAnalyticsEdit.setJobMmlEdit('21mb');

          await ml.testExecution.logTestStep('should submit the edit job form');
          await ml.dataFrameAnalyticsEdit.updateAnalyticsJob();

          await ml.testExecution.logTestStep(
            'displays details for the edited job in the analytics table'
          );
          await ml.dataFrameAnalyticsTable.assertAnalyticsRowFields(testData.jobId, {
            id: testData.jobId,
            description: editedDescription,
            memoryStatus: testData.expected.row.memoryStatus,
            sourceIndex: testData.source,
            destinationIndex: testData.destinationIndex,
            type: testData.expected.row.type,
            status: testData.expected.row.status,
            progress: testData.expected.row.progress,
          });

          await ml.testExecution.logTestStep(
            'creates the destination index and writes results to it'
          );
          await ml.api.assertIndicesExist(testData.destinationIndex);
          await ml.api.assertIndicesNotEmpty(testData.destinationIndex);

          await ml.testExecution.logTestStep('displays the results view for created job');
          await ml.dataFrameAnalyticsTable.openResultsView(testData.jobId);
          await ml.dataFrameAnalyticsResults.assertClassificationEvaluatePanelElementsExists();
          await ml.dataFrameAnalyticsResults.assertClassificationTablePanelExists();
          await ml.dataFrameAnalyticsResults.assertResultsTableExists();
          await ml.dataFrameAnalyticsResults.assertResultsTableTrainingFiltersExist();
          await ml.dataFrameAnalyticsResults.assertResultsTableNotEmpty();

          await ml.testExecution.logTestStep('displays the ROC curve chart');
          // TODO Revisit after Borealis update is fully done
          // await ml.commonUI.assertColorsInCanvasElement(
          //   'mlDFAnalyticsClassificationExplorationRocCurveChart',
          //   testData.expected.rocCurveColorState,
          //   ['#000000'],
          //   undefined,
          //   undefined,
          //   // increased tolerance for ROC curve chart up from 10 to 20
          //   // since the returned colors vary quite a bit on each run.
          //   20
          // );

          await ml.testExecution.logTestStep(
            'sets the sample size to 10000 for the scatterplot matrix'
          );
          await ml.dataFrameAnalyticsResults.setScatterplotMatrixSampleSizeSelectValue('10000');

          await ml.testExecution.logTestStep(
            'sets the randomize query switch to true for the scatterplot matrix'
          );
          await ml.dataFrameAnalyticsResults.setScatterplotMatrixRandomizeQueryCheckState(true);

          await ml.testExecution.logTestStep('displays the scatterplot matrix');
          // TODO Revisit after Borealis update is fully done
          // await ml.dataFrameAnalyticsResults.assertScatterplotMatrix(
          //   testData.expected.scatterplotMatrixColorStats
          // );

          await ml.commonUI.resetAntiAliasing();
        });

        it('displays the analytics job in the map view', async () => {
          await ml.testExecution.logTestStep('should open the map view for created job');
          await ml.navigation.navigateToStackManagementMlSection('analytics', 'mlAnalyticsJobList');
          await ml.dataFrameAnalyticsTable.openMapView(testData.jobId);
          await ml.dataFrameAnalyticsMap.assertMapElementsExists();
          await ml.dataFrameAnalyticsMap.assertJobMapTitle(testData.jobId);
        });
      });
    }
  });
}
