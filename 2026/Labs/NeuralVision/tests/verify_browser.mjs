import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {forward} from '../ws/src/neural_vision_common/web/browser-inference.js';
import {layersFor,inspectNode} from '../ws/src/neural_vision_common/web/network-data.js';
const directory=process.argv[2], read=name=>JSON.parse(fs.readFileSync(path.join(directory,name+'.json'),'utf8'));
const weights=Object.fromEntries(['mlp','cnn','transformer'].map(n=>[n,read(n)]));
let compared=0,maxError=0,inspected=0;
function compare(actual,expected,where){
  if(typeof expected==='number'){
    const error=Math.abs(actual-expected);maxError=Math.max(maxError,error);compared++;
    assert(error<3e-5+3e-5*Math.abs(expected),`${where}: ${actual} vs ${expected}`);
  }else if(Array.isArray(expected)){
    assert.equal(actual.length,expected.length,where);
    expected.forEach((e,i)=>compare(actual[i],e,`${where}[${i}]`));
  }else if(expected&&typeof expected==='object'){
    for(const key of Object.keys(expected))compare(actual[key],expected[key],where+'.'+key);
  }else assert.equal(actual,expected,where);
}
const cases=read('cases');
for(const [i,c] of cases.entries()){
  const pixels=c.pixels.map(v=>v*255), w=weights[c.model], result=forward(c.model,pixels,w,c.options);
  compare(result,c.result,`${c.model}/${i}`);
  if(c.torch)compare(result.logits,c.torch,`${c.model}/${i}/pytorch`);
  if(c.result.detail){
    const layers=layersFor(c.model,c.pixels,result),state={model:c.model,image:c.pixels,result,weights:w,layers,head:1,dimension:3};
    for(const layer of layers) {
      for(const ch of [0,layer.channels-1])for(const unit of [0,Math.floor(layer.rows*layer.cols/2),layer.rows*layer.cols-1]){
        const record=inspectNode(state,layer,ch,unit);
        assert(Number.isFinite(record.value));
        for(const edge of record.links) assert(Number.isFinite(edge.weight));
        if(layer.kind==='pool'){
          compare(record.value,Math.max(...record.links.map(e=>layers.find(l=>l.id===e.layer).values[e.channel][e.index])),'pool');
        }
        if(layer.kind==='attention'){
          compare(record.links.reduce((s,e)=>s+e.weight,0),1,'attention row');
          compare(record.contributions.reduce((s,c)=>s+c.value,0),record.mixed,'weighted V');
        }
        inspected++;
      }
    }
  }
}
for(const bad of [[],Array(784).fill(NaN),Array(784).fill(-1),Array(784).fill(256)])assert.throws(()=>forward('mlp',bad,weights.mlp));
console.log(`PASS ${cases.length} browser cases; ${compared.toLocaleString()} numeric comparisons; ${inspected} inspected units; max absolute error ${maxError.toExponential(3)}`);
