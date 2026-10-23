"use client";
import {useMemo,useState} from 'react';
import type {StreetSide} from '../../lib/map/street-index';
import {MAX_STREET_SELECTION,matchingStreetSections} from '../../lib/map/street-selection';
import {streetSelectionOutline} from '../../lib/map/street-selection-outline';
import {sectionCenter} from '../../lib/map/street-index';
import {streetViewUrl} from '../../lib/map/street-view-url';
export default function StreetSectionPicker({anchor,sections,selected,disabled=false,onChange}:{anchor:StreetSide;sections:StreetSide[];selected:string[];disabled?:boolean;onChange:(ids:string[])=>void}){
 const candidates=useMemo(()=>matchingStreetSections(anchor,sections),[anchor,sections]);
 const outline=useMemo(()=>streetSelectionOutline(candidates),[candidates]);
 const [tileError,setTileError]=useState(false);
 const byId=new Map(candidates.map(side=>[side.id,side]));
 const label=(side:StreetSide)=>`${side.properties.side} side · ${side.properties.startDescription} to ${side.properties.endDescription}`;
 function toggle(id:string){if(disabled||id===anchor.id)return;if(selected.includes(id))onChange(selected.filter(value=>value!==id));else if(selected.length<MAX_STREET_SELECTION)onChange([...selected,id]);}
 if(candidates.length<2)return null;
 return <details className="street-selection"><summary>Apply the same rules to more of {anchor.properties.name} · {selected.length} selected</summary>
  <p>Select the junction-to-junction sides that have these exact rules. This list covers the selected suburb. Left/right is measured looking from each section&apos;s start towards its end, so check both the map and boundaries.</p>
  <figure><svg className="street-selection-map" viewBox="0 0 380 220" role="group" aria-label="Select street sections on map">
   <rect width="380" height="220" fill="#eef2f6"/>
   {outline.tiles.map(tile=><image key={tile.url} href={tile.url} x={tile.x} y={tile.y} width="256" height="256" onError={()=>setTileError(true)}/>)}
   {outline.lines.map(line=>{const side=byId.get(line.id)!,checked=selected.includes(line.id),locked=disabled||side.id===anchor.id||!checked&&selected.length>=MAX_STREET_SELECTION;return <g key={line.id} role="checkbox" aria-label={label(side)} aria-checked={checked} aria-disabled={locked} tabIndex={locked?-1:0} onClick={()=>toggle(line.id)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle(line.id);}}}>
    <title>{label(side)}</title><polyline points={line.points.map(p=>p.join(',')).join(' ')} fill="none" stroke={checked?'#2563eb':'#64748b'} strokeWidth="5" strokeLinejoin="round"/><polyline points={line.points.map(p=>p.join(',')).join(' ')} fill="none" stroke="transparent" strokeWidth="14"/>
   </g>;})}
  </svg><figcaption>Blue: selected sides. Grey: available sides. Tap a line or use the checkboxes below.</figcaption><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>{tileError&&<p role="status">Map tiles could not load. Use the outlines, boundaries and Street View links to check your selection.</p>}</figure>
  <fieldset disabled={disabled}><legend>Sections of {anchor.properties.name}</legend>
   <div className="quick-actions"><button type="button" disabled={candidates.length>MAX_STREET_SELECTION} onClick={()=>onChange(candidates.map(side=>side.id))}>Select whole street in this suburb (both sides)</button><button type="button" onClick={()=>onChange([anchor.id])}>Keep original section only</button></div>
   <p>{selected.length} street {selected.length===1?'side':'sides'} selected. Up to {MAX_STREET_SELECTION} per submission.{candidates.length>MAX_STREET_SELECTION?' This road has more sections; choose a smaller group.':''}</p>
   <div className="street-selection-list">{candidates.map(side=>{const point=sectionCenter(side);return <div key={side.id} className="street-selection-row"><label><input type="checkbox" checked={selected.includes(side.id)} disabled={side.id===anchor.id||!selected.includes(side.id)&&selected.length>=MAX_STREET_SELECTION} onChange={()=>toggle(side.id)}/><span>{label(side)}{side.id===anchor.id?' (original section)':''}</span></label><a href={streetViewUrl(point[0],point[1])} target="_blank" rel="noopener noreferrer" aria-label={`Street View for ${label(side)}`}>Street View ↗</a></div>;})}</div>
  </fieldset>
 </details>;
}
