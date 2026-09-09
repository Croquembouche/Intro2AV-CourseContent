import assert from 'node:assert/strict';

// Reconstruct calculations from model tensors, independent of the diagram labels.
export function checkInspector(S,layer,ch,i,r,close) {
  const {model,result:R,weights:W,layers}=S,d=R.detail,row=Math.floor(i/layer.cols),col=i%layer.cols;
  const input=e=>layers.find(l=>l.id===e.layer).values[e.channel][e.index];
  for(const e of r.links){
    const source=layers.find(l=>l.id===e.layer);assert(source);assert(Number.isFinite(e.weight));
    if(e.kind==='token'){
      assert.equal(source.kind,'tokens');assert(Number.isInteger(e.token)&&e.token>=0&&e.token<source.rows);
      assert(!('index' in e),'Whole-token links must not impersonate scalar feature connections');
    }else{
      assert(Number.isInteger(e.index)&&e.index>=0&&e.index<source.rows*source.cols);
      assert(Number.isInteger(e.channel)&&e.channel>=0&&e.channel<source.channels);assert(Number.isFinite(input(e)));
    }
  }
  assert(!r.formula.includes('ROS'),'Shared inspector copy must apply to both runtimes');
  if(layer.kind==='dense') {
    if(model==='transformer'){
      assert.equal(r.links.length,1);assert.equal(r.links[0].token,0);
      const cls=d.blocks[1].output[0],mean=cls.reduce((a,b)=>a+b,0)/48;
      const std=Math.sqrt(cls.reduce((s,v)=>s+(v-mean)**2,0)/48+1e-5);
      const normalized=cls.map((v,j)=>(v-mean)/std*W['norm.weight'][j]+W['norm.bias'][j]);
      const total=normalized.reduce((s,v,j)=>s+v*W['head.weight'][i][j],W['head.bias'][i]);
      normalized.forEach((v,j)=>close(v,r.normalized[j],'normalized CLS'));
      close(total,R.logits[i],'class logit');close(total,r.weighted,'inspected class logit');
      close(r.contributions.reduce((s,c)=>s+c.value,0)+W['head.bias'][i],total,'class contributions');
    }else{
      const expectedInputs=layers.find(l=>l.id===layer.source);assert.equal(r.links.length,expectedInputs.channels*expectedInputs.rows*expectedInputs.cols);
      const total=r.links.reduce((s,e)=>s+input(e)*e.weight,W[layer.weight+'.bias'][i]);
      close(total,r.weighted,'dense weighted sum');
      if(layer.id!=='output')close(r.value,model==='mlp'&&layer.id==='hidden1'&&d.disabled_neuron===i?0:Math.max(0,total),'dense activation');
    }
    if(layer.id==='output'){
      const max=Math.max(...R.logits),exp=R.logits.map(v=>Math.exp(v-max));
      close(r.value,exp[i]/exp.reduce((a,b)=>a+b,0),'10-class softmax');
    }
  }
  if(layer.kind==='conv'){
    assert.equal(r.links.length,layer.id==='relu1'?25:150);
    const prefix=layer.id==='relu1'?'conv1':'conv2';
    const total=r.links.reduce((s,e)=>s+input(e)*e.weight,W[prefix+'.bias'][ch]);
    close(total,r.weighted,'convolution weighted sum');close(r.value,total>=0?total:total*d.negative_slope,'conv activation');
  }
  if(layer.kind==='pool'){
    assert.equal(r.links.length,4);close(Math.max(...r.links.map(input)),r.value,'max pool');
    for(const e of r.links)assert.equal(e.weight,input(e)===r.value?1:0);
  }
  if(layer.kind==='attention'){
    assert.equal(r.links.length,2);assert.deepEqual(r.links.map(e=>[e.role,e.token]),[['query',row],['key',col]]);
    const b=d.blocks[layer.block],scores=b.k[ch].map(key=>b.q[ch][row].reduce((s,q,j)=>s+q*key[j],0)/4);
    close(scores[col],r.weighted,'selected Q dot K / sqrt(16)');
    const max=Math.max(...scores),exp=scores.map(v=>Math.exp(v-max));
    close(r.value,exp[col]/exp.reduce((a,b)=>a+b,0),'selected attention weight');
    close(r.attentionRow.reduce((a,b)=>a+b,0),1,'whole attention row');
    r.contributions.forEach((c,t)=>close(c.value,b.attention[ch][row][t]*b.v[ch][t][S.dimension||0],'attention times value'));
    close(r.contributions.reduce((s,c)=>s+c.value,0),r.mixed,'weighted V sum');
  }
  if(layer.id==='tokens0'){
    if(row===0){assert.equal(r.links.length,0);close(r.value,W.cls[0][0][col]+(d.use_positions?W.pos[0][0][col]:0),'CLS plus optional position');}
    else{
      assert.equal(r.links.length,49);
      const total=r.links.reduce((s,e)=>s+input(e)*e.weight,W['patch.bias'][col]);
      close(total+(d.use_positions?W.pos[0][row][col]:0),r.value,'patch projection plus optional position');
    }
  }
  if(layer.id==='tokens1'||layer.id==='tokens2'){
    const b=d.blocks[layer.id==='tokens1'?0:1];assert.equal(r.targetToken,row);assert.equal(r.links.length,17);
    close(b.residual[row][col]+b.ffn[row][col],r.value,'block residual plus feed-forward');
    r.links.forEach((e,t)=>{assert.equal(e.token,t);close(e.weight,b.attention[S.head||0][row][t],'grouped attention relationship')});
    close(r.contributions.reduce((s,c)=>s+c.value,0),r.mixed,'block row mixing');
  }
}
