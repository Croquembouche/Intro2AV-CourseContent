// Add native, clickable links while preserving every existing slide and media part.
// Usage: node add_demo_links.mjs /absolute/current.pptx /absolute/output.pptx
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
const [source,output]=process.argv.slice(2);
if(!source||!output)throw Error('Supply source and output PPTX paths');
if(path.resolve(source)===path.resolve(output))throw Error('Use a separate output file, then copy the verified result.');
const build=path.join(path.dirname(output),'link-build');await fs.mkdir(build,{recursive:true});
const runtime=process.env.RUNTIME_NODE_MODULES||'/home/william/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const require=createRequire(path.join(runtime,'package.json'));
const {Presentation,PresentationFile}=await import(pathToFileURL(require.resolve('@oai/artifact-tool')).href);
const base='https://croquembouche.github.io/Intro2AV-CourseContent/';
const links=[
 {slide:1,label:'Interactive demos: croquembouche.github.io/Intro2AV-CourseContent',url:base,x:65,y:435,w:810,h:32,size:19,color:'#FFFFFF'},
 {slide:4,label:'Explore the MLP in 3D',url:base+'?model=mlp',x:625,y:510,w:250,h:21,size:14,color:'#00539F'},
 {slide:14,label:'Explore the CNN in 3D',url:base+'?model=cnn',x:625,y:510,w:250,h:21,size:14,color:'#00539F'},
 {slide:26,label:'Explore the transformer in 3D',url:base+'?model=transformer',x:625,y:510,w:250,h:21,size:14,color:'#00539F'}
];
const p=Presentation.create({slideSize:{width:960,height:540}});
for(const l of links){
 const slide=p.slides.add();
 const shape=slide.shapes.add({geometry:'textbox',name:'Neural Vision demo link',position:{left:l.x,top:l.y,width:l.w,height:l.h},fill:'none',line:{fill:'none',width:0}});
 shape.text=l.label;
 shape.text.style={fontSize:l.size,typeface:'Arial',color:l.color,autoFit:'none',wrap:'none',verticalAlignment:'middle',insets:{top:0,right:0,bottom:0,left:0}};
 shape.text.set([[{run:l.label,textStyle:{underline:'sng',color:l.color},link:{uri:l.url,isExternal:true}}]]);
}
const parts=path.join(build,'links.pptx');await(await PresentationFile.exportPptx(p)).save(parts);
await fs.writeFile(path.join(build,'links.json'),JSON.stringify(links));
execFileSync('/usr/bin/python3',['-c',String.raw`
import sys,zipfile,json,copy
from lxml import etree as E
source,parts,manifest,output=sys.argv[1:]
P='http://schemas.openxmlformats.org/presentationml/2006/main'
A='http://schemas.openxmlformats.org/drawingml/2006/main'
R='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
PKG='http://schemas.openxmlformats.org/package/2006/relationships'
ns={'p':P,'a':A,'r':R}
with zipfile.ZipFile(source) as original,zipfile.ZipFile(parts) as generated:
 changes={}
 for index,link in enumerate(json.load(open(manifest)),1):
  name=f'ppt/slides/slide{link["slide"]}.xml';relname=f'ppt/slides/_rels/slide{link["slide"]}.xml.rels'
  slide=E.fromstring(original.read(name));rels=E.fromstring(original.read(relname))
  tree=slide.find('p:cSld/p:spTree',ns)
  for old in tree.xpath('p:sp[p:nvSpPr/p:cNvPr/@name="Neural Vision demo link"]',namespaces=ns):
   for rid in old.xpath('.//a:hlinkClick/@r:id',namespaces=ns):
    for rel in list(rels):
     if rel.get('Id')==rid:rels.remove(rel)
   tree.remove(old)
  new=copy.deepcopy(E.fromstring(generated.read(f'ppt/slides/slide{index}.xml')).find('p:cSld/p:spTree/p:sp',ns))
  new.find('p:nvSpPr/p:cNvPr',ns).set('id',str(max(map(int,slide.xpath('//p:cNvPr/@id',namespaces=ns)))+1))
  used={r.get('Id') for r in rels};i=1
  while f'rIdNeuralVision{i}' in used:i+=1
  rid=f'rIdNeuralVision{i}'
  for click in new.xpath('.//a:hlinkClick',namespaces=ns):click.set('{'+R+'}id',rid)
  E.SubElement(rels,'{'+PKG+'}Relationship',Id=rid,Type=R+'/hyperlink',Target=link['url'],TargetMode='External')
  tree.append(new)
  changes[name]=E.tostring(slide,xml_declaration=True,encoding='UTF-8',standalone=True)
  changes[relname]=E.tostring(rels,xml_declaration=True,encoding='UTF-8',standalone=True)
 with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as out:
  for part in original.infolist():out.writestr(copy.copy(part),changes.get(part.filename,original.read(part.filename)))
 with zipfile.ZipFile(output) as result:
  assert result.testzip() is None
  assert set(original.namelist())==set(result.namelist())
  assert all(original.read(n)==result.read(n) for n in original.namelist() if n not in changes)
  for link in json.load(open(manifest)):
   assert link['url'] in result.read(f'ppt/slides/_rels/slide{link["slide"]}.xml.rels').decode()
print('Added links on slides 1, 4, 14 and 26; all other slide and media parts are byte-identical.')
`,source,parts,path.join(build,'links.json'),output],{stdio:'inherit'});
