import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const BUILD=path.join(ROOT,'.build/slides/lecture4');
const RUNTIME='/home/william/.cache/codex-runtimes/codex-primary-runtime/dependencies';
process.env.RUNTIME_NODE_MODULES=path.join(RUNTIME,'node/node_modules');
const require=createRequire(path.join(RUNTIME,'node/runtime.cjs'));
const {FileBlob,PresentationFile}=await import(pathToFileURL(require.resolve('@oai/artifact-tool')).href);
const SKILL='/home/william/.codex/plugins/cache/openai-primary-runtime/presentations/26.905.11957/skills/presentations';
const SOURCE=path.join(ROOT,'tools/slides/perception/templates/neural-template-starter.pptx');
const FONTREF=path.join(ROOT,'2026/Presentations/Lecture 3 Perception - CNNs and Transformers.pptx');
const C=JSON.parse(await fs.readFile(path.join(ROOT,'tools/slides/lecture4/content.json'),'utf8'));
const p=await PresentationFile.importPptx(await FileBlob.load(SOURCE));
await fs.mkdir(path.join(BUILD,'render'),{recursive:true});
await fs.writeFile(path.join(BUILD,'template-inspect.ndjson'),(await p.inspect({kind:'slide,layout,textbox,image',maxChars:60000})).ndjson);
for(let i=0;i<p.slides.items.length;i++){let b=await p.export({slide:p.slides.items[i],format:'png',scale:1});await fs.writeFile(path.join(BUILD,`template-${i+1}.png`),new Uint8Array(await b.arrayBuffer()))}
while(p.slides.items.length<C.length)p.slides.items.at(-1).duplicate();
const BLUE='#00539F',CYAN='#00A0DF',INK='#17324D';
function text(s,t,x,y,w,h,size=24,color=INK,bold=false){const sh=s.shapes.add({geometry:'textbox',name:t.slice(0,65),position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});sh.text=t;sh.text.style={fontSize:size,typeface:'Arial',color,bold,autoFit:'none',wrap:'square',verticalAlignment:'middle',insets:{top:0,right:0,bottom:0,left:0}};return sh}
async function media(s,f,x,y,w,h){const b=await fs.readFile(path.join(BUILD,'assets',f));s.images.add({blob:new Uint8Array(b),contentType:'image/png',alt:`Teaching simulator output: ${f}`,fit:'contain',position:{left:x,top:y,width:w,height:h}})}
function clear(s){for(const coll of [s.shapes,s.images,s.tables,s.charts])for(const x of [...coll.items])x.delete()}
function link(s,label,uri,x,y,w=850){let sh=text(s,label,x,y,w,28,19,BLUE);sh.text.set([[{run:label,textStyle:{underline:'sng'},link:{uri,isExternal:true}}]])}
for(let i=0;i<C.length;i++){
 const c=C[i],s=p.slides.items[i];clear(s);
 if(i===0){text(s,'LECTURE 4',65,95,800,40,23,'#FFFFFF',true);text(s,'Sensor fusion',65,160,810,80,52,'#FFFFFF',true);text(s,'for autonomous driving',65,245,810,55,37,'#FFFFFF');text(s,c.body[1],65,330,810,60,26,'#FFFFFF');text(s,c.body[2],65,420,810,35,22,'#FFFFFF');text(s,'1',885,507,30,25,16,'#FFFFFF');}
 else{
 text(s,c.title,52,66,850,74,c.title.length>49?31:34,CYAN);
 text(s,String(i+1),885,508,30,24,16,BLUE);
 if(c.layout==='table'){
 const tb=s.tables.add({rows:c.table.length,columns:3,left:55,top:151,width:850,height:c.table.length===5?288:268,columnWidths:[190,330,330],values:c.table});tb.borders.assign({style:'solid',fill:'#D8E4ED',width:.6});
 for(let r=0;r<c.table.length;r++)for(let j=0;j<3;j++){let cell=tb.getCell(r,j);cell.fill=r===0?BLUE:(r%2?'#FFFFFF':'#F1F6FA');cell.text.style={typeface:'Arial',fontSize:21,color:r===0?'#FFFFFF':INK,bold:r===0,autoFit:'none',verticalAlignment:'middle',insets:{top:9,bottom:9,left:12,right:12}}}
 }else if(c.layout==='visual'||c.layout==='demo'){
 await media(s,c.media[0],52,147,555,c.demo?280:307);
 const size=c.body.length>3?22:24;
 text(s,c.body.join('\n\n'),630,152,275,300,size);
 if(c.demo)link(s,'Open interactive demo',`../Labs/SensorFusion/index.html#${c.demo}`,55,438,540);
 }else if(c.layout==='pair'){
 for(let j=0;j<2;j++){await media(s,c.media[j],55+j*445,142,405,240);text(s,c.labels[j],55+j*445,374,405,26,20,BLUE,true)}
 text(s,c.body.join('\n'),55,410,850,52,21);
 }else if(c.slide===5){
 text(s,'p_A = R_AB p_B + t_AB',75,150,800,48,32,BLUE,true);
 text(s,'T_AB =',75,220,180,105,32,BLUE);
 text(s,'[',260,180,45,145,105,BLUE);text(s,']',555,180,45,145,105,BLUE);
 text(s,'R_AB',310,215,145,45,30,BLUE);text(s,'t_AB',460,215,100,45,30,BLUE);
 text(s,'0',310,275,145,45,30,BLUE);text(s,'1',460,275,100,45,30,BLUE);
 text(s,'T₀ₙ = T₀₁ T₁₂ … Tₙ₋₁,ₙ',75,340,800,42,30,BLUE);
 text(s,c.body.join('\n'),75,393,810,66,22);
 }else if(c.slide===10){
 text(s,'K =',80,188,110,125,35,BLUE,true);text(s,'[',195,128,45,184,137,BLUE);text(s,']',495,128,45,184,137,BLUE);
 [['fₓ','0','cₓ'],['0','fᵧ','cᵧ'],['0','0','1']].forEach((r,i)=>r.forEach((v,j)=>text(s,v,250+j*85,168+i*49,75,45,32,BLUE)));
 text(s,'u = fₓ X/Z + cₓ     v = fᵧ Y/Z + cᵧ',75,341,815,44,31,BLUE);
 text(s,c.body.join('\n'),75,393,810,66,22);
 }else if(c.layout==='equation'){
 const eqH=c.equations.length===3?205:225;
 c.equations.forEach((e,j)=>text(s,e,75,155+j*(eqH/c.equations.length),815,eqH/c.equations.length,e.length>58?25:e.length>42?28:32,BLUE,j===0));
 text(s,c.body.join('\n'),75,393,810,66,22);
 }else if(c.layout==='resources'){
 c.body.forEach((t,j)=>text(s,t,60,150+j*54,840,49,23));
 for(let j=0;j<c.links.length;j++)link(s,c.links[j][0],c.links[j][1],60+(j%2)*425,332+Math.floor(j/2)*47,410);
 }else{
 const h=c.body.length===4?70:85;
 c.body.forEach((t,j)=>{if(c.layout==='steps'){text(s,String(j+1),55,152+j*h,35,h-6,29,BLUE,true);text(s,t,105,152+j*h,800,h-6,25)}else text(s,t,65,152+j*h,830,h-6,26)});
 }
 const takeShape=text(s,c.take,55,476,850,33,c.take.length>88?19:21,BLUE,true); if(c.demo)takeShape.text.set([[{run:c.take,link:{uri:`../Labs/SensorFusion/index.html#${c.demo}`,isExternal:true}}]]);
 }
 s.speakerNotes.textFrame.setText(`${c.notes}\n\n[Sources]\n${c.refs.join('\n')}\n\n[Visuals]\n${c.media.length?'Original deterministic outputs captured from the accompanying SensorFusion teaching simulator. These are synthetic teaching scenes, not real sensor recordings.':'Editable instructional text, equations, or table.'}\n\n${c.demo?'Local demo: ../Labs/SensorFusion/index.html#'+c.demo:''}`);
}
const candidate=path.join(BUILD,'candidate.pptx');await(await PresentationFile.exportPptx(p)).save(candidate);console.log('EXPORTED',candidate);
for(let i=0;i<C.length;i++){let b=await p.export({slide:p.slides.items[i],format:'png',scale:1.5});await fs.writeFile(path.join(BUILD,'render',`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await b.arrayBuffer()));console.log('RENDERED',i+1)}
const {finalizePresentation}=await import(pathToFileURL(path.join(SKILL,'container_tools/artifact_tool_utils.mjs')).href);
let stamp=Date.now(),out=path.join(BUILD,'finalized',`lecture4-${stamp}.pptx`);await fs.mkdir(path.dirname(out),{recursive:true});
let result=await finalizePresentation({workspaceDir:ROOT,candidatePath:candidate,finalPath:out,explicitTotalSlideCount:30,pythonExecutable:path.join(RUNTIME,'python/bin/python3'),integrityValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','9144000,5143500','--validate-heading-fit',...[2,8,18,29].flatMap(n=>['--require-native-table-slide',String(n)])],requiredNativeTableOwnerSlides:[2,8,18,29],fontPolicy:{basis:'reference',families:['Arial'],referencePath:FONTREF,referenceSha256:crypto.createHash('sha256').update(await fs.readFile(FONTREF)).digest('hex')},verifyArtifactToolImport:true,receiptPath:path.join(BUILD,`validation-${stamp}.json`)});await fs.writeFile(path.join(BUILD,'final-path.txt'),out);console.log(JSON.stringify(result));
