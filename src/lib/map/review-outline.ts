/** North-up Web Mercator preview aligned with the same street tiles as the interactive map. */
export function reviewOutline(points:readonly number[][],side:"left"|"right"){
 if(points.length<2||points.some(p=>p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1])))throw new Error("Invalid review geometry");
 const world=points.map(p=>[256*(p[0]+180)/360,256*(1-Math.asinh(Math.tan(p[1]*Math.PI/180))/Math.PI)/2]);
 const xs=world.map(p=>p[0]),ys=world.map(p=>p[1]);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const zoom=Math.max(0,Math.min(18,Math.floor(Math.log2(Math.min(280/Math.max(maxX-minX,1e-9),120/Math.max(maxY-minY,1e-9))))));
 const scale=2**zoom,origin=[(minX+maxX)/2*scale-190,(minY+maxY)/2*scale-110];
 const centre=world.map(p=>[p[0]*scale-origin[0],p[1]*scale-origin[1]]);
 const tiles=[];
 for(let x=Math.floor(origin[0]/256);x<=Math.floor((origin[0]+380)/256);x++)for(let y=Math.floor(origin[1]/256);y<=Math.floor((origin[1]+220)/256);y++){
  if(y<0||y>=2**zoom)continue;
  const wrappedX=((x%2**zoom)+2**zoom)%2**zoom;
  tiles.push({url:`https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`,x:x*256-origin[0],y:y*256-origin[1]});
 }
 const edge=centre.map((p,i)=>{const before=centre[Math.max(0,i-1)],after=centre[Math.min(centre.length-1,i+1)],dx=after[0]-before[0],dy=after[1]-before[1],length=Math.hypot(dx,dy)||1,offset=side==="left"?8:-8;return [p[0]+dy/length*offset,p[1]-dx/length*offset];});
 return {centre,edge,tiles,zoom};
}
