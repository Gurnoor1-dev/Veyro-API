import "server-only";
import { createDecipheriv } from "node:crypto";
import { eq } from "drizzle-orm";
import { apiOrganisations } from "@/lib/db/schema";
import { getControlDatabase,getTenantDatabase } from "@/lib/db";
function decryptUrl(value:string){
 const hex=process.env.TENANT_DB_ENCRYPTION_KEY;
 if(!hex||!/^[0-9a-f]{64}$/i.test(hex))throw new Error("TENANT_DB_ENCRYPTION_KEY must be a 32-byte hex key.");
 const [iv,tag,data]=value.split(".");if(!iv||!tag||!data)throw new Error("Tenant DB credential is malformed.");
 const decipher=createDecipheriv("aes-256-gcm",Buffer.from(hex,"hex"),Buffer.from(iv,"base64url"));
 decipher.setAuthTag(Buffer.from(tag,"base64url"));
 return Buffer.concat([decipher.update(Buffer.from(data,"base64url")),decipher.final()]).toString("utf8");
}
export async function findOrganisation(id:string){
 const [record]=await getControlDatabase().select().from(apiOrganisations).where(eq(apiOrganisations.id,id)).limit(1);
 if(!record||!record.isActive)return null;
 const url=record.databaseUrlEncrypted?decryptUrl(record.databaseUrlEncrypted):null;
 return {record,database:getTenantDatabase(record.id,url)};
}
export function listOrganisations(){return getControlDatabase().select().from(apiOrganisations).where(eq(apiOrganisations.isActive,true));}
