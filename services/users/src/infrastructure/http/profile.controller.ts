/**
 * Infraestructura · Adaptador de entrada HTTP: perfil y direcciones.
 *
 * Rutas del usuario autenticado bajo `/users/me`. Exigen la identidad que
 * envía el API Gateway (ver `gateway-identity.ts`).
 */
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiNotFoundResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ADD_ADDRESS, LIST_ADDRESSES, REMOVE_ADDRESS, UPDATE_ADDRESS } from '../../application/ports/in/address.ports.js';
import type {
  AddAddressPort,
  ListAddressesPort,
  RemoveAddressPort,
  UpdateAddressPort,
} from '../../application/ports/in/address.ports.js';
import { GET_PROFILE, UPDATE_PROFILE } from '../../application/ports/in/profile.ports.js';
import type { GetProfilePort, UpdateProfilePort } from '../../application/ports/in/profile.ports.js';
import { AddressResponseDto, CreateAddressDto, UpdateAddressDto, UpdateProfileDto, UserResponseDto } from './dto/user.dto.js';
import { CurrentUserId, GatewayAuthGuard, USER_ID_HEADER } from './gateway-identity.js';

@ApiTags('users')
@ApiHeader({ name: USER_ID_HEADER, required: true, description: 'Id del usuario; lo agrega el API Gateway a partir del JWT.' })
@UseGuards(GatewayAuthGuard)
@Controller('users/me')
export class ProfileController {
  constructor(
    @Inject(GET_PROFILE) private readonly getProfile: GetProfilePort,
    @Inject(UPDATE_PROFILE) private readonly updateProfile: UpdateProfilePort,
    @Inject(LIST_ADDRESSES) private readonly listAddresses: ListAddressesPort,
    @Inject(ADD_ADDRESS) private readonly addAddress: AddAddressPort,
    @Inject(UPDATE_ADDRESS) private readonly updateAddress: UpdateAddressPort,
    @Inject(REMOVE_ADDRESS) private readonly removeAddress: RemoveAddressPort,
  ) {}

  /** Devuelve el perfil del usuario autenticado. */
  @Get()
  @ApiOperation({ summary: 'Ver mi perfil' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  me(@CurrentUserId() userId: string): Promise<UserResponseDto> {
    return this.getProfile.execute(userId);
  }

  /** Cambia nombre y/o teléfono. */
  @Patch()
  @ApiOperation({ summary: 'Editar mi perfil' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  update(@CurrentUserId() userId: string, @Body() dto: UpdateProfileDto): Promise<UserResponseDto> {
    return this.updateProfile.execute({ userId, name: dto.name, phone: dto.phone });
  }

  /** Lista las direcciones de envío. */
  @Get('addresses')
  @ApiOperation({ summary: 'Listar mis direcciones' })
  @ApiResponse({ status: 200, type: [AddressResponseDto] })
  addresses(@CurrentUserId() userId: string): Promise<AddressResponseDto[]> {
    return this.listAddresses.execute(userId);
  }

  /** Agrega una dirección de envío (máximo 5). */
  @Post('addresses')
  @ApiOperation({ summary: 'Agregar una dirección' })
  @ApiResponse({ status: 201, type: AddressResponseDto })
  createAddress(@CurrentUserId() userId: string, @Body() dto: CreateAddressDto): Promise<AddressResponseDto> {
    const { isDefault, ...address } = dto;
    return this.addAddress.execute({ userId, address, isDefault });
  }

  /** Edita una dirección; con `isDefault: true` la vuelve predeterminada. */
  @Patch('addresses/:addressId')
  @ApiOperation({ summary: 'Editar una dirección' })
  @ApiResponse({ status: 200, type: AddressResponseDto })
  @ApiNotFoundResponse({ description: 'La dirección no existe.' })
  editAddress(
    @CurrentUserId() userId: string,
    @Param('addressId') addressId: string,
    @Body() dto: UpdateAddressDto,
  ): Promise<AddressResponseDto> {
    const { isDefault, ...changes } = dto;
    return this.updateAddress.execute({ userId, addressId, changes, isDefault });
  }

  /** Elimina una dirección. */
  @Delete('addresses/:addressId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una dirección' })
  @ApiResponse({ status: 204 })
  @ApiNotFoundResponse({ description: 'La dirección no existe.' })
  async deleteAddress(@CurrentUserId() userId: string, @Param('addressId') addressId: string): Promise<void> {
    await this.removeAddress.execute({ userId, addressId });
  }
}
