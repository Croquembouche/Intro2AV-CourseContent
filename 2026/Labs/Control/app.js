'use strict';
const E=Control,P=ControlPlots,L=ControlLessons,$=s=>document.querySelector(s),deg=180/Math.PI;
const Lab=window.Lab={mode:'pid',sessions:{},playing:false,timer:null,runToken:0,from:0};
let settingsTarget;
function session(){return Lab.sessions[Lab.mode];}
function createSession(mode){const first=L[mode].presets[0],cfg={...E.defaults,...first[2]};return {cfg,states:(mode==='compare'?['pure','stanley','lqr','mpc']:[mode]).map(a=>E.create(a,cfg)),saved:[],name:first[1],preset:first[0],view:mode==='compare'?'overview':'close'};}
function stop(){Lab.playing=false;clearInterval(Lab.timer);$('#play').textContent='Play';}
function archive(name){const q=session(),s=q.states[0];if(s.t<.049)return;
 const key=JSON.stringify([q.cfg,s.t]);if(q.saved.some(r=>r.key===key))return;
 q.saved.push({name:name||q.name,key,cfg:{...q.cfg},states:q.states.map(s=>({algorithm:s.algorithm,c:{...s.c},t:s.t,history:s.history.map(r=>({...r}))}))});
 if(q.saved.length>4)q.saved.shift();
}
function reset(keep=true){stop();Lab.runToken++;if(keep)archive();const q=session();q.states=(Lab.mode==='compare'?['pure','stanley','lqr','mpc']:[Lab.mode]).map(a=>E.create(a,q.cfg));Lab.states=q.states;Lab.cfg=q.cfg;$('#finish').disabled=false;draw();}
function change(key,value){archive();session().cfg[key]=value;session().name='Custom settings';session().preset='';$('#preset').value='';reset(false);}
function range(key,label,min,max,step,unit='',hint=''){
 const el=document.createElement('div');el.className='control';
 el.innerHTML=`<label for="${key}">${label}<output></output></label><input id="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${Lab.cfg[key]}">${hint?`<small>${hint}</small>`:''}`;
 const output=()=>{el.querySelector('output').textContent=key==='horizon'?`${(Lab.cfg[key]*E.dt).toFixed(2)} s ahead`:`${Lab.cfg[key]}${unit}`;};output();
 el.querySelector('input').oninput=e=>{change(key,+e.target.value);output();};settingsTarget.append(el);
}
function select(key,label,options){const el=document.createElement('div');el.className='control';el.innerHTML=`<label for="${key}">${label}</label><select id="${key}">${options.map(([v,n])=>`<option value="${v}">${n}</option>`).join('')}</select>`;el.querySelector('select').value=Lab.cfg[key];el.querySelector('select').onchange=e=>change(key,e.target.value);settingsTarget.append(el);}
function check(key,label){const el=document.createElement('div');el.className='control';el.innerHTML=`<label><span>${label}</span><input id="${key}" type="checkbox" ${Lab.cfg[key]?'checked':''}></label>`;el.querySelector('input').onchange=e=>change(key,e.target.checked);settingsTarget.append(el);}
function settings(){const m=Lab.mode;$('#settings').innerHTML='';settingsTarget=$('#settings');
 if(m==='pid'){
  select('profile','Speed reference',[['step','Constant target'],['brake','Brake to 4 m/s at 9 s']]);range('target','Target speed',6,18,1,' m/s');range('kp','P: react to the speed gap',0,3,.1);range('ki','I: correct a lasting gap',0,1.5,.05);range('kd','D: damp rapid changes',0,1,.05);range('grade','Hill load at 6 s',0,1.5,.1,' m/s²');check('antiwindup','Anti-windup');check('feedforward','Nominal drag feedforward');range('lag','Actuator response time',.05,.5,.01,' s');
 }else{
  select('road','Reference path',[['s','S-curve'],['lane','Lane change'],['straight','Straight']]);range('speed','Speed',3,20,1,' m/s');range('offset','Starting y offset',-4,4,.5,' m');
  if(['pure','compare'].includes(m))range('lookahead','Lookahead distance',2,18,.5,' m');
  if(['stanley','compare'].includes(m))range('gain','Stanley gain',.2,6,.1);
  if(['lqr','mpc','compare'].includes(m)){range('q','Tracking priority',.2,12,.2);range('r','Avoid large steering commands',1,50,1);}
  if(['mpc','compare'].includes(m))range('horizon','MPC preview',8,40,2,'','How far ahead the controller plans.');
  const d=document.createElement('details');d.className='advanced';d.innerHTML='<summary>Actuator limits and mismatch</summary>';d.open=Lab.cfg.delay>0||Lab.cfg.rate<60||Lab.cfg.bias!==0;settingsTarget.append(d);settingsTarget=d;
  range('limit','Steering angle limit',5,35,1,'°');range('rate','Steering rate limit',10,160,5,'°/s');range('lag','Actuator response time',.05,.5,.01,' s');range('delay','Command delay',0,.5,.05,' s');range('bias','Unmodeled steering bias',-3,3,.5,'°');
 }
}
function setup(){const m=Lab.mode,q=session(),lesson=L[m];Lab.cfg=q.cfg;Lab.states=q.states;
 $('#title').textContent=lesson.title;$('#description').textContent=lesson.description;$('#question').textContent=lesson.question;$('#idea').textContent=lesson.idea;$('#first-idea').textContent=lesson.idea;$('#explanation').textContent=lesson.explanation;$('#exercise').replaceChildren(...lesson.steps.map(t=>{let li=document.createElement('li');li.textContent=t;return li;}));$('#checkpoint').textContent=lesson.checkpoint;
 $('#preset').innerHTML='<option value="">Choose a guided case…</option>'+lesson.presets.map(([key,name])=>`<option value="${key}">${name}</option>`).join('');$('#preset').value=q.preset;
 $('#view-select').value=q.view;$('#view-select').disabled=m==='pid';$('#window').value=String(Lab.from);
 document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===m);b.setAttribute('aria-pressed',String(b.dataset.mode===m));});
 settings();draw();
}
function mode(m){stop();Lab.runToken++;if(!L[m])m='pid';Lab.mode=m;if(!Lab.sessions[m])Lab.sessions[m]=createSession(m);history.replaceState(null,'','#'+m);$('#finish').disabled=false;setup();}
function preset(key){const spec=L[Lab.mode].presets.find(p=>p[0]===key);if(!spec)return;archive();session().cfg={...E.defaults,...spec[2]};session().name=spec[1];session().preset=key;reset(false);setup();}
function advance(n=1){for(let i=0;i<n;i++){if(Lab.states[0].t>=20-1e-8){stop();break;}Lab.states.forEach(s=>E.step(s));}draw();}
function fmt(v,d=2){return Number(v).toFixed(d);}
function explain(s,d){
 const clamp=d.limited?'The request is being limited by what the actuator can do.':'The requested action fits the current input limits.';
 const turn=d.raw>.002?'left':d.raw<-.002?'right':'almost straight ahead';
 if(s.algorithm==='pid')return `${d.error>.1?'The vehicle is below the target speed.':d.error<-.1?'The vehicle is above the target speed.':'The vehicle is close to the target speed.'} Watch the bars for current-error correction, remembered error, and damping. ${d.frozen?'Anti-windup is pausing further buildup because the actuator is limited.':clamp}`;
 if(s.algorithm==='pure')return `The orange target tells the vehicle where to aim. It currently asks for a turn ${turn}. Watch how moving the target farther ahead changes the response. ${clamp}`;
 if(s.algorithm==='stanley')return `Stanley considers both where the front axle sits and where the vehicle points. The combined correction currently asks for a turn ${turn}. The magenta line shows the sideways gap. ${clamp}`;
 if(s.algorithm==='lqr')return `The feedback rule uses position and heading error to choose the correction, with anticipation for the bend. It currently requests a turn ${turn}. Change the priority to see the tracking-versus-steering tradeoff. ${clamp}`;
 return 'The green preview and steering sequence are the current plan. Only the orange first action is used next. Step moves the vehicle once, then updates the plan from the new state. The preview includes the configured steering response time and command delay. The first point is sent now; the wheels may respond later.';
}
function draw(){const ss=Lab.states,s=ss[0],q=session(),pid=Lab.mode==='pid',decisions=ss.map(x=>E.decision(x)),last=q.saved.at(-1),saved=last?.states||[];
 $('#time').textContent=`t = ${fmt(s.t)} / 20.00 s`;$('#status').textContent=s.t>=20-1e-8?'Run complete. Change a case to compare.':`${q.name} · ${s.t?'Use Step to inspect the next decision.':'Choose a case, then watch it run.'}`;
 const lost=!pid&&ss.some(x=>Math.abs(E.nearest(x.x,x.y,x.c.road).e)>5||Math.abs(E.wrap(x.yaw-E.nearest(x.x,x.y,x.c.road).yaw))>Math.PI/3);if(lost)$('#status').textContent='Tracking lost in this scenario. Large errors are outside the local model’s useful range; this is not a ranking of the algorithms.';if(decisions.some(d=>d.converged===false))$('#status').textContent='Solver has not converged. Treat this plan as approximate, not an optimized solution.';
 $('#save').disabled=s.t<.049;$('#export').disabled=s.t<.049;$('#decision-text').textContent=ss.length===1?explain(s,decisions[0]):'Four separate simulated vehicles receive the same reference and actuator settings. Use the full-route, error and applied-steering plots together.';
 $('#decision-title').textContent=pid?'What PID will request next':Lab.mode==='mpc'?'The next planned command sequence':'Why this steering command?';
 $('#decision-view').hidden=!['pid','mpc'].includes(Lab.mode);$('#solver').hidden=!['mpc','compare'].includes(Lab.mode);const md=decisions[ss.findIndex(s=>s.algorithm==='mpc')];if(md)$('#solver-text').textContent=`${md.iterations} active-set iterations. ${md.converged?"Converged":"NOT CONVERGED: current feasible iterate only"}. Constraint violation ${md.residual.toExponential(2)} rad. Predicted objective ${fmt(md.cost,3)}. These numbers do not certify optimality or safe tracking.`;
 P.main($('#view'),ss,q.view,saved,decisions);P.error($('#plot'),ss,saved,Lab.from);P.actuation($('#input-plot'),ss,saved);if(['pid','mpc'].includes(Lab.mode))P.decisionPlot($('#decision-view'),s,decisions[0]);
 const metrics=E.metrics(s,Lab.from),unit=pid?'m/s':'m';$('#metrics').hidden=ss.length!==1;$('#metrics').innerHTML=[['Typical error (RMS)',metrics.n?fmt(metrics.rms,3)+' '+unit:'—'],['Largest error',metrics.n?fmt(metrics.peak)+' '+unit:'—'],['Final error',metrics.n?fmt(metrics.final,3)+' '+unit:'—'],['Input size (RMS)',metrics.n?fmt(metrics.effort*(pid?1:deg))+(pid?' m/s²':'°'):'—']].map(([k,v])=>`<div><span>${k}</span><b>${v}</b></div>`).join('');
 $('#window-note').textContent=`Metrics: ${Lab.from===0?'full run including startup':'samples after 2 s'}; current duration ${fmt(s.t)} s. ${last?'The most recent saved run is dashed. Saved runs survive resets and tab switches.':'Changing settings saves the current run automatically.'}`;
 const table=$('#results');table.replaceChildren();const head=document.createElement('thead');head.innerHTML=`<tr><th>Run / controller</th><th>Duration</th><th>RMS (${unit})</th><th>Peak (${unit})</th><th>Final (${unit})</th><th>Command RMS (${pid?'m/s²':'°'})</th><th>Clipped (%)</th></tr>`;table.append(head);let body=document.createElement('tbody');
 for(const run of [{name:'Current: '+q.name,states:ss},...q.saved.slice().reverse()])for(const state of run.states){const m=E.metrics(state,Lab.from),tr=document.createElement('tr');for(const v of [run.name+(ss.length>1?' / '+P.names[state.algorithm]:''),fmt(state.t)+' s',m.n?fmt(m.rms,3):'—',m.n?fmt(m.peak,3):'—',m.n?fmt(m.final,3):'—',m.n?fmt(m.effort*(pid?1:deg)):'—',m.n?fmt(m.saturation,1):'—']){let td=document.createElement('td');td.textContent=v;tr.append(td);}body.append(tr);}table.append(body);
 $('#saved-count').textContent=`${q.saved.length} saved run${q.saved.length===1?'':'s'} (up to 4)`;$('#saved-settings').textContent=JSON.stringify(q.saved.map(r=>({name:r.name,settings:r.cfg})),null,2);
}
function download(name,text,type){const blob=new Blob([text],{type}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function csv(){const rows=['# settings='+JSON.stringify(Lab.cfg),'controller,time_s,x_m,y_m,yaw_rad,speed_mps,error,reference,command,actuator,qp_constraint_residual_rad,P_mps2,I_mps2,D_mps2,feedforward_mps2'];for(const s of Lab.states)for(const r of s.history)rows.push([s.algorithm,r.t,r.x,r.y,r.yaw,r.v,r.error,r.reference,r.command,r.actuator,r.residual,r.P,r.I,r.D,r.FF].join(','));return rows.join('\n');}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>mode(b.dataset.mode));$('#preset').onchange=e=>preset(e.target.value);$('#view-select').onchange=e=>{session().view=e.target.value;draw();};$('#window').onchange=e=>{Lab.from=+e.target.value;draw();};
$('#play').onclick=()=>{Lab.runToken++;$('#finish').disabled=false;if(Lab.playing)return stop();if(Lab.states[0].t>=20-1e-8)reset();Lab.playing=true;$('#play').textContent='Pause';Lab.timer=setInterval(()=>advance(),50);};
$('#step').onclick=()=>{Lab.runToken++;$('#finish').disabled=false;stop();advance();};$('#finish').onclick=async()=>{stop();const token=++Lab.runToken;$('#finish').disabled=true;while(token===Lab.runToken&&Lab.states[0].t<20-1e-8){advance(10);await new Promise(r=>setTimeout(r,0));}if(token===Lab.runToken)$('#finish').disabled=false;};
$('#reset').onclick=()=>reset();$('#defaults').onclick=()=>{archive();session().cfg={...E.defaults};session().name='Default';session().preset='';reset(false);setup();};$('#save').onclick=()=>{archive();draw();};$('#clear-saved').onclick=()=>{session().saved=[];draw();};$('#export').onclick=()=>download('lecture8-'+Lab.mode+'.csv',csv(),'text/csv');$('#export-saved').onclick=()=>{archive();download('lecture8-'+Lab.mode+'-comparisons.json',JSON.stringify({mode:Lab.mode,measurementStart:Lab.from,runs:session().saved},null,2),'application/json');draw();};
Lab.modeTo=mode;Lab.advance=advance;Lab.reset=reset;Lab.draw=draw;Lab.loadPreset=preset;Lab.csv=csv;Lab.archive=archive;mode(location.hash.slice(1)||'pid');
