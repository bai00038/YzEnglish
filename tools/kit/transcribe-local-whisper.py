"""Persistent local word-timestamp ASR worker. JSON lines in/out, no uploads."""
import json,sys,os,time
from pathlib import Path
from contextlib import redirect_stdout
import torch,whisper
root=Path(__file__).resolve().parents[2]
cache=root/'tools/kit/.tts-cache/whisper-models'
torch.set_num_threads(4)
with redirect_stdout(sys.stderr):
    model=whisper.load_model('base.en',download_root=str(cache),device='cpu')
print(json.dumps({'ready':True,'model':'whisper-base.en'}),flush=True)
for line in sys.stdin:
    try:
        request=json.loads(line);p=Path(request['file']).resolve()
        if root/'tools/kit/.tts-cache' not in p.parents:raise ValueError('File outside audio cache')
        start=time.monotonic()
        with redirect_stdout(sys.stderr):
            result=model.transcribe(str(p),language='en',task='transcribe',word_timestamps=True,verbose=None,temperature=0,beam_size=5,condition_on_previous_text=False,fp16=False)
        words=[{'text':w['word'].strip(),'start':w['start'],'end':w['end'],'probability':w.get('probability',0)} for s in result.get('segments',[]) for w in s.get('words',[])]
        print(json.dumps({'id':request['id'],'text':result.get('text','').strip(),'words':words,'seconds':round(time.monotonic()-start,2)}),flush=True)
    except Exception as e:
        print(json.dumps({'id':request.get('id') if 'request' in locals() else None,'error':str(e)}),flush=True)
