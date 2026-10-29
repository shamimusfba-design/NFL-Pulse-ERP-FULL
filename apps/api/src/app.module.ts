import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController, AuthService, JwtAuthGuard } from './auth';
import { HealthController } from './health';
import { MastersController } from './masters';
import { OrdersController } from './orders';
import { PrismaService } from './prisma.service';
import { TasksController } from './tasks';
import { DomainController } from './domain/domain.controller';
import { OrderImportController } from './order-import/order-import.controller';
import { OrderImportService } from './order-import/order-import.service';
import { PdfTextService } from './order-import/pdf-text.service';
import { UploadsController } from './uploads';
import { CadController } from './cad';
import { PlanningController } from './planning';
import { DemoController } from './demo';
import { IeController } from './ie';
import { ImportsController } from './imports';
import { DocumentsController } from './documents';
import { ProductionLotsController } from './production-lots';
import { MaintenanceController } from './maintenance';
import { IeOperationsController } from './ie-operations';
import { BulkMerchController } from './merch/bulk-merch.controller';
import { SampleMerchController } from './merch/sample-merch.controller';
import { CostController } from './merch/cost.controller';
import { YarnController } from './yarn-knit/yarn.controller';
import { KnittingController } from './yarn-knit/knitting.controller';
import { KnitQualityController } from './yarn-knit/knit-quality.controller';
import { PlanningApprovalsController } from './planning-approvals/planning-approvals.controller';
import { DyeingController } from './dyeing/dyeing.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), JwtModule.register({})],
  controllers: [HealthController, AuthController, MastersController, OrdersController, OrderImportController, TasksController, DomainController, UploadsController, CadController, PlanningController, DemoController, IeController, ImportsController, DocumentsController, ProductionLotsController, MaintenanceController, IeOperationsController, BulkMerchController, SampleMerchController, CostController, YarnController, KnittingController, KnitQualityController, PlanningApprovalsController, DyeingController],
  providers: [PrismaService, AuthService, JwtAuthGuard, OrderImportService, PdfTextService],
})
export class AppModule {}
