/** North-up screen coordinates for a tile-free preview of the registered street side. */
export function reviewOutline(points:readonly number[][],side:"left"|"right"){
 if(points.length<2||points.some(p=>p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1])))throw new Error("Invalid review geometry");
 const latitude=points.reduce((sum,p)=>sum+p[1],0)/points.length,cos=Math.cos(latitude*Math.PI/180);
 const projected=points.map(p=>[p[0]*cos,-p[1]]);
 const xs=projected.map(p=>p[0]),ys=projected.map(p=>p[1]);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const scale=Math.min(300/Math.max(maxX-minX,1e-9),140/Math.max(maxY-minY,1e-9));
 const centre=projected.map(p=>[190+(p[0]-(minX+maxX)/2)*scale,110+(p[1]-(minY+maxY)/2)*scale]);
 const edge=centre.map((p,i)=>{const before=centre[Math.max(0,i-1)],after=centre[Math.min(centre.length-1,i+1)],dx=after[0]-before[0],dy=after[1]-before[1],length=Math.hypot(dx,dy)||1,offset=side==="left"?8:-8;return [p[0]+dy/length*offset,p[1]-dx/length*offset];});
 return {centre,edge};
}
