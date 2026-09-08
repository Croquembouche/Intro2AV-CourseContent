import * as THREE from './three.module.min.js';
import {OrbitControls} from './OrbitControls.js';
import {layersFor,inspectNode} from './network-data.js';

export class NetworkScene {
  constructor(host,onInspect){
    this.host=host;this.onInspect=onInspect;this.groups=[];this.labels=[];this.hidden=new Set();this.pinned=false;this.selection=null;this.flow=false;this.pointer=new THREE.Vector2();this.ray=new THREE.Raycaster();this.matrix=new THREE.Matrix4();
    this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(42,1,.1,3000);
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.setClearColor(0x000000,0);this.renderer.outputColorSpace=THREE.SRGBColorSpace;host.appendChild(this.renderer.domElement);
    this.scene.add(new THREE.AmbientLight(0xffffff,2.0));let light=new THREE.DirectionalLight(0xa8d8ff,2.1);light.position.set(0,200,150);this.scene.add(light);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.12;this.controls.minDistance=30;this.controls.maxDistance=900;this.controls.target.set(0,94,0);this.controls.addEventListener('change',()=>this.dirty=true);
    this.box=new THREE.BoxGeometry(1,1,1);this.material=new THREE.MeshLambertMaterial({color:0xffffff});
    this.highlight=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1,1,1)),new THREE.LineBasicMaterial({color:0xffffff,depthTest:false}));this.highlight.renderOrder=50;this.highlight.visible=false;this.scene.add(this.highlight);
    this.edges=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.75,depthTest:false}));this.edges.renderOrder=40;this.scene.add(this.edges);
    this.particles=new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial({color:0x83ffff,size:2.2,sizeAttenuation:false,depthTest:false}));this.particles.renderOrder=45;this.scene.add(this.particles);
    let down=null,lastPick=0;
    host.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);
    host.addEventListener('pointermove',e=>{if(e.buttons||this.pinned||performance.now()-lastPick<45)return;lastPick=performance.now();this.pick(e.clientX,e.clientY);});
    host.addEventListener('pointerup',e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<5){this.pinned=false;this.pick(e.clientX,e.clientY);if(this.selection){this.pinned=true;this.emit()}}down=null;});
    host.addEventListener('pointerleave',()=>{if(!this.pinned)this.clearSelection()});
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.reset();this.tick=this.tick.bind(this);requestAnimationFrame(this.tick);
  }
  reset(){this.camera.position.set(0,this.state?.model==='mlp'?130:218,this.state?.model==='mlp'?300:365);this.controls.target.set(0,this.state?.model==='mlp'?78:101,0);this.controls.update();this.dirty=true;}
  resize(){const w=this.host.clientWidth,h=this.host.clientHeight;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.dirty=true;}
  clear(){for(let g of this.groups){this.scene.remove(g.mesh);g.mesh.dispose()}this.groups=[];for(let l of this.labels)l.el.remove();this.labels=[];this.hidden.clear();this.clearSelection()}
  label(text,position,layer,css='layer'){const el=document.createElement('span');el.className='worldLabel '+css;el.textContent=text;this.host.appendChild(el);this.labels.push({el,position,layer});}
  build(){
    this.clear();this.state.layers=layersFor(this.state.model,this.state.image,this.state.result);
    for(let layer of this.state.layers){
      const n=layer.rows*layer.cols;
      for(let channel=0;channel<layer.channels;channel++){
        const mesh=new THREE.InstancedMesh(this.box,this.material,n);mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);mesh.userData={layer,channel};
        const positions=[],mapSlot=layer.width/layer.channels;
        let step=layer.kind==='dense'?layer.width/Math.max(1,layer.cols):layer.channels===1?layer.width/layer.cols:(this.state.model==='cnn'?Math.min(2.75,(mapSlot-5)/layer.cols):(mapSlot-5)/layer.cols);
        // Pool maps retain the preceding feature map's pixel spacing and center.
        if(layer.kind==='pool')step=2.75;
        const cx=layer.channels===1?0:(channel-(layer.channels-1)/2)*mapSlot;
        const size=layer.kind==='dense'?step*.87:step*.88;
        for(let i=0;i<n;i++){
          const row=Math.floor(i/layer.cols),col=i%layer.cols;
          let x=cx+(col-(layer.cols-1)/2)*step,z=(row-(layer.rows-1)/2)*step;
          if(layer.kind==='patches'){x+=(Math.floor(col/7)-1.5)*2.5;z+=(Math.floor(row/7)-1.5)*2.5;}
          if(this.state.model==='mlp'&&layer.id==='input')z*=.7;
          const p=new THREE.Vector3(x,layer.y,z);positions.push(p);
          this.matrix.makeScale(size,Math.min(3.2,size*.85),size*(this.state.model==='mlp'&&layer.id==='input'?.7:1));this.matrix.setPosition(p);mesh.setMatrixAt(i,this.matrix);
        }
        mesh.computeBoundingSphere();mesh.computeBoundingBox();this.scene.add(mesh);this.groups.push({mesh,layer,channel,positions,size});
        if(layer.channels>1)this.label(layer.kind==='attention'?`Head ${channel+1}`:`${channel+1}`,new THREE.Vector3(cx,layer.y,layer.rows*step/2+3),layer.id,'map');
        if(layer.id==='output')for(let i=0;i<10;i++)this.label(i,new THREE.Vector3(positions[i].x,layer.y+3,positions[i].z),layer.id,'output');
      }
    }
    this.reset();this.updateColors();
  }
  setState(state){const old=this.state;this.state=state;if(!old||old.model!==state.model||!this.groups.length){this.build();return true}state.layers=layersFor(state.model,state.image,state.result);for(let g of this.groups){g.layer=state.layers.find(l=>l.id===g.layer.id);g.mesh.userData.layer=g.layer;}this.updateColors();if(this.selection){const group=this.groups.find(g=>g.layer.id===this.selection.layer.id&&g.channel===this.selection.channel);if(group){this.selection.layer=group.layer;this.showSelection()}}return false;}
  updateColors(){let color=new THREE.Color();for(let g of this.groups){const values=g.layer.values[g.channel];const max=Math.max(.001,...values.map(Math.abs));for(let i=0;i<values.length;i++){
      let v=values[i],a=Math.min(1,Math.abs(v)/(g.layer.id==='input'||g.layer.id==='output'?1:max));
      if(a<.00001)color.setRGB(.001,.003,.007);
      else if(v<0)color.setRGB(.06+a*.2,.018+a*.055,.09+a*.32);
      else if(a<.35)color.setRGB(.022+a*.08,.012+a*.28,.07+a*.78);
      else color.setRGB(.004,.055+Math.pow(a,1.25)*.72,.25+a*.60);
      g.mesh.setColorAt(i,color);
    }g.mesh.instanceColor.needsUpdate=true;}this.dirty=true;}
  toggle(id){this.hidden.has(id)?this.hidden.delete(id):this.hidden.add(id);for(let g of this.groups)g.mesh.visible=!this.hidden.has(g.layer.id);if(this.selection&&this.hidden.has(this.selection.layer.id))this.clearSelection();else if(this.selection)this.showSelection();this.dirty=true;}
  pick(x,y){const rect=this.host.getBoundingClientRect();this.pointer.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);const hits=this.ray.intersectObjects(this.groups.filter(g=>g.mesh.visible).map(g=>g.mesh),false);if(hits.length){const h=hits[0],{layer,channel}=h.object.userData;this.selection={layer,channel,index:h.instanceId,screen:{x,y}};this.showSelection()}else this.clearSelection();}
  select(layerId,channel,index){const group=this.groups.find(g=>g.layer.id===layerId&&g.channel===channel);if(!group||index<0||index>=group.positions.length)return false;this.selection={layer:group.layer,channel,index,screen:{x:this.host.getBoundingClientRect().left+this.host.clientWidth*.54,y:this.host.getBoundingClientRect().top+this.host.clientHeight*.46}};this.pinned=true;this.showSelection();return true;}
  emit(){if(this.selection)this.onInspect(this.selection.record,this.selection.screen,this.pinned);}
  showSelection(){const s=this.selection,g=this.groups.find(g=>g.layer.id===s.layer.id&&g.channel===s.channel);s.record=inspectNode(this.state,s.layer,s.channel,s.index);let end=g.positions[s.index];this.highlight.position.copy(end);this.highlight.scale.setScalar(g.size*1.28);this.highlight.visible=true;
    let positions=[],colors=[];this.edgeSegments=[];
    const max=Math.max(.001,...s.record.links.map(e=>Math.abs(e.weight)));
    for(let link of s.record.links){const source=this.groups.find(g=>g.layer.id===link.layer&&g.channel===link.channel);if(!source||!source.mesh.visible)continue;const start=source.positions[link.index];if(!start)continue;let a=link.outgoing?end:start,b=link.outgoing?start:end;positions.push(...a.toArray(),...b.toArray());let intensity=.2+.8*Math.min(1,Math.abs(link.weight)/max);let color=link.weight>=0?[.02,intensity,intensity]:[intensity*.62,.12,intensity];colors.push(...color,...color);this.edgeSegments.push([a,b]);}
    this.edges.geometry.dispose();this.edges.geometry=new THREE.BufferGeometry();this.edges.geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));this.edges.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));this.edges.geometry.computeBoundingSphere();this.particles.geometry.dispose();this.particles.geometry=new THREE.BufferGeometry();this.particles.geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(this.edgeSegments.length*3),3));this.particles.frustumCulled=false;this.emit();this.dirty=true;
  }
  clearSelection(){this.pinned=false;this.selection=null;this.highlight.visible=false;this.edges.visible=false;this.particles.visible=false;this.onInspect(null);this.dirty=true;}
  tick(time){requestAnimationFrame(this.tick);this.controls.update();this.edges.visible=!!this.selection;this.particles.visible=!!this.selection&&this.flow;if(this.particles.visible&&this.edgeSegments){let arr=this.particles.geometry.attributes.position.array;this.edgeSegments.forEach(([a,b],i)=>{let t=(time/1800+i*.017)%1;arr[i*3]=a.x+(b.x-a.x)*t;arr[i*3+1]=a.y+(b.y-a.y)*t;arr[i*3+2]=a.z+(b.z-a.z)*t});this.particles.geometry.attributes.position.needsUpdate=true;this.dirty=true;}
    if(!this.dirty)return;this.renderer.render(this.scene,this.camera);this.dirty=false;
    for(let label of this.labels){let p=label.position.clone().project(this.camera);const x=(p.x+1)/2*this.host.clientWidth,y=(-p.y+1)/2*this.host.clientHeight;label.el.style.display=this.hidden.has(label.layer)||p.z>1||x<0||x>this.host.clientWidth||y<0||y>this.host.clientHeight?'none':'block';label.el.style.left=x+'px';label.el.style.top=y+'px';label.el.style.transform='translate(-50%,-100%)';}
    // Expose visible counts in the DOM for accessibility and browser verification.
    this.host.dataset.nodeCount=this.groups.reduce((n,g)=>n+g.positions.length,0);
    this.host.dataset.visibleLayers=this.state?.layers.filter(l=>!this.hidden.has(l.id)).length||0;
    this.host.dataset.connectionCount=this.selection?this.edgeSegments.length:0;
  }
}
