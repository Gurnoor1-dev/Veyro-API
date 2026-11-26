import { NextRequest } from "next/server";
import { asc } from "drizzle-orm";
import { appUsers } from "@/lib/db/schema";
import { isAuthorised } from "@/lib/auth";
import { apiError,apiSuccess } from "@/lib/http";
import { findOrganisation } from "@/lib/tenant";
export const runtime="nodejs";
type Context={params:Promise<{organisationId:string}>};
export async function GET(request:NextRequest,context:Context){
 if(!isAuthorised(request))return apiError("A valid Veyro API key is required.",401,"UNAUTHORISED");
 const {organisationId}=await context.params,tenant=await findOrganisation(organisationId);
 if(!tenant)return apiError("Organisation was not found or is inactive.",404,"ORGANISATION_NOT_FOUND");
 try{
  const rows=await tenant.database.select().from(appUsers).orderBy(asc(appUsers.ifcUsername),asc(appUsers.ifcUserId));
  return apiSuccess({organisationId,pilots:rows.map(p=>({pilotId:p.ifcUserId,pilotIfcUname:p.ifcUsername,pilotDiscordUid:p.discordUserId,pilotDiscordUname:p.discordUsername}))});
 }catch(error){console.error("list-pilots failed",error);return apiError("This organisation database does not expose the required public.app_users pilot table.",503,"TENANT_SCHEMA_MISMATCH");}
}