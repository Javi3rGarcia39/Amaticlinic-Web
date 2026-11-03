import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Protege rutas exigiendo un JWT valido (equivalente al JwtAuthenticationFilter de Spring)
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
