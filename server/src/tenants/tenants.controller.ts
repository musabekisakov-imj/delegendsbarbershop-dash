import { Body, Controller, Get, Patch, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';

interface AuthRequest extends Request {
  user: { id: string; tenantId: string; role: string; email: string };
}

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('tenants')
export class TenantsController {
  constructor(private readonly svc: TenantsService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current tenant (shop info + working hours)' })
  findCurrent(@Request() req: AuthRequest) {
    return this.svc.findCurrent(req.user.tenantId);
  }

  @Patch('current')
  @ApiOperation({ summary: 'Update tenant settings and working hours' })
  update(@Request() req: AuthRequest, @Body() dto: UpdateTenantDto) {
    return this.svc.update(req.user.tenantId, dto);
  }
}
