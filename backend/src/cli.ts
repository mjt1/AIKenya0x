import { CommandFactory } from 'nest-commander';
import { CliModule } from './commands/cli.module';

/**
 * Standalone CLI entrypoint (no HTTP server). Run compiled:
 *   yarn build && node dist/cli create-admin -e admin@suluhu.io -p s3cret -n "Suluhu Admin"
 * Or in dev:
 *   yarn ts-node -r tsconfig-paths/register src/cli.ts create-admin -e ... -p ... -n "..."
 */
async function bootstrap() {
  await CommandFactory.run(CliModule, ['error', 'warn', 'log']);
}

void bootstrap();
