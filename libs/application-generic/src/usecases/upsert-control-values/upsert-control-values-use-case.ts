import { Injectable } from '@nestjs/common';

import { ControlValuesEntity, ControlValuesRepository } from '@novu/dal';
import { ControlVariablesLevelEnum } from '@novu/shared';
import _ from 'lodash';
import { UpsertControlValuesCommand } from './upsert-control-values-command';

@Injectable()
export class UpsertControlValuesUseCase {
  constructor(private controlValuesRepository: ControlValuesRepository) {}

  async execute(command: UpsertControlValuesCommand) {
    const controlValues = _.difference(
      command.notificationStepEntity.controlVariables,
      command.controlSchemas.schema,
    );

    const existingControlValues = await this.controlValuesRepository.findfirst({
      _environmentId: command.environmentId || '',
      _organizationId: command.organizationId,
      _workflowId: command.workflowId,
      _stepId: command.notificationStepEntity._templateId,
      level: ControlVariablesLevelEnum.STEP_CONTROLS,
    });

    if (existingControlValues) {
      return await this.updateControlVariables(
        existingControlValues,
        command,
        controlValues,
      );
    }

    return await this.controlValuesRepository.create({
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      _workflowId: command.workflowId,
      _stepId: command.notificationStepEntity._templateId,
      level: ControlVariablesLevelEnum.STEP_CONTROLS,
      priority: 0,
      inputs: controlValues,
      controls: controlValues,
    });
  }

  private async updateControlVariables(
    found: ControlValuesEntity,
    command: UpsertControlValuesCommand,
    controlValues: Record<string, unknown>,
  ) {
    await this.controlValuesRepository.update(
      {
        _id: found._id,
        _organizationId: command.organizationId,
      },
      {
        priority: 0,
        inputs: controlValues,
        controls: controlValues,
      },
    );

    return this.controlValuesRepository.findOne({
      _id: found._id,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });
  }
}
