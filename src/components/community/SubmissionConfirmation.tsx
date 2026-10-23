"use client";
import {useEffect,useRef} from 'react';
export default function SubmissionConfirmation({approved=false,count=1}:{approved?:boolean;count?:number}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{ref.current?.focus({preventScroll:true});ref.current?.scrollIntoView({block:'nearest'});},[]);
 return <div ref={ref} className="submission-confirmation" role="status" tabIndex={-1}><h2><span aria-hidden="true">✓ </span>{approved?"Approved and published":"Sent for review"}</h2><p>{count>1?`Your parking details were submitted for ${count} street sides.`:"Your parking details were submitted successfully."} {approved?"They are now published as verified rules.":"They’ll appear as verified rules after approval."}</p><p>Your draft stays in the editor if you need it.</p></div>;
}
