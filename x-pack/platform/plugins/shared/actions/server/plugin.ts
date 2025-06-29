/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { UsageCollectionSetup, UsageCounter } from '@kbn/usage-collection-plugin/server';
import type {
  PluginInitializerContext,
  Plugin,
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  IContextProvider,
  ElasticsearchServiceStart,
  SavedObjectsClientContract,
  SavedObjectsBulkGetObject,
  ISavedObjectsRepository,
} from '@kbn/core/server';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import type {
  EncryptedSavedObjectsClient,
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { SpacesPluginStart, SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import type {
  IEventLogClientService,
  IEventLogger,
  IEventLogService,
} from '@kbn/event-log-plugin/server';
import type { MonitoringCollectionSetup } from '@kbn/monitoring-collection-plugin/server';

import type { ServerlessPluginSetup, ServerlessPluginStart } from '@kbn/serverless/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { ActionsConfig, EnabledConnectorTypes } from './config';
import { AllowedHosts, getValidatedConfig } from './config';
import { resolveCustomHosts } from './lib/custom_host_settings';
import { events } from './lib/event_based_telemetry';
import { ActionsClient } from './actions_client/actions_client';
import { ActionTypeRegistry } from './action_type_registry';
import { createBulkExecutionEnqueuerFunction } from './create_execute_function';
import { registerActionsUsageCollector } from './usage';
import type { ILicenseState } from './lib';
import { ActionExecutor, TaskRunnerFactory, LicenseState, spaceIdToNamespace } from './lib';
import type {
  Services,
  ActionType,
  InMemoryConnector,
  ActionTypeConfig,
  ActionTypeSecrets,
  ActionTypeParams,
  ActionsRequestHandlerContext,
  UnsecuredServices,
} from './types';

import type { ActionsConfigurationUtilities } from './actions_config';
import { getActionsConfigurationUtilities } from './actions_config';

import { defineRoutes } from './routes';
import { initializeActionsTelemetry, scheduleActionsTelemetry } from './usage/task';
import {
  ACTION_SAVED_OBJECT_TYPE,
  ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
  ALERT_SAVED_OBJECT_TYPE,
  CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
} from './constants/saved_objects';
import { setupSavedObjects } from './saved_objects';
import { ACTIONS_FEATURE } from './feature';
import { ActionsAuthorization } from './authorization/actions_authorization';
import type { ActionExecutionSource } from './lib/action_execution_source';
import { ensureSufficientLicense } from './lib/ensure_sufficient_license';
import { renderMustacheObject } from './lib/mustache_renderer';
import { getAlertHistoryEsIndex } from './preconfigured_connectors/alert_history_es_index/alert_history_es_index';
import { createAlertHistoryIndexTemplate } from './preconfigured_connectors/alert_history_es_index/create_alert_history_index_template';
import { ACTIONS_FEATURE_ID, AlertHistoryEsIndexConnectorId } from '../common';
import { EVENT_LOG_ACTIONS, EVENT_LOG_PROVIDER } from './constants/event_log';
import { ConnectorTokenClient } from './lib/connector_token_client';
import { InMemoryMetrics, registerClusterCollector, registerNodeCollector } from './monitoring';
import type { ConnectorWithOptionalDeprecation } from './application/connector/lib';
import { isConnectorDeprecated } from './application/connector/lib';
import { createSubActionConnectorFramework } from './sub_action_framework';
import type {
  ICaseServiceAbstract,
  IServiceAbstract,
  SubActionConnectorType,
} from './sub_action_framework/types';
import { SubActionConnector } from './sub_action_framework/sub_action_connector';
import { CaseConnector } from './sub_action_framework/case';
import type { IUnsecuredActionsClient } from './unsecured_actions_client/unsecured_actions_client';
import { UnsecuredActionsClient } from './unsecured_actions_client/unsecured_actions_client';
import { createBulkUnsecuredExecutionEnqueuerFunction } from './create_unsecured_execute_function';
import { createSystemConnectors } from './create_system_actions';
import { ConnectorUsageReportingTask } from './usage/connector_usage_reporting_task';
import { ConnectorRateLimiter } from './lib/connector_rate_limiter';

export interface PluginSetupContract {
  registerType<
    Config extends ActionTypeConfig = ActionTypeConfig,
    Secrets extends ActionTypeSecrets = ActionTypeSecrets,
    Params extends ActionTypeParams = ActionTypeParams,
    ExecutorResultData = void
  >(
    actionType: ActionType<Config, Secrets, Params, ExecutorResultData>
  ): void;

  registerSubActionConnectorType<
    Config extends ActionTypeConfig = ActionTypeConfig,
    Secrets extends ActionTypeSecrets = ActionTypeSecrets
  >(
    connector: SubActionConnectorType<Config, Secrets>
  ): void;

  isPreconfiguredConnector(connectorId: string): boolean;

  getSubActionConnectorClass: <Config, Secrets>() => IServiceAbstract<Config, Secrets>;
  getCaseConnectorClass: <Config, Secrets, Incident, GetIncidentResponse>() => ICaseServiceAbstract<
    Config,
    Secrets,
    Incident,
    GetIncidentResponse
  >;
  getActionsHealth: () => { hasPermanentEncryptionKey: boolean };
  getActionsConfigurationUtilities: () => ActionsConfigurationUtilities;
  setEnabledConnectorTypes: (connectorTypes: EnabledConnectorTypes) => void;

  isActionTypeEnabled(id: string, options?: { notifyUsage: boolean }): boolean;
}

export interface PluginStartContract {
  isActionTypeEnabled(id: string, options?: { notifyUsage: boolean }): boolean;

  isActionExecutable(
    actionId: string,
    actionTypeId: string,
    options?: { notifyUsage: boolean }
  ): boolean;

  getAllTypes: ActionTypeRegistry['getAllTypes'];

  getActionsClientWithRequest(request: KibanaRequest): Promise<PublicMethodsOf<ActionsClient>>;

  getActionsAuthorizationWithRequest(request: KibanaRequest): PublicMethodsOf<ActionsAuthorization>;

  inMemoryConnectors: InMemoryConnector[];

  getUnsecuredActionsClient(): IUnsecuredActionsClient;

  renderActionParameterTemplates<Params extends ActionTypeParams = ActionTypeParams>(
    actionTypeId: string,
    actionId: string,
    params: Params,
    variables: Record<string, unknown>
  ): Params;

  isSystemActionConnector: (connectorId: string) => boolean;
}

export interface ActionsPluginsSetup {
  taskManager: TaskManagerSetupContract;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  licensing: LicensingPluginSetup;
  eventLog: IEventLogService;
  usageCollection?: UsageCollectionSetup;
  security?: SecurityPluginSetup;
  features: FeaturesPluginSetup;
  spaces?: SpacesPluginSetup;
  monitoringCollection?: MonitoringCollectionSetup;
  serverless?: ServerlessPluginSetup;
  cloud: CloudSetup;
}

export interface ActionsPluginsStart {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  taskManager: TaskManagerStartContract;
  licensing: LicensingPluginStart;
  eventLog: IEventLogClientService;
  spaces?: SpacesPluginStart;
  security?: SecurityPluginStart;
  serverless?: ServerlessPluginStart;
}

const includedHiddenTypes = [
  ACTION_SAVED_OBJECT_TYPE,
  ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
  ALERT_SAVED_OBJECT_TYPE,
  CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
];

export class ActionsPlugin
  implements
    Plugin<PluginSetupContract, PluginStartContract, ActionsPluginsSetup, ActionsPluginsStart>
{
  private readonly logger: Logger;
  private readonly actionsConfig: ActionsConfig;
  private taskRunnerFactory?: TaskRunnerFactory;
  private actionTypeRegistry?: ActionTypeRegistry;
  private actionExecutor?: ActionExecutor;
  private licenseState: ILicenseState | null = null;
  private security?: SecurityPluginSetup;
  private eventLogService?: IEventLogService;
  private eventLogger?: IEventLogger;
  private isESOCanEncrypt?: boolean;
  private usageCounter?: UsageCounter;
  private readonly telemetryLogger: Logger;
  private inMemoryConnectors: InMemoryConnector[];
  private inMemoryMetrics: InMemoryMetrics;
  private connectorUsageReportingTask: ConnectorUsageReportingTask | undefined;

  constructor(initContext: PluginInitializerContext) {
    this.logger = initContext.logger.get();
    this.actionsConfig = getValidatedConfig(
      this.logger,
      resolveCustomHosts(this.logger, initContext.config.get<ActionsConfig>())
    );
    this.telemetryLogger = initContext.logger.get('usage');
    this.inMemoryConnectors = [];
    this.inMemoryMetrics = new InMemoryMetrics(initContext.logger.get('in_memory_metrics'));
  }

  public setup(
    core: CoreSetup<ActionsPluginsStart, PluginStartContract>,
    plugins: ActionsPluginsSetup
  ): PluginSetupContract {
    this.licenseState = new LicenseState(plugins.licensing.license$);
    this.isESOCanEncrypt = plugins.encryptedSavedObjects.canEncrypt;

    if (!this.isESOCanEncrypt) {
      this.logger.warn(
        'APIs are disabled because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.'
      );
    }

    plugins.features.registerKibanaFeature(ACTIONS_FEATURE);

    this.eventLogService = plugins.eventLog;
    plugins.eventLog.registerProviderActions(EVENT_LOG_PROVIDER, Object.values(EVENT_LOG_ACTIONS));
    this.eventLogger = plugins.eventLog.getLogger({
      event: { provider: EVENT_LOG_PROVIDER },
    });
    events.forEach((eventConfig) => core.analytics.registerEventType(eventConfig));
    const actionExecutor = new ActionExecutor({
      isESOCanEncrypt: this.isESOCanEncrypt,
      connectorRateLimiter: new ConnectorRateLimiter({ config: this.actionsConfig.rateLimiter }),
    });

    // get executions count
    const taskRunnerFactory = new TaskRunnerFactory(actionExecutor, this.inMemoryMetrics);
    const actionsConfigUtils = getActionsConfigurationUtilities(this.actionsConfig);

    if (this.actionsConfig.preconfiguredAlertHistoryEsIndex) {
      this.inMemoryConnectors.push(getAlertHistoryEsIndex());
    }

    for (const preconfiguredId of Object.keys(this.actionsConfig.preconfigured)) {
      if (preconfiguredId !== AlertHistoryEsIndexConnectorId) {
        const rawPreconfiguredConnector: ConnectorWithOptionalDeprecation = {
          ...this.actionsConfig.preconfigured[preconfiguredId],
          id: preconfiguredId,
          isPreconfigured: true,
          isSystemAction: false,
        };

        this.inMemoryConnectors.push({
          ...rawPreconfiguredConnector,
          isDeprecated: isConnectorDeprecated(rawPreconfiguredConnector),
        });
      } else {
        this.logger.warn(
          `Preconfigured connectors cannot have the id "${AlertHistoryEsIndexConnectorId}" because this is a reserved id.`
        );
      }
    }

    const actionTypeRegistry = new ActionTypeRegistry({
      licensing: plugins.licensing,
      taskRunnerFactory,
      taskManager: plugins.taskManager,
      actionsConfigUtils,
      licenseState: this.licenseState,
      inMemoryConnectors: this.inMemoryConnectors,
    });
    this.taskRunnerFactory = taskRunnerFactory;
    this.actionTypeRegistry = actionTypeRegistry;
    this.actionExecutor = actionExecutor;
    this.security = plugins.security;

    setupSavedObjects(
      core.savedObjects,
      plugins.encryptedSavedObjects,
      this.actionTypeRegistry!,
      plugins.taskManager.index,
      this.inMemoryConnectors
    );

    const usageCollection = plugins.usageCollection;
    if (usageCollection) {
      registerActionsUsageCollector(
        usageCollection,
        this.actionsConfig,
        core.getStartServices().then(([_, { taskManager }]) => taskManager)
      );
    }

    core.http.registerRouteHandlerContext<ActionsRequestHandlerContext, 'actions'>(
      'actions',
      this.createRouteHandlerContext(core, actionsConfigUtils)
    );
    if (usageCollection) {
      const eventLogIndex = this.eventLogService.getIndexPattern();

      initializeActionsTelemetry(
        this.telemetryLogger,
        plugins.taskManager,
        core,
        this.getInMemoryConnectors,
        eventLogIndex
      );

      this.connectorUsageReportingTask = new ConnectorUsageReportingTask({
        logger: this.logger,
        eventLogIndex,
        core,
        taskManager: plugins.taskManager,
        projectId: plugins.cloud.serverless.projectId,
        config: this.actionsConfig.usage,
      });
    }

    // Usage counter for telemetry
    this.usageCounter = plugins.usageCollection?.createUsageCounter(ACTIONS_FEATURE_ID);

    if (plugins.monitoringCollection) {
      registerNodeCollector({
        monitoringCollection: plugins.monitoringCollection,
        inMemoryMetrics: this.inMemoryMetrics,
      });
      registerClusterCollector({
        monitoringCollection: plugins.monitoringCollection,
        core,
      });
    }

    const subActionFramework = createSubActionConnectorFramework({
      actionTypeRegistry,
      logger: this.logger,
      actionsConfigUtils,
    });

    // Routes
    defineRoutes({
      router: core.http.createRouter<ActionsRequestHandlerContext>(),
      licenseState: this.licenseState,
      actionsConfigUtils,
      usageCounter: this.usageCounter,
    });

    return {
      registerType: <
        Config extends ActionTypeConfig = ActionTypeConfig,
        Secrets extends ActionTypeSecrets = ActionTypeSecrets,
        Params extends ActionTypeParams = ActionTypeParams,
        ExecutorResultData = void
      >(
        actionType: ActionType<Config, Secrets, Params, ExecutorResultData>
      ) => {
        ensureSufficientLicense(actionType);
        actionTypeRegistry.register(actionType);
      },
      registerSubActionConnectorType: <
        Config extends ActionTypeConfig = ActionTypeConfig,
        Secrets extends ActionTypeSecrets = ActionTypeSecrets
      >(
        connector: SubActionConnectorType<Config, Secrets>
      ) => {
        subActionFramework.registerConnector(connector);
      },
      isPreconfiguredConnector: (connectorId: string): boolean => {
        return !!this.inMemoryConnectors.find(
          (inMemoryConnector) =>
            inMemoryConnector.isPreconfigured && inMemoryConnector.id === connectorId
        );
      },
      getSubActionConnectorClass: () => SubActionConnector,
      getCaseConnectorClass: () => CaseConnector,
      getActionsHealth: () => {
        return {
          hasPermanentEncryptionKey: plugins.encryptedSavedObjects.canEncrypt,
        };
      },
      getActionsConfigurationUtilities: () => actionsConfigUtils,
      setEnabledConnectorTypes: (connectorTypes) => {
        if (
          !!plugins.serverless &&
          this.actionsConfig.enabledActionTypes.length === 1 &&
          this.actionsConfig.enabledActionTypes[0] === AllowedHosts.Any
        ) {
          this.actionsConfig.enabledActionTypes.pop();
          this.actionsConfig.enabledActionTypes.push(...connectorTypes);
        } else {
          throw new Error(
            "Enabled connector types can be set only if they haven't already been set in the config"
          );
        }
      },
      isActionTypeEnabled: (id, options = { notifyUsage: false }) => {
        return this.actionTypeRegistry!.isActionTypeEnabled(id, options);
      },
    };
  }

  public start(core: CoreStart, plugins: ActionsPluginsStart): PluginStartContract {
    const {
      logger,
      licenseState,
      actionExecutor,
      actionTypeRegistry,
      taskRunnerFactory,
      isESOCanEncrypt,
      instantiateAuthorization,
      getUnsecuredSavedObjectsClient,
      actionsConfig,
    } = this;

    const actionsConfigUtils = getActionsConfigurationUtilities(actionsConfig);

    licenseState?.setNotifyUsage(plugins.licensing.featureUsage.notifyUsage);

    const encryptedSavedObjectsClient = plugins.encryptedSavedObjects.getClient({
      includedHiddenTypes,
    });

    this.throwIfSystemActionsInConfig();

    /**
     * Warning: this call mutates the inMemory collection
     *
     * Warning: it maybe possible for the task manager to start before
     * the system actions are being set.
     *
     * Issue: https://github.com/elastic/kibana/issues/160797
     */
    this.setSystemActions();

    const getActionsClientWithRequest = async (
      request: KibanaRequest,
      authorizationContext?: ActionExecutionSource<unknown>
    ) => {
      if (isESOCanEncrypt !== true) {
        throw new Error(
          `Unable to create actions client because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.`
        );
      }

      const unsecuredSavedObjectsClient = getUnsecuredSavedObjectsClient(
        core.savedObjects,
        request
      );

      return new ActionsClient({
        logger,
        unsecuredSavedObjectsClient,
        actionTypeRegistry: actionTypeRegistry!,
        kibanaIndices: core.savedObjects.getAllIndices(),
        scopedClusterClient: core.elasticsearch.client.asScoped(request),
        inMemoryConnectors: this.inMemoryConnectors,
        request,
        authorization: instantiateAuthorization(request),
        actionExecutor: actionExecutor!,
        bulkExecutionEnqueuer: createBulkExecutionEnqueuerFunction({
          taskManager: plugins.taskManager,
          actionTypeRegistry: actionTypeRegistry!,
          isESOCanEncrypt: isESOCanEncrypt!,
          inMemoryConnectors: this.inMemoryConnectors,
          configurationUtilities: actionsConfigUtils,
          logger,
        }),
        auditLogger: this.security?.audit.asScoped(request),
        usageCounter: this.usageCounter,
        connectorTokenClient: new ConnectorTokenClient({
          unsecuredSavedObjectsClient,
          encryptedSavedObjectsClient,
          logger,
        }),
        async getEventLogClient() {
          return plugins.eventLog.getClient(request);
        },
      });
    };

    const getUnsecuredActionsClient = () => {
      const internalSavedObjectsRepository = core.savedObjects.createInternalRepository([
        ACTION_SAVED_OBJECT_TYPE,
        ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
      ]);

      return new UnsecuredActionsClient({
        actionExecutor: actionExecutor!,
        clusterClient: core.elasticsearch.client,
        executionEnqueuer: createBulkUnsecuredExecutionEnqueuerFunction({
          taskManager: plugins.taskManager,
          connectorTypeRegistry: actionTypeRegistry!,
          inMemoryConnectors: this.inMemoryConnectors,
          configurationUtilities: actionsConfigUtils,
        }),
        inMemoryConnectors: this.inMemoryConnectors,
        internalSavedObjectsRepository,
        kibanaIndices: core.savedObjects.getAllIndices(),
        logger: this.logger,
      });
    };

    const secureGetActionsClientWithRequest = (request: KibanaRequest) =>
      getActionsClientWithRequest(request);

    this.eventLogService!.registerSavedObjectProvider('action', (request) => {
      const client = secureGetActionsClientWithRequest(request);
      return (objects?: SavedObjectsBulkGetObject[]) =>
        objects
          ? Promise.all(
              objects.map(
                async (objectItem) =>
                  /**
                   * TODO: Change with getBulk
                   */
                  await (await client).get({ id: objectItem.id, throwIfSystemAction: false })
              )
            )
          : Promise.resolve([]);
    });

    const getScopedSavedObjectsClientWithoutAccessToActions = (request: KibanaRequest) =>
      core.savedObjects.getScopedClient(request);

    const getInternalSavedObjectsRepositoryWithoutAccessToActions = () =>
      core.savedObjects.createInternalRepository();

    actionExecutor!.initialize({
      logger,
      eventLogger: this.eventLogger!,
      spaces: plugins.spaces?.spacesService,
      security: core.security,
      getServices: this.getServicesFactory(
        getScopedSavedObjectsClientWithoutAccessToActions,
        core.elasticsearch,
        encryptedSavedObjectsClient,
        (request: KibanaRequest) => this.getUnsecuredSavedObjectsClient(core.savedObjects, request)
      ),
      getUnsecuredServices: this.getUnsecuredServicesFactory(
        getInternalSavedObjectsRepositoryWithoutAccessToActions,
        core.elasticsearch,
        encryptedSavedObjectsClient,
        () => this.getUnsecuredSavedObjectsClientWithFakeRequest(core.savedObjects)
      ),
      encryptedSavedObjectsClient,
      actionTypeRegistry: actionTypeRegistry!,
      inMemoryConnectors: this.inMemoryConnectors,
      getActionsAuthorizationWithRequest(request: KibanaRequest) {
        return instantiateAuthorization(request);
      },
      analyticsService: core.analytics,
    });

    taskRunnerFactory!.initialize({
      logger,
      actionTypeRegistry: actionTypeRegistry!,
      encryptedSavedObjectsClient,
      basePathService: core.http.basePath,
      spaceIdToNamespace: (spaceId?: string) => spaceIdToNamespace(plugins.spaces, spaceId),
      savedObjectsRepository: core.savedObjects.createInternalRepository([
        ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
      ]),
    });

    this.eventLogService!.isEsContextReady()
      .then(() => {
        scheduleActionsTelemetry(this.telemetryLogger, plugins.taskManager);
      })
      .catch(() => {});

    if (this.actionsConfig.preconfiguredAlertHistoryEsIndex) {
      createAlertHistoryIndexTemplate({
        client: core.elasticsearch.client.asInternalUser,
        logger: this.logger,
      }).catch(() => {});
    }

    this.validateEnabledConnectorTypes(plugins);

    this.connectorUsageReportingTask?.start(plugins.taskManager).catch(() => {});

    return {
      isActionTypeEnabled: (id, options = { notifyUsage: false }) => {
        return this.actionTypeRegistry!.isActionTypeEnabled(id, options);
      },
      isActionExecutable: (
        actionId: string,
        actionTypeId: string,
        options = { notifyUsage: false }
      ) => {
        return this.actionTypeRegistry!.isActionExecutable(actionId, actionTypeId, options);
      },
      getAllTypes: actionTypeRegistry!.getAllTypes.bind(actionTypeRegistry),
      getActionsAuthorizationWithRequest(request: KibanaRequest) {
        return instantiateAuthorization(request);
      },
      getActionsClientWithRequest: secureGetActionsClientWithRequest,
      getUnsecuredActionsClient,
      inMemoryConnectors: this.inMemoryConnectors,
      renderActionParameterTemplates: (...args) =>
        renderActionParameterTemplates(this.logger, actionTypeRegistry, ...args),
      isSystemActionConnector: (connectorId: string): boolean => {
        return this.inMemoryConnectors.some(
          (inMemoryConnector) =>
            inMemoryConnector.isSystemAction && inMemoryConnector.id === connectorId
        );
      },
    };
  }

  private getUnsecuredSavedObjectsClient = (
    savedObjects: CoreStart['savedObjects'],
    request: KibanaRequest
  ) =>
    savedObjects.getScopedClient(request, {
      excludedExtensions: [SECURITY_EXTENSION_ID],
      includedHiddenTypes,
    });

  // replace when https://github.com/elastic/kibana/issues/209413 is resolved
  private getUnsecuredSavedObjectsClientWithFakeRequest = (
    savedObjects: CoreStart['savedObjects']
  ) => {
    const fakeRequest = {
      headers: {},
      getBasePath: () => '',
      path: '/',
      route: { settings: {} },
      url: { href: {} },
      raw: { req: { url: '/' } },
    } as unknown as KibanaRequest;
    return savedObjects.getScopedClient(fakeRequest, {
      excludedExtensions: [SECURITY_EXTENSION_ID],
      includedHiddenTypes,
    });
  };

  private instantiateAuthorization = (request: KibanaRequest) => {
    return new ActionsAuthorization({
      request,
      authorization: this.security?.authz,
    });
  };

  private getServicesFactory(
    getScopedClient: (request: KibanaRequest) => SavedObjectsClientContract,
    elasticsearch: ElasticsearchServiceStart,
    encryptedSavedObjectsClient: EncryptedSavedObjectsClient,
    unsecuredSavedObjectsClient: (request: KibanaRequest) => SavedObjectsClientContract
  ): (request: KibanaRequest) => Services {
    return (request) => {
      return {
        savedObjectsClient: getScopedClient(request),
        scopedClusterClient: elasticsearch.client.asScoped(request).asCurrentUser,
        connectorTokenClient: new ConnectorTokenClient({
          unsecuredSavedObjectsClient: unsecuredSavedObjectsClient(request),
          encryptedSavedObjectsClient,
          logger: this.logger,
        }),
      };
    };
  }

  private getUnsecuredServicesFactory(
    getSavedObjectRepository: () => ISavedObjectsRepository,
    elasticsearch: ElasticsearchServiceStart,
    encryptedSavedObjectsClient: EncryptedSavedObjectsClient,
    unsecuredSavedObjectsRepository: () => SavedObjectsClientContract
  ): () => UnsecuredServices {
    return () => {
      return {
        savedObjectsClient: getSavedObjectRepository(),
        scopedClusterClient: elasticsearch.client.asInternalUser,
        connectorTokenClient: new ConnectorTokenClient({
          unsecuredSavedObjectsClient: unsecuredSavedObjectsRepository(),
          encryptedSavedObjectsClient,
          logger: this.logger,
        }),
      };
    };
  }

  private getInMemoryConnectors = () => this.inMemoryConnectors;

  private setSystemActions = () => {
    const systemConnectors = createSystemConnectors(this.actionTypeRegistry?.list() ?? []);
    this.inMemoryConnectors = [...this.inMemoryConnectors, ...systemConnectors];
  };

  private throwIfSystemActionsInConfig = () => {
    const hasSystemActionAsPreconfiguredInConfig = this.inMemoryConnectors
      .filter((connector) => connector.isPreconfigured)
      .some((connector) => this.actionTypeRegistry!.isSystemActionType(connector.actionTypeId));

    if (hasSystemActionAsPreconfiguredInConfig) {
      throw new Error('Setting system action types in preconfigured connectors are not allowed');
    }
  };

  private createRouteHandlerContext = (
    core: CoreSetup<ActionsPluginsStart>,
    actionsConfigUtils: ActionsConfigurationUtilities
  ): IContextProvider<ActionsRequestHandlerContext, 'actions'> => {
    const {
      actionTypeRegistry,
      isESOCanEncrypt,
      getInMemoryConnectors,
      actionExecutor,
      instantiateAuthorization,
      security,
      usageCounter,
      logger,
    } = this;

    return async function actionsRouteHandlerContext(context, request) {
      const [{ savedObjects }, { taskManager, encryptedSavedObjects, eventLog }] =
        await core.getStartServices();

      const coreContext = await context.core;
      const inMemoryConnectors = getInMemoryConnectors();

      return {
        getActionsClient: () => {
          if (isESOCanEncrypt !== true) {
            throw new Error(
              `Unable to create actions client because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.`
            );
          }
          const unsecuredSavedObjectsClient = savedObjects.getScopedClient(request, {
            excludedExtensions: [SECURITY_EXTENSION_ID],
            includedHiddenTypes,
          });
          return new ActionsClient({
            logger,
            unsecuredSavedObjectsClient,
            actionTypeRegistry: actionTypeRegistry!,
            kibanaIndices: savedObjects.getAllIndices(),
            scopedClusterClient: coreContext.elasticsearch.client,
            inMemoryConnectors,
            request,
            authorization: instantiateAuthorization(request),
            actionExecutor: actionExecutor!,
            bulkExecutionEnqueuer: createBulkExecutionEnqueuerFunction({
              taskManager,
              actionTypeRegistry: actionTypeRegistry!,
              isESOCanEncrypt: isESOCanEncrypt!,
              inMemoryConnectors,
              configurationUtilities: actionsConfigUtils,
              logger,
            }),
            auditLogger: security?.audit.asScoped(request),
            usageCounter,
            connectorTokenClient: new ConnectorTokenClient({
              unsecuredSavedObjectsClient,
              encryptedSavedObjectsClient: encryptedSavedObjects.getClient({
                includedHiddenTypes,
              }),
              logger,
            }),
            async getEventLogClient() {
              return eventLog.getClient(request);
            },
          });
        },
        listTypes: actionTypeRegistry!.list.bind(actionTypeRegistry!),
      };
    };
  };

  private validateEnabledConnectorTypes = (plugins: ActionsPluginsStart) => {
    if (
      !!plugins.serverless &&
      this.actionsConfig.enabledActionTypes.length > 0 &&
      this.actionsConfig.enabledActionTypes[0] !== AllowedHosts.Any
    ) {
      this.actionsConfig.enabledActionTypes.forEach((connectorType) => {
        // Throws error if action type doesn't exist
        this.actionTypeRegistry?.get(connectorType);
      });
    }
  };

  public stop() {
    if (this.licenseState) {
      this.licenseState.clean();
    }
  }
}

export function renderActionParameterTemplates<Params extends ActionTypeParams = ActionTypeParams>(
  logger: Logger,
  actionTypeRegistry: ActionTypeRegistry | undefined,
  actionTypeId: string,
  actionId: string,
  params: Params,
  variables: Record<string, unknown>
): Params {
  const actionType = actionTypeRegistry?.get(actionTypeId);
  if (actionType?.renderParameterTemplates) {
    return actionType.renderParameterTemplates(logger, params, variables, actionId) as Params;
  } else {
    return renderMustacheObject(logger, params, variables);
  }
}
