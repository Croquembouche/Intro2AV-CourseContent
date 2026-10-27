/* Shared rendering of computed simulation data. No browser dependencies. */
(function(root){
'use strict';
const E=typeof module!=='undefined'?require('./engine.js'):root.Control;
const colors={pid:'#007aac',pure:'#007aac',stanley:'#c86b19',lqr:'#8553b0',mpc:'#087b61'},names={pid:'PID',pure:'Pure Pursuit',stanley:'Stanley',lqr:'LQR',mpc:'MPC'},deg=180/Math.PI;
function frame(canvas,xmin,xmax,ymin,ymax,xlabel,ylabel,showXTicks=true){
 const c=canvas.getContext('2d'),W=canvas.width,H=canvas.height;c.fillStyle='#f8fbfd';c.fillRect(0,0,W,H);
 const left=76,right=W-28,top=65,bottom=H-48;
 const X=x=>left+(x-xmin)/(xmax-xmin)*(right-left),Y=y=>bottom-(y-ymin)/(ymax-ymin)*(bottom-top);
 c.font='18px Arial';c.lineWidth=1;
 for(let i=0;i<=4;i++){let y=ymin+(ymax-ymin)*i/4;c.strokeStyle='#dbe5ed';c.beginPath();c.moveTo(left,Y(y));c.lineTo(right,Y(y));c.stroke();c.fillStyle='#496579';c.textAlign='right';c.fillText(y.toFixed(1),left-10,Y(y)+5);}
 if(showXTicks)for(let i=0;i<=5;i++){let x=xmin+(xmax-xmin)*i/5;c.fillStyle='#496579';c.textAlign='center';c.fillText(x.toFixed(xmax-xmin<3?1:0),X(x),bottom+24);}
 c.fillStyle='#294b67';c.textAlign='left';c.fillText(ylabel,16,22);c.textAlign='right';c.fillText(xlabel,right,H-10);
 return {c,X,Y,left,right,top,bottom,xmin,xmax,ymin,ymax};
}
function line(f,points,color,width=3,dash=[]){const {c,X,Y}=f;c.save();c.beginPath();c.rect(f.left,f.top,f.right-f.left,f.bottom-f.top);c.clip();c.strokeStyle=color;c.lineWidth=width;c.setLineDash(dash);c.beginPath();points.forEach((p,i)=>i?c.lineTo(X(p[0]),Y(p[1])):c.moveTo(X(p[0]),Y(p[1])));c.stroke();c.restore();}
function dot(f,x,y,color,r=5){f.c.fillStyle=color;f.c.beginPath();f.c.arc(f.X(x),f.Y(y),r,0,Math.PI*2);f.c.fill();}
function label(f,x,y,t,color='#17324d',dx=8,dy=-10){f.c.font='18px Arial';f.c.textAlign='left';const w=f.c.measureText(t).width,px=E.clamp(f.X(x)+dx,f.left+4,f.right-w-4),py=E.clamp(f.Y(y)+dy,f.top+22,f.bottom-8);f.c.fillStyle='rgba(248,251,253,0.92)';f.c.fillRect(px-3,py-18,w+6,23);f.c.fillStyle=color;f.c.fillText(t,px,py);}
function legend(f,items){let x=f.left;f.c.font='17px Arial';f.c.textAlign='left';for(const [text,color,dash] of items){f.c.strokeStyle=color;f.c.lineWidth=3;f.c.setLineDash(dash?[5,4]:[]);f.c.beginPath();f.c.moveTo(x,43);f.c.lineTo(x+18,43);f.c.stroke();f.c.fillStyle=color;f.c.fillText(text,x+24,49);x+=f.c.measureText(text).width+44;}f.c.setLineDash([]);}
function vehicle(f,s,color){
 const world=(a,b)=>[s.x+a*Math.cos(s.yaw)-b*Math.sin(s.yaw),s.y+a*Math.sin(s.yaw)+b*Math.cos(s.yaw)];
 const corners=[world(-.7,-.85),world(3.4,-.85),world(3.4,.85),world(-.7,.85),world(-.7,-.85)];
 f.c.fillStyle=color+'20';f.c.beginPath();corners.forEach((p,i)=>i?f.c.lineTo(f.X(p[0]),f.Y(p[1])):f.c.moveTo(f.X(p[0]),f.Y(p[1])));f.c.fill();line(f,corners,color,2);
 for(let a of [0,E.L])for(let b of [-.95,.95]){let [x,y]=world(a,b),angle=s.yaw+(a?s.delta:0);line(f,[[x-.38*Math.cos(angle),y-.38*Math.sin(angle)],[x+.38*Math.cos(angle),y+.38*Math.sin(angle)]],color,5);}
 const front=world(E.L,0),ahead=world(E.L+2,0);line(f,[[s.x,s.y],ahead],color,2);dot(f,s.x,s.y,color,5);dot(f,...front,color,4);return front;
}
// Only overlay histories with the same reference; parameter changes remain comparable.
function sameReference(a,b){return a.algorithm==='pid'&&b.algorithm==='pid'?a.c.target===b.c.target&&a.c.profile===b.c.profile:a.algorithm!=='pid'&&b.algorithm!=='pid'&&a.c.road===b.c.road;}
function pursuitArc(state,d){
 const dx=d.target.x-state.x,dy=d.target.y-state.y,x=dx*Math.cos(state.yaw)+dy*Math.sin(state.yaw),y=-dx*Math.sin(state.yaw)+dy*Math.cos(state.yaw);
 if(Math.abs(y)<1e-9)return [[state.x,state.y],[d.target.x,d.target.y]];
 const radius=(x*x+y*y)/(2*y),angle=2*Math.atan2(y,x);
 return Array.from({length:41},(_,i)=>{const a=angle*i/40,u=radius*Math.sin(a),v=radius*(1-Math.cos(a));return [state.x+u*Math.cos(state.yaw)-v*Math.sin(state.yaw),state.y+u*Math.sin(state.yaw)+v*Math.cos(state.yaw)];});
}
function heldSamples(history,key,scale=1){const points=[];for(const r of history){const start=r.commandTime??r.t-E.dt,value=r[key]*scale;points.push([start,value],[r.t,value]);}return points;}
function main(canvas,states,view='close',saved=[],decisions=[]){
 const s=states[0],cfg=s.c,pid=s.algorithm==='pid';saved=saved.filter(old=>sameReference(s,old));let f;
 if(pid){const histories=[...states,...saved].flatMap(x=>x.history);let ymax=Math.max(18,cfg.target+3,...histories.map(r=>r.v+1));f=frame(canvas,0,20,0,ymax,'Time (s)','Speed (m/s)');
  const target=cfg.profile==='brake'?[[0,cfg.target],[9,cfg.target],[9,4],[20,4]]:[[0,cfg.target],[20,cfg.target]];
  line(f,target,'#758a9a',2,[7,5]);saved.forEach(x=>line(f,x.history.map(r=>[r.t,r.v]),'#aa6292',3,[7,5]));line(f,s.history.map(r=>[r.t,r.v]),colors.pid,4);
  if(cfg.grade){line(f,[[6,0],[6,ymax]],'#bd7427',1,[4,4]);label(f,6,ymax*.8,'Hill starts', '#9c5818');}
  legend(f,[['Target','#758a9a',true],['Current','#007aac'],...(saved.length?[['Saved','#aa6292',true]]:[])]);return f;
 }
 if(view==='close'){
  const forward=Math.max(21,cfg.lookahead+5,s.algorithm==='mpc'?cfg.speed*cfg.horizon*E.dt+5:0),width=forward+7;
  const yrange=width*(canvas.height-113)/(canvas.width-104),center=(s.y+E.road(s.x,cfg.road).y)/2;
  f=frame(canvas,s.x-7,s.x+forward,center-yrange/2,center+yrange/2,'x (m), equal axis scale','Close-up: heading, target, and error');
 }else{
  const ys=[...states,...saved].flatMap(x=>x.history.map(r=>r.y)),xmax=Math.max(80,cfg.speed*20+8);
  f=frame(canvas,-5,xmax,Math.min(-5,...ys)-1,Math.max(6,...ys)+1,'x (m), y axis enlarged','Full route: lateral position y (m)');
 }
 const path=[];for(let x=f.xmin;x<f.xmax;x+=(f.xmax-f.xmin)/400)path.push([x,E.road(x,cfg.road).y]);line(f,path,'#768c9e',3,[8,5]);
 for(let old of saved)line(f,old.history.map(r=>[r.x,r.y]),states.length===1?'#aa6292':colors[old.algorithm],2,[8,5]);
 states.forEach((state,i)=>{const color=colors[state.algorithm],d=decisions[i]||E.decision(state);line(f,state.history.map(r=>[r.x,r.y]),color,3);
  if(view==='overview'){dot(f,state.x,state.y,color,6);if(state.algorithm==='mpc')line(f,[[state.x,state.y],...d.pred.map(p=>[p.x,p.y])],'#10a77f',3,[3,3]);return;}
  vehicle(f,state,color);
  if(states.length===1){
   if(state.algorithm==='stanley'){
    line(f,[[d.front.x,d.front.y],[d.frontPath.x,d.frontPath.y]],'#b14e86',2,[5,4]);dot(f,d.frontPath.x,d.frontPath.y,'#b14e86');label(f,d.front.x,d.front.y,'Front axle',color,8,-26);const p=d.frontPath;line(f,[[p.x,p.y],[p.x+4*Math.cos(p.yaw),p.y+4*Math.sin(p.yaw)]],'#087b61',3);label(f,p.x+4*Math.cos(p.yaw),p.y+4*Math.sin(p.yaw),'Path direction','#087b61',6,-20);label(f,d.frontPath.x,d.frontPath.y,'Front-axle gap','#9d3570',9,26);
   }else{line(f,[[state.x,state.y],[d.path.x,d.path.y]],'#b14e86',2,[5,4]);label(f,state.x,state.y,'Rear axle',color,-60,33);}
   if(state.algorithm==='pure'){line(f,pursuitArc(state,d),'#c16b16',3,[4,4]);dot(f,d.target.x,d.target.y,'#c16b16',7);label(f,d.target.x,d.target.y,'Target on requested arc','#9c5914');}
   if(state.algorithm==='mpc'){line(f,[[state.x,state.y],...d.pred.map(p=>[p.x,p.y])],'#10a77f',4,[5,4]);d.pred.forEach((p,j)=>{if(j%3===0)dot(f,p.x,p.y,'#10a77f',3);});const end=d.pred.at(-1);if(end)label(f,end.x,end.y,`${(cfg.horizon*E.dt).toFixed(2)} s prediction`,'#087b61',6,-20);}
  }
 });
 legend(f,[['Reference','#768c9e',true],...states.map(s=>[names[s.algorithm],colors[s.algorithm]]),...(states.some(s=>s.algorithm==='mpc')?[['MPC prediction','#10a77f',true]]:[]),...(saved.length&&states.length===1?[['Saved run','#aa6292',true]]:[]),...(states.length===1&&s.algorithm==='pure'?[['Requested arc','#c16b16',true]]:[])]);return f;
}
function error(canvas,states,saved=[],from=0){saved=saved.filter(old=>sameReference(states[0],old));const all=[...states,...saved],peak=Math.max(1,...all.flatMap(x=>x.history.map(r=>Math.abs(r.error)))),f=frame(canvas,0,20,-peak*1.1,peak*1.1,'Time (s)',states[0].algorithm==='pid'?'Speed error (m/s)':'Rear-axle cross-track error (m)');
 if(from){f.c.fillStyle='#d9eaf888';f.c.fillRect(f.X(from),f.top,f.right-f.X(from),f.bottom-f.top);}
 line(f,[[0,0],[20,0]],'#768c9e',1,[5,4]);for(let s of saved)line(f,s.history.map(r=>[r.t,r.error]),states.length===1?'#aa6292':colors[s.algorithm],2,[7,5]);for(let s of states)line(f,s.history.map(r=>[r.t,r.error]),colors[s.algorithm],3);
 legend(f,states.map(s=>[names[s.algorithm],colors[s.algorithm]]).concat(saved.length?[['Saved: dashed','#aa6292',true]]:[]));return f;}
function actuation(canvas,states,saved=[]){const pid=states[0].algorithm==='pid',scale=pid?1:deg,all=states.flatMap(x=>x.history),limit=pid?2.5:states[0].c.limit,low=pid?-4:-limit;
 const max=Math.max(limit*1.2,...all.map(r=>Math.abs(r.raw*scale))),min=pid?Math.min(low*1.2,...all.map(r=>r.raw*scale)):-max,f=frame(canvas,0,20,min,max,'Time (s)',pid?'Acceleration command (m/s²)':'Steering command (degrees)');
 line(f,[[0,limit],[20,limit]],'#c15b45',1,[5,4]);line(f,[[0,low],[20,low]],'#c15b45',1,[5,4]);
 if(states.length===1){line(f,heldSamples(states[0].history,'raw',scale),'#b07837',2,[5,4]);line(f,heldSamples(states[0].history,'command',scale),'#007aac',2);line(f,states[0].history.map(r=>[r.t,r.actuator*scale]),'#17324d',3);legend(f,[['Requested','#b07837',true],[pid?'Acceleration-bounded request':'Angle-bounded request','#007aac'],['Applied','#17324d']]);}
 else{states.forEach(s=>line(f,s.history.map(r=>[r.t,r.actuator*scale]),colors[s.algorithm],2));legend(f,states.map(s=>[names[s.algorithm],colors[s.algorithm]]));}return f;
}
function decisionPlot(canvas,s,d){
 if(['pid','lqr'].includes(s.algorithm)){
  const pid=s.algorithm==='pid',vals=pid?[d.P,d.I,d.D,d.FF]:[-s.K[0]*d.path.e*deg,-s.K[1]*d.heading*deg,d.feedforward*deg],max=Math.max(3,...vals.map(Math.abs)),min=Math.min(-max*.2,...vals.map(v=>v*1.2)),f=frame(canvas,0,vals.length,min,max*1.2,'',pid?'Acceleration contributions (m/s²)':'Requested steering contributions (degrees)',false);
  const labels=pid?['P: now','I: accumulated','D: damping','Feedforward']:['Position gap','Heading gap','Bend ahead'];vals.forEach((v,i)=>{f.c.fillStyle=['#007aac','#8756b2','#c37724','#09826b'][i];f.c.fillRect(f.X(i+.2),Math.min(f.Y(0),f.Y(v)),f.X(.75)-f.X(.2),Math.abs(f.Y(v)-f.Y(0)));label(f,i+.2,v,v.toFixed(2),'#17324d',0,-10);f.c.fillStyle='#17324d';f.c.textAlign='left';f.c.fillText(labels[i],f.X(i+.2),f.bottom+27);});return f;
 }
 if(s.algorithm==='mpc'){
  const horizon=s.c.horizon*E.dt,f=frame(canvas,0,horizon,-s.c.limit*1.2,s.c.limit*1.2,'Future time after current state (s)','Requested and predicted steering (degrees)');
  line(f,[[0,s.c.limit],[horizon,s.c.limit]],'#c15b45',1,[5,4]);line(f,[[0,-s.c.limit],[horizon,-s.c.limit]],'#c15b45',1,[5,4]);
  const pts=d.sequence.map((u,i)=>[i*E.dt,u*deg]),held=d.sequence.flatMap((u,i)=>[[i*E.dt,u*deg],[(i+1)*E.dt,u*deg]]);line(f,held,'#10a77f',3);line(f,[[0,s.delta*deg],...d.applied.map((u,i)=>[(i+1)*E.dt,u*deg])],'#17324d',2,[5,4]);pts.forEach((p,i)=>dot(f,...p,i===0?'#d96c1f':'#10a77f',i===0?7:3));if(pts.length)label(f,pts[0][0],pts[0][1],'Send this command now','#a54e12',12,-14);legend(f,[['Commands sent','#087b61'],['Predicted wheel response','#17324d',true]]);return f;
 }
 return null;
}
const api={sameReference,pursuitArc,heldSamples,main,error,actuation,decisionPlot,colors,names};if(typeof module!=='undefined')module.exports=api;root.ControlPlots=api;
})(typeof window==='undefined'?globalThis:window);
