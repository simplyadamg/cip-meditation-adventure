import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newThoughtSchedule,advanceThoughtSchedule,thoughtTimingPreferences,defaultThoughtTiming} from '../src/meditation-thoughts.ts';
import {defaultPhrases,loadPreferences} from '../src/content.ts';

test('default first thought waits ten active seconds; paused time cannot advance it',()=>{
 let s=newThoughtSchedule();
 let result=advanceThoughtSchedule(s,9.99);s=result.schedule;assert.equal(result.event,null);
 for(const dt of [0,-1,NaN,Infinity]){result=advanceThoughtSchedule(s,dt);assert.equal(result.event,null);assert.equal(result.schedule.time,9.99);}
 result=advanceThoughtSchedule(s,.01);assert.equal(result.event?.category,'meditation');assert.equal(result.event?.ordinal,0);
 assert.equal(result.schedule.until,14.5);assert.equal(result.schedule.nextAt,17.5);
 assert.equal(newThoughtSchedule().time,0);
});
test('custom first delay and quiet gap use one non-overlapping slot',()=>{
 let s=newThoughtSchedule({firstDelay:2,gap:8});
 let r=advanceThoughtSchedule(s,2);assert.equal(r.event?.ordinal,0);s=r.schedule;
 r=advanceThoughtSchedule(s,12.49);assert.equal(r.event,null);s=r.schedule;
 r=advanceThoughtSchedule(s,.02);assert.equal(r.event?.ordinal,1);
 s=newThoughtSchedule({firstDelay:0,gap:0});
 r=advanceThoughtSchedule(s,0);assert.equal(r.event?.ordinal,0);s=r.schedule;
 r=advanceThoughtSchedule(s,4.49);assert.equal(r.event,null);s=r.schedule;
 r=advanceThoughtSchedule(s,.02);assert.equal(r.event?.ordinal,1);
});
test('invitation replaces the current thought once, then ordinary thoughts resume',()=>{
 let s=advanceThoughtSchedule(newThoughtSchedule(),10).schedule;
 let r=advanceThoughtSchedule(s,1,true);assert.equal(r.event?.category,'invitation');s=r.schedule;
 assert.equal(s.until,19);assert.equal(s.nextAt,22);
 r=advanceThoughtSchedule(s,10.9,true);assert.equal(r.event,null);s=r.schedule;
 r=advanceThoughtSchedule(s,.2,true);assert.equal(r.event?.category,'meditation');assert.equal(r.event?.ordinal,1);
});
test('timing preferences clamp invalid values and schedules snapshot settings for each sit',()=>{
 assert.deepEqual(thoughtTimingPreferences(undefined),defaultThoughtTiming);
 assert.deepEqual(thoughtTimingPreferences({firstDelay:NaN,gap:'bad'}),defaultThoughtTiming);
 assert.deepEqual(thoughtTimingPreferences({firstDelay:-1,gap:900}),{firstDelay:0,gap:60});
 const prefs={firstDelay:20,gap:7},s=newThoughtSchedule(prefs);prefs.gap=2;
 assert.equal(s.timing.gap,7);assert.equal(newThoughtSchedule(prefs).timing.gap,2);
});
test('one Meditation pool preserves custom legacy Crowd phrases and saved settings',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 let stored:unknown={phrases:{meditation:['My meditation'],crowd:['My crowd','My meditation','We can just be here.']},thoughtTiming:{firstDelay:15,gap:9},camera:{distance:130,view:80}};
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>JSON.stringify(stored)}});
 try{
   const p=loadPreferences();assert.equal('crowd' in defaultPhrases,false);assert.equal('crowd' in p.phrases,false);
   assert.deepEqual(p.phrases.meditation,['My meditation','My crowd']);assert.deepEqual(p.thoughtTiming,{firstDelay:15,gap:9});
   assert.equal(p.camera.distance,130);stored=p;assert.deepEqual(loadPreferences(),p);
   stored={phrases:{crowd:['One custom thought']}};assert.ok(loadPreferences().phrases.meditation.includes('One custom thought'));
   stored=null;assert.deepEqual(loadPreferences().thoughtTiming,defaultThoughtTiming);
 }finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else Reflect.deleteProperty(globalThis,'localStorage');}
});
