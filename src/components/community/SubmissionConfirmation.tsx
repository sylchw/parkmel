"use client";
import {useEffect,useRef} from 'react';
export default function SubmissionConfirmation(){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{ref.current?.focus({preventScroll:true});ref.current?.scrollIntoView({block:'nearest'});},[]);
 return <div ref={ref} className="submission-confirmation" role="status" tabIndex={-1}><h2><span aria-hidden="true">✓ </span>Sent for review</h2><p>Your parking details were submitted successfully. They’ll appear as verified rules after approval.</p><p>Your draft stays in the editor if you need it.</p></div>;
}
