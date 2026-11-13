/**
 * Infraestructura · Creación de la cuenta administradora al arrancar.
 *
 * Cuando la aplicación termina de iniciar, ejecuta el caso de uso
 * `EnsureAdminUser` con los datos de ADMIN_EMAIL / ADMIN_PASSWORD. Si esas
 * variables no están definidas, no hace nada.
 */
import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ENSURE_ADMIN_USER } from '../../application/ports/in/admin.ports.js';
import type { EnsureAdminUserPort } from '../../application/ports/in/admin.ports.js';
import { USERS_CONFIG } from '../config/users.config.js';
import type { UsersConfig } from '../config/users.config.js';

@Injectable()
export class AdminSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminSeeder.name);

  constructor(
    @Inject(ENSURE_ADMIN_USER) private readonly ensureAdmin: EnsureAdminUserPort,
    @Inject(USERS_CONFIG) private readonly config: UsersConfig,
  ) {}

  /** Lo llama NestJS automáticamente al terminar de arrancar. */
  async onApplicationBootstrap(): Promise<void> {
    if (!this.config.admin) {
      this.logger.warn('ADMIN_EMAIL no está definido: no se creó cuenta administradora.');
      return;
    }
    const created = await this.ensureAdmin.execute(this.config.admin);
    this.logger.log(
      created
        ? `Cuenta administradora creada: ${this.config.admin.email}`
        : `La cuenta administradora ${this.config.admin.email} ya existía.`,
    );
  }
}
