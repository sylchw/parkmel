"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import {useEffect,useMemo,useRef,useState} from "react";
import {Map,Marker,setWorkerUrl} from "maplibre-gl";
import type {StreetSide} from "../../lib/map/street-index";
import {streetViewUrl} from "../../lib/map/street-view-url";
import {reviewOutline} from "../../lib/map/review-outline";
import {sliceStreetLine} from "../../lib/map/street-geometry";
export default function ReviewSectionMap({section,interactive=false,onToggle}:{section:StreetSide;interactive?:boolean;onToggle:()=>void}) {
 const ref=useRef<HTMLDivElement>(null),[error,setError]=useState("");
 const points=section.geometry.coordinates,first=points[0],last=points[points.length-1],middle=useMemo(()=>sliceStreetLine(points,0,.5).at(-1)!,[points]);
 const outline=useMemo(()=>reviewOutline(points,section.properties.side),[points,section.properties.side]);
 useEffect(()=>{
  setError("");
  if(!interactive||!ref.current)return;
  let map:Map|undefined,resize:ResizeObserver|undefined,disposed=false;
  const fail=()=>{if(!disposed)setError("Interactive map could not load. The road outline and Street View links remain available.");};
  try {
   setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
   map=new Map({container:ref.current,style:"/map-style.json",center:[middle[0],middle[1]],zoom:17,scrollZoom:false,dragRotate:false});
   const bounds:[number,number,number,number]=[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];
   map.fitBounds(bounds,{padding:45,maxZoom:18,duration:0});
   map.on("error",fail);
   map.getCanvas().addEventListener("webglcontextlost",fail);
   resize=new ResizeObserver(()=>map?.resize());resize.observe(ref.current);
   map.once("style.load",()=>{
    if(disposed)return;
    try {map!.addSource("review-section",{type:"geojson",data:{type:"Feature",properties:{},geometry:{type:"LineString",coordinates:points}}});
    map!.addLayer({id:"review-center",type:"line",source:"review-section",paint:{"line-color":"#64748b","line-width":3}});
    map!.addLayer({id:"review-side",type:"line",source:"review-section",paint:{"line-color":"#2563eb","line-width":6,"line-offset":section.properties.side==="left"?-7:7}});
    for(const [label,point] of [["A",first],["B",last]] as const){const el=document.createElement("span");el.textContent=label;el.className="review-boundary";new Marker({element:el}).setLngLat([point[0],point[1]]).addTo(map!);}
    }catch{fail();}
   });
  }catch{setError("Map preview unavailable. Use the boundary Street View links below.");}
  return()=>{disposed=true;resize?.disconnect();map?.remove();};
 },[interactive,section,points,first,last,middle]);
 return <figure className="review-location"><svg className="review-outline" viewBox="0 0 380 220" role="img" aria-label={`Map of ${section.properties.name}, ${section.properties.side} side, between boundaries A and B`}>
  <rect width="380" height="220" fill="#eef2f6"/><path d="M0 55H380M0 110H380M0 165H380M95 0V220M190 0V220M285 0V220" stroke="#dde5ed"/>
  <polyline points={outline.centre.map(p=>p.join(",")).join(" ")} fill="none" stroke="#64748b" strokeWidth="4" strokeLinejoin="round"/>
  <polyline points={outline.edge.map(p=>p.join(",")).join(" ")} fill="none" stroke="#2563eb" strokeWidth="6" strokeLinejoin="round"/>
  {[outline.centre[0],outline.centre.at(-1)!].map((point,i)=><g key={i} transform={`translate(${point[0]},${point[1]})`}><circle r="13" fill="white" stroke="#2563eb" strokeWidth="2"/><text textAnchor="middle" dy="5" fill="#172554" fontSize="15" fontWeight="bold">{i===0?"A":"B"}</text></g>)}
  <text x="355" y="22" textAnchor="middle" fill="#172554">N ↑</text>
 </svg><button type="button" onClick={onToggle}>{interactive?"Hide interactive map":"Show interactive map"}</button>
 {interactive&&<div ref={ref} className="review-map" hidden={!!error} role="region" aria-label="Interactive road map"/>}{interactive&&error&&<p role="status">{error}</p>}<figcaption>Blue: submitted {section.properties.side} side, looking from A towards B. Grey: road centre. Side positions are approximate; check the signs and boundaries.</figcaption><p>{[["Start boundary A",first],["Section midpoint",middle],["End boundary B",last]].map(([label,point])=><a key={String(label)} href={streetViewUrl((point as number[])[0],(point as number[])[1])} target="_blank" rel="noopener noreferrer">{String(label)} · Street View ↗</a>)}</p></figure>;
}
