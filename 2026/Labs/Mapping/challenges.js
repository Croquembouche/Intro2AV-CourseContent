/* Controlled teaching experiments, separate from the recorded KITTI estimators. */
'use strict';
window.MappingChallenges = (() => {
  const N = 120, TAU = Math.PI * 2, HEIGHT = 1.6;
  const add = (a,b) => a.map((x,i)=>x+b[i]);
  const sub = (a,b) => a.map((x,i)=>x-b[i]);
  const norm = a => Math.hypot(...a);
  const noise = (i,k) => Math.sin(i*12.9898+k*78.233)*.75 + Math.cos(i*4.71+k*2.93)*.6;
  function rotate(p,yaw,pitch) {
    const x=Math.cos(pitch)*p[0]-Math.sin(pitch)*p[2], z=Math.sin(pitch)*p[0]+Math.cos(pitch)*p[2];
    return [Math.cos(yaw)*x-Math.sin(yaw)*p[1],Math.sin(yaw)*x+Math.cos(yaw)*p[1],z];
  }
  const inverse = (p,yaw,pitch) => rotate(rotate(p,-yaw,0),0,-pitch);

  function road(u,grade,bump) {
    const a=TAU*u, x=28*Math.sin(a), y=18*(1-Math.cos(a));
    const arc=148*u, crest=(grade/100)*36;
    const b=bump*Math.exp(-.5*((arc-62)/1.8)**2);
    const z=crest*Math.sin(Math.PI*u)**2+b;
    const speed=Math.hypot(28*TAU*Math.cos(a),18*TAU*Math.sin(a));
    const dzdu=crest*Math.PI*Math.sin(TAU*u)-b*(arc-62)*148/(1.8**2);
    return {p:[x,y,z],yaw:Math.atan2(18*Math.sin(a),28*Math.cos(a)),pitch:Math.atan2(dzdu,speed)};
  }

  function build(config) {
    const truth=[],features=[],odo=[],gps=[],valid=[];
    let previousYaw=0;
    for(let i=0;i<=N;i++) {
      const r=road(i/N,config.grade,config.bump);
      while(r.yaw-previousYaw>Math.PI)r.yaw-=TAU;
      while(r.yaw-previousYaw<-Math.PI)r.yaw+=TAU;
      previousYaw=r.yaw;truth.push({p:add(r.p,[0,0,HEIGHT]),yaw:r.yaw,pitch:r.pitch});
      for(const offset of [-3,-1.5,0,1.5,3])features.push({p:add(r.p,[-Math.sin(r.yaw)*offset,Math.cos(r.yaw)*offset,0]),id:features.length});
      if(i%6===0)for(const side of [-1,1])for(let z=0;z<=3;z+=.5)features.push({p:add(r.p,[-Math.sin(r.yaw)*side*4.5,Math.cos(r.yaw)*side*4.5,z]),id:features.length});
      if(!i){odo.push({p:truth[0].p.slice(),yaw:0,pitch:truth[0].pitch});valid.push(true);continue}
      const prev=truth[i-1],current=truth[i],last=odo[i-1];
      let delta=inverse(sub(current.p,prev.p),prev.yaw,prev.pitch),dyaw=current.yaw-prev.yaw;
      const loss=config.failure==='lost'&&i>=50&&i<=67;
      const bad=config.failure==='match'&&i===50;
      let insert=!loss, sigma=.20;
      if(loss) {delta=odo[i-1].local.slice();dyaw=odo[i-1].dyaw;sigma=.7;insert=false}
      delta=delta.map((v,k)=>v*(1+config.drift*.012)+config.drift*.012*noise(i,k));
      dyaw+=config.drift*.0012;
      if(bad) {
        if(config.quality){delta=odo[i-1].local.slice();dyaw=odo[i-1].dyaw;sigma=.7;insert=false}
        else {delta=add(delta,[4,3,0]);dyaw+=.22}
      }
      const pitch=config.full3d?(loss?last.pitch:current.pitch+config.drift*.002*noise(i,8)):0;
      const world=rotate(delta,last.yaw,config.full3d?last.pitch:0);
      const p=add(last.p,world);if(!config.full3d)p[2]=HEIGHT;
      odo.push({p,yaw:last.yaw+dyaw,pitch,local:delta,dyaw,sigma});
      valid.push(config.quality?insert:true);
    }
    for(let i=0;i<=N;i+=8) {
      if(config.failure==='outage'&&i>=40&&i<=96)continue;
      const p=truth[i].p.map((x,k)=>x+config.sigma*(k===2?2:1)*noise(i+1,k+30));
      if(config.failure==='gps-bias'&&i>=48&&i<=88){p[0]+=8;p[1]+=5}
      gps.push({i,p});
    }
    const scans=truth.map((pose,i)=>features.filter(q=>norm(sub(q.p,pose.p))<12).map(q=>({id:q.id,reference:q.p,local:inverse(sub(q.p,pose.p),pose.yaw,pose.pitch)})));
    return {truth,features,odo,gps,valid,scans};
  }

  // A weighted chain plus position anchors and, at a verified return, a loop edge.
  // These small scalar graphs separate translation and heading for inspection.
  function solveChain(deltas,sigmas,start,fixes,loop) {
    const n=deltas.length+1,A=Array.from({length:n},()=>new Float64Array(n)),b=new Float64Array(n);
    A[0][0]=1e6;b[0]=start*1e6;
    function edge(i,j,measurement,w){A[i][i]+=w;A[j][j]+=w;A[i][j]-=w;A[j][i]-=w;b[i]-=w*measurement;b[j]+=w*measurement}
    for(let i=1;i<n;i++)edge(i-1,i,deltas[i-1],1/(sigmas[i-1]**2));
    for(const f of fixes){const w=1/f.sigma**2;A[f.i][f.i]+=w;b[f.i]+=w*f.value}
    if(loop!==null&&n>1)edge(0,n-1,loop,1/.035**2);
    // Cholesky solve of the positive definite normal equations.
    for(let i=0;i<n;i++)for(let j=0;j<=i;j++){
      let s=A[i][j];for(let k=0;k<j;k++)s-=A[i][k]*A[j][k];
      A[i][j]=i===j?Math.sqrt(Math.max(s,1e-12)):s/A[j][j];
    }
    const y=new Float64Array(n),x=new Float64Array(n);
    for(let i=0;i<n;i++){let s=b[i];for(let k=0;k<i;k++)s-=A[i][k]*y[k];y[i]=s/A[i][i]}
    for(let i=n-1;i>=0;i--){let s=y[i];for(let k=i+1;k<n;k++)s-=A[k][i]*x[k];x[i]=s/A[i][i]}
    return Array.from(x);
  }

  function estimate(data,config,index) {
    const end=Math.min(N,index),raw=data.odo.slice(0,end+1),closure=config.loop&&end===N;
    const heading=closure?solveChain(raw.slice(1).map(p=>p.dyaw),raw.slice(1).map(()=>.018),0,[],TAU):raw.map(p=>p.yaw);
    const deltas=raw.slice(1).map((p,i)=>rotate(p.local,heading[i],config.full3d?raw[i].pitch:0));
    const fixes=[];let correction=[0,0,0],last=0;
    for(const fix of data.gps.filter(p=>p.i<=end)) {
      const predicted=add(raw[fix.i].p,correction),innovation=norm(sub(fix.p,predicted).slice(0,2));
      const threshold=4*Math.sqrt(2*config.sigma**2+.25**2*(fix.i-last));
      const accepted=!config.gpsGate||innovation<=threshold;
      fixes.push({...fix,accepted,innovation});
      if(accepted){correction=sub(fix.p,raw[fix.i].p);last=fix.i}
    }
    const coordinates=[0,1,2].map(k=>!config.full3d&&k===2?raw.map(()=>HEIGHT):solveChain(
      deltas.map(p=>p[k]),raw.slice(1).map(p=>p.sigma),raw[0].p[k],
      config.gps?fixes.filter(f=>f.accepted).map(f=>({i:f.i,value:f.p[k],sigma:config.sigma*(k===2?2:1)})):[],closure?0:null));
    const poses=raw.map((p,i)=>({p:coordinates.map(a=>a[i]),yaw:heading[i],pitch:p.pitch}));
    const cloud=[];
    for(let i=0;i<=end;i++){
      if(!data.valid[i])continue;
      const pose=config.rebuild?poses[i]:raw[i];
      for(const point of data.scans[i]){
        const p=add(rotate(point.local,pose.yaw,pose.pitch),pose.p);
        cloud.push({p,at:i,error:norm(sub(p,point.reference))});
      }
    }
    const rms=xs=>Math.sqrt(xs.reduce((s,x)=>s+x*x,0)/Math.max(1,xs.length));
    return {poses,raw,fixes,cloud,closure,
      positionRms:rms(poses.map((p,i)=>norm(sub(p.p,data.truth[i].p)))),
      mapRms:rms(cloud.map(p=>p.error)),
      gap:end===N?norm(sub(poses[end].p,poses[0].p)):null,
      heightError:poses[end].p[2]-data.truth[end].p[2],
      skipped:data.valid.slice(0,end+1).filter(v=>!v).length};
  }

  let cacheKey='',cached=null;
  function configFromUI(){const $=id=>document.getElementById(id);return {
    grade:Number($('grade').value),bump:Number($('bump').value),drift:Number($('drift').value),sigma:Number($('gps-sigma').value),
    gps:$('gps-use').checked,loop:$('loop-use').checked,full3d:$('pose-model').value==='3d',
    quality:$('quality-gate').checked,gpsGate:$('gps-gate').checked,rebuild:$('rebuild-map').checked,failure:$('failure').value};}

  function render(index,left,right,accumulate) {
    const $=id=>document.getElementById(id),c=configFromUI(),key=JSON.stringify(c);
    if(key!==cacheKey){cached=build(c);cacheKey=key}
    const data=cached,r=estimate(data,c,index),truePath=data.truth.slice(0,index+1).map(p=>p.p),path=r.poses.map(p=>p.p),rawPath=r.raw.map(p=>p.p);
    left.setCloud(data.features,p=>p.p,()=> '#8aa7bd',3);
    left.lines(truePath,'#e5eef5');left.markers([truePath.at(-1)],'#48f4a2',10);
    left.markers(data.scans[index].map(p=>p.reference),'#46d7ff',4);left.draw();
    const visible=r.cloud.filter(p=>accumulate||p.at===index);
    right.setCloud(visible,p=>p.p,p=>p.error>.8?'#ff765e':p.error>.25?'#ffc35a':'#48f4a2',3);
    right.lines(truePath,'#e5eef5');right.lines(rawPath,'#ef9c40');right.lines(path,'#46d7ff');right.markers([path.at(-1)],'#46d7ff',10);
    if(c.gps){right.markers(r.fixes.filter(f=>f.accepted).map(f=>f.p),'#d999ff',7);right.markers(r.fixes.filter(f=>!f.accepted).map(f=>f.p),'#ff765e',7)}
    if(r.closure)right.lines([path[0],path.at(-1)],'#d999ff');right.draw();
    $('grade-value').textContent=c.grade+'%';$('bump-value').textContent=c.bump.toFixed(2)+' m';$('drift-value').textContent=c.drift.toFixed(1)+'×';$('gps-sigma-value').textContent=c.sigma.toFixed(1)+' m';
    $('time').textContent=`${index}/${N} · ${(index*.5).toFixed(1)} s`;
    $('map-point-count').textContent=`Visible map points: ${visible.length}`;
    const metric=(v,name)=>`<div class="metric"><strong>${v}</strong><span>${name}</span></div>`;
    $('metrics').innerHTML=metric(r.positionRms.toFixed(2)+' m','Position RMS vs reference')+metric(r.mapRms.toFixed(2)+' m','Map RMS, all inserted points')+metric(r.gap===null?'At lap end':r.gap.toFixed(2)+' m','Start / return separation')+metric(r.heightError.toFixed(2)+' m','Current height error');
    const gps=c.gps?`${r.fixes.filter(f=>f.accepted).length} GPS fixes used, ${r.fixes.filter(f=>!f.accepted).length} rejected`:'GPS position constraints off';
    const loop=c.loop?(r.closure?'Verified return constraint active':'Loop enabled, waiting for the return'):'No loop constraint';
    $('challenge-status').textContent=`${gps}. ${loop}. ${index+1-r.skipped} scans inserted, ${r.skipped} skipped.`;
    const terrain=c.full3d?'The pose includes elevation and pitch, so observations from the slope and bump can enter a consistent 3D frame.':'The planar pose omits elevation and pitch. GPS cannot restore degrees of freedom excluded by this model.';
    const failure={none:'Local odometry accumulates the selected drift. '+(c.gps?'GPS factors anchor position. ':'GPS position factors are off. ')+(c.loop?'The verified loop constrains position and heading only at the return.':'Without a loop edge, return geometry receives no additional correction.'),match:'A false match at frame 50 would inject a translation and heading jump. '+(c.quality?'The motion gate replaces it with a weaker prediction and skips map insertion.':'With the gate off, the bad pose enters the map and misplaces subsequent observations.'),lost:'Tracking is unavailable at frames 50–67. Motion prediction continues with weaker confidence. '+(c.quality?'The map-quality gate pauses insertion until tracking returns.':'With the gate off, scans are inserted using unsupported predicted poses.'),'gps-bias':'GPS fixes at frames 48–88 have an unmodeled position bias. Innovation gating can reject them; trusting them can pull the map away from the road.',outage:'GPS fixes are absent at frames 40–96. Local motion estimation continues and uncertainty grows until position fixes return.'}[c.failure];
    $('explanation').textContent=terrain+' '+failure+(c.rebuild?' Supporting scans move with their corrected poses.':' The displayed map still uses the original odometry poses even when the trajectory is corrected.');
    $('map-caption').textContent='Controlled scenario in meters. White is the known reference path, orange is odometry, cyan is the corrected path, and purple marks GPS fixes. Map points turn yellow or red as their error increases.';
    $('selection').textContent=`Reference road grade at this pose: ${(100*Math.tan(data.truth[index].pitch)).toFixed(1)}%. Sensor pitch: ${(data.truth[index].pitch*180/Math.PI).toFixed(1)}°. The bump adds local grade to the selected hill.`;
    $('algorithm').textContent='This controlled road loop generates known 3D surface observations and noisy relative motion. A weighted least-squares position chain combines available odometry, GPS covariance, and an optional verified return constraint. A separate heading chain handles loop yaw correction. The display reprojects each stored sensor observation through its supporting pose. It omits full nonlinear SE(3) optimization, automatic loop detection, IMU filtering, and rolling-scan deskew. GPS and reference geometry here are simulated, not KITTI measurements. The initial local frame is known and antenna offset is zero.';
    return r;
  }
  return {N,build,estimate,rotate,inverse,solveChain,render,configFromUI};
})();
