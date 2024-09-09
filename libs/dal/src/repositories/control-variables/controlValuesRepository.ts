import { SoftDeleteModel } from 'mongoose-delete';
import { ControlVariablesLevelEnum } from '@novu/shared';
import { ControlValuesModel, ControlVariables } from './controlVariables.schema';
import { ControlValuesEntity } from './controlValuesEntity';
import { BaseRepository } from '../base-repository';
import { EnforceEnvOrOrgIds } from '../../types';

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface DeleteManyValuesQuery {
  _environmentId: string;
  _organizationId: string;
  _workflowId: string;
  _stepId?: string;
  level?: ControlVariablesLevelEnum;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface FindControlValuesQuery {
  _environmentId: string;
  _organizationId: string;
  _workflowId: string;
  _stepId: string;
  level?: ControlVariablesLevelEnum;
}

export class ControlValuesRepository extends BaseRepository<
  ControlValuesModel,
  ControlValuesEntity,
  EnforceEnvOrOrgIds
> {
  private controlVariables: SoftDeleteModel;

  constructor() {
    super(ControlVariables, ControlValuesEntity);
    this.controlVariables = ControlVariables;
  }

  async deleteMany(query: DeleteManyValuesQuery) {
    return await super.delete(query);
  }
  async findMany(query: FindControlValuesQuery): Promise<ControlValuesEntity[]> {
    return await super.find(query);
  }
  async findfirst(query: FindControlValuesQuery): Promise<ControlValuesEntity | null> {
    const controlValuesEntities = await this.findMany(query);
    if (!controlValuesEntities || controlValuesEntities.length === 0) {
      return null;
    }

    return controlValuesEntities[0];
  }
}
