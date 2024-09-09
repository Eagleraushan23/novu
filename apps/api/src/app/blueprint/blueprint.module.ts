import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { SharedModule } from '../shared/shared.module';
import { USE_CASES } from './usecases';
import { BlueprintController } from './blueprint.controller';
import { WorkflowModuleDeprecated } from '../workflows-v1-deprecated/workflowModuleDeprecated';

@Module({
  imports: [SharedModule, WorkflowModuleDeprecated],
  controllers: [BlueprintController],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class BlueprintModule implements NestModule {
  configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void {}
}
