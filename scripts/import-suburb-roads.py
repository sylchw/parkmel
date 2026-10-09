"""Read a dated Geofabrik Victoria PBF; derive requested OSM suburb boundaries and roads.
Requires osmium==4.3.1 and shapely==2.1.2 in an isolated build environment.
This imports geometry only, never parking permission. Existing published IDs are handled downstream.
"""
import hashlib,json,sys
from pathlib import Path
import osmium
from shapely.geometry import shape,LineString
NAMES=['Chadstone','Bentleigh','Brighton','Malvern','Oakleigh','Clayton','Springvale','Mulgrave','Clayton South','Moorabbin','Hampton','St Kilda','Glen Waverley','Malvern East','Oakleigh South','Hawthorn']
ROAD_TYPES={'residential','tertiary','secondary','primary','unclassified','living_street','service'}
source=Path(sys.argv[1]);output=Path('work/suburb-import');factory=osmium.geom.GeoJSONFactory()
roads=[];boundaries={}
for obj in osmium.FileProcessor(str(source)).with_areas():
 if obj.is_way() and obj.tags.get('highway') in ROAD_TYPES:
  if len(obj.nodes)<2 or any(not node.location.valid() for node in obj.nodes):continue
  coordinates=[[node.lon,node.lat] for node in obj.nodes]
  if not any(144.9<=x<=145.3 and -38.05<=y<=-37.78 for x,y in coordinates):continue
  if len(set(map(tuple,coordinates)))<2:continue
  roads.append({'type':'Feature','id':f'osm-way-{obj.id}','properties':{'name':obj.tags.get('name','Unnamed road'),'osmWayId':obj.id},'geometry':{'type':'LineString','coordinates':coordinates}})
 elif obj.is_area() and obj.tags.get('name') in NAMES and obj.tags.get('admin_level')=='9':
  name=obj.tags.get('name');geometry=json.loads(factory.create_multipolygon(obj));polygon=shape(geometry)
  if not polygon.is_valid:raise ValueError(f'Invalid suburb polygon: {name}')
  if name in boundaries:raise ValueError(f'Duplicate locality: {name}')
  boundaries[name]={'name':name,'osmRelationId':obj.orig_id(),'geometry':geometry,'bounds':list(polygon.bounds),'center':[polygon.representative_point().x,polygon.representative_point().y]}
missing=set(NAMES)-set(boundaries)
if missing:raise ValueError(f'Missing OSM boundaries: {sorted(missing)}')
polygons={name:shape(item['geometry']) for name,item in boundaries.items()}
retained=[]
for road in roads:
 line=LineString(road['geometry']['coordinates']);names=[name for name,polygon in polygons.items() if polygon.intersects(line)]
 if names:road['properties']['suburbs']=names;retained.append(road)
manifest={'source':source.name,'sha256':hashlib.file_digest(source.open('rb'),'sha256').hexdigest(),'suburbs':[boundaries[name] for name in NAMES]}
(output/'boundaries.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n')
(output/'roads.json').write_text(json.dumps({'type':'FeatureCollection','features':retained},separators=(',',':'))+'\n')
print(json.dumps({'roadWays':len(retained),'suburbs':[{ 'name':name,'roads':sum(name in road['properties']['suburbs'] for road in retained)} for name in NAMES]}),flush=True)
