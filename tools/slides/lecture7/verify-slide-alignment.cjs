// Ensure the deck opens the actual method it names, including paired examples.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('/home/william/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const slides=JSON.parse(fs.readFileSync('tools/slides/lecture7/content.json')),base=process.env.URL||'file://'+path.resolve('2026/Labs/PathPlanning/index.html');
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']}),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const targets=new Set(slides.flatMap(s=>[s.demo,...(s.links||[]).map(x=>x[1])]).filter(Boolean));
 for(const target of targets){await page.goto(base+'#'+target);await page.waitForFunction(t=>document.querySelector('#lecture-example').value===(t==='search'?'astar':t),target);
  if(['astar','dijkstra','weighted'].includes(target))assert.equal(await page.locator('#algorithm').inputValue(),target);
  if(['terrain','weighted'].includes(target))assert.equal(await page.locator('#scene').inputValue(),'terrain');
  if(['rrtstar','informed'].includes(target))assert.equal(await page.locator('#sampling-algorithm').inputValue(),target);
  if(target==='trap')assert.equal(await page.locator('#scene').inputValue(),'trap');
  if(target==='footprint')assert.equal(await page.locator('#angle').inputValue(),'90');
  if(target==='mppi')assert.equal(await page.locator('#local-algorithm').inputValue(),'mppi');
 }
 assert.deepEqual(errors,[]);await browser.close();console.log(`PASS ${targets.size} distinct slide demo targets, algorithm/scene presets, and browser errors`);
})().catch(e=>{console.error(e);process.exit(1)});
