"""Compute teaching traces from real KITTI frames. No reference poses enter either estimator."""
from pathlib import Path
import argparse, json, hashlib
import cv2
import numpy as np
from scipy.spatial import cKDTree

ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'2026/Labs/Mapping'
def rounded(a,n=3): return np.asarray(a).round(n).tolist()
def voxel(p,size):
    _,idx=np.unique(np.floor(p/size).astype(np.int32),axis=0,return_index=True)
    return p[np.sort(idx)]
def transform(p,T): return p@T[:3,:3].T+T[:3,3]
def tri(a,b,A,B,K):
    h=cv2.triangulatePoints(K@A[:3],K@B[:3],a.T,b.T)
    X=(h[:3]/h[3]).T
    xa=transform(X,A); xb=transform(X,B)
    pa=(xa@K.T);pa=pa[:,:2]/pa[:,2:]
    pb=(xb@K.T);pb=pb[:,:2]/pb[:,2:]
    ca=-A[:3,:3].T@A[:3,3];cb=-B[:3,:3].T@B[:3,3]
    ra=X-ca;rb=X-cb
    angle=np.degrees(np.arccos(np.clip(np.sum(ra*rb,axis=1)/(np.linalg.norm(ra,axis=1)*np.linalg.norm(rb,axis=1)),-1,1)))
    valid=np.isfinite(X).all(1)&(xa[:,2]>.1)&(xb[:,2]>.1)&(xa[:,2]<80)&(xb[:,2]<80)&(angle>.4)&(np.linalg.norm(pa-a,axis=1)<2)&(np.linalg.norm(pb-b,axis=1)<2)
    return X,valid

def main():
    p=argparse.ArgumentParser();p.add_argument('--source',type=Path,default=Path('/mnt/nas-direct/KITTI/tracking/training'));p.add_argument('--sequence',default='0001');p.add_argument('--start',type=int,default=20);p.add_argument('--count',type=int,default=80);args=p.parse_args()
    cv2.setRNGSeed(6);OUT.mkdir(parents=True,exist_ok=True);(OUT/'frames').mkdir(exist_ok=True)
    calib={}
    for line in (args.source/'calib'/f'{args.sequence}.txt').read_text().splitlines():
        key,values=line.split(':',1);calib[key]=np.fromstring(values,sep=' ')
    K=calib['P2'].reshape(3,4)[:,:3]
    files=[args.source/'image_02'/args.sequence/f'{i:06d}.png' for i in range(args.start,args.start+args.count)]
    images=[cv2.imread(str(f)) for f in files];assert all(i is not None for i in images)
    gray=[cv2.cvtColor(i,cv2.COLOR_BGR2GRAY) for i in images]
    frames=[];visual_points=[];lidar_points=[];hashes={};poses=[]
    # Each feature keeps an identity, an anchor observation, and optionally a mapped 3D point.
    active={};next_id=0;world={};birth={};A=np.eye(4);anchor_pose={0:A.copy()};last=A.copy()
    def detect(i):
        nonlocal next_id
        mask=np.full(gray[i].shape,255,np.uint8);mask[:40]=0
        for v in active.values():cv2.circle(mask,tuple(np.round(v['uv']).astype(int)),10,0,-1)
        corners=cv2.goodFeaturesToTrack(gray[i],maxCorners=max(0,700-len(active)),qualityLevel=.015,minDistance=10,mask=mask)
        if corners is not None:
            for uv in corners[:,0]:active[next_id]={'uv':uv,'anchor':uv.copy(),'at':i};next_id+=1
        anchor_pose[i]=last.copy()
    detect(0)
    local=[];L=np.eye(4);previous=np.eye(4);velocity=np.eye(4)
    for i,(f,img) in enumerate(zip(files,images)):
        tracks=[];pnp_ids=set();reproj=None;status='Collecting parallax';added=[]
        if i:
            ids=list(active);old=np.float32([active[j]['uv'] for j in ids]).reshape(-1,1,2)
            now,ok,_=cv2.calcOpticalFlowPyrLK(gray[i-1],gray[i],old,None,winSize=(21,21),maxLevel=3)
            back,bok,_=cv2.calcOpticalFlowPyrLK(gray[i],gray[i-1],now,None,winSize=(21,21),maxLevel=3)
            good=ok[:,0].astype(bool)&bok[:,0].astype(bool)&(np.linalg.norm(back[:,0]-old[:,0],axis=1)<1)&(now[:,0,0]>2)&(now[:,0,0]<img.shape[1]-2)&(now[:,0,1]>2)&(now[:,0,1]<img.shape[0]-2)
            active={j:active[j] for j,g in zip(ids,good) if g}
            for j,uv,prev,g in zip(ids,now[:,0],old[:,0],good):
                if g:active[j]['uv']=uv;tracks.append({'id':j,'a':rounded(prev),'b':rounded(uv),'used':False})
            if i==5:
                init_ids=[j for j in active if active[j]['at']==0]
                a=np.float32([active[j]['anchor'] for j in init_ids]);b=np.float32([active[j]['uv'] for j in init_ids])
                E,mask=cv2.findEssentialMat(a,b,K,method=cv2.RANSAC,prob=.999,threshold=1)
                count,R,t,mask=cv2.recoverPose(E,a,b,K,mask=mask)
                last=np.eye(4);last[:3,:3]=R;last[:3,3]=t[:,0] # one baseline unit, not meters
                X,valid=tri(a,b,np.eye(4),last,K);valid &=mask[:,0]>0
                for j,x,g in zip(init_ids,X,valid):
                    if g:world[j]=x;birth[j]=i;added.append(j);pnp_ids.add(j)
                status='Two-view initialization'
            elif i>5:
                mapped=[j for j in active if j in world]
                if len(mapped)>=12:
                    x=np.float32([world[j] for j in mapped]);u=np.float32([active[j]['uv'] for j in mapped])
                    ok,r,t,inliers=cv2.solvePnPRansac(x,u,K,None,iterationsCount=150,reprojectionError=2,confidence=.999,flags=cv2.SOLVEPNP_EPNP)
                    if ok and inliers is not None and len(inliers)>=12:
                        ix=inliers[:,0];r,t=cv2.solvePnPRefineLM(x[ix],u[ix],K,None,r,t)
                        last=np.eye(4);last[:3,:3]=cv2.Rodrigues(r)[0];last[:3,3]=t[:,0];pnp_ids={mapped[k] for k in ix}
                        proj=cv2.projectPoints(x[ix],r,t,K,None)[0][:,0];reproj=float(np.sqrt(np.mean(np.sum((proj-u[ix])**2,axis=1))))
                        status='PnP tracking against sparse map'
                        groups={active[j]['at'] for j in active if j not in world and i-active[j]['at']>=5}
                        for at in groups:
                            js=[j for j in active if j not in world and active[j]['at']==at]
                            a=np.float32([active[j]['anchor'] for j in js]);b=np.float32([active[j]['uv'] for j in js]);X,valid=tri(a,b,anchor_pose[at],last,K)
                            for j,x,g in zip(js,X,valid):
                                if g:world[j]=x;birth[j]=i;added.append(j)
                    else:status='Tracking lost: map update paused'
                else:status='Tracking lost: insufficient mapped tracks'
            for tr in tracks:tr['used']=tr['id'] in pnp_ids;tr['mapped']=tr['id'] in world
        if i>=5 and status.startswith(('PnP','Two-view')):
            for j in added:visual_points.append({'id':j,'at':i,'p':rounded(world[j])})
        if i%5==0:detect(i)
        center=-last[:3,:3].T@last[:3,3];poses.append(rounded(center))
        jpg=OUT/'frames'/f'{i:03d}.jpg';cv2.imwrite(str(jpg),img,[cv2.IMWRITE_JPEG_QUALITY,84])
        hashes[f.name]=hashlib.sha256(f.read_bytes()).hexdigest()
        # 3D scan-to-local-map point-to-plane registration. Planar samples define the objective.
        raw=np.fromfile(args.source/'velodyne'/args.sequence/f.name.replace('.png','.bin'),dtype=np.float32).reshape(-1,4)[:,:3]
        raw=raw[np.isfinite(raw).all(1)&(np.linalg.norm(raw,axis=1)>3)&(np.linalg.norm(raw,axis=1)<40)&(raw[:,2]>-2.5)&(raw[:,2]<4)]
        src=voxel(raw,.65)
        if len(src)>3500:src=src[np.linspace(0,len(src)-1,3500).astype(int)]
        trace=[];pairs=[];plane_count=0;rmse=None
        if local:
            target=voxel(np.concatenate(local),.5);tree=cKDTree(target)
            d,kn=tree.query(target,k=12);neighbors=target[kn];centered=neighbors-neighbors.mean(1)[:,None,:]
            cov=np.einsum('nki,nkj->nij',centered,centered)/12
            ev,v=np.linalg.eigh(cov);normal=v[:,:,0];planar=(ev[:,0]/np.maximum(ev.sum(1),1e-9)<.025)&(d[:,-1]<2.5)
            plane_count=int(planar.sum());L=L@velocity
            for iteration in range(15):
                moved=transform(src,L);dist,idx=tree.query(moved);accept=(dist<1.4)&planar[idx]
                if accept.sum()<30:break
                p3=moved[accept];q=target[idx[accept]];n=normal[idx[accept]];res=np.sum(n*(p3-q),1)
                J=np.concatenate([np.cross(p3,n),n],axis=1);weights=np.minimum(1,.2/np.maximum(np.abs(res),1e-6))
                dx=np.linalg.lstsq(J*weights[:,None]**.5,-res*weights**.5,rcond=None)[0]
                D=np.eye(4);D[:3,:3]=cv2.Rodrigues(dx[:3])[0];D[:3,3]=dx[3:];L=D@L
                trace.append(float(np.sqrt(np.mean(res**2))))
                if np.linalg.norm(dx)<1e-4:break
            moved=transform(src,L);dist,idx=tree.query(moved);accept=(dist<1.4)&planar[idx];res=np.sum(normal[idx]*(moved-target[idx]),1)
            rmse=float(np.sqrt(np.mean(res[accept]**2))) if accept.any() else None
            for j in np.flatnonzero(accept)[::max(1,int(accept.sum()/180))]:pairs.append({'source':int(j),'q':rounded(target[idx[j]]),'res':round(float(abs(res[j])),3)})
            velocity=np.linalg.inv(previous)@L
        else:moved=src.copy();accept=np.ones(len(src),bool)
        previous=L.copy();local.append(transform(src,L));local=local[-8:]
        # Decimated raw returns preserve map geometry; every map point uses the estimated LiDAR pose.
        for x in transform(src[::3],L):lidar_points.append({'at':i,'p':rounded(x)})
        frames.append({'frame':args.start+i,'time':round(i*.1,1),'image':f'frames/{i:03d}.jpg','visual':{'tracks':tracks,'pose':rounded(center),'used':len(pnp_ids),'mapped':len(world),'new':len(added),'rmse':None if reproj is None else round(reproj,3),'status':status},'lidar':{'scan':rounded(src),'pose':rounded(L),'pairs':pairs,'usedIndices':np.flatnonzero(accept).tolist() if i else [],'accepted':int(accept.sum()) if i else 0,'planar':plane_count,'rmse':None if rmse is None else round(rmse,3),'trace':rounded(trace)}})
        if i%10==0:print(i,status,'visual',len(pnp_ids),len(world),'lidar',round(float(np.linalg.norm(L[:3,3])),2),rmse,flush=True)
    dataset={'meta':{'dataset':'KITTI tracking','sequence':args.sequence,'start':args.start,'count':args.count,'fps':10,'width':images[0].shape[1],'height':images[0].shape[0],'K':rounded(K,8),'scale':'Visual coordinates use the initial two-view baseline as one arbitrary unit. LiDAR coordinates are meters.','estimators':'Shi-Tomasi, forward/backward pyramidal Lucas-Kanade, essential-matrix initialization, triangulation, PnP RANSAC and LM refinement. LiDAR: voxel samples, local PCA normals, robust point-to-plane ICP against an eight-scan local map.','limits':'Precomputed local odometry and map traces, replayed in the browser. No loop closure, bundle adjustment, IMU, semantic dynamic-object filter, or per-point scan deskew. RANSAC rejection does not prove that an object is moving. Reference poses are never estimator inputs.','license':'KITTI data and derived data: CC BY-NC-SA 3.0. Andreas Geiger, Philip Lenz, Raquel Urtasun, CVPR 2012.','source':'https://www.cvlibs.net/datasets/kitti/','dt_note':'KITTI tracking runs at nominal 10 Hz. Displayed time is relative nominal time, not a hardware timestamp.'},'frames':frames,'visualMap':visual_points,'lidarMap':lidar_points}
    (OUT/'data.js').write_text('window.MappingData='+json.dumps(dataset,separators=(',',':'))+';\n')
    build=ROOT/'.build/slides/lecture6';build.mkdir(parents=True,exist_ok=True)
    (build/'provenance.json').write_text(json.dumps({'source':str(args.source),'sequence':args.sequence,'frames_sha256':hashes,'meta':dataset['meta']},indent=2))
    print('Saved',len(frames),'frames',len(visual_points),'landmarks',len(lidar_points),'map samples',flush=True)
if __name__=='__main__':main()
