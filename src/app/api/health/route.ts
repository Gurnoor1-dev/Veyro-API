import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getControlDatabase } from "@/lib/db";
export const runtime="nodejs";
export async function GET(){try{await getControlDatabase().execute(sql`select 1`);return NextResponse.json({status:"ok",service:"veyro-api",database:"connected"},{headers:{"Cache-Control":"no-store"}});}catch{return NextResponse.json({status:"error",service:"veyro-api",database:"unavailable"},{status:503,headers:{"Cache-Control":"no-store"}});}}