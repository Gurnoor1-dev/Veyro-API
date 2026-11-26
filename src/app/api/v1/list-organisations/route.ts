import { NextRequest } from "next/server";
import { count } from "drizzle-orm";
import { appUsers } from "@/lib/db/schema";
import { isAuthorised } from "@/lib/auth";
import { apiError,apiSuccess } from "@/lib/http";
import { findOrganisation,listOrganisations } from "@/lib/tenant";
export const runtime="nodejs";
export async function GET(request:NextRequest){
 if(!isAuthorised(request))return apiError("A valid Veyro API key is required.",401,"UNAUTHORISED");
 try{
  const records=await listOrganisations();
  const organisations=await Promise.all(records.map(async record=>{
   const tenant=await findOrganisation(record.id);if(!tenant)return null;
   const [row]=await tenant.database.select({value:count()}).from(appUsers);
   return {organisationName:record.name,organisationId:record.id,organisationPilotsNumber:Number(row?.value||0),organisationFleetNumber:record.fleetCount};
  }));
  return apiSuccess({organisations:organisations.filter(Boolean)});
 }catch(error){console.error("list-organisations failed",error);return apiError("Unable to read the organisation registry or a tenant database.",503,"DATABASE_UNAVAILABLE");}
}