import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {forward} from '../ws/src/neural_vision_common/web/browser-inference.js';
import {layersFor,inspectNode} from '../ws/src/neural_vision_common/web/network-data.js';
import {checkInspector} from './inspector_checks.mjs';
import {inputStatus} from '../ws/src/neural_vision_common/web/input-status.js';
const directory=process.argv[2], read=name=>JSON.parse(fs.readFileSync(path.join(directory,name+'.json'),'utf8'));
const weights=Object.fromEntries(['mlp','cnn','transformer'].map(n=>[n,read(n)]));
let compared=0,maxError=0,inspected=0;const fullyInspected=new Set();
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
    const exhaustive=!fullyInspected.has(c.model);
    for(const layer of layers) {
      const channels=exhaustive?Array.from({length:layer.channels},(_,i)=>i):[0,layer.channels-1];
      const units=exhaustive?Array.from({length:layer.rows*layer.cols},(_,i)=>i):[0,Math.floor(layer.rows*layer.cols/2),layer.rows*layer.cols-1];
      for(const ch of channels)for(const unit of units){
        const record=inspectNode(state,layer,ch,unit);
        assert(Number.isFinite(record.value));
        checkInspector(state,layer,ch,unit,record,compare);
        inspected++;
      }
    }
    fullyInspected.add(c.model);
  }
}
for(const bad of [[],Array(784).fill(NaN),Array(784).fill(-1),Array(784).fill(256)])assert.throws(()=>forward('mlp',bad,weights.mlp));
const evaluated=Array(784).fill(0),draft=evaluated.slice();draft[100]=255;
assert.equal(inputStatus(evaluated,evaluated,true).kind,'current');
assert.equal(inputStatus(draft,evaluated,true).kind,'changed');
assert.equal(inputStatus(draft,evaluated,true,true).kind,'pending');
assert.equal(inputStatus(draft,draft,false).kind,'pending');
assert.equal(inputStatus(draft,draft,true).kind,'current');
console.log(`PASS ${cases.length} browser cases; ${compared.toLocaleString()} numeric comparisons; ${inspected} inspected units; max absolute error ${maxError.toExponential(3)}`);
