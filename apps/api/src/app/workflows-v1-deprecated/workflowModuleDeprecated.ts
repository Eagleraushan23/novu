import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChangeModule } from '../change/change.module';
import { IntegrationModule } from '../integrations/integrations.module';
import { MessageTemplateModule } from '../message-template/message-template.module';
import { SharedModule } from '../shared/shared.module';
import { NotificationTemplateController } from './notification-template.controller';
import { USE_CASES } from './usecases';
import { WorkflowControllerDeprecated } from './workflowControllerDeprecated';
import { PreferencesModule } from '../preferences';

@Module({
  imports: [SharedModule, MessageTemplateModule, ChangeModule, AuthModule, IntegrationModule, PreferencesModule],
  controllers: [NotificationTemplateController, WorkflowControllerDeprecated],
  providers: [...USE_CASES],
  exports: [...USE_CASES],
})
export class WorkflowModuleDeprecated implements NestModule {
  configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void {}
}
