import { BadRequestException, Injectable } from '@nestjs/common';

import { EnvironmentRepository, NotificationTemplateRepository } from '@novu/dal';
import { ControlValuesRepository, MessageTemplateRepository } from '@novu/dal/src';
import { DeleteWorkflowCommand } from './delete-workflow.command';
import { WorkflowNotFoundException } from '../../exceptions/workflow-not-found';

@Injectable()
export class DeleteWorkflowUseCase {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private environmentRepository: EnvironmentRepository,
    private msgTemplateRepo: MessageTemplateRepository,
    private controlValuesRepository: ControlValuesRepository
  ) {}

  async execute(command: DeleteWorkflowCommand): Promise<void> {
    await this.validateEnvironment(command);
    const workflow = await this.findById(command);
    if (!workflow) {
      throw new WorkflowNotFoundException(command.workflowId);
    }
    await this.deleteComponents(command, workflow);
  }

  private async deleteComponents(command: DeleteWorkflowCommand, workflow) {
    await this.notificationTemplateRepository.delete(buildDeleteQuery(command));
    await this.deleteMsgTemplatesIfRequired(workflow, command);
    await this.controlValuesRepository.deleteMany({
      _environmentId: command.user.environmentId,
      _organizationId: command.user.organizationId,
      _workflowId: command.workflowId,
    });
  }

  private async findById(command: DeleteWorkflowCommand) {
    return await this.notificationTemplateRepository.findByIdQuery({
      id: command.workflowId,
      environmentId: command.user.environmentId,
    });
  }

  private async deleteMsgTemplatesIfRequired(workflow, command: DeleteWorkflowCommand) {
    if (workflow.steps.length > 0) {
      await this.msgTemplateRepo.deleteWithQuery({
        _id: command.workflowId,
        _environmentId: command.user.environmentId,
      });
    }
  }

  private async validateEnvironment(command: DeleteWorkflowCommand) {
    const environment = await this.environmentRepository.findOne({ _id: command.user.environmentId });

    if (!environment) {
      throw new BadRequestException('Environment not found');
    }
  }
}

function buildDeleteQuery(command: DeleteWorkflowCommand) {
  return {
    _id: command.workflowId,
    _organizationId: command.user.organizationId,
    _environmentId: command.user.environmentId,
  };
}
