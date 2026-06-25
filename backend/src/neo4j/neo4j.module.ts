import {
  Global,
  Module,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  Logger,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import neo4j, { type Driver } from 'neo4j-driver';
import { Neo4jService, NEO4J_DRIVER, NEO4J_DATABASE } from './neo4j.service';
import { CONSTRAINTS } from './constraints';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: NEO4J_DRIVER,
      inject: [ConfigService],
      useFactory: async (config: ConfigService): Promise<Driver> => {
        const uri = config.getOrThrow<string>('NEO4J_URI');
        const user = config.getOrThrow<string>('NEO4J_USERNAME');
        const password = config.getOrThrow<string>('NEO4J_PASSWORD');
        const driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
          disableLosslessIntegers: true,
        });
        await driver.verifyConnectivity();
        Logger.log(`Connected to Neo4j at ${uri}`, 'Neo4j');
        return driver;
      },
    },
    {
      provide: NEO4J_DATABASE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.get<string>('NEO4J_DATABASE') ?? 'neo4j',
    },
    Neo4jService,
  ],
  exports: [Neo4jService, NEO4J_DRIVER, NEO4J_DATABASE],
})
export class Neo4jModule
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(Neo4jModule.name);
  constructor(private readonly neo4j: Neo4jService) {}

  async onApplicationBootstrap() {
    for (const stmt of CONSTRAINTS) {
      await this.neo4j.write(stmt);
    }
    this.logger.log(`Applied ${CONSTRAINTS.length} Neo4j constraints`);
  }

  async onApplicationShutdown() {
    await this.neo4j.close();
  }
}
