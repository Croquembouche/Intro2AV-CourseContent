// Browser counterpart of inference.py. Keep every intermediate tensor inspectable.
// Plain arrays preserve the same row-major tensor layout as the NumPy export.
const vector = (n, fn = () => 0) => Array.from({length:n}, (_, i) => fn(i));
const add = (a,b) => a.map((v,i) => Array.isArray(v) ? add(v,b[i]) : v+b[i]);
const map = (a,fn) => a.map(v => Array.isArray(v) ? map(v,fn) : fn(v));
const relu = x => Math.max(0,x);
const gelu = x => .5*x*(1+Math.tanh(Math.sqrt(2/Math.PI)*(x+.044715*x*x*x)));
const softmax = x => { const m=Math.max(...x), e=x.map(v=>Math.exp(v-m)), s=e.reduce((a,b)=>a+b,0); return e.map(v=>v/s); };
function linear(x,w,name) {
  if(Array.isArray(x[0])) return x.map(row=>linear(row,w,name));
  return w[name+'.weight'].map((row,i)=>{
    let sum=w[name+'.bias'][i]; for(let j=0;j<row.length;j++) sum+=row[j]*x[j]; return sum;
  });
}
function norm(x,w,name) {
  return x.map(row=>{
    const mean=row.reduce((a,b)=>a+b,0)/row.length;
    const variance=row.reduce((s,v)=>s+(v-mean)**2,0)/row.length;
    const scale=1/Math.sqrt(variance+1e-5);
    return row.map((v,i)=>(v-mean)*scale*w[name+'.weight'][i]+w[name+'.bias'][i]);
  });
}
function conv(x,kernels,bias) {
  const k=kernels[0][0].length, h=x[0].length-k+1, width=x[0][0].length-k+1;
  return kernels.map((channels,o)=>vector(h,y=>vector(width,c=>{
    let sum=bias[o];
    for(let ch=0;ch<x.length;ch++) for(let ky=0;ky<k;ky++) for(let kx=0;kx<k;kx++) sum+=x[ch][y+ky][c+kx]*channels[ch][ky][kx];
    return sum;
  })));
}
const pool = x => x.map(channel=>vector(channel.length/2,y=>vector(channel[0].length/2,c=>
  Math.max(channel[y*2][c*2],channel[y*2][c*2+1],channel[y*2+1][c*2],channel[y*2+1][c*2+1]))));

export function forward(model,pixels,w,{disabled_neuron=-1,negative_slope=0,use_positions=true}={}) {
  if(pixels.length!==784 || pixels.some(v=>!Number.isFinite(v)||v<0||v>255)) throw Error('Draw a 28 × 28 image with values in [0,255].');
  const x=pixels.map(v=>v/255); let logits, detail;
  if(model==='mlp') {
    const pre1=linear(x,w,'fc1'), hidden1=pre1.map(relu);
    if(disabled_neuron>=0) hidden1[disabled_neuron]=0;
    const pre2=linear(hidden1,w,'fc2'), hidden2=pre2.map(relu);
    logits=linear(hidden2,w,'fc3'); detail={pre1,hidden1,pre2,hidden2,disabled_neuron};
  } else if(model==='cnn') {
    const input=vector(32,y=>vector(32,c=>(y>=2&&y<30&&c>=2&&c<30)?x[(y-2)*28+c-2]:0));
    const conv1=conv([input],w['conv1.weight'],w['conv1.bias']);
    const relu1=map(conv1,v=>v>0?v:negative_slope*v), pool1=pool(relu1);
    const conv2=conv(pool1,w['conv2.weight'],w['conv2.bias']);
    const relu2=map(conv2,v=>v>0?v:negative_slope*v), pool2=pool(relu2);
    const pre1=linear(pool2.flat(2),w,'fc1'), hidden1=pre1.map(relu);
    const pre2=linear(hidden1,w,'fc2'), hidden2=pre2.map(relu);
    logits=linear(hidden2,w,'fc3');
    detail={input,conv1,relu1,pool1,conv2,relu2,pool2,pre1,hidden1,pre2,hidden2,negative_slope};
  } else if(model==='transformer') {
    const patches=vector(16,p=>vector(49,i=>x[(Math.floor(p/4)*7+Math.floor(i/7))*28+(p%4)*7+i%7]));
    const embedded=linear(patches,w,'patch'); let tokens=[w.cls[0][0].slice(),...embedded];
    if(use_positions) tokens=add(tokens,w.pos[0]);
    const initial=tokens, blocks=[];
    for(let block=0;block<2;block++) {
      const prefix='blocks.'+block, qkv=linear(norm(tokens,w,prefix+'.norm1'),w,prefix+'.qkv');
      const [q,k,v]=vector(3,part=>vector(3,head=>qkv.map(row=>row.slice(part*48+head*16,part*48+(head+1)*16))));
      const scores=q.map((head,h)=>head.map(query=>k[h].map(key=>query.reduce((s,val,i)=>s+val*key[i],0)/4)));
      const attention=scores.map(head=>head.map(softmax));
      const mixed=attention.map((head,h)=>head.map(row=>vector(16,d=>row.reduce((s,a,t)=>s+a*v[h][t][d],0))));
      const projected=linear(vector(17,t=>mixed.flatMap(head=>head[t])),w,prefix+'.proj');
      const residual=add(tokens,projected);
      const ffn=linear(map(linear(norm(residual,w,prefix+'.norm2'),w,prefix+'.fc1'),gelu),w,prefix+'.fc2');
      tokens=add(residual,ffn);
      blocks.push({q,k,v,scores,attention,mixed,projected,residual,ffn,output:tokens});
    }
    logits=linear(norm(tokens,w,'norm')[0],w,'head'); detail={patches,embedded,initial,blocks,use_positions};
  } else throw Error('Unknown model');
  const probabilities=softmax(logits);
  return {model,logits,probabilities,prediction:probabilities.indexOf(Math.max(...probabilities)),detail};
}
