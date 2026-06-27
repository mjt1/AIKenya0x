import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { RepositoryModule } from '../repository/repository.module';
import { AgentsModule } from '../agents/agents.module';
import { AiClientModule } from '../ai-client/ai-client.module';
import { CreateAdminCommand } from './create-admin.command';
import { SeedCommand } from './seed.command';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    Neo4jModule,
    RepositoryModule,
    AgentsModule,
    AiClientModule,
  ],
  providers: [CreateAdminCommand, SeedCommand],
})
export class CliModule {}
