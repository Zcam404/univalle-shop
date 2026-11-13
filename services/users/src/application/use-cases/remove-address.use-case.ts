/**
 * Aplicación · Caso de uso: eliminar dirección.
 */
import { RemoveAddressCommand, RemoveAddressPort } from '../ports/in/address.ports.js';
import { UserRepository } from '../ports/out/user.repository.js';
import { findUserOrFail } from '../services/find-user-or-fail.js';

/** Elimina una dirección del usuario autenticado. */
export class RemoveAddressUseCase implements RemoveAddressPort {
  constructor(private readonly users: UserRepository) {}

  /**
   * @throws UserNotFoundError Si el usuario no existe.
   * @throws AddressNotFoundError Si la dirección no es del usuario.
   */
  async execute(command: RemoveAddressCommand): Promise<void> {
    const user = await findUserOrFail(this.users, command.userId);
    user.removeAddress(command.addressId);
    await this.users.save(user);
  }
}
