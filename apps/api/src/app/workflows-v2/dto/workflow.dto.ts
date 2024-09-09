import { IsArray, IsBoolean, IsDefined, IsEnum, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { JsonSchema } from '@novu/framework';
import { StepTypeEnum, WorkflowChannelPreferences, WorkflowOriginEnum } from '@novu/shared';
import { RequiredProp } from '../customTypes';

class ControlsSchema {
  schema: JsonSchema;
}

export type CreateWorkflowDto = Omit<WorkflowDto, '_id'>;

export type UpdateWorkflowDto = RequiredProp<Omit<WorkflowDto, '_id'>, 'origin'> & {
  updatedAt: string;
  steps: (StepResponseDto | StepDto)[];
};

export type WorkflowResponseDto = RequiredProp<Omit<WorkflowDto, 'steps'>, 'origin'> & {
  updatedAt: string;
  steps: StepResponseDto[];

  /**
   * Enum to define the origin of the workflow.
   *
   * The `WorkflowOriginEnum` is used to specify the source of the workflow,
   * which helps determine which endpoint to call during the Preview & Execution phase.
   * - 'novu' indicates that the workflow originates from Novu's platform, so the Novu endpoint is used.
   * - 'external' indicates that the workflow originates from an external source, requiring a call to a customer-hosted Bridge endpoint.
   */
  origin: WorkflowOriginEnum;
};
export type StepResponseDto = StepDto & {
  stepUuid: string;
};
export type ListWorkflowResponse = {
  workflowSummaries: MinifiedResponseWorkflowDto[];
  totalResults: number;
};

export type MinifiedResponseWorkflowDto = Pick<WorkflowResponseDto, 'name' | 'tags' | 'updatedAt' | '_id'> & {
  stepTypeOverviews: StepTypeEnum[];
};

export class StepDto {
  @IsString()
  @IsDefined()
  name: string;

  @IsString()
  @IsDefined()
  type: StepTypeEnum;

  @IsOptional()
  controls?: ControlsSchema;

  @IsOptional()
  @IsBoolean()
  active: boolean;

  @IsBoolean()
  shouldStopOnFail: boolean;

  @IsObject()
  controlValues: Record<string, unknown>;
}

export class WorkflowDto {
  @IsString()
  @IsDefined()
  _id: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  critical?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsDefined()
  @IsString()
  notificationGroupId: string;
  @IsOptional()
  @IsDefined()
  preferences?: WorkflowChannelPreferences;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepDto)
  steps: Array<StepDto>;

  @IsString()
  @IsDefined()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(WorkflowOriginEnum)
  @IsOptional()
  origin?: WorkflowOriginEnum;
}
