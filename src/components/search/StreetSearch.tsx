"use client";
import {useEffect,useRef,useState} from "react";
import {searchStreets} from "../../lib/map/street-index";
import type {StreetSide} from "../../lib/map/street-index";
import {houseNumber} from "../../lib/map/address-search";
import type {AddressResult} from "../../lib/map/address-search";
export default function StreetSearch({streets,onSelect,areaName="Carnegie"}:{streets:readonly StreetSide[];areaName?:string;onSelect:(center:[number,number])=>void}) {
 const [query,setQuery]=useState(""),[addresses,setAddresses]=useState<AddressResult[]>([]),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 const request=useRef<AbortController|null>(null),cache=useRef(new Map<string,AddressResult[]>());
 useEffect(()=>()=>request.current?.abort(),[]);
 const numbered=!!houseNumber(query),matches=numbered?[]:searchStreets(streets,query);
 function change(value:string){request.current?.abort();request.current=null;setBusy(false);setQuery(value);setAddresses([]);setMessage("");}
 function choose(center:[number,number]){onSelect(center);change("");}
 async function search(){
  if(!numbered||busy)return;
  request.current?.abort();const abort=new AbortController();request.current=abort;setBusy(true);setMessage("Finding address…");setAddresses([]);
  const timeout=setTimeout(()=>abort.abort(),10000);
  try {
   const key=query.trim().toLowerCase();let results=cache.current.get(key);
   if(!results){const response=await fetch(`/api/search/address?q=${encodeURIComponent(query)}`,{signal:abort.signal,referrerPolicy:"no-referrer"});if(!response.ok)throw new Error();const payload=await response.json();if(!Array.isArray(payload.results))throw new Error();results=payload.results as AddressResult[];if(cache.current.size>=50)cache.current.clear();cache.current.set(key,results);}
   if(request.current!==abort||abort.signal.aborted)return;
   setAddresses(results);setMessage(results.length?"":"No matching street number found. Try adding the suburb, or search the road name.");
  }catch{if(request.current===abort)setMessage("Address search is unavailable. Try again, or search the road name.");}
  finally{clearTimeout(timeout);if(request.current===abort)setBusy(false);}
 }
 return <div className="street-search">
  <form onSubmit={event=>{event.preventDefault();void search();}}>
   <label>Search streets<input type="search" placeholder="Street name, or street number and road name" maxLength={100} value={query} onChange={event=>change(event.target.value)}/></label>
   {numbered&&<button type="submit" disabled={busy}>{busy?"Searching…":"Search address"}</button>}
  </form>
  {query.trim()&&<div className="street-search-results" aria-label="Street search results">
   {matches.map(street=><button key={street.name} type="button" onClick={()=>choose(street.center)}>{street.name}</button>)}
   {addresses.map(address=><button key={address.label+address.center.join(",")} type="button" onClick={()=>choose(address.center)}>{address.label}</button>)}
   {message&&<p role="status">{message}</p>}
   {!numbered&&!matches.length&&<p>No matching {areaName} streets.</p>}
   {numbered&&<p className="address-search-credit">Address search: <a href="https://github.com/komoot/photon" target="_blank" rel="noopener noreferrer">Photon</a> / <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>. Parking coverage depends on the selected suburb.</p>}
  </div>}
 </div>;
}
