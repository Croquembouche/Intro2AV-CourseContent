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
