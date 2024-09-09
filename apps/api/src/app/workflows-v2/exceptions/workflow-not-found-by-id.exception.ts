import { BadRequestException } from '@nestjs/common';
import { GetWorkflowCommand } from '../usecases/get-workflow/get-workflow.command';

export class WorkflowNotFoundByIdException extends BadRequestException {
  constructor(command: GetWorkflowCommand) {
    super({ message: `Workflow by id not found`, id: command._workflowId });
  }
}
