/**
 * Aplicación · Caso de uso: editar dirección.
 */
import { UpdateAddressCommand, UpdateAddressPort } from '../ports/in/address.ports.js';
import { UserRepository } from '../ports/out/user.repository.js';
import { findUserOrFail } from '../services/find-user-or-fail.js';
import { AddressView, toAddressView } from '../views/user.view.js';

/** Edita una dirección del usuario autenticado y, si se pide, la vuelve predeterminada. */
export class UpdateAddressUseCase implements UpdateAddressPort {
  constructor(private readonly users: UserRepository) {}

  /**
   * @throws UserNotFoundError Si el usuario no existe.
   * @throws AddressNotFoundError Si la dirección no es del usuario.
   * @throws InvalidAddressError Si los datos no son válidos.
   */
  async execute(command: UpdateAddressCommand): Promise<AddressView> {
    const user = await findUserOrFail(this.users, command.userId);
    const address = user.updateAddress(command.addressId, command.changes, command.isDefault ?? false);
    await this.users.save(user);
    return toAddressView(address);
  }
}
