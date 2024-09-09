import { ChannelTypeEnum } from '../channel';
import { CustomDataType } from '../shared';

export type NotificationTemplateCustomData = CustomDataType;

export type WorkflowIntegrationStatus = {
  hasActiveIntegrations: boolean;
  hasPrimaryIntegrations?: boolean;
  channels: WorkflowChannelsIntegrationStatus;
};

export type WorkflowChannelsIntegrationStatus = ActiveIntegrationsStatus & ActiveIntegrationStatusWithPrimary;

type ActiveIntegrationsStatus = {
  [key in ChannelTypeEnum]: {
    hasActiveIntegrations: boolean;
  };
};

type ActiveIntegrationStatusWithPrimary = {
  [ChannelTypeEnum.EMAIL]: {
    hasActiveIntegrations: boolean;
    hasPrimaryIntegrations: boolean;
  };
  [ChannelTypeEnum.SMS]: {
    hasActiveIntegrations: boolean;
    hasPrimaryIntegrations: boolean;
  };
};

export enum WorkflowTypeEnum {
  REGULAR = 'REGULAR',
  ECHO = 'ECHO',
  BRIDGE = 'BRIDGE',
}

/**
 * Enum to define the origin of the workflow.
 *
 * The `WorkflowOriginEnum` is used to specify the source of the workflow,
 * which helps determine which endpoint to call during the Preview & Execution phase.
 * - 'novu' indicates that the workflow originates from Novu's platform, so the Novu endpoint is used.
 * - 'external' indicates that the workflow originates from an external source, requiring a call to a customer-hosted Bridge endpoint.
 */
export enum WorkflowOriginEnum {
  NOVU = 'novu',
  EXTERNAL = 'external',
}
