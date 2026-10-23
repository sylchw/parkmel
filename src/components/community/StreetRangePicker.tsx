import {useMemo,useState} from 'react';
import type {StreetSide} from '../../lib/map/street-index';
import {selectStreetRange,streetJunctionId,streetRangeModel} from '../../lib/map/street-range';
export default function StreetRangePicker({anchor,sections,disabled,onChange}:{anchor:StreetSide;sections:StreetSide[];disabled:boolean;onChange:(ids:string[])=>void}){
 const junctions=useMemo(()=>streetRangeModel(sections).junctions,[sections]);
 const [from,setFrom]=useState(()=>streetJunctionId(anchor.geometry.coordinates[0])),[to,setTo]=useState(()=>streetJunctionId(anchor.geometry.coordinates.at(-1)!)),[both,setBoth]=useState(false);
 const range=useMemo(()=>selectStreetRange(anchor,sections,from,to,both),[anchor,sections,from,to,both]);
 return <fieldset className="street-range" disabled={disabled}><legend>Select a stretch between junctions</legend>
  <p>Choose boundaries around the original section. Applying a range replaces the selection below.</p>
  <div className="street-range-fields">{([['From junction / boundary',from,setFrom],['To junction / boundary',to,setTo]] as const).map(([label,value,setValue])=><label key={label}>{label}<select aria-label={label} value={value} onChange={event=>setValue(event.target.value)}>{junctions.map(node=><option key={node.id} value={node.id}>{node.label} · {node.coordinates[1].toFixed(5)}, {node.coordinates[0].toFixed(5)}</option>)}</select></label>)}
   <label>Street sides<select aria-label="Street sides" value={both?'both':'original'} onChange={event=>setBoth(event.target.value==='both')}><option value="original">Same side as original selection</option><option value="both">Both sides</option></select></label>
  </div>
  <p>“Same side” follows the connected stretch, including sections drawn in reverse. Check the highlighted sides before submitting. Divided roads and branches may need separate selections.</p>
  <p role="status">{range.error??`${range.sectionCount} road ${range.sectionCount===1?'section':'sections'} · ${range.ids.length} street ${range.ids.length===1?'side':'sides'}`}</p>
  <button type="button" disabled={!!range.error} onClick={()=>{if(!range.error)onChange(range.ids);}}>Apply range</button>
 </fieldset>;
}
