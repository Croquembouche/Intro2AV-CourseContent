const {chromium}=require('/home/william/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const b=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome'});const p=await b.newPage({viewport:{width:1500,height:1100}});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('file://'+path.resolve('2026/Labs/SensorFusion/index.html')+'#lidar');
for(const n of [8,16,32,64,128]){await p.click(`[data-channels="${n}"]`);assert.equal(await p.locator('#channels').inputValue(),String(n));assert.equal(await p.evaluate(()=>FusionScene.getStatus().rays),n*360)}
const counts=await p.evaluate(()=>[8,32,128].map(channels=>[10,30,60].map(r=>targetReturns({...Lab.state.lidar,channels},r).hits.length)));assert(counts[2][2]>counts[0][2]);assert(counts[2][0]>counts[2][2]);console.log('Points for 8/32/128 channels at 10/30/60 m:',counts);
assert.equal(await p.evaluate(()=>targetReturns({...Lab.state.lidar,max:50},60).hits.length),0);
await p.click('[data-preset=sparse]');await p.locator('#range-channels').fill('128');await p.locator('#range-channels').dispatchEvent('input');assert.equal(await p.evaluate(()=>Lab.state.lidar.channels),128);
await p.locator('#range-step').fill('1');await p.locator('#range-step').dispatchEvent('input');assert.equal(await p.locator('#step').inputValue(),'1');
await p.locator('#range-experiment').screenshot({path:'.build/slides/lecture4/range-comparison.png'});
await p.setViewportSize({width:390,height:900});assert(!await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth));assert.deepEqual(errors,[]);await b.close();console.log('PASS: shared controls, presets, range geometry, responsive layout, no JS errors')})().catch(e=>{console.error(e);process.exit(1)});
