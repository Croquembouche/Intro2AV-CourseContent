#!/usr/bin/env python3
"""Reversibly change CARLab's hard-coded launch backend; does not restart services."""
import argparse,datetime,hashlib,re
from pathlib import Path

def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('--controller',type=Path,default=Path('/mnt/simulations/control-center/controller.py'))
 p.add_argument('--backend',choices=('cpu','gpu'),required=True)
 p.add_argument('--check',action='store_true',help='Print intended change without writing')
 a=p.parse_args();source=a.controller.read_text()
 pattern=r"(['\"]--backend['\"]\s*,\s*)(['\"])(gpu|cpu)\2"
 matches=list(re.finditer(pattern,source))
 if len(matches)!=1:raise SystemExit('Expected exactly one literal launcher backend; inspect the server source before modifying it.')
 current=matches[0].group(3)
 print(f'{a.controller}: launcher backend {current} -> {a.backend}')
 if current==a.backend or a.check:return
 updated=re.sub(pattern,lambda m:m.group(1)+m.group(2)+a.backend+m.group(2),source,count=1)
 compile(updated,str(a.controller),'exec')
 backup=a.controller.with_name(a.controller.name+'.before-ray-backend-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f')+'.bak')
 with backup.open('x') as f:f.write(source)
 a.controller.write_text(updated)
 print('Backup:',backup)
 print('Original SHA-256:',hashlib.sha256(source.encode()).hexdigest())
 print('Changed the launch argument only. Restart the control-center service and launch CARLA again to apply it.')
if __name__=='__main__':main()
