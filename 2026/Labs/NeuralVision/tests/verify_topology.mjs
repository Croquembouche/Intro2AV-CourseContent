// Verify the browser's inspected connections against independently summed live tensors.
// Run with Node 22 while all three ROS model nodes and the web bridge are running.
import assert from 'node:assert/strict';
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
      for(const e of r.links)assert(Number.isFinite(input(e))&&Number.isFinite(e.weight));
      if(l.kind==='dense'&&model!=='transformer'){
        const total=r.links.reduce((n,e)=>n+input(e)*e.weight,weights[l.weight+'.bias'][i]);
        close(total,r.weighted);
      }
      if(l.kind==='conv'){
        assert.equal(r.links.length,l.id==='relu1'?25:150);
        const total=r.links.reduce((n,e)=>n+input(e)*e.weight,weights[(l.id==='relu1'?'conv1':'conv2')+'.bias'][ch]);
        close(total,r.weighted);
      }
      if(l.kind==='pool'){assert.equal(r.links.length,4);close(Math.max(...r.links.map(input)),r.value)}
      if(l.kind==='attention'){
        assert.equal(r.links.length,17);close(r.links.reduce((s,e)=>s+e.weight,0),1);
        const b=result.detail.blocks[l.block],row=Math.floor(i/17),key=i%17;
        close(b.q[ch][row].reduce((n,q,k)=>n+q*b.k[ch][key][k],0)/4,r.weighted);
        close(r.contributions.reduce((n,c)=>n+c.value,0),r.mixed);
      }
      cases++;
    }
  }
  if(model==='mlp'){assert.equal(inspect('hidden1',0,149).links.length,784);assert.equal(inspect('hidden2',0,10).links.length,300);assert.equal(inspect('output',0,7).links.length,100)}
  if(model==='transformer'){
    const r=inspect('tokens0',0,60);assert.equal(r.links.length,49);
    const projection=r.links.reduce((n,e)=>n+input(e)*e.weight,weights['patch.bias'][12]);
    close(projection,result.detail.embedded[0][12]);
    assert.equal(inspect('output',0,7).links.length,48);
  }
  console.log(`PASS ${model}: all layer shapes, inspected edge indices and local calculations`);
}
console.log(`PASS ${cases} inspected units across all three architectures`);
