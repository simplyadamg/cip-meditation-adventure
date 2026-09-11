import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState,transition,trafficPausedForMeditation} from '../src/state.ts';
import {circleIntersectsRect,facingYaw,movementVector} from '../src/movement.ts';
test('CIP invitation requires a full 60 active seconds',()=>{
 let s=transition(initialState(),{type:'sit',safe:true});
 s=transition(s,{type:'tick',dt:59.99});assert.equal(s.mode,'meditating');
 s=transition(s,{type:'tick',dt:30,paused:true});assert.equal(s.elapsed,59.99);
 s=transition(s,{type:'tick',dt:.02});assert.equal(s.mode,'invitation');
});
test('leaving resets rather than preserving partial progress',()=>{
 let s=transition(initialState(),{type:'sit',safe:true});s=transition(s,{type:'tick',dt:40});
 s=transition(s,{type:'move'});s=transition(s,{type:'sit',safe:true});assert.equal(s.elapsed,0);
});
test('off-site meditation never produces invitation and can be interrupted',()=>{
 let s=transition(initialState(),{type:'sit',safe:false});s=transition(s,{type:'tick',dt:90});assert.equal(s.mode,'meditating');
 s=transition(s,{type:'interrupt'});assert.equal(s.mode,'walking');assert.equal(s.interrupted,true);
});
test('CIP ignores interruption, then invitation locks movement, space and examination',()=>{
 let s=transition(initialState(),{type:'sit',safe:true});s=transition(s,{type:'interrupt'});assert.equal(s.mode,'meditating');
 s=transition(s,{type:'tick',dt:60});
 for(const action of [{type:'move'},{type:'sit',safe:true},{type:'examine'},{type:'interrupt'}] as const) assert.equal(transition(s,action).mode,'invitation');
 assert.deepEqual(transition(s,{type:'restart'}),initialState());
});
test('invalid time does not corrupt the meditation timer',()=>{
 const s=transition(initialState(),{type:'sit',safe:true});
 for(const dt of [NaN,-1,Infinity])assert.deepEqual(transition(s,{type:'tick',dt}),s);
});
test('CIP pauses traffic and resumes it when leaving',()=>{
 let s=transition(initialState(),{type:'sit',safe:true});
 assert.equal(trafficPausedForMeditation(s),true);
 const left=transition(s,{type:'move'});assert.equal(trafficPausedForMeditation(left),false);
 assert.equal(trafficPausedForMeditation(transition(s,{type:'tick',dt:60})),true);
 assert.equal(trafficPausedForMeditation(transition(initialState(),{type:'sit',safe:false})),false);
});
test('movement faces the direction of travel',()=>{
 const v=movementVector(-Math.PI/4,0,1);assert.ok(v.x>0&&v.z<0);assert.equal(facingYaw(v.x,v.z),3*Math.PI/4);
});
test('collision radius blocks building corners and allows clear sidewalk',()=>{
 const building={xMin:10,xMax:18,yMin:4,yMax:14};
 assert.equal(circleIntersectsRect(9.6,9,.48,building),true);
 assert.equal(circleIntersectsRect(8.9,9,.48,building),false);
});
