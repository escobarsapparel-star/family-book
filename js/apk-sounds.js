(()=>{
  if(window.__fbApkSoundsReady)return;
  let ctx=null,master=null,lastTap=0;
  const Ctx=()=>window.AudioContext||window.webkitAudioContext;

  function enabled(){
    try{return window.FB_SETTINGS?.get?.()?.notifications?.appSounds!==false}catch(_){return true}
  }
  function notificationEnabled(){
    try{return window.FB_SETTINGS?.get?.()?.notifications?.notificationSound!==false}catch(_){return true}
  }
  function audio(){
    if(ctx)return ctx;
    const A=Ctx();if(!A)return null;
    try{ctx=new A()}catch(_){ctx=null}
    return ctx;
  }
  async function unlock(){
    const c=audio();if(!c)return false;
    try{if(c.state==='suspended')await c.resume()}catch(_){}
    return c.state==='running';
  }
  function out(){
    const c=audio();if(!c)return null;
    if(master)return master;
    const gain=c.createGain();
    const comp=c.createDynamicsCompressor();
    gain.gain.setValueAtTime(2.1,c.currentTime);
    comp.threshold.setValueAtTime(-18,c.currentTime);
    comp.knee.setValueAtTime(12,c.currentTime);
    comp.ratio.setValueAtTime(5,c.currentTime);
    comp.attack.setValueAtTime(.003,c.currentTime);
    comp.release.setValueAtTime(.16,c.currentTime);
    gain.connect(comp);comp.connect(c.destination);master=gain;
    return master;
  }
  function tone(freq=440,duration=.06,volume=.03,delay=0,type='sine'){
    const c=audio(),bus=out();if(!c||!bus||c.state!=='running')return;
    const start=c.currentTime+delay,osc=c.createOscillator(),gain=c.createGain();
    osc.type=type;osc.frequency.setValueAtTime(freq,start);
    gain.gain.setValueAtTime(.0001,start);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0001,volume),start+.008);
    gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    osc.connect(gain);gain.connect(bus);osc.start(start);osc.stop(start+duration+.02);
  }
  function tap(){
    if(!enabled())return;
    const now=performance.now();if(now-lastTap<45)return;lastTap=now;
    tone(560,.05,.05,0,'triangle');
  }
  function success(){
    if(!enabled())return;
    tone(523.25,.09,.07,0,'triangle');tone(659.25,.11,.065,.075,'triangle');tone(783.99,.14,.055,.155,'sine');
  }
  function notification(){
    if(!notificationEnabled())return;
    tone(659.25,.13,.09,0,'triangle');tone(880,.18,.085,.115,'sine');
  }
  function swish(direction=1){
    if(!enabled())return;
    const c=audio(),bus=out();if(!c||!bus||c.state!=='running')return;
    const duration=.14,frames=Math.max(1,Math.floor(c.sampleRate*duration));
    const buffer=c.createBuffer(1,frames,c.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<frames;i++){const t=i/frames;const env=Math.max(0,1-Math.abs(t-.42)*1.55);data[i]=(Math.random()*2-1)*env}
    const src=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain(),start=c.currentTime;
    src.buffer=buffer;filter.type='bandpass';filter.Q.setValueAtTime(.55,start);
    filter.frequency.setValueAtTime(direction>=0?650:1750,start);
    filter.frequency.exponentialRampToValueAtTime(direction>=0?1900:620,start+duration);
    gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.16,start+.022);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    src.connect(filter);filter.connect(gain);gain.connect(bus);src.start(start);src.stop(start+duration+.015);
  }

  document.addEventListener('pointerdown',unlock,{capture:true,passive:true});
  document.addEventListener('click',ev=>{
    const el=ev.target?.closest?.("button,[role='button'],.settings-switch,.theme-choice");
    if(!el||el.disabled||el.getAttribute?.('aria-disabled')==='true')return;tap();
  },true);

  window.FB_SOUNDS={unlock,tap,success,notification,swish,appEnabled:enabled,notifyEnabled:notificationEnabled};
  window.__fbApkSoundsReady=true;
})();