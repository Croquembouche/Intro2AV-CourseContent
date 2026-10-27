"""Independent MPC/LQR checks; requires NumPy and SciPy. Run from repository root."""
import subprocess
subprocess.run(['node','tools/slides/lecture8/export-control-reference.cjs'],check=True)
import json,numpy as np
from scipy.optimize import minimize,LinearConstraint
from scipy.linalg import solve_discrete_are
cases=json.load(open('.build/control-audit/fixed.json'));results=[]
for case in cases:
 c=case['cfg'];s=case['state'];d=case['decision'];N=c['horizon'];dt=.05;v=c['speed'];a=v*dt;b=a/2.7;alpha=dt/max(dt,c['lag']);delay=round(c['delay']/dt);limit=np.deg2rad(c['limit']);rate=np.deg2rad(c['rate'])*dt
 pending=[0]*max(0,delay-len(s['queue']))+s['queue'];ref=d['path']
 def rollout(u):
  ey=ref['e'];eh=d['heading'];delta=s['delta'];values=[];rates=[];steers=[]
  for t in range(N):
   old=delta;delta+=alpha*((pending[t] if t<delay else u[t-delay])-delta)
   if t<delay:delta=np.clip(delta,old-rate,old+rate)
   x=ref['x']+(t+.5)*a*np.cos(ref['yaw'])
   if c['road']=='s':dy=3/17*np.cos(x/17);ddy=-3/289*np.sin(x/17)
   elif c['road']=='lane':z=np.tanh((x-40)/9);dy=.2*(1-z*z);ddy=-.4/9*(1-z*z)*z
   else:dy=ddy=0
   ey,eh=ey+a*eh,eh+b*delta-a*ddy/(1+dy*dy)**1.5
   values.extend([ey,eh]);rates.append(delta-old);steers.append(delta)
  return np.array(values),np.array(rates),np.array(steers)
 zero=np.zeros(N);base,dr,_=rollout(zero);F=np.column_stack([rollout(e)[0]-base for e in np.eye(N)]);D=np.column_stack([rollout(e)[1]-dr for e in np.eye(N)]);W=np.tile([c['q'],2],N);H=2*(F.T@(W[:,None]*F)+c['r']*np.eye(N));g=2*F.T@(W*base);scale=max(1,np.linalg.norm(H,2));u=np.array(d['sequence'])
 opt=minimize(lambda x:(.5*x@H@x+g@x)/scale,u,jac=lambda x:(H@x+g)/scale,bounds=[(-limit,limit)]*N,constraints=[LinearConstraint(D,-rate-dr,rate-dr)],method='SLSQP',options={'ftol':1e-13,'maxiter':2000})
 assert opt.success,opt.message
 gap=(.5*u@H@u+g@u)-(.5*opt.x@H@opt.x+g@opt.x)
 assert d['converged'],case
 assert gap<1e-5*max(1,abs(d['cost'])),(gap,d['cost'])
 assert np.max(np.abs(rollout(u)[2]-d['applied']))<1e-10
 assert np.max(np.abs(rollout(u)[1]))<=rate+1e-7
 assert abs((rollout(u)[0]**2@W+c['r']*(u@u))-d['cost'])<1e-7
 results.append({'gap':float(gap),'input_difference':float(max(abs(u-opt.x))),'iterations':d['iterations']})
for case in json.load(open('.build/control-audit/lqr.json')):
 v=case['speed'];A=np.array([[1,v*.05],[0,1]]);B=np.array([[0],[v*.05/2.7]]);Q=np.diag([case['q'],2]);R=np.array([[case['r']]]);P=solve_discrete_are(A,B,Q,R);K=np.linalg.solve(R+B.T@P@B,B.T@P@A)
 assert np.max(np.abs(K[0]-case['K']))<1e-7
print('PASS',len(results),'constrained MPC cases vs independent SciPy rollouts and SLSQP; 36 LQR gains vs SciPy DARE')
print('Max objective gap:',max(x['gap'] for x in results),'Max first/full input deviation:',max(x['input_difference'] for x in results),'Max iterations:',max(x['iterations'] for x in results))
json.dump(results,open('.build/control-audit/reference-results.json','w'),indent=2)
