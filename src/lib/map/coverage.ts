import manifest from '../../../public/coverage/manifest.json';
export interface CoverageRegion {id:string;name:string;center:[number,number];bounds:[number,number,number,number];geometry:{type:'MultiPolygon';coordinates:number[][][][]}|null;url:string;sides:number}
export const COVERAGE_REGIONS=manifest.suburbs as unknown as CoverageRegion[];
function ringContains(ring:number[][],point:[number,number]):boolean {
 const [x,y]=point;let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const [ax,ay]=ring[i],[bx,by]=ring[j];
  const cross=(x-ax)*(by-ay)-(y-ay)*(bx-ax);
  if(Math.abs(cross)<1e-10&&x>=Math.min(ax,bx)&&x<=Math.max(ax,bx)&&y>=Math.min(ay,by)&&y<=Math.max(ay,by))return true;
  if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
 }
 return inside;
}
export function regionContains(region:CoverageRegion,point:[number,number]):boolean {
 const [x,y]=point,[west,south,east,north]=region.bounds;
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<west||x>east||y<south||y>north)return false;
 return !region.geometry||region.geometry.coordinates.some(polygon=>ringContains(polygon[0],point)&&!polygon.slice(1).some(hole=>ringContains(hole,point)));
}
export function coverageAt(point:[number,number]):CoverageRegion|undefined {return COVERAGE_REGIONS.slice(1).find(region=>regionContains(region,point))??(regionContains(COVERAGE_REGIONS[0],point)?COVERAGE_REGIONS[0]:undefined);}
