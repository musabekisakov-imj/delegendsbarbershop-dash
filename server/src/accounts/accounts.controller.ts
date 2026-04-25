import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { InviteAccountDto } from './dto/invite-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

interface AuthRequest extends Request {
  user: { id: string; tenantId: string; role: string; email: string };
}

@ApiTags('accounts')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('accounts')
export class AccountsController {
  constructor(private readonly svc: AccountsService) {}

  @Get()
  @ApiOperation({ summary: 'List all accounts for the current tenant' })
  findAll(@Request() req: AuthRequest) {
    return this.svc.findAll(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.svc.findOne(req.user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Invite a new account (status: invited, random temp password hashed)' })
  invite(@Request() req: AuthRequest, @Body() dto: InviteAccountDto) {
    return this.svc.invite(req.user.tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update role, status, or office access' })
  update(@Request() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.svc.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Disable an account (sets status: disabled, no hard delete)' })
  disable(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.svc.disable(req.user.tenantId, id);
  }
}
