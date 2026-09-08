import {runtimeMode} from './runtime-config.js';
export const isBrowser = runtimeMode==='browser';
const config={mlp:{disabled_neuron:-1},cnn:{negative_slope:0},transformer:{use_positions:true}};
let snapshot={results:{},nodes:{mlp:false,cnn:false,transformer:false},received:0,input_id:null};
let worker=null,sequence=0; const requests=new Map(),cache=new Map();
async function json(url,body) {
  const response=await fetch(url,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});
  if(!response.ok) throw Error(`Could not load ${url} (${response.status}).`);
  return response.json();
}
function load(url) { if(!cache.has(url)) cache.set(url,json(url).catch(error=>{cache.delete(url);throw error})); return cache.get(url); }
function infer(pixels) {
  if(!worker) {
    worker=new Worker(new URL('./inference-worker.js',import.meta.url),{type:'module'});
    worker.onmessage=({data})=>{
      const request=requests.get(data.id); if(!request)return;
      clearTimeout(request.timer);requests.delete(data.id);
      if(data.error)request.reject(Error(data.error));else request.resolve(data.results);
    };
    worker.onerror=()=>{
      for(const r of requests.values()){clearTimeout(r.timer);r.reject(Error('The model worker stopped. Reload the page to restart it.'));}
      requests.clear();worker.terminate();worker=null;
    };
  }
  const id=++sequence,input_id=`browser:${id}`;
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{requests.delete(id);reject(Error('Model loading took too long. Check your connection and try again.'));},45000);
    requests.set(id,{resolve:results=>{snapshot={...snapshot,results,pixels,input_id,nodes:{mlp:true,cnn:true,transformer:true},received:snapshot.received+3};resolve({input_id})},reject,timer});
    worker.postMessage({id,input_id,pixels,config});
  });
}
export async function api(path,body) {
  if(!isBrowser) return json(path,body);
  if(path==='/api/meta')return load('./models/meta.json');
  if(path.startsWith('/api/weights/'))return load(`./models/${path.split('/').at(-1)}.json`);
  if(path==='/api/state')return snapshot;
  if(path==='/api/infer')return infer(body.pixels);
  if(path==='/api/config'){
    const {model,values}=body;
    if(!config[model] || Object.keys(values).some(key=>!(key in config[model])))throw Error('Unknown parameter');
    if('disabled_neuron' in values&&(!Number.isInteger(values.disabled_neuron)||values.disabled_neuron< -1||values.disabled_neuron>299))throw Error('Neuron must be -1 through 299');
    if('negative_slope' in values&&(!Number.isFinite(values.negative_slope)||values.negative_slope<0||values.negative_slope>.3))throw Error('Slope must be between 0 and 0.3');
    if('use_positions' in values&&typeof values.use_positions!=='boolean')throw Error('Positions must be on or off');
    Object.assign(config[model],values); return {ok:true};
  }
  throw Error('Unknown operation');
}
