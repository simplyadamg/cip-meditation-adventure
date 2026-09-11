import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {initialState,transition,type Action} from './state';
import {presets,defaultPhrases,loadPreferences,STORAGE_KEY} from './content';
import {shops,streets,cip,limit,roadX,inCipFront,layout} from './map';
import {NeighborhoodAudio} from './audio';
import {circleIntersectsRect,facingYaw,moveAlongStreet,moveBody,aheadBlocked,type Rect,type Point} from './movement';
import {routeAround,distance,segmentClear,dampAngle,shoulderYaw,facadeView} from './navigation';
import './style.css';
import './compass.css';

const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const canvas=$<HTMLCanvasElement>('world'),settings=$<HTMLDialogElement>('settings');
const preferences=loadPreferences(),audio=new NeighborhoodAudio();
let state=initialState(),started=false,ready=false,selected=0,angle=Math.PI/4,zoom=28,settingsOpen=false;
let player:THREE.Group;const models:THREE.Group[]=[];
let bubbleUntil=0,elapsed=0,lastTime=performance.now(),lastStep=0,lastThought=-1;
let inspected:typeof shops[number]|null=null,near:typeof shops[number]|null=null,joined=0;
const keys=new Set<string>();let nudgeUntil=0,lastResponse=-10;
let lastOrbit=-10,autoPath:Point[]=[],yieldingTo:THREE.Group|null=null,currentView=28;
let moveCameraGoal:number|null=null,moveCommand='';
const walkingCameraHeight=22;
const actorMargin=75;
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
interface Travel {path:Point[];blockedFor:number;retryAt:number;}
const travels=new Map<THREE.Group,Travel>();
const crowdTrips=new Map<THREE.Group,{goal:Point;leaving:boolean;seated:boolean}>();
const point=(root:THREE.Group):Point=>({x:root.position.x,y:-root.position.z});
const neighbors:Neighbor[]=[],crowd:THREE.Group[]=[],cars:THREE.Group[]=[],bikes:THREE.Group[]=[];
let staticObstacles:Rect[]=[];
const obstacleBuckets=new Map<string,Rect[]>();
const replies:{owner:THREE.Group;el:HTMLElement;until:number;category:string}[]=[];
const crowdLabels:HTMLElement[]=[];
for(let i=0;i<3;i++){const el=document.createElement('div');el.className='crowd-thought';el.hidden=true;$('crowd-bubbles').append(el);crowdLabels.push(el);}
const indexes:Record<string,number>={};
function phrase(category:string){const list=preferences.phrases[category]||defaultPhrases[category]||[''];const n=indexes[category]||0;indexes[category]=n+1;return list[n%list.length];}
function thought(category:string,seconds=5){$('bubble').textContent=phrase(category);bubbleUntil=elapsed+seconds;$('bubble').hidden=false;}
function send(action:Action){
 const previous=state;state=transition(state,action);
 if(previous.mode==='meditating'&&state.mode==='walking'){
   joined=0;lastThought=-1;
   for(const [c,trip] of crowdTrips){trip.leaving=true;trip.seated=false;trip.goal=entryPoint(c.userData.entrySide??1);pose(c,false);travels.delete(c);}
 }
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
   for(const rect of staticObstacles){
     for(let x=Math.floor((rect.xMin-.5)/8);x<=Math.floor((rect.xMax+.5)/8);x++)for(let y=Math.floor((rect.yMin-.5)/8);y<=Math.floor((rect.yMax+.5)/8);y++){
       const key=`${x},${y}`,bucket=obstacleBuckets.get(key)??[];bucket.push(rect);obstacleBuckets.set(key,bucket);
     }
   }
   scene.add(enhance(data[0].scene));
   data.slice(1,5).forEach(d=>{models.push(enhance(d.scene));});
   player=models[0].clone(true);player.scale.setScalar(1.25);player.position.set(cip.x-6,.26,-cip.y);scene.add(player);pose(player,false);
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
   for(const root of [...cars,...bikes,...neighbors.map(n=>n.root)])root.userData.home=root.position.clone();
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
 autoPath=[];yieldingTo=null;lastOrbit=-10;moveCameraGoal=null;moveCommand='';travels.clear();crowdTrips.clear();
 for(const root of [...cars,...bikes,...neighbors.map(n=>n.root)]){root.userData.stopUntil=0;root.userData.announced=false;root.position.copy(root.userData.home);}
 player.position.set(roadX(7)+layout.walkingCenter,.26,-7);
 player.rotation.y=facingYaw(roadX(7.1)-roadX(7),-.1);angle=shoulderYaw(player.rotation.y);
 offset.set(Math.sin(angle)*38,walkingCameraHeight,Math.cos(angle)*38);
 pose(player,false);for(const c of crowd)c.visible=false;
 $('invitation').hidden=true;$('start').hidden=true;thought('welcome',6);cameraTarget.copy(player.position);canvas.focus();
}
$('begin').addEventListener('click',()=>{if(!ready)return;void audio.start();reset();});
$('restart').addEventListener('click',reset);
$('restart-top').addEventListener('click',()=>{if(started)reset();});
$('sample-jump').addEventListener('click',()=>{if(!started||state.mode==='invitation')return;send({type:'move'});inspected=null;autoPath=[];yieldingTo=null;player.position.set(cip.x-6,.26,-cip.y);cameraTarget.copy(player.position);thought('cip',5);canvas.focus();});
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
 if((k==='q'||k==='e')&&!inspected&&!(state.safe&&state.mode!=='walking')){angle+=(k==='q'?-1:1)*Math.PI/2;lastOrbit=elapsed;}
 if(k==='='||k==='+')zoom=Math.max(13,zoom-2);if(k==='-')zoom=Math.min(32,zoom+2);
 if(k===' '&&elapsed>=nudgeUntil){autoPath=[];yieldingTo=null;if(state.mode==='examining')inspected=null;send({type:'sit',safe:inCipFront(player.position.x,-player.position.z)});}
 if(k==='enter'&&near&&near.id!=='cip'&&state.mode!=='meditating'&&state.mode!=='invitation'){
     if(inspected){inspected=null;autoPath=[];send({type:'move'});}else{
       inspected=near;send({type:'examine'});player.rotation.y=near.side*Math.PI/2;thought(near.id,7);
       const goal={x:near.x-near.side*6.4,y:near.y};autoPath=routeAround(point(player),goal,unoccupied);yieldingTo=null;
     }
 }
 if(k==='escape'&&state.mode!=='invitation'){inspected=null;autoPath=[];send({type:'move'});}
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());
document.addEventListener('visibilitychange',()=>{keys.clear();lastTime=performance.now();if(document.hidden)void audio.pause();else if(started&&!settingsOpen)void audio.resume();});
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=THREE.MathUtils.clamp(zoom+Math.sign(e.deltaY)*1.5,13,32);},{passive:false});
canvas.addEventListener('pointerdown',()=>canvas.focus());
function resize(){renderer.setSize(Math.max(1,Math.floor(innerWidth/2)),Math.max(1,Math.floor(innerHeight/2)),false);}window.addEventListener('resize',resize);resize();
const playerRadius=.48;
function groundClear(x:number,y:number){
 if(y<-90||y>limit+90)return false;
 if(obstacleBuckets.get(`${Math.floor(x/8)},${Math.floor(y/8)}`)?.some(rect=>circleIntersectsRect(x,y,playerRadius,rect)))return false;
 if(Math.abs(x-roadX(y))<layout.sidewalkCenter+layout.sidewalkWidth/2-playerRadius)return true;
 return streets.some(s=>Math.abs(y-s.y)<layout.crossStreetWidth/2-playerRadius&&Math.abs(x-s.x)<layout.sideStreetReach-playerRadius);
}
function traversable(x:number,y:number){return y>=1&&y<=limit+2&&groundClear(x,y);}
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
 owner.userData.stopUntil=elapsed+3.5;
 if(state.mode==='meditating'){
   send({type:'interrupt'});nudgeUntil=elapsed+4;pose(player,false);yieldingTo=owner;
   const p=point(player),side=p.x>roadX(p.y)?1:-1;
   // Try both sidewalk edges and neighboring clear spots; walk there, never snap.
   const offsets=kind==='pedestrians'?[14.1,11.8,13.6]:[12.7,13.7,11.8];
   autoPath=[];
   for(const dy of [0,2,-2,4,-4,6,-6]){
     for(const offset of offsets){const goal={x:roadX(p.y+dy)+side*offset,y:p.y+dy};
       if(Math.abs(goal.x-owner.position.x)<(kind==='pedestrians'?1.35:2))continue;
       const path=routeAround(p,goal,unoccupied);if(path.length){autoPath=path;break;}
     }
     if(autoPath.length)break;
   }
 }
 return true;
}
function placeLabel(el:HTMLElement,position:THREE.Vector3,height=2.8){
 const p=position.clone();p.y+=height;p.project(camera);
 const x=(p.x*.5+.5)*innerWidth,y=(-p.y*.5+.5)*innerHeight;
 el.style.left=`${THREE.MathUtils.clamp(x,145,innerWidth-145)}px`;el.style.top=`${THREE.MathUtils.clamp(y,100,innerHeight-160)}px`;
}
function onScreen(p:Point,margin=1.3){
 const v=new THREE.Vector3(p.x,1.5,-p.y).project(camera);
 return v.z>=-1&&v.z<=1&&Math.abs(v.x)<margin&&Math.abs(v.y)<margin;
}
function entryPoint(side:number):Point{
 for(let d=24;d<=actorMargin;d+=3){
   const y=cip.y+side*d;
   for(const lane of [12.7,13.6,12]){const p={x:roadX(y)+lane,y};if(!onScreen(p,1.5)&&groundClear(p.x,p.y))return p;}
 }
 const y=cip.y+side*actorMargin;return {x:roadX(y)+12.7,y};
}
function pedestriansClear(root:THREE.Group,x:number,y:number){
 return groundClear(x,y)&&(!started||distance({x,y},point(player))>1.08)
  &&!neighbors.some(n=>n.root!==root&&distance({x,y},point(n.root))<.94)
  &&!crowd.some(c=>c!==root&&c.visible&&distance({x,y},point(c))<.94)
  &&!cars.some(c=>circleIntersectsRect(x,y,.48,actorRect(c,.9,1.6)))
  &&!bikes.some(c=>circleIntersectsRect(x,y,.48,actorRect(c,.48,1.4)));
}
/** Each step is collision checked, including detours. Routes expire when blocked. */
function advance(root:THREE.Group,goal:Point,speed:number,dt:number,clear:(x:number,y:number)=>boolean,wait=1.6){
 let travel=travels.get(root);if(!travel){travel={path:[],blockedFor:0,retryAt:0};travels.set(root,travel);}
 const old=point(root);
 while(travel.path.length&&distance(old,travel.path[0])<.09)travel.path.shift();
 const aim=travel.path[0]??goal,d=distance(old,aim),step=Math.min(speed*dt,d);
 const next=d>.001?{x:old.x+(aim.x-old.x)/d*step,y:old.y+(aim.y-old.y)/d*step}:old;
 const clearStep=segmentClear(old,next,clear);
 if(clearStep&&d>.001){
   root.position.x=next.x;root.position.z=-next.y;
   root.rotation.y=dampAngle(root.rotation.y,facingYaw(next.x-old.x,old.y-next.y),12,dt);
   travel.blockedFor=0;return true;
 }
 if(d<.09)return false;
 travel.blockedFor+=dt;
 if(travel.blockedFor>=wait&&elapsed>=travel.retryAt){
   travel.path=routeAround(old,goal,clear);travel.retryAt=elapsed+1.1;
 }
 return false;
}
function recycle(root:THREE.Group,direction:number,lane:number){
 const p=point(root);if(p.y>-actorMargin&&p.y<limit+actorMargin)return;
 const y=direction>0?-actorMargin:limit+actorMargin,next={x:roadX(y)+lane,y};
 if(onScreen(p)||onScreen(next))return;
 root.position.x=next.x;root.position.z=-next.y;travels.delete(root);
 root.userData.announced=false;
}
function seatFor(index:number):Point|undefined{
 const candidates:Point[]=[];
 for(let row=0;row<10;row++)for(let col=0;col<7;col++){
   const p={x:cip.x-6-row*1.9,y:cip.y+(col-3)*1.95};
   if(groundClear(p.x,p.y)&&distance(p,point(player))>1.5)candidates.push(p);
 }
 return candidates[index];
}
function updateCrowd(dt:number){
 const gathering=(state.mode==='meditating'&&state.safe)||state.mode==='invitation';
 if(gathering){
   for(let i=0;i<joined;i++){
     const root=crowd[i];if(crowdTrips.has(root))continue;
     const goal=seatFor(i);if(!goal)continue;
     const side=i%2?1:-1,entry=entryPoint(side);
     if(onScreen(entry,1.5))continue;
     // Do not spawn a second person on top of someone already entering.
     if(!pedestriansClear(root,entry.x,entry.y))continue;
     root.position.set(entry.x,.26,-entry.y);root.visible=true;root.userData.entrySide=side;pose(root,false);
     crowdTrips.set(root,{goal,leaving:false,seated:false});
   }
 }
 for(const [root,trip] of crowdTrips){
   if(trip.seated)continue;
   const p=point(root);
   if(trip.leaving&&!onScreen(p,1.5)&&distance(p,point(player))>20){root.visible=false;crowdTrips.delete(root);travels.delete(root);continue;}
   if(distance(p,trip.goal)<.12&&!trip.leaving){trip.seated=true;pose(root,true);root.rotation.y=-Math.PI/2;continue;}
   const clear=(x:number,y:number)=>pedestriansClear(root,x,y);
   // Follow the sidewalk from outside the frame before turning into the group.
   const far=Math.abs(p.y-trip.goal.y)>10;
   const goal=far?{x:roadX(p.y+Math.sign(trip.goal.y-p.y)*7)+12.7,y:p.y+Math.sign(trip.goal.y-p.y)*7}:trip.goal;
   const moving=advance(root,goal,2.6,dt,clear,.4);
   root.position.y=.26+(moving?Math.abs(Math.sin(elapsed*8))*.06:0);
 }
}
function update(dt:number){
 const paused=settingsOpen||document.hidden;if(!paused)elapsed+=dt;
 if(started&&!paused){
   let dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
   let dy=Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown'));
   const moving=(dx!==0||dy!==0)&&state.mode!=='invitation';
   if(moving){
     autoPath=[];yieldingTo=null;
     if(state.mode!=='walking'){send({type:'move'});inspected=null;}
     const length=Math.hypot(dx,dy);dx/=length;dy/=length;
     const command=`${dx},${dy}`;
     if(command!==moveCommand||moveCameraGoal===null){
       const forwardX=roadX(-player.position.z+dy)-roadX(-player.position.z)+dx;
       moveCameraGoal=shoulderYaw(facingYaw(forwardX,-dy));moveCommand=command;
     }
     const before=player.position.clone();const next=moveAlongStreet(point(player),dx,dy,9*dt,roadX,unoccupied);
     player.position.x=next.x;player.position.z=-next.y;
     const moved=player.position.distanceTo(before)>.001;
     if(moved){player.rotation.y=facingYaw(player.position.x-before.x,player.position.z-before.z);player.position.y=.26+Math.abs(Math.sin(elapsed*14))*.08;if(elapsed-lastStep>.31){audio.step();lastStep=elapsed;}
       if(elapsed-lastOrbit>.45){
         const error=Math.atan2(Math.sin(moveCameraGoal-angle),Math.cos(moveCameraGoal-angle));
         angle=Math.abs(error)<.003?moveCameraGoal:dampAngle(angle,moveCameraGoal,1.1,dt);
       }
     }
   }else{
     player.position.y=.26;moveCameraGoal=null;moveCommand='';
     if(autoPath.length){
       const p=point(player),goal=autoPath[0],d=distance(p,goal),step=Math.min(3.2*dt,d);
       const next=moveBody(p,{x:(goal.x-p.x)/Math.max(d,.001)*step,y:(goal.y-p.y)/Math.max(d,.001)*step},unoccupied);
       player.position.x=next.x;player.position.z=-next.y;
       if(distance(p,next)>.001){player.rotation.y=facingYaw(next.x-p.x,p.y-next.y);if(elapsed-lastStep>.31){audio.step();lastStep=elapsed;}}
       if(distance(next,goal)<.1)autoPath.shift();
       if(yieldingTo)yieldingTo.userData.stopUntil=Math.max(yieldingTo.userData.stopUntil??0,elapsed+.25);
     }else if(inspected)player.rotation.y=inspected.side*Math.PI/2;
   }
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
 $('context').hidden=!started||!near||sitting;
 if(near){$('context-name').textContent=near.name;$('context-action').textContent=near.id==='cip'?(safe?'Space · Meditate here':'Walk onto CIP’s sidewalk · Space to meditate'):inspected?'WASD or Escape · Keep walking':'Enter · Take a closer look';}
 $('meditation-caption').hidden=!sitting||state.mode==='invitation';
 $('meditation-caption').textContent=state.safe?'Nothing to do. Just be here.':'A little pause in the middle of everything.';
 $('sample-jump').hidden=state.mode==='invitation';
 glow.intensity=sitting&&state.safe?3+Math.min(state.elapsed/12,3):0;glow.position.copy(player.position).add(new THREE.Vector3(0,1.8,0));
 circle.visible=sitting&&state.safe;circle.position.set(player.position.x,.29,player.position.z);circle.scale.setScalar(1.2+Math.sin(elapsed*1.4)*.06);
 if(!paused&&started){
  const sittingOutside=started&&state.mode==='meditating'&&!state.safe;
  const sidewalkSit=sittingOutside&&Math.abs(player.position.x-roadX(py))>layout.roadHalfWidth;
  const seeker=sidewalkSit?neighbors.filter(n=>Math.sign(player.position.x-roadX(py))===n.side).sort((a,b)=>a.root.position.distanceTo(player.position)-b.root.position.distanceTo(player.position))[0]:undefined;
  for(const n of neighbors){
   const root=n.root,dist=Math.hypot(root.position.x-player.position.x,-root.position.z-py);
   if(dist>5)root.userData.announced=false;
   if(started&&dist<2.1&&sidewalkSit&&!root.userData.announced){if(reply(root,'pedestrians'))root.userData.announced=true;}
   if(elapsed<(root.userData.stopUntil??0)){root.rotation.y=facingYaw(player.position.x-root.position.x,player.position.z-root.position.z);continue;}
   const old={x:root.position.x,y:-root.position.z};
   const targetY=old.y+Math.sign(n.speed)*7;
   let goal={x:roadX(targetY)+n.side*layout.walkingCenter,y:targetY};
   if(n===seeker&&dist>2){const ratio=(dist-1.9)/dist;goal={x:old.x+(player.position.x-old.x)*ratio,y:old.y+(py-old.y)*ratio};}
   const clear=(x:number,y:number)=>pedestriansClear(root,x,y)&&Math.sign(x-roadX(y))===n.side&&Math.abs(x-roadX(y))>10;
   if(!clear(goal.x,goal.y)&&n!==seeker){for(const offset of [13.6,12,14.1]){const alt={x:roadX(targetY)+n.side*offset,y:targetY};if(clear(alt.x,alt.y)){goal=alt;break;}}}
   const moved=advance(root,goal,n===seeker?2.1:Math.abs(n.speed),dt,clear);
   root.position.y=.26+(moved?Math.abs(Math.sin(elapsed*7+n.index))*.06:0);
   recycle(root,Math.sign(n.speed),n.side*layout.walkingCenter);
  }
  for(const [actors,kind,lane] of [[cars,'cars',layout.carCenter],[bikes,'cyclists',layout.bikeCenter]] as const){
   for(const root of actors){
    const u=root.userData,side=u.side as number,y=-root.position.z;
    const playerPoint={x:player.position.x,y:-player.position.z};
    const dist=Math.hypot(root.position.x-playerPoint.x,y-playerPoint.y);
    const meditationInLane=sittingOutside&&(kind==='cars'?Math.abs(playerPoint.x-roadX(playerPoint.y))<6.7:Math.abs(playerPoint.x-roadX(playerPoint.y))>=6.7&&Math.abs(playerPoint.x-roadX(playerPoint.y))<10);
    const blocked=started&&aheadBlocked({x:root.position.x,y},playerPoint,side,meditationInLane?6.5:kind==='cars'?1.5:1.05,kind==='cars'?3.7:3.1);
    if(blocked&&!u.announced&&started){if(reply(root,kind))u.announced=true;}
    if(dist>7)u.announced=false;
    if(elapsed<(u.stopUntil??0)){u.stopped=true;continue;}
    const width=kind==='cars'?.95:.5,length=kind==='cars'?1.65:1.4;
    const clear=(x:number,ny:number)=>{
      const fromCenter=(x-roadX(ny))*side;
      if(fromCenter<(kind==='cars'?1.15:6.35)||fromCenter>(kind==='cars'?6:9.45))return false;
      const box={xMin:x-width,xMax:x+width,yMin:ny-length,yMax:ny+length};
      if(started&&circleIntersectsRect(playerPoint.x,playerPoint.y,.6,box))return false;
      if([...neighbors.map(n=>n.root),...crowd.filter(c=>c.visible)].some(c=>circleIntersectsRect(c.position.x,-c.position.z,.52,box)))return false;
      return ![...cars,...bikes].some(c=>c!==root&&Math.abs(c.position.x-x)<width+(cars.includes(c)?.95:.5)+.25&&Math.abs(-c.position.z-ny)<length+(cars.includes(c)?1.65:1.4)+.65);
    };
    const nextY=y+side*10,goal={x:roadX(nextY)+side*lane,y:nextY};
    u.stopped=!advance(root,goal,u.speed,dt,clear,2);
    recycle(root,side,side*lane);
   }
  }
  if(started)updateCrowd(dt);
 }
 target.copy(player.position);target.y=1.2;
 let view=zoom;
 const focus=inspected??(safe&&sitting?cip:null);
 if(focus){
   const height=focus.id==='cip'?8:focus.id==='tea'?7.1:5.6+shops.indexOf(focus)%3*.8;
   // Include the back of the roof as well as the facade and the player's feet.
   target.set(focus.x-focus.side*5.2,height*.5+1.5,-focus.y);
   view=facadeView(focus.width,height,innerWidth/innerHeight)+(state.mode==='invitation'?6:0);
   angle=dampAngle(angle,-focus.side*Math.PI/2,4,dt);
   if(safe&&sitting)player.rotation.y=dampAngle(player.rotation.y,-cip.side*Math.PI/2,5,dt);
 }
 else if(safe){view=20;}
 if(!started){target.set(cip.x-3,2,-cip.y);view=23;}
 cameraTarget.lerp(target,1-Math.exp(-dt*5));
 const desiredOffset=new THREE.Vector3(Math.sin(angle)*(focus?18:38),focus?7:walkingCameraHeight,Math.cos(angle)*(focus?18:38));
 offset.lerp(desiredOffset,1-Math.exp(-dt*5));camera.position.copy(cameraTarget).add(offset);camera.lookAt(cameraTarget);
 currentView+=(view-currentView)*(1-Math.exp(-dt*4));
 const aspect=innerWidth/innerHeight;camera.left=-currentView*aspect/2;camera.right=currentView*aspect/2;camera.top=currentView/2;camera.bottom=-currentView/2;camera.updateProjectionMatrix();
 camera.updateMatrixWorld();
 // Project an actual walking waypoint, not a compass bearing minus camera yaw.
 // This includes Clark's skew, camera elevation and viewport aspect ratio.
 const direction=py<cip.y?1:-1,nextY=Math.abs(py-cip.y)>6?py+direction*6:cip.y;
 const destination={x:Math.abs(py-cip.y)>6?roadX(nextY)+(player.position.x-roadX(py)>0?1:-1)*layout.walkingCenter:cip.x-6,y:nextY};
 const from=player.position.clone().project(camera),to=new THREE.Vector3(destination.x,player.position.y,-destination.y).project(camera);
 const compassAngle=Math.atan2((to.x-from.x)*innerWidth,(to.y-from.y)*innerHeight)*180/Math.PI;
 $('direction-arrow').style.transform=`rotate(${compassAngle}deg)`;
 for(const [id,dx,dz] of [['north',0,-1],['east',1,0],['south',0,1],['west',-1,0]] as const){
   const p=player.position.clone().add(new THREE.Vector3(dx,0,dz)).project(camera);
   const a=Math.atan2((p.y-from.y)*innerHeight,(p.x-from.x)*innerWidth);
   $(`compass-${id}`).style.transform=`translate(${Math.cos(a)*26}px,${-Math.sin(a)*26}px)`;
 }
 sun.position.copy(cameraTarget).add(new THREE.Vector3(-22,38,18));sun.target.position.copy(cameraTarget);
 $('bubble').hidden=elapsed>bubbleUntil||!started;placeLabel($('bubble'),player.position,sitting?2:3);
 for(let i=replies.length-1;i>=0;i--){const r=replies[i];if(elapsed>=r.until){r.el.remove();replies.splice(i,1);}else placeLabel(r.el,r.owner.position,r.category==='cars'?2.3:3);}
 for(let i=0;i<crowdLabels.length;i++){
   const seated=crowd.filter(c=>crowdTrips.get(c)?.seated);
   const el=crowdLabels[i],visible=seated.length>5&&Math.floor(elapsed+i*2)%11<5;
   el.hidden=!visible;
   if(visible){const idx=(Math.floor(elapsed/11)*3+i*7)%seated.length;placeLabel(el,seated[idx].position,2.2);const phase=String(Math.floor(elapsed/11));if(el.dataset.phase!==phase){el.dataset.phase=phase;el.textContent=phrase('crowd');}}
 }
}
let invitationStart=Infinity;
function frame(time:number){
 requestAnimationFrame(frame);const dt=Math.min(.05,(time-lastTime)/1000);lastTime=time;
 if(!ready)return;
 if(state.mode==='invitation'&&invitationStart===Infinity)invitationStart=elapsed;
 if(state.mode!=='invitation')invitationStart=Infinity;
 update(document.hidden?0:dt);renderer.render(scene,camera);
 if(import.meta.env.DEV&&Math.floor(elapsed*4)!==Number(canvas.dataset.sampleAt)){
   canvas.dataset.sampleAt=String(Math.floor(elapsed*4));
   canvas.dataset.snapshot=JSON.stringify(snapshot());
 }
}
requestAnimationFrame(frame);
// Read-only inspection for reproducible acceptance evidence. No time or position mutation.
function snapshot(){return {mode:state.mode,elapsed:state.elapsed,safe:inCipFront(player?.position.x??0,-(player?.position.z??0)),position:player?.position.toArray(),yaw:player?.rotation.y,angle,joined,started,ready,near:near?.id,inspected:inspected?.id,autoPath,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,camera:{position:camera.position.toArray(),target:cameraTarget.toArray(),view:currentView},crowd:crowd.filter(c=>c.visible).map(c=>({position:c.position.toArray(),seated:crowdTrips.get(c)?.seated,leaving:crowdTrips.get(c)?.leaving})),pedestrians:neighbors.map(n=>({position:n.root.position.toArray(),travel:travels.get(n.root)})),cars:cars.map(c=>({position:c.position.toArray(),stopped:c.userData.stopped,travel:travels.get(c)})),bikes:bikes.map(c=>({position:c.position.toArray(),stopped:c.userData.stopped,travel:travels.get(c)})),replies:replies.map(r=>({category:r.category,text:r.el.textContent})),preferences:{music:preferences.music,ambience:preferences.ambience,guidance:preferences.guidance}};}
Object.defineProperty(window,'cipSnapshot',{value:snapshot});
