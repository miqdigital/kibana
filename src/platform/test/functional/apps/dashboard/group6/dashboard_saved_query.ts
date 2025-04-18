/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const { dashboard, timePicker } = getPageObjects(['dashboard', 'timePicker']);
  const browser = getService('browser');
  const queryBar = getService('queryBar');
  const savedQueryManagementComponent = getService('savedQueryManagementComponent');
  const testSubjects = getService('testSubjects');

  describe('dashboard saved queries', function describeIndexTests() {
    before(async function () {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await dashboard.navigateToApp();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    // FLAKY: https://github.com/elastic/kibana/issues/189023
    describe.skip('saved query management component functionality', function () {
      before(async () => {
        await dashboard.gotoDashboardLandingPage();
        await dashboard.clickNewDashboard();
      });

      it('should show the saved query management load button as disabled when there are no saved queries', async () => {
        await testSubjects.click('showQueryBarMenu');
        const loadFilterSetBtn = await testSubjects.find('saved-query-management-load-button');
        const isDisabled = await loadFilterSetBtn.getAttribute('disabled');
        expect(isDisabled).to.equal('true');
      });

      it('should allow a query to be saved via the saved objects management component', async () => {
        await queryBar.setQuery('response:200');
        await queryBar.clickQuerySubmitButton();
        await testSubjects.click('showQueryBarMenu');
        await savedQueryManagementComponent.saveNewQuery(
          'OkResponse',
          '200 responses for .jpg over 24 hours',
          true,
          true
        );
        const contextMenuPanelTitleButton = await testSubjects.exists(
          'contextMenuPanelTitleButton'
        );
        if (contextMenuPanelTitleButton) {
          await testSubjects.click('contextMenuPanelTitleButton');
        }

        await savedQueryManagementComponent.savedQueryExistOrFail('OkResponse');
        await savedQueryManagementComponent.savedQueryTextExist('response:200');
      });

      it('reinstates filters and the time filter when a saved query has filters and a time filter included', async () => {
        await timePicker.setDefaultAbsoluteRange();
        await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
        await savedQueryManagementComponent.loadSavedQuery('OkResponse');
        const timePickerValues = await timePicker.getTimeConfigAsAbsoluteTimes();
        expect(timePickerValues.start).to.not.eql(timePicker.defaultStartTime);
        expect(timePickerValues.end).to.not.eql(timePicker.defaultEndTime);
      });

      it('preserves the currently loaded query when the page is reloaded', async () => {
        await browser.refresh();
        const timePickerValues = await timePicker.getTimeConfigAsAbsoluteTimes();
        expect(timePickerValues.start).to.not.eql(timePicker.defaultStartTime);
        expect(timePickerValues.end).to.not.eql(timePicker.defaultEndTime);
        expect(await savedQueryManagementComponent.getCurrentlyLoadedQueryID()).to.be('OkResponse');
      });

      it('allows saving changes to a currently loaded query via the saved query management component', async () => {
        await queryBar.setQuery('response:404');
        await savedQueryManagementComponent.updateCurrentlyLoadedQuery('OkResponse', false, false);
        await savedQueryManagementComponent.savedQueryExistOrFail('OkResponse');
        const contextMenuPanelTitleButton = await testSubjects.exists(
          'contextMenuPanelTitleButton'
        );
        if (contextMenuPanelTitleButton) {
          await testSubjects.click('contextMenuPanelTitleButton');
        }
        await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
        expect(await queryBar.getQueryString()).to.eql('');
        await savedQueryManagementComponent.loadSavedQuery('OkResponse');
        expect(await queryBar.getQueryString()).to.eql('response:404');
      });

      it('allows saving the currently loaded query as a new query', async () => {
        await queryBar.setQuery('response:400');
        await savedQueryManagementComponent.saveCurrentlyLoadedAsNewQuery(
          'OkResponseCopy',
          '400 responses',
          false,
          false
        );
        await savedQueryManagementComponent.savedQueryExistOrFail('OkResponseCopy');
      });

      it('allows deleting the currently loaded saved query in the saved query management component and clears the query', async () => {
        await savedQueryManagementComponent.deleteSavedQuery('OkResponseCopy');
        await savedQueryManagementComponent.savedQueryMissingOrFail('OkResponseCopy');
        expect(await queryBar.getQueryString()).to.eql('');
      });

      it('resets any changes to a loaded query on reloading the same saved query', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OkResponse');
        await queryBar.setQuery('response:503');
        await savedQueryManagementComponent.loadSavedQuery('OkResponse');
        expect(await queryBar.getQueryString()).to.eql('response:404');
      });

      it('allows clearing the currently loaded saved query', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OkResponse');
        await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
        expect(await queryBar.getQueryString()).to.eql('');
      });
    });
  });
}
