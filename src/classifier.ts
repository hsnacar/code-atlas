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

  // 2. API / Entrypoints / Routes / Controllers / Resolvers / CLI
  if (
    normalized.includes('/controllers/') ||
    normalized.includes('/controller/') ||
    normalized.includes('/routes/') ||
    normalized.includes('/route/') ||
    normalized.includes('/handlers/') ||
    normalized.includes('/handler/') ||
    normalized.includes('/endpoints/') ||
    normalized.includes('/endpoint/') ||
    normalized.includes('/api/') ||
    normalized.includes('/cli/') ||
    normalized.endsWith('/cli') ||
    normalized.endsWith('/cli.ts') ||
    normalized.endsWith('/cli.js') ||
    normalized.includes('/resolvers/') ||
    normalized.includes('/resolver/') ||
    basename.includes('controller.') ||
    basename.includes('resolver.') ||
    basename.includes('route.') ||
    basename.includes('handler.') ||
    basename.includes('endpoint.') ||
    basename === 'cli.ts' ||
    basename === 'cli.js' ||
    basename === 'main.go' ||
    basename === 'main.py' ||
    basename === 'main.ts'
  ) {
    return 'api';
  }

  // 3. Business Logic / Services / UseCases / Processors
  if (
    normalized.includes('/services/') ||
    normalized.includes('/service/') ||
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
    normalized.includes('/model/') ||
    normalized.includes('/entities/') ||
    normalized.includes('/entity/') ||
    normalized.includes('/schemas/') ||
    normalized.includes('/schema/') ||
    normalized.includes('/repositories/') ||
    normalized.includes('/repository/') ||
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

  // 5. Config / Setup / Infrastructure / Middlewares / Security
  if (
    normalized.includes('/config/') ||
    normalized.includes('/configs/') ||
    normalized.includes('/middlewares/') ||
    normalized.includes('/middleware/') ||
    normalized.includes('/security/') ||
    normalized.includes('/infra/') ||
    normalized.includes('/infrastructure/') ||
    basename.includes('config.') ||
    basename.includes('setup.') ||
    basename.includes('middleware.') ||
    basename.includes('security.') ||
    basename.endsWith('.env') ||
    basename.endsWith('.config.js') ||
    basename.endsWith('.config.ts')
  ) {
    return 'config';
  }

  // 6. Utilities / Helpers / Exceptions
  if (
    normalized.includes('/utils/') ||
    normalized.includes('/util/') ||
    normalized.includes('/helpers/') ||
    normalized.includes('/lib/') ||
    normalized.includes('/common/') ||
    normalized.includes('/shared/') ||
    normalized.includes('/exceptions/') ||
    normalized.includes('/exception/') ||
    basename.includes('util.') ||
    basename.includes('helper.') ||
    basename.includes('common.')
  ) {
    return 'util';
  }

  return 'other';
}
