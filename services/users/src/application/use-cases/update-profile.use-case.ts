/**
 * Aplicación · Caso de uso: editar perfil.
 */
import { UpdateProfileCommand, UpdateProfilePort } from '../ports/in/profile.ports.js';
import { UserRepository } from '../ports/out/user.repository.js';
import { findUserOrFail } from '../services/find-user-or-fail.js';
import { UserView, toUserView } from '../views/user.view.js';

/** Cambia el nombre y/o el teléfono del usuario autenticado. */
export class UpdateProfileUseCase implements UpdateProfilePort {
  constructor(private readonly users: UserRepository) {}

  /**
   * @throws UserNotFoundError Si el usuario no existe.
   * @throws InvalidProfileDataError Si el nombre o el teléfono no son válidos.
   */
  async execute(command: UpdateProfileCommand): Promise<UserView> {
    const user = await findUserOrFail(this.users, command.userId);
    user.updateProfile({ name: command.name, phone: command.phone });
    await this.users.save(user);
    return toUserView(user);
  }
}
