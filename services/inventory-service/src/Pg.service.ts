import { Injectable } from "@nestjs/common";
import { OnModuleInit } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { join } from "node:path";

@Injectable()
export class PgService implements OnModuleInit {
  private pool: Pool;

  async onModuleInit() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });

    const schemaPath = join(__dirname, "..", "sql", "schema.sql");
    const sql = readFileSync(schemaPath, "utf-8");
    
    await this.pool.query(sql);
  }
}
