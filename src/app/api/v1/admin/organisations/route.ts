import { NextRequest } from "next/server";
import { createCipheriv,randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { apiOrganisations } from "@/lib/db/schema";
import { getControlDatabase } from "@/lib/db";
import { isAuthorised } from "@/lib/auth";
import { apiError,apiSuccess } from "@/lib/http";
export const runtime="nodejs";
function encryptUrl(value:string){
 const key=process.env.TENANT_DB_ENCRYPTION_KEY;
 if(!key||!/^[0-9a-f]{64}$/i.test(key))throw new Error("TENANT_DB_ENCRYPTION_KEY is not configured.");
 const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",Buffer.from(key,"hex"),iv);
 const ciphertext=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);
 return [iv.toString("base64url"),cipher.getAuthTag().toString("base64url"),ciphertext.toString("base64url")].join(".");
}
function validNeonUrl(value:string){
 try{const u=new URL(value);return (u.protocol==="postgres:"||u.protocol==="postgresql:")&&u.hostname.endsWith(".neon.tech");}catch{return false;}
}
async function save(request:NextRequest){
 if(!isAuthorised(request,true))return apiError("A valid Veyro administrator key is required.",401,"ADMIN_UNAUTHORISED");
 let body:{organisationId?:string;organisationName?:string;databaseUrl?:string;fleetNumber?:number|null};
 try{body=await request.json();}catch{return apiError("Request body must be valid JSON.",400,"INVALID_JSON");}
 const id=body.organisationId?.trim()||"",name=body.organisationName?.trim()||"";
 if(!/^[A-Za-z0-9-]{3,80}$/.test(id))return apiError("organisationId must contain 3–80 letters, numbers or hyphens.",400,"INVALID_ORGANISATION_ID");
 if(name.length<2||name.length>120)return apiError("organisationName must contain 2–120 characters.",400,"INVALID_ORGANISATION_NAME");
 if(body.databaseUrl&&!validNeonUrl(body.databaseUrl))return apiError("databaseUrl must be a PostgreSQL connection URL hosted by Neon.",400,"INVALID_DATABASE_URL");
 if(body.fleetNumber!==undefined&&body.fleetNumber!==null&&(!Number.isInteger(body.fleetNumber)||body.fleetNumber<0))return apiError("fleetNumber must be a non-negative integer or null.",400,"INVALID_FLEET_NUMBER");
 const db=getControlDatabase(),[existing]=await db.select().from(apiOrganisations).where(eq(apiOrganisations.id,id)).limit(1);
 if(!existing&&!body.databaseUrl)return apiError("A databaseUrl is required when registering a new organisation.",400,"DATABASE_URL_REQUIRED");
 const encrypted=body.databaseUrl?encryptUrl(body.databaseUrl):existing?.databaseUrlEncrypted??null;
 const fleet=body.fleetNumber===undefined?existing?.fleetCount??null:body.fleetNumber;
 const [saved]=await db.insert(apiOrganisations).values({id,name,databaseUrlEncrypted:encrypted,fleetCount:fleet,isActive:true,updatedAt:new Date()}).onConflictDoUpdate({
  target:apiOrganisations.id,set:{name,databaseUrlEncrypted:encrypted,fleetCount:fleet,isActive:true,updatedAt:new Date()}
 }).returning({organisationId:apiOrganisations.id,organisationName:apiOrganisations.name,organisationFleetNumber:apiOrganisations.fleetCount,isActive:apiOrganisations.isActive});
 return apiSuccess({organisation:saved});
}
export async function POST(request:NextRequest){try{return await save(request);}catch(error){console.error("organisation registration failed",error);return apiError("Unable to register organisation.",500,"REGISTRATION_FAILED");}}
export async function PUT(request:NextRequest){try{return await save(request);}catch(error){console.error("organisation update failed",error);return apiError("Unable to update organisation.",500,"UPDATE_FAILED");}}
