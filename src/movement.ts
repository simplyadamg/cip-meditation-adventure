export interface Rect { xMin:number; xMax:number; yMin:number; yMax:number; }

export function movementVector(angle:number, dx:number, dy:number) {
  return { x:Math.cos(angle)*dx-Math.sin(angle)*dy, z:-Math.sin(angle)*dx-Math.cos(angle)*dy };
}

/** The authored character faces local +Z after Blender's glTF axis conversion. */
export function facingYaw(vx:number, vz:number) { return Math.atan2(vx,vz); }

export function circleIntersectsRect(x:number,y:number,radius:number,rect:Rect) {
  const closestX=Math.max(rect.xMin,Math.min(x,rect.xMax));
  const closestY=Math.max(rect.yMin,Math.min(y,rect.yMax));
  const dx=x-closestX,dy=y-closestY;
  return dx*dx+dy*dy<radius*radius;
}

export interface Point {x:number;y:number;}
/** Substeps prevent tunnelling; axis separation lets the body slide along edges. */
export function moveBody(position:Point,delta:Point,canOccupy:(x:number,y:number)=>boolean):Point {
 const steps=Math.max(1,Math.ceil(Math.hypot(delta.x,delta.y)/.12));
 let {x,y}=position;
 for(let i=0;i<steps;i++){
  if(canOccupy(x+delta.x/steps,y))x+=delta.x/steps;
  if(canOccupy(x,y+delta.y/steps))y+=delta.y/steps;
 }
 return {x,y};
}

/** A stopped encounter is re-armed only after separation, not by animation ticks. */
export function encounterStep(latched:boolean,blocked:boolean,separated:boolean){
 return {announce:blocked&&!latched,latched:blocked?true:separated?false:latched};
}

export function aheadBlocked(actor:Point,player:Point,direction:number,halfWidth:number,stopDistance:number){
 const forward=(player.y-actor.y)*direction;
 return Math.abs(player.x-actor.x)<halfWidth&&forward>-.8&&forward<stopDistance;
}
