import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { Pool, QueryResult, QueryResultRow } from "pg";
import { join } from "node:path";

@Injectable()
export class PgService implements OnModuleInit, OnModuleDestroy {
  private pool!: Pool;

  async onModuleInit() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });

    const schemaPath = join(__dirname, "..", "sql", "schema.sql");
    const sql = readFileSync(schemaPath, "utf-8");

    await this.pool.query(sql);
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }

  query<T extends QueryResultRow = any>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params as any[]);
  }
}
