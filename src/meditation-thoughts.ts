export interface ThoughtTiming {firstDelay:number;gap:number;}
export const defaultThoughtTiming:ThoughtTiming={firstDelay:10,gap:3};
export const thoughtTimingLimits={firstDelay:[0,60],gap:[0,60]} as const;
export const thoughtDuration=4.5;
export function thoughtTimingPreferences(value:unknown):ThoughtTiming{
 const result={...defaultThoughtTiming};
 if(value&&typeof value==='object')for(const key of Object.keys(result) as (keyof ThoughtTiming)[]){
   const n=(value as Record<string,unknown>)[key],[min,max]=thoughtTimingLimits[key];
   if(typeof n==='number'&&Number.isFinite(n))result[key]=Math.max(min,Math.min(max,n));
 }
 return result;
}
export interface ThoughtSchedule {time:number;nextAt:number;until:number;count:number;invited:boolean;timing:ThoughtTiming;}
export function newThoughtSchedule(timing:ThoughtTiming=defaultThoughtTiming):ThoughtSchedule{
 return {time:0,nextAt:timing.firstDelay,until:0,count:0,invited:false,timing:{...timing}};
}
/** One presentation slot: the invitation replaces, never accompanies, a thought. */
export function advanceThoughtSchedule(schedule:ThoughtSchedule,dt:number,invitation=false){
 const next={...schedule,time:schedule.time+(Number.isFinite(dt)&&dt>0?dt:0)};
 let event:null|{category:'meditation'|'invitation';ordinal:number;duration:number}=null;
 if(invitation&&!next.invited){
   next.invited=true;event={category:'invitation',ordinal:0,duration:8};
 }else if(next.time>=next.nextAt){
   event={category:'meditation',ordinal:next.count++,duration:thoughtDuration};
 }
 if(event){next.until=next.time+event.duration;next.nextAt=next.until+next.timing.gap;}
 return {schedule:next,event};
}
