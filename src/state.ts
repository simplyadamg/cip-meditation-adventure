export type Mode = 'walking' | 'examining' | 'meditating' | 'invitation';
export interface GameState { mode: Mode; elapsed: number; safe: boolean; interrupted: boolean; }
export const initialState = (): GameState => ({ mode:'walking',elapsed:0,safe:false,interrupted:false });
export const trafficPausedForMeditation=(state:GameState)=>state.safe&&(state.mode==='meditating'||state.mode==='invitation');
export function meditationThoughtStep(state:GameState):number{
  return trafficPausedForMeditation(state)&&state.elapsed>=10?Math.floor((state.elapsed-10)/7.5):-1;
}
export type Action = {type:'sit';safe:boolean}|{type:'move'}|{type:'examine'}|{type:'tick';dt:number;paused?:boolean}|{type:'interrupt'}|{type:'restart'};
export function transition(state:GameState, action:Action):GameState {
  if(action.type==='restart') return initialState();
  if(state.mode==='invitation') return state;
  if(action.type==='move') return initialState();
  if(action.type==='sit') return state.mode==='meditating'?initialState():{mode:'meditating',elapsed:0,safe:action.safe,interrupted:false};
  if(action.type==='examine') return state.mode==='meditating'?state:{...state,mode:'examining'};
  if(action.type==='interrupt' && state.mode==='meditating' && !state.safe) return {...initialState(),interrupted:true};
  if(action.type==='tick' && state.mode==='meditating' && !action.paused && Number.isFinite(action.dt) && action.dt>0) {
    const elapsed=state.elapsed+action.dt;
    return {...state,elapsed,mode:state.safe && elapsed>=60?'invitation':'meditating'};
  }
  return state;
}
