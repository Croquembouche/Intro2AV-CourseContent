// Verify the browser's inspected connections against independently summed live tensors.
// Run with Node 22 while all three ROS model nodes and the web bridge are running.
import assert from 'node:assert/strict';
import {checkInspector} from './inspector_checks.mjs';
import {layersFor,inspectNode} from '../ws/src/neural_vision_common/web/network-data.js';
const base=process.env.DEMO_URL||'http://127.0.0.1:8773';
const get=async path=>{const r=await fetch(base+path);assert(r.ok);return r.json()};
const snapshot=await get('/api/state');
const close=(a,b)=>assert(Math.abs(a-b)<2e-5+2e-5*Math.abs(b),`${a} != ${b}`);
let cases=0;
for(const model of ['mlp','cnn','transformer']){
  const result=snapshot.results[model]; assert(result,'Publish an image first');
  const image=snapshot.pixels.map(v=>v/255),weights=await get('/api/weights/'+model);
  const layers=layersFor(model,image,result),S={model,image,result,weights,layers,head:1,dimension:3};
  assert.equal(layers.reduce((n,l)=>n+l.channels*l.rows*l.cols,0),{mlp:1194,cnn:9134,transformer:4976}[model]);
  const inspect=(id,ch,i)=>inspectNode(S,layers.find(l=>l.id===id),ch,i);
  const input=e=>layers.find(l=>l.id===e.layer).values[e.channel][e.index];
  for(const l of layers){
    for(const ch of [0,l.channels-1])for(const i of [0,Math.floor(l.rows*l.cols/2),l.rows*l.cols-1]){
      const r=inspect(l.id,ch,i);assert(Number.isFinite(r.value));
      checkInspector(S,l,ch,i,r,close);
      cases++;
    }
  }
  if(model==='mlp'){assert.equal(inspect('hidden1',0,149).links.length,784);assert.equal(inspect('hidden2',0,10).links.length,300);assert.equal(inspect('output',0,7).links.length,100)}
  if(model==='transformer'){
    const r=inspect('tokens0',0,60);assert.equal(r.links.length,49);
    const projection=r.links.reduce((n,e)=>n+input(e)*e.weight,weights['patch.bias'][12]);
    close(projection,result.detail.embedded[0][12]);
    assert.equal(inspect('output',0,7).links.length,1);
  }
  console.log(`PASS ${model}: all layer shapes, inspected edge indices and local calculations`);
}
console.log(`PASS ${cases} inspected units across all three architectures`);
