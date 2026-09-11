export class NeighborhoodAudio {
 ctx:AudioContext|null=null;music:GainNode|null=null;ambience:GainNode|null=null;effects:GainNode|null=null;
 musicEnabled=true;ambienceEnabled=true;lastChord=-1;
 async start(){
   if(!this.ctx){
     this.ctx=new AudioContext();
     this.music=this.ctx.createGain();this.ambience=this.ctx.createGain();this.effects=this.ctx.createGain();
     this.music.connect(this.ctx.destination);this.ambience.connect(this.ctx.destination);this.effects.connect(this.ctx.destination);
     this.effects.gain.value=.16;
     const noise=this.ctx.createBuffer(1,this.ctx.sampleRate*3,this.ctx.sampleRate);
     const a=noise.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()-.5)*.15;
     const source=this.ctx.createBufferSource();source.buffer=noise;source.loop=true;
     const filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=350;
     source.connect(filter);filter.connect(this.ambience);source.start();
   }
   await this.ctx.resume();this.update(false);
 }
 update(calm:boolean){
   if(!this.ctx||!this.music||!this.ambience)return;
   this.music.gain.setTargetAtTime(this.musicEnabled?.055:0,this.ctx.currentTime,.25);
   this.ambience.gain.setTargetAtTime(this.ambienceEnabled?(calm?.06:.3):0,this.ctx.currentTime,.8);
   const chord=Math.floor(this.ctx.currentTime/5);
   if(chord!==this.lastChord){this.lastChord=chord;const bases=[196,174.61,164.81,174.61];for(const ratio of [1,1.5,2,2.5])this.tone(bases[chord%4]*ratio,3.8,this.music,'sine',.22);}
 }
 tone(hz:number,duration:number,bus:GainNode|null,type:OscillatorType='sine',volume=.15){
   if(!this.ctx||!bus)return;
   const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.value=hz;
   g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(volume,t+.025);g.gain.exponentialRampToValueAtTime(.001,t+duration);
   o.connect(g);g.connect(bus);o.start(t);o.stop(t+duration+.03);
 }
 step(){this.tone(85+Math.random()*25,.055,this.effects,'triangle',.3);}
 bell(){this.tone(1568,.7,this.effects,'sine',.4);this.tone(2093,.42,this.effects,'sine',.15);}
 honk(){this.tone(350,.25,this.effects,'triangle',.2);this.tone(440,.25,this.effects,'triangle',.13);}
 async pause(){await this.ctx?.suspend();}
 async resume(){await this.ctx?.resume();}
}
