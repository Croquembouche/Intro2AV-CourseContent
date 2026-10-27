/* Intro2AV Lecture 8. Deterministic teaching models; SI units, radians internally. */
(function(root){
'use strict';
const dt=.05,L=2.7,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const defaults={speed:8,lookahead:7,gain:1.8,q:1,r:15,horizon:24,limit:28,rate:90,lag:.12,delay:0,bias:0,offset:2,road:'s',kp:.8,ki:.3,kd:.1,grade:0,antiwindup:true,target:12,profile:'step',feedforward:false};
function road(x,type='s'){let y=0,d=0,dd=0;if(type==='s'){y=3*Math.sin(x/17);d=3/17*Math.cos(x/17);dd=-3/289*Math.sin(x/17);}if(type==='lane'){let a=(x-40)/9,t=Math.tanh(a),c=1-t*t;y=1.8*(1+t);d=.2*c;dd=-.4/9*c*t;}return {x,y,yaw:Math.atan(d),k:dd/Math.pow(1+d*d,1.5)};}
function nearest(x,y,type){let s=x;for(let i=0;i<7;i++){const p=road(s,type),m=Math.tan(p.yaw),dd=p.k*Math.pow(1+m*m,1.5);s-=clamp(((s-x)+(p.y-y)*m)/(1+m*m+(p.y-y)*dd),-5,5);}let p=road(s,type);return {...p,e:-(x-s)*Math.sin(p.yaw)+(y-p.y)*Math.cos(p.yaw)};}
function lqr(v,q,r){let a=v*dt,b=v*dt/L,p=q,h=0,z=2;let K=[0,0];for(let i=0;i<700;i++){let den=r+b*b*z,k0=b*h/den,k1=b*(a*h+z)/den;let np=q+p-(b*h)**2/den,nh=a*p+h-(b*h)*b*(a*h+z)/den,nz=2+a*a*p+2*a*h+z-(b*(a*h+z))**2/den;let change=Math.max(Math.abs(np-p),Math.abs(nh-h),Math.abs(nz-z));p=np;h=nh;z=nz;K=[k0,k1];if(change<1e-9)break;}return K;}
function factor(A){let n=A.length,R=A.map(r=>r.slice());for(let i=0;i<n;i++)for(let j=0;j<=i;j++){let s=A[i][j];for(let k=0;k<j;k++)s-=R[i][k]*R[j][k];R[i][j]=i===j?Math.sqrt(Math.max(1e-12,s)):s/R[j][j];}return R;}
function solve(R,b){let n=b.length,y=Array(n),x=Array(n);for(let i=0;i<n;i++){let s=b[i];for(let j=0;j<i;j++)s-=R[i][j]*y[j];y[i]=s/R[i][i];}for(let i=n-1;i>=0;i--){let s=y[i];for(let j=i+1;j<n;j++)s-=R[j][i]*x[j];x[i]=s/R[i][i];}return x;}
function mpcModel(c){let n=c.horizon,a=c.speed*dt,b=a/L,alpha=dt/Math.max(dt,c.lag),delaySteps=Math.round(c.delay/dt),sy=Array(n).fill(0),sh=Array(n).fill(0),sd=Array(n).fill(0),S=[],steering=[];
 for(let t=0;t<n;t++){
  sy=sy.map((v,j)=>v+a*sh[j]);sd=sd.map(v=>(1-alpha)*v);if(t>=delaySteps)sd[t-delaySteps]+=alpha;
  sh=sh.map((v,j)=>v+b*sd[j]);S.push([sy.slice(),sh.slice()]);steering.push(sd.slice());
 }
 let H=Array.from({length:n},()=>Array(n).fill(0));for(let t=0;t<n;t++)for(let i=0;i<n;i++)for(let j=0;j<n;j++)H[i][j]+=2*(c.q*S[t][0][i]*S[t][0][j]+2*S[t][1][i]*S[t][1][j]);for(let i=0;i<n;i++)H[i][i]+=2*c.r;
 // Bound requested angles and predicted applied-steering changes, including actuator lag/delay.
 let C=Array.from({length:2*n},()=>Array(n).fill(0));for(let i=0;i<n;i++){C[i][i]=1;for(let j=0;j<n;j++)C[n+i][j]=steering[i][j]-(i?steering[i-1][j]:0);}
 const R=factor(H),A=C.concat(C.map(row=>row.map(v=>-v))),HA=A.map(row=>solve(R,row));
 const gram=A.map(row=>HA.map(col=>row.reduce((v,w,j)=>v+w*col[j],0)));
 return {n,a,b,S,H,C,R,A,HA,gram,alpha,delaySteps,steering};
}
// Feasible active-set QP: stop only when primal feasibility and stationarity agree.
function constrainedQP(model,g,lo,hi,initial){
 const {n,H,R,A,HA,gram}=model,bounds=hi.concat(lo.map(v=>-v)),dot=(a,b)=>a.reduce((v,w,j)=>v+w*b[j],0);
 let u=initial.slice(),active=[],iterations=0,converged=false;
 for(;iterations<400;iterations++){
  const grad=H.map((row,i)=>dot(row,u)+g[i]),free=solve(R,grad.map(v=>-v));
  let lambda=[],p=free.slice();
  if(active.length){lambda=solve(factor(active.map(i=>active.map(j=>gram[i][j]))),active.map(i=>dot(A[i],free)));for(let k=0;k<active.length;k++)for(let j=0;j<n;j++)p[j]-=HA[active[k]][j]*lambda[k];}
  if(Math.max(...p.map(Math.abs))<1e-8){
   let remove=-1,worst=-1e-7;lambda.forEach((v,k)=>{if(v<worst){worst=v;remove=k;}});
   if(remove<0){converged=true;break;}active.splice(remove,1);continue;
  }
  let alpha=1,block=-1;
  for(let i=0;i<A.length;i++){if(active.includes(i))continue;const ap=dot(A[i],p);if(ap>1e-10){const candidate=Math.max(0,(bounds[i]-dot(A[i],u))/ap);if(candidate<alpha){alpha=candidate;block=i;}}}
  u=u.map((v,j)=>v+alpha*p[j]);if(block>=0&&alpha<1-1e-10)active.push(block);
 }
 const residual=Math.max(0,...A.map((row,i)=>dot(row,u)-bounds[i]));
 return {u,residual,iterations:iterations+1,converged:converged&&residual<1e-7};
}
function mpc(state,c,model){
 const {n,a,b,S,alpha,delaySteps,steering}=model,ref=nearest(state.x,state.y,c.road),limit=c.limit*Math.PI/180,rate=c.rate*Math.PI/180*dt;
 let ey=ref.e,eh=wrap(state.yaw-ref.yaw),delta=state.delta,g=Array(n).fill(0),base=[],baseSteering=[],baseRates=[];
 const pending=Array(Math.max(0,delaySteps-(state.queue||[]).length)).fill(0).concat(state.queue||[]).slice(0,delaySteps);
 for(let t=0;t<n;t++){
  const prior=delta;delta+=( (t<delaySteps?pending[t]:0)-delta)*alpha;
  if(t<delaySteps)delta=clamp(delta,prior-rate,prior+rate);
  baseSteering.push(delta);baseRates.push(delta-prior);
  ey+=a*eh;eh+=b*delta-a*road(ref.x+(t+.5)*a*Math.cos(ref.yaw),c.road).k;base.push([ey,eh]);
  for(let j=0;j<n;j++)g[j]+=2*(c.q*S[t][0][j]*ey+2*S[t][1][j]*eh);
 }
 const lo=Array(n).fill(-limit).concat(baseRates.map(v=>-rate-v)),hi=Array(n).fill(limit).concat(baseRates.map(v=>rate-v));
 // Construct a feasible command sequence using the same lag/rate envelope as the plant.
 let previous=state.delta,initial=Array(n).fill(0);
 for(let t=0;t<n;t++){
  if(t<delaySteps){previous+=clamp((pending[t]-previous)*alpha,-rate,rate);continue;}
  const j=t-delaySteps,wanted=state.warm?.[j]??previous;
  initial[j]=clamp(wanted,Math.max(-limit,previous-rate/alpha),Math.min(limit,previous+rate/alpha));previous+=(initial[j]-previous)*alpha;
 }
 const solution=constrainedQP(model,g,lo,hi,initial),u=solution.u,res=solution.residual;
 state.warm=u.slice(1).concat(u[n-1]);let pred=base.map((v,t)=>{let e=v[0]+S[t][0].reduce((sum,w,j)=>sum+w*u[j],0),x=ref.x+(t+1)*a*Math.cos(ref.yaw),p=road(x,c.road);return {x:x-e*Math.sin(p.yaw),y:p.y+e*Math.cos(p.yaw)};});let cost=base.reduce((sum,v,t)=>{let ey=v[0]+S[t][0].reduce((acc,w,j)=>acc+w*u[j],0),eh=v[1]+S[t][1].reduce((acc,w,j)=>acc+w*u[j],0);return sum+c.q*ey*ey+2*eh*eh+c.r*u[t]*u[t];},0);return {u:u[0],pred,res,sequence:u,applied:baseSteering.map((v,t)=>v+steering[t].reduce((sum,w,j)=>sum+w*u[j],0)),cost,iterations:solution.iterations,converged:solution.converged};}
function create(algorithm='pure',cfg={}){
 const c={...defaults,...cfg},p=road(0,c.road);
 return {algorithm,c,t:0,x:0,y:p.y+c.offset,yaw:p.yaw,v:algorithm==='pid'?0:c.speed,delta:0,integral:0,dFilter:0,lastV:0,queue:[],history:[],pred:[],saturated:0,K:lqr(c.speed,c.q,c.r),model:algorithm==='mpc'?mpcModel(c):null};
}
// One shared decision function drives the plant and the explanatory views.
// Read-only previews use a copy of MPC warm-start state and never advance the simulation.
function decision(s,commit=false){
 const c=s.c;
 if(s.algorithm==='pid'){
  const reference=c.profile==='brake'?(s.t>=9-1e-9?4:c.target):c.target,error=reference-s.v;
  const derivative=-(s.v-s.lastV)/dt,filtered=s.dFilter+dt/(.15+dt)*(derivative-s.dFilter);
  let integral=s.integral+error*dt;
  const P=c.kp*error,D=c.kd*filtered,FF=c.feedforward?.08*reference:0;
  let raw=P+c.ki*integral+D+FF,command=clamp(raw,-4,2.5);
  const frozen=c.antiwindup&&raw!==command&&Math.sign(error)===Math.sign(raw-command);
  if(frozen)integral=s.integral;
  const I=c.ki*integral;raw=P+I+D+FF;command=clamp(raw,-4,2.5);
  if(commit){s.lastV=s.v;s.dFilter=filtered;s.integral=integral;}
  return {reference,error,P,I,D,FF,raw,command,limited:Math.abs(raw-command)>1e-6?1:0,frozen,integral};
 }
 const path=nearest(s.x,s.y,c.road),heading=wrap(s.yaw-path.yaw);
 let raw=0,target=null,front=null,frontPath=null,yTarget=0,distance=0,pred=[],sequence=[],applied=[],residual=0,cost=0,iterations=0,converged=true;
 if(s.algorithm==='pure'){
  let tx=path.x;
  while(tx<path.x+80){let r=road(tx,c.road);if(Math.hypot(r.x-s.x,r.y-s.y)>=c.lookahead&&(r.x-s.x)*Math.cos(s.yaw)+(r.y-s.y)*Math.sin(s.yaw)>0)break;tx+=.1;}
  target=road(tx,c.road);const dx=target.x-s.x,dy=target.y-s.y;
  yTarget=-Math.sin(s.yaw)*dx+Math.cos(s.yaw)*dy;distance=Math.hypot(dx,dy);
  raw=Math.atan2(2*L*yTarget,distance*distance);
 }
 if(s.algorithm==='stanley'){
  front={x:s.x+L*Math.cos(s.yaw),y:s.y+L*Math.sin(s.yaw)};
  frontPath=nearest(front.x,front.y,c.road);target=frontPath;
  raw=wrap(frontPath.yaw-s.yaw)+Math.atan2(-c.gain*frontPath.e,c.speed+.5);
 }
 const feedforward=Math.atan(L*path.k),feedback=-s.K[0]*path.e-s.K[1]*heading;
 if(s.algorithm==='lqr')raw=feedforward+feedback;
 if(s.algorithm==='mpc'){
  const state=commit?s:{...s,warm:s.warm?.slice()};const r=mpc(state,c,s.model);
  raw=r.u;pred=r.pred;sequence=r.sequence;applied=r.applied;residual=r.res;cost=r.cost;iterations=r.iterations;converged=r.converged;
 }
 const limit=c.limit*Math.PI/180,rate=c.rate*Math.PI/180*dt,command=clamp(raw,-limit,limit);
 const delaySteps=Math.round(c.delay/dt),delayed=delaySteps?(s.queue.length>=delaySteps?s.queue[0]:0):command,desiredChange=(delayed-s.delta)*dt/Math.max(dt,c.lag);
 return {reference:path.y,error:path.e,heading,path,front,frontPath,target,yTarget,distance,feedforward,feedback,raw,command,pred,sequence,applied,residual,cost,iterations,converged,limited:Math.abs(raw-command)>1e-6||Math.abs(desiredChange)>rate+1e-6?1:0};
}
function step(s){
 const c=s.c,d=decision(s,true);
 if(s.algorithm==='pid'){
  s.delta+=(d.command-s.delta)*dt/Math.max(dt,c.lag);
  s.v=Math.max(0,s.v+dt*(s.delta-.08*s.v-(s.t>=6-1e-9?c.grade:0)));s.x+=s.v*dt;
 }else{
  const limit=c.limit*Math.PI/180,rate=c.rate*Math.PI/180*dt;
  s.queue.push(d.command);const delaySteps=Math.round(c.delay/dt),delayed=s.queue.length>delaySteps?s.queue.shift():0;
  const desired=s.delta+(delayed-s.delta)*dt/Math.max(dt,c.lag);
  s.delta=clamp(s.delta+clamp(desired-s.delta,-rate,rate),-limit,limit);
  s.x+=c.speed*Math.cos(s.yaw)*dt;s.y+=c.speed*Math.sin(s.yaw)*dt;
  s.yaw=wrap(s.yaw+c.speed/L*Math.tan(clamp(s.delta+c.bias*Math.PI/180,-1.2,1.2))*dt);s.v=c.speed;
 }
 s.t+=dt;s.saturated+=d.limited;s.pred=d.pred||[];s.targetPoint=d.target;
 const row={commandTime:s.t-dt,t:s.t,x:s.x,y:s.y,yaw:s.yaw,v:s.v,error:s.algorithm==='pid'?d.reference-s.v:nearest(s.x,s.y,c.road).e,reference:d.reference,command:d.command,raw:d.raw,actuator:s.delta,residual:d.residual||0,integral:s.integral,P:d.P||0,I:d.I||0,D:d.D||0,FF:d.FF||0,limited:d.limited};
 s.history.push(row);return row;
}
function metrics(s,from=0){
 const h=s.history.filter(r=>r.t>=from-1e-9),n=h.length;
 if(!n)return {n:0,rms:0,peak:0,effort:0,saturation:0,final:0,duration:s.t||0};
 return {n,rms:Math.sqrt(h.reduce((sum,r)=>sum+r.error*r.error,0)/n),peak:Math.max(...h.map(r=>Math.abs(r.error))),effort:Math.sqrt(h.reduce((sum,r)=>sum+r.command*r.command,0)/n),saturation:100*h.reduce((sum,r)=>sum+r.limited,0)/n,final:h[n-1].error,duration:s.t};
}
function run(algorithm,c={},seconds=20){let s=create(algorithm,c);for(let i=0;i<Math.round(seconds/dt);i++)step(s);return s;}
let api={dt,L,defaults,road,nearest,lqr,mpcModel,mpc,constrainedQP,create,decision,step,metrics,run,clamp,wrap};if(typeof module!=='undefined')module.exports=api;root.Control=api;
})(typeof window==='undefined'?globalThis:window);
