// Isolated browser fixtures only: never sends parking contributions to the hosted project.
import {createServer} from 'node:net';
import {spawn} from 'node:child_process';
import {readFile, mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
process.env.PLAYWRIGHT_BROWSERS_PATH??=`${process.cwd()}/work/playwright-browsers`;
const {chromium,webkit,expect}=await import('@playwright/test');
const index=JSON.parse(await readFile('public/carnegie-sections.json','utf8'));
const anchor=index.features.find(s=>s.properties.name==='Margaret Street'&&s.properties.startDescription==='Junction with Neerim Road');
assert.ok(anchor);const sides=index.features.filter(s=>s.properties.name===anchor.properties.name);
const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{stdio:'ignore'}),origin=`http://127.0.0.1:${port}`;
try{
 for(let i=0;i<90;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,300));}
 for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch({headless:true});
  try{for(const width of [360,1200]){
   if(process.env.PARKMEL_BROWSER_CASE&&!`${name}-${width}`.startsWith(process.env.PARKMEL_BROWSER_CASE))continue;
   const page=await browser.newPage({viewport:{width,height:850}});page.setDefaultTimeout(15000);
   let kind='eligible',failNext=true,requests=[];const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('https://tile.openstreetmap.org/**',async r=>r.fulfill({contentType:'image/png',body:await readFile('tests/browser/fixtures/tile.png')}));
   await page.route('**/api/session',r=>r.fulfill({json:{kind,userId:'00000000-0000-0000-0000-000000000081',reason:'verified'}}));
   await page.route('**/api/settings',r=>r.fulfill({json:{alias:'Fixture contributor',favouriteTown:'carnegie'}}));
   await page.route('**/api/contributions/points',r=>r.fulfill({json:{points:0}}));
   await page.route('**/api/contributions/pending',r=>r.fulfill({json:{submissions:[]}}));
   await page.route('**/api/map/sections?*',r=>r.fulfill({json:{sections:[]}}));
   await page.route('**/api/drafts',r=>r.fulfill({json:{drafts:[]}}));
   await page.route('**/api/annotations',r=>{const p=r.request().postDataJSON();requests.push(p);if(failNext){failNext=false;return r.fulfill({status:503,json:{error:'Fixture submission unavailable'}});}return r.fulfill({json:{submissions:p.sectionIds.map(id=>({sectionId:id,id:`fixture:${id}`})),count:p.sectionIds.length,submitted:true,approved:p.directApprove}});});
   const url=`${origin}/?sectionId=${anchor.id}#annotations`;
   await page.goto(url);await page.getByLabel('Account menu',{exact:true}).waitFor();const workspace=page.locator('#annotations');if(!await workspace.evaluate(el=>el.open))await workspace.locator(':scope > summary').click();try{await page.locator('.street-selection > summary').filter({hasText:anchor.properties.name}).waitFor();}catch(e){console.log(JSON.stringify({case:`${name}-${width}`,url:page.url(),annotationOpen:await workspace.evaluate(el=>el.open),errors}));throw e;}const form=page.getByRole('form',{name:'Parking details',exact:true});await form.waitFor();
   await form.getByLabel('Parking limit',{exact:true}).fill('2P');
   const confirm=form.getByRole('checkbox',{name:"I've checked the rules, special conditions and boundaries for this street side",exact:true});await confirm.check();
   const send=form.getByRole('button',{name:'Submit for review',exact:true});await expect(send).toBeEnabled();
   const picker=page.locator('.street-selection');await picker.locator('summary').click();
   const range=picker.locator('.street-range'),from=range.getByLabel('From junction / boundary',{exact:true}),to=range.getByLabel('To junction / boundary',{exact:true}),edges=range.getByLabel('Street sides',{exact:true}),apply=range.getByRole('button',{name:'Apply range',exact:true});
   const key=p=>JSON.stringify(p.slice(0,2)),start=key(anchor.geometry.coordinates[0]),finish=key(sides.find(s=>s.properties.endDescription==='Junction with McLaurin Road').geometry.coordinates.at(-1));
   await from.selectOption(start);await to.selectOption(finish);await apply.click();
   assert.equal(await picker.locator('.street-selection-row input:checked').count(),3,'A junction range selects the continuous original side');await expect(send).toBeDisabled();
   const chosen=await picker.locator('.street-selection-row input:checked').evaluateAll(inputs=>inputs.map(input=>input.closest('label').textContent));
   await from.selectOption(finish);await to.selectOption(start);await apply.click();
   assert.deepEqual(new Set(await picker.locator('.street-selection-row input:checked').evaluateAll(inputs=>inputs.map(input=>input.closest('label').textContent))),new Set(chosen),'Reversing the range retains the same physical side');
   await edges.selectOption('both');await apply.click();assert.equal(await picker.locator('.street-selection-row input:checked').count(),6,'Both sides of a range are selected');
   await to.selectOption(finish);await expect(apply).toBeDisabled();await range.getByText('Choose two different junctions or boundaries.',{exact:true}).waitFor();
   assert.equal(await picker.locator('.street-selection-row input:checked').count(),6,'Invalid ranges retain the applied selection');
   await from.selectOption(start);await to.selectOption(finish);await apply.click();
   const fitted=await picker.locator('svg image').first().getAttribute('href');await picker.getByRole('button',{name:'Show whole street overview',exact:true}).click();await picker.getByRole('button',{name:'Show selected stretch',exact:true}).click();assert.equal(await picker.locator('svg image').first().getAttribute('href'),fitted);
   await picker.getByRole('button',{name:'Keep original section only',exact:true}).click();
   await picker.locator('.street-selection-row input:not(:disabled)').first().check();
   await expect(send).toBeDisabled();
   const mapTarget=picker.locator('svg [role="checkbox"][aria-checked="false"][aria-disabled="false"]').first();await mapTarget.focus();await mapTarget.press('Space');
   assert.equal(await picker.locator('.street-selection-row input:checked').count(),3,'The keyboard map control selects a distinct side');
   await picker.getByRole('button',{name:'Select whole street in this suburb (both sides)',exact:true}).click();
   assert.equal(await picker.locator('.street-selection-row input:checked').count(),sides.length);
   const confirmBatch=page.getByRole('checkbox',{name:`I have checked that these exact rules apply to all ${sides.length} selected street sides`,exact:true});
   await confirmBatch.check();await expect(send).toBeEnabled();
   await form.getByLabel('Parking limit',{exact:true}).fill('3P');await expect(confirmBatch).not.toBeChecked();
   await confirm.check();await confirmBatch.check();
   assert.equal(await form.getByRole('button',{name:'Submit without review',exact:true}).count(),0,'Ordinary contributors have no approval shortcut');
   await send.click();await form.getByText(/Fixture submission unavailable/).waitFor();
   assert.equal(await picker.locator('.street-selection-row input:checked').count(),sides.length,'A failed request retains the selection');
   await send.click();await form.getByRole('heading',{name:'Sent for review',exact:true}).waitFor();
   assert.equal(requests.length,2);assert.deepEqual(new Set(requests[1].sectionIds),new Set(sides.map(s=>s.id)));assert.equal(requests[1].replicationConfirmed,true);assert.equal(requests[1].directApprove,false);
   await form.getByText(`Your parking details were submitted for ${sides.length} street sides.`,{exact:false}).waitFor();
   kind='reviewer';await page.reload();const restored=page.getByRole('form',{name:'Parking details',exact:true});await restored.waitFor();
   assert.equal(await restored.getByLabel('Parking limit',{exact:true}).inputValue(),'3P');
   await page.locator('.street-selection summary').click();assert.equal(await page.locator('.street-selection-row input:checked').count(),sides.length,'Saved selection survives reload');
   const recheck=page.getByRole('checkbox',{name:`I have checked that these exact rules apply to all ${sides.length} selected street sides`,exact:true});assert.equal(await recheck.isChecked(),false,'Reload requires a fresh selection confirmation');
   await recheck.check();await restored.getByRole('button',{name:'Submit without review',exact:true}).click();await restored.getByRole('heading',{name:'Approved and published',exact:true}).waitFor();assert.equal(requests.at(-1).directApprove,true);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Multi-section controls fit the viewport');assert.deepEqual(errors,[]);
   if(name==='chromium'&&width===1200){await mkdir('test-results',{recursive:true});await page.locator('.street-selection').screenshot({path:'test-results/multi-section-selection.png'});}
   await page.evaluate(({anchorId})=>localStorage.setItem(`parkmel-draft-v1:00000000-0000-0000-0000-000000000081:${anchorId}:selection`,JSON.stringify([anchorId,'not-registered'])),{anchorId:anchor.id});
   await page.reload();await page.getByRole('form',{name:'Parking details',exact:true}).waitFor();await page.locator('.street-selection summary').click();
   await expect(page.locator('.street-selection-row input:checked')).toHaveCount(1);
   const longAnchor=index.features.find(s=>s.properties.name==='Dandenong Road'&&s.properties.startDescription==='Junction with Repton Road'&&s.properties.endDescription==='Junction with Wilmot Street');assert.ok(longAnchor);
   await page.goto(`${origin}/?sectionId=${longAnchor.id}#annotations`);await page.getByRole('form',{name:'Parking details',exact:true}).waitFor();
   const longPicker=page.locator('.street-selection');await expect(longPicker.locator('summary')).toContainText('Dandenong Road');await longPicker.locator('summary').click();
   await expect(longPicker.getByRole('button',{name:'Select whole street in this suburb (both sides)',exact:true})).toBeDisabled();
   const longRange=longPicker.locator('.street-range');await longRange.getByLabel('Street sides',{exact:true}).selectOption('both');await longRange.getByRole('button',{name:'Apply range',exact:true}).click();
   assert.equal(await longPicker.locator('.street-selection-row input:checked').count(),2,'A short range remains available on a road above the whole-street cap');
   await expect(page.getByRole('checkbox',{name:'I have checked that these exact rules apply to all 2 selected street sides',exact:true})).not.toBeChecked();
   await page.getByRole('form',{name:'Parking details',exact:true}).getByLabel('Parking limit',{exact:true}).fill('2P');
   await page.getByRole('checkbox',{name:"I've checked the rules, special conditions and boundaries for this street side",exact:true}).check();
   await page.getByRole('checkbox',{name:'I have checked that these exact rules apply to all 2 selected street sides',exact:true}).check();
   await page.getByRole('button',{name:'Submit for review',exact:true}).click();await page.getByRole('heading',{name:'Sent for review',exact:true}).waitFor();assert.equal(requests.at(-1).directApprove,false);assert.equal(requests.at(-1).sectionIds.length,2);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Long junction names fit the phone viewport');assert.deepEqual(errors,[]);
   if(name==='chromium'&&width===360){await mkdir('test-results',{recursive:true});await longPicker.screenshot({path:'test-results/long-street-range-mobile.png'});}
   await page.close();console.log(`${name} ${width}px: junction ranges, continuous side/reverse range, long-road submission, map/checkbox selection, confirmation reset, retry and saved selection passed`);
  }}finally{await browser.close();}
 }
}finally{server.kill('SIGTERM');}
