/**
 * Aplicación · Caso de uso: agregar dirección.
 */
import { AddAddressCommand, AddAddressPort } from '../ports/in/address.ports.js';
import { IdGenerator } from '../ports/out/id-generator.js';
import { UserRepository } from '../ports/out/user.repository.js';
import { findUserOrFail } from '../services/find-user-or-fail.js';
import { AddressView, toAddressView } from '../views/user.view.js';

/** Agrega una dirección de envío al usuario autenticado. */
export class AddAddressUseCase implements AddAddressPort {
  constructor(
    private readonly users: UserRepository,
    private readonly ids: IdGenerator,
  ) {}

  /**
   * @throws UserNotFoundError Si el usuario no existe.
   * @throws AddressLimitReachedError Si ya tiene el máximo de direcciones.
   * @throws InvalidAddressError Si los datos no son válidos.
   */
  async execute(command: AddAddressCommand): Promise<AddressView> {
    const user = await findUserOrFail(this.users, command.userId);
    const address = user.addAddress(this.ids.generate(), command.address, command.isDefault ?? false);
    await this.users.save(user);
    return toAddressView(address);
  }
}
