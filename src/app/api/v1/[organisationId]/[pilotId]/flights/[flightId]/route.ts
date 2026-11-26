import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { appUsers } from "@/lib/db/schema";
import { isAuthorised } from "@/lib/auth";
import { apiError,apiSuccess } from "@/lib/http";
import { findOrganisation } from "@/lib/tenant";
import { getPilotFlight,IFAPIError } from "@/lib/if-api";
export const runtime="nodejs";
type Context={params:Promise<{organisationId:string;pilotId:string;flightId:string}>};
export async function GET(request:NextRequest,context:Context){
 if(!isAuthorised(request))return apiError("A valid Veyro API key is required.",401,"UNAUTHORISED");
 const {organisationId,pilotId,flightId}=await context.params,tenant=await findOrganisation(organisationId);
 if(!tenant)return apiError("Organisation was not found or is inactive.",404,"ORGANISATION_NOT_FOUND");
 try{
  const [pilot]=await tenant.database.select({id:appUsers.ifcUserId}).from(appUsers).where(eq(appUsers.ifcUserId,pilotId)).limit(1);
  if(!pilot)return apiError("Pilot was not found in this organisation.",404,"PILOT_NOT_FOUND");
  const flight=await getPilotFlight(pilot.id,flightId);
  return apiSuccess({organisationId,pilotId,flight},200,"private, max-age=300");
 }catch(error){
  if(error instanceof IFAPIError)return apiError(error.message,error.status,error.code,error.retryAfter?{retryAfter:error.retryAfter}:undefined);
  console.error("pilot flight detail failed",error);return apiError("Unable to retrieve this Infinite Flight flight.",502,"FLIGHT_UNAVAILABLE");
 }
}