import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {routeAround,segmentClear,distance,dampAngle,shoulderYaw,facadeView} from '../src/navigation.ts';
import {circleIntersectsRect,moveAlongStreet,type Rect,type Point} from '../src/movement.ts';
import {centerlineX} from '../src/centerline.ts';
const geography=JSON.parse(readFileSync(new URL('../src/geography.json',import.meta.url),'utf8'));
const origin=geography.results.find((p:any)=>p.query.includes('Foster')).location;
const knots=geography.results.filter((p:any)=>p.query.includes(' and ')).map((p:any)=>({x:(p.location.lng-origin.lng)*22000,y:(p.location.lat-origin.lat)*32000})).sort((a:Point,b:Point)=>a.y-b.y);
const road=(y:number)=>centerlineX(y,knots);
const cipY=(geography.results.find((p:any)=>p.query==='5537 N Clark St').location.lat-origin.lat)*32000;
const colliders=JSON.parse(readFileSync(new URL('../public/assets/colliders.json',import.meta.url),'utf8')) as Rect[];

test('detour passes a stationary player without clipping or leaving a vehicle lane',()=>{
 const clear=(x:number,y:number)=>x>1.15&&x<6&&!circleIntersectsRect(3.8,4,.6,{xMin:x-.95,xMax:x+.95,yMin:y-1.65,yMax:y+1.65});
 const start={x:3.8,y:0},goal={x:3.8,y:10};
 const path=routeAround(start,goal,clear);assert.ok(path.length>1);
 let p=start;for(const next of path){assert.ok(segmentClear(p,next,clear));p=next;}
 assert.ok(distance(p,goal)<.01);assert.ok(path.some(p=>Math.abs(p.x-3.8)>1.5));
});
test('pedestrians detour around a seated person in either travel direction',()=>{
 for(const direction of [-1,1]){
   const clear=(x:number,y:number)=>x>10.5&&x<15.5&&Math.hypot(x-12.7,y)>1.08;
   const start={x:12.7,y:-3*direction},goal={x:12.7,y:5*direction};
   const path=routeAround(start,goal,clear);assert.ok(path.length>1);
   let p=start;for(const next of path){assert.ok(segmentClear(p,next,clear));p=next;}
   assert.deepEqual(p,goal);
 }
});
test('sealed routes fail safely instead of teleporting or cutting corners',()=>{
 const clear=(x:number,y:number)=>Math.abs(x)<2&&Math.abs(y)>1;
 assert.deepEqual(routeAround({x:0,y:-3},{x:0,y:3},clear,.65,300),[]);
 assert.deepEqual(routeAround({x:0,y:0},{x:0,y:4},()=>false),[]);
});
test('frontage route respects real exported Blender obstacles',()=>{
 const obstacles=JSON.parse(readFileSync(new URL('../public/assets/colliders.json',import.meta.url),'utf8')) as Rect[];
 const clear=(x:number,y:number)=>!obstacles.some(r=>circleIntersectsRect(x,y,.48,r));
 const start:Point={x:-12.7,y:7},goal={x:-13.5465,y:3.9104};
 const path=routeAround(start,goal,clear);assert.ok(path.length);
 let p=start;for(const next of path){assert.ok(segmentClear(p,next,clear));p=next;}
});
test('swivel follows shortest wraparound and gently settles behind the left shoulder',()=>{
 const current=Math.PI-.05,target=-Math.PI+.05;
 const next=dampAngle(current,target,1,.1);assert.ok(next>current&&next-current<.02);
 let angle=0;const targetYaw=shoulderYaw(Math.PI);
 for(let i=0;i<300;i++)angle=dampAngle(angle,targetYaw,1.1,1/60);
 assert.ok(Math.abs(Math.atan2(Math.sin(angle-targetYaw),Math.cos(angle-targetYaw)))<.002);
});
test('Up alone follows the entire real Blender sidewalk from Foster to CIP without drift',()=>{
 const clear=(x:number,y:number)=>!colliders.some(r=>circleIntersectsRect(x,y,.48,r));
 let p={x:road(7)+12.7,y:7};
 for(let i=0;i<1500&&p.y<cipY;i++){
   const before=p;p=moveAlongStreet(p,0,1,.15,road,clear);
   assert.ok(p.y>before.y,`blocked sidewalk at ${p.y}`);
   assert.ok(Math.abs(p.x-road(p.y)-12.7)<1e-9);
 }
 assert.ok(p.y>=cipY);assert.ok(p.x>road(cipY)+10.4&&p.x<road(cipY)+15.55);
});
test('blocked forward movement cannot accumulate sideways drift on a curved street',()=>{
 const start={x:road(180)+12.7,y:180};let p=start;
 for(let i=0;i<600;i++)p=moveAlongStreet(p,0,1,.15,road,(_x,y)=>y<=180);
 assert.deepEqual(p,start);
});
test('the street stays anchored to surveyed intersections with a continuous tangent',()=>{
 for(const p of knots)assert.ok(Math.abs(road(p.y)-p.x)<1e-9);
 for(const p of knots.slice(1,-1)){
   const left=(road(p.y)-road(p.y-.001))/.001,right=(road(p.y+.001)-road(p.y))/.001;
   assert.ok(Math.abs(left-right)<.0001);
 }
});
test('facade framing fits building width and height on wide and narrow viewports',()=>{
 for(const aspect of [.48,1,1.6,2.3]){
   const view=facadeView(13,8,aspect);assert.ok(view>=14);assert.ok(view*aspect>=17);
 }
});
