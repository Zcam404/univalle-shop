/**
 * Aplicación · Puertos de entrada del perfil del usuario autenticado.
 */
import { UserView } from '../../views/user.view.js';

// --- Consultar perfil -------------------------------------------------------

export const GET_PROFILE = Symbol('GetProfile');

/** Devuelve el perfil completo del usuario, incluidas sus direcciones. */
export interface GetProfilePort {
  execute(userId: string): Promise<UserView>;
}

// --- Editar perfil ----------------------------------------------------------

export const UPDATE_PROFILE = Symbol('UpdateProfile');

export interface UpdateProfileCommand {
  userId: string;
  name?: string;
  /** `null` borra el teléfono. */
  phone?: string | null;
}

/** Cambia el nombre y/o teléfono del usuario. */
export interface UpdateProfilePort {
  execute(command: UpdateProfileCommand): Promise<UserView>;
}
