import {createServer} from 'node:net';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import assert from 'node:assert/strict';
if(!process.env.PLAYWRIGHT_BROWSERS_PATH&&existsSync('work/playwright-browsers'))process.env.PLAYWRIGHT_BROWSERS_PATH=`${process.cwd()}/work/playwright-browsers`;
const {chromium,webkit}=await import('@playwright/test');
const probe=createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{stdio:'ignore'});
const origin=`http://127.0.0.1:${port}`;
try{
 for(let i=0;i<90;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,200));}
 for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch({headless:true});let releaseScripts,releaseTiles;
  try{
   const page=await browser.newPage({viewport:{width:1000,height:900}});page.setDefaultTimeout(15000);
   const errors=[];page.on('pageerror',error=>errors.push(error.message));
   const scripts=new Promise(resolve=>{releaseScripts=resolve}),tiles=new Promise(resolve=>{releaseTiles=resolve});
   await page.route('**/_next/static/chunks/**',async route=>{await scripts;await route.continue();});
   await page.route('**/api/session',route=>route.fulfill({json:{kind:'guest',userId:null}}));
   let streetRequests=0;
   await page.route('**/carnegie-sections.json',route=>{streetRequests++;return route.fulfill({json:{type:'FeatureCollection',features:[{type:'Feature',id:'cold-load-road',properties:{name:'Invented cold-load street'},geometry:{type:'LineString',coordinates:[[145.056,-37.8865],[145.056,-37.8855]]}}]}});});
   await page.route('https://tile.openstreetmap.org/**',async route=>{await tiles;await route.fulfill({contentType:'image/png',body:await readFile('tests/browser/fixtures/tile.png')});});
   await page.goto(origin,{waitUntil:'commit'});
   await page.getByText('Loading map…',{exact:true}).waitFor();
   const initial=await page.getByRole('region',{name:'Parking map',exact:true}).boundingBox();
   assert.ok(initial.height>=800,'The map area must reserve its height before JavaScript downloads');
   const legend=await page.locator('.parking-legend').boundingBox();assert.ok(legend.y>initial.y+initial.height/2,'Floating legend must remain inside the reserved map');
   releaseScripts();
   const canvas=page.locator('.maplibregl-canvas');await canvas.waitFor();
   await page.getByText('Loading map tiles…',{exact:true}).waitFor();
   const box=await canvas.boundingBox();
   const heading=page.getByRole('heading',{name:'Invented cold-load street',exact:true});
   for(let attempt=0;attempt<30;attempt++){
    await page.mouse.move(box.x+box.width/2+6+(attempt%2),box.y+box.height/2-16);
    if(await heading.isVisible())break;
    await page.waitForTimeout(300);
   }
   assert.equal(await heading.isVisible(),true,'Street outlines must be interactive before background tiles finish');
   assert.equal(streetRequests,1,'Search and map must share one street-file download');
   const final=await page.getByRole('region',{name:'Parking map',exact:true}).boundingBox();
   assert.ok(Math.abs(initial.height-final.height)<2,'Hydration must not collapse or shift the map area');
   releaseTiles();await page.getByText('Loading map tiles…',{exact:true}).waitFor({state:'hidden'});
   assert.deepEqual(errors,[]);
   console.log(`${name}: reserved cold-load layout, outlines before delayed tiles, one street fetch passed`);
  }finally{releaseScripts?.();releaseTiles?.();await browser.close();}
 }
}finally{server.kill('SIGTERM');}
