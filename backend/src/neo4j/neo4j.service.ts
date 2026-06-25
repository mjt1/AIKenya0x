import { Inject, Injectable } from '@nestjs/common';
import { Driver, Record as Neo4jRecord } from 'neo4j-driver';

export type Params = Record<string, unknown>;

export const NEO4J_DRIVER = 'NEO4J_DRIVER';
export const NEO4J_DATABASE = 'NEO4J_DATABASE';
@Injectable()
export class Neo4jService {
  constructor(
    @Inject(NEO4J_DRIVER) private readonly driver: Driver,
    @Inject(NEO4J_DATABASE) private readonly database: string,
  ) {}

  async read(cypher: string, params: Params = {}): Promise<Neo4jRecord[]> {
    const session = this.driver.session({ database: this.database });
    try {
      const result = await session.executeRead((tx) => tx.run(cypher, params));
      return result.records;
    } finally {
      await session.close();
    }
  }

  async write(cypher: string, params: Params = {}): Promise<Neo4jRecord[]> {
    const session = this.driver.session({ database: this.database });
    try {
      const result = await session.executeWrite((tx) => tx.run(cypher, params));
      return result.records;
    } finally {
      await session.close();
    }
  }

  async close(): Promise<void> {
    await this.driver.close();
  }
}
