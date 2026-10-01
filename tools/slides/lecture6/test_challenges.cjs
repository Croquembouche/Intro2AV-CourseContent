const fs=require('fs'),vm=require('vm'),assert=require('assert');
const context={window:{}};vm.createContext(context);vm.runInContext(fs.readFileSync('2026/Labs/Mapping/challenges.js','utf8'),context);
const A=context.window.MappingChallenges;
const base={grade:6,bump:.18,drift:1,sigma:.6,gps:false,loop:false,full3d:true,quality:true,gpsGate:true,rebuild:true,failure:'none'};
function run(p={},i=120){const c={...base,...p};return A.estimate(A.build(c),c,i)}
const local=run(),gps=run({gps:true}),loop=run({loop:true}),both=run({gps:true,loop:true});
assert(gps.positionRms<local.positionRms*.5,'GPS should bound the selected odometry drift');
assert(loop.gap<.02&&loop.mapRms<local.mapRms*.3,'Verified loop should close and improve this map');
assert(!run({loop:true},119).closure,'No future loop information');
assert(run({gps:true},7).fixes.every(f=>f.i<=7),'No future GPS information');
assert(run({gps:true,loop:true,rebuild:false}).mapRms>both.mapRms*3,'Trajectory correction must not silently correct unreconstructed geometry');
assert(run({failure:'match',quality:true}).mapRms<run({failure:'match',quality:false}).mapRms*.4,'Motion gating must prevent the injected false match');
assert(run({failure:'lost'}).skipped===18,'Pause integration during tracking loss');
assert(run({failure:'lost',quality:false}).skipped===0,'Disabled quality gate must expose bad insertion');
const biased=run({gps:true,failure:'gps-bias'});assert(biased.fixes.some(f=>!f.accepted));
assert(biased.mapRms<run({gps:true,failure:'gps-bias',gpsGate:false}).mapRms*.4,'Innovation gate should reject injected bias');
assert(run({gps:true,failure:'outage'}).positionRms>gps.positionRms,'Missing GPS should allow more drift');
assert(run({drift:0,gps:false,grade:12,bump:.5,full3d:false}).mapRms>1,'Planar model should distort uneven terrain');
assert(run({drift:0,grade:12,bump:.5}).mapRms<1e-5,'Correct 3D poses must preserve noise-free observations');
const p=[4,-2,1],v=A.inverse(A.rotate(p,.7,.12),.7,.12);assert(Math.hypot(...v.map((x,i)=>x-p[i]))<1e-10);
for(const failure of ['none','match','lost','gps-bias','outage'])for(const full3d of [true,false])for(const sigma of [.3,4])for(const i of [0,49,50,67,119,120]){
 const r=run({failure,full3d,sigma,gps:true,loop:true},i);assert([r.positionRms,r.mapRms,r.heightError].every(Number.isFinite));
}
console.log('PASS: GPS, loop timing, terrain, map rebuilding, false matches, tracking loss, biased/outage GPS and numerical stability');
console.log(JSON.stringify({odometry:{positionRms:local.positionRms,mapRms:local.mapRms,gap:local.gap},gps:{positionRms:gps.positionRms,mapRms:gps.mapRms,gap:gps.gap},gpsAndLoop:{positionRms:both.positionRms,mapRms:both.mapRms,gap:both.gap}},null,2));
