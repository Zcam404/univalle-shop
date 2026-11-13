/**
 * Infraestructura · Adaptador de entrada HTTP: carrito del usuario autenticado.
 */
import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiConflictResponse, ApiOperation, ApiResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { ADD_TO_CART, CLEAR_CART, GET_CART, REMOVE_CART_ITEM, UPDATE_CART_ITEM } from '../../application/ports/in/cart.ports.js';
import type {
  AddToCartPort,
  ClearCartPort,
  GetCartPort,
  RemoveCartItemPort,
  UpdateCartItemPort,
} from '../../application/ports/in/cart.ports.js';
import type { Requester } from '../../application/ports/in/order.ports.js';
import { AddCartItemDto, CartResponseDto, UpdateCartItemDto } from './dto/orders.dto.js';
import { AuthenticatedGuard, CurrentRequester } from './gateway-identity.js';

@ApiTags('cart')
@UseGuards(AuthenticatedGuard)
@Controller('cart')
export class CartController {
  constructor(
    @Inject(GET_CART) private readonly getCart: GetCartPort,
    @Inject(ADD_TO_CART) private readonly addToCart: AddToCartPort,
    @Inject(UPDATE_CART_ITEM) private readonly updateItem: UpdateCartItemPort,
    @Inject(REMOVE_CART_ITEM) private readonly removeItem: RemoveCartItemPort,
    @Inject(CLEAR_CART) private readonly clearCart: ClearCartPort,
  ) {}

  /** Ver el carrito. */
  @Get()
  @ApiOperation({ summary: 'Ver mi carrito' })
  @ApiResponse({ status: 200, type: CartResponseDto })
  get(@CurrentRequester() me: Requester): Promise<CartResponseDto> {
    return this.getCart.execute(me.userId);
  }

  /** Agregar un producto (o sumar unidades si ya estaba). */
  @Post('items')
  @ApiOperation({ summary: 'Agregar producto al carrito' })
  @ApiResponse({ status: 201, type: CartResponseDto })
  @ApiConflictResponse({ description: 'Producto agotado, no disponible o sin unidades suficientes.' })
  @ApiServiceUnavailableResponse({ description: 'Catálogo no disponible.' })
  add(@CurrentRequester() me: Requester, @Body() dto: AddCartItemDto): Promise<CartResponseDto> {
    return this.addToCart.execute({ userId: me.userId, ...dto });
  }

  /** Cambiar la cantidad de un producto. */
  @Patch('items/:productId')
  @ApiOperation({ summary: 'Cambiar cantidad' })
  @ApiResponse({ status: 200, type: CartResponseDto })
  update(
    @CurrentRequester() me: Requester,
    @Param('productId') productId: string,
    @Body() dto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    return this.updateItem.execute({ userId: me.userId, productId, quantity: dto.quantity });
  }

  /** Quitar un producto. */
  @Delete('items/:productId')
  @ApiOperation({ summary: 'Quitar producto del carrito' })
  @ApiResponse({ status: 200, type: CartResponseDto })
  remove(@CurrentRequester() me: Requester, @Param('productId') productId: string): Promise<CartResponseDto> {
    return this.removeItem.execute(me.userId, productId);
  }

  /** Vaciar el carrito. */
  @Delete()
  @ApiOperation({ summary: 'Vaciar carrito' })
  @ApiResponse({ status: 200, type: CartResponseDto })
  clear(@CurrentRequester() me: Requester): Promise<CartResponseDto> {
    return this.clearCart.execute(me.userId);
  }
}
