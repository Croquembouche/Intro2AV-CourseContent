import {NetworkScene} from './network-scene.js';
import {format} from './network-data.js';
import {api,isBrowser} from './runtime.js';
import {inputStatus} from './input-status.js';
const $=id=>document.getElementById(id),names=['mlp','cnn','transformer'];
const state={model:'mlp',image:Array(784).fill(0),pixels:[],results:{},weights:{},nodes:{},head:0,dimension:0,inputChannel:0,id:null,received:-1};
let meta=null,view=null,drawing=false,erasing=false,point=null,dirtyInput=false,sending=false,lastSend=0,sampleDigit=7,sampleVariant=0,polling=false,lastSignature='',ownIds=new Set(),pending=null;
const pad=$('drawing'),ctx=pad.getContext('2d');
let queuedManual=false;
function notice(text){$('notice').textContent=text;$('notice').hidden=!text;}
function padPixels(){const small=document.createElement('canvas');small.width=28;small.height=28;const s=small.getContext('2d');s.drawImage(pad,0,0,28,28);const bytes=s.getImageData(0,0,28,28).data;return Array.from({length:784},(_,i)=>bytes[i*4]);}
function putPixels(pixels,canvas=pad){const temp=document.createElement('canvas');temp.width=28;temp.height=28;const t=temp.getContext('2d'),data=t.createImageData(28,28);pixels.forEach((v,i)=>{data.data[i*4]=data.data[i*4+1]=data.data[i*4+2]=v;data.data[i*4+3]=255});t.putImageData(data,0,0);const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(temp,0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=true;}
function preview(){const status=inputStatus(padPixels(),state.pixels,!!state.results[state.model],sending||!!pending);$('inputStatus').textContent=status.text;$('inputStatus').dataset.state=status.kind;}
async function publish(automatic=false){
 if(automatic&&!$('live').checked)return;
 if(sending){dirtyInput=true;queuedManual=queuedManual||!automatic;return}
 sending=true;dirtyInput=false;queuedManual=false;lastSend=performance.now();const pixels=padPixels();preview();
 try{const response=await api('/api/infer',{pixels});ownIds.add(response.input_id);if(ownIds.size>60)ownIds.delete(ownIds.values().next().value);pending=response.input_id;notice('');if(isBrowser)await poll();}
 catch(e){pending=null;notice(e.message)}
 finally{sending=false;preview();if(dirtyInput){const manual=queuedManual;dirtyInput=false;queuedManual=false;setTimeout(()=>publish(!manual),80)}}
}
function pointAt(e){const r=pad.getBoundingClientRect();return [(e.clientX-r.left)*280/r.width,(e.clientY-r.top)*280/r.height]}
pad.onpointerdown=e=>{drawing=true;point=pointAt(e);pad.setPointerCapture(e.pointerId);ctx.fillStyle=erasing?'black':'white';ctx.beginPath();ctx.arc(...point,erasing?17:12,0,Math.PI*2);ctx.fill();preview();publish(true)};
pad.onpointermove=e=>{if(!drawing)return;const p=pointAt(e);ctx.strokeStyle=erasing?'black':'white';ctx.lineWidth=erasing?34:24;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(...point);ctx.lineTo(...p);ctx.stroke();point=p;preview();if($('live').checked){dirtyInput=true;if(performance.now()-lastSend>120)publish(true)}};
pad.onpointerup=()=>{drawing=false;publish(true)};pad.onpointercancel=()=>drawing=false;
function graphState(){return {model:state.model,image:state.image,result:state.results[state.model],weights:state.weights[state.model],head:state.head,dimension:state.dimension,inputChannel:state.inputChannel};}
function refreshGraph(){const rebuilt=view.setState(graphState());if(rebuilt)makeLayers();}
function makeLayers(){const layers=view.state.layers;$('layers').replaceChildren();$('inspectLayer').replaceChildren();for(const layer of layers){const row=document.createElement('div');row.className='layerRow';row.dataset.layer=layer.id;const label=document.createElement('span');label.textContent=layer.label;const button=document.createElement('button');button.textContent='Hide';button.setAttribute('aria-label','Hide '+layer.label);button.onclick=()=>{view.toggle(layer.id);const hidden=view.hidden.has(layer.id);row.classList.toggle('off',hidden);button.textContent=hidden?'Show':'Hide';button.setAttribute('aria-label',(hidden?'Show ':'Hide ')+layer.label)};row.append(label,button);$('layers').append(row);const option=document.createElement('option');option.value=layer.id;option.textContent=layer.label;$('inspectLayer').append(option)}$('inspectLayer').value=state.model==='transformer'?'attention1':state.model==='cnn'?'relu1':'hidden1';inspectorLimits();}
function inspectorLimits(){const layer=view.state.layers.find(l=>l.id===$('inspectLayer').value);$('inspectChannel').max=layer.channels;$('inspectIndex').max=layer.rows*layer.cols-1;$('inspectChannel').value=1;$('inspectIndex').value=state.model==='mlp'&&layer.id==='hidden1'?150:0;}
function canvasSurface(canvas,height){
 const width=canvas.clientWidth||220,ratio=Math.min(devicePixelRatio||1,2);
 canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
 const c=canvas.getContext('2d');c.setTransform(ratio,0,0,ratio,0,0);
 return {c,width,height};
}
function drawGrid(canvas,values,n,signed=false){
 const {c,width}=canvasSurface(canvas,canvas.clientWidth||220),uiScale=parseFloat(getComputedStyle(document.documentElement).fontSize)/18;
 const max=Math.max(.00001,...values.map(Math.abs)),cell=width/n;
 values.forEach((value,i)=>{
  const a=Math.min(1,Math.abs(value)/(signed?max:Math.max(1,max)));
  const rgb=signed?(value<0?[25+a*90,5+a*30,30+a*155]:[0,12+a*220,30+a*225]):[a*255,a*255,a*255];
  c.fillStyle=`rgb(${rgb.join(',')})`;c.fillRect((i%n)*cell,Math.floor(i/n)*cell,cell+.2,cell+.2);
  if(n<=5){
   const luminance=rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((v,x,j)=>v+x*[.2126,.7152,.0722][j],0);
   c.fillStyle=luminance>.18?'#000':'#fff';c.font=`600 ${n===2?21*uiScale:Math.max(13*uiScale,Math.min(16*uiScale,cell*.36))}px Arial`;
   c.textAlign='center';c.textBaseline='middle';c.fillText(value!==0&&Math.abs(value)<.01?value.toExponential(0):value.toFixed(2),(i%n+.5)*cell,(Math.floor(i/n)+.5)*cell);
  }
 });
}
function drawContributions(record){
 const uiScale=parseFloat(getComputedStyle(document.documentElement).fontSize)/18;
 const {c,width}=canvasSurface($('contributions'),132*uiScale),left=12*uiScale,right=width-12*uiScale,baseline=62*uiScale;
 const terms=record.mixed===undefined?record.contributions.slice().sort((a,b)=>Math.abs(b.value)-Math.abs(a.value)).slice(0,8):record.contributions;
 const max=Math.max(.0001,...terms.map(d=>Math.abs(d.value))),w=(right-left)/terms.length;
 c.strokeStyle='#89a9bf';c.beginPath();c.moveTo(left,baseline);c.lineTo(right,baseline);c.stroke();
 terms.forEach((d,i)=>{
  const h=d.value/max*29*uiScale,x=left+i*w;
  c.fillStyle=d.value>=0?'#38e7f3':'#d6acff';c.fillRect(x,baseline-Math.max(h,0),w*.68,Math.abs(h));
  c.fillStyle='#f1f7fc';c.font=`${14*uiScale}px Arial`;c.textAlign='center';c.fillText(d.label,x+w*.35,119*uiScale);
 });
 c.fillStyle='#fff';c.font=`${16*uiScale}px Arial`;c.textAlign='left';
 c.fillText(record.mixed!==undefined?`Row mixing: Σ a × V[${state.dimension}] = ${format(record.mixed)}`:record.contributionLabel||'Largest input × weight contributions',12*uiScale,21*uiScale);
}
function inspect(record,screen,pinned){const panel=$('inspector');if(!record){panel.hidden=true;return}panel.hidden=false;panel.classList.toggle('pinned',pinned);$('nodeTitle').textContent=record.title;$('nodeSubtitle').textContent=record.subtitle;$('nodeOutput').textContent=format(record.value);$('calculation').textContent=record.formula;$('weightedRow').hidden=record.weighted===undefined;$('weighted').textContent=record.weighted===undefined?'':format(record.weighted);$('weightedLabel').textContent=record.weightedLabel||'Weighted input';$('outputLabel').textContent=record.outputLabel||'Output';$('nodeNote').textContent=record.note||'';$('connectionCount').textContent=record.connectionLabel||record.links.length+' connections';$('pinHint').textContent=pinned?'Pinned · Esc to release':'Click a cube to pin';panel.dataset.layer=record.layer;panel.dataset.unit=record.index;panel.dataset.channel=record.channel;
 if(record.layer.startsWith('attention')){state.head=record.channel;view.state.head=state.head;$('head').value=state.head;}
 if(pinned&&$('inspectLayer').value===record.layer){$('inspectChannel').value=record.channel+1;$('inspectIndex').value=record.index;}
 $('gridPair').hidden=!record.inputGrid;$('weightWrap').hidden=!record.weightGrid;$('gridPair').classList.toggle('single',!record.weightGrid);$('gridLabel').textContent=record.gridLabel||'Input values';if(record.inputGrid)drawGrid($('inputGrid'),record.inputGrid,record.gridSize,record.inputGrid.some(v=>v<0)||record.gridLabel!==undefined);if(record.weightGrid)drawGrid($('weightGrid'),record.weightGrid,record.gridSize,true);
 $('contributions').hidden=!record.contributions;if(record.contributions)drawContributions(record);
 const width=panel.offsetWidth,height=panel.offsetHeight;
 const top=document.querySelector('header').getBoundingClientRect().bottom+10;
 const bottom=document.querySelector('footer').getBoundingClientRect().top-10;
 let x=screen.x+20,y=screen.y-height-18;
 if(x+width>innerWidth-12)x=screen.x-width-20;
 if(y<top)y=screen.y+20;
 panel.style.left=Math.max(12,Math.min(x,innerWidth-width-12))+'px';
 panel.style.top=Math.max(top,Math.min(y,bottom-height))+'px';
}

function predictions(){const r=state.results[state.model];const rank=r?r.probabilities.map((p,i)=>({p,i})).sort((a,b)=>b.p-a.p):[];$('guess').textContent=rank.length?rank[0].i:'—';$('second').textContent=rank.length?rank[1].i:'—';$('confidence').textContent=rank.length?(rank[0].p*100).toFixed(1)+'%':'';preview();}
async function poll(){if(polling)return;polling=true;try{const data=await api('/api/state');state.nodes=data.nodes;const count=names.filter(n=>data.nodes[n]).length;$('connection').textContent=`${isBrowser?'In your browser':'ROS 2'} · ${count}/3 models${state.results[state.model]?' · '+state.results[state.model].inference_ms.toFixed(1)+' ms':''}`;$('messageCount').textContent=isBrowser?'The hosted demo computes on your device. Launch the downloaded packages to publish and inspect real ROS messages.':`${data.received} activation messages received. Input: ${data.input_id||'none'}.`;
 const signature=data.input_id+':'+data.received;if(signature!==lastSignature){lastSignature=signature;const external=data.input_id!==state.id&&!ownIds.has(data.input_id);if(data.pixels){state.pixels=data.pixels;state.image=data.pixels.map(v=>v/255);if(external&&!drawing&&!sending)putPixels(data.pixels);putPixels(data.pixels,$('downsample'))}state.id=data.input_id;state.results=data.results;if(data.input_id===pending||external)pending=null;refreshGraph();predictions();syncParameters();}
 if(data.input_id===pending)pending=null;preview();
 if(!isBrowser&&!data.nodes[state.model])notice(`The ${state.model} model node is offline. Run ros2 run ${state.model}_demo model in the same ROS domain.`);else if($('notice').textContent.includes('offline')||$('notice').textContent.includes('disconnected'))notice('');
}catch(e){$('connection').textContent=isBrowser?'Models unavailable':'ROS 2 disconnected';notice(isBrowser?e.message:'ROS 2 is disconnected. Keep the launch terminal running and reload.')}finally{polling=false}}
async function chooseModel(model){state.model=model;view.clearSelection();
 const copy={mlp:['Fully connected network','784 pixels → 300 → 100 → 10 digits','Try shifting the digit. Which connections receive different input?'],cnn:['Convolutional network','Shared filters → activation → pooling → digit scores','Inspect a feature-map cell. Watch the same filter work across the image.'],transformer:['Vision transformer','16 image patches + CLS → 2 attention blocks → digit scores','Select an attention cell. Which query and key are being compared?']}[model];
 $('modelTitle').textContent=copy[0];$('modelStructure').textContent=copy[1];$('teachingPrompt').textContent=copy[2];document.querySelectorAll('[data-model]').forEach(b=>{const selected=b.dataset.model===model;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',selected)});$('transformerControls').hidden=model!=='transformer';$('echoCommand').textContent=`ros2 topic echo --once /neural_demo/${model}/prediction`;refreshGraph();predictions();parameters();syncParameters();const url=new URL(location.href);url.searchParams.set('model',model);history.replaceState(null,'',url);if(!state.weights[model])state.weights[model]=await api('/api/weights/'+model);if(state.model!==model)return;refreshGraph();notice('');}
function parameters(){const root=$('parameterControls');if(state.model==='mlp')root.innerHTML='<label>Disable hidden-1 neuron <input id="disable" type="number" min="-1" max="299" value="-1"> <small>−1 restores all</small></label>';else if(state.model==='cnn')root.innerHTML='<label>Convolution activation slope <select id="slope"><option value="0">0 · trained ReLU</option><option value="0.01">0.01 · leaky ReLU</option><option value="0.1">0.1 · leaky ReLU</option><option value="0.3">0.3 · leaky ReLU</option></select><small>Dense layers keep ReLU.</small></label>';else root.innerHTML='<label><input type="checkbox" id="positions" checked> Add learned position vectors</label>';
 const configModel=state.model;const apply=async values=>{try{await api('/api/config',{model:configModel,values});await publish()}catch(e){notice(e.message);syncParameters()}};
 let disableTimer;if($('disable'))$('disable').oninput=e=>{clearTimeout(disableTimer);const value=+e.target.value;if(e.target.value!==''&&Number.isInteger(value)&&value>=-1&&value<=299)disableTimer=setTimeout(()=>apply({disabled_neuron:value}),250)};if($('slope'))$('slope').onchange=e=>apply({negative_slope:+e.target.value});if($('positions'))$('positions').onchange=e=>apply({use_positions:e.target.checked});}
function syncParameters(){const d=state.results[state.model]?.detail;if(!d)return;if($('disable'))$('disable').value=d.disabled_neuron;if($('slope'))$('slope').value=d.negative_slope;if($('positions'))$('positions').checked=d.use_positions;}
function example(digit,next=false){sampleDigit=digit;if(next)sampleVariant=(sampleVariant+1)%3;else sampleVariant=0;const s=meta.samples.filter(s=>s.label===digit)[sampleVariant];putPixels(s.pixels);$('example').value=digit;publish()}
$('clear').onclick=()=>{ctx.fillStyle='black';ctx.fillRect(0,0,280,280);preview();publish()};$('pen').onclick=()=>{erasing=false;$('pen').classList.add('active');$('eraser').classList.remove('active')};$('eraser').onclick=()=>{erasing=true;$('eraser').classList.add('active');$('pen').classList.remove('active')};$('run').onclick=()=>publish();$('live').onchange=()=>{if($('live').checked)publish(true);else if(!queuedManual)dirtyInput=false};$('example').onchange=e=>{if(e.target.value!=='')example(+e.target.value)};$('another').onclick=()=>example(sampleDigit,true);
$('center').onclick=()=>{const p=padPixels();let xs=[],ys=[];p.forEach((v,i)=>{if(v>20){xs.push(i%28);ys.push(Math.floor(i/28))}});if(!xs.length)return;const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x+1,h=Math.max(...ys)-y+1,scale=200/Math.max(w,h),copy=document.createElement('canvas');copy.width=280;copy.height=280;copy.getContext('2d').drawImage(pad,0,0);ctx.fillStyle='black';ctx.fillRect(0,0,280,280);ctx.drawImage(copy,x*10,y*10,w*10,h*10,(280-w*scale)/2,(280-h*scale)/2,w*scale,h*scale);publish()};
$('shift').onclick=()=>{const p=padPixels(),out=Array(784).fill(0);for(let r=0;r<28;r++)for(let c=0;c<26;c++)out[r*28+c+2]=p[r*28+c];putPixels(out);publish()};
$('inspectLayer').onchange=inspectorLimits;$('inspect').onclick=()=>{const ok=view.select($('inspectLayer').value,Math.trunc(+$('inspectChannel').value)-1,Math.trunc(+$('inspectIndex').value));if(!ok)notice('Show the layer first, then choose a unit and map within its range.')};$('unpin').onclick=()=>view.clearSelection();document.addEventListener('keydown',e=>{if(e.key==='Escape')view.clearSelection()});$('head').onchange=e=>{state.head=+e.target.value;const s=view.selection;if(s?.layer.kind==='attention')view.select(s.layer.id,state.head,s.index);else refreshGraph()};$('dimension').oninput=e=>{state.dimension=Math.max(0,Math.min(15,Math.trunc(+e.target.value)||0));e.target.value=state.dimension;refreshGraph()};$('resetView').onclick=()=>view.reset();$('flow').onclick=()=>{view.flow=!view.flow;$('flow').classList.toggle('active',view.flow);if(view.flow&&!view.selection){view.select($('inspectLayer').value,Math.trunc(+$('inspectChannel').value)-1,Math.trunc(+$('inspectIndex').value))}$('flow').textContent=view.flow?'Stop trace':'Trace connections'};$('fullScreen').onclick=async()=>{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()};$('rosOpen').onclick=()=>{$('rosDialog').showModal()};$('rosClose').onclick=()=>{$('rosDialog').close()};
document.querySelectorAll('[data-model]').forEach(b=>b.onclick=()=>chooseModel(b.dataset.model).catch(e=>notice(e.message)));
function showPanel(panel){
 document.body.dataset.panel=panel;
 $('showControls').hidden=panel!=='none';
 document.querySelectorAll('.panelSwitch button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.panel===panel));
}
document.querySelectorAll('.panelSwitch button').forEach(b=>b.onclick=()=>showPanel(b.dataset.panel));
$('showControls').onclick=()=>showPanel('drawing');
showPanel('drawing');
async function init(){
 document.body.dataset.runtime=isBrowser?'browser':'ros';
 if(isBrowser){$('downloadRow').hidden=false;$('runtimeExplanation').textContent='This website runs the trained models on your device. Download the companion packages to run the same models as separate ROS 2 nodes, with Image topics, parameters and rosbag replay.';}
 putPixels(Array(784).fill(0));try{view=new NetworkScene($('scene'),inspect);meta=await api('/api/meta');for(let i=0;i<10;i++){const o=document.createElement('option');o.value=i;o.textContent=i;$('example').append(o)}const selected=new URL(location.href).searchParams.get('model');await chooseModel(names.includes(selected)?selected:meta.default_model);await poll();if(!state.id)example(7);setInterval(poll,160);}catch(e){notice('Could not start the 3D explorer: '+e.message)}}
init();
