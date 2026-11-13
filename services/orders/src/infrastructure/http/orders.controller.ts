/**
 * Infraestructura · Adaptadores de entrada HTTP: pedidos.
 *
 * - `OrdersController` (`/orders`): compra e historial del usuario autenticado.
 * - `AdminOrdersController` (`/admin/orders`): panel de administración.
 */
import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CANCEL_ORDER,
  GET_ORDER,
  LIST_ALL_ORDERS,
  LIST_MY_ORDERS,
  PLACE_ORDER,
  UPDATE_ORDER_STATUS,
} from '../../application/ports/in/order.ports.js';
import type {
  CancelOrderPort,
  GetOrderPort,
  ListAllOrdersPort,
  ListMyOrdersPort,
  PlaceOrderPort,
  Requester,
  UpdateOrderStatusPort,
} from '../../application/ports/in/order.ports.js';
import {
  AdminOrdersQueryDto,
  OrderPageResponseDto,
  OrderResponseDto,
  PageQueryDto,
  PlaceOrderDto,
  UpdateOrderStatusDto,
} from './dto/orders.dto.js';
import { AdminOnlyGuard, AuthenticatedGuard, CurrentRequester } from './gateway-identity.js';

@ApiTags('orders')
@UseGuards(AuthenticatedGuard)
@Controller('orders')
export class OrdersController {
  constructor(
    @Inject(PLACE_ORDER) private readonly placeOrder: PlaceOrderPort,
    @Inject(LIST_MY_ORDERS) private readonly listMyOrders: ListMyOrdersPort,
    @Inject(GET_ORDER) private readonly getOrder: GetOrderPort,
    @Inject(CANCEL_ORDER) private readonly cancelOrder: CancelOrderPort,
  ) {}

  /**
   * Compra el contenido del carrito. Responde 201 con el pedido: `status` es
   * `PAID` si el pago se aprobó o `PAYMENT_FAILED` (con el motivo) si no.
   */
  @Post()
  @ApiOperation({ summary: 'Comprar el carrito (checkout)' })
  @ApiResponse({ status: 201, type: OrderResponseDto, description: 'Pedido PAID o PAYMENT_FAILED' })
  @ApiConflictResponse({ description: 'Sin stock suficiente o producto no disponible.' })
  @ApiServiceUnavailableResponse({ description: 'Catálogo o Pagos no disponibles.' })
  place(@CurrentRequester() me: Requester, @Body() dto: PlaceOrderDto): Promise<OrderResponseDto> {
    return this.placeOrder.execute({ userId: me.userId, shippingAddress: dto.shippingAddress, card: dto.card });
  }

  /** Mis pedidos, del más reciente al más antiguo. */
  @Get()
  @ApiOperation({ summary: 'Mis pedidos' })
  @ApiResponse({ status: 200, type: OrderPageResponseDto })
  mine(@CurrentRequester() me: Requester, @Query() query: PageQueryDto): Promise<OrderPageResponseDto> {
    return this.listMyOrders.execute(me.userId, query.page, query.pageSize);
  }

  /** Detalle de un pedido propio (o de cualquiera si es admin). */
  @Get(':id')
  @ApiOperation({ summary: 'Ver un pedido' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  @ApiNotFoundResponse()
  get(@CurrentRequester() me: Requester, @Param('id') id: string): Promise<OrderResponseDto> {
    return this.getOrder.execute(id, me);
  }

  /** Cancela un pedido pagado que aún no se envió (reembolso y devolución de stock). */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar un pedido' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  @ApiConflictResponse({ description: 'El pedido ya no se puede cancelar.' })
  cancel(@CurrentRequester() me: Requester, @Param('id') id: string): Promise<OrderResponseDto> {
    return this.cancelOrder.execute(id, me.userId);
  }
}

@ApiTags('admin')
@UseGuards(AdminOnlyGuard)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(
    @Inject(LIST_ALL_ORDERS) private readonly listAllOrders: ListAllOrdersPort,
    @Inject(UPDATE_ORDER_STATUS) private readonly updateStatus: UpdateOrderStatusPort,
  ) {}

  /** Todos los pedidos, opcionalmente filtrados por estado. */
  @Get()
  @ApiOperation({ summary: 'Listar todos los pedidos (admin)' })
  @ApiResponse({ status: 200, type: OrderPageResponseDto })
  list(@Query() query: AdminOrdersQueryDto): Promise<OrderPageResponseDto> {
    return this.listAllOrders.execute(query);
  }

  /** Marca el pedido como enviado o entregado. */
  @Patch(':id/status')
  @ApiOperation({ summary: 'Cambiar estado: SHIPPED o DELIVERED (admin)' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  @ApiConflictResponse({ description: 'El cambio no sigue el orden PAID → SHIPPED → DELIVERED.' })
  setStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto): Promise<OrderResponseDto> {
    return this.updateStatus.execute(id, dto.status);
  }
}
