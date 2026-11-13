/**
 * Aplicación · Ayudante `findUserOrFail`.
 *
 * Varios casos de uso (perfil y direcciones) empiezan cargando al usuario
 * autenticado; esta función evita repetir esa búsqueda y su error.
 */
import { User } from '../../domain/entities/user.js';
import { UserNotFoundError } from '../../domain/errors/user.errors.js';
import { UserRepository } from '../ports/out/user.repository.js';

/**
 * Busca un usuario por id.
 *
 * @throws UserNotFoundError Si no existe (por ejemplo, un token de una cuenta borrada).
 */
export async function findUserOrFail(repository: UserRepository, userId: string): Promise<User> {
  const user = await repository.findById(userId);
  if (!user) throw new UserNotFoundError();
  return user;
}
