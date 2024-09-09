import { InternalServerErrorException } from '@nestjs/common';

export class StepUpsertMechanismFailedMissingIdException extends InternalServerErrorException {
  constructor() {
    super('Step upsert mechanism failed due to missing id');
  }
}
