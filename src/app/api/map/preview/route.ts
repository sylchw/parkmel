import {consumeReadQuota,guestQuotaSubject,quotaMessage} from "../../../../lib/server/read-quota";
import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";
import {townPreview} from "../../../../lib/server/town-preview";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
 const region=request.nextUrl.searchParams.get("region")??"carnegie";
 if([...request.nextUrl.searchParams.keys()].some(key=>key!=="region"))return NextResponse.json({error:"Town-centre previews do not accept location or stay filters"},{status:400});
 try{const budget=await consumeReadQuota(guestQuotaSubject(request.headers),"preview");if(!budget.allowed)return NextResponse.json({error:quotaMessage("preview browsing",budget)},{status:429,headers:{"Retry-After":String(budget.retryAfter),"Cache-Control":"no-store"}});return NextResponse.json(await townPreview(region),{headers:{"Cache-Control":"private, no-store","Vary":"Cookie"}});}
 catch(error){return NextResponse.json({error:error instanceof RangeError?"Unknown suburb":"Town-centre preview is temporarily unavailable"},{status:error instanceof RangeError?400:503,headers:{"Cache-Control":"no-store"}});}
}
