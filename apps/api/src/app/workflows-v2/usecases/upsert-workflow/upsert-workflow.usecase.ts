import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import {
  ControlValuesEntity,
  EnvironmentRepository,
  NotificationGroupRepository,
  NotificationStepEntity,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  PreferencesEntity,
} from '@novu/dal';
import {
  CreateWorkflow as CreateWorkflowGeneric,
  CreateWorkflowCommand,
  NotificationStep,
  UpdateWorkflow,
  UpdateWorkflowCommand,
  UpsertControlValuesCommand,
  UpsertControlValuesUseCase,
  UpsertPreferences,
  UpsertWorkflowPreferencesCommand,
} from '@novu/application-generic';
import { WorkflowTypeEnum } from '@novu/shared';

import { UpsertWorkflowCommand } from './upsert-workflow.command';
import { WorkflowAlreadyExistException } from '../../exceptions/workflow-already-exist';
import { StepDto, WorkflowResponseDto } from '../../dto/workflow.dto';
import { NotificationTemplateMapper } from '../../mappers/notification-template-mapper';
import { StepUpsertMechanismFailedMissingIdException } from '../../exceptions/step-upsert-mechanism-failed-missing-id.exception';

@Injectable()
export class UpsertWorkflowUseCase {
  constructor(
    private createWorkflowGenericUsecase: CreateWorkflowGeneric,
    private updateWorkflowUsecase: UpdateWorkflow,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private notificationGroupRepository: NotificationGroupRepository,
    private upsertPreferencesUsecase: UpsertPreferences,
    private upsertControlValuesUseCase: UpsertControlValuesUseCase,
    private environmentRepository: EnvironmentRepository
  ) {}
  async execute(command: UpsertWorkflowCommand): Promise<WorkflowResponseDto> {
    await this.validateEnvironment(command);
    const workflowForUpdate = await this.getWorkflowIfUpdateAndExist(command);
    if (!workflowForUpdate && (await this.workflowExistByExternalId(command))) {
      throw new WorkflowAlreadyExistException(command);
    }
    const workflow = await this.createOrUpdateWorkflow(workflowForUpdate, command);
    const stepIdToControlValuesMap = await this.upsertControlValues(workflow, command);
    const preferences = await this.upsertPreference(command, workflow);

    return NotificationTemplateMapper.toResponseWorkflowDto(
      workflow,
      preferences?.preferences,
      stepIdToControlValuesMap
    );
  }

  private async upsertControlValues(workflow: NotificationTemplateEntity, command: UpsertWorkflowCommand) {
    const stepIdToControlValuesMap: { [p: string]: ControlValuesEntity } = {};
    for (const persistedStep of workflow.steps) {
      const controlValuesEntity = await this.upsertControlValuesForSingleStep(persistedStep, command, workflow);
      if (controlValuesEntity) {
        stepIdToControlValuesMap[persistedStep._templateId] = controlValuesEntity;
      }
    }

    return stepIdToControlValuesMap;
  }

  private async upsertControlValuesForSingleStep(
    persistedStep: NotificationStepEntity,
    command: UpsertWorkflowCommand,
    persistedWorkflow: NotificationTemplateEntity
  ): Promise<ControlValuesEntity | undefined> {
    if (!persistedStep._id || !persistedStep.stepId) {
      throw new StepUpsertMechanismFailedMissingIdException();
    }

    const stepInDto = command.workflowDto?.steps.find((commandStepItem) => commandStepItem.name === persistedStep.name);

    if (!stepInDto) {
      // should delete the values from the database?  or just ignore?
      return;
    }

    return await this.upsertControlValuesUseCase.execute(
      UpsertControlValuesCommand.create({
        organizationId: command.user.organizationId,
        environmentId: command.user.environmentId,
        notificationStepEntity: persistedStep,
        workflowId: persistedWorkflow._id,
        newControlValues: stepInDto.controlValues || {},
        controlSchemas: stepInDto?.controls || { schema: {} },
      })
    );
  }

  private async upsertPreference(command: UpsertWorkflowCommand, workflow: NotificationTemplateEntity) {
    let createdPreferences: PreferencesEntity | undefined;
    if (command.workflowDto.preferences) {
      createdPreferences = await this.upsertPreferencesUsecase.upsertWorkflowPreferences(
        UpsertWorkflowPreferencesCommand.create({
          environmentId: workflow._environmentId,
          organizationId: workflow._organizationId,
          templateId: workflow._id,
          preferences: command.workflowDto.preferences,
        })
      );
    }

    return createdPreferences;
  }

  private async createOrUpdateWorkflow(
    existingWorkflow: NotificationTemplateEntity | null | undefined,
    command: UpsertWorkflowCommand
  ): Promise<NotificationTemplateEntity> {
    Logger.log(`createOrUpdateWorkflow: ${JSON.stringify(command)}`);
    if (existingWorkflow) {
      Logger.log(`Updating workflow: ${JSON.stringify(command)}`);

      return await this.updateWorkflowUsecase.execute(
        UpdateWorkflowCommand.create(this.convertCreateToUpdateCommand(command, existingWorkflow))
      );
    }
    const notificationGroupId = await this.getNotificationGroup(
      command.workflowDto.notificationGroupId,
      command.user.environmentId
    );
    if (!notificationGroupId) {
      throw new BadRequestException('Notification group not found');
    }
    Logger.log(`Creating workflow: ${JSON.stringify(command)}`);

    return await this.createWorkflowGenericUsecase.execute(
      CreateWorkflowCommand.create(this.buildCreateWorkflowGenericCommand(notificationGroupId, command))
    );
  }

  private async validateEnvironment(command: UpsertWorkflowCommand) {
    const environment = await this.environmentRepository.findOne({ _id: command.user.environmentId });

    if (!environment) {
      throw new BadRequestException('Environment not found');
    }
  }

  private buildCreateWorkflowGenericCommand(
    notificationGroupId: string,
    command: UpsertWorkflowCommand
  ): CreateWorkflowCommand {
    const { user } = command;
    const { workflowDto } = command;
    const isWorkflowActive = command.workflowDto?.active ?? true;

    return {
      notificationGroupId,
      draft: !isWorkflowActive,
      environmentId: user.environmentId,
      organizationId: user.organizationId,
      userId: user._id,
      name: command.workflowDto.name,
      __source: 'bridge',
      type: WorkflowTypeEnum.BRIDGE,
      origin: workflowDto.origin,
      steps: this.mapSteps(workflowDto.steps),
      payloadSchema: {},
      active: isWorkflowActive,
      description: workflowDto.description || 'Missing Description',
      tags: workflowDto.tags || [],
      critical: workflowDto.critical ?? false,
    };
  }

  private async getWorkflowIfUpdateAndExist(upsertCommand: UpsertWorkflowCommand) {
    Logger.log(`getWorkflowIfExist: ${JSON.stringify(upsertCommand, null, 2)}`);
    if (upsertCommand.workflowDatabaseIdForUpdate) {
      return await this.notificationTemplateRepository.findByIdQuery({
        id: upsertCommand.workflowDatabaseIdForUpdate,
        environmentId: upsertCommand.user.environmentId,
      });
    }
  }

  private async workflowExistByExternalId(upsertCommand: UpsertWorkflowCommand) {
    const { environmentId } = upsertCommand.user;
    const workflowByDbId = await this.notificationTemplateRepository.findByTriggerIdentifier(
      environmentId,
      upsertCommand.workflowDto.name
    );

    return !!workflowByDbId;
  }

  private convertCreateToUpdateCommand(
    command: UpsertWorkflowCommand,
    existingWorkflow: NotificationTemplateEntity
  ): UpdateWorkflowCommand {
    const { workflowDto } = command;
    const { user } = command;

    return {
      id: existingWorkflow._id,
      environmentId: user.environmentId,
      organizationId: user.organizationId,
      userId: user._id,
      name: command.workflowDto.name,
      steps: this.mapSteps(workflowDto.steps),
      rawData: workflowDto,
      type: WorkflowTypeEnum.BRIDGE,
      description: workflowDto.description,
      tags: workflowDto.tags,
      active: workflowDto.active ?? true,
      critical: workflowDto.critical,
    };
  }

  private mapSteps(commandWorkflowSteps: Array<StepDto>, workflow?: NotificationTemplateEntity | undefined) {
    const steps: NotificationStep[] = commandWorkflowSteps.map((step) => {
      const foundStep = workflow?.steps?.find((workflowStep) => workflowStep.stepId === step.name);

      const template = {
        _id: foundStep?._id,
        type: step.type,
        name: step.name,
        controls: step.controls,
      };

      return {
        template,
        name: step.name,
        shouldStopOnFail: step.shouldStopOnFail,
      };
    });

    return steps;
  }

  private async getNotificationGroup(notificationGroupIdCommand: string | undefined, environmentId: string) {
    let notificationGroupId = notificationGroupIdCommand;

    if (!notificationGroupId) {
      notificationGroupId = (
        await this.notificationGroupRepository.findOne(
          {
            name: 'General',
            _environmentId: environmentId,
          },
          '_id'
        )
      )?._id;
    }

    return notificationGroupId;
  }
}
