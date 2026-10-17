/* Small, inspectable planning implementations for the Lecture 7 experiments. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./engine.js'));else root.AdvancedPlanning=factory(root.Planning);})(typeof globalThis!=='undefined'?globalThis:this,function(E){
'use strict';
const {W,H,N,xy,id,dist,random}=E;
const center=i=>xy(i).map(v=>v+.5),length=path=>path.slice(1).reduce((s,p,i)=>s+dist(path[i],p),0);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function pointSegment(p,a,b){let dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1),0,1);return dist(p,[a[0]+t*dx,a[1]+t*dy]);}
function intersects(a,b,[x,y,w,h]){let lo=0,hi=1;for(let j=0;j<2;j++){let d=b[j]-a[j],min=j?y:x,max=min+(j?h:w);if(Math.abs(d)<1e-12){if(a[j]<min||a[j]>max)return false;}else{let t1=(min-a[j])/d,t2=(max-a[j])/d;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));if(lo>hi)return false;}}return true;}
function segmentRectDistance(a,b,r){if(intersects(a,b,r))return 0;let [x,y,w,h]=r,point=p=>Math.hypot(Math.max(x-p[0],0,p[0]-x-w),Math.max(y-p[1],0,p[1]-y-h));return Math.min(point(a),point(b),...[[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(p=>pointSegment(p,a,b)));}
class World{
 constructor(map,radius=.2){this.radius=radius;this.rects=[];map.cells.forEach((v,i)=>{if(v){let [x,y]=xy(i);this.rects.push([x,y,1,1]);}});}
 free(a,b=a){let r=this.radius;if([a,b].some(p=>p[0]<r||p[1]<r||p[0]>W-r||p[1]>H-r))return false;return this.rects.every(rect=>segmentRectDistance(a,b,rect)>r+1e-9);}
}
// Cell-center Basic Theta*: parent-of-parent visibility shortcuts during relaxation.
function anyAngle(map,theta=true){let world=new World(map),g=new Float64Array(N).fill(Infinity),parent=new Int32Array(N).fill(-1),closed=new Uint8Array(N),open=new Set(),order=[],checks=0;let goal=center(map.goal);
 if(!world.free(center(map.start))||!world.free(goal))return {path:[],cost:Infinity,order,checks};g[map.start]=0;parent[map.start]=map.start;open.add(map.start);
 while(open.size){let u=-1,best=Infinity;for(let i of open){let f=g[i]+dist(center(i),goal);if(f<best){best=f;u=i;}}open.delete(u);closed[u]=1;order.push(u);if(u===map.goal)break;let [x,y]=xy(u);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy||x+dx<0||y+dy<0||x+dx>=W||y+dy>=H)continue;let v=id(x+dx,y+dy);if(closed[v]||map.cells[v])continue;checks++;if(!world.free(center(u),center(v)))continue;let p=u;if(theta){checks++;if(world.free(center(parent[u]),center(v)))p=parent[u];}let cost=g[p]+dist(center(p),center(v));if(cost<g[v]){g[v]=cost;parent[v]=p;open.add(v);}}
 }
 let path=[];if(Number.isFinite(g[map.goal])){let v=map.goal;while(true){path.push(center(v));if(v===map.start)break;v=parent[v];}path.reverse();}return {path,cost:path.length?length(path):Infinity,order,checks,expanded:order.length};
}
class RRTStar{
 constructor(map,seed=7,step=2,informed=false){this.map=map;this.world=new World(map);this.rng=random(seed);this.stepSize=step;this.informed=informed;this.start=center(map.start);this.goal=center(map.goal);this.nodes=[{p:this.start,parent:-1,cost:0,children:new Set()}];this.attempts=0;this.path=[];this.bestCost=Infinity;this.firstCost=Infinity;this.goalLinks=new Set();this.rewires=0;this.latest=[];this.history=[];this.lastSample=null;}
 ellipse(){let d=dist(this.start,this.goal),c=this.bestCost;return Number.isFinite(c)?{center:[(this.start[0]+this.goal[0])/2,(this.start[1]+this.goal[1])/2],angle:Math.atan2(this.goal[1]-this.start[1],this.goal[0]-this.start[0]),a:c/2,b:Math.sqrt(Math.max(0,c*c-d*d))/2}:null;}
 sample(){let e=this.informed?this.ellipse():null;if(!e)return this.rng()<.12?this.goal.slice():[this.rng()*W,this.rng()*H];let radius=Math.sqrt(this.rng()),angle=2*Math.PI*this.rng(),x=e.a*radius*Math.cos(angle),y=e.b*radius*Math.sin(angle),c=Math.cos(e.angle),s=Math.sin(e.angle);return [e.center[0]+c*x-s*y,e.center[1]+s*x+c*y];}
 propagate(i,delta){let queue=[i];for(let k=0;k<queue.length;k++){let n=this.nodes[queue[k]];n.cost+=delta;queue.push(...n.children);}}
 updatePath(){let end=-1,c=Infinity;for(let i of this.goalLinks){let q=this.nodes[i].cost+dist(this.nodes[i].p,this.goal);if(q<c){c=q;end=i;}}this.bestCost=c;this.path=[];if(end>=0){this.path=[this.goal];for(let i=end;i>=0;i=this.nodes[i].parent)this.path.push(this.nodes[i].p);this.path.reverse();if(!Number.isFinite(this.firstCost))this.firstCost=c;}this.history.push(c);}
 step(){this.attempts++;let sample=this.sample();this.lastSample=sample;let ni=0,nd=Infinity;this.nodes.forEach((n,i)=>{let d=dist(n.p,sample);if(d<nd){nd=d;ni=i;}});if(nd<1e-9||!this.world.free(this.start)||!this.world.free(this.goal))return;let a=this.nodes[ni].p,t=Math.min(1,this.stepSize/nd),p=[a[0]+t*(sample[0]-a[0]),a[1]+t*(sample[1]-a[1])];if(!this.world.free(a,p))return;
  let radius=Math.min(4.5,50*Math.sqrt(Math.log(this.nodes.length+1)/(this.nodes.length+1))),near=[];this.nodes.forEach((n,i)=>{if(dist(n.p,p)<=radius)near.push(i);});let parent=ni,cost=this.nodes[ni].cost+dist(a,p);for(let i of near){let n=this.nodes[i],c=n.cost+dist(n.p,p);if(c<cost&&this.world.free(n.p,p)){parent=i;cost=c;}}
  let j=this.nodes.length;this.nodes.push({p,parent,cost,children:new Set()});this.nodes[parent].children.add(j);this.latest=[];for(let i of near){let n=this.nodes[i],c=cost+dist(p,n.p);if(i!==0&&c+1e-9<n.cost&&this.world.free(p,n.p)){this.nodes[n.parent].children.delete(i);n.parent=j;this.nodes[j].children.add(i);this.propagate(i,c-n.cost);this.rewires++;this.latest.push(i);}}
  if(dist(p,this.goal)<=this.stepSize&&this.world.free(p,this.goal))this.goalLinks.add(j);this.updatePath();
 }
}
// Fixed-k PRM. Query endpoints attach to a persistent, undirected roadmap.
class PRM{
 constructor(map,seed=7,k=8){this.map=map;this.world=new World(map);this.rng=random(seed);this.k=k;this.nodes=[];this.edges=[];this.attempts=0;this.queries=0;this.start=center(map.start);this.goal=center(map.goal);this.result={path:[],cost:Infinity};}
 step(){this.attempts++;let p=[this.rng()*W,this.rng()*H];if(!this.world.free(p))return;let near=this.nodes.map((n,i)=>[i,dist(n.p,p)]).sort((a,b)=>a[1]-b[1]).slice(0,this.k),j=this.nodes.length;this.nodes.push({p});this.edges.push([]);for(let [i,d] of near)if(this.world.free(p,this.nodes[i].p)){this.edges[i].push([j,d]);this.edges[j].push([i,d]);}this.query(this.start,this.goal,false);}
 query(start=this.start,goal=this.goal,count=true){if(count)this.queries++;this.start=start.slice();this.goal=goal.slice();if(!this.world.free(start)||!this.world.free(goal))return this.result={path:[],cost:Infinity};let points=this.nodes.map(n=>n.p).concat([start,goal]),n=this.nodes.length,s=n,t=n+1,edges=this.edges.map(e=>e.slice()).concat([[],[]]);for(let u of [s,t]){let nearest=this.nodes.map((node,i)=>[i,dist(points[u],node.p)]).sort((a,b)=>a[1]-b[1]).slice(0,this.k);for(let [v,d] of nearest)if(this.world.free(points[u],points[v])){edges[u].push([v,d]);edges[v].push([u,d]);}}if(this.world.free(start,goal)){let d=dist(start,goal);edges[s].push([t,d]);edges[t].push([s,d]);}
  let g=Array(n+2).fill(Infinity),parent=Array(n+2).fill(-1),open=new Set([s]),closed=new Set(),expanded=0;g[s]=0;while(open.size){let u=-1,best=Infinity;for(let i of open)if(g[i]<best){best=g[i];u=i;}open.delete(u);closed.add(u);expanded++;if(u===t)break;for(let [v,d] of edges[u])if(!closed.has(v)&&g[u]+d<g[v]){g[v]=g[u]+d;parent[v]=u;open.add(v);}}
  let path=[];if(Number.isFinite(g[t])){for(let v=t;v>=0;v=parent[v])path.push(points[v]);path.reverse();}return this.result={path,cost:g[t],expanded};
 }
}
// MPPI-style stochastic sequence optimization: Gaussian perturbations, exponential
// cost weights, warm-start shift and receding-horizon execution. Bounded unicycle
// controls and hard collision rejection differ from the unconstrained theory.
class MPPI{
 constructor(seed=7){this.rng=random(seed);this.sequence=[];this.lastWeights=[];}
 gaussian(){return Math.sqrt(-2*Math.log(Math.max(this.rng(),1e-12)))*Math.cos(2*Math.PI*this.rng());}
 shift(){this.sequence=this.sequence.slice(1).concat(this.sequence.length?[this.sequence.at(-1).slice()]:[]);}
 plan(p,path,time,{horizon=3,maxSpeed=2.5,moving=true,obstacle=true,avoid=true,samples=96,temperature=3,noise=.65}={}){const dt=.1,steps=Math.max(1,Math.round(horizon/dt));let nearest=0,dd=Infinity;path.forEach((q,i)=>{let d=dist(p,q);if(d<dd){nearest=i;dd=d;}});let ti=Math.min(path.length-1,nearest+Math.ceil(maxSpeed*horizon)+1);for(let k=nearest+1;k<ti;k++){let a=path[k-1],b=path[k],c=path[k+1];if(Math.abs((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]))>1e-6){ti=k;break;}}let target=path[ti];
  while(this.sequence.length<steps)this.sequence.push([Math.min(1.5,maxSpeed),0]);this.sequence=this.sequence.slice(0,steps);const rollout=controls=>{let q=p.slice(),points=[],valid=true,score=0,min=Infinity;for(let k=0;k<steps;k++){let [v,w]=controls[k];q=[q[0]+v*Math.cos(q[2])*dt,q[1]+v*Math.sin(q[2])*dt,q[2]+w*dt];points.push(q);let b=[22,moving?11+3*Math.sin((time+(k+1)*dt)*.5):11],clearance=obstacle?dist(q,b)-1.55:Infinity;min=Math.min(min,clearance);if(E.rectCollision(q,E.localRects)||(avoid&&clearance<=0)){valid=false;break;}let offset=Math.min(...path.map(x=>dist(q,x)));score+=dt*(.7*offset*offset+.08*w*w+.03*v*v+(avoid&&clearance<3?1.5/Math.max(.05,clearance):0));}
   let end=points.at(-1)||p,desired=Math.atan2(target[1]-end[1],target[0]-end[0]),angle=Math.atan2(Math.sin(desired-end[2]),Math.cos(desired-end[2]));score+=4*dist(end,target)+1.2*angle*angle;return {controls,points,valid,score,min,v:controls[0][0],w:controls[0][1]};};
  let candidates=[rollout(this.sequence.map(u=>u.slice()))];for(let s=1;s<samples;s++){let controls=[],nv=0,nw=0;for(let k=0;k<steps;k++){nv=.65*nv+.76*this.gaussian()*noise;nw=.65*nw+.76*this.gaussian()*noise;controls.push([clamp(this.sequence[k][0]+nv,0,maxSpeed),clamp(this.sequence[k][1]+nw,-1.2,1.2)]);}candidates.push(rollout(controls));}
  let valid=candidates.filter(c=>c.valid),weights=[],best=null,weightedAccepted=false;if(valid.length){let base=Math.min(...valid.map(c=>c.score)),z=0;for(let c of candidates){let w=c.valid?Math.exp(-(c.score-base)/Math.max(.05,temperature)):0;weights.push(w);z+=w;}weights=weights.map(w=>w/z);let mean=Array.from({length:steps},(_,k)=>[0,0]);candidates.forEach((c,i)=>{for(let k=0;k<steps;k++){mean[k][0]+=weights[i]*c.controls[k][0];mean[k][1]+=weights[i]*c.controls[k][1];}});let optimized=rollout(mean);if(optimized.valid){best=optimized;weightedAccepted=true;}else best=valid.reduce((a,b)=>a.score<b.score?a:b);this.sequence=best.controls.map(u=>u.slice());}
  if(!best){best=rollout(Array.from({length:steps},()=>[0,0]));if(!best.valid)best=null;}this.lastWeights=weights;let effective=weights.length?1/weights.reduce((s,w)=>s+w*w,0):0;return {candidates,best,target,blocker:obstacle?[22,moving?11+3*Math.sin(time*.5):11]:null,effective,weights,weightedAccepted};
 }
}
return {World,segmentRectDistance,anyAngle,RRTStar,PRM,MPPI,length,center};
});
