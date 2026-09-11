import type {Point} from './movement.ts';

export const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
export function segmentClear(a:Point,b:Point,clear:(x:number,y:number)=>boolean){
 const steps=Math.max(1,Math.ceil(distance(a,b)/.18));
 for(let i=1;i<=steps;i++)if(!clear(a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps))return false;
 return true;
}
/** Bounded local A*: no teleporting, corner cutting, or unbounded searches. */
export function routeAround(start:Point,goal:Point,clear:(x:number,y:number)=>boolean,step=.65,maxNodes=900):Point[]{
 if(!clear(goal.x,goal.y))return [];
 if(segmentClear(start,goal,clear))return [goal];
 type Node={x:number;y:number;g:number;f:number;parent?:Node};
 const first:Node={...start,g:0,f:distance(start,goal)};
 const open=[first],costs=new Map<string,number>([['0,0',0]]);
 const key=(x:number,y:number)=>`${Math.round((x-start.x)/step)},${Math.round((y-start.y)/step)}`;
 for(let count=0;open.length&&count<maxNodes;count++){
   open.sort((a,b)=>a.f-b.f);const n=open.shift()!;
   if(distance(n,goal)<step*1.5&&segmentClear(n,goal,clear)){
     const path:Point[]=[goal];let p:Node|undefined=n;
     while(p?.parent){path.unshift({x:p.x,y:p.y});p=p.parent;}
     return path;
   }
   for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]){
     const x=n.x+dx*step,y=n.y+dy*step,g=n.g+Math.hypot(dx,dy)*step;
     if(distance({x,y},start)>distance(start,goal)+7||g>=(costs.get(key(x,y))??Infinity))continue;
     if(!segmentClear(n,{x,y},clear))continue;
     costs.set(key(x,y),g);open.push({x,y,g,f:g+distance({x,y},goal),parent:n});
   }
 }
 return [];
}

export function dampAngle(current:number,target:number,rate:number,dt:number){
 return current+Math.atan2(Math.sin(target-current),Math.cos(target-current))*(1-Math.exp(-rate*dt));
}
/** Walking bearing stays stable while the follow camera recenters. */
export function shoulderYaw(travelYaw:number){return travelYaw+Math.PI-.32;}
export function facadeView(width:number,height:number,aspect:number){
 return Math.max(height+6,(width+4)/aspect);
}
