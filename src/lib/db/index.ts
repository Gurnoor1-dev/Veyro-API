import "server-only";
import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
type Database = ReturnType<typeof drizzle>;
let controlDatabase:Database|null=null;
const tenantDatabases=new Map<string,Database>();
export function getControlDatabase():Database {
 const url=process.env.DATABASE_URL;if(!url)throw new Error("DATABASE_URL is not configured.");
 if(!controlDatabase)controlDatabase=drizzle(neon(url),{schema});return controlDatabase;
}
export function getTenantDatabase(id:string,connectionString?:string|null):Database {
 if(!connectionString)return getControlDatabase();
 const cacheKey=id+":"+createHash("sha256").update(connectionString).digest("hex");
 const existing=tenantDatabases.get(cacheKey);if(existing)return existing;
 const db=drizzle(neon(connectionString),{schema});tenantDatabases.set(cacheKey,db);
 if(tenantDatabases.size>100){const first=tenantDatabases.keys().next().value;if(first)tenantDatabases.delete(first);}
 return db;
}