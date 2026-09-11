export interface CameraPreferences {height:number;distance:number;shoulder:number;view:number;}
export const defaultCamera:CameraPreferences={height:22,distance:38,shoulder:-12,view:28};
export const cameraLimits={height:[4,100],distance:[8,140],shoulder:[-60,60],view:[10,100]} as const;
export function cameraPreferences(value:unknown):CameraPreferences{
 const result={...defaultCamera};
 if(value&&typeof value==='object')for(const key of Object.keys(defaultCamera) as (keyof CameraPreferences)[]){
   const v=(value as Record<string,unknown>)[key],[min,max]=cameraLimits[key];
   if(typeof v==='number'&&Number.isFinite(v))result[key]=Math.max(min,Math.min(max,v));
 }
 return result;
}
/** Local +Z is the character's front. Right turns clockwise when viewed above. */
export function steer(yaw:number,turn:number,forward:number,dt:number){
 const nextYaw=yaw-turn*2.2*dt;
 const speed=forward<0?4.5:8;
 const heading=(yaw+nextYaw)/2;
 return {yaw:nextYaw,x:Math.sin(heading)*forward*speed*dt,z:Math.cos(heading)*forward*speed*dt};
}
export function followOffset(orbitYaw:number,prefs:CameraPreferences){
 return {x:Math.sin(orbitYaw)*prefs.distance+Math.cos(orbitYaw)*prefs.shoulder,
   y:prefs.height,z:Math.cos(orbitYaw)*prefs.distance-Math.sin(orbitYaw)*prefs.shoulder};
}
