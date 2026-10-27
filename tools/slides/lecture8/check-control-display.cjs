const assert=require('node:assert/strict'),E=require('../../../2026/Labs/Control/engine.js'),P=require('../../../2026/Labs/Control/plots.js');
const {createCanvas}=require('/home/william/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const near=(a,b,t=1e-8)=>assert(Math.abs(a-b)<t,`${a} != ${b}`);
for(const offset of [-2,0,2]){const s=E.create('pure',{road:'straight',offset,lookahead:7}),d=E.decision(s),arc=P.pursuitArc(s,d);near(arc[0][0],s.x);near(arc[0][1],s.y);near(arc.at(-1)[0],d.target.x);near(arc.at(-1)[1],d.target.y);if(offset){const curvature=Math.tan(d.raw)/E.L;for(const [x,y] of arc)near(x*x+(y-s.y-1/curvature)**2,1/curvature**2);}}
const s=E.run('pure',{},.1),held=P.heldSamples(s.history,'command');near(held[0][0],0);near(held[1][0],.05);near(held[2][0],.05);near(held.at(-1)[0],.1);
assert(!P.sameReference(E.create('pid',{profile:'step'}),E.create('pid',{profile:'brake'})));assert(!P.sameReference(E.create('pure',{road:'s'}),E.create('pure',{road:'lane'})));assert(P.sameReference(E.create('pure',{lookahead:3}),E.create('pure',{lookahead:14})));
// Capture labels emitted by the actual canvas renderer, not a separate UI description.
function capture(fn){const c=createCanvas(1000,500),ctx=c.getContext('2d'),labels=[],original=ctx.fillText.bind(ctx);ctx.fillText=(text,...args)=>{labels.push(text);original(text,...args)};fn(c);return labels;}
assert(capture(c=>P.actuation(c,[E.run('pid',{},1)])).includes('Acceleration-bounded request'));
assert(!capture(c=>P.actuation(c,[E.run('pid',{},1)])).includes('Angle-bounded request'));
const m=E.run('mpc',{delay:.2},1);assert(capture(c=>P.decisionPlot(c,m,E.decision(m))).includes('Predicted wheel response'));
const l=E.run('lqr',{},1),d=E.decision(l);near(-l.K[0]*d.path.e-l.K[1]*d.heading+d.feedforward,d.raw);assert(capture(c=>P.decisionPlot(c,l,d)).includes('Bend ahead'));
const f=P.main(createCanvas(1000,500),[s]);near(f.X(1)-f.X(0),f.Y(0)-f.Y(1));
const current=E.run('pure',{},1),other=E.run('pure',{},1);other.history.forEach(r=>r.raw=1000);near(P.actuation(createCanvas(1000,500),[current]).ymax,P.actuation(createCanvas(1000,500),[current],[other]).ymax);
console.log('PASS: pursuit arc endpoints/curvature; command timing; reference-compatible overlays; PID/MPC/LQR labels; LQR contribution sum; equal-axis geometry.');
// Inspect actual wheel strokes: both front wheels must show the bias used by the plant.
for(const bias of [-3,3]){
 const s=E.create('pure',{road:'straight',bias});s.delta=.1;s.yaw=.2;
 const c=createCanvas(1000,500),ctx=c.getContext('2d'),segments=[];let path=[];
 for(const method of ['moveTo','lineTo']){const original=ctx[method].bind(ctx);ctx[method]=(x,y)=>{path.push([x,y]);original(x,y);};}
 const begin=ctx.beginPath.bind(ctx);ctx.beginPath=()=>{path=[];begin();};
 const stroke=ctx.stroke.bind(ctx);ctx.stroke=()=>{if(ctx.lineWidth===5&&path.length===2)segments.push(path.slice());stroke();};
 P.main(c,[s]);assert.equal(segments.length,4);
 segments.forEach((p,i)=>near(Math.atan2(-(p[1][1]-p[0][1]),p[1][0]-p[0][0]),s.yaw+(i>=2?s.delta+bias*Math.PI/180:0)));
}
console.log('PASS: rendered front-wheel angles include positive and negative steering bias.');
