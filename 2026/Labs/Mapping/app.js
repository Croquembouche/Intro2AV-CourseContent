'use strict';
const D=window.MappingData,$=id=>document.getElementById(id),S=$('sensor'),M=$('map'),ctx=S.getContext('2d');
const mapViewer=new MappingScene3D.Viewer(M,$('map-camera-status')),lidarViewer=new MappingScene3D.Viewer($('lidar-scene'),$('scan-camera-status'));
lidarViewer.reference([10,0,0],105,80,5);let mapMode=null;
const state={mode:location.hash==='#challenge'?'challenge':location.hash==='#lidar'?'lidar':'visual',index:location.hash==='#challenge'?60:10,playing:false,selected:null};window.MappingLab={state,data:D,render};
const C={used:'#48f4a2',unused:'#f5a343',plane:'#46d7ff',old:'#738ca8',new:'#48f4a2',path:'#ffc35a',selected:'#e690ff'};let clock=null,renderToken=0;const images=new Map();
function image(i){if(!images.has(i)){const im=new Image();im.src=D.frames[i].image;images.set(i,new Promise(resolve=>{im.onload=()=>resolve(im);im.onerror=()=>resolve(null)}));}return images.get(i)}
function line(c,a,b,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(...a);c.lineTo(...b);c.stroke()}
function point(c,p,color,r=2){c.fillStyle=color;c.beginPath();c.arc(p[0],p[1],r,0,Math.PI*2);c.fill()}
function label(c,t,x,y,size=23,color='#cfdeed'){c.fillStyle=color;c.font=`${size}px Arial`;c.fillText(t,x,y)}
function vpoint(p){return [p[0],p[2],-p[1]]} // camera x-right, y-down, z-forward
function transform(p,T){return T.slice(0,3).map(row=>row[0]*p[0]+row[1]*p[1]+row[2]*p[2]+row[3])}
async function sensorVisual(f,token){const [prev,im]=await Promise.all([image(Math.max(0,state.index-1)),image(state.index)]);if(token!==renderToken)return;ctx.clearRect(0,0,S.width,S.height);if(!im){label(ctx,'Frame unavailable',40,80);return}ctx.drawImage(prev,0,38,1242,375);ctx.drawImage(im,0,455,1242,375);label(ctx,'PREVIOUS FRAME',16,27,23);label(ctx,'CURRENT FRAME',16,443,23);if(!$('overlays').checked)return;
for(const t of f.visual.tracks){if(!t.used&&!$('rejected').checked)continue;const col=t.id===state.selected?C.selected:t.used?C.used:C.unused;const r=t.id===state.selected?8:3;point(ctx,[t.a[0],t.a[1]+38],col,r);point(ctx,[t.b[0],t.b[1]+455],col,r);if($('matches').checked){line(ctx,[t.b[0]-(t.b[0]-t.a[0])*3,t.b[1]+455-(t.b[1]-t.a[1])*3],[t.b[0],t.b[1]+455],col,1.5);if(t.id===state.selected)line(ctx,[t.a[0],t.a[1]+38],[t.b[0],t.b[1]+455],col,2)}if(t.id===state.selected)label(ctx,'Track '+t.id,t.b[0]+12,t.b[1]+446,22,C.selected)} }
function sensorLidar(f){
 const l=f.lidar,used=new Set(l.usedIndices),samples=l.scan.map((p,i)=>({p,i})).filter(t=>$('rejected').checked||used.has(t.i));
 lidarViewer.setCloud(samples,t=>t.p,t=>$('overlays').checked&&used.has(t.i)?C.plane:'#8298ad',3);
 if($('overlays').checked&&$('matches').checked){
  const r=l.pose.slice(0,3).map(row=>row.slice(0,3)),t=l.pose.slice(0,3).map(row=>row[3]);
  const inverse=q=>[0,1,2].map(j=>r.reduce((sum,row,k)=>sum+row[j]*(q[k]-t[k]),0));
  lidarViewer.lines(l.pairs.flatMap(p=>[l.scan[p.source],inverse(p.q)]),C.unused,true);
  lidarViewer.markers(l.pairs.map(p=>inverse(p.q)),C.used,4);
 }
 lidarViewer.markers([[0,0,0]],C.path,10);lidarViewer.draw();
}
function map(f){
 const visual=state.mode==='visual',all=visual?D.visualMap:D.lidarMap;
 if(mapMode!==state.mode){mapViewer.reference(visual?[0,17,0]:[45,0,0],visual?60:220,visual?80:180,visual?5:10);mapMode=state.mode;mapViewer.preset($('view').value)}
 const path=D.frames.slice(0,state.index+1).filter((f,i)=>!visual||i>=5).map(f=>visual?vpoint(f.visual.pose):f.lidar.pose.slice(0,3).map(r=>r[3]));
 const current=path.at(-1)||[0,0,0],items=all.filter(p=>p.at<=state.index&&($('accumulate').checked||p.at===state.index));
 mapViewer.setCloud(items,item=>visual?vpoint(item.p):item.p,item=>item.at===state.index?C.new:C.old,visual?4:2);
 mapViewer.lines(path,C.path);mapViewer.markers([current],C.new,9);
 if(state.selected!==null&&visual){const landmark=D.visualMap.find(p=>p.id===state.selected&&p.at<=state.index);if(landmark){mapViewer.lines([current,vpoint(landmark.p)],C.selected);mapViewer.markers([vpoint(landmark.p)],C.selected,11)}}
 $('map-scene-label').textContent=visual?'3D LANDMARK MAP · ARBITRARY UNITS':'3D SURFACE MAP · METERS';
 $('map-point-count').textContent=visual&&state.index<5?'Collecting parallax for initialization':`Visible map points: ${items.length}`;
 mapViewer.draw();window.MappingLab.visibleMapCount=items.length;
}
function metric(v,name){return `<div class="metric"><strong>${v}</strong><span>${name}</span></div>`}
function selection(f,visual){$('select-inlier').hidden=!visual;$('clear-selection').hidden=!visual;if(!visual){$('selection').textContent='Cyan samples constrain scan alignment; orange lines connect them to local map correspondences.';return}const t=f.visual.tracks.find(t=>t.id===state.selected);$('selection').textContent=state.selected===null?'Click a feature in the current image to follow its map landmark.':t?`Track ${t.id}: ${t.used?'pose inlier':'unused for this pose'}. ${t.mapped?'Its triangulated landmark is highlighted in the map.':'This observation has no accepted 3D landmark.'}`:`Track ${state.selected} is not observed in this frame. Its accepted map landmark remains highlighted.`;}
function count(){return state.mode==='challenge'?MappingChallenges.N+1:D.frames.length}
function renderChallenge(){
 S.hidden=true;$('lidar-viewport').hidden=false;$('scan-tools').hidden=false;$('select-inlier').hidden=true;$('clear-selection').hidden=true;
 for(const b of document.querySelectorAll('[data-viewer=scan]')){const a=b.dataset.cameraAction;b.setAttribute('aria-label',a==='in'?'Zoom in reference road':a==='out'?'Zoom out reference road':a==='fit'?'Fit reference road':'Reset reference view');if(a==='fit')b.textContent='Fit road';if(a==='reset')b.textContent='Reset road view'}
 $('sensor-title').textContent='Reference road and current observations';$('scan-scene-label').textContent='SIMULATED REFERENCE · METERS';$('map-scene-label').textContent='CONTROLLED ESTIMATED MAP · METERS';
 $('lidar-scene').setAttribute('aria-label','Interactive 3D reference road. Drag to rotate; Shift drag to pan; scroll to zoom.');
 if(mapMode!=='challenge'){for(const viewer of [mapViewer,lidarViewer]){viewer.reference([0,18,1],100,100,5);viewer.preset($('view').value)}mapMode='challenge'}
 $('legend').innerHTML='<span class="dot old">Reference surfaces</span><span class="dot plane">Current observations</span>';
 $('map-legend').innerHTML='<span class="dot" style="--c:#e5eef5">Reference</span><span class="dot unused">Odometry</span><span class="dot plane">Corrected</span><span class="dot selected">GPS</span><span class="dot new">Point error &lt; 0.25 m</span><span class="dot path">0.25–0.8 m</span><span class="dot" style="--c:#ff765e">&gt; 0.8 m</span>';
 MappingChallenges.render(state.index,lidarViewer,mapViewer,$('accumulate').checked);
}
async function render(){const token=++renderToken;
 $('frame').max=count()-1;$('frame').value=state.index;$('challenge-controls').hidden=state.mode!=='challenge';
 document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===state.mode)));
 for(const id of ['overlays','rejected','matches'])$(id).closest('label').hidden=state.mode==='challenge';
 if(state.mode==='challenge'){renderChallenge();return}
 for(const b of document.querySelectorAll('[data-viewer=scan]')){const a=b.dataset.cameraAction;b.setAttribute('aria-label',a==='in'?'Zoom in LiDAR scan':a==='out'?'Zoom out LiDAR scan':a==='fit'?'Fit scan':'Reset scan view');if(a==='fit')b.textContent='Fit scan';if(a==='reset')b.textContent='Reset scan view'}
 $('lidar-scene').setAttribute('aria-label','Interactive 3D LiDAR scan. Drag to rotate; Shift drag to pan; scroll to zoom.');
 $('scan-scene-label').textContent='CURRENT 3D SCAN · METERS';$('map-legend').innerHTML='<span class="dot old">Earlier map points</span><span class="dot new">Current additions</span><span class="dot path">Estimated path</span>';
 const f=D.frames[state.index],v=state.mode==='visual';$('frame').value=state.index;$('time').textContent=`${f.frame} · ${f.time.toFixed(1)} s`;
selection(f,v);S.hidden=!v;$('lidar-viewport').hidden=v;$('scan-tools').hidden=v;
$('select-inlier').disabled=!v;$('clear-selection').disabled=!v;document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===state.mode)));$('sensor-title').textContent=v?'Previous and current image tracks':'LiDAR surface samples and matches';$('legend').innerHTML=v?'<span class="dot used">Pose inlier</span><span class="dot unused">Tracked but unused</span><span class="dot selected">Selected landmark</span>':'<span class="dot plane">Used surface samples</span><span class="dot new">Matched map point</span><span class="dot unused">Residual lines</span>';
if(v){$('metrics').innerHTML=metric(f.visual.tracks.length,'Forward/backward consistent tracks')+metric(f.visual.used,'Pose inliers')+metric(f.visual.mapped,'Mapped landmarks')+metric(f.visual.rmse===null?'—':f.visual.rmse+' px','Inlier reprojection RMSE');$('explanation').textContent=f.visual.status+'. Green tracks constrain the camera pose. Triangulated features enter the sparse map only after depth, parallax, and reprojection checks. Orange tracks may lack depth or fail the pose test.';$('map-caption').textContent='Camera map: right, forward, and up in the first camera’s frame. One initial baseline = one arbitrary unit. Both camera angle and target can be changed independently of playback.';$('algorithm').textContent=D.meta.estimators.split(' LiDAR:')[0];await sensorVisual(f,token);}
else{$('metrics').innerHTML=metric(f.lidar.scan.length,'Voxel scan samples')+metric(f.lidar.accepted,'Accepted planar correspondences')+metric(f.lidar.trace.length,'ICP updates')+metric(f.lidar.rmse===null?'—':f.lidar.rmse+' m','Point-to-plane RMSE');$('explanation').textContent='The estimator aligns this scan with the preceding local map. Cyan points mark the surface samples used in the registration objective. Match lines show a subset for readability. Orange segments connect each sample to its matched map point. After alignment, transformed returns extend the map.';$('map-caption').textContent='LiDAR map: x-forward, y-left, z-up in the first scan’s frame. Grid spacing is 10 m; the current-scan grid is 5 m. No per-point motion correction is applied.';$('algorithm').textContent='LiDAR: '+D.meta.estimators.split(' LiDAR:')[1];sensorLidar(f);}if(token===renderToken)map(f);}
function pause(){state.playing=false;clearInterval(clock);$('play').textContent='Play'}
function play(){pause();if(state.index===count()-1)state.index=0;state.playing=true;$('play').textContent='Pause';clock=setInterval(()=>{if(state.index===count()-1){pause();return}state.index++;render()},(state.mode==='challenge'?500:100)/Number($('speed').value))}
$('play').onclick=()=>state.playing?pause():play();$('speed').onchange=()=>{if(state.playing)play()};$('next').onclick=()=>{pause();state.index=Math.min(count()-1,state.index+1);render()};$('previous').onclick=()=>{pause();state.index=Math.max(0,state.index-1);render()};$('reset').onclick=()=>{pause();state.index=0;state.selected=null;render()};$('frame').max=count()-1;$('frame').oninput=()=>{pause();state.index=Number($('frame').value);render()};for(const id of ['overlays','rejected','matches','accumulate'])$(id).onchange=render;
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{pause();state.mode=b.dataset.mode;state.index=state.mode==='challenge'?60:Math.min(79,state.index);state.selected=null;mapMode=null;$('view').value='oblique';if(state.mode!=='challenge')lidarViewer.reference([10,0,0],105,80,5);location.hash=state.mode;render()});
$('view').onchange=()=>{mapViewer.preset($('view').value);lidarViewer.preset($('view').value)};
$('camera-reset').onclick=()=>{$('view').value='oblique';mapViewer.reset();lidarViewer.reset()};
$('drag-mode').onchange=()=>{for(const viewer of [mapViewer,lidarViewer]){viewer.tool=$('drag-mode').value;viewer.draw()}};
document.querySelectorAll('[data-camera-action]').forEach(button=>button.onclick=()=>{const viewer=button.dataset.viewer==='map'?mapViewer:lidarViewer;const action=button.dataset.cameraAction;if(action==='in')viewer.zoom(1/1.25);else if(action==='out')viewer.zoom(1.25);else if(action==='fit')viewer.fit();else viewer.reset()});
S.onclick=e=>{if(state.mode!=='visual')return;const r=S.getBoundingClientRect(),p=[(e.clientX-r.left)/r.width*S.width,(e.clientY-r.top)/r.height*S.height-455];const tracks=D.frames[state.index].visual.tracks;let best=null,d=22;for(const t of tracks){const n=Math.hypot(p[0]-t.b[0],p[1]-t.b[1]);if(n<d){d=n;best=t}}state.selected=best?.id??null;$('selection').textContent=best?`Track ${best.id}: ${best.used?'pose inlier':'unused for this pose'}. ${best.mapped?'Its triangulated landmark is highlighted in the map.':'This observation has no accepted 3D landmark.'}`:'Click a feature in the current image to follow its map landmark.';render()};
$('provenance').textContent=`${D.meta.dataset}, sequence ${D.meta.sequence}, original frames ${D.meta.start}–${D.meta.start+D.meta.count-1}. ${D.meta.dt_note}`;$('selection').textContent='Click a feature in the current image to follow its map landmark.';render();

if(location.protocol==='file:'){document.querySelector('.downloads').innerHTML='<a href="../../Presentations/Lecture%206%20Mapping%20for%20Autonomous%20Driving.pptx">Open local lecture slides</a>'; }

$('select-inlier').onclick=()=>{const tr=D.frames[state.index].visual.tracks.find(t=>t.used&&t.mapped);state.selected=tr?.id??null;$('selection').textContent=tr?'Track '+tr.id+': pose inlier. Its triangulated landmark is highlighted in the map.':'No mapped pose inlier at this frame.';render()};$('clear-selection').onclick=()=>{state.selected=null;$('selection').textContent='Click a feature in the current image to follow its map landmark.';render()};

for(const id of ['gps-use','gps-sigma','gps-gate','loop-use','grade','bump','pose-model','drift','failure','quality-gate','rebuild-map'])$(id).oninput=render;
$('finish-lap').onclick=()=>{pause();state.index=MappingChallenges.N;render()};
