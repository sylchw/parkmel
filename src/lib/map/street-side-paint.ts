import type {ExpressionSpecification} from "maplibre-gl";
/** Screen spacing grows with zoom; both sides and all rule overlays stay aligned. */
export const STREET_SIDE_OFFSET:ExpressionSpecification=["interpolate",["exponential",2],["zoom"],
 14,["match",["get","side"],"left",-2,2],
 16,["match",["get","side"],"left",-6,6],
 18,["match",["get","side"],"left",-22,22],
 20,["match",["get","side"],"left",-64,64],
 22,["match",["get","side"],"left",-96,96]];
export function streetSideWidth(normal:number):ExpressionSpecification{return ["interpolate",["linear"],["zoom"],14,normal*.65,16,normal,18,normal*1.5,20,normal*2,22,normal*2.5];}
