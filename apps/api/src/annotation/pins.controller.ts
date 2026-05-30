import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AnnotationService } from "./annotation.service";
import { CreatePinDto } from "./dto/create-pin.dto";
import { UpdatePinDto } from "./dto/update-pin.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, AuthenticatedUser } from "../common/current-user.decorator";

@Controller("annotation/pins")
@UseGuards(JwtAuthGuard)
export class PinsController {
  constructor(private readonly annotation: AnnotationService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePinDto) {
    return this.annotation.createPin(user, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query("pageUrl") pageUrl: string) {
    return this.annotation.listPagePins(user, pageUrl);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdatePinDto,
  ) {
    return this.annotation.updatePin(user, id, dto);
  }

  @Delete(":id")
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    await this.annotation.deletePin(user, id);
    return { deleted: true };
  }
}
