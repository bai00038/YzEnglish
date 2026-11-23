import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {comparableTranscript,selectTargetRange} from './tts-repair.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const source=path.join(root,'tools/kit/.tts-cache/kore-podcast-lufs16-v1');
const out=path.join(root,'tools/kit/.tts-cache/kore-podcast-lufs16-v1-repaired');
const originals=JSON.parse(fs.readFileSync(path.join(source,'batch-qa-2026-11-22.json'),'utf8')).files;
const args=process.argv.slice(2),n=args.indexOf('--limit');const limit=n<0?Infinity:Number(args[n+1]);if(!(limit>0))throw Error('--limit must be positive');
const targets=originals.slice(0,limit);fs.mkdirSync(path.join(out,'asr'),{recursive:true});
const config={source:'kore-podcast-lufs16-v1',method:'word-timestamp-tail-crop-v1',asrModel:'gemini-3.5-transcribe',voice:'Kore',style:'Podcast'};
fs.writeFileSync(path.join(out,'config.json'),JSON.stringify(config,null,2)+'\n');
const reportPath=path.join(out,'repair-report.json');const report=fs.existsSync(reportPath)?JSON.parse(fs.readFileSync(reportPath,'utf8')):{config,entries:{}};
const envLine=fs.readFileSync(path.join(root,'.env.tts.local'),'utf8').split(/\r?\n/).find(x=>x.startsWith('GEMINI_API_KEY='));const apiKey=process.env.GEMINI_API_KEY||envLine?.slice(15).trim();if(!apiKey)throw Error('GEMINI_API_KEY required');
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const save=()=>{fs.writeFileSync(reportPath+'.tmp',JSON.stringify(report,null,2)+'\n');fs.renameSync(reportPath+'.tmp',reportPath);};
let nextRequest=0,fatal=null,cursor=0,processed=0;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function parseASR(result){const content=(result.steps??[]).filter(s=>s.type==='model_output').flatMap(s=>s.content??[]);return {text:content.filter(p=>p.type==='text').map(p=>p.text??'').join(' '),words:content.flatMap(p=>p.annotations??[]).filter(a=>a.type==='word_info').map(a=>({text:a.text,start:parseFloat(a.start_offset),end:parseFloat(a.end_offset)}))};}
async function transcribe(file){const data=fs.readFileSync(file),sha=hash(data),cached=path.join(out,'asr',sha+'.json');if(fs.existsSync(cached))return parseASR(JSON.parse(fs.readFileSync(cached,'utf8')));
 let response,result;for(let attempt=0;attempt<3;attempt++){
 const slot=Math.max(Date.now(),nextRequest);nextRequest=slot+6500;await pause(Math.max(0,slot-Date.now()));
 response=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'x-goog-api-key':apiKey,'Content-Type':'application/json'},signal:AbortSignal.timeout(120000),body:JSON.stringify({model:config.asrModel,input:[{type:'audio',mime_type:'audio/mpeg',data:data.toString('base64')}],generation_config:{transcription_config:{mode:{type:'verbatim',timestamp_granularities:['word']}}}})});result=await response.json();if(response.ok)break;
 const message=String(result.error?.message??'').split(apiKey).join('[redacted]');if(response.status===429&&/per.day|daily/i.test(message)){const e=Error('ASR daily quota exhausted; resume after reset');e.fatal=true;throw e;}
 if((response.status===429||response.status>=500)&&attempt<2){await pause(15000*(attempt+1));continue;}const e=Error(`ASR HTTP ${response.status}: ${message.slice(0,180)}`);e.fatal=true;throw e;
 }if(!response.ok)throw Error('ASR request failed');fs.writeFileSync(cached,JSON.stringify(result,null,2)+'\n');return parseASR(result);
}
function ffmpeg(args){const r=spawnSync('ffmpeg',['-hide_banner','-nostdin',...args],{encoding:'utf8',timeout:60000});if(r.status!==0)throw Error('Audio processing/decoding failed');return r;}
function loudness(file){const r=ffmpeg(['-i',file,'-af','loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json','-f','null','-']);const m=r.stderr.match(/\{[^{}]*"input_i"[^{}]*\}/s);if(!m)throw Error('No loudness measurement');return JSON.parse(m[0]);}
function duration(file){const r=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',file],{encoding:'utf8',timeout:60000});const d=Number(r.stdout.trim());if(r.status||!Number.isFinite(d)||d<=0)throw Error('Invalid duration');return d;}
async function processOne(target){const src=path.join(source,target.file),dest=path.join(out,target.file),sourceSha256=hash(fs.readFileSync(src));const previous=report.entries[target.key];if(previous?.passed&&previous.sourceSha256===sourceSha256&&fs.existsSync(dest)&&previous.sha256===hash(fs.readFileSync(dest)))return;
 const before=await transcribe(src);if(!before.text||!before.words.length)throw Error('ASR omitted text/word timestamps');const range=selectTargetRange(before.words,target.spokenText,duration(src));const temp=path.join(out,target.file+'.crop.mp3');
 if(range.kept)fs.copyFileSync(src,temp);else ffmpeg(['-loglevel','error','-y','-i',src,'-af',`atrim=start=${range.start}:end=${range.end},asetpts=PTS-STARTPTS`,'-ac','1','-ar','24000','-codec:a','libmp3lame','-b:a','96k',temp]);
 const m=loudness(temp);if(!Number.isFinite(Number(m.input_i)))throw Error('Cropped audio is silent');const normal=path.join(out,target.file+'.normalized.mp3');
 const filter=`loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
 ffmpeg(['-loglevel','error','-y','-i',temp,'-af',filter,'-ac','1','-ar','24000','-codec:a','libmp3lame','-b:a','96k',normal]);fs.unlinkSync(temp);
 let measured=loudness(normal);if(Number(measured.input_i)<-20&&-16-Number(measured.input_i)<=6){const adjusted=path.join(out,target.file+'.adjusted.mp3');ffmpeg(['-loglevel','error','-y','-i',normal,'-af',`volume=${-16-Number(measured.input_i)}dB,alimiter=limit=0.82:level=false`,'-ac','1','-ar','24000','-codec:a','libmp3lame','-b:a','96k',adjusted]);fs.renameSync(adjusted,normal);measured=loudness(normal);}
 const d=duration(normal);if(d<.2||Number(measured.input_i)<-20||Number(measured.input_i)>-12||Number(measured.input_tp)>0)throw Error('Cropped audio failed duration/loudness/peak checks');
 const after=await transcribe(normal);const passed=comparableTranscript(after.text)===comparableTranscript(target.spokenText);
 const entry={file:target.file,key:target.key,expectedText:target.spokenText,sourceSha256,range,beforeTranscript:before.text,transcript:after.text,duration:d,loudness:{integrated:Number(measured.input_i),truePeak:Number(measured.input_tp)},sha256:hash(fs.readFileSync(normal)),passed,status:passed?(range.kept?'already-clean':'repaired'):'review',checkedAt:new Date().toISOString()};
 fs.renameSync(normal,dest);report.entries[target.key]=entry;save();if(!passed)console.log(`REVIEW: ${target.key} → ${after.text}`);
}
async function worker(){while(cursor<targets.length&&!fatal){const target=targets[cursor++];try{await processOne(target);}catch(e){report.entries[target.key]={key:target.key,file:target.file,expectedText:target.spokenText,passed:false,status:e.fatal?'blocked':'review',error:e.message};save();console.log(`${e.fatal?'BLOCKED':'REVIEW'}: ${target.key}: ${e.message}`);if(e.fatal)fatal=e;}processed++;if(processed%10===0||processed===targets.length)console.log(`${processed}/${targets.length} processed; ${Object.values(report.entries).filter(e=>e.passed).length} passed`);}}
await Promise.all([worker(),worker(),worker(),worker()]);save();console.log(JSON.stringify({total:originals.length,checked:Object.keys(report.entries).length,passed:Object.values(report.entries).filter(e=>e.passed).length,review:Object.values(report.entries).filter(e=>e.status==='review').length,blocked:Object.values(report.entries).filter(e=>e.status==='blocked').length}));if(fatal)process.exitCode=1;
