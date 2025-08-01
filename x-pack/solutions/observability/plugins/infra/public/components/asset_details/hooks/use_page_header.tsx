/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  type EuiBreadcrumbsProps,
  type EuiPageHeaderProps,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RouteState } from '@kbn/metrics-data-access-plugin/public';
import { capitalize, isEmpty } from 'lodash';
import React, { useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { usePluginConfig } from '../../../containers/plugin_config_context';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { useProfilingPluginSetting } from '../../../hooks/use_profiling_integration_setting';
import { CreateAlertRuleButton } from '../../shared/alerts/links/create_alert_rule_button';
import { LinkToNodeDetails } from '../links';
import { ContentTabIds, type LinkOptions, type Tab, type TabIds } from '../types';
import { useAssetDetailsRenderPropsContext } from './use_asset_details_render_props';
import { useTabSwitcherContext } from './use_tab_switcher';

type TabItem = NonNullable<Pick<EuiPageHeaderProps, 'tabs'>['tabs']>[number];

export const usePageHeader = (tabs: Tab[] = [], links: LinkOptions[] = []) => {
  const { rightSideItems } = useRightSideItems(links);
  const { tabEntries } = useTabs(tabs);
  const { breadcrumbs } = useTemplateHeaderBreadcrumbs();

  return { rightSideItems, tabEntries, breadcrumbs };
};

export const useTemplateHeaderBreadcrumbs = () => {
  const history = useHistory();
  const location = useLocation<RouteState>();
  const {
    services: {
      application: { navigateToApp },
    },
  } = useKibanaContextForPlugin();

  const onClick = (e: React.MouseEvent) => {
    if (location.state) {
      navigateToApp(location.state.originAppId, {
        replace: true,
        path: `${location.state.originPathname}${location.state.originSearch}`,
      });
    } else {
      history.goBack();
    }
    e.preventDefault();
  };

  const breadcrumbs: EuiBreadcrumbsProps['breadcrumbs'] =
    // If there is a state object in location, it's persisted in case the page is opened in a new tab or after page refresh
    // With that, we can show the return button. Otherwise, it will be hidden (ex: the user opened a shared URL or opened the page from their bookmarks)
    !isEmpty(location.state) || history.length > 1
      ? [
          {
            text: (
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem>
                  <EuiIcon size="s" type="arrowLeft" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <FormattedMessage
                    id="xpack.infra.assetDetails.header.return"
                    defaultMessage="Return"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            ),
            color: 'primary',
            'aria-current': false,
            'data-test-subj': 'infraAssetDetailsReturnButton',
            href: '#',
            onClick,
          },
        ]
      : [];

  return { breadcrumbs };
};

const useRightSideItems = (links?: LinkOptions[]) => {
  const { entity } = useAssetDetailsRenderPropsContext();

  const topCornerLinkComponents: Record<LinkOptions, JSX.Element> = useMemo(
    () => ({
      nodeDetails: (
        <LinkToNodeDetails entityId={entity.id} entityName={entity.name} entityType={entity.type} />
      ),
      alertRule: (
        <CreateAlertRuleButton data-test-subj="infraAssetDetailsPageHeaderCreateAlertsRuleButton" />
      ),
    }),
    [entity.id, entity.name, entity.type]
  );

  const rightSideItems = useMemo(
    () => links?.map((link) => topCornerLinkComponents[link]),
    [links, topCornerLinkComponents]
  );

  return { rightSideItems };
};

const useFeatureFlagTabs = () => {
  const { featureFlags } = usePluginConfig();
  const isProfilingPluginEnabled = useProfilingPluginSetting();

  const featureFlagControlledTabs: Partial<Record<ContentTabIds, boolean>> = useMemo(
    () => ({
      [ContentTabIds.OSQUERY]: Boolean(featureFlags.osqueryEnabled),
      [ContentTabIds.PROFILING]: Boolean(isProfilingPluginEnabled),
    }),
    [featureFlags.osqueryEnabled, isProfilingPluginEnabled]
  );

  const isTabEnabled = useCallback(
    (tabItem: Tab) => {
      return featureFlagControlledTabs[tabItem.id] ?? true;
    },
    [featureFlagControlledTabs]
  );

  return {
    isTabEnabled,
  };
};

const useTabs = (tabs: Tab[]) => {
  const { showTab, activeTabId } = useTabSwitcherContext();
  const { isTabEnabled } = useFeatureFlagTabs();

  const onTabClick = useCallback(
    (tabId: TabIds) => {
      showTab(tabId);
    },
    [showTab]
  );

  const tabEntries: TabItem[] = useMemo(
    () =>
      tabs.filter(isTabEnabled).map(({ name, ...tab }) => {
        return {
          ...tab,
          'data-test-subj': `infraAssetDetails${capitalize(tab.id)}Tab`,
          onClick: () => onTabClick(tab.id),
          isSelected: tab.id === activeTabId,
          label: name,
        };
      }),
    [activeTabId, isTabEnabled, onTabClick, tabs]
  );

  return { tabEntries };
};
