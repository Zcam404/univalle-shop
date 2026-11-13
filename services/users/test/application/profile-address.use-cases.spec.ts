/**
 * Pruebas de los casos de uso de perfil y direcciones.
 */
import { AddAddressUseCase } from '../../src/application/use-cases/add-address.use-case.js';
import { GetProfileUseCase } from '../../src/application/use-cases/get-profile.use-case.js';
import { ListAddressesUseCase } from '../../src/application/use-cases/list-addresses.use-case.js';
import { RemoveAddressUseCase } from '../../src/application/use-cases/remove-address.use-case.js';
import { UpdateAddressUseCase } from '../../src/application/use-cases/update-address.use-case.js';
import { UpdateProfileUseCase } from '../../src/application/use-cases/update-profile.use-case.js';
import { User } from '../../src/domain/entities/user.js';
import { AddressNotFoundError, UserNotFoundError } from '../../src/domain/errors/user.errors.js';
import { Email } from '../../src/domain/value-objects/email.js';
import { InMemoryUserRepository, SequentialIdGenerator } from '../fakes/fakes.js';

/** Prepara un repositorio con un administrador ya creado (id `u1`). */
async function setup() {
  const users = new InMemoryUserRepository();
  const ids = new SequentialIdGenerator();
  await users.save(
    User.createAdmin({ id: 'u1', name: 'Ana', email: Email.create('ana@correounivalle.edu.co'), passwordHash: 'h', createdAt: new Date() }),
  );
  return {
    users,
    getProfile: new GetProfileUseCase(users),
    updateProfile: new UpdateProfileUseCase(users),
    list: new ListAddressesUseCase(users),
    add: new AddAddressUseCase(users, ids),
    update: new UpdateAddressUseCase(users),
    remove: new RemoveAddressUseCase(users),
  };
}

const casa = { label: 'Casa', street: 'Calle 13 # 100-00', city: 'Cali', department: 'Valle del Cauca' };

describe('Perfil', () => {
  it('consulta y edita el perfil, y el cambio queda guardado', async () => {
    const t = await setup();
    await t.updateProfile.execute({ userId: 'u1', name: 'Ana María', phone: '3001234567' });
    expect(await t.getProfile.execute('u1')).toMatchObject({ name: 'Ana María', phone: '3001234567' });
  });

  it('falla si el usuario no existe', async () => {
    const t = await setup();
    await expect(t.getProfile.execute('nope')).rejects.toThrow(UserNotFoundError);
  });
});

describe('Direcciones', () => {
  it('agrega, edita, lista y elimina direcciones', async () => {
    const t = await setup();
    const first = await t.add.execute({ userId: 'u1', address: casa });
    const second = await t.add.execute({ userId: 'u1', address: { ...casa, label: 'Oficina' } });
    expect(first.isDefault).toBe(true);
    expect(second.isDefault).toBe(false);

    await t.update.execute({ userId: 'u1', addressId: second.id, changes: { city: 'Palmira' }, isDefault: true });
    let list = await t.list.execute('u1');
    expect(list.find((a) => a.isDefault)).toMatchObject({ id: second.id, city: 'Palmira' });

    await t.remove.execute({ userId: 'u1', addressId: second.id });
    list = await t.list.execute('u1');
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: first.id, isDefault: true });
  });

  it('no permite tocar direcciones que no existen', async () => {
    const t = await setup();
    await expect(t.remove.execute({ userId: 'u1', addressId: 'nope' })).rejects.toThrow(AddressNotFoundError);
  });
});
