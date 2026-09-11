import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {initialState,transition,type Action} from './state';
import {presets,defaultPhrases,loadPreferences,STORAGE_KEY} from './content';
import {shops,streets,cip,limit,roadX,inCipFront,layout} from './map';
import {NeighborhoodAudio} from './audio';
import {circleIntersectsRect,facingYaw,movementVector,moveBody,encounterStep,aheadBlocked,type Rect} from './movement';
import './style.css';

const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const canvas=$<HTMLCanvasElement>('world'),settings=$<HTMLDialogElement>('settings');
const preferences=loadPreferences(),audio=new NeighborhoodAudio();
let state=initialState(),started=false,ready=false,selected=0,angle=Math.PI/4,zoom=28,settingsOpen=false;
let player:THREE.Group;const models:THREE.Group[]=[];
let bubbleUntil=0,elapsed=0,lastTime=performance.now(),lastStep=0,lastThought=-1;
let inspected:typeof shops[number]|null=null,near:typeof shops[number]|null=null,joined=0;
const keys=new Set<string>();let nudgeUntil=0,lastResponse=-10;
const scene=new THREE.Scene();scene.background=new THREE.Color('#aacad0');scene.fog=new THREE.Fog('#aacad0',80,150);
const camera=new THREE.OrthographicCamera(-30,30,22,-22,.1,250);
let renderer:THREE.WebGLRenderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});}
catch{showError('This little neighborhood needs WebGL 2. Please try a current desktop browser with hardware acceleration enabled.');throw new Error('WebGL unavailable');}
renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
scene.add(new THREE.HemisphereLight('#e6f6ff','#8d9470',1.65));
const sun=new THREE.DirectionalLight('#fff0c9',2.3);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-38;sun.shadow.camera.right=38;sun.shadow.camera.top=38;sun.shadow.camera.bottom=-38;sun.shadow.camera.near=.5;sun.shadow.camera.far=120;sun.shadow.bias=-.001;scene.add(sun);scene.add(sun.target);
const glow=new THREE.PointLight('#ffe399',0,10,1);scene.add(glow);
const circle=new THREE.Mesh(new THREE.RingGeometry(.7,.8,32),new THREE.MeshBasicMaterial({color:'#f8df9c',transparent:true,opacity:.8,side:THREE.DoubleSide}));circle.rotation.x=-Math.PI/2;circle.visible=false;scene.add(circle);
const target=new THREE.Vector3(cip.x-5,1,-cip.y),cameraTarget=target.clone(),offset=new THREE.Vector3();
interface Neighbor{root:THREE.Group;baseY:number;side:number;speed:number;index:number;latched:boolean;stopUntil:number;}
const neighbors:Neighbor[]=[],crowd:THREE.Group[]=[],cars:THREE.Group[]=[],bikes:THREE.Group[]=[];
let staticObstacles:Rect[]=[];
const replies:{owner:THREE.Group;el:HTMLElement;until:number;category:string}[]=[];
const crowdLabels:HTMLElement[]=[];
for(let i=0;i<3;i++){const el=document.createElement('div');el.className='crowd-thought';el.hidden=true;$('crowd-bubbles').append(el);crowdLabels.push(el);}
const indexes:Record<string,number>={};
function phrase(category:string){const list=preferences.phrases[category]||defaultPhrases[category]||[''];const n=indexes[category]||0;indexes[category]=n+1;return list[n%list.length];}
function thought(category:string,seconds=5){$('bubble').textContent=phrase(category);bubbleUntil=elapsed+seconds;$('bubble').hidden=false;}
function send(action:Action){
 const previous=state;state=transition(state,action);
 if(previous.mode==='meditating'&&state.mode==='walking'){joined=0;lastThought=-1;for(const c of crowd)c.visible=false;}
 if(state.mode==='meditating'&&previous.mode!=='meditating'){lastThought=-1;inspected=null;bubbleUntil=0;}
 if(previous.mode!=='invitation'&&state.mode==='invitation'){$('invitation').hidden=false;thought('invitation',8);}
}
function pose(root:THREE.Group,sitting:boolean){
 root.traverse(o=>{if(o.name.startsWith('stand_'))o.visible=!sitting;if(o.name.startsWith('sit_'))o.visible=sitting;if(o.name.startsWith('body_')||o.name.startsWith('arms_'))o.position.y=sitting?-.55:0;});
}
function enhance(group:THREE.Group){
 group.traverse(o=>{if(o instanceof THREE.Mesh){
  o.castShadow=true;o.receiveShadow=true;
  const ms=Array.isArray(o.material)?o.material:[o.material];
  for(const m of ms){
   if(!m.userData.cipColor){m.color?.convertSRGBToLinear();m.userData.cipColor=true;}
   if(m.map){m.map.magFilter=THREE.NearestFilter;m.map.minFilter=THREE.NearestFilter;}
  }
 }});return group;
}
function showError(message:string){$('error').textContent=message;$('error').hidden=false;}
const loader=new GLTFLoader();
async function load(){
 try{
   const data=await Promise.all(['neighborhood',...presets.map((_,i)=>`character-${i}`),'car','bike'].map(n=>loader.loadAsync(`/assets/${n}.glb`)));
   const colliderResponse=await fetch('/assets/colliders.json');if(!colliderResponse.ok)throw new Error('Collision data missing');staticObstacles=await colliderResponse.json();
   scene.add(enhance(data[0].scene));
   data.slice(1,5).forEach(d=>{models.push(enhance(d.scene));});
   player=models[0].clone(true);player.scale.setScalar(1.25);player.position.set(cip.x-5,.26,-cip.y);scene.add(player);pose(player,false);
   for(let i=0;i<20;i++){
     const root=models[i%4].clone(true);root.scale.setScalar(1.1+(i%3)*.06);pose(root,false);scene.add(root);
     const y=6+(i/20)*(limit-12),side=i%2?1:-1;root.position.set(roadX(y)+side*layout.walkingCenter,.26,-y);
     neighbors.push({root,baseY:y,side,speed:i%2?1.5:-1.5,index:i,latched:false,stopUntil:0});
   }
   for(let i=0;i<48;i++){
     const root=models[i%4].clone(true);root.scale.setScalar(1.12);pose(root,true);root.visible=false;root.traverse(o=>{if(o instanceof THREE.Mesh)o.castShadow=false;});scene.add(root);crowd.push(root);
   }
   for(let i=0;i<6;i++){
     const root=enhance(data[5].scene.clone(true));const side=i%2?1:-1,y=15+i*(limit-25)/6;
     root.userData={...root.userData,side,speed:5,latched:false,stopUntil:0,stopped:false};root.position.set(roadX(y)+side*layout.carCenter,.05,-y);root.rotation.y=side>0?Math.PI:0;scene.add(root);cars.push(root);
   }
   for(let i=0;i<10;i++){
     const root=enhance(data[6].scene.clone(true));root.scale.setScalar(1.05);const side=i%2?1:-1,y=10+i*(limit-20)/10;
     root.userData={...root.userData,side,speed:3.2,latched:false,stopUntil:0,stopped:false};root.position.set(roadX(y)+side*layout.bikeCenter,.08,-y);root.rotation.y=side>0?Math.PI:0;scene.add(root);bikes.push(root);
   }
   ready=true;$<HTMLButtonElement>('begin').disabled=false;$('begin').textContent='Take a walk →';
 }catch(e){console.error(e);showError('The neighborhood could not load. Please refresh to try again.');}
}
void load();
presets.forEach((preset,i)=>{
 const button=document.createElement('button');button.type='button';button.className='preset'+(i===0?' selected':'');button.setAttribute('aria-pressed',String(i===0));button.title=preset.description;
 const swatch=document.createElement('span');swatch.className='preset-swatch';swatch.style.background=preset.color;button.append(swatch,document.createTextNode(preset.name));
 button.addEventListener('click',()=>{selected=i;document.querySelectorAll('.preset').forEach((el,j)=>{el.classList.toggle('selected',i===j);el.setAttribute('aria-pressed',String(i===j));});if(ready){const p=player.position.clone();scene.remove(player);player=models[i].clone(true);player.scale.setScalar(1.25);player.position.copy(p);pose(player,false);scene.add(player);}});$('presets').append(button);
});
function reset(){
 state=initialState();started=true;inspected=null;joined=0;lastThought=-1;keys.clear();angle=Math.PI/4;zoom=28;nudgeUntil=0;lastResponse=-10;
 for(const r of replies)r.el.remove();replies.length=0;
 player.position.set(roadX(7)-layout.walkingCenter,.26,-7);player.rotation.y=0;pose(player,false);for(const c of crowd)c.visible=false;
 $('invitation').hidden=true;$('start').hidden=true;thought('welcome',6);cameraTarget.copy(player.position);canvas.focus();
}
$('begin').addEventListener('click',()=>{if(!ready)return;void audio.start();reset();});
$('restart').addEventListener('click',reset);
$('sample-jump').addEventListener('click',()=>{if(!started||state.mode==='invitation')return;send({type:'move'});player.position.set(cip.x-5,.26,-cip.y);cameraTarget.copy(player.position);thought('cip',5);canvas.focus();});
const category=$<HTMLSelectElement>('phrase-category'),editor=$<HTMLTextAreaElement>('phrase-editor');
let draft=structuredClone(preferences.phrases),currentCategory='middle-east';
for(const id of Object.keys(defaultPhrases)){const op=document.createElement('option');op.value=id;op.textContent=shops.find(s=>s.id===id)?.name||({cars:'Cars · driver dialogue',pedestrians:'Pedestrians · sidewalk dialogue',cyclists:'Cyclists · bike-lane dialogue'} as Record<string,string>)[id]||id[0].toUpperCase()+id.slice(1);category.append(op);}
const stash=()=>{const lines=editor.value.split('\n').map(x=>x.trim()).filter(Boolean).map(x=>x.slice(0,240)).slice(0,30);if(lines.length)draft[currentCategory]=lines;};
category.addEventListener('change',()=>{stash();currentCategory=category.value;editor.value=draft[currentCategory].join('\n');});
$('settings-open').addEventListener('click',()=>{draft=structuredClone(preferences.phrases);editor.value=draft[currentCategory].join('\n');$<HTMLInputElement>('music-toggle').checked=preferences.music;$<HTMLInputElement>('ambience-toggle').checked=preferences.ambience;$<HTMLInputElement>('guidance-toggle').checked=preferences.guidance;settingsOpen=true;keys.clear();settings.showModal();$('save-status').textContent='';void audio.pause();});
function closeSettings(){settingsOpen=false;settings.close();keys.clear();canvas.focus();if(started)void audio.resume();}
$('settings-close').addEventListener('click',closeSettings);settings.addEventListener('cancel',e=>{e.preventDefault();closeSettings();});
$('reset-phrases').addEventListener('click',()=>{draft[currentCategory]=[...defaultPhrases[currentCategory]];editor.value=draft[currentCategory].join('\n');});
$('settings-form').addEventListener('submit',e=>{e.preventDefault();stash();preferences.phrases=draft;preferences.music=$<HTMLInputElement>('music-toggle').checked;preferences.ambience=$<HTMLInputElement>('ambience-toggle').checked;preferences.guidance=$<HTMLInputElement>('guidance-toggle').checked;try{localStorage.setItem(STORAGE_KEY,JSON.stringify(preferences));$('save-status').textContent='Saved in this browser.';}catch{$('save-status').textContent='Changes work for this visit. Browser storage is unavailable.';}audio.musicEnabled=preferences.music;audio.ambienceEnabled=preferences.ambience;});
audio.musicEnabled=preferences.music;audio.ambienceEnabled=preferences.ambience;
window.addEventListener('keydown',e=>{
 if(!started||settingsOpen||['INPUT','SELECT','TEXTAREA','BUTTON','A'].includes((e.target as HTMLElement)?.tagName))return;
 const k=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright','enter'].includes(k))e.preventDefault();keys.add(k);if(e.repeat)return;
 if(k==='q')angle-=Math.PI/2;if(k==='e')angle+=Math.PI/2;
 if(k==='='||k==='+')zoom=Math.max(13,zoom-2);if(k==='-')zoom=Math.min(32,zoom+2);
 if(k===' '&&elapsed>=nudgeUntil){if(state.mode==='examining')inspected=null;send({type:'sit',safe:inCipFront(player.position.x,-player.position.z)});}
 if(k==='enter'&&near&&state.mode!=='meditating'&&state.mode!=='invitation'){
     if(inspected){inspected=null;send({type:'move'});}else{inspected=near;angle=near.side===1?-Math.PI/4:Math.PI/4;send({type:'examine'});player.rotation.y=near.side*Math.PI/2;thought(near.id,7);}
 }
 if(k==='escape'&&state.mode!=='invitation'){inspected=null;send({type:'move'});}
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());
document.addEventListener('visibilitychange',()=>{keys.clear();lastTime=performance.now();if(document.hidden)void audio.pause();else if(started&&!settingsOpen)void audio.resume();});
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=THREE.MathUtils.clamp(zoom+Math.sign(e.deltaY)*1.5,13,32);},{passive:false});
canvas.addEventListener('pointerdown',()=>canvas.focus());
function resize(){renderer.setSize(Math.max(1,Math.floor(innerWidth/2)),Math.max(1,Math.floor(innerHeight/2)),false);}window.addEventListener('resize',resize);resize();
const playerRadius=.48;
function traversable(x:number,y:number){
 if(y<1||y>limit+2)return false;
 if(staticObstacles.some(rect=>circleIntersectsRect(x,y,playerRadius,rect)))return false;
 if(Math.abs(x-roadX(y))<layout.sidewalkCenter+layout.sidewalkWidth/2-playerRadius)return true;
 return streets.some(s=>Math.abs(y-s.y)<layout.crossStreetWidth/2-playerRadius&&Math.abs(x-s.x)<layout.sideStreetReach-playerRadius);
}
function actorRect(root:THREE.Group,width:number,length:number):Rect {return {xMin:root.position.x-width,xMax:root.position.x+width,yMin:-root.position.z-length,yMax:-root.position.z+length};}
function unoccupied(x:number,y:number,except?:THREE.Group){
 return traversable(x,y)&&!cars.some(c=>c!==except&&circleIntersectsRect(x,y,playerRadius,actorRect(c,.87,1.5)))
  &&!bikes.some(c=>c!==except&&circleIntersectsRect(x,y,playerRadius,actorRect(c,.45,1.4)))
  &&!neighbors.some(n=>n.root!==except&&n.root.visible&&Math.hypot(x-n.root.position.x,y+n.root.position.z)<.90);
}
function reply(owner:THREE.Group,kind:'cars'|'pedestrians'|'cyclists'){
 if(elapsed-lastResponse<5.5||inCipFront(player.position.x,-player.position.z)||state.mode==='invitation')return false;
 lastResponse=elapsed;
 const el=document.createElement('div');el.className='thought actor-thought';el.dataset.speaker=kind;el.setAttribute('role','status');el.textContent=phrase(kind);el.hidden=false;$('app').append(el);replies.push({owner,el,until:elapsed+5.5,category:kind});bubbleUntil=0;
 if(kind==='cars')audio.honk();else if(kind==='cyclists')audio.bell();
 if(state.mode==='meditating'){
   send({type:'interrupt'});nudgeUntil=elapsed+1.5;
   const side=player.position.x>roadX(-player.position.z)?1:-1;
   const desiredX=kind==='pedestrians'?side*.65:0;
   const p=moveBody({x:player.position.x,y:-player.position.z},{x:desiredX,y:(-player.position.z<cip.y?1:-1)*.65},(x,y)=>unoccupied(x,y,owner));
   player.position.set(p.x,.26,-p.y);pose(player,false);
 }
 return true;
}
function placeLabel(el:HTMLElement,position:THREE.Vector3,height=2.8){
 const p=position.clone();p.y+=height;p.project(camera);
 const x=(p.x*.5+.5)*innerWidth,y=(-p.y*.5+.5)*innerHeight;
 el.style.left=`${THREE.MathUtils.clamp(x,145,innerWidth-145)}px`;el.style.top=`${THREE.MathUtils.clamp(y,100,innerHeight-160)}px`;
}
function update(dt:number){
 const paused=settingsOpen||document.hidden;if(!paused)elapsed+=dt;
 if(started&&!paused){
   let dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
   let dy=Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown'));
   const moving=(dx!==0||dy!==0)&&state.mode!=='invitation';
   if(moving){
     if(state.mode!=='walking'){send({type:'move'});inspected=null;}
     const length=Math.hypot(dx,dy);dx/=length;dy/=length;
     const vector=movementVector(angle,dx,dy),vx=vector.x*9*dt,vz=vector.z*9*dt;
     const before=player.position.clone();const next=moveBody({x:before.x,y:-before.z},{x:vx,y:-vz},unoccupied);
     player.position.x=next.x;player.position.z=-next.y;
     const moved=player.position.distanceTo(before)>.001;
     if(moved){player.rotation.y=facingYaw(player.position.x-before.x,player.position.z-before.z);player.position.y=.26+Math.abs(Math.sin(elapsed*14))*.08;if(elapsed-lastStep>.31){audio.step();lastStep=elapsed;}}
   }else player.position.y=.26;
   send({type:'tick',dt});
   if(state.mode==='meditating'&&state.safe){
     const step=Math.floor(state.elapsed/7.5);if(step!==lastThought){lastThought=step;thought('meditation',4.5);}
     joined=Math.min(20,Math.floor(state.elapsed/2.8));
   }
   if(state.mode==='invitation')joined=Math.min(48,20+Math.floor((elapsed-invitationStart)/2));
   pose(player,state.mode==='meditating'||state.mode==='invitation');
   audio.update(state.mode==='meditating'||state.mode==='invitation');
 }
 const py=-player.position.z;
 near=shops.reduce<typeof shops[number]|null>((best,s)=>{
   const dist=Math.hypot(player.position.x-(s.x-s.side*5.7),py-s.y);
   return dist<Math.max(5,s.width/2)&&(!best||dist<Math.hypot(player.position.x-(best.x-best.side*5.7),py-best.y))?s:best;
 },null);
 const safe=inCipFront(player.position.x,py),sitting=state.mode==='meditating'||state.mode==='invitation';
 const closestStreet=streets.reduce((a,b)=>Math.abs(a.y-py)<Math.abs(b.y-py)?a:b);
 $('location-text').textContent=near?near.name:`Clark · ${closestStreet.name}`;
 $('guidance').hidden=!preferences.guidance||!started||state.mode==='invitation'||safe;
 $('guidance-distance').textContent=py<cip.y?'North along Clark Street':'A little south along Clark Street';
 $('direction-arrow').style.transform=`rotate(${(py<cip.y?0:180)-angle*180/Math.PI}deg)`;
 $('context').hidden=!started||!near||sitting;
 if(near){$('context-name').textContent=near.name;$('context-action').textContent=safe?'Space · Sit anywhere here':inspected?'WASD or Escape · Keep walking':'Enter · Take a closer look';}
 $('meditation-caption').hidden=!sitting||state.mode==='invitation';
 $('meditation-caption').textContent=state.safe?'Nothing to do. Just be here.':'A little pause in the middle of everything.';
 $('sample-jump').hidden=state.mode==='invitation';
 glow.intensity=sitting&&state.safe?3+Math.min(state.elapsed/12,3):0;glow.position.copy(player.position).add(new THREE.Vector3(0,1.8,0));
 circle.visible=sitting&&state.safe;circle.position.set(player.position.x,.29,player.position.z);circle.scale.setScalar(1.2+Math.sin(elapsed*1.4)*.06);
 for(const [i,c] of crowd.entries()){
   c.visible=i<joined;
   if(c.visible){const row=Math.floor(i/8),col=i%8;c.position.set(cip.x-5.4-row*1.25,.26,-cip.y-5.4+col*1.5);if(c.position.distanceTo(player.position)<1.1)c.position.z+=1.2;c.rotation.y=-Math.PI/2;}
 }
 if(!paused){
  const sittingOutside=started&&state.mode==='meditating'&&!state.safe;
  const sidewalkSit=sittingOutside&&Math.abs(player.position.x-roadX(py))>layout.roadHalfWidth;
  const seeker=sidewalkSit?neighbors.filter(n=>Math.sign(player.position.x-roadX(py))===n.side).sort((a,b)=>a.root.position.distanceTo(player.position)-b.root.position.distanceTo(player.position))[0]:undefined;
  for(const n of neighbors){
   const root=n.root,dist=Math.hypot(root.position.x-player.position.x,-root.position.z-py);
   const blocked=started&&dist<(sidewalkSit?2.1:1.5);
   const encounter=encounterStep(n.latched,blocked,dist>4);n.latched=encounter.latched;
   if(blocked&&sidewalkSit&&elapsed-lastResponse>=5.5){if(reply(root,'pedestrians'))n.stopUntil=elapsed+4;}
   if(blocked||elapsed<n.stopUntil){root.rotation.y=facingYaw(player.position.x-root.position.x,player.position.z-root.position.z);continue;}
   const old={x:root.position.x,y:-root.position.z};
   let targetY=old.y+n.speed*dt,targetX=roadX(targetY)+n.side*layout.walkingCenter;
   if(n===seeker){const d=Math.max(1,dist);targetY=old.y+(py-old.y)/d*2.1*dt;targetX=old.x+(player.position.x-old.x)/d*2.1*dt;}
   if(targetY<2||targetY>limit-2){targetY=n.speed>0?2:limit-2;root.position.set(roadX(targetY)+n.side*layout.walkingCenter,.26,-targetY);n.baseY=targetY;continue;}
   const p=moveBody(old,{x:THREE.MathUtils.clamp(targetX-old.x,-2*dt,2*dt),y:targetY-old.y},(x,y)=>traversable(x,y)&&(!started||Math.hypot(x-player.position.x,y-py)>1.1)&&!neighbors.some(other=>other!==n&&other.root.visible&&Math.hypot(x-other.root.position.x,y+other.root.position.z)<.85));
   root.position.set(p.x,.26,-p.y);n.baseY=p.y;
   const moved=Math.hypot(p.x-old.x,p.y-old.y)>.001;
   if(moved){root.rotation.y=facingYaw(p.x-old.x,old.y-p.y);root.position.y+=Math.abs(Math.sin(elapsed*7+n.index))*.06;}
   root.visible=!(joined>0&&Math.abs(p.y-cip.y)<9);
  }
  for(const [actors,kind,lane] of [[cars,'cars',layout.carCenter],[bikes,'cyclists',layout.bikeCenter]] as const){
   for(const root of actors){
    const u=root.userData,side=u.side as number,y=-root.position.z;
    const playerPoint={x:player.position.x,y:-player.position.z};
    const dist=Math.hypot(root.position.x-playerPoint.x,y-playerPoint.y);
    const meditationInLane=sittingOutside&&(kind==='cars'?Math.abs(playerPoint.x-roadX(playerPoint.y))<6.7:Math.abs(playerPoint.x-roadX(playerPoint.y))>=6.7&&Math.abs(playerPoint.x-roadX(playerPoint.y))<10);
    const blocked=started&&aheadBlocked({x:root.position.x,y},playerPoint,side,meditationInLane?6.5:kind==='cars'?1.5:1.05,kind==='cars'?3.7:3.1);
    const encounter=encounterStep(Boolean(u.latched),blocked,dist>6);
    u.latched=encounter.latched;
    if(blocked&&!u.announced&&elapsed-lastResponse>=5.5){if(reply(root,kind)){u.announced=true;u.stopUntil=elapsed+4;}}
    if(!u.latched)u.announced=false;
    const following=actors.some(other=>other!==root&&other.userData.side===side&&(-other.position.z-y)*side>0&&(-other.position.z-y)*side<5);
    const gathering=joined>12&&Math.abs(y-cip.y)<12&&((cip.y-y)*side>0);
    u.stopped=blocked||following||gathering||elapsed<u.stopUntil;
    if(!u.stopped){
     const next=(y+side*u.speed*dt+limit)%limit;
     root.position.set(roadX(next)+side*lane,kind==='cars'?.05:.08,-next);
     root.rotation.y=facingYaw(roadX(next+side*.5)-roadX(next),-side*.5);
    }
   }
  }
 }
 target.copy(player.position);target.y=1.2;
 let view=zoom;
 if(inspected){target.set(inspected.x-inspected.side*2.6,2,-inspected.y);view=13;}
 else if(safe){target.x=cip.x-4.5;target.y=1.5;view=state.mode==='invitation'?28:20;}
 if(!started){target.set(cip.x-3,2,-cip.y);view=23;}
 cameraTarget.lerp(target,1-Math.exp(-dt*5));
 offset.set(Math.sin(angle)*38,35,Math.cos(angle)*38);camera.position.copy(cameraTarget).add(offset);camera.lookAt(cameraTarget);
 const aspect=innerWidth/innerHeight;camera.left=-view*aspect/2;camera.right=view*aspect/2;camera.top=view/2;camera.bottom=-view/2;camera.updateProjectionMatrix();
 sun.position.copy(cameraTarget).add(new THREE.Vector3(-22,38,18));sun.target.position.copy(cameraTarget);
 $('bubble').hidden=elapsed>bubbleUntil||!started;placeLabel($('bubble'),player.position,sitting?2:3);
 for(let i=replies.length-1;i>=0;i--){const r=replies[i];if(elapsed>=r.until){r.el.remove();replies.splice(i,1);}else placeLabel(r.el,r.owner.position,r.category==='cars'?2.3:3);}
 for(let i=0;i<crowdLabels.length;i++){
   const el=crowdLabels[i],visible=joined>5&&Math.floor(elapsed+i*2)%11<5;
   el.hidden=!visible;
   if(visible){const idx=(Math.floor(elapsed/11)*3+i*7)%Math.max(1,joined);placeLabel(el,crowd[idx].position,2.2);const phase=String(Math.floor(elapsed/11));if(el.dataset.phase!==phase){el.dataset.phase=phase;el.textContent=phrase('crowd');}}
 }
}
let invitationStart=Infinity;
function frame(time:number){
 requestAnimationFrame(frame);const dt=Math.min(.05,(time-lastTime)/1000);lastTime=time;
 if(!ready)return;
 if(state.mode==='invitation'&&invitationStart===Infinity)invitationStart=elapsed;
 if(state.mode!=='invitation')invitationStart=Infinity;
 update(document.hidden?0:dt);renderer.render(scene,camera);
}
requestAnimationFrame(frame);
// Read-only inspection for reproducible acceptance evidence. No time or position mutation.
Object.defineProperty(window,'cipSnapshot',{value:()=>({mode:state.mode,elapsed:state.elapsed,safe:inCipFront(player?.position.x??0,-(player?.position.z??0)),position:player?.position.toArray(),angle,joined,started,ready,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,cars:cars.map(c=>({position:c.position.toArray(),stopped:c.userData.stopped})),bikes:bikes.map(c=>({position:c.position.toArray(),stopped:c.userData.stopped})),replies:replies.map(r=>({category:r.category,text:r.el.textContent})),preferences:{music:preferences.music,ambience:preferences.ambience,guidance:preferences.guidance}})});
