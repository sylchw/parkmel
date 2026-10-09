"use client";
import {useEffect,useRef,useState} from "react";
export default function ContributorPoints(){
 const [points,setPoints]=useState<number|null>(null),[failed,setFailed]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  let active=true,controller:AbortController|undefined;
  async function refresh(){controller?.abort();controller=new AbortController();const requestController=controller;try{const response=await fetch("/api/contributions/points",{cache:"no-store",signal:requestController.signal});if(!response.ok)throw new Error();const data=await response.json();if(!Number.isSafeInteger(data.points)||data.points<0)throw new Error();if(active){setPoints(data.points);setFailed(false);}}catch{if(active&&!requestController.signal.aborted)setFailed(true);}}
  void refresh();window.addEventListener("focus",refresh);
  return()=>{active=false;controller?.abort();window.removeEventListener("focus",refresh);};
 },[]);
 return <><button type="button" className="contributor-points" onClick={()=>dialog.current?.showModal()} aria-haspopup="dialog">{failed?"Points unavailable":points===null?"Points…":`${points} ${points===1?"point":"points"}`}</button>
 <dialog ref={dialog} className="points-dialog" aria-labelledby="points-title"><h2 id="points-title">Your contribution points</h2><p>{points===null?(failed?"Your points total is temporarily unavailable.":"Your points are loading…"):`You have ${points} ${points===1?"point":"points"}.`}</p><p>Earn 1 point for each approved parking entry. Pending and rejected entries do not earn points.</p><p>Rewards for points are planned for the future. There are no rewards available to redeem yet.</p><form method="dialog"><button className="auth-primary" type="submit">Got it</button></form></dialog></>;
}
