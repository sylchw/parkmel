"use client";
import {useEffect,useRef,useState} from "react";
import StreetMap from "./StreetMap";
import type {MapSection} from "./StreetMap";
import {createGuestAllowance,reduceGuestAllowance,remainingGuestMs} from "../../domain/guest/allowance";
export function boundedGuestRemaining(value:number):number {
 return Number.isSafeInteger(value) && value>=0 && value<=120000 ? value : 0;
}
interface Props {
 initialRemainingMs:number;
 /** Trusted server heartbeat; failures close the preview. No client allowance is submitted. */
 heartbeat:(foreground:boolean)=>Promise<number>;
 signInHref:string;
 sections?:readonly MapSection[];
 onSelect?:(id:string)=>void;
}
export default function GuestPreview({initialRemainingMs,heartbeat,signInHref,sections,onSelect}:Props) {
 const [remaining,setRemaining]=useState(()=>boundedGuestRemaining(initialRemainingMs));
 const signIn=useRef<HTMLAnchorElement>(null),transport=useRef(heartbeat);
 useEffect(()=>{transport.current=heartbeat;},[heartbeat]);
 useEffect(()=>{
  let cancelled=false,busy=false;
  const clock=()=>({monotonicMs:performance.now(),epochMs:Date.now()});
  let allowance=createGuestAllowance(clock(),{startedAt:Date.now(),consumedMs:120000-boundedGuestRemaining(initialRemainingMs)},!document.hidden);
  let serverRemaining=boundedGuestRemaining(initialRemainingMs);
  function render(){if(!cancelled) setRemaining(Math.min(serverRemaining,remainingGuestMs(allowance)));}
  async function reconcile(){
   if(busy || cancelled) return;busy=true;
   try {serverRemaining=Math.min(serverRemaining,boundedGuestRemaining(await transport.current(!document.hidden)));}
   catch {serverRemaining=0;}
   finally {busy=false;render();}
  }
  function visibility(){allowance=reduceGuestAllowance(allowance,document.hidden?"hide":"show",clock());render();void reconcile();}
  const timer=setInterval(()=>{allowance=reduceGuestAllowance(allowance,"tick",clock());render();void reconcile();},1000);
  document.addEventListener("visibilitychange",visibility);void reconcile();
  return ()=>{cancelled=true;clearInterval(timer);document.removeEventListener("visibilitychange",visibility);};
 },[initialRemainingMs]);
 const expired=remaining===0;
 useEffect(()=>{if(expired) signIn.current?.focus();},[expired]);
 return <section aria-label="Guest preview">
  <p role="status">{expired?"Guest preview ended. Sign in to continue.":`Guest preview: ${Math.ceil(remaining/1000)} seconds remaining. Pan the map to explore.`}</p>
  <div inert={expired} aria-hidden={expired || undefined} style={expired?{filter:"blur(6px)",pointerEvents:"none",userSelect:"none"}:undefined}>
   <StreetMap guest sections={sections} onSelect={onSelect}/>
  </div>
  <a ref={signIn} href={signInHref}>Sign in to continue</a>
 </section>;
}
