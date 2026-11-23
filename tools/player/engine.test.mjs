import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {transformSync} from 'esbuild';
function load(file){const code=transformSync(fs.readFileSync(file,'utf8'),{loader:'ts',format:'cjs',target:'es2022'}).code;const m={exports:{}};new Function('module','exports',code)(m,m.exports);return m.exports;}
const {SplitPlayer}=load('src/lib/split-player/engine.ts');const {collectionPlaybackQueue}=load('src/data/scene-playback-model.ts');
class Media extends EventTarget {
  attrs=new Map();paused=true;readyState=0;duration=60;muted=false;preload='';playbackRate=1;loads=0;time=0;ignoreSeeks=false;
  get src(){return this.attrs.get('src')??'';}set src(v){this.attrs.set('src',v);}
  get currentTime(){return this.time;}set currentTime(v){if(this.ignoreSeeks)return;this.time=v;this.dispatchEvent(new Event('seeking'));this.dispatchEvent(new Event('seeked'));}
  getAttribute(k){return this.attrs.get(k)??null;}removeAttribute(k){this.attrs.delete(k);}
  load(){this.loads++;this.readyState=0;this.time=0;}
  ready(){this.readyState=4;this.dispatchEvent(new Event('loadedmetadata'));}
  async play(){if(!this.paused)return;this.paused=false;this.dispatchEvent(new Event('play'));this.dispatchEvent(new Event('playing'));}
  pause(){if(this.paused)return;this.paused=true;this.dispatchEvent(new Event('pause'));}
  finish(){this.time=this.duration;this.ended=true;this.pause();this.dispatchEvent(new Event('ended'));}
}
class Visibility extends EventTarget {hidden=false;set(hidden){this.hidden=hidden;this.dispatchEvent(new Event('visibilitychange'));}}
const tracks=['a','b','c'].map(id=>({id,title:'Lesson '+id,videoUrl:id+'.mp4',audioUrl:id+'.mp3',lowUrl:id+'-low.mp4'}));
async function setup(t){const audio=new Media(),video=new Media(),visibility=new Visibility(),handlers={};let now=2000;const session={setActionHandler:(k,v)=>{handlers[k]=v;},setPositionState:v=>{session.position=v;},metadata:null};const p=new SplitPlayer(audio,{visibility,mediaSession:session,metadata:value=>value,now:()=>now});p.start();p.attachVideo(video);p.setPlaylist(tracks);const events=[];p.on(e=>events.push(e));await p.load('a');audio.ready();video.ready();t.after(()=>p.destroy());return{p,audio,video,visibility,handlers,session,events,advance:n=>{now+=n;p.tick();}};}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('native video play/pause, seeks and rate control the audio clock',async t=>{const{p,audio,video,events}=await setup(t);await video.play();assert.equal(audio.paused,false);assert.equal(video.muted,true);video.currentTime=12;assert.equal(audio.currentTime,12);video.playbackRate=1.2;video.dispatchEvent(new Event('ratechange'));assert.equal(audio.playbackRate,1.2);video.pause();assert.equal(audio.paused,true);assert.ok(events.some(e=>e.type==='play'));});
test('background aborts all video fetching while audio continues; lock-screen next updates audio and metadata only',async t=>{const{p,audio,video,visibility,handlers,session}=await setup(t);await p.play();p.seek(12);visibility.set(true);assert.equal(audio.paused,false);assert.equal(video.paused,true);assert.equal(video.getAttribute('src'),null);handlers.nexttrack();await flush();audio.ready();assert.equal(p.track.id,'b');assert.equal(session.metadata.title,'Lesson b');assert.equal(video.getAttribute('src'),null);p.seek(9);visibility.set(false);assert.equal(video.src,'b.mp4');video.ready();assert.equal(video.currentTime,9);assert.equal(video.muted,true);assert.equal(audio.paused,false);});
test('autoplay advances only supplied adjacent episodes; final episode stops',async t=>{const{p,audio,visibility}=await setup(t);visibility.set(true);await p.play();audio.finish();await flush();assert.equal(p.track.id,'b');audio.ready();audio.finish();await flush();assert.equal(p.track.id,'c');audio.ready();audio.finish();await flush();assert.equal(p.track.id,'c');assert.equal(p.paused,true);});
test('episode loop has priority over autoplay',async t=>{const{p,audio}=await setup(t);p.setLoop(true);await p.play();audio.finish();await flush();assert.equal(p.track.id,'a');assert.equal(audio.currentTime,0);assert.equal(audio.paused,false);});
test('sentence ranges use audio time; repeat and dictation never advance episodes',async t=>{const{p,audio,events}=await setup(t);p.playRange({start:2,end:4,id:'7'},'listening',false);await flush();audio.currentTime=4.02;p.tick();assert.equal(audio.paused,true);assert.equal(p.track.id,'a');assert.equal(audio.currentTime,4);assert.equal(events.filter(e=>e.type==='rangeend').length,1);p.playRange({start:2,end:4,id:'7'},'listening',true);await flush();audio.currentTime=4.02;p.tick();assert.equal(audio.currentTime,2);assert.equal(audio.paused,false);p.clearRange();p.setMode('dictation');audio.finish();await flush();assert.equal(p.track.id,'a');});
test('audio failure falls back to audible main video at the same time, then video failure uses low; next track resets split',async t=>{const{p,audio,video}=await setup(t);await p.play();p.seek(14);audio.dispatchEvent(new Event('error'));assert.equal(p.fallback,'main');video.ready();await flush();assert.equal(p.media,video);assert.equal(video.muted,false);assert.equal(video.currentTime,14);assert.equal(audio.paused,true);video.time=17;video.dispatchEvent(new Event('error'));assert.equal(p.fallback,'low');video.ready();assert.equal(video.src,'a-low.mp4');assert.equal(video.currentTime,17);await p.adjacent(1);audio.ready();video.ready();assert.equal(p.fallback,'split');assert.equal(video.muted,true);});
test('persistent video buffering switches directly to the low mux without restarting',async t=>{t.mock.timers.enable({apis:['setTimeout','setInterval']});const{p,video}=await setup(t);await p.play();p.seek(10);video.dispatchEvent(new Event('waiting'));t.mock.timers.tick(8001);assert.equal(p.fallback,'low');video.ready();assert.equal(video.currentTime,10);});
test('drift correction is suppressed just after user seek; persistent failures then fall back',async t=>{const{p,audio,video,advance}=await setup(t);await p.play();p.seek(10);video.ignoreSeeks=true;video.time=0;advance(400);assert.equal(p.fallback,'split');assert.equal(video.time,0);for(let i=0;i<4;i++)advance(1000);assert.equal(p.fallback,'main');assert.equal(audio.paused,true);});
test('stale async resolution cannot replace a newer track and rejected membership cannot advance',async t=>{const{p}=await setup(t);const pending={};p.setPlaylist(tracks,tr=>new Promise(resolve=>{pending[tr.id]=()=>resolve(tr);}));const b=p.load('b'),c=p.load('c');pending.c();await c;pending.b();await b;assert.equal(p.track.id,'c');p.setPlaylist(tracks,async()=>{throw Error('membership_required');});await p.adjacent(-1);assert.equal(p.track.id,'c');});
test('collection order and live-only queue are shared with page navigation',()=>{const current={id:1,externalId:'a',status:'live',collectionId:'one',collectionOrder:2};const list=[{...current,id:2,externalId:'b',collectionOrder:1},{...current,id:3,externalId:'x',status:'coming'},{...current,id:4,externalId:'y',collectionId:'two'},current];assert.deepEqual(collectionPlaybackQueue(list,current).map(x=>x.externalId),['b','a']);assert.deepEqual(collectionPlaybackQueue(list,{...current,status:'coming'}).map(x=>x.externalId),['a']);});
test('fallback pauses on background but resumes at its preserved position on return',async t=>{const{p,audio,video,visibility}=await setup(t);await p.play();p.seek(14);audio.dispatchEvent(new Event('error'));video.ready();await flush();visibility.set(true);assert.equal(video.getAttribute('src'),null);assert.equal(p.currentTime,14);visibility.set(false);video.ready();assert.equal(video.currentTime,14);assert.equal(video.paused,true);});
test('a paused unopened lesson does not emit periodic progress writes',async t=>{const{p,events,advance}=await setup(t);events.length=0;advance(2000);assert.equal(events.filter(e=>e.type==='time').length,0);});

test('follower terminal pause cannot suppress audio ended/autoplay',async t=>{const{p,audio,video}=await setup(t);await p.play();audio.time=59.9;video.finish();assert.equal(audio.paused,false);p.tick();assert.equal(video.paused,true);audio.finish();await flush();assert.equal(p.track.id,'b');});
test('Media Session experiment keeps only play/pause/track handlers and explicitly clears seek handlers',async t=>{const{p,audio,handlers}=await setup(t);assert.deepEqual(Object.entries(handlers).filter(([,handler])=>typeof handler==='function').map(([action])=>action).sort(),['nexttrack','pause','play','previoustrack']);for(const action of ['seekto','seekbackward','seekforward'])assert.equal(handlers[action],null);handlers.play();await flush();assert.equal(audio.paused,false);handlers.pause();assert.equal(audio.paused,true);handlers.nexttrack();await flush();assert.equal(p.track.id,'b');audio.ready();handlers.previoustrack();await flush();assert.equal(p.track.id,'a');});

test('episode loop stays enabled through lock-screen next/previous and loops the new episode',async t=>{
  const{p,audio,visibility,handlers}=await setup(t);p.setLoop(true);await p.play();visibility.set(true);
  await flush();handlers.nexttrack();assert.equal(p.track.id,'b');assert.equal(p.loop,true);
  audio.ready();audio.finish();await flush();assert.equal(p.track.id,'b');assert.equal(audio.currentTime,0);assert.equal(audio.paused,false);
  handlers.previoustrack();assert.equal(p.track.id,'a');assert.equal(p.loop,true);
  p.stop();assert.equal(p.loop,true);await p.setPlaylist(tracks);await p.load('c');assert.equal(p.loop,true);
});
test('episode loop and sentence repeat change independently',async t=>{
  const{p,audio}=await setup(t);p.setLoop(true);p.playRange({start:2,end:4},'listening',true);
  p.setLoop(false);audio.currentTime=4.01;p.tick();assert.equal(audio.currentTime,2);assert.equal(audio.paused,false);
  p.setLoop(true);p.setRangeRepeat(false);audio.currentTime=4.01;p.tick();assert.equal(audio.paused,true);assert.equal(p.loop,true);
});
test('prepared next starts synchronously in the OS action without waiting for signing; hidden video stays unloaded',async t=>{
  const{p,audio,video,visibility,handlers,session}=await setup(t);const calls=[];
  p.setPlaylist(tracks,async track=>{calls.push(track.id);await flush();return {...track,audioUrl:`signed-${track.id}.mp3`};});
  await p.load('c');await flush();await flush();visibility.set(true);
  const before=calls.length;handlers.previoustrack();
  assert.equal(p.track.id,'b');assert.equal(audio.src,'signed-b.mp3');assert.equal(audio.paused,false);
  assert.equal(session.metadata.title,'Lesson b');assert.equal(video.getAttribute('src'),null);
  assert.equal(calls.filter(id=>id==='b').length,1);assert.ok(calls.length>=before);
});
test('expired prepared URLs are refreshed and stopping discards pending cache results',async t=>{
  const{p,audio,handlers,advance}=await setup(t);let serial=0;
  p.setPlaylist(tracks,async track=>({...track,audioUrl:`${track.id}-${++serial}.mp3`,expiresAt:122000}));
  await p.load('c');await flush();const count=serial;
  advance(70000);handlers.previoustrack();assert.equal(p.track.id,'c');await flush();assert.equal(p.track.id,'b');assert.ok(serial>count);
  const pending={};p.setPlaylist(tracks,track=>new Promise(resolve=>{pending[track.id]=()=>resolve(track);}));
  const change=p.load('a');p.stop();pending.a();await change;assert.equal(p.track,null);assert.equal(audio.src,'');
});

test('browser suspending the follower before visibilitychange must not pause master audio',async t=>{
  const{p,audio,video,visibility}=await setup(t);await p.play();
  visibility.hidden=true;video.pause();assert.equal(audio.paused,false);
  visibility.dispatchEvent(new Event('visibilitychange'));assert.equal(video.src,'');assert.equal(audio.paused,false);
});
test('a late source-reset pause on foreground restore must not stop the audio clock',async t=>{
  const{p,audio,video,visibility}=await setup(t);await p.play();p.seek(12);
  visibility.set(true);visibility.set(false);assert.equal(video.readyState,0);
  video.dispatchEvent(new Event('pause'));assert.equal(audio.paused,false);
  video.ready();await flush();assert.equal(video.currentTime,12);assert.equal(video.paused,false);
  video.pause();assert.equal(audio.paused,true);
});
test('repeated unlock/relock republishes session without resetting audio or loop',async t=>{
  const{p,audio,video,visibility,session,handlers}=await setup(t);p.setLoop(true);await p.play();p.seek(12);
  const loads=audio.loads;
  for(let i=0;i<3;i++){
    visibility.set(true);assert.equal(audio.paused,false);assert.equal(video.src,'');
    session.metadata=null;session.playbackState='none';handlers.nexttrack=null;
    visibility.set(false);video.ready();await flush();
    assert.equal(session.metadata.title,'Lesson a');assert.equal(session.playbackState,'playing');assert.equal(typeof handlers.nexttrack,'function');
    assert.equal(audio.loads,loads);assert.equal(audio.currentTime,12);assert.equal(p.loop,true);
  }
  handlers.pause();visibility.set(true);visibility.set(false);video.ready();assert.equal(audio.paused,true);
});

test('iOS policy restores seek controls and clears track handlers, including after unlock',async t=>{
  const audio=new Media(),visibility=new Visibility(),handlers={};
  const p=new SplitPlayer(audio,{visibility,sessionNavigation:'seek',mediaSession:{setActionHandler:(key,value)=>{handlers[key]=value;},setPositionState:()=>{}}});
  t.after(()=>p.destroy());p.start();p.setPlaylist(tracks);await p.load('a');audio.ready();p.setLoop(true);await p.play();
  assert.equal(handlers.nexttrack,null);assert.equal(handlers.previoustrack,null);
  handlers.seekto({seekTime:20});assert.equal(audio.currentTime,20);
  handlers.seekbackward({});assert.equal(audio.currentTime,10);
  handlers.seekforward({seekOffset:5});assert.equal(audio.currentTime,15);
  visibility.set(true);visibility.set(false);
  assert.equal(handlers.nexttrack,null);assert.equal(typeof handlers.seekforward,'function');assert.equal(p.loop,true);assert.equal(audio.paused,false);
});
test('iOS seek policy covers iPhone and desktop-mode iPad but preserves Xiaomi/Android and desktop Mac track controls',()=>{
  const{usesIosSeekControls}=load('src/lib/split-player/platform.ts');
  assert.equal(usesIosSeekControls({userAgent:'Mozilla iPhone',platform:'iPhone',maxTouchPoints:5}),true);
  assert.equal(usesIosSeekControls({userAgent:'Mozilla Macintosh',platform:'MacIntel',maxTouchPoints:5}),true);
  assert.equal(usesIosSeekControls({userAgent:'Mozilla Android MiuiBrowser',platform:'Linux armv8l',maxTouchPoints:5}),false);
  assert.equal(usesIosSeekControls({userAgent:'Mozilla Android Chrome',platform:'Linux armv8l',maxTouchPoints:5}),false);
  assert.equal(usesIosSeekControls({userAgent:'Mozilla Macintosh',platform:'MacIntel',maxTouchPoints:0}),false);
});
