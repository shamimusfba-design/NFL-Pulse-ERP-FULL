import { BadRequestException, Controller, Get, Param, Post, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { extname, join, resolve } from 'path';
import { JwtAuthGuard } from './auth';

const uploadRoot = join(process.cwd(), 'uploads', 'items');
const allowed = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

@Controller('uploads')
export class UploadsController {
  @Post('item-image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadItemImage(@UploadedFile() file: any) {
    if (!file?.buffer?.length) throw new BadRequestException('Item image is required');
    const safeExt = allowed.get(file.mimetype) || extname(file.originalname || '').toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(safeExt)) throw new BadRequestException('Only JPG, PNG or WEBP item images are allowed');
    mkdirSync(uploadRoot, { recursive: true });
    const filename = `${randomUUID()}${safeExt === '.jpeg' ? '.jpg' : safeExt}`;
    writeFileSync(join(uploadRoot, filename), file.buffer);
    const base = process.env.API_PUBLIC_URL || `http://localhost:${process.env.API_PORT || 4000}`;
    return { url: `${base}/api/uploads/items/${filename}` };
  }

  @Get('items/:filename')
  getItemImage(@Param('filename') filename: string, @Res() res: any) {
    if (!/^[a-f0-9-]+\.(jpg|png|webp)$/i.test(filename)) throw new BadRequestException('Invalid image name');
    return res.sendFile(resolve(uploadRoot, filename));
  }
}
