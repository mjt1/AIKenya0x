import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { RepositoryModule } from '../repository/repository.module';
import { AgentsModule } from '../agents/agents.module';
import { CooperativesModule } from '../cooperatives/cooperatives.module';
import { CreateAdminCommand } from './create-admin.command';

/**
 * Minimal module tree for the `cli.ts` entrypoint — Neo4j + repositories +
 * agents/cooperatives only, no HTTP / guards. Register new CommandRunner
 * classes in `providers`.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    Neo4jModule,
    RepositoryModule,
    AgentsModule,
    CooperativesModule,
  ],
  providers: [CreateAdminCommand],
})
export class CliModule {}
