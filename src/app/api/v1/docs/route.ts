import { NextResponse } from "next/server";
export function GET(){return NextResponse.json({
 openapi:"3.1.0",info:{title:"Veyro API",version:"1.0.0"},
 servers:[{url:"https://veyro-api.vercel.app/api/v1"}],
 security:[{VeyroApiKey:[]}],
 components:{securitySchemes:{VeyroApiKey:{type:"apiKey",in:"header",name:"x-api-key"}}},
 paths:{
  "/list-organisations":{get:{summary:"List registered organisations",responses:{"200":{description:"Organisation list"}}}},
  "/{organisationId}/list-pilots":{get:{summary:"List an organisation's pilots",parameters:[{name:"organisationId",in:"path",required:true,schema:{type:"string"}}],responses:{"200":{description:"Pilot list"}}}},
  "/{organisationId}/{pilotId}/flights":{get:{summary:"List 40 completed flights per page",parameters:[{name:"organisationId",in:"path",required:true,schema:{type:"string"}},{name:"pilotId",in:"path",required:true,schema:{type:"string"}},{name:"page",in:"query",schema:{type:"integer",minimum:1,default:1}}],responses:{"200":{description:"Paginated Infinite Flight logbook"}}}},
  "/{organisationId}/{pilotId}/flights/{flightId}":{get:{summary:"Get one completed flight",parameters:[{name:"organisationId",in:"path",required:true,schema:{type:"string"}},{name:"pilotId",in:"path",required:true,schema:{type:"string"}},{name:"flightId",in:"path",required:true,schema:{type:"string"}}],responses:{"200":{description:"Infinite Flight logbook entry"}}}}
 }
},{headers:{"Cache-Control":"no-store"}});}