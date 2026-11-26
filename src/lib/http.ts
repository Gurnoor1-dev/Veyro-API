import { NextResponse } from "next/server";
export function apiError(message:string,status=400,code="BAD_REQUEST",details?:unknown){
 return NextResponse.json({success:false,error:{code,message,...(details===undefined?{}:{details})}},{status,headers:{"Cache-Control":"no-store"}});
}
export function apiSuccess(data:unknown,status=200,cacheControl="no-store"){
 return NextResponse.json({success:true,data},{status,headers:{"Cache-Control":cacheControl}});
}
export function parsePage(value:string|null){if(value===null||value==="")return 1;const n=Number(value);return Number.isSafeInteger(n)&&n>=1&&n<=100000?n:null;}
