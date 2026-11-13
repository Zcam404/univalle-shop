/**
 * Aplicación · Caso de uso: consultar perfil.
 */
import { GetProfilePort } from '../ports/in/profile.ports.js';
import { UserRepository } from '../ports/out/user.repository.js';
import { findUserOrFail } from '../services/find-user-or-fail.js';
import { UserView, toUserView } from '../views/user.view.js';

/** Devuelve el perfil del usuario autenticado. */
export class GetProfileUseCase implements GetProfilePort {
  constructor(private readonly users: UserRepository) {}

  /** @throws UserNotFoundError Si el usuario no existe. */
  async execute(userId: string): Promise<UserView> {
    return toUserView(await findUserOrFail(this.users, userId));
  }
}
