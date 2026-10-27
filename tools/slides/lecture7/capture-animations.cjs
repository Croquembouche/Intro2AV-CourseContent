// Capture the actual corrected canvas; do not redraw algorithms for the slides.
const {chromium}=require('/home/william/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']}),page=await browser.newPage({viewport:{width:1500,height:1100}}),B=path.resolve('.build/slides/lecture7'),records={};
 await page.goto('file://'+path.resolve('2026/Labs/PathPlanning/index.html'));
 const mode=async m=>{await page.evaluate(m=>choose(m),m);await page.locator('#controls').evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});};
 const record=async name=>{records[name]=await page.evaluate(()=>({mode:Lab.mode,legend:document.querySelector('#legend').textContent,settings:Object.fromEntries([...document.querySelectorAll('#controls input,#controls select')].map(e=>[e.id,e.type==='checkbox'?e.checked:e.value])),tick:Lab.tick,expanded:Lab.reveal,cost:Lab.result?.cost,attempts:Lab.rrt?.attempts,rewires:Lab.rrt?.latest,pose:Lab.p,planningOrigin:Lab.localResult?.origin,planningTime:Lab.localResult?.time}));};
 const shot=async name=>{await page.locator('#view').screenshot({path:`${B}/assets/${name}.png`});await record(name);};
 const frames=async(name,n,stride)=>{fs.mkdirSync(`${B}/frames/${name}`,{recursive:true});for(let i=0;i<n;i++){await page.locator('#view').screenshot({path:`${B}/frames/${name}/${String(i).padStart(3,'0')}.png`});await page.evaluate(k=>{for(let j=0;j<k;j++)step(false);draw();},stride);}await record(name);};
 const finish=async()=>{await page.click('#finish');await page.waitForFunction(()=>!document.querySelector('#finish').disabled);};
 const mixedPredictions=async()=>{await page.evaluate(()=>{for(let i=0;i<220;i++){step(false);const c=Lab.localResult.candidates;if(Lab.p[0]>15&&c.filter(x=>x.valid).length>=5&&c.filter(x=>!x.valid).length>=5&&Lab.localResult.best?.v>0)break;}draw();});assert(await page.evaluate(()=>Lab.localResult.candidates.some(x=>!x.valid)));};
 await mode('astar');await frames('astar-search',22,28);
 await mode('field');await page.selectOption('#scene','trap');await frames('field-trap',22,6);
 await mode('sampling');await frames('rrt-growth',22,12);
 await mode('roadmap');await finish();assert(await page.evaluate(()=>Lab.prm.result.path.length));await shot('prm');
 for(const algorithm of ['rrtstar','informed']){await mode(algorithm);await finish();await page.evaluate(()=>{document.querySelector('#budget').value=1200;});
  // Show an actual current rewire after a solution exists, without retaining stale highlights.
  await page.evaluate(()=>{while(!Lab.rrt.latest.length&&Lab.rrt.attempts<1200)step(false);draw();});assert(await page.evaluate(()=>Lab.rrt.latest.length>0&&Lab.rrt.path.length>0));await shot(algorithm);
 }
 await mode('anyangle');await finish();assert(await page.evaluate(()=>Lab.result.cost<Lab.baseline.cost));await shot('theta');
 await mode('mppi');await mixedPredictions();await shot('mppi');
 await mode('local');await page.locator('#moving').uncheck();await page.evaluate(()=>{for(let i=0;i<300;i++)step(false);draw();});await shot('local-blocked');
 await mode('local');await mixedPredictions();await shot('local-rollouts');
 await mode('local');await page.evaluate(()=>{for(let i=0;i<300;i++)step(false);draw();});await shot('local-moving');
 fs.writeFileSync(B+'/capture-manifest.json',JSON.stringify(records,null,2)+'\n');await browser.close();console.log('Fresh animations, PRM, RRT*, Informed RRT*, Theta*, and timed local captures saved');
})().catch(e=>{console.error(e);process.exit(1)});
