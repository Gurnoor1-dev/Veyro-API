import "server-only";
const AUTH_URL="https://api.infiniteflight.com/auth/v2/connect/token";
const API_BASE="https://api.infiniteflight.com/public/v3";
const TTL=5*60_000, OUTPUT_PAGE_SIZE=40, FALLBACK_UPSTREAM_PAGE_SIZE=10;
type IFPage={pageIndex?:number;totalPages?:number;totalCount?:number;hasPreviousPage?:boolean;hasNextPage?:boolean;data?:Record<string,unknown>[];items?:Record<string,unknown>[]};
type Entry<T>={value:T;expiresAt:number};
const cache=new Map<string,Entry<unknown>>();
const pending=new Map<string,Promise<unknown>>();
let token:string|null=null,tokenExpiresAt=0,tokenRequest:Promise<string>|null=null;
export class IFAPIError extends Error{
 constructor(message:string,public status=502,public code="IF_API_ERROR",public retryAfter?:string){super(message);}
}
async function getToken(){
 if(token&&Date.now()<tokenExpiresAt-90_000)return token;
 if(tokenRequest)return tokenRequest;
 const clientId=process.env.IF_OAUTH_CLIENT_ID,clientSecret=process.env.IF_OAUTH_CLIENT_SECRET;
 if(!clientId||!clientSecret)throw new IFAPIError("Infinite Flight OAuth credentials are missing from Vercel.",503,"IF_CREDENTIALS_MISSING");
 tokenRequest=(async()=>{
  const res=await fetch(AUTH_URL,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"client_credentials",client_id:clientId,client_secret:clientSecret}),cache:"no-store",signal:AbortSignal.timeout(15000)});
  const body=await res.json().catch(()=>({})) as {access_token?:string;expires_in?:number;error?:string;error_description?:string};
  if(!res.ok||!body.access_token){
   const denied=body.error==="unauthorized_client"||res.status===400;
   throw new IFAPIError(denied?"The Infinite Flight OAuth client must be Confidential, have server-to-server access enabled, and be approved by Infinite Flight.":body.error_description||body.error||"Infinite Flight token request failed.",503,denied?"IF_S2S_NOT_APPROVED":"IF_TOKEN_FAILED");
  }
  token=body.access_token;tokenExpiresAt=Date.now()+Math.max(60,Number(body.expires_in||1800))*1000;return token;
 })().finally(()=>{tokenRequest=null;});
 return tokenRequest;
}
async function cached<T>(key:string,fetcher:()=>Promise<T>):Promise<T>{
 const entry=cache.get(key) as Entry<T>|undefined;
 if(entry&&Date.now()<entry.expiresAt)return entry.value;
 if(entry)cache.delete(key);
 const active=pending.get(key) as Promise<T>|undefined;if(active)return active;
 const job=fetcher().then(value=>{cache.set(key,{value,expiresAt:Date.now()+TTL});if(cache.size>1000){const first=cache.keys().next().value;if(first)cache.delete(first);}return value;}).finally(()=>pending.delete(key));
 pending.set(key,job);return job;
}
async function getIF<T>(path:string):Promise<T>{
 const bearer=await getToken();
 const res=await fetch(API_BASE+path,{headers:{Authorization:"Bearer "+bearer},cache:"no-store",signal:AbortSignal.timeout(20000)});
 const body=await res.json().catch(()=>({})) as {errorCode?:number;result?:T;message?:string};
 if(res.status===429)throw new IFAPIError("Infinite Flight rate limit reached. Retry after the indicated interval.",429,"IF_RATE_LIMITED",res.headers.get("retry-after")||"300");
 if(!res.ok)throw new IFAPIError("Infinite Flight returned HTTP "+res.status+".",502,"IF_UPSTREAM_ERROR");
 if(typeof body.errorCode==="number"&&body.errorCode!==0){
  const messages:Record<number,string>={1:"Infinite Flight user was not found.",2:"Infinite Flight rejected the request parameters.",3:"Infinite Flight could not complete the request.",4:"The Infinite Flight client is not authorised.",6:"The requested flight was not found for this pilot."};
  throw new IFAPIError(messages[body.errorCode]||"Infinite Flight error "+body.errorCode+".",body.errorCode===1||body.errorCode===6?404:502,"IF_ERROR_"+body.errorCode);
 }
 return (body.result??body) as T;
}
async function getPage(userId:string,page:number){
 return cached("if-user-flights:"+userId+":"+page,()=>getIF<IFPage>("/users/"+encodeURIComponent(userId)+"/flights?page="+page));
}
export async function getPilotFlights(userId:string,page:number){
 // IF v3 exposes a page parameter, not a page-size parameter. Aggregate native pages into 40-flight Veyro pages.
 const first=await getPage(userId,1),firstRows=first.data??first.items??[];
 const upstreamSize=firstRows.length||FALLBACK_UPSTREAM_PAGE_SIZE;
 const totalCount=Number(first.totalCount||0),upstreamTotal=Number(first.totalPages||Math.ceil(totalCount/upstreamSize));
 const totalPages=Math.ceil(totalCount/OUTPUT_PAGE_SIZE);
 if(page>totalPages)return {page,pageSize:OUTPUT_PAGE_SIZE,totalCount,totalPages,hasPreviousPage:page>1,hasNextPage:false,flights:[]};
 const offset=(page-1)*OUTPUT_PAGE_SIZE;
 const firstSourcePage=Math.floor(offset/upstreamSize)+1,offsetWithin=offset%upstreamSize;
 const count=Math.ceil((offsetWithin+OUTPUT_PAGE_SIZE)/upstreamSize);
 const pageNumbers=Array.from({length:count},(_,i)=>firstSourcePage+i).filter(n=>n<=upstreamTotal);
 const nativePages=await Promise.all(pageNumbers.map(n=>n===1?Promise.resolve(first):getPage(userId,n)));
 const rows=nativePages.flatMap(p=>p.data??p.items??[]);
 return {page,pageSize:OUTPUT_PAGE_SIZE,totalCount,totalPages,hasPreviousPage:page>1,hasNextPage:page<totalPages,flights:rows.slice(offsetWithin,offsetWithin+OUTPUT_PAGE_SIZE)};
}
export async function getPilotFlight(userId:string,flightId:string){
 return cached("if-user-flight:"+userId+":"+flightId,()=>getIF<Record<string,unknown>>("/users/"+encodeURIComponent(userId)+"/flights/"+encodeURIComponent(flightId)));
}
