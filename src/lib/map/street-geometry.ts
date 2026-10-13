/** Slice by distance, not vertex count; bounds are fractions from the start junction. */
export function sliceStreetLine(points:readonly number[][],start:number,end:number):number[][] {
 if(points.length<2||!Number.isFinite(start)||!Number.isFinite(end)||start<0||end>1||end<=start)throw new Error("Invalid street extent");
 const lengths=points.slice(1).map((point,i)=>Math.hypot((point[0]-points[i][0])*Math.cos((point[1]+points[i][1])*Math.PI/360),point[1]-points[i][1]));
 const total=lengths.reduce((a,b)=>a+b,0);if(!total)throw new Error("Zero length street");
 const from=start*total,to=end*total,result:number[][]=[];let distance=0;
 for(let i=0;i<lengths.length;i++){const length=lengths[i],next=distance+length;if(length&&next>from&&distance<to){const a=Math.max(0,(from-distance)/length),b=Math.min(1,(to-distance)/length);const point=(fraction:number)=>points[i].map((value,j)=>value+(points[i+1][j]-value)*fraction);if(!result.length)result.push(point(a));result.push(point(b));}distance=next;}
 return result;
}
