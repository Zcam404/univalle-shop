/**
 * Infraestructura · Adaptador de entrada HTTP: rutas internas de Pedidos.
 *
 * Las usa el servicio de Recomendación dentro de la red de Docker. El API
 * Gateway no tiene rutas hacia `/internal`.
 */
import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GET_TOP_PRODUCTS, GET_USER_PURCHASES } from '../../application/ports/in/order.ports.js';
import type { GetTopProductsPort, GetUserPurchasesPort } from '../../application/ports/in/order.ports.js';
import type { ProductSales, PurchasedProduct } from '../../application/ports/out/order.repository.js';

@ApiTags('internal')
@Controller('internal')
export class InternalOrdersController {
  constructor(
    @Inject(GET_USER_PURCHASES) private readonly userPurchases: GetUserPurchasesPort,
    @Inject(GET_TOP_PRODUCTS) private readonly topProducts: GetTopProductsPort,
  ) {}

  /** Productos que compró el usuario, con cantidades y fecha de la última compra. */
  @Get('users/:userId/purchases')
  @ApiOperation({ summary: 'Compras de un usuario (interno)' })
  purchases(@Param('userId') userId: string): Promise<PurchasedProduct[]> {
    return this.userPurchases.execute(userId);
  }

  /** Productos más vendidos de la tienda. */
  @Get('top-products')
  @ApiOperation({ summary: 'Productos más vendidos (interno)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  top(@Query('limit') limit?: string): Promise<ProductSales[]> {
    return this.topProducts.execute(limit ? Number(limit) || undefined : undefined);
  }
}
