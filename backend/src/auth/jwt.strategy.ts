import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

// Payload embebido en el token: correo + tipoUsuario (igual que JwtUtil.generateToken en Spring)
export interface JwtPayload {
  sub: string; // correo
  tipoUsuario: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // Lo que retorna aqui queda disponible como request.user
    return { correo: payload.sub, tipoUsuario: payload.tipoUsuario };
  }
}
