import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { appUsers } from "@/lib/db/schema";
import { isAuthorised } from "@/lib/auth";
import { apiError,apiSuccess,parsePage } from "@/lib/http";
import { findOrganisation } from "@/lib/tenant";
import { getPilotFlights,IFAPIError } from "@/lib/if-api";
export const runtime="nodejs";
type Context={params:Promise<{organisationId:string;pilotId:string}>};
export async function GET(request:NextRequest,context:Context){
 if(!isAuthorised(request))return apiError("A valid Veyro API key is required.",401,"UNAUTHORISED");
 const {organisationId,pilotId}=await context.params,page=parsePage(request.nextUrl.searchParams.get("page"));
 if(page===null)return apiError("page must be a positive integer.",400,"INVALID_PAGE");
 const tenant=await findOrganisation(organisationId);
 if(!tenant)return apiError("Organisation was not found or is inactive.",404,"ORGANISATION_NOT_FOUND");
 try{
  const [pilot]=await tenant.database.select({id:appUsers.ifcUserId}).from(appUsers).where(eq(appUsers.ifcUserId,pilotId)).limit(1);
  if(!pilot)return apiError("Pilot was not found in this organisation.",404,"PILOT_NOT_FOUND");
  const result=await getPilotFlights(pilot.id,page);
  return apiSuccess({organisationId,pilotId,...result},200,"private, max-age=300");
 }catch(error){
  if(error instanceof IFAPIError)return apiError(error.message,error.status,error.code,error.retryAfter?{retryAfter:error.retryAfter}:undefined);
  console.error("pilot flights failed",error);return apiError("Unable to retrieve this pilot's Infinite Flight logbook.",502,"FLIGHTS_UNAVAILABLE");
 }
}