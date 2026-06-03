import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BoardsController } from "./boards.controller";
import { BoardsService } from "./boards.service";

/**
 * Boards domain: workspace-scoped issue groupings (Checkout, Marketing, …).
 * Exports BoardsService so IssuesService can call `assertBoardInWorkspace`
 * when an Issue is patched with a new boardId.
 */
@Module({
  imports: [AuthModule],
  controllers: [BoardsController],
  providers: [BoardsService],
  exports: [BoardsService],
})
export class BoardsModule {}
