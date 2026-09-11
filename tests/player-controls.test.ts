import {test} from 'node:test';
import assert from 'node:assert/strict';
import {steer,followOffset,cameraPreferences,defaultCamera} from '../src/player-controls.ts';
import {moveBody} from '../src/movement.ts';
test('turn right from north, release turn, then forward walks east',()=>{
 const turned=steer(Math.PI,1,0,Math.PI/2/2.2);
 assert.equal(Math.hypot(turned.x,turned.z),0);
 const step=steer(turned.yaw,0,1,1);
 assert.ok(step.x>7.99);assert.ok(Math.abs(step.z)<1e-10);
 assert.equal(step.yaw,turned.yaw);
});
test('left turn reverses right turn; forward works at arbitrary headings',()=>{
 for(const yaw of [0,.6,Math.PI,-2.4]){
   const right=steer(yaw,1,0,.4),left=steer(right.yaw,-1,0,.4);
   assert.ok(Math.abs(left.yaw-yaw)<1e-10);
   const step=steer(yaw,0,1,.5);
   assert.ok(Math.abs(step.x*Math.cos(yaw)-step.z*Math.sin(yaw))<1e-10);
   assert.ok(step.x*Math.sin(yaw)+step.z*Math.cos(yaw)>0);
 }
});
test('backing up keeps the same facing and camera behind the character',()=>{
 const yaw=.7,step=steer(yaw,0,-1,.5);assert.equal(step.yaw,yaw);
 assert.ok(step.x*Math.sin(yaw)+step.z*Math.cos(yaw)<0);
 const camera=followOffset(yaw+Math.PI,defaultCamera);
 assert.ok(camera.x*Math.sin(yaw)+camera.z*Math.cos(yaw)<0);
});
test('collision blocks translation without changing the steered heading',()=>{
 const command=steer(Math.PI/2,0,1,1);
 const p=moveBody({x:0,y:0},{x:command.x,y:-command.z},(x)=>x<1);
 assert.ok(p.x<1);assert.equal(command.yaw,Math.PI/2);
});
test('camera data migrates old preferences and clamps corrupt stored values',()=>{
 assert.deepEqual(cameraPreferences(undefined),defaultCamera);
 assert.deepEqual(cameraPreferences({height:NaN,distance:'bad',shoulder:Infinity}),defaultCamera);
 assert.deepEqual(cameraPreferences({height:200,distance:-1,shoulder:90,view:0}),{height:100,distance:8,shoulder:60,view:10});
 const wide={height:90,distance:140,shoulder:-60,view:100};assert.deepEqual(cameraPreferences(wide),wide);
 const custom={height:12,distance:25,shoulder:4,view:21};assert.deepEqual(cameraPreferences(JSON.parse(JSON.stringify(custom))),custom);
});
