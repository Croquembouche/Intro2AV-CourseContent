import {forward} from './browser-inference.js';
const models=['mlp','cnn','transformer'], weights={};
const ready=Promise.all(models.map(async model=>{
  const response=await fetch(new URL(`models/${model}.json`,import.meta.url));
  if(!response.ok) throw Error(`Could not load ${model} weights. Reload to try again.`);
  weights[model]=await response.json();
}));
// Handle rejected downloads even before the first inference request.
ready.catch(()=>{});
self.onmessage=async ({data})=>{
  try {
    await ready; const results={};
    for(const model of models) {
      const start=performance.now();
      results[model]={...forward(model,data.pixels,weights[model],data.config[model]),inference_ms:performance.now()-start,input_id:data.input_id};
    }
    self.postMessage({id:data.id,results});
  } catch(error) { self.postMessage({id:data.id,error:error.message}); }
};
