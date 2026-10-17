import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const BUILD=path.join(ROOT,'.build/slides/lecture3-current');
process.env.RUNTIME_NODE_MODULES='/home/william/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
await fs.mkdir(BUILD,{recursive:true});await fs.symlink(process.env.RUNTIME_NODE_MODULES,path.join(BUILD,'node_modules')).catch(e=>{if(e.code!=='EEXIST')throw e});
const require=createRequire(path.join(BUILD,'runtime.cjs'));
const {FileBlob,PresentationFile}=await import(pathToFileURL(require.resolve('@oai/artifact-tool')).href);
const SKILL='/home/william/.codex/plugins/cache/openai-primary-runtime/presentations/26.903.11726/skills/presentations';
const SOURCE=path.join(BUILD,'template.pptx');
const MEDIA=path.join(BUILD,'assets');
const C=JSON.parse(await fs.readFile(path.join(ROOT,'tools/slides/lecture3-current/content.json'),'utf8'));
const assets=JSON.parse(await fs.readFile(path.join(MEDIA,'sources.json'),'utf8'));
const p=await PresentationFile.importPptx(await FileBlob.load(SOURCE));
while(p.slides.items.length<C.length)p.slides.items.at(-1).duplicate();
const BLUE='#00539F',CYAN='#00A0DF',INK='#17324D',ORANGE='#C65B00';
function text(s,t,x,y,w,h,size=24,color=INK,bold=false){
 const sh=s.shapes.add({geometry:'textbox',name:t.slice(0,70),position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 sh.text=t;sh.text.style={fontSize:size,typeface:'Arial',color,bold,autoFit:'none',wrap:'square',verticalAlignment:'middle',insets:{top:0,right:0,bottom:0,left:0}};return sh;
}
async function media(s,f,x,y,w,h){const b=await fs.readFile(path.join(MEDIA,f));s.images.add({blob:new Uint8Array(b),contentType:f.endsWith('.gif')?'image/gif':'image/png',alt:f,fit:'contain',position:{left:x,top:y,width:w,height:h}})}
function clear(s){for(const sh of [...s.shapes.items])sh.delete();for(const im of [...s.images.items])im.delete();for(const tb of [...s.tables.items])tb.delete()}
await fs.mkdir(path.join(BUILD,'render'),{recursive:true});
for(const f of await fs.readdir(path.join(BUILD,'render'))){
 const m=f.match(/^slide-(\d+)\.png$/);
 if(m&&Number(m[1])>C.length)await fs.unlink(path.join(BUILD,'render',f));
}
for(let i=0;i<C.length;i++){
 const c=C[i],s=p.slides.items[i];clear(s);
 if(c.layout==='cover'){
  text(s,'LECTURE 3',65,100,800,42,23,'#FFFFFF',true);
  text(s,'Computer vision',65,155,810,70,49,'#FFFFFF',true);
  text(s,'CNNs and transformers',65,234,810,50,34,'#FFFFFF');
  text(s,'Learning visual patterns and using context',65,320,810,45,28,'#FFFFFF');
  text(s,'Digit recognition and object recognition',65,380,810,32,22,'#FFFFFF');
  const logoBacking=text(s,'',920,0,40,40);logoBacking.fill='#FFFFFF';
  await media(s,'car-logo.png',920,0,40,40);
  text(s,'1',882,505,30,23,16,'#FFFFFF');
 }else{
  if(c.tag)text(s,c.tag,52,40,845,25,15,ORANGE,true);
  text(s,c.title,52,72,850,68,c.title.length>49?31:34,CYAN,false);
  text(s,String(i+1),885,508,29,24,16,BLUE);
  if(c.media.some(f=>f.endsWith('.gif'))){
   const badge=text(s,'GIF',55,510,36,20,12,'#FFFFFF',true);
   badge.fill=BLUE;
   badge.text.style={fontSize:12,typeface:'Arial',color:'#FFFFFF',bold:true,autoFit:'none',wrap:'square',verticalAlignment:'middle',insets:{top:0,right:6,bottom:0,left:6}};
  }
  if(c.layout==='table'){
   const vals=c.table;const widths=i===21?[205,415,230]:[225,310,315];
   const tb=s.tables.add({rows:vals.length,columns:3,left:55,top:152,width:850,height:304,columnWidths:widths,values:vals});
   tb.borders.assign({style:'solid',fill:'#D8E4ED',width:.6});
   for(let r=0;r<vals.length;r++)for(let col=0;col<3;col++){
    const cell=tb.getCell(r,col);cell.fill=r===0?BLUE:(r%2?'#FFFFFF':'#F1F6FA');
    cell.text.style={typeface:'Arial',fontSize:r===0?20:20,color:r===0?'#FFFFFF':INK,bold:r===0,autoFit:'none',verticalAlignment:'middle',insets:{top:8,bottom:8,left:10,right:10}};
   }
  }else if(c.layout==='four'){
   for(let j=0;j<4;j++){
    const x=j%2===0?55:500,y=j<2?142:310;
    await media(s,c.media[j],x,y,405,134);
    text(s,c.labels[j],x+99,y+133,260,28,20,BLUE,true);
   }
  }else if(c.layout==='language'){
   text(s,'The animal did not cross the street\nbecause it was tired.',80,185,800,135,39,INK);
   text(s,'A word draws useful context from other words.',80,348,800,65,27,BLUE,true);
   
  }else if(c.layout==='figure'){
   await media(s,c.media[0],65,145,830,c.caption?291:310);
   if(c.caption)text(s,c.caption,65,440,830,23,16,BLUE);
  }else if(c.layout==='pair'||c.layout==='resources'){
   await media(s,c.media[0],55,145,405,220);await media(s,c.media[1],500,145,405,220);
   if(c.imageFrames)for(let j=0;j<2;j++)s.shapes.add({geometry:'rect',name:'Image boundary',position:{left:55+j*445,top:174,width:405,height:162},fill:'none',line:{fill:'#B7C9D8',width:1}});
   if(c.labels)for(let j=0;j<2;j++)text(s,c.labels[j],55+j*445,366,405,28,19,BLUE,true);
   if(c.body.length===2){for(let j=0;j<2;j++){
    const sh=text(s,c.body[j],55+j*445,397,405,66,21,INK);
    if(c.layout==='resources')sh.text.set([[{run:c.body[j],textStyle:{underline:'sng'},link:{uri:c.refs[j],isExternal:true}}]]);
   }}else text(s,c.body.join('\n'),55,380,850,83,21,INK);
   if(c.caption)text(s,c.caption,55,365,850,18,14,BLUE);
  }else if(c.layout==='wide'){
   await media(s,c.media[0],55,147,850,c.caption?210:235);
   if(c.caption)text(s,c.caption,55,365,850,18,14,BLUE);
   text(s,c.body.join('\n'),55,390,850,75,c.body.length===3?20:23,INK);
  }else if(c.layout==='portrait'){
   await media(s,c.media[0],70,145,315,310);
   text(s,c.body.join('\n\n'),445,156,460,270,26,INK);
   if(c.caption)text(s,c.caption,445,436,460,22,14,BLUE);
  }else{
   const reverse=i%4===1;
   await media(s,c.media[0],reverse?370:55,150,535,282);
   const x=reverse?55:625;
   text(s,c.body.join('\n\n'),x,156,280,277,c.layout==='question'?26:(c.body.length===3?22:25),INK,c.layout==='question');
   if(c.caption)text(s,c.caption,55,442,850,20,14,BLUE);
  }
  text(s,c.take,55,472,850,34,c.take.length>85?20:22,BLUE,true);
  if(c.media.some(f=>['scene.png','road.png','car_day.png','car_night.png','car_rain.png','car_occluded.png'].includes(f))) text(s,'AI-generated teaching illustration',650,42,245,20,13,INK);
 }
 const used=c.media.map(f=>assets.find(a=>a.file===f)).filter(Boolean);
 s.speakerNotes.textFrame.setText(`${c.minutes} minutes (${c.start}–${c.end} minutes).\n\n${c.notes}\n\n[Concept references]\n${c.refs.join('\n')}\n\n[Visual sources]\n${used.map(a=>`${a.file}: ${a.kind}\n${a.sources.join('\n')}`).join('\n\n')}`);
}
await fs.writeFile(path.join(MEDIA,'slide_map.json'),JSON.stringify(C.map(({slide,title,minutes,start,end,media})=>({slide,title,minutes,start,end,media})),null,2));
await fs.writeFile(path.join(BUILD,'deck-inspect.ndjson'),(await p.inspect({kind:'slide,textbox,image,layout,notes',maxChars:600000})).ndjson);
const candidate=path.join(BUILD,'candidate.pptx');await(await PresentationFile.exportPptx(p)).save(candidate);console.log('EXPORTED',candidate);
execFileSync('python',[path.join(ROOT,'tools/slides/lecture3-current/dedupe_media.py'),candidate],{stdio:'inherit'});
for(let i=0;i<C.length;i++){
 const b=await p.export({slide:p.slides.items[i],format:'png',scale:1});await fs.writeFile(path.join(BUILD,'render',`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await b.arrayBuffer()));console.log('RENDERED',i+1);
}
const {finalizePresentation}=await import(pathToFileURL(path.join(SKILL,'container_tools/artifact_tool_utils.mjs')).href);
const stamp=Date.now(),out=path.join(BUILD,'finalized',`deck-${stamp}.pptx`);
await fs.mkdir(path.dirname(out),{recursive:true});
const result=await finalizePresentation({workspaceDir:ROOT,candidatePath:candidate,finalPath:out,explicitTotalSlideCount:C.length,pythonExecutable:'/usr/bin/python3',integrityValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','9144000,5143500','--validate-heading-fit','--require-native-table-slide','22'],requiredNativeTableOwnerSlides:[22],requiredNativeChartOwnerSlides:[],fontPolicy:{basis:'reference',families:['Arial'],referencePath:SOURCE,referenceSha256:crypto.createHash('sha256').update(await fs.readFile(SOURCE)).digest('hex')},verifyArtifactToolImport:true,receiptPath:path.join(BUILD,`validation-${stamp}.json`)});
await fs.writeFile(path.join(BUILD,'final-path.txt'),out);console.log(JSON.stringify(result));
