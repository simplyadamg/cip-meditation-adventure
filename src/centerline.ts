export interface StreetKnot {x:number;y:number;}
/** Shape-preserving cubic interpolation: continuous tangent, no address overshoot. */
export function centerlineX(y:number,knots:StreetKnot[]):number{
 const i=knots.findIndex(p=>p.y>=y);
 if(i<=0)return knots[i<0?knots.length-1:0].x;
 const slope=(j:number)=>(knots[j+1].x-knots[j].x)/(knots[j+1].y-knots[j].y);
 const tangent=(j:number)=>{
   if(j===0)return slope(0);if(j===knots.length-1)return slope(j-1);
   const a=slope(j-1),b=slope(j);if(a*b<=0)return 0;
   const ha=knots[j].y-knots[j-1].y,hb=knots[j+1].y-knots[j].y;
   const wa=2*hb+ha,wb=hb+2*ha;return (wa+wb)/(wa/a+wb/b);
 };
 const a=knots[i-1],b=knots[i],h=b.y-a.y,t=(y-a.y)/h;
 return (2*t**3-3*t*t+1)*a.x+(t**3-2*t*t+t)*h*tangent(i-1)+(-2*t**3+3*t*t)*b.x+(t**3-t*t)*h*tangent(i);
}
