/**
 * Aplicación · Puertos de entrada de las direcciones de envío.
 */
import { AddressData } from '../../../domain/entities/address.js';
import { AddressView } from '../../views/user.view.js';

// --- Listar -----------------------------------------------------------------

export const LIST_ADDRESSES = Symbol('ListAddresses');

/** Devuelve las direcciones del usuario. */
export interface ListAddressesPort {
  execute(userId: string): Promise<AddressView[]>;
}

// --- Agregar ----------------------------------------------------------------

export const ADD_ADDRESS = Symbol('AddAddress');

export interface AddAddressCommand {
  userId: string;
  address: AddressData;
  /** Si la nueva dirección debe quedar como predeterminada. */
  isDefault?: boolean;
}

/** Agrega una dirección al usuario. */
export interface AddAddressPort {
  execute(command: AddAddressCommand): Promise<AddressView>;
}

// --- Editar -----------------------------------------------------------------

export const UPDATE_ADDRESS = Symbol('UpdateAddress');

export interface UpdateAddressCommand {
  userId: string;
  addressId: string;
  changes: Partial<AddressData>;
  /** `true` la convierte en la predeterminada. */
  isDefault?: boolean;
}

/** Edita una dirección del usuario. */
export interface UpdateAddressPort {
  execute(command: UpdateAddressCommand): Promise<AddressView>;
}

// --- Eliminar ---------------------------------------------------------------

export const REMOVE_ADDRESS = Symbol('RemoveAddress');

export interface RemoveAddressCommand {
  userId: string;
  addressId: string;
}

/** Elimina una dirección del usuario. */
export interface RemoveAddressPort {
  execute(command: RemoveAddressCommand): Promise<void>;
}
