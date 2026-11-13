/**
 * Aplicación · Caso de uso: listar direcciones.
 */
import { ListAddressesPort } from '../ports/in/address.ports.js';
import { UserRepository } from '../ports/out/user.repository.js';
import { findUserOrFail } from '../services/find-user-or-fail.js';
import { AddressView, toAddressView } from '../views/user.view.js';

/** Devuelve las direcciones de envío del usuario autenticado. */
export class ListAddressesUseCase implements ListAddressesPort {
  constructor(private readonly users: UserRepository) {}

  /** @throws UserNotFoundError Si el usuario no existe. */
  async execute(userId: string): Promise<AddressView[]> {
    const user = await findUserOrFail(this.users, userId);
    return user.addresses.map(toAddressView);
  }
}
