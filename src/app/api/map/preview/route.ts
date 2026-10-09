import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";
import {townPreview} from "../../../../lib/server/town-preview";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
 const region=request.nextUrl.searchParams.get("region")??"carnegie";
 if([...request.nextUrl.searchParams.keys()].some(key=>key!=="region"))return NextResponse.json({error:"Town-centre previews do not accept location or stay filters"},{status:400});
 try{return NextResponse.json(await townPreview(region),{headers:{"Cache-Control":"public, max-age=30, s-maxage=60"}});}
 catch(error){return NextResponse.json({error:error instanceof RangeError?"Unknown suburb":"Town-centre preview is temporarily unavailable"},{status:error instanceof RangeError?400:503,headers:{"Cache-Control":"no-store"}});}
}
