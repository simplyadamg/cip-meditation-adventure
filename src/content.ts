export const presets=[
 {name:'Rowan',description:'Pink shirt · red hair',color:'#bc586d'},
 {name:'Sage',description:'Green cap · backpack',color:'#617548'},
 {name:'Remy',description:'Purple hair · cream shirt',color:'#a293b9'},
 {name:'Jules',description:'Dark hair · blue jacket',color:'#417387'}
];
export const defaultPhrases:Record<string,string[]>={
 'middle-east':['That baklava has layers. So do my thoughts.','I could grab a snack… and make some room for connection at CIP.'],
 museum:['A whole neighborhood of stories. I can pause long enough to listen.','Swedish heritage, Chicago sidewalks, one wandering mind.'],
 bookstore:['I could find a book on meditation. Or I could go practice.','One more book about being present. My unread pile is very present.'],
 galleria:['So many things to appreciate. No need to own them all.','Local art, local makers… maybe a little local stillness next.'],
 gym:['My attention could use a gentle workout too.','Today’s personal best: noticing I got distracted.'],
 larson:['These pastries look delicious. A little connection at CIP sounds good too.','My mind has already ordered three croissants.'],
 calo:['A table full of friends sounds lovely. So does a circle of meditators.','I can smell dinner. Apparently my attention can too.'],
 replay:['One more game? My brain has been playing side quests all afternoon.','No high score for being present. What a relief.'],
 heaven:['A little taste of heaven. Maybe a little space to breathe next.','I came for a walk. My thoughts came for cake.'],
 elephant:['Someone’s old favorite could be someone’s new favorite.','I can let a few thoughts go without donating them.'],
 colectivo:['Coffee wakes me up. I wonder what simply noticing feels like.','My thoughts already have plenty of caffeine.'],
 lobo:['Pizza and a patio. This neighborhood makes wandering easy.','I could sit with a slice… or sit with some new people at CIP.'],
 tea:['Let the tea steep. Let the thoughts settle.','A warm cup, a warm community. CIP is just up the street.'],
 cip:['Here it is. A little space to sit, just as I am.','The group meets upstairs. For now, I can pause right here.'],
 studio:['A coffee for the walk back. A moment of stillness first?','I wandered past CIP. Nothing wrong with turning around.'],
 interruption:['Ah. The sidewalk has other plans.','A bicycle bell: the neighborhood’s very enthusiastic meditation timer.','My inner peace was briefly double-parked.','Right. Shared sidewalk. I’ll find a little more space at CIP.'],
 cars:['Hey, maybe check out CIP for meditation!','A little room for traffic, please. There’s a quieter spot at CIP.'],
 pedestrians:["Hey, the sidewalk isn’t a great place to meditate.",'Come on over to CIP—there’s room to pause with some company.'],
 cyclists:['A little room for the bike lane? Try CIP for a peaceful pause.'],
 meditation:['Did I remember to…?','There’s a thought. And another.','I don’t have to finish every thought.','Nothing to achieve right now.','Oh, hello, grocery list.','A breath. Some space. Other people.'],
 crowd:['Is this what a group chat looks like offline?','We can just be here.','Still thinking about that croissant.','A little more room for everyone.','I thought I was the only one whose mind did that.','No perfect posture required.'],
 invitation:['Maybe I don’t have to practice alone.'],
 welcome:['A little wandering. A little wondering. Maybe some meditation at CIP.']
};
export interface Preferences { music:boolean; ambience:boolean; guidance:boolean; phrases:Record<string,string[]>; }
export const STORAGE_KEY='cip-adventure.preferences.v1';
export function loadPreferences():Preferences {
 const defaults={music:true,ambience:true,guidance:true,phrases:structuredClone(defaultPhrases)};
 try {
   const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
   if(!parsed || typeof parsed!=='object')return defaults;
   for(const k of ['music','ambience','guidance'] as const)if(typeof parsed[k]==='boolean')defaults[k]=parsed[k];
   for(const k of Object.keys(defaultPhrases))if(Array.isArray(parsed.phrases?.[k])){
     const lines=parsed.phrases[k].filter((x:unknown)=>typeof x==='string'&&x.trim()).map((x:string)=>x.slice(0,240));
     if(lines.length)defaults.phrases[k]=lines.slice(0,30);
   }
 }catch{/* Empty, blocked or malformed localStorage falls back safely. */}
 return defaults;
}
