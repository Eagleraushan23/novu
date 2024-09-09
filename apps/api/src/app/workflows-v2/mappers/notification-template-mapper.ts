import { IPreferenceChannels, StepTypeEnum, WorkflowChannelPreferences, WorkflowOriginEnum } from '@novu/shared';
import { DiscoverWorkflowOutputPreferences } from '@novu/framework';
import { NotificationStepEntity, NotificationTemplateEntity } from '@novu/dal';

import { ControlValuesEntity } from '@novu/dal/src';
import { MinifiedResponseWorkflowDto, StepResponseDto, WorkflowResponseDto } from '../dto/workflow.dto';

export class NotificationTemplateMapper {
  static toResponseWorkflowDto(
    template: NotificationTemplateEntity,
    preferences: WorkflowChannelPreferences | undefined,
    stepIdToControlValuesMap: { [p: string]: ControlValuesEntity }
  ): WorkflowResponseDto {
    return {
      _id: template._id,
      tags: template.tags,
      active: template.active,
      critical: template.critical,
      notificationGroupId: template._notificationGroupId,
      preferences,
      steps: NotificationTemplateMapper.getSteps(template, stepIdToControlValuesMap),
      name: template.name,
      description: template.description,
      origin: template.origin || WorkflowOriginEnum.NOVU,
      updatedAt: template.updatedAt || 'Missing Updated At',
    };
  }

  private static getSteps(
    template: NotificationTemplateEntity,
    controlValuesMap: { [p: string]: ControlValuesEntity }
  ) {
    const steps: StepResponseDto[] = [];
    for (const step of template.steps) {
      const toStepResponseDto = NotificationTemplateMapper.toStepResponseDto(step);
      const controlValues = controlValuesMap[step._templateId];
      if (controlValues) {
        toStepResponseDto.controlValues = controlValues.controls;
      }
      steps.push(toStepResponseDto);
    }

    return steps;
  }

  static toMinifiedWorkflowDto(template: NotificationTemplateEntity): MinifiedResponseWorkflowDto {
    return {
      _id: template._id,
      name: template.name,
      tags: template.tags,
      updatedAt: template.updatedAt || 'Missing Updated At',
      stepTypeOverviews: template.steps.map(NotificationTemplateMapper.buildStepSummery),
    };
  }

  static toWorkflowsMinifiedDtos(templates: NotificationTemplateEntity[]): MinifiedResponseWorkflowDto[] {
    return templates.map(NotificationTemplateMapper.toMinifiedWorkflowDto);
  }
  static toStepResponseDto(step: NotificationStepEntity): StepResponseDto {
    return {
      name: step.name || 'Missing Name',
      stepUuid: step._templateId,
      type: step.template?.type || StepTypeEnum.EMAIL,
      controls: NotificationTemplateMapper.convertControls(step),
      active: step.active || true,
      shouldStopOnFail: step.shouldStopOnFail || true,
      controlValues: step.controlVariables || {},
    };
  }

  private static convertControls(step: NotificationStepEntity) {
    if (step.template?.controls) {
      return { schema: step.template.controls.schema };
    } else {
      return undefined;
    }
  }

  private static toPreferences(preferenceSettings: IPreferenceChannels): DiscoverWorkflowOutputPreferences {
    const { email } = preferenceSettings;
    const { sms } = preferenceSettings;
    const { push } = preferenceSettings;
    const { chat } = preferenceSettings;
    const inApp = preferenceSettings.in_app;

    return {
      workflow: { defaultValue: true, readOnly: false },
      channels: {
        email: { defaultValue: email ?? true, readOnly: false },
        sms: { defaultValue: sms ?? true, readOnly: false },
        push: { defaultValue: push ?? true, readOnly: false },
        chat: { defaultValue: chat ?? true, readOnly: false },
        in_app: { defaultValue: inApp ?? true, readOnly: false },
      },
    };
  }

  private static buildStepSummery(step: NotificationStepEntity) {
    return step.template?.type || StepTypeEnum.EMAIL;
  }
}
