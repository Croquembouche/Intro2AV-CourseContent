/* Independent result checks for the instructional models, not performance benchmarks. */
const assert=require('node:assert/strict'),fs=require('node:fs');
const E=require('../../../2026/Labs/PathPlanning/engine.js'),A=require('../../../2026/Labs/PathPlanning/advanced.js');
const report={scope:'Lecture 7 finite teaching models',checks:{},limitations:['No optimality claim for finite sampling, Basic Theta*, or MPPI-style optimization.','Local prediction uses discrete unicycle rollouts and ideal obstacle motion, not continuous-time or vehicle-dynamics safety.']};
const close=(a,b)=>assert(a===b||Math.abs(a-b)<1e-7,`${a} != ${b}`);
// Independent uniform-cost oracle: binary heap and explicit coordinate transitions.
function oracle(map,{unit=false,diagonal=false}={}){
 const d=Array(E.N).fill(Infinity),heap=[];if(map.cells[map.start]||map.cells[map.goal])return Infinity;
 const world=diagonal?new A.World(map):null,point=i=>[i%E.W+.5,Math.floor(i/E.W)+.5];
 if(world&&(!world.free(point(map.start))||!world.free(point(map.goal))))return Infinity;
 const push=(item)=>{heap.push(item);let i=heap.length-1;while(i){let p=(i-1)>>1;if(heap[p][0]<=item[0])break;heap[i]=heap[p];i=p;}heap[i]=item;};
 const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(2*i+1<heap.length){let j=2*i+1;if(j+1<heap.length&&heap[j+1][0]<heap[j][0])j++;if(heap[j][0]>=last[0])break;heap[i]=heap[j];i=j;}heap[i]=last;}return first;};
 d[map.start]=0;push([0,map.start]);
 while(heap.length){const [cost,u]=pop();if(cost!==d[u])continue;if(u===map.goal)return cost;const x=u%E.W,y=Math.floor(u/E.W);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if((!dx&&!dy)||(!diagonal&&Math.abs(dx)+Math.abs(dy)!==1))continue;const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=E.W||yy>=E.H)continue;const v=yy*E.W+xx;if(map.cells[v]||(world&&!world.free(point(u),point(v))))continue;const next=cost+(diagonal?Math.hypot(dx,dy):unit?1:map.costs[v]);if(next<d[v]){d[v]=next;push([next,v]);}}
 }return Infinity;
}
let graphCases=0,repairs=0;
for(let seed=1;seed<=40;seed++){
 const rng=E.random(seed),map=E.grid('empty');for(let i=0;i<E.N;i++){map.cells[i]=rng()<.18?1:0;map.costs[i]=1+Math.floor(rng()*6);}map.cells[map.start]=map.cells[map.goal]=0;
 const optimal=oracle(map),breadth=oracle(map,{unit:true});close(E.search(map,'dijkstra').cost,optimal);close(E.search(map,'astar').cost,optimal);let bfs=E.search(map,'bfs');close(bfs.path.length?bfs.path.length-1:Infinity,breadth);let weighted=E.search(map,'astar',3);assert(weighted.cost<=3*optimal+1e-7);graphCases++;
 const ds=new E.DStarLite(map);close(ds.compute().cost,optimal);
 for(let k=0;k<12;k++){const cell=Math.floor(rng()*E.N);ds.change(cell,!ds.map.cells[cell],1+Math.floor(rng()*8));let r=ds.compute();close(r.cost,oracle(ds.map));if(k%3===0&&r.path.length>1){ds.move(r.path[1]);close(ds.compute().cost,oracle(ds.map));}repairs++;}
 const plain=E.grid('empty');plain.cells=map.cells.slice();const a8=A.anyAngle(plain,false),theta=A.anyAngle(plain,true);close(a8.cost,oracle(plain,{diagonal:true}));assert.equal(!!theta.path.length,!!a8.path.length);const world=new A.World(plain);for(let i=1;i<theta.path.length;i++)assert(world.free(theta.path[i-1],theta.path[i]));close(theta.cost,theta.path.length?A.length(theta.path):Infinity);for(const r of [a8,theta]){assert.equal(r.order.length,r.checksByExpansion.length);assert(r.checksByExpansion.every((v,i,a)=>!i||v>=a[i-1]));close(r.checks,r.checksByExpansion.at(-1)||0);}
}
report.checks.graphSearch={randomWeightedMaps:graphCases,dstarCostChanges:repairs,checks:'BFS edge count; Dijkstra/A* optimal cost; weighted-A* bound; D* Lite repairs and moving starts; eight-neighbor A* oracle; Theta* feasibility'};
// Independent geometry oracle minimizes convex point-to-box distance along a segment.
function numericDistance(a,b,[x,y,w,h]){const f=t=>{const q=[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])];return Math.hypot(Math.max(x-q[0],0,q[0]-x-w),Math.max(y-q[1],0,q[1]-y-h));};let lo=0,hi=1;for(let i=0;i<100;i++){const l=(2*lo+hi)/3,r=(lo+2*hi)/3;if(f(l)<f(r))hi=r;else lo=l;}return Math.min(f(0),f(1),f((lo+hi)/2));}
const rng=E.random(392),box=[10,10,1,1];for(let i=0;i<1000;i++){const a=[7+rng()*7,7+rng()*7],b=[7+rng()*7,7+rng()*7];close(E.segmentRectDistance(a,b,box),numericDistance(a,b,box));}
const grazing=E.grid('empty');grazing.cells[E.id(10,10)]=1;assert(!E.segmentFree([11.982379361288622,10.714552862104028],[10.81099762651138,9.532472773455083],grazing,.2));
for(let r=0;r<=2.5;r+=.1){const map=E.grid('narrow'),route=E.search(E.inflate(map,r)).path,world=new A.World(map,r);for(let j=1;j<route.length;j++)assert(world.free(A.center(route[j-1]),A.center(route[j])));}
report.checks.geometry={independentSegmentBoxChecks:1000,grazingCollision:'rejected',inflation:'returned paths pass continuous circular-footprint clearance'};
let trees=0,sampleChecks=0;
for(const seed of [1,7,19])for(const kind of ['rrt','rrtstar','informed']){
 const map=E.grid('detour'),world=new A.World(map),tree=kind==='rrt'?new E.RRT(map,seed):new A.RRTStar(map,seed,2,kind==='informed');let last=Infinity;
 for(let i=0;i<900;i++){const old=tree.nodes.length,previous=tree.bestCost;tree.step();if(kind!=='rrt'){assert(tree.bestCost<=last+1e-8);last=tree.bestCost;if(old===tree.nodes.length)assert.equal(tree.latest.length,0);if(kind==='informed'&&Number.isFinite(previous)&&tree.lastSample){assert(E.dist(tree.lastSample,tree.start)+E.dist(tree.lastSample,tree.goal)<=previous+1e-7);sampleChecks++;}}}
 assert(tree.lastSample);for(let i=1;i<tree.path.length;i++)assert(world.free(tree.path[i-1],tree.path[i]));
 for(let i=1;i<tree.nodes.length;i++){const n=tree.nodes[i],parent=tree.nodes[n.parent];assert(world.free(parent.p,n.p));if(kind!=='rrt'){close(n.cost,parent.cost+E.dist(n.p,parent.p));assert(parent.children.has(i));}const seen=new Set();for(let j=i;j>=0;j=tree.nodes[j].parent){assert(!seen.has(j));seen.add(j);}}
 if(seed===7)assert(tree.path.length);trees++;
}
const same=E.grid('empty');same.goal=same.start;for(const C of [E.RRT,A.RRTStar]){const t=new C(same);assert.equal(t.path.length,1);close(A.length(t.path),0);for(let i=0;i<10;i++)t.step();close(A.length(t.path),0);}
const prm=new A.PRM(E.grid('detour'));for(let i=0;i<300;i++)prm.step();const snapshot=JSON.stringify([prm.nodes,prm.edges]);assert(prm.result.path.length);const reverse=prm.query(prm.goal,prm.start);assert(reverse.path.length);assert.equal(JSON.stringify([prm.nodes,prm.edges]),snapshot);for(let i=1;i<reverse.path.length;i++)assert(prm.world.free(reverse.path[i-1],reverse.path[i]));close(prm.query(prm.start,prm.start).cost,0);
report.checks.sampling={seededTrees:trees,informedSampleBounds:sampleChecks,checks:'collision-free edges, consistent parent costs, no cycles, nonincreasing best cost, fresh rewiring highlights, zero-length start=goal, retained PRM graph'};
// Check the force against the derivative of the stated potential, independently.
const scene=E.fieldScenes.open;
function potential(p){let u=.06*E.dist(p,scene.goal)**2;for(const [x,y,r]of scene.obs){const rho=Math.max(.03,E.dist(p,[x,y])-r-.35);if(rho<4)u+=1.5*(1/rho-1/4)**2;}return u;}
for(const p of [[4,11],[12,10],[18,11],[25,7]]){const f=E.force(p,scene).f;for(let j=0;j<2;j++){const a=p.slice(),b=p.slice();a[j]-=1e-5;b[j]+=1e-5;assert(Math.abs(f[j]+(potential(b)-potential(a))/2e-5)<1e-5);}}
let doorwayCases=0;for(const gap of [1.9,2.4,3.7,4.9])for(const length of [2,4,6])for(const width of [1,1.5,2.5])for(const c of E.imagine(gap,length,width)){const a=c.deg*Math.PI/180,span=length*Math.sin(a)+width*Math.cos(a);assert.equal(c.safe,span<gap-1e-9);doorwayCases++;}
const path=E.globalRoute([4,11,0]).path,p=[4,11,0],localOptimizer=new A.MPPI(7);for(const planner of [E.localPlan,localOptimizer.plan.bind(localOptimizer)]){const r=planner(p,path,2);assert.deepEqual(r.origin,p);assert.equal(r.time,2);assert(r.best?.valid);assert.equal(planner(p,[],2).best,null);}
const optimizer=new A.MPPI(7);optimizer.plan(p,path,0);const restricted=optimizer.plan(p,path,.1,{maxSpeed:.5});for(const c of restricted.candidates)for(const [v,w]of c.controls){assert(v>=0&&v<=.5);assert(Math.abs(w)<=1.2);}if(restricted.weights.length)close(restricted.weights.reduce((s,w)=>s+w,0),1);
report.checks.motion={potentialGradientCases:4,doorwayProjectionCases:doorwayCases,checks:'correct rollout origin/time; empty-path stop; warm-start speed/turn bounds; normalized MPPI-style weights'};
fs.mkdirSync('.build/planning-audit',{recursive:true});fs.writeFileSync('.build/planning-audit/results.json',JSON.stringify(report,null,2));console.log('PASS independent audit',JSON.stringify(report,null,2));
