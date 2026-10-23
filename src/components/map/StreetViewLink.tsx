import {streetViewUrl} from "../../lib/map/street-view-url";
export default function StreetViewLink({longitude,latitude}:{longitude:number;latitude:number}) {
 let href:string;
 try {href=streetViewUrl(longitude,latitude);} catch {return <p>Street View link unavailable: coordinates unknown.</p>;}
 return <div><a href={href} target="_blank" rel="noopener noreferrer">Open external Street View in a new tab</a>
  <p>Imagery may be old or unavailable. Check its date and current signs. Your selection and draft remain in this tab.</p></div>;
}
