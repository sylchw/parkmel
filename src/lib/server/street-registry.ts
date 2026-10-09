import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import type {StreetSide} from '../map/street-index';
let registry:Map<string,StreetSide>|undefined;
export function registeredStreetSide(id:unknown):StreetSide|undefined {
 if(typeof id!=='string')return;
 if(!registry){const data=JSON.parse(readFileSync(join(process.cwd(),'data/coverage-sections.json'),'utf8')) as {features:StreetSide[]};registry=new Map(data.features.map(feature=>[feature.id,feature]));}
 return registry.get(id);
}
