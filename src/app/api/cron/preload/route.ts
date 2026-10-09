import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";
import {timingSafeEqual} from "node:crypto";
import {COVERAGE_REGIONS} from "../../../../lib/map/coverage";
import {townPreview} from "../../../../lib/server/town-preview";
export const dynamic="force-dynamic";
export const maxDuration=60;
export async function GET(request:NextRequest){
 const secret=process.env.CRON_SECRET;
 if(!secret)return NextResponse.json({error:"Preloading is not configured"},{status:503});
 const expected=Buffer.from(`Bearer ${secret}`),actual=Buffer.from(request.headers.get("authorization")??"");
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return NextResponse.json({error:"Unauthorized"},{status:401});
 const result=await Promise.allSettled(COVERAGE_REGIONS.map(region=>townPreview(region.id)));
 const failed=result.filter(item=>item.status==="rejected").length;
 return NextResponse.json({loaded:result.length-failed,failed},{status:failed?503:200,headers:{"Cache-Control":"no-store"}});
}
