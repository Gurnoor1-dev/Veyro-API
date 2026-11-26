import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
function matches(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export function isAuthorised(req:NextRequest,admin=false){
 const expected=admin?process.env.VEYRO_ADMIN_KEY:process.env.VEYRO_API_KEY;
 const auth=req.headers.get("authorization");
 const provided=admin?(req.headers.get("x-veyro-admin-key")||"").trim():auth?.toLowerCase().startsWith("bearer ")?auth.slice(7).trim():(req.headers.get("x-api-key")||"").trim();
 return Boolean(expected&&provided&&matches(provided,expected));
}