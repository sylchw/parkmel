import {COVERAGE_REGIONS} from "./coverage";
// Curated local shopping/station hubs; station anchors checked against the dated OSM extract.
const centres:Record<string,[number,number]>={
 carnegie:[145.05914649,-37.88646460],chadstone:[145.08332580,-37.88609497],bentleigh:[145.0369346,-37.9175354],brighton:[144.9966,-37.9151],malvern:[145.0290,-37.8567],oakleigh:[145.0913,-37.8985],clayton:[145.12061666,-37.92457207],springvale:[145.15364464,-37.94945922],mulgrave:[145.1890,-37.9358],"clayton-south":[145.1202,-37.9275],moorabbin:[145.0367,-37.9344],hampton:[145.0014764,-37.9381127],"st-kilda":[144.9801,-37.8689],"glen-waverley":[145.1640,-37.8807],"malvern-east":[145.0601,-37.8760],"oakleigh-south":[145.0926,-37.9254],hawthorn:[145.0363494,-37.8213782]
};
export function townCentre(id:string):[number,number]{const point=centres[id];if(!point||!COVERAGE_REGIONS.some(region=>region.id===id))throw new RangeError("Unknown suburb");return [...point];}
export function previewBounds(id:string){const [longitude,latitude]=townCentre(id);return {west:longitude-.0045,south:latitude-.0035,east:longitude+.0045,north:latitude+.0035};}
export function clampGuestCentre(point:[number,number],centre:[number,number]):[number,number]{return [Math.max(centre[0]-.0009,Math.min(centre[0]+.0009,point[0])),Math.max(centre[1]-.0007,Math.min(centre[1]+.0007,point[1]))];}
