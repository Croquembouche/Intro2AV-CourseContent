import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const BUILD=path.join(ROOT,'.build/slides/lecture6');
const RUNTIME='/home/william/.cache/codex-runtimes/codex-primary-runtime/dependencies';
process.env.RUNTIME_NODE_MODULES=path.join(RUNTIME,'node/node_modules');
const require=createRequire(path.join(RUNTIME,'node/runtime.cjs'));
console.log('LOAD ARTIFACT RUNTIME');
const {FileBlob,PresentationFile,Presentation}=await import(pathToFileURL(require.resolve('@oai/artifact-tool')).href);
const SKILL='/home/william/.codex/plugins/cache/openai-primary-runtime/presentations/26.929.10730/skills/presentations';
const FONTREF=path.join(ROOT,'2026/Presentations/Lecture 3 Perception - CNNs and Transformers.pptx');
const C=JSON.parse(await fs.readFile(path.join(ROOT,'tools/slides/lecture6/content.json'),'utf8'));
const p=Presentation.create({slideSize:{width:960,height:540}});
for(let i=0;i<C.length;i++)p.slides.add();
await fs.mkdir(path.join(BUILD,'render'),{recursive:true});
const BLUE='#00539F',CYAN='#00A0DF',INK='#17324D';
function text(s,t,x,y,w,h,size=24,color=INK,bold=false){const sh=s.shapes.add({geometry:'textbox',name:t.slice(0,65),position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});sh.text=t;sh.text.style={fontSize:size,typeface:'Arial',color,bold,autoFit:'none',wrap:'square',verticalAlignment:'middle',insets:{top:0,right:0,bottom:0,left:0}};return sh}
async function media(s,f,x,y,w,h){const b=await fs.readFile(path.join(BUILD,'assets',f));s.images.add({blob:new Uint8Array(b),contentType:f.endsWith('.gif')?'image/gif':f.endsWith('.jpeg')?'image/jpeg':'image/png',alt:`${f.startsWith('challenge-')?'Controlled simulated mapping experiment':'Computed trace from real KITTI observations'}: ${f}`,fit:'contain',position:{left:x,top:y,width:w,height:h}})}
function clear(s){for(const coll of [s.shapes,s.images,s.tables,s.charts])for(const x of [...coll.items])x.delete()}
function link(s,label,uri,x,y,w=850){let sh=text(s,label,x,y,w,28,19,BLUE);sh.text.set([[{run:label,textStyle:{underline:'sng'},link:{uri,isExternal:true}}]])}
for(let i=0;i<C.length;i++){
 const c=C[i],s=p.slides.items[i];clear(s);s.background.fill='#FFFFFF';
 if(i===0)await media(s,'cover-background.jpeg',0,0,960,540);else await media(s,'course-logo.png',918.33,0,41.67,41.67);
 if(i===0){text(s,'LECTURE 6',65,95,800,40,23,'#FFFFFF',true);text(s,'Mapping',65,160,810,80,52,'#FFFFFF',true);text(s,'for autonomous driving',65,245,810,55,37,'#FFFFFF');text(s,c.body[1],65,330,810,60,26,'#FFFFFF');text(s,c.body[2],65,420,810,35,22,'#FFFFFF');text(s,'1',885,507,30,25,16,'#FFFFFF');}
 else{
 text(s,c.title,52,66,850,74,c.title.length>49?30:34,CYAN);
 text(s,String(i+1),885,508,30,24,16,BLUE);
 if(c.layout==='table'){
 const tb=s.tables.add({rows:c.table.length,columns:3,left:55,top:151,width:850,height:310,columnWidths:[220,315,315],values:c.table});tb.borders.assign({style:'solid',fill:'#D8E4ED',width:.6});
 for(let r=0;r<c.table.length;r++)for(let j=0;j<3;j++){let cell=tb.getCell(r,j);cell.fill=r===0?BLUE:(r%2?'#FFFFFF':'#F1F6FA');cell.text.style={typeface:'Arial',fontSize:18,color:r===0?'#FFFFFF':INK,bold:r===0,autoFit:'none',verticalAlignment:'middle',insets:{top:9,bottom:9,left:12,right:12}}}
 }else if(c.layout==='visual'||c.layout==='demo'){
 await media(s,c.media[0],52,147,555,c.demo?280:307);
 const size=23;
 text(s,c.body.join('\n\n'),630,152,275,300,22);
 if(c.demo)link(s,'Open interactive demo',`https://croquembouche.github.io/Intro2AV-CourseContent/mapping/#${c.demo}`,55,438,540);
 }else if(c.layout==='pair'){
 for(let j=0;j<2;j++){await media(s,c.media[j],55+j*445,142,405,240);text(s,c.labels[j],55+j*445,389,405,26,20,BLUE,true)}
 text(s,c.body.join('\n'),55,425,850,52,21);
 if(c.demo)link(s,'Explore GPS, terrain and drift',`https://croquembouche.github.io/Intro2AV-CourseContent/mapping/#${c.demo}`,55,480,800);
 }else if(c.layout==='equation'){
 const eqH=c.equations.length===3?205:225;
 c.equations.forEach((e,j)=>text(s,e,75,155+j*(eqH/c.equations.length),815,eqH/c.equations.length,e.length>58?25:e.length>42?28:32,BLUE,j===0));
 text(s,c.body.join('\n'),75,393,810,66,21);
 }else if(c.layout==='resources'){
 c.body.forEach((t,j)=>text(s,t,60,150+j*54,840,49,23));
 link(s,'Open Mapping demos', 'https://croquembouche.github.io/Intro2AV-CourseContent/mapping/',60,350,800);
 link(s,'Download the offline lecture package', 'https://croquembouche.github.io/Intro2AV-CourseContent/downloads/Lecture6_Mapping.zip',60,400,800);
 for(let j=0;j<(c.links||[]).length;j++)link(s,c.links[j][0],c.links[j][1],60+(j%2)*425,332+Math.floor(j/2)*47,410);
 }else{
 const h=c.body.length===4?70:85;
 c.body.forEach((t,j)=>{if(c.layout==='steps'){text(s,String(j+1),55,152+j*h,35,h-6,29,BLUE,true);text(s,t,105,152+j*h,800,h-6,25)}else text(s,t,65,152+j*h,830,h-6,26)});
 }
 if(c.take){const takeShape=text(s,c.take,55,476,850,33,c.take.length>88?19:21,BLUE,true); if(c.demo)takeShape.text.set([[{run:c.take,link:{uri:`https://croquembouche.github.io/Intro2AV-CourseContent/mapping/#${c.demo}`,isExternal:true}}]]);}
 }
 s.speakerNotes.textFrame.setText(`${c.notes}\n\n[Sources]\n${c.refs.join('\n')}\n\n[Visuals]\n${c.media.some(f=>f.startsWith('challenge-'))?'Actual screenshots of the controlled synthetic Mapping experiment. Road, observations, odometry, GPS and verified loop constraints are simulated. These are not KITTI data or benchmark scores.':c.media.length?'Recorded KITTI tracking sequence 0001, frames 20–99. Algorithm overlays and maps come from the accompanying Mapping demo. KITTI and derived data: CC BY-NC-SA 3.0. Geiger, Lenz, Urtasun, CVPR 2012. https://www.cvlibs.net/datasets/kitti/':'Editable instructional text, equations, or table.'}\n\n${c.demo?'Local demo: https://croquembouche.github.io/Intro2AV-CourseContent/mapping/#'+c.demo:''}`);
}
const candidate=path.join(BUILD,'candidate.pptx');await(await PresentationFile.exportPptx(p)).save(candidate);console.log('EXPORTED',candidate);
// The current runtime stalls on imported templates and PNG rendering. Use native LibreOffice PDF rendering for visual QA.
const {finalizePresentation}=await import(pathToFileURL(path.join(SKILL,'container_tools/artifact_tool_utils.mjs')).href);
let stamp=Date.now(),out=path.join(BUILD,'finalized',`lecture6-${stamp}.pptx`);await fs.mkdir(path.dirname(out),{recursive:true});
let result=await finalizePresentation({workspaceDir:ROOT,candidatePath:candidate,finalPath:out,explicitTotalSlideCount:C.length,pythonExecutable:path.join(RUNTIME,'python/bin/python3'),integrityValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','9144000,5143500','--validate-heading-fit',...C.filter(c=>c.layout==='table').map(c=>c.slide).flatMap(n=>['--require-native-table-slide',String(n)])],requiredNativeTableOwnerSlides:C.filter(c=>c.layout==='table').map(c=>c.slide),fontPolicy:{basis:'reference',families:['Arial'],referencePath:FONTREF,referenceSha256:crypto.createHash('sha256').update(await fs.readFile(FONTREF)).digest('hex')},verifyArtifactToolImport:false,receiptPath:path.join(BUILD,`validation-${stamp}.json`)});await fs.writeFile(path.join(BUILD,'final-path.txt'),out);console.log(JSON.stringify(result));
