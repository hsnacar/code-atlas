import path from 'node:path';
import { ArchitectureLayer } from './types.js';

export function classifyFileLayer(filePath: string): ArchitectureLayer {
  const raw = filePath.toLowerCase().replace(/\\/g, '/');
  const normalized = raw.startsWith('/') ? raw : '/' + raw;
  const basename = path.basename(normalized);
  const ext = path.extname(normalized);

  // 1. Tests
  if (
    normalized.includes('/test/') ||
    normalized.includes('/tests/') ||
    normalized.includes('/__tests__/') ||
    normalized.includes('/spec/') ||
    normalized.includes('/specs/') ||
    basename.includes('.test.') ||
    basename.includes('.spec.') ||
    basename.endsWith('_test.go') ||
    basename.endsWith('test.java')
  ) {
    return 'test';
  }

  // 2. API / Entrypoints / Routes / Controllers / CLI
  if (
    normalized.includes('/controllers/') ||
    normalized.includes('/routes/') ||
    normalized.includes('/handlers/') ||
    normalized.includes('/endpoints/') ||
    normalized.includes('/api/') ||
    normalized.includes('/cli') ||
    normalized.includes('/resolvers/') ||
    basename.includes('controller.') ||
    basename.includes('route.') ||
    basename.includes('handler.') ||
    basename.includes('endpoint.') ||
    basename === 'cli.ts' ||
    basename === 'cli.js' ||
    basename === 'index.ts' ||
    basename === 'index.js' ||
    basename === 'main.go' ||
    basename === 'main.py' ||
    basename === 'main.ts'
  ) {
    return 'api';
  }

  // 3. Business Logic / Services / UseCases / Processors
  if (
    normalized.includes('/services/') ||
    normalized.includes('/usecases/') ||
    normalized.includes('/use-cases/') ||
    normalized.includes('/logic/') ||
    normalized.includes('/domain/') ||
    normalized.includes('/managers/') ||
    normalized.includes('/processors/') ||
    basename.includes('service.') ||
    basename.includes('usecase.') ||
    basename.includes('manager.') ||
    basename.includes('processor.')
  ) {
    return 'service';
  }

  // 4. Data / Models / Schemas / Entities / Repositories
  if (
    normalized.includes('/models/') ||
    normalized.includes('/entities/') ||
    normalized.includes('/schemas/') ||
    normalized.includes('/repositories/') ||
    normalized.includes('/repos/') ||
    normalized.includes('/migrations/') ||
    normalized.includes('/dto/') ||
    normalized.includes('/types/') ||
    basename.includes('model.') ||
    basename.includes('schema.') ||
    basename.includes('entity.') ||
    basename.includes('repo.') ||
    basename.includes('repository.') ||
    basename.includes('dto.') ||
    basename === 'types.ts' ||
    basename === 'schema.prisma'
  ) {
    return 'data';
  }

  // 5. Config / Setup / Infrastructure / Middlewares
  if (
    normalized.includes('/config/') ||
    normalized.includes('/configs/') ||
    normalized.includes('/middlewares/') ||
    normalized.includes('/middleware/') ||
    normalized.includes('/infra/') ||
    normalized.includes('/infrastructure/') ||
    basename.includes('config.') ||
    basename.includes('setup.') ||
    basename.includes('middleware.') ||
    basename.endsWith('.env') ||
    basename.endsWith('.config.js') ||
    basename.endsWith('.config.ts')
  ) {
    return 'config';
  }

  // 6. Utilities / Helpers
  if (
    normalized.includes('/utils/') ||
    normalized.includes('/util/') ||
    normalized.includes('/helpers/') ||
    normalized.includes('/lib/') ||
    normalized.includes('/common/') ||
    normalized.includes('/shared/') ||
    basename.includes('util.') ||
    basename.includes('helper.') ||
    basename.includes('common.')
  ) {
    return 'util';
  }

  return 'other';
}
