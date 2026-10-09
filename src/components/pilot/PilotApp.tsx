"use client";
import {PARKING_COLOURS,PARKING_LABELS,PAID_COLOUR,parkingDisplayLabel} from "../../lib/map/parking-display";
import {COVERAGE_REGIONS,coverageAt} from "../../lib/map/coverage";
import {townCentre} from "../../lib/map/town-centres";
import StreetSearch from "../search/StreetSearch";
import type {StreetSide} from "../../lib/map/street-index";
import Link from "next/link";
import Image from "next/image";
import {useEffect,useState,useRef,useMemo} from "react";
import dynamic from "next/dynamic";
import StaySelector from "../search/StaySelector";
import ResultsList from "../map/ResultsList";
import SectionSheet from "../map/SectionSheet";
import type {EvaluatedSection} from "../map/ResultsList";
import type {MapBounds} from "../map/StreetMap";
import type {ServerSession} from "../../lib/server/eligibility";
import type {ParkingStay} from "../../domain/parking/types";
import type {MapConfiguration} from "../../lib/map/config";
import {instantToMelbourneLocal} from "../../domain/parking/time";
import {MELBOURNE_HOLIDAYS_2026} from "../../domain/parking/holidays";
import AnnotationWorkspace from "../community/AnnotationWorkspace";
import ContributorPoints from "../community/ContributorPoints";
const pilotMap:MapConfiguration={renderer:"maplibre",pitch:0,terrain:false,automaticPaidUpgrade:false,fallback:"coverage_list",mode:"live",styleUrl:"/map-style.json",label:"Melbourne street parking",attribution:"© OpenStreetMap contributors · Standard map"};
const StreetMap=dynamic(()=>import("../map/StreetMap"),{ssr:false,loading:()=> <div className="map-module-loading" role="status">Loading map…</div>});
export default function PilotApp({now}:{now:string}) {
 const [session,setSession]=useState<ServerSession|null>(null),[status,setStatus]=useState("Checking sign-in…");
 const [sections,setSections]=useState<EvaluatedSection[]>([]),[selected,setSelected]=useState<string|null>(null);
 const [evaluatedAt,setEvaluatedAt]=useState(now),[bounds,setBounds]=useState<MapBounds|null>(null);
 const [streetSides,setStreetSides]=useState<StreetSide[]>([]),[focus,setFocus]=useState<[number,number]>(townCentre("carnegie")),[target,setTarget]=useState<StreetSide|null>(null);
 const [regionId,setRegionId]=useState("carnegie"),[coverageError,setCoverageError]=useState("");
 const contextStreetData=useMemo(()=>({type:"FeatureCollection" as const,features:streetSides.map(side=>({type:"Feature" as const,id:side.id,properties:side.properties,geometry:{type:"LineString" as const,coordinates:side.geometry.coordinates}}))}),[streetSides]);
 const region=COVERAGE_REGIONS.find(item=>item.id===regionId)??COVERAGE_REGIONS[0];
 useEffect(()=>{const abort=new AbortController();setStreetSides([]);setTarget(null);setCoverageError("");fetch(region.url,{signal:abort.signal}).then(response=>{if(!response.ok)throw new Error();return response.json();}).then(data=>{if(!abort.signal.aborted)setStreetSides(data.features);}).catch(()=>{if(!abort.signal.aborted)setCoverageError("Street geometry could not load. Select the suburb again to retry.");});return()=>abort.abort();},[region.url]);
 useEffect(()=>{if(session?.kind!=="eligible"&&session?.kind!=="admin")return;const params=new URLSearchParams(window.location.search);const longitude=Number(params.get("longitude")),latitude=Number(params.get("latitude"));if(params.has("longitude")&&params.has("latitude")&&Number.isFinite(longitude)&&Number.isFinite(latitude)){const area=coverageAt([longitude,latitude]);if(area){setRegionId(area.id);setFocus([longitude,latitude]);setLocation([longitude,latitude]);}}},[session]);
 function chooseLocation(point:[number,number]){const area=coverageAt(point);if(area)setRegionId(area.id);setFocus(point);setLocation(point);setTarget(null);setSelected(null);}

 const stayFilter=useRef<HTMLDetailsElement>(null);
 const [annotationOpen,setAnnotationOpen]=useState(false);
 const [category,setCategory]=useState("all"),[retry,setRetry]=useState(0);
 const [location,setLocation]=useState<[number,number]>(townCentre("carnegie"));
 const [refreshing,setRefreshing]=useState(false);
 const [previewLoadedAt,setPreviewLoadedAt]=useState<string|null>(null);
 const [stay,setStay]=useState<ParkingStay>({arrival:now,departure:new Date(Date.parse(now)+15*60000).toISOString()});
 useEffect(()=>{const abort=new AbortController();fetch("/api/session",{signal:abort.signal,cache:"no-store"}).then(async response=>{
  if(!response.ok)throw new Error();const value:ServerSession=await response.json();setSession(value);
  setStatus(value.kind==="guest"?"Explore the town-centre preview. Sign in to search, choose a stay and explore farther.":value.kind==="unverified"?"Confirm your email and contributor access to view parking rules.":"Explore the map to see recorded parking rules.");
 }).catch(()=>{if(!abort.signal.aborted)setStatus("Sign-in is temporarily unavailable. Please try again later.");});return()=>abort.abort();},[]);
 const eligible=session?.kind==="eligible"||session?.kind==="admin";
 useEffect(()=>{
  if(!session||eligible)return;
  const abort=new AbortController();setSections([]);setPreviewLoadedAt(null);setStatus("Loading town-centre preview…");
  fetch(`/api/map/preview?region=${encodeURIComponent(regionId)}`,{signal:abort.signal}).then(async response=>{if(!response.ok)throw new Error();return response.json();}).then(data=>{
   if(abort.signal.aborted)return;setSections(data.sections);setStay(data.stay);setEvaluatedAt(data.stay.arrival);setPreviewLoadedAt(data.loadedAt);setStatus(data.sections.length?"Town-centre preview · approved parking rules · 15-minute visit":"No approved rules in this town-centre preview yet. Sign in to contribute.");
  }).catch(()=>{if(!abort.signal.aborted)setStatus("Town-centre preview is temporarily unavailable. Sign in to explore recorded rules.");});
  return()=>abort.abort();
 },[session,eligible,regionId]);
 useEffect(()=>{
  if(!eligible||!bounds)return;
  const abort=new AbortController();
  const timer=setTimeout(async()=>{
   if((bounds.east-bounds.west)*112000*(bounds.north-bounds.south)*112000>2000000){setRefreshing(false);setStatus("Zoom in to see parking rules for this area.");return;}
   setRefreshing(true);setStatus("Loading parking rules… Existing colours stay visible while results refresh.");
   try {
    const params=new URLSearchParams({...Object.fromEntries(Object.entries(bounds).map(([key,value])=>[key,String(value)])),arrival:stay.arrival,departure:stay.departure,includeUnknown:"true"});
    const response=await fetch(`/api/map/sections?${params}`,{cache:"no-store",signal:abort.signal});
    if(!response.ok){if(!abort.signal.aborted){if(response.status===403)setSections([]);setStatus(response.status===403?"Sign in with an eligible account to view parking rules.":"Could not refresh parking rules. Previously loaded colours are retained; use Retry to try again.");}return;}
    const data=await response.json();if(abort.signal.aborted)return;
    setSections(data.sections);setEvaluatedAt(new Date().toISOString());setStatus(data.sections.length?`${data.sections.length} street ${data.sections.length===1?"section":"sections"} recorded in this area.`:"Help map local parking — add the first signs.");
   }catch{if(!abort.signal.aborted)setStatus("Could not refresh parking rules. Previously loaded colours are retained; use Retry to try again.");}finally{if(!abort.signal.aborted)setRefreshing(false);}
  },250);
  return()=>{clearTimeout(timer);abort.abort();};
 },[eligible,bounds,stay,retry]);
 useEffect(()=>{if(eligible&&window.location.hash==="#annotations"){
  const params=new URLSearchParams(window.location.search);setTarget(streetSides.find(side=>side.id===params.get("sectionId"))??null); const longitude=Number(params.get("longitude")),latitude=Number(params.get("latitude"));
  if(params.has("longitude")&&params.has("latitude")&&coverageAt([longitude,latitude]))setLocation([longitude,latitude]);
  setAnnotationOpen(true);
 }},[eligible,streetSides]);
 const zoomedOut=!!(eligible&&bounds&&(bounds.east-bounds.west)*112000*(bounds.north-bounds.south)*112000>2000000);
 const visible=(zoomedOut?[]:sections).filter(section=>(category==="all"||(category==="paid"?section.parkingDisplay?.payment==="paid":category==="exceeded"?section.parkingDisplay?.stayExceeded:section.parkingDisplay?.category===category)));
 const chosen=visible.find(section=>section.sectionId===selected);
 return <main className="pilot map-first"><header className="pilot-header"><Link className="brand" href="/"><Image src="/brand/parkmel-logo.png" alt="" width={44} height={44} priority sizes="44px" /><span>ParkMel</span></Link><span>{region.name} pilot</span>{eligible&&<ContributorPoints/>}{session?.kind==="admin"&&<Link href="/admin">Review annotations</Link>}{eligible&&<Link href="/reset-password">Change password</Link>}{eligible?<a href="#annotations" onClick={()=>setAnnotationOpen(true)}>Record a sign</a>:<Link href="/sign-in?next=%2F">Sign in for full access</Link>}</header>
  <h1 className="sr-only">Explore street parking in Melbourne</h1>
  <div className="map-explorer"><details className="map-toolbar" aria-label="Map search and filters" open={!eligible}><summary>Map controls · {region.name}<span className="selected-stay">{instantToMelbourneLocal(new Date(stay.arrival)).replace("T"," ")} · {Math.round((Date.parse(stay.departure)-Date.parse(stay.arrival))/60000)} min</span></summary><div className="map-toolbar-controls">
   <label>Suburb<select aria-label="Suburb" value={region.id} onChange={event=>{const next=COVERAGE_REGIONS.find(item=>item.id===event.target.value)!;setRegionId(next.id);setFocus(townCentre(next.id));setLocation(townCentre(next.id));setTarget(null);setSelected(null);}}>{COVERAGE_REGIONS.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
   {eligible?<StreetSearch streets={streetSides} areaName={region.name} onSelect={chooseLocation}/>:<p className="guest-search-gate"><Link href="/sign-in?next=%2F">Sign in to search locations</Link></p>}
   {coverageError&&<p role="status">{coverageError}</p>}
   <label>Parking filter<select aria-label="Parking filter" value={category} onChange={event=>setCategory(event.target.value)}><option value="all">All recorded rules</option><option value="paid">Metered / paid</option>{Object.entries(PARKING_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}<option value="exceeded">Stay exceeds limit</option></select></label>
   <details ref={stayFilter} className="stay-filter" open={eligible}><summary><span>Arrival &amp; duration</span><span className="selected-stay">Arrival: {instantToMelbourneLocal(new Date(stay.arrival)).replace("T"," ")} · Stay: {Math.round((Date.parse(stay.departure)-Date.parse(stay.arrival))/60000)} minutes</span></summary><div className="stay-panel" aria-label="Arrival and duration controls"><button className="stay-panel-close" type="button" onClick={()=>{if(stayFilter.current)stayFilter.current.open=false;}}>Close</button>{eligible?<StaySelector initialArrival={instantToMelbourneLocal(new Date(now))} now={Date.parse(now)} calendar={MELBOURNE_HOLIDAYS_2026} onSelect={value=>{setStay(value);if(stayFilter.current)stayFilter.current.open=false;}}/>:<p><Link href="/sign-in?next=%2F">Sign in to change arrival and intended stay</Link>. The preview uses a 15-minute visit.</p>}<p>Selected arrival: {instantToMelbourneLocal(new Date(stay.arrival))} · {Math.round((Date.parse(stay.departure)-Date.parse(stay.arrival))/60000)} minutes</p></div></details>
  </div></details>
  <section className="main-map" aria-label="Parking map">
   <StreetMap refreshing={refreshing} zoomedOut={zoomedOut} center={focus} contextStreetsUrl={region.url} contextStreetData={contextStreetData} configuration={pilotMap} guest={!eligible} sections={visible.flatMap(section=>[{id:section.sectionId,side:section.side,category:section.parkingDisplay?.category??"unknown",payment:section.parkingDisplay?.payment??"unknown",stayExceeded:section.parkingDisplay?.stayExceeded??false,confidence:section.confidenceLevel??1,label:section.streetName,signedRules:section.signedRules,ruleLabel:`${section.side} side · ${parkingDisplayLabel(section.parkingDisplay)}`,coordinates:section.geometry.coordinates as [number,number][]},...(section.localZones??[]).map((zone,index)=>({id:`${section.sectionId}:zone:${index}`,parentId:section.sectionId,side:section.side,category:zone.parkingDisplay.category,payment:zone.parkingDisplay.payment,confidence:section.confidenceLevel??1,label:`${section.streetName} · local zone`,signedRules:zone.signedRules,ruleLabel:parkingDisplayLabel(zone.parkingDisplay),coordinates:zone.geometry.coordinates as [number,number][]}))])} onContribute={(point,sectionId)=>{setTarget(streetSides.find(side=>side.id===sectionId)??null);if(coverageAt(point)){setLocation(point);setAnnotationOpen(true);}}} onSelect={setSelected} onViewportChange={setBounds} onPointSelect={point=>{if(coverageAt(point))setLocation(point);}}/>
   <details className="parking-legend"><summary>Parking colours</summary><ul className="map-legend" aria-label="Parking colour legend">{Object.entries(PARKING_LABELS).map(([key,label])=><li key={key} style={{borderColor:PARKING_COLOURS[key as keyof typeof PARKING_COLOURS]}}>{label}</li>)}<li style={{borderColor:PAID_COLOUR}}>Magenta edge · metered / paid</li><li className="exceeded">Red dashes · stay exceeds limit</li></ul><p>1P = 1 hour. Exactly 4P uses the 4P+ colour. Payment and time limits both apply.</p></details>
  </section>
  {chosen&&<div className="selected-map-card"><button aria-label="Close section details" onClick={()=>setSelected(null)}>Close</button><SectionSheet section={chosen} evaluatedAt={evaluatedAt}/></div>}
  </div>
  <div className="map-status"><p role="status" aria-live="polite">{status}</p>{eligible&&<button onClick={()=>setRetry(value=>value+1)}>Retry</button>}</div>
  <p className="coverage-note">{!eligible&&previewLoadedAt&&<>Town-centre data loaded {new Date(previewLoadedAt).toLocaleString("en-AU",{timeZone:"Australia/Melbourne"})}; refreshed daily. Sign in for live queries. </>}Colours show time limits and zones for your selected stay, not vacant spaces. Grey streets are waiting for parking rules to be recorded. Always check the signs.</p>
  <details className="pilot-card"><summary>Street list ({visible.length})</summary><ResultsList sections={visible} selectedId={selected} onSelect={setSelected} evaluatedAt={evaluatedAt}/></details>
  {eligible&&session?.userId?<details id="annotations" open={annotationOpen} className="pilot-card" onToggle={event=>setAnnotationOpen(event.currentTarget.open)}><summary>Record a parking sign</summary><p>Click a grey street on the map, then start a sign draft for that location. Existing drafts retain their original location.</p>{annotationOpen&&<AnnotationWorkspace userId={session.userId} sessionKind={session.kind} coordinates={{longitude:location[0],latitude:location[1]}} target={target} streetSides={streetSides}/>}</details>:<p><Link href="/sign-in">Sign in with verified email</Link> to explore the full map and record signs.</p>}
 </main>;
}
