import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notificacion } from './notificacion.entity';
import { Cita } from '../citas/cita.entity';
import { TipoNotificacion } from '../common/enums';

@Injectable()
export class NotificacionesService {
  constructor(@InjectRepository(Notificacion) private repo: Repository<Notificacion>) {}

  enviar(cita: Cita, tipo: TipoNotificacion, mensaje: string): Promise<Notificacion> {
    const notificacion = this.repo.create({ cita, tipo, mensaje });
    return this.repo.save(notificacion);
  }
}
