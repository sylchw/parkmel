/** External coordinate hyperlink only; no imagery retrieval or SDK. */
export function streetViewUrl(longitude:number,latitude:number):string {
 if(!Number.isFinite(longitude)||!Number.isFinite(latitude)||Math.abs(longitude)>180||Math.abs(latitude)>90) throw new RangeError("Invalid Street View coordinates");
 const url=new URL("https://www.google.com/maps/@");
 url.searchParams.set("api","1");url.searchParams.set("map_action","pano");
 url.searchParams.set("viewpoint",`${latitude},${longitude}`);
 return url.href;
}
