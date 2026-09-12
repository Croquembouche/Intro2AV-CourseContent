/* Direct manipulation and experimental controls for the teaching simulations. */
'use strict';
let gesture=null;
const scanRandom=E.rng(203);
function captureScan(){
 const noise=Number($('#range-noise').value);
 return E.scan(Lab.truth,Number($('#beams').value)).map(p=>{
  const r=Math.hypot(...p),d=Math.max(.05,r+noise*E.normal(scanRandom));
  return p.map(v=>v*d/r);
 });
}
function interactionMode(){
 const amcl=Lab.mode==='amcl';
 for(const o of $('#map-action').options)o.disabled=(o.value==='prior'&&!amcl)||(o.value==='guess'&&amcl);
 $('#map-action').value=amcl?'kidnap':'guess';
 $('#prior-spread-label').hidden=!amcl;
 $('#motion-noise').disabled=!amcl;
 $('#beams').value=amcl?'24':'72';
 Lab.selection=null;$('#inspect-result').textContent='Choose Inspect and click a point, particle, or map cell to examine its evidence.';
 updateHint();
}
function updateHint(){
 const action=$('#map-action').value;
 $('#map-hint').textContent=action==='inspect'?'Click a scan point (ICP), particle (AMCL), or map cell (NDT) to inspect it.':'Click to place; drag from a position toward the desired heading. This changes '+({guess:'the estimate only.',kidnap:'the vehicle only; the estimator is not informed.',prior:'the particle prior only; the vehicle stays where it is.'}[action]);
}
function validVehicle(t){return t[0]>.15&&t[0]<11.85&&t[1]>.15&&t[1]<7.85&&E.wallDistance(t)>.12;}
function applyPose(t){
 if(!t.every(Number.isFinite)){ $('#inspect-result').textContent='Enter finite x, y, and heading values.';return; }
 stop();const action=$('#map-action').value;
 if(action==='inspect'){inspectAt(t);return;}
 if((action==='kidnap'||action==='prior')&&!validVehicle(t)){$('#inspect-result').textContent='Choose a free position inside the map, away from a wall.';return;}
 Lab.selection=null;Lab.pairs=[];
 if(action==='guess'){Lab.pose=[...t];Lab.iteration=0;Lab.message='User pose guess';}
 if(action==='kidnap'){Lab.truth=[...t];Lab.points=captureScan();Lab.phase=1;Lab.message='Vehicle placed; estimator not informed';}
 if(action==='prior'){
  const pf=new E.ParticleFilter(false,57),spread=Number($('#prior-spread').value);
  pf.particles=Array.from({length:800},()=>{let q;let tries=0;do{q=[t[0]+spread*E.normal(pf.r),t[1]+spread*E.normal(pf.r),E.wrap(t[2]+.35*E.normal(pf.r))];}while(!validVehicle(q)&&++tries<100);return{t:validVehicle(q)?q:[...t],w:1/800};});
  Lab.pf=pf;Lab.phase=1;Lab.message='User particle prior';
 }
 $('#pose-x').value=t[0].toFixed(2);$('#pose-y').value=t[1].toFixed(2);$('#pose-heading').value=(E.wrap(t[2])*180/Math.PI).toFixed(1);
 $('#inspect-result').textContent=Lab.message+'. Advance the algorithm to see its response.';draw();
}
function drive(distance,turn){
 stop();Lab.selection=null;
 if(distance&&E.ray(Lab.truth,distance>0?0:Math.PI)<Math.abs(distance)+.15){$('#inspect-result').textContent='Movement blocked by a wall. Turn before moving.';return;}
 const u=[distance,0,turn],xy=E.transform(u,Lab.truth),next=[xy[0],xy[1],E.wrap(Lab.truth[2]+turn)];
 if(!validVehicle(next)){$('#inspect-result').textContent='Movement blocked by a wall.';return;}
 Lab.truth=next;Lab.points=captureScan();Lab.pairs=[];
 if(Lab.mode==='amcl'){
  Lab.pf.predict(u,Number($('#motion-noise').value));Lab.pf.weight(Lab.points,Number($('#sigma').value));Lab.pf.resample(Number($('#epsilon').value),$('#adaptive').checked);Lab.phase=0;Lab.message='Driven: prediction, measurement, resampling';
 }else{Lab.message='Vehicle moved; new scan awaits alignment';}
 Lab.iteration++;$('#inspect-result').textContent=Lab.mode==='amcl'?'One commanded move and one full filter update completed.':'The scan changed; the estimated map pose was retained. Use Step or Play to align it.';draw();
}
function inspectAt(p){
 stop();let selection;
 if(Lab.mode==='icp'){
  const transformed=Lab.points.map(q=>E.transform(q,Lab.pose));let i=0;transformed.forEach((q,j)=>{if(Math.hypot(q[0]-p[0],q[1]-p[1])<Math.hypot(transformed[i][0]-p[0],transformed[i][1]-p[1]))i=j;});
  const n=E.nearest(transformed[i],map),d=Math.sqrt(n.d),accepted=d<=Number($('#gate').value);
  selection={point:transformed[i],target:n.q};$('#inspect-result').textContent=`Scan point ${i+1}: nearest-map distance ${d.toFixed(3)} m; ${accepted?'accepted':'rejected'} by the ${Number($('#gate').value).toFixed(1)} m gate. This is the correspondence at the current pose.`;
 }else if(Lab.mode==='amcl'){
  const particle=Lab.pf.particles.reduce((a,b)=>Math.hypot(a.t[0]-p[0],a.t[1]-p[1])<Math.hypot(b.t[0]-p[0],b.t[1]-p[1])?a:b);
  selection={point:particle.t,particle};$('#inspect-result').textContent=`Particle: x ${particle.t[0].toFixed(2)} m, y ${particle.t[1].toFixed(2)} m, heading ${(particle.t[2]*180/Math.PI).toFixed(1)}°. Weight ${(100*particle.w).toFixed(3)}%. Teal endpoints show the measured scan at this hypothesis. Compare their agreement with the walls.`;
 }else{
  const key=p.slice(0,2).map(v=>Math.floor(v/Lab.grid.size)),cell=Lab.grid.cells.find(c=>c.k[0]===key[0]&&c.k[1]===key[1]);
  selection={cellKey:key,point:p};
  $('#inspect-result').textContent=cell?`Cell [${key}]: ${cell.n} map points; mean (${cell.mu.map(v=>v.toFixed(2)).join(', ')}) m. Covariance [[${cell.xx.toFixed(3)}, ${cell.xy.toFixed(3)}], [${cell.xy.toFixed(3)}, ${cell.yy.toFixed(3)}]] m². This describes map geometry, not pose confidence.`:`Cell [${key}] has fewer than five map points; no Gaussian is fitted here. The scorer also considers neighboring cells.`;
 }
 Lab.selection=selection;draw();
}
function interactionDraw(){
 const s=Lab.selection;
 if(s){
  dot(s.point,'#009c9c',7);
  if(s.target)line(s.point,s.target,'#009c9c',4);
  if(s.particle)for(const p of Lab.points)dot(E.transform(p,s.particle.t),'#009c9c',4);
  if(s.cellKey){const size=Lab.grid.size,[x,y]=s.cellKey;for(const[a,b]of [[[x,y],[x+1,y]],[[x+1,y],[x+1,y+1]],[[x+1,y+1],[x,y+1]],[[x,y+1],[x,y]]])line(a.map(v=>v*size),b.map(v=>v*size),'#009c9c',4);}
 }
 if(gesture){dot(gesture.start,'#c23d65',7);line(gesture.start,gesture.end,'#c23d65',4);}
}
function mapPoint(event){const r=canvas.getBoundingClientRect();return[((event.clientX-r.left)*960/r.width-85)/59,(565-(event.clientY-r.top)*650/r.height)/59];}
canvas.addEventListener('pointerdown',event=>{if(event.button!==0)return;stop();canvas.focus({preventScroll:true});const p=mapPoint(event);if(p[0]<0||p[0]>12||p[1]<0||p[1]>8)return;if($('#map-action').value==='inspect'){inspectAt(p);return;}gesture={start:p,end:p,id:event.pointerId};canvas.setPointerCapture(event.pointerId);draw();});
canvas.addEventListener('pointermove',event=>{if(gesture){gesture.end=mapPoint(event);draw();}});
canvas.addEventListener('pointerup',event=>{if(!gesture)return;const g=gesture;gesture=null;const p=mapPoint(event),d=Math.hypot(p[0]-g.start[0],p[1]-g.start[1]);const current=$('#map-action').value==='guess'?Lab.pose:$('#map-action').value==='prior'?Lab.pf.estimate():Lab.truth;applyPose([...g.start,d>.15?Math.atan2(p[1]-g.start[1],p[0]-g.start[0]):current[2]]);});
canvas.addEventListener('pointercancel',()=>{gesture=null;draw();});
const commands={forward:[.3,0],back:[-.3,0],left:[0,Math.PI/12],right:[0,-Math.PI/12]};
document.querySelectorAll('[data-drive]').forEach(b=>b.onclick=()=>drive(...commands[b.dataset.drive]));
canvas.addEventListener('keydown',event=>{const key={w:'forward',ArrowUp:'forward',s:'back',ArrowDown:'back',a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right'}[event.key];if(key){event.preventDefault();drive(...commands[key]);}});
$('#map-action').onchange=updateHint;
$('#apply-pose').onclick=()=>applyPose([Number($('#pose-x').value),Number($('#pose-y').value),Number($('#pose-heading').value)*Math.PI/180]);
$('#new-scan').onclick=()=>{stop();Lab.points=captureScan();Lab.selection=null;Lab.pairs=[];if(Lab.mode==='amcl')Lab.phase=1;Lab.message='New scan captured';draw();};
Object.assign(Lab,{applyPose,drive,inspectAt,captureScan});interactionMode();draw();
for(const id of ['motion-noise','range-noise','prior-spread','sigma','gate']){
 const input=$('#'+id),out=document.createElement('output');out.style.fontWeight='bold';out.style.marginLeft='8px';out.textContent=Number(input.value).toFixed(2);input.parentElement.insertBefore(out,input);input.addEventListener('input',()=>{out.textContent=Number(input.value).toFixed(2);});
}
