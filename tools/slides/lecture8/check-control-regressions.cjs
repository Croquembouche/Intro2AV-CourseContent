/* Analytic geometry, actuator prediction and published-scenario regressions; no browser. */
const E=require('../../../2026/Labs/Control/engine.js'),L=require('../../../2026/Labs/Control/lessons.js'),assert=require('node:assert/strict');
const near=(x,y,tol=1e-9)=>assert(Math.abs(x-y)<tol,`${x} != ${y}`);
// Pure Pursuit on a straight line: target lies on the lookahead circle, steering turns toward it.
for(const offset of [-2,2]){const s=E.create('pure',{road:'straight',offset,lookahead:7});const d=E.decision(s);assert(d.distance>=7&&d.distance<7.1);near(d.raw,Math.atan(-2*E.L*offset/(d.distance*d.distance)));assert(d.raw*offset<0);}
// Stanley must use the front axle. Put that axle exactly on the reference with a heading error.
for(const yaw of [-.2,.2]){const s=E.create('stanley',{road:'straight'});s.yaw=yaw;s.y=-E.L*Math.sin(yaw);near(E.decision(s).raw,-yaw);}
// P-only equilibrium under constant drag and hill load is analytically known.
const cfg={kp:.8,ki:0,kd:0,grade:.8},pid=E.run('pid',cfg,60);near(pid.v,(cfg.kp*E.defaults.target-cfg.grade)/(cfg.kp+.08),1e-8);
for(const mode of ['mpc','compare'])for(const [key,,cfg]of L[mode].presets){let s=E.create('mpc',cfg);for(let i=0;i<400;i++){let d=E.decision(s);assert(d.converged,`${mode}/${key}: solver`);const expected=d.applied[0];E.step(s);near(s.delta,expected,1e-7);}assert(E.metrics(s).rms<.6,`${mode}/${key}: tracking regression`);}
// Check all configured delays, including a delay longer than the prediction horizon.
for(const delay of [0,.05,.2,.5])for(const lag of [.05,.12,.5]){let s=E.create('mpc',{horizon:8,delay,lag,rate:10});for(let i=0;i<30;i++){const d=E.decision(s);assert(d.converged);E.step(s);near(s.delta,d.applied[0],1e-7);}}
console.log('PASS: Pure Pursuit geometry, Stanley front-axle convention, PID equilibrium, all nine MPC teaching/comparison cases, and actuator prediction across 12 lag/delay combinations.');
// Unknown bias affects physical wheel angle and yaw, but is not secretly added to MPC's model.
for(const bias of [-3,3]){const s=E.create('pure',{bias});const yaw=s.yaw;const row=E.step(s),angle=s.delta+bias*Math.PI/180;near(row.effectiveSteering,angle);near(s.yaw,E.wrap(yaw+s.c.speed/E.L*Math.tan(angle)*E.dt));}
const preset=(mode,key)=>L[mode].presets.find(p=>p[0]===key)[2];
const pHill=E.run('pid',preset('pid','p-hill')),piHill=E.run('pid',preset('pid','pi-hill'));
assert(Math.abs(piHill.history.at(-1).error)<Math.abs(pHill.history.at(-1).error));
const brakePeak=key=>Math.max(...E.run('pid',preset('pid',key)).history.filter(r=>r.t>8).map(r=>r.v-r.reference));
assert(brakePeak('antiwindup')<brakePeak('windup'));
for(const dv of [-.1,0,.1]){const s=E.create('pid',{kd:1});s.v=5+dv;s.lastV=5;const d=E.decision(s);if(dv)assert(d.D*dv<0);else near(d.D,0);}
const initial=(algorithm,c)=>Math.abs(E.decision(E.create(algorithm,{road:'straight',...c})).raw);
assert(initial('pure',{lookahead:3})>initial('pure',{lookahead:14}));
assert(initial('stanley',{gain:3})>initial('stanley',{gain:.5}));
assert(initial('lqr',{r:3})>initial('lqr',{r:30}));
console.log('PASS: physical steering bias; PI hill recovery; anti-windup braking; derivative direction; lookahead, Stanley gain, and LQR effort tradeoffs.');
