import { LoaderCircle, Pause, Play } from "lucide-react";
import { normalizeKitText } from "@/data/kit";
import { playKitTts, useKitAudio } from "@/data/kit-audio";

export function PhraseAudioButton({ text, audioUrl }: { text: string; audioUrl?: string | null }) {
  const audio = useKitAudio();
  const selected = audio.id === `tts:${normalizeKitText(text)}`;
  const active = selected && !audio.error;
  return (
    <span className="phrase-audio-control">
      <button type="button" className="phrase-audio-button"
        aria-label={active ? `停止发音 ${text}` : `听发音 ${text}`}
        aria-pressed={active} title={selected && audio.error ? audio.error : "听发音"}
        onClick={() => { void playKitTts(text, audioUrl); }}>
        {active && audio.loading ? <LoaderCircle size={15} className="animate-spin" />
          : active ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
      </button>
      {selected && audio.error && <span role="status" className="phrase-audio-error">{audio.error}</span>}
    </span>
  );
}
