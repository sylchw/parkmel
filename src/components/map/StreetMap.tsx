"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {createPortal} from "react-dom";
import StreetPopupContent from "./StreetPopupContent";
import type {StreetPopupInfo} from "./StreetPopupContent";
import {Map as MapLibreMap,NavigationControl,setWorkerUrl,Popup} from "maplibre-gl";
import type {GeoJSONSource,Map as MapInstance,StyleSpecification,ExpressionSpecification,MapMouseEvent} from "maplibre-gl";
import type {FeatureCollection,LineString} from "geojson";
import {PARKING_COLOURS,PARKING_LABELS,PAID_COLOUR} from "../../lib/map/parking-display";
import type {ParkingCategory} from "../../lib/map/parking-display";
import {STREET_SIDE_OFFSET,streetSideWidth} from "../../lib/map/street-side-paint";
import {clampGuestCentre} from "../../lib/map/town-centres";
import {mapConfiguration} from "../../lib/map/config";
import type {MapConfiguration} from "../../lib/map/config";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map.css";
export interface MapSection {
 id:string;parentId?:string; side:"left"|"right"; category:ParkingCategory;payment?:"free"|"paid"|"unknown";stayExceeded?:boolean;
 signedRules?:import("../../lib/map/signed-rule-summary").SignedRuleSummary[]; confidence:1|2|3|4|5; label:string; ruleLabel?:string; coordinates:[number,number][];
}
export const SYNTHETIC_SECTIONS:MapSection[]=[
 {id:"fixture-left",side:"left",category:"untimed",confidence:1,label:"Invented left side · free category example",
  coordinates:[[145.0559,-37.8865],[145.0559,-37.8855]]},
 {id:"fixture-right",side:"right",category:"prohibited",confidence:3,label:"Invented right side · restriction category example",
  coordinates:[[145.0561,-37.8865],[145.0561,-37.8855]]},
];
const OFFLINE=mapConfiguration();
export function sectionOverlay(sections:readonly MapSection[]):FeatureCollection<LineString> {
 return {type:"FeatureCollection",features:sections.map(section=>{
  if(section.coordinates.length<2 || section.coordinates.some(([lng,lat])=>!Number.isFinite(lng)||!Number.isFinite(lat)||Math.abs(lng)>180||Math.abs(lat)>90)) throw new Error("Invalid section geometry");
  return {type:"Feature",id:section.id,properties:{sectionId:section.id,side:section.side,
   category:section.category,payment:section.payment??"unknown",stayExceeded:section.stayExceeded??false,confidence:section.confidence,label:section.label},
   geometry:{type:"LineString",coordinates:section.coordinates}};
 })};
}
export interface MapBounds {west:number;south:number;east:number;north:number}
interface Props {refreshing?:boolean;zoomedOut?:boolean;sections?:readonly MapSection[];configuration?:MapConfiguration;center?:[number,number];guest?:boolean;contextStreetsUrl?:string;contextStreetData?:FeatureCollection<LineString>;onSelect?:(id:string)=>void;onViewportChange?:(bounds:MapBounds)=>void;onPointSelect?:(point:[number,number])=>void;onContribute?:(point:[number,number],sectionId?:string)=>void}
export default function StreetMap({refreshing=false,zoomedOut=false,sections=SYNTHETIC_SECTIONS,configuration=OFFLINE,center=[145.056,-37.886],guest=false,contextStreetsUrl,contextStreetData,onSelect,onViewportChange,onPointSelect,onContribute}:Props) {
 const container=useRef<HTMLDivElement>(null),map=useRef<MapInstance|null>(null),callback=useRef(onSelect);
 const viewportCallback=useRef(onViewportChange),pointCallback=useRef(onPointSelect);
 useEffect(()=>{viewportCallback.current=onViewportChange;pointCallback.current=onPointSelect;},[onViewportChange,onPointSelect]);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 const [zoomNotice,setZoomNotice]=useState(false);
 const [panNotice,setPanNotice]=useState(false);
 const centreRef=useRef(center);centreRef.current=center;
 const [popupView,setPopupView]=useState<{container:HTMLElement;info:StreetPopupInfo}|null>(null);
 const sectionRef=useRef(sections),popupRef=useRef<Popup|null>(null),popupInfo=useRef<StreetPopupInfo|null>(null);
 useEffect(()=>{sectionRef.current=sections;const info=popupInfo.current;if(info?.sectionId&&!info.unknown&&!sections.some(section=>(section.parentId??section.id)===info.sectionId&&(section.ruleLabel??PARKING_LABELS[section.category])===info.ruleLabel&&JSON.stringify(section.signedRules)===JSON.stringify(info.signedRules)))popupRef.current?.remove();},[sections]);
 const data=useMemo(()=>sectionOverlay(sections),[sections]),latest=useRef(data);
 useEffect(()=>{callback.current=onSelect;},[onSelect]);
 useEffect(()=>{latest.current=data;(map.current?.getSource("parking-sections") as GeoJSONSource|undefined)?.setData(data);},[data]);
 const navigation=useRef<NavigationControl|null>(null);
 const mode=configuration.mode,styleUrl=configuration.styleUrl;
 const [centerLng,centerLat]=center;
 useEffect(()=>{
  if(!container.current) return;
  const offlineStyle:StyleSpecification={version:8,sources:{},layers:[{id:"background",type:"background",paint:{"background-color":"#f1f5f9"}}]};
  let instance:MapInstance;
  try {
   setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
   instance=new MapLibreMap({container:container.current,style:mode==="live" && styleUrl ? styleUrl : offlineStyle,
    center:[145.056,-37.886],zoom:16,pitch:0,bearing:0,attributionControl:false,
    dragRotate:false,touchPitch:false,scrollZoom:true,boxZoom:true,doubleClickZoom:true,
    touchZoomRotate:true,keyboard:true,minZoom:0,maxZoom:22});
  } catch {setError("Map unavailable; use the section list");return;}
  map.current=instance;setLoading(true);

  function reportBounds(){const bounds=instance.getBounds();viewportCallback.current?.({west:bounds.getWest(),south:bounds.getSouth(),east:bounds.getEast(),north:bounds.getNorth()});}
  instance.on("moveend",reportBounds);
  let pinned=false,hoverKey="",closeTimer:ReturnType<typeof setTimeout>|undefined;
  const finePointer=()=>window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  function cancelClose(){if(closeTimer)clearTimeout(closeTimer);closeTimer=undefined;}
  function closePopup(){cancelClose();popupRef.current?.remove();pinned=false;hoverKey="";}
  function delayedClose(){cancelClose();if(!pinned&&!popupRef.current?.getElement().contains(document.activeElement))closeTimer=setTimeout(closePopup,300);}
  function streetAt(event:MapMouseEvent):StreetPopupInfo|null {
   const layers=["parking-stay-exceeded","parking-sections","parking-payment","unrecorded-streets"].filter(layer=>instance.getLayer(layer));
   if(!layers.length)return null;
   const features=instance.queryRenderedFeatures(event.point,{layers});
   const sectionFeature=features.find(feature=>feature.properties?.sectionId);
   const longitude=event.lngLat.lng,latitude=event.lngLat.lat;
   if(sectionFeature){
    const section=sectionRef.current.find(item=>item.id===sectionFeature.properties.sectionId);
    if(section)return {key:`section:${section.id}`,sectionId:section.parentId??section.id,streetName:section.label,signedRules:section.signedRules,ruleLabel:section.ruleLabel??PARKING_LABELS[section.category],unknown:section.category==="unknown",longitude,latitude};
   }
   const road=features.find(feature=>feature.layer.id==="unrecorded-streets");
   return road?{key:`road:${road.id}`,sectionId:typeof road.properties?.sectionId==="string"?road.properties.sectionId:undefined,streetName:typeof road.properties?.name==="string"?`${road.properties.name}${road.properties.side?` · ${road.properties.side} side`:""}`:"Unnamed road",ruleLabel:"Unknown",unknown:true,longitude,latitude,boundaryLabel:road.properties?.startDescription&&road.properties?.endDescription?`${road.properties.startDescription} → ${road.properties.endDescription}`:undefined}:null;
  }
  function showPopup(info:StreetPopupInfo,pin:boolean){
   cancelClose();
   if(!pin&&hoverKey===info.key&&popupRef.current?.isOpen())return;
   closePopup();pinned=pin;hoverKey=info.key;
   const content=document.createElement("div");
   content.addEventListener("focusin",cancelClose);
   content.addEventListener("focusout",delayedClose);
   content.addEventListener("mouseenter",cancelClose);
   content.addEventListener("mouseleave",delayedClose);
   const popup=new Popup({closeButton:true,closeOnClick:false,focusAfterOpen:false,maxWidth:"300px",offset:12,className:"parking-street-popup"})
    .setLngLat([info.longitude,info.latitude]).setDOMContent(content).addTo(instance);
   popupRef.current=popup;popupInfo.current=info;
   popup.on("close",()=>{if(popupRef.current===popup){popupRef.current=null;popupInfo.current=null;hoverKey="";pinned=false;setPopupView(null);}});
   setPopupView({container:content,info});
  }
  instance.on("mousemove",event=>{
   if(!finePointer()||pinned)return;
   const info=streetAt(event);
   instance.getCanvas().style.cursor=info?"pointer":"";
   if(info)showPopup(info,false);else delayedClose();
  });
  instance.getCanvas().addEventListener("mouseleave",delayedClose);
  instance.on("click",event=>{
   const info=streetAt(event);
   if(info){showPopup(info,true);if(info.unknown)pointCallback.current?.([info.longitude,info.latitude]);}
   else{closePopup();pointCallback.current?.([event.lngLat.lng,event.lngLat.lat]);}
  });
  instance.on("movestart",closePopup);
  function onEscape(event:KeyboardEvent){if(event.key==="Escape")closePopup();}
  window.addEventListener("keydown",onEscape);
  instance.once("style.load",()=>{
   instance.setTerrain(null);instance.setPitch(0);reportBounds();
   {
    instance.addSource("unrecorded-streets",{type:"geojson",data:{type:"FeatureCollection",features:[]}});
    instance.addLayer({id:"unrecorded-streets",type:"line",source:"unrecorded-streets",paint:{"line-offset":STREET_SIDE_OFFSET,"line-color":PARKING_COLOURS.unknown,"line-width":streetSideWidth(5),"line-opacity":0.7}});
   }
   instance.addSource("parking-sections",{type:"geojson",data:latest.current});
   instance.addLayer({id:"parking-payment",type:"line",source:"parking-sections",filter:["==",["get","payment"],"paid"],paint:{"line-width":streetSideWidth(13),"line-offset":STREET_SIDE_OFFSET,"line-color":PAID_COLOUR}});
   instance.addLayer({id:"parking-sections",type:"line",source:"parking-sections",paint:{
    "line-width":streetSideWidth(8),"line-offset":STREET_SIDE_OFFSET,"line-color":["match",["get","category"],"short",PARKING_COLOURS.short,...Object.entries(PARKING_COLOURS).filter(([key])=>key!=="short").flat(),PARKING_COLOURS.unknown] as ExpressionSpecification,
    "line-opacity":["interpolate",["linear"],["get","confidence"],1,0.45,2,0.6,3,0.75,4,0.9,5,1]}});
   instance.addLayer({id:"parking-stay-exceeded",type:"line",source:"parking-sections",filter:["==",["get","stayExceeded"],true],paint:{"line-width":streetSideWidth(3),"line-offset":STREET_SIDE_OFFSET,"line-color":PARKING_COLOURS.prohibited,"line-dasharray":[2,2]}});
  });
  instance.once("load",()=>setLoading(false));
  instance.on("error",()=>{setLoading(false);setError("Map unavailable; use the section list");});
  return ()=>{closePopup();window.removeEventListener("keydown",onEscape);instance.getCanvas().removeEventListener("mouseleave",delayedClose);map.current=null;navigation.current=null;instance.remove();};
 },[mode,styleUrl]);
 useEffect(()=>{const instance=map.current;if(!instance)return;instance.jumpTo({center:[centerLng,centerLat]});},[centerLng,centerLat,mode,styleUrl]);
 useEffect(()=>{const instance=map.current;if(!instance||(!contextStreetData&&!contextStreetsUrl))return;const update=()=>{(instance.getSource("unrecorded-streets") as GeoJSONSource|undefined)?.setData(contextStreetData??contextStreetsUrl!);};if(instance.getSource("unrecorded-streets"))update();else instance.once("style.load",update);return()=>{instance.off("style.load",update);};},[contextStreetsUrl,contextStreetData,mode,styleUrl]);
 useEffect(()=>{const instance=map.current;if(!instance)return;
  instance.setMinZoom(0);instance.setMaxZoom(22);
  if(!guest&&window.matchMedia("(pointer: fine)").matches)instance.cooperativeGestures.enable();else instance.cooperativeGestures.disable();
  if(guest){instance.setZoom(16);instance.setMinZoom(16);instance.setMaxZoom(16);if(navigation.current){instance.removeControl(navigation.current);navigation.current=null;}}
  else if(!navigation.current){navigation.current=new NavigationControl({showCompass:false});instance.addControl(navigation.current,"top-right");}
  for(const handler of [instance.scrollZoom,instance.boxZoom,instance.doubleClickZoom,instance.touchZoomRotate,instance.keyboard]){if(guest)handler.disable();else handler.enable();}
 },[guest,mode,styleUrl,contextStreetsUrl]);
 useEffect(()=>{
  const instance=map.current;if(!instance||!guest)return;
  let correcting=false;
  const limitPan=()=>{if(correcting)return;const p=instance.getCenter(),point:[number,number]=[p.lng,p.lat];const bounded=clampGuestCentre(point,centreRef.current);if(Math.abs(bounded[0]-point[0])+Math.abs(bounded[1]-point[1])>1e-9){correcting=true;setPanNotice(true);instance.jumpTo({center:bounded});correcting=false;}};
  instance.on("move",limitPan);return()=>{instance.off("move",limitPan);};
 },[guest,mode,styleUrl]);
 useEffect(()=>{setPanNotice(false);},[centerLng,centerLat,guest]);
 useEffect(()=>{
  setZoomNotice(false);
  const element=container.current;if(!guest||!element)return;
  const onWheel=()=>setZoomNotice(true);
  const onTouch=(event:TouchEvent)=>{if(event.touches.length>=2)setZoomNotice(true);};
  const onDoubleClick=()=>setZoomNotice(true);
  element.addEventListener("wheel",onWheel,{passive:true});
  element.addEventListener("touchstart",onTouch,{passive:true});
  element.addEventListener("dblclick",onDoubleClick);
  return ()=>{element.removeEventListener("wheel",onWheel);element.removeEventListener("touchstart",onTouch);element.removeEventListener("dblclick",onDoubleClick);};
 },[guest]);
 return <section className="street-map" aria-label="Street section map">
  <p className="map-label">{configuration.label}</p>
  <div className="map-interaction-area">
   <div ref={container} className="map-canvas" aria-label="2D street map"/>
   {loading&&!error&&<p className="map-loading-status" role="status">Loading map tiles…</p>}
   {refreshing&&!zoomedOut&&<p className="map-refresh-notice" role="status">Refreshing parking rules… Previous colours remain visible.</p>}
   {zoomedOut&&<div className="map-area-notice" role="status"><strong>Zoom in to view parking rules</strong><p>Parking rules are hidden at this scale. Zoom in to see the rules for each street.</p></div>}
   {guest&&panNotice&&<p className="map-zoom-notice" role="status"><a href="/sign-in?next=%2F">Sign in to explore beyond the town centre</a><button type="button" aria-label="Dismiss pan notification" onClick={()=>setPanNotice(false)}>×</button></p>}
   {guest&&zoomNotice&&!panNotice&&<p className="map-zoom-notice" role="status"><a href={`/sign-in?next=${encodeURIComponent(`/?longitude=${centerLng}&latitude=${centerLat}`)}`}>Sign in to enable zoom</a><button type="button" aria-label="Dismiss zoom notification" onClick={()=>setZoomNotice(false)}>×</button></p>}
  </div>
  {popupView&&createPortal(<StreetPopupContent info={popupView.info} guest={guest} onContribute={()=>{const point:[number,number]=[popupView.info.longitude,popupView.info.latitude];pointCallback.current?.(point);onContribute?.(point,popupView.info.sectionId);popupRef.current?.remove();}} onDetails={!popupView.info.unknown&&popupView.info.sectionId?()=>{callback.current?.(popupView.info.sectionId!);popupRef.current?.remove();}:undefined}/>,popupView.container)}
  {error && <p role="status">{error}</p>}
  <p className="map-attribution">{mode==="live" ? <><a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a> · {configuration.attribution.split(" · ").at(-1)}</> : configuration.attribution}</p>
  <p>Colour indicates the signed time limit or zone for the selected stay. A magenta edge means payment is required; red dashes mean the stay exceeds the limit. Shade indicates confidence. Check the signs before parking.</p>
  <ul className="map-section-list">{sections.map(section=><li key={section.id}>
   <button type="button" onClick={()=>onSelect?.(section.id)}>{section.label} · {section.side} · {section.category} · level {section.confidence}/5</button>
  </li>)}</ul>
 </section>;
}
