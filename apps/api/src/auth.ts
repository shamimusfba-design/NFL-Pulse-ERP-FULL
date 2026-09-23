import { Body, CanActivate, Controller, ExecutionContext, Injectable, Post, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IsEmail, IsString, MinLength } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { PrismaService } from './prisma.service';

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
}

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { roles: { include: { role: true } } },
    });
    if (!user || !user.active || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const roles = user.roles.map((x) => x.role.code);
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, name: user.name, roles }, {
      secret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
      expiresIn: (process.env.JWT_ACCESS_TTL || '15m') as any,
    });
    const refreshToken = await this.jwt.signAsync({ sub: user.id, type: 'refresh' }, {
      secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
      expiresIn: (process.env.JWT_REFRESH_TTL || '7d') as any,
    });
    const decoded = this.jwt.decode(refreshToken) as { exp?: number } | null;
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: createHash('sha256').update(refreshToken).digest('hex'),
        userId: user.id,
        expiresAt: decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 86400000),
      },
    });
    return { accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name, roles } };
  }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwt: JwtService, private prisma: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const raw = req.headers.authorization as string | undefined;
    const token = raw?.startsWith('Bearer ') ? raw.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('Missing bearer token');
    try {
      const payload = await this.jwt.verifyAsync(token, { secret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret' });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { roles: { include: { role: true } } },
      });
      if (!user?.active) throw new Error('inactive');
      req.user = { id: user.id, email: user.email, name: user.name, roles: user.roles.map((x) => x.role.code) };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}
  @Post('login') login(@Body() dto: LoginDto) { return this.auth.login(dto); }
}
