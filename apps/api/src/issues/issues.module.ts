import { Module } from "@nestjs/common";
import { IssuesService } from "./issues.service";
import { IssuesController } from "./issues.controller";
import { PinsInboxService } from "./pins-inbox.service";
import { PinsInboxController } from "./pins-inbox.controller";
import { AuthModule } from "../auth/auth.module";
import { BoardsModule } from "../boards/boards.module";

@Module({
  imports: [AuthModule, BoardsModule],
  controllers: [IssuesController, PinsInboxController],
  providers: [IssuesService, PinsInboxService],
})
export class IssuesModule {}
