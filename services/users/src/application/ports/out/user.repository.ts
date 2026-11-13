/**
 * Aplicación · Puerto de salida `UserRepository`.
 *
 * Contrato para guardar y recuperar usuarios. Los casos de uso dependen de esta
 * interfaz, no de MongoDB: el adaptador concreto (`MongoUserRepository`) se
 * inyecta desde el módulo de NestJS, y en las pruebas se usa uno en memoria.
 */
import { User } from '../../../domain/entities/user.js';
import { Email } from '../../../domain/value-objects/email.js';

/** Token de inyección de dependencias para este puerto. */
export const USER_REPOSITORY = Symbol('UserRepository');

export interface UserRepository {
  /** Busca un usuario por su identificador. Devuelve `null` si no existe. */
  findById(id: string): Promise<User | null>;

  /** Busca un usuario por su correo. Devuelve `null` si no existe. */
  findByEmail(email: Email): Promise<User | null>;

  /** Crea el usuario o, si ya existe con ese id, reemplaza su estado completo. */
  save(user: User): Promise<void>;
}
