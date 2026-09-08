// Network topology and local calculations share the exported model's actual tensors.
export const flat = a => a.flat(Infinity);
export const sum = a => a.reduce((x,y)=>x+y,0);
export const format = v => Number(v).toFixed(4);
export function layersFor(model, image, result) {
  const d=result?.detail;
  const dense=(id,label,n,y,values,source,weight)=>({id,label,kind:'dense',rows:1,cols:n,channels:1,y,width:n===10?170:n*(model==='mlp'?4.1:2.8),values:[values||Array(n).fill(0)],source,weight});
  const maps=(id,label,ch,n,y,values,source,kind)=>({id,label,kind,rows:n,cols:n,channels:ch,y,width:ch===1?(model==='mlp'?148:76):ch<=6?500:560,values:values?values.map(flat):Array.from({length:ch},()=>Array(n*n).fill(0)),source});
  const output=(y,source,weight)=>dense('output','Output layer · 10 digits',10,y,result?.probabilities,source,weight);
  if(model==='mlp') return [
    maps('input','Input layer · 784 pixels',1,28,0,[image],'','input'),
    dense('hidden1','Fully connected 1 · 300',300,55,d?.hidden1,'input','fc1'),
    dense('hidden2','Fully connected 2 · 100',100,104,d?.hidden2,'hidden1','fc2'),
    output(145,'hidden2','fc3')
  ];
  if(model==='cnn') {
    const padded=d?.input||Array.from({length:32},(_,r)=>Array.from({length:32},(_,c)=>(r>=2&&r<30&&c>=2&&c<30)?image[(r-2)*28+c-2]:0));
    return [maps('input','Input layer · 32 × 32 padded',1,32,0,[padded],'','input'),
      maps('relu1','Convolution 1 · 6 maps',6,28,34,d?.relu1,'input','conv'),
      maps('pool1','Max pooling 1 · 6 maps',6,14,60,d?.pool1,'relu1','pool'),
      maps('relu2','Convolution 2 · 16 maps',16,10,90,d?.relu2,'pool1','conv'),
      maps('pool2','Max pooling 2 · 16 maps',16,5,114,d?.pool2,'relu2','pool'),
      dense('hidden1','Fully connected 1 · 120',120,143,d?.hidden1,'pool2','fc1'),
      dense('hidden2','Fully connected 2 · 100',100,173,d?.hidden2,'hidden1','fc2'),output(203,'hidden2','fc3')];
  }
  const tokens=(id,label,y,values,source)=>({id,label,kind:'tokens',rows:17,cols:48,channels:1,y,width:180,values:[values?flat(values):Array(17*48).fill(0)],source});
  const attention=(i,y)=>({id:'attention'+(i+1),label:`Attention ${i+1} · 3 heads`,kind:'attention',rows:17,cols:17,channels:3,y,width:260,values:d?d.blocks[i].attention.map(flat):Array.from({length:3},()=>Array(289).fill(0)),source:i?'tokens1':'tokens0',block:i});
  return [maps('input','Input image · 16 patches',1,28,0,[image],'','patches'),
    tokens('tokens0','Patch + position tokens · 17 × 48',31,d?.initial,'input'),attention(0,67),
    tokens('tokens1','Block 1 output · 17 × 48',100,d?.blocks[0].output,'tokens0'),attention(1,134),
    tokens('tokens2','Block 2 output · 17 × 48',167,d?.blocks[1].output,'tokens1'),output(205,'tokens2','head')];
}
export function inspectNode(S, layer, channel, index) {
  const R=S.result, W=S.weights, d=R?.detail;
  const row=Math.floor(index/layer.cols),col=index%layer.cols;
  const record={layer:layer.id,channel,index,row,col,title:layer.label.split(' · ')[0],subtitle:`Unit ${index}${layer.channels>1?` · ${layer.kind==='attention'?'head':'map'} ${channel+1}`:''}`,links:[],value:layer.values[channel][index],formula:'',inputGrid:null,weightGrid:null,gridSize:0};
  if(!R||!W) return {...record,formula:'Waiting for a ROS activation message.'};
  const source=S.layers.find(l=>l.id===layer.source);
  if(layer.kind==='input'||layer.kind==='patches') {
    record.formula=`Pixel / 255 = ${format(record.value)}`;
    if(S.model==='mlp') for(let n=0;n<300;n++)record.links.push({layer:'hidden1',channel:0,index:n,weight:W['fc1.weight'][n][index],outgoing:true});
    return record;
  }
  if(layer.kind==='dense') {
    const pre=layer.id==='output'?R.logits[index]:d[layer.id==='hidden1'?'pre1':'pre2'][index];
    const weight=W[layer.weight+'.weight'][index],bias=W[layer.weight+'.bias'][index];
    if(S.model==='transformer') {
      record.formula=`LayerNorm(CLS) · class weights + bias → logit ${format(pre)} → softmax`;
      for(let j=0;j<48;j++)record.links.push({layer:'tokens2',channel:0,index:j,weight:weight[j]});
    }else {
      let inputs=source.values.flat();
      inputs.forEach((v,i)=>record.links.push({layer:source.id,channel:Math.floor(i/(source.rows*source.cols)),index:i%(source.rows*source.cols),weight:weight[i]}));
      record.weighted=pre;
      record.formula=layer.id==='output'?`logit ${format(pre)} → softmax = ${format(record.value)}`:`Σ(input × weight) + ${format(bias)} = ${format(pre)}; ReLU → ${format(record.value)}`;
      if(S.model==='mlp'&&layer.id==='hidden1'&&d.disabled_neuron===index) record.formula=`Σ(input × weight) + bias = ${format(pre)}; ReLU = ${format(Math.max(0,pre))}; disabled by ROS parameter → 0`;
      if(S.model==='mlp'&&layer.id==='hidden1'){record.inputGrid=inputs;record.weightGrid=weight;record.gridSize=28;}
      else {record.contributions=inputs.map((v,i)=>({label:i,value:v*weight[i]})).sort((a,b)=>Math.abs(b.value)-Math.abs(a.value)).slice(0,8);}
    }
    return record;
  }
  if(layer.kind==='conv') {
    const prefix=layer.id==='relu1'?'conv1':'conv2',kernels=W[prefix+'.weight'][channel],pre=d[prefix][channel][row][col];
    const shown=Math.min(S.inputChannel||0,source.channels-1);
    record.title+=` · map ${channel+1}`;record.subtitle=`Row ${row}, column ${col}`;
    record.inputGrid=[];record.weightGrid=flat(kernels[shown]);record.gridSize=5;
    for(let ch=0;ch<source.channels;ch++)for(let r=0;r<5;r++)for(let c=0;c<5;c++){
      let sourceIndex=(row+r)*source.cols+col+c;
      record.links.push({layer:source.id,channel:ch,index:sourceIndex,weight:kernels[ch][r][c]});
      if(ch===shown) record.inputGrid.push(source.values[ch][sourceIndex]);
    }
    record.weighted=pre;record.formula=`${source.channels*25} products + bias ${format(W[prefix+'.bias'][channel])} = ${format(pre)}; ${d.negative_slope?'leaky ReLU':'ReLU'} → ${format(record.value)}`;
    record.note=source.channels>1?`Preview: input map ${shown+1} of ${source.channels}. Connections include all ${source.channels} input maps.`:'The same 5 × 5 learned filter is shared at every position.';
    return record;
  }
  if(layer.kind==='pool') {
    record.inputGrid=[];record.gridSize=2;
    for(let r=0;r<2;r++)for(let c=0;c<2;c++){
      let i=(row*2+r)*source.cols+col*2+c;let v=source.values[channel][i];
      record.links.push({layer:source.id,channel,index:i,weight:v===record.value?1:0});record.inputGrid.push(v);
    }
    record.formula=`max(${record.inputGrid.map(format).join(', ')}) = ${format(record.value)}`;record.note='Four local responses become one; stride = 2.';return record;
  }
  if(layer.kind==='attention') {
    const b=d.blocks[layer.block],a=b.attention[channel][row],key=col,dimension=S.dimension||0;
    record.title=`Block ${layer.block+1} · head ${channel+1}`;record.subtitle=`Query ${row===0?'CLS':row} → key ${key===0?'CLS':key}`;
    a.forEach((w,t)=>record.links.push({layer:source.id,channel:0,index:t*48+24,weight:w,token:t}));
    record.weighted=b.scores[channel][row][key];record.formula=`Q · K / √16 = ${format(record.weighted)}; softmax over 17 keys → ${format(record.value)}`;
    record.inputGrid=a.slice(1);record.gridSize=4;record.gridLabel='Attention over patches';record.note=`CLS weight ${format(a[0])}. Row sum ${format(sum(a))}. These are learned mixing weights, not object labels.`;
    record.contributions=a.map((w,t)=>({label:t===0?'CLS':t,value:w*b.v[channel][t][dimension]}));record.mixed=b.mixed[channel][row][dimension];
    return record;
  }
  if(layer.id==='tokens0') {
    if(row===0)record.formula=d.use_positions?'Learned CLS token + its learned position vector.':'Learned CLS token; positions disabled by ROS parameter.';
    else {
      const patch=row-1,r0=Math.floor(patch/4)*7,c0=patch%4*7;
      for(let r=0;r<7;r++)for(let c=0;c<7;c++)record.links.push({layer:'input',channel:0,index:(r0+r)*28+c0+c,weight:W['patch.weight'][col][r*7+c]});
      record.inputGrid=d.patches[patch];record.weightGrid=W['patch.weight'][col];record.gridSize=7;
      record.formula=`49 pixels · projection weights + bias${d.use_positions?' + position':''} = ${format(record.value)}`;
    }
  }else {
    const block=layer.id==='tokens1'?0:1,b=d.blocks[block],head=S.head||0,a=b.attention[head][row];
    a.forEach((w,t)=>record.links.push({layer:source.id,channel:0,index:t*48+24,weight:w,token:t}));
    record.subtitle=`Token ${row===0?'CLS':row} · dimension ${col}`;
    record.formula=`Residual after attention ${format(b.residual[row][col])} + feed-forward ${format(b.ffn[row][col])} = ${format(record.value)}`;
    record.note=`Lines show head ${head+1}'s token mixing. The final value also uses all heads, output projection, residuals and the feed-forward network.`;
    record.inputGrid=a.slice(1);record.gridSize=4;record.gridLabel='Selected head’s attention';
  }
  return record;
}
