import { Module } from "@nestjs/common";
import { IssuesService } from "./issues.service";
import { IssuesController } from "./issues.controller";
import { AuthModule } from "../auth/auth.module";
import { BoardsModule } from "../boards/boards.module";

@Module({
  imports: [AuthModule, BoardsModule],
  controllers: [IssuesController],
  providers: [IssuesService],
})
export class IssuesModule {}
