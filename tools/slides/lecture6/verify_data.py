"""Independent numerical checks on the packaged estimator traces."""
from pathlib import Path
import json,numpy as np
R=Path(__file__).resolve().parents[3];d=json.loads((R/'2026/Labs/Mapping/data.js').read_text().removeprefix('window.MappingData=').rstrip(';\n'))
landmarks={p['id']:p for p in d['visualMap']};K=np.array(d['meta']['K']);frames=d['frames'];assert len(frames)==80
for i,f in enumerate(frames):
 assert (R/'2026/Labs/Mapping'/f['image']).is_file()
 used=[t for t in f['visual']['tracks'] if t['used']];assert len(used)==f['visual']['used']
 for t in used:assert t['id'] in landmarks and landmarks[t['id']]['at']<=i
 l=f['lidar'];T=np.array(l['pose']);assert np.allclose(T[3],[0,0,0,1]);assert abs(np.linalg.det(T[:3,:3])-1)<.004
 assert len(l['usedIndices'])==l['accepted']
 for p in l['pairs']:assert p['source'] in l['usedIndices'] and p['source']<len(l['scan'])
 if i>5:assert f['visual']['used']>=12 and f['visual']['rmse']<2.5
 if i:assert l['accepted']>100 and l['rmse']<.2
 assert all(np.isfinite(np.array(l['scan'])).ravel())
# Independent map insertion check: first decimated source point matches a transformed return.
for i in [0,10,40,79]:
 f=frames[i];p=np.array(f['lidar']['scan'][0]);T=np.array(f['lidar']['pose']);expected=T[:3,:3]@p+T[:3,3]
 got=np.array(next(p['p'] for p in d['lidarMap'] if p['at']==i));assert np.linalg.norm(expected-got)<.07
assert frames[-1]['visual']['mapped']==len(d['visualMap'])
report={'frames':len(frames),'landmarks':len(landmarks),'lidar_map_samples':len(d['lidarMap']),'visual_inlier_rmse_px_range':[min(f['visual']['rmse'] for f in frames[6:]),max(f['visual']['rmse'] for f in frames[6:])],'lidar_plane_rmse_m_range':[min(f['lidar']['rmse'] for f in frames[1:]),max(f['lidar']['rmse'] for f in frames[1:])],'scope':'Inlier consistency and map-transform checks, not ground-truth accuracy evaluation.'}
(R/'.build/slides/lecture6/data-verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
