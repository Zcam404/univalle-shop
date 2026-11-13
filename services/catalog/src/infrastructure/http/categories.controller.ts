/**
 * Infraestructura · Adaptador de entrada HTTP: categorías.
 *
 * Lectura pública; crear, editar y borrar solo para administradores.
 */
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiConflictResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CREATE_CATEGORY, DELETE_CATEGORY, LIST_CATEGORIES, UPDATE_CATEGORY } from '../../application/ports/in/category.ports.js';
import type {
  CreateCategoryPort,
  DeleteCategoryPort,
  ListCategoriesPort,
  UpdateCategoryPort,
} from '../../application/ports/in/category.ports.js';
import { CategoryResponseDto, CreateCategoryDto, UpdateCategoryDto } from './dto/catalog.dto.js';
import { AdminOnlyGuard } from './gateway-identity.js';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(
    @Inject(LIST_CATEGORIES) private readonly listCategories: ListCategoriesPort,
    @Inject(CREATE_CATEGORY) private readonly createCategory: CreateCategoryPort,
    @Inject(UPDATE_CATEGORY) private readonly updateCategory: UpdateCategoryPort,
    @Inject(DELETE_CATEGORY) private readonly deleteCategory: DeleteCategoryPort,
  ) {}

  /** Lista todas las categorías. */
  @Get()
  @ApiOperation({ summary: 'Listar categorías' })
  @ApiResponse({ status: 200, type: [CategoryResponseDto] })
  list(): Promise<CategoryResponseDto[]> {
    return this.listCategories.execute();
  }

  /** Crea una categoría (admin). */
  @Post()
  @UseGuards(AdminOnlyGuard)
  @ApiOperation({ summary: 'Crear categoría (admin)' })
  @ApiResponse({ status: 201, type: CategoryResponseDto })
  @ApiConflictResponse({ description: 'Ya existe una categoría con ese nombre.' })
  create(@Body() dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    return this.createCategory.execute(dto);
  }

  /** Renombra o cambia la descripción de una categoría (admin). */
  @Patch(':id')
  @UseGuards(AdminOnlyGuard)
  @ApiOperation({ summary: 'Editar categoría (admin)' })
  @ApiResponse({ status: 200, type: CategoryResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    return this.updateCategory.execute({ id, ...dto });
  }

  /** Elimina una categoría sin productos (admin). */
  @Delete(':id')
  @UseGuards(AdminOnlyGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar categoría sin productos (admin)' })
  @ApiConflictResponse({ description: 'La categoría tiene productos.' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.deleteCategory.execute(id);
  }
}
