import { BadRequestException, Injectable } from '@nestjs/common';

import { EnvironmentRepository, NotificationTemplateRepository } from '@novu/dal';
import { ControlVariablesLevelEnum } from '@novu/shared';

import { ControlValuesEntity, ControlValuesRepository, NotificationStepEntity } from '@novu/dal/src';
import { GetPreferences, GetPreferencesCommand } from '@novu/application-generic';
import { GetWorkflowCommand } from './get-workflow.command';
import { NotificationTemplateMapper } from '../../mappers/notification-template-mapper';
import { WorkflowResponseDto } from '../../dto/workflow.dto';
import { WorkflowNotFoundByIdException } from '../../exceptions/workflow-not-found-by-id.exception';

@Injectable()
export class GetWorkflowUseCase {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private environmentRepository: EnvironmentRepository,
    private controlValuesRepository: ControlValuesRepository,
    private getPreferencesUseCase: GetPreferences
  ) {}
  async execute(command: GetWorkflowCommand): Promise<WorkflowResponseDto> {
    await this.validateEnvironment(command);
    const notificationTemplateEntity = await this.notificationTemplateRepository.findOne({
      _id: command._workflowId,
      environmentId: command.user.environmentId,
      _organizationId: command.user.organizationId,
    });

    if (notificationTemplateEntity === null || notificationTemplateEntity === undefined) {
      throw new WorkflowNotFoundByIdException(command);
    }
    const stepIdToControlValuesMap = await this.getControlsValuesMap(notificationTemplateEntity.steps, command);
    const preferences = await this.getPreferencesForWorkflow(command);

    return NotificationTemplateMapper.toResponseWorkflowDto(
      notificationTemplateEntity,
      preferences,
      stepIdToControlValuesMap
    );
  }

  private async getPreferencesForWorkflow(getWorkflowCommand: GetWorkflowCommand) {
    const command = {
      environmentId: getWorkflowCommand.user.environmentId,
      organizationId: getWorkflowCommand.user.organizationId,
      templateId: getWorkflowCommand._workflowId,
    } as GetPreferencesCommand;

    return await this.getPreferencesUseCase.execute(GetPreferencesCommand.create(command));
  }

  private async validateEnvironment(command: GetWorkflowCommand) {
    const environment = await this.environmentRepository.findOne({ _id: command.user.environmentId });

    if (!environment) {
      throw new BadRequestException('Environment not found');
    }
  }

  private async getControlsValuesMap(
    steps: NotificationStepEntity[],
    command: GetWorkflowCommand
  ): Promise<{ [key: string]: ControlValuesEntity }> {
    const acc: { [key: string]: ControlValuesEntity } = {};

    for (const step of steps) {
      const controlValuesEntity = await this.buildControlValuesForStep(step, command);
      if (controlValuesEntity) {
        acc[step._templateId] = controlValuesEntity;
      }
    }

    return acc; // Return the accumulated results
  }
  private async buildControlValuesForStep(
    step: NotificationStepEntity,
    command: GetWorkflowCommand
  ): Promise<ControlValuesEntity | null> {
    return await this.controlValuesRepository.findOne({
      _environmentId: command.user.environmentId,
      _organizationId: command.user.organizationId,
      _workflowId: command._workflowId,
      stepId: step._templateId,
      level: ControlVariablesLevelEnum.STEP_CONTROLS,
    });
  }
}
