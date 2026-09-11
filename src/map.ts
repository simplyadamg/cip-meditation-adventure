import geography from './geography.json';
import layout from './layout.json';
import {centerlineX} from './centerline';
export {layout};
const list=[
 ['middle-east','Middle East Bakery & Grocery',5200],['museum','Swedish American Museum',5211],['bookstore','Women & Children First',5233],['galleria','Andersonville Galleria',5247],['gym','Cheetah Gym',5248],['larson','Lost Larson',5318],['calo','Calo Ristorante',5343],['replay','Replay Andersonville',5358],['heaven','A Taste of Heaven',5401],['elephant','The Brown Elephant',5404],['colectivo','Colectivo Coffee',5425],['lobo','Pizza Lobo',5457],['tea','Eli Tea Bar',5507],['cip','Chicago Integrative Psychotherapy',5537],['studio','The Coffee Studio',5628]
] as const;
const origin=geography.results.find(x=>x.query.includes('Foster'))!.location;
export const streets=geography.results.filter(x=>x.query.includes(' and ')).map(x=>({name:x.query.split(' and W ')[1],y:(x.location.lat-origin.lat)*32000,x:(x.location.lng-origin.lng)*22000})).sort((a,b)=>a.y-b.y);
export function roadX(y:number){
 return centerlineX(y,streets);
}
export const shops=list.map(([id,name,address])=>{
 const p=geography.results.find(x=>x.query===`${address} N Clark St`)!.location;
 const y=(p.lat-origin.lat)*32000,side=address%2?1:-1;
 const nearCross=Math.min(...streets.map(s=>Math.abs(s.y-y)));
 const width=id==='cip'?13:id==='tea'?12:Math.max(3.5,Math.min(11,(nearCross-2.5)*2));
 return {id,name,address,y,side,x:roadX(y)+side*layout.buildingCenter,width,detailed:id==='cip'||id==='tea'};
});
export const cip=shops.find(s=>s.id==='cip')!;
export const limit=streets.at(-1)!.y;
export function inCipFront(x:number,y:number){return Math.abs(y-cip.y)<cip.width/2 && x>roadX(y)+layout.roadHalfWidth+.4 && x<cip.x-4.45;}
