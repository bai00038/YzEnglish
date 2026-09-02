import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useParams } from "react-router";
import {
  ChevronRight, ChevronLeft, FileText, Download, Info, Play, Volume2,
} from "lucide-react";
import { useSceneDetail } from "@/data/scenes-access";
import { SpeechBubbleLabel } from "@/app/components/brand";
import { LevelBadge, DurationLabel } from "@/app/components/badges";
import { LoadingState, ErrorState } from "@/app/components/DataState";
import { DictationPractice, type DictationLineInput } from "@/app/components/DictationPractice";
import { buildSceneSpeakers, normalizeSpeaker, SPEAKER_STYLES } from "@/data/speakerRoles";
import type { CultureTipItem, KeyExpressionItem } from "@/data/types";

// Key Expressions card — expressionEn/expressionZh, the only two fields
// KeyExpressionItem has (public.key_expressions.usage_en/usage_zh/
// example_en/example_zh were dropped entirely — see
// supabase/migrations/0026_simplify_key_expressions_and_culture_tips.sql).
// Fixed short height, two per row on desktop.
function KeyExpressionCard({ item }: { item: KeyExpressionItem }) {
  return (
    <div
      className="rounded-xl border px-5 py-4 min-h-[88px] flex flex-col justify-center"
      style={{ borderColor: "rgba(24,76,58,0.13)", backgroundColor: "rgba(24,76,58,0.025)" }}
    >
      <p className="text-base font-bold text-primary leading-snug">{item.expressionEn}</p>
      <p className="text-sm text-[#3A3B37] mt-1 leading-snug">{item.expressionZh}</p>
    </div>
  );
}

// Culture & Local Tips card — bodyEn/bodyZh, the only two fields
// CultureTipItem has (public.culture_tips.title_en/title_zh were dropped
// entirely — see
// supabase/migrations/0026_simplify_key_expressions_and_culture_tips.sql).
// The card header is always "Tip N", generated from this item's 1-based
// position in the already sort_order-ascending array (see
// cultureTipItems in SceneDetailPage below).
function CultureTipCard({ item, tipNumber }: { item: CultureTipItem; tipNumber: number }) {
  return (
    <div className="rounded-xl overflow-hidden border" style={{ borderColor: "rgba(24,76,58,0.13)", backgroundColor: "rgba(24,76,58,0.025)" }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "rgba(24,76,58,0.09)" }}>
        <Info size={13} className="text-primary flex-shrink-0" />
        <p className="text-sm font-bold text-primary leading-snug">Tip {tipNumber}</p>
      </div>
      <div className="px-4 py-4">
        <p className="text-sm leading-[1.7] font-semibold text-foreground">{item.bodyEn}</p>
        {item.bodyZh && (
          <p className="text-sm mt-1.5 leading-[1.7] text-muted-foreground">{item.bodyZh}</p>
        )}
      </div>
    </div>
  );
}

// Playback-speed control — the same rate applies to normal continuous
// playback, single-line playback, repeat playback, and any future
// dictation mode, since they all drive the one shared <video> element
// (see the playbackRate effect below). 1 is always the default.
const PLAYBACK_RATES = [0.8, 1, 1.2] as const;
const PLAYBACK_RATE_STORAGE_KEY = "yzenglish:playbackRate";

const STUDY_TABS = [
  { key: "listening", num: "01", en: "Sentence Listening", zh: "单句精听" },
  { key: "dictation", num: "02", en: "Dictation", zh: "听写" },
] as const;
type StudyTabKey = (typeof STUDY_TABS)[number]["key"];

export function SceneDetailPage({ bilingualMode, setBilingualMode }: {
  bilingualMode: boolean;
  setBilingualMode: (v: boolean) => void;
}) {
  const { slug } = useParams<{ slug: string }>();
  const { data, loading, error } = useSceneDetail(slug ?? "");
  const scene = data?.scene ?? null;
  const content = scene?.content;
  const related = data?.related ?? [];
  // Language module data — sourced from public.key_expressions/
  // public.culture_tips (falling back to legacy scenes.tips only when a
  // scene has no rows in the new tables yet; see "Temporary legacy Tips
  // fallback" in src/data/scenes-access.ts). Already sort_order-ascending
  // as fetched/derived there — never re-sorted or filtered by title here.
  const keyExpressionItems = content?.keyExpressions ?? [];
  const cultureTipItems = content?.cultureTips ?? [];
  const prevScene = data?.prevScene ?? undefined;
  const nextScene = data?.nextScene ?? undefined;

  // Unique speakers for this scene, in first-occurrence order, each with a
  // stable color — shared by the legend and every dialogue row below.
  const sceneSpeakers = useMemo(
    () => buildSceneSpeakers(content?.dialogue ?? []),
    [content?.dialogue]
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoPaused, setVideoPaused] = useState(true);
  const [subtitleLang, setSubtitleLang] = useState<"off" | "en" | "zh">("off");
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [studyTab, setStudyTab] = useState<StudyTabKey>("listening");
  // Selected playback speed — applies to the one shared <video> element no
  // matter which mode is driving it (continuous play, single-line play,
  // repeat, future dictation), so it lives here rather than per-mode.
  // Restored from localStorage so a user's chosen speed survives reloads;
  // never derived from/applied to start_time or end_time.
  const [playbackRate, setPlaybackRate] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    try {
      const saved = Number(window.localStorage.getItem(PLAYBACK_RATE_STORAGE_KEY));
      return (PLAYBACK_RATES as readonly number[]).includes(saved) ? saved : 1;
    } catch {
      return 1;
    }
  });
  // Set when a dialogue line is clicked, so it stays highlighted once
  // single-line playback pauses at its end_time (at which point
  // videoCurrentTime has moved past the line's own range, and
  // activeDialogueLineIndex below would otherwise go null). Cleared as
  // soon as normal continuous playback starts (see the <video> onPlay
  // handler), so time-based tracking takes back over.
  const [pinnedLineIndex, setPinnedLineIndex] = useState<number | null>(null);

  // Switching scenes re-renders this same component with new data (the
  // route param changes, not the component identity) — without this, a
  // stale videoCurrentTime from the previous scene would briefly compute
  // an activeSubtitleLine/activeDialogueLineIndex against the NEW scene's
  // lines before the new <video> element reports its own real position.
  useEffect(() => {
    setVideoCurrentTime(0);
    setVideoPaused(true);
    setPinnedLineIndex(null);
    cancelRangePlayback();
    // A freshly-loaded <video> element defaults to 1× — reapply the
    // user's selected speed so switching scenes doesn't silently reset it.
    if (videoRef.current) videoRef.current.playbackRate = playbackRate;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene?.id]);

  // Applies the selected speed to the live <video> element immediately on
  // change, and persists it — this is the ONLY place playbackRate is
  // written to the element outside of the scene-switch/loadedmetadata
  // safety nets below, so continuous play, single-line play, repeat, and
  // seeking all inherit it without any per-mode handling.
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate;
    try {
      window.localStorage.setItem(PLAYBACK_RATE_STORAGE_KEY, String(playbackRate));
    } catch {
      // localStorage unavailable (e.g. private browsing) — speed still
      // applies for this session, just isn't remembered next time.
    }
  }, [playbackRate]);

  // True unmount (navigating away from this page entirely) — the
  // scene-switch effect above only fires on a scene?.id change, not on
  // unmount, so a single-line frame watcher still in flight needs its
  // own cleanup here or it keeps polling a detached <video> element.
  useEffect(() => {
    return () => cancelRangePlayback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rendered ourselves (not via native <track>/TextTrack) — the browser's
  // own caption box repositions itself depending on whether the native
  // control bar is currently visible, which reads as the subtitle jumping
  // up and down during playback. A fixed-position div sidesteps that
  // entirely. Text comes from content.dialogue via highlightedLineIndex
  // below — the same Dialogue_Lines data and active-line calculation the
  // Dialogue section itself highlights with, so the overlay can never show
  // a different (stale) line than the transcript.

  // Maps a Learn-the-Dialogue line index -> its {start, end} window in the
  // scene video, driving both "click this line to jump the video there"
  // and "highlight/auto-scroll to whichever line the video is on right
  // now" — one shared source of truth for both.
  //
  // Two structures can produce this map, and a scene is always entirely
  // on one or the other (see applyDialogueLinesOverride in
  // src/data/scenes-access.ts, which replaces the whole dialogue array
  // atomically):
  //
  // - New: scenes migrated to the dialogue_lines table (see
  //   supabase/migrations/0012_add_dialogue_lines.sql) carry start/end
  //   directly on each line — one row there is already one dialogue line
  //   AND one subtitle cue, so no matching is needed at all.
  // - Legacy: scenes still on the old scenes.dialogue/subtitle_cues jsonb
  //   pair, where a dialogue line and its Dialogue_Lines cues aren't
  //   always 1:1 (a line was sometimes authored as several shorter timed
  //   cues, e.g. "Excuse me. Do you have this in a small?" as two rows).
  //   Both lists are in the same chronological order, so this walks them
  //   together: for each dialogue line, greedily consume consecutive
  //   cues, concatenating their English text, until it exactly equals the
  //   line's English text. That run's first cue.start / last cue.end
  //   becomes the line's playable range. A line that never reaches an
  //   exact match (wording drift, or no Dialogue_Lines coverage at all)
  //   is left unmapped rather than guessing — no button/highlight, rather
  //   than a wrong audio range.
  //
  // Either way, a scene with neither structure populated ("没有时间码的
  // 旧场景不会报错") just returns an empty Map — every line renders as
  // plain, non-interactive text.
  // Exact, human-calibrated start/end for each line — straight from
  // dialogue_lines (or, for legacy scenes, matched verbatim against
  // subtitle_cues) with NO padding whatsoever. This is the only range
  // ever used to control actual playback (see playDialogueLine) — a
  // line's audio must stop exactly at its own end_time, never bleeding
  // even a fraction of a second into the next line.
  const dialogueLineRawRanges = useMemo(() => {
    const map = new Map<number, { start: number; end: number }>();
    const lines = content?.dialogue;
    if (!lines || lines.length === 0) return map;

    const hasNativeTiming = lines.some(line => typeof line.start === "number" && typeof line.end === "number");

    if (hasNativeTiming) {
      lines.forEach((line, lineIndex) => {
        if (typeof line.start === "number" && typeof line.end === "number" && line.end > line.start) {
          map.set(lineIndex, { start: line.start, end: line.end });
        }
      });
    } else {
      const cues = scene?.subtitleCues;
      if (cues && cues.length > 0) {
        const normalize = (s: string) => s.replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
        let cueIndex = 0;

        lines.forEach((line, lineIndex) => {
          const target = normalize(line.en);
          let acc = "";
          let start: number | null = null;
          let end: number | null = null;
          let j = cueIndex;
          while (j < cues.length && acc.length < target.length) {
            acc = acc.length > 0 ? `${acc} ${normalize(cues[j].en)}` : normalize(cues[j].en);
            if (start === null) start = cues[j].start;
            end = cues[j].end;
            j++;
          }
          if (acc === target && start !== null && end !== null) {
            map.set(lineIndex, { start, end });
            cueIndex = j;
          }
        });
      }
    }

    return map;
  }, [content?.dialogue, scene?.subtitleCues]);

  // Padded copy of dialogueLineRawRanges, used ONLY to decide which line
  // to highlight/auto-scroll to while the video is playing continuously
  // (see activeDialogueLineIndex below) — NEVER to control playback.
  // Dialogue_Lines' timestamps aren't frame-accurate for *display*
  // purposes — clipped first words and a highlight that drops out a beat
  // early both come from the raw start/end running a little tight. Nudge
  // start earlier and end later by a small pre/post-roll to recover the
  // edges, but never past a neighboring line's OWN (un-padded) boundary —
  // that clamp keeps every line's window non-overlapping (required for
  // activeDialogueLineIndex to ever match at most one line at a time).
  const dialogueLineAudioRanges = useMemo(() => {
    const map = new Map<number, { start: number; end: number }>();
    const PRE_ROLL = 0.15;
    const POST_ROLL = 0.15;
    const ordered = Array.from(dialogueLineRawRanges.entries()).sort((a, b) => a[0] - b[0]);
    ordered.forEach(([lineIndex, range], i) => {
      const prevEnd = i > 0 ? ordered[i - 1][1].end : 0;
      const nextStart = i < ordered.length - 1 ? ordered[i + 1][1].start : Infinity;
      map.set(lineIndex, {
        start: Math.max(0, prevEnd, range.start - PRE_ROLL),
        end: Math.min(nextStart, range.end + POST_ROLL),
      });
    });

    return map;
  }, [dialogueLineRawRanges]);

  // Whichever dialogue line's window currently contains the video's
  // playhead — null between lines (a pause) or once playback runs past
  // the last mapped line. This alone drives the Dialogue section's
  // highlight, auto-scroll, and the "now playing" text treatment; there
  // is no separate "which line did I click" state to keep in sync with
  // it, since clicking a line seeks the video to that line's own start.
  const activeDialogueLineIndex = useMemo(() => {
    for (const [lineIndex, range] of dialogueLineAudioRanges) {
      if (videoCurrentTime >= range.start && videoCurrentTime < range.end) return lineIndex;
    }
    return null;
  }, [dialogueLineAudioRanges, videoCurrentTime]);

  // What the Dialogue section actually highlights/scrolls to: the clicked
  // line while it's pinned (during and just after single-line playback),
  // otherwise whichever line the video's own playhead is currently in.
  const highlightedLineIndex = pinnedLineIndex !== null ? pinnedLineIndex : activeDialogueLineIndex;

  // The video subtitle overlay's text — same line, same index, as whatever
  // the Dialogue section highlights just above. No separate subtitle
  // dataset or timing match: content.dialogue is the one source both read.
  const activeSubtitleLine = highlightedLineIndex !== null ? content?.dialogue[highlightedLineIndex] ?? null : null;

  // Set only by clicking a dialogue line — "play just this line, then
  // stop" — never by the big play button or the native control bar, so
  // normal continuous playback never auto-pauses at every line boundary.
  // Cleared the moment the video actually pauses for any reason (see the
  // <video> element's onPause below), so a stale target from a
  // previously-clicked line can never fire again after later, unrelated
  // playback resumes past that same timestamp. This is also what the
  // frame watcher below checks each tick to know single-line mode is
  // still (still means: not superseded, not manually paused) in effect.
  const activeEndRef = useRef<number | null>(null);

  // Frame-accurate end-of-line watcher. video.currentTime as read from a
  // requestAnimationFrame poll is the browser's best-effort estimate of
  // playback position, not the timestamp of the frame actually on
  // screen — HTMLVideoElement.requestVideoFrameCallback's mediaTime IS
  // that timestamp, straight from the compositor, so it's the most
  // accurate stop signal script can get. Used when available; rAF
  // polling currentTime directly is the fallback for browsers without
  // rVFC. Deliberately no early-stop margin subtracted from end_time
  // here — stopping a fixed amount early doesn't fix imprecision, it
  // just trades "bleeds into the next line" for "clips this line's own
  // ending," and end_time must play in full.
  const frameRequestRef = useRef<number | null>(null);
  const videoFrameRequestRef = useRef<number | null>(null);
  // The 'seeked' listener currently pending after a click set currentTime
  // but before the browser finished the seek — must be individually
  // removable so a second line click while the first seek is still in
  // flight cancels the stale one instead of both firing play().
  const pendingSeekedHandlerRef = useRef<(() => void) | null>(null);
  // Bumped on every playDialogueLine call. Captured by each async step
  // (the 'seeked' handler, the frame-watcher loop) so a step that
  // finishes after a *later* click has already moved on to a different
  // line recognizes itself as stale and no-ops instead of acting on an
  // outdated end_time or restarting playback the user has moved past.
  const playRequestRef = useRef(0);

  // Opt-in evidence dump for diagnosing single-line playback boundaries —
  // off by default so it never ships noisy. Flip on from devtools with
  // `window.__DEBUG_DIALOGUE_TIMING = true` before clicking a line, no
  // code change needed.
  const isDialogueTimingDebugEnabled = () =>
    typeof window !== "undefined" && (window as unknown as Record<string, unknown>).__DEBUG_DIALOGUE_TIMING === true;

  function cancelRangePlayback() {
    if (frameRequestRef.current !== null) {
      cancelAnimationFrame(frameRequestRef.current);
      frameRequestRef.current = null;
    }
    const video = videoRef.current;
    if (
      video &&
      videoFrameRequestRef.current !== null &&
      typeof video.cancelVideoFrameCallback === "function"
    ) {
      video.cancelVideoFrameCallback(videoFrameRequestRef.current);
    }
    videoFrameRequestRef.current = null;
    if (video && pendingSeekedHandlerRef.current) {
      video.removeEventListener("seeked", pendingSeekedHandlerRef.current);
      pendingSeekedHandlerRef.current = null;
    }
    activeEndRef.current = null;
  }

  // Polls playback position every rendered frame and pauses the instant
  // it reaches (never before) endTime — the ONLY thing that pauses
  // single-line playback; onTimeUpdate below is display-only. requestId
  // is this call's playRequestRef snapshot: if a newer line click has
  // since bumped playRequestRef, this loop stops touching the video
  // instead of fighting the new playback.
  function watchForLineEnd(requestId: number, endTime: number) {
    const video = videoRef.current;
    if (!video) return;

    const stopAt = (t: number) => {
      video.pause(); // triggers onPause below, which clears activeEndRef
      video.currentTime = endTime;
      setVideoCurrentTime(t);
      if (isDialogueTimingDebugEnabled()) {
        console.table({ expectedEnd: endTime, actualPauseTime: t, overrun: t - endTime });
      }
    };

    if (typeof video.requestVideoFrameCallback === "function") {
      const tick = (_now: number, metadata: { mediaTime: number }) => {
        if (playRequestRef.current !== requestId || activeEndRef.current === null) return;
        if (metadata.mediaTime >= endTime) {
          stopAt(metadata.mediaTime);
          return;
        }
        setVideoCurrentTime(metadata.mediaTime);
        videoFrameRequestRef.current = video.requestVideoFrameCallback(tick);
      };
      videoFrameRequestRef.current = video.requestVideoFrameCallback(tick);
    } else {
      const tick = () => {
        if (playRequestRef.current !== requestId || activeEndRef.current === null) return;
        const t = video.currentTime;
        if (t >= endTime) {
          stopAt(t);
          return;
        }
        setVideoCurrentTime(t);
        frameRequestRef.current = requestAnimationFrame(tick);
      };
      frameRequestRef.current = requestAnimationFrame(tick);
    }
  }

  function playDialogueLine(lineIndex: number, range: { start: number; end: number }) {
    const video = videoRef.current;
    if (!video) return;
    // Cancel whatever the previous click left in flight — a stale
    // frame-watcher loop still polling toward the OLD line's end_time,
    // or a still-pending 'seeked' listener from a seek that hasn't
    // landed yet — before starting this one.
    cancelRangePlayback();
    const requestId = ++playRequestRef.current;
    activeEndRef.current = range.end;
    setPinnedLineIndex(lineIndex);

    if (isDialogueTimingDebugEnabled()) {
      const line = content?.dialogue[lineIndex];
      const nextLine = content?.dialogue[lineIndex + 1];
      console.table({
        lineIndex,
        rawStart: line?.start,
        rawEnd: line?.end,
        parsedStart: range.start,
        parsedEnd: range.end,
        videoCurrentTimeBeforeSeek: video.currentTime,
        nextLineStart: nextLine?.start ?? null,
      });
    }

    const beginPlayback = () => {
      if (playRequestRef.current !== requestId) return; // superseded by a later click
      video.play();
      watchForLineEnd(requestId, range.end);
    };

    // Setting currentTime to (near) its current value seeks nowhere, so
    // no 'seeked' event would ever fire — play immediately in that case
    // rather than hanging.
    if (Math.abs(video.currentTime - range.start) < 0.005) {
      beginPlayback();
      return;
    }

    video.pause();
    const onSeeked = () => {
      pendingSeekedHandlerRef.current = null;
      // video.currentTime is only updated to the seek target once this
      // event fires — beginPlayback (and so the frame watcher) must
      // never run before it, or it starts measuring against the
      // pre-seek position.
      if (playRequestRef.current !== requestId) return; // superseded by a later click
      if (isDialogueTimingDebugEnabled()) {
        console.table({ requestedStart: range.start, actualSeekedTime: video.currentTime });
      }
      beginPlayback();
    };
    pendingSeekedHandlerRef.current = onSeeked;
    video.addEventListener("seeked", onSeeked, { once: true });
    video.currentTime = range.start;
  }

  // Intentionally no auto-scroll here: highlighting must follow
  // video.currentTime / clicked-line state without ever moving the page's
  // scroll position. See SceneDetailPage playback-scroll fix.
  const dialogueRowRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Switching between "单句精听"/Sentence Listening and "听写"/Dictation
  // never touches the <video> element itself (no unmount/remount, no
  // second instance) — it only needs to stop whatever playback mode was
  // active so the two tabs don't fight over the same video, while keeping
  // the user's selected playbackRate untouched.
  function switchStudyTab(tab: StudyTabKey) {
    if (tab === studyTab) return;
    videoRef.current?.pause();
    cancelRangePlayback();
    setStudyTab(tab);
  }

  // Lines the Dictation tab can practice: only ones with an exact,
  // unpadded playable range (dialogueLineRawRanges — never the padded
  // dialogueLineAudioRanges, which exists solely for continuous-playback
  // highlighting) AND actual English text. `index` is each line's
  // position in content.dialogue — the stable id DictationPractice keys
  // its localStorage records by and passes back to playDictationLine.
  const dictationLines: DictationLineInput[] = useMemo(() => {
    const lines = content?.dialogue;
    if (!lines) return [];
    return lines
      .map((line, index) => ({ line, index }))
      .filter(({ line, index }) => dialogueLineRawRanges.has(index) && line.en.trim().length > 0)
      .map(({ line, index }) => {
        const speaker = sceneSpeakers.get(normalizeSpeaker(line.speaker));
        return {
          index,
          en: line.en,
          zh: line.zh,
          speakerLabel: (speaker?.en ?? line.speaker).toUpperCase(),
          speakerStyle: speaker?.style ?? SPEAKER_STYLES[0],
        };
      });
  }, [content?.dialogue, dialogueLineRawRanges, sceneSpeakers]);

  // Reuses the exact same single-line player used by "单句精听" (see
  // playDialogueLine above) with the line's own exact start/end — no
  // second playback path, no padding/offset/tolerance of any kind.
  function playDictationLine(lineIndex: number) {
    const range = dialogueLineRawRanges.get(lineIndex);
    if (!range) return;
    playDialogueLine(lineIndex, range);
  }

  // video.pause() itself triggers the <video>'s onPause handler above,
  // which already calls cancelRangePlayback() — so this alone is enough
  // to immediately stop whatever the dictation tab's frame watcher was
  // still polling toward, with no separate cleanup path to keep in sync.
  function stopDictationPlayback() {
    videoRef.current?.pause();
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24">
        <LoadingState label="Loading scene…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24">
        <ErrorState message={error} />
      </div>
    );
  }

  // Covers two cases the client can't (and shouldn't be able to)
  // distinguish: a slug that never existed, and a real scene whose status
  // isn't "published" — Row Level Security (see
  // supabase/migrations/0004_rls_policies.sql) already hides
  // draft/ready_to_review/hidden scenes from anon/authenticated queries
  // entirely, so both cases surface here as scene === null. One friendly
  // message for both avoids leaking which slugs correspond to real,
  // not-yet-public scenes.
  if (!scene) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <p className="text-sm font-semibold text-foreground">This scene is being prepared</p>
        <p className="text-xs text-muted-foreground mt-1">该场景正在准备中，敬请期待。</p>
        <Link to="/explore" className="text-xs font-bold text-primary inline-flex items-center gap-0.5 mt-4 hover:opacity-70 transition-opacity">
          Back to Explore <ChevronRight size={12} />
        </Link>
      </div>
    );
  }

  return (
    <div>

      {/* Breadcrumb */}
      <div className="bg-background border-b border-border">
        <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-2.5 flex items-center gap-1 text-[13px] md:text-[14px] text-muted-foreground flex-wrap">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight size={9} />
          <Link to="/explore" className="hover:text-primary transition-colors">{scene.category}</Link>
          <ChevronRight size={9} />
          <span className="text-foreground font-semibold">{scene.titleEn}</span>
        </div>
      </div>

      {/* ─── Lesson identity block (sits between breadcrumb and chapter nav) ─── */}
      <div className="bg-background border-b border-border">
        <div className="max-w-[1000px] mx-auto px-4 md:px-6 pt-6 pb-5">
          <h1 className="text-[32px] md:text-[38px] font-black leading-tight text-foreground mb-0.5">
            {scene.titleEn}
          </h1>
          <p className="font-normal text-[#3A3B37] mb-3 text-[16px] md:text-[18px]">{scene.titleZh}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] md:text-[14px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md">{scene.category}</span>
            <LevelBadge level={scene.level} />
            <DurationLabel duration={scene.duration} />
          </div>
        </div>
      </div>

      {!content ? (
        <div className="pb-24">
          <section className="max-w-[1000px] mx-auto px-4 md:px-6 pt-8 pb-20">
            <div className="flex items-start gap-4 mb-6">
              <span className="text-[44px] md:text-[52px] font-black leading-none select-none flex-shrink-0 mt-0.5 tabular-nums" style={{ color: "rgba(24,76,58,0.1)", WebkitTextStroke: "1px rgba(24,76,58,0.5)", paintOrder: "stroke fill" }}>01</span>
              <div className="pt-0.5">
                <p className="text-[24px] md:text-[28px] font-black leading-tight text-foreground">Watch & Understand</p>
                <p className="text-[15px] md:text-[16px] text-muted-foreground mt-1 leading-snug">Watch the scene, then read the setup and your goal.</p>
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center">
              <p className="text-sm font-semibold text-foreground">Full lesson content for this scene is coming soon.</p>
              <p className="text-xs text-muted-foreground mt-1">该场景的完整学习内容即将上线。</p>
              <Link to="/explore" className="text-xs font-bold text-primary inline-flex items-center gap-0.5 mt-4 hover:opacity-70 transition-opacity">
                Explore other scenes <ChevronRight size={12} />
              </Link>
            </div>
          </section>
        </div>
      ) : (
        <>
          {/* ═══════════════════════════════════════════
              CENTRED CONTENT LAYOUT (no sidebar)
              ═══════════════════════════════════════════ */}
          <div>

            {/* ─────────────────────────────────────────────
                Video + playback speed + study tabs
                ───────────────────────────────────────────── */}
            <section id="section-watch" className="max-w-[1000px] mx-auto px-4 md:px-6 pt-6 pb-14">

              {/* ── Scene video area — always the same 16:9 video-shaped frame.
                  scene.photo is only ever used as the <video> poster (cover
                  image) or, before scene.video_url is synced from the Google
                  Sheet, as a poster-style background — never shown as a bare
                  standalone image. ── */}
              <div className="w-full rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: "16 / 9" }}>
                {scene.video_url ? (
                  <div className="relative w-full h-full">
                    <video
                      ref={videoRef}
                      controls
                      controlsList="nodownload noremoteplayback"
                      disablePictureInPicture
                      playsInline
                      preload="metadata"
                      poster={scene.photo || undefined}
                      className="w-full h-full object-cover"
                      draggable={false}
                      onContextMenu={(event) => event.preventDefault()}
                      onDragStart={(event) => event.preventDefault()}
                      onPlay={() => {
                        setVideoPaused(false);
                        // activeEndRef is set (before video.play() is
                        // called) only by playDialogueLine — so a play
                        // event with it still null means this is normal
                        // continuous playback (big button or native
                        // controls), which should track the video's own
                        // time again rather than stay pinned to whichever
                        // line was last clicked.
                        if (activeEndRef.current === null) {
                          setPinnedLineIndex(null);
                        }
                      }}
                      onPause={() => {
                        setVideoPaused(true);
                        // Any pause — manual, native-controls, or the
                        // frame watcher's own auto-stop (see
                        // watchForLineEnd) — ends single-line mode.
                        // Whatever resumes playback next (big play
                        // button, native controls, another line click) is
                        // never held to a stale line's end time.
                        cancelRangePlayback();
                      }}
                      // Display-only: keeps videoCurrentTime (and so the
                      // highlight/subtitle) in sync during ordinary
                      // continuous playback, i.e. whenever the frame
                      // watcher isn't already doing that at a much higher
                      // resolution for single-line playback. Never pauses
                      // the video itself — see watchForLineEnd for why
                      // timeupdate's firing rate is too coarse for that.
                      onTimeUpdate={e => {
                        setVideoCurrentTime(e.currentTarget.currentTime);
                      }}
                      onEnded={e => {
                        cancelRangePlayback();
                        e.currentTarget.currentTime = 0;
                        setVideoCurrentTime(0);
                      }}
                      // Some browsers reset playbackRate to 1 when a new
                      // <source> finishes loading — reapply the selected
                      // speed once metadata is ready, same value as the
                      // playbackRate effect above.
                      onLoadedMetadata={e => {
                        e.currentTarget.playbackRate = playbackRate;
                      }}
                    >
                      <source src={scene.video_url} />
                      Your browser does not support video playback.
                    </video>
                    {subtitleLang !== "off" && activeSubtitleLine && (
                      <div className="absolute inset-x-0 bottom-14 md:bottom-16 flex justify-center px-6 pointer-events-none">
                        <p className="max-w-[90%] text-center text-white text-base md:text-lg leading-snug px-3 py-1.5 rounded-lg bg-black/70" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
                          {subtitleLang === "en" ? activeSubtitleLine.en : activeSubtitleLine.zh}
                        </p>
                      </div>
                    )}
                    {dialogueLineAudioRanges.size > 0 && (
                      <div className="absolute top-3 right-3 flex items-center gap-0.5 rounded-full bg-black/50 p-1 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setSubtitleLang("off")}
                          aria-pressed={subtitleLang === "off"}
                          className={`px-2.5 py-1 rounded-full transition-colors ${subtitleLang === "off" ? "bg-white text-black" : "text-white hover:bg-white/20"}`}
                        >
                          Off
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubtitleLang("en")}
                          aria-pressed={subtitleLang === "en"}
                          className={`px-2.5 py-1 rounded-full transition-colors ${subtitleLang === "en" ? "bg-white text-black" : "text-white hover:bg-white/20"}`}
                        >
                          EN
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubtitleLang("zh")}
                          aria-pressed={subtitleLang === "zh"}
                          className={`px-2.5 py-1 rounded-full transition-colors ${subtitleLang === "zh" ? "bg-white text-black" : "text-white hover:bg-white/20"}`}
                        >
                          中
                        </button>
                      </div>
                    )}
                    {videoPaused && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <button
                          type="button"
                          onClick={() => {
                            cancelRangePlayback(); // resuming from the big button is always continuous playback
                            videoRef.current?.play();
                          }}
                          aria-label="Play video"
                          className="pointer-events-auto flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-black/50 hover:bg-black/60 transition-colors"
                        >
                          <Play className="w-7 h-7 md:w-9 md:h-9 text-white fill-white ml-1" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : scene.photo ? (
                  <div className="relative w-full h-full">
                    <img
                      src={scene.photo}
                      alt={`${scene.titleEn} scene cover`}
                      className="w-full h-full object-cover object-center"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                      <p className="text-white text-xs font-bold px-3 py-1.5 rounded-full bg-black/40">Video coming soon · 视频准备中</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center px-6 text-center">
                    <p className="text-white text-sm font-bold">{scene.titleEn}</p>
                    <p className="text-white/70 text-xs mt-1">Video coming soon · 视频准备中</p>
                  </div>
                )}
              </div>

              {/* ── Playback speed ── */}
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Playback Speed · 播放速度</span>
                <div className="flex items-center gap-0.5 rounded-full border border-border bg-white p-0.5">
                  {PLAYBACK_RATES.map(rate => {
                    const isActive = playbackRate === rate;
                    return (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setPlaybackRate(rate)}
                        aria-pressed={isActive}
                        className="text-xs font-bold px-2.5 py-1 rounded-full transition-colors"
                        style={isActive ? { backgroundColor: "#184C3A", color: "#F7F6F2" } : { color: "var(--muted-foreground)" }}
                      >
                        {rate}×
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Study mode tabs ── */}
              <div className="flex items-center gap-5 md:gap-8 border-b border-border mt-6 mb-6">
                {STUDY_TABS.map(tab => {
                  const isActive = studyTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => switchStudyTab(tab.key)}
                      className="flex items-center gap-1.5 md:gap-2 pb-3 border-b-2 transition-colors cursor-pointer bg-transparent"
                      style={isActive
                        ? { borderBottomColor: "#B7F21D", color: "#184C3A" }
                        : { borderBottomColor: "transparent", color: "var(--muted-foreground)" }
                      }
                    >
                      <span className="text-[10px] md:text-[11px] font-black">{tab.num}</span>
                      <span className="text-[13px] md:text-[16px] font-bold whitespace-nowrap">
                        <span className="sm:hidden">{tab.zh}</span>
                        <span className="hidden sm:inline">{tab.en} · {tab.zh}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {studyTab === "dictation" ? (
                <DictationPractice
                  sceneId={scene.id}
                  lines={dictationLines}
                  onPlayLine={playDictationLine}
                  onStopPlayback={stopDictationPlayback}
                />
              ) : (
              <div className="rounded-2xl px-4 py-6 md:px-6 md:py-7" style={{ backgroundColor: "#EFF4F1" }}>
                {/* Controls bar */}
                <div className="flex flex-wrap items-center gap-3 mb-5 pb-5 border-b border-black/8">
                  {/* EN / 双语 toggle */}
                  <div className="flex items-center border border-border rounded-full p-0.5 bg-white shadow-sm">
                    <button onClick={() => setBilingualMode(false)}
                      className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all duration-200 ${!bilingualMode ? "shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                      style={!bilingualMode ? { backgroundColor: "#184C3A", color: "#F7F6F2" } : {}}>
                      English
                    </button>
                    <button onClick={() => setBilingualMode(true)}
                      className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all duration-200 ${bilingualMode ? "shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                      style={bilingualMode ? { backgroundColor: "#184C3A", color: "#F7F6F2" } : {}}>
                      双语
                    </button>
                  </div>

                  <span className="text-xs text-muted-foreground">{content.dialogue.length} lines · {scene.duration}</span>

                  {/* Legend — every role that actually speaks in this scene, in first-occurrence order */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 ml-auto">
                    {Array.from(sceneSpeakers.values()).map(sp => (
                      <div key={sp.key} className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded whitespace-nowrap"
                          style={{ backgroundColor: sp.style.bg, color: sp.style.color, border: sp.style.border }}>
                          {sp.en.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-muted-foreground hidden sm:inline whitespace-nowrap">
                          {sp.zh ? `${sp.en} · ${sp.zh}` : sp.en}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Transcript rows — no scroll container of its own; the
                    lines expand naturally and only the page scrollbar
                    applies. Highlighting never triggers scrolling. */}
                <div>
                  {content.dialogue.map((line, i) => {
                    const speaker = sceneSpeakers.get(normalizeSpeaker(line.speaker));
                    const style = speaker?.style ?? SPEAKER_STYLES[0];
                    const label = (speaker?.en ?? line.speaker).toUpperCase();
                    const audioRange = dialogueLineAudioRanges.get(i);
                    const isActiveLine = highlightedLineIndex === i;
                    // Prefer the permanent external_line_id (Phase A-0 —
                    // see supabase/migrations/0013_add_external_ids.sql),
                    // then the dialogue_lines row's own internal database
                    // id, and only fall back to array index for scenes
                    // still on the legacy scenes.dialogue jsonb (which has
                    // no per-line identity at all). Playback/highlight
                    // logic (dialogueLineAudioRanges, activeDialogueLineIndex)
                    // stays index-keyed on purpose — it's positional state
                    // scoped to one render, not a React reconciliation key.
                    const rowKey = line.externalLineId ?? line.dialogueLineDbId ?? i;
                    return (
                      <div key={rowKey}
                        ref={el => { dialogueRowRefs.current[i] = el; }}
                        className={`dialogue-row py-4 border-b border-black/6 last:border-0 hover:bg-white/70 transition-colors rounded-lg px-3 -mx-3 ${audioRange ? "cursor-pointer" : ""} ${isActiveLine ? "bg-primary/5" : ""}`}
                        style={{ borderLeft: `3px solid ${style.accent}` }}
                        role={audioRange ? "button" : undefined}
                        tabIndex={audioRange ? 0 : undefined}
                        aria-pressed={audioRange ? isActiveLine : undefined}
                        aria-label={audioRange ? "Play English audio" : undefined}
                        onClick={audioRange ? () => playDialogueLine(i, dialogueLineRawRanges.get(i)!) : undefined}
                        onKeyDown={audioRange ? e => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            playDialogueLine(i, dialogueLineRawRanges.get(i)!);
                          }
                        } : undefined}
                      >

                        {/* Speech-bubble speaker label — fixed-width column on desktop/tablet,
                            stacked above the text with no reserved column on mobile (<=640px) */}
                        <div className="speaker-column">
                          <SpeechBubbleLabel label={label} style={style} />
                        </div>

                        {/* English + Chinese lines — fluid column, same left edge for every role */}
                        <div className="dialogue-content">
                          <div className="flex items-start gap-2">
                            <p
                              className={`dialogue-english font-medium leading-[1.65] flex-1 transition-colors ${isActiveLine ? "text-primary" : "text-foreground"}`}
                              style={{ fontSize: "17px", WebkitTextStroke: isActiveLine ? "0.5px currentColor" : "0px currentColor" }}
                            >
                              {line.en}
                            </p>
                            {/* Purely a state indicator now — the whole row is the click target (see onClick above) */}
                            {audioRange && (
                              <span aria-hidden="true" className={`dialogue-audio flex-shrink-0 mt-0.5 flex items-center justify-center w-6 h-6 rounded-full transition-colors ${isActiveLine ? "bg-primary text-white" : "text-muted-foreground"}`}>
                                <Volume2 className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                          {bilingualMode && (
                            <p className="dialogue-chinese mt-2 leading-[1.75]" style={{ fontSize: "15px", color: "#3A3B37" }}>{line.zh}</p>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
              )}

            </section>

            {/* ─────────────────────────────────────────────
                STAGE 03 · Learn the Language
                ───────────────────────────────────────────── */}
            <section id="section-language" className="border-t border-border bg-card">
              <div className="max-w-[960px] mx-auto px-4 md:px-6 py-12 md:py-16">
              <div className="bg-card px-0">
                {/* Key Expressions — from public.key_expressions (or its legacy-tips fallback) */}
                {keyExpressionItems.length > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-0.5 h-4 rounded-full bg-primary" />
                      <span className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">Key Expressions · 重点表达</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {keyExpressionItems.map((item, i) => (
                        <KeyExpressionCard key={i} item={item} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Culture & Local Tips — from public.culture_tips (or its legacy-tips fallback) */}
                {cultureTipItems.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-0.5 h-4 rounded-full bg-primary" />
                      <span className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">Culture & Local Tips · 文化与本地提示</span>
                    </div>
                    <div className="space-y-3">
                      {cultureTipItems.map((item, i) => (
                        <CultureTipCard key={i} item={item} tipNumber={i + 1} />
                      ))}
                    </div>
                  </div>
                )}
              </div>{/* inner card */}
              </div>{/* inner container */}
            </section>

            {/* ─────────────────────────────────────────────
                LIGHT SECTION: PDF · Related · Prev/Next
                ───────────────────────────────────────────── */}
            <section className="border-t border-border bg-background">
              <div className="max-w-[960px] mx-auto px-4 md:px-6 py-12">

                {/* PDF download — scene.pdfUrl comes straight from Supabase scenes.pdf_url;
                    never hardcoded and never guessed from the scene id/slug. */}
                <div className="flex items-center gap-4 border border-border rounded-2xl bg-card px-5 py-4 mb-10 shadow-sm">
                  <div className="w-10 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(183,242,29,0.15)" }}>
                    <FileText size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground leading-snug">{scene.titleEn} — PDF</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Dialogue · Expressions · Culture tips · Free</p>
                  </div>
                  {scene.pdfUrl ? (
                    <a
                      href={scene.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-black rounded-xl px-4 py-2.5 transition-opacity hover:opacity-90 flex-shrink-0"
                      style={{ backgroundColor: "#B7F21D", color: "#1E1F1C" }}
                    >
                      <Download size={11} />Download
                    </a>
                  ) : (
                    <span className="text-xs font-bold text-muted-foreground italic flex-shrink-0">资料准备中</span>
                  )}
                </div>

                {/* Related Scenes */}
                {related.length > 0 && (
                  <div className="mb-10">
                    <div className="flex items-center gap-2 mb-5">
                      <div className="w-0.5 h-4 rounded-full bg-primary" />
                      <span className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Related Scenes · 相关场景</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {related.map(r => (
                        <Link key={r.id} to={`/scenes/${r.slug}`}
                          className="flex items-start gap-3 border border-border rounded-xl p-3.5 bg-card text-left hover:border-primary/30 hover:shadow-sm transition-all">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground leading-snug">{r.titleEn}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{r.titleZh}</p>
                            <div className="flex items-center gap-1.5 mt-2">
                              <LevelBadge level={r.level} />
                            </div>
                          </div>
                          <ChevronRight size={13} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prev / Next scene */}
                {(prevScene || nextScene) && (
                  <div className="grid grid-cols-2 gap-3 pt-8 border-t border-border">
                    {prevScene ? (
                      <Link to={`/scenes/${prevScene.slug}`} className="border border-border rounded-xl p-4 text-left bg-card hover:border-primary/30 hover:shadow-sm transition-all">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-2">
                          <ChevronLeft size={10} />Previous scene
                        </div>
                        <p className="text-xs font-bold text-foreground leading-snug">{prevScene.titleEn}</p>
                        <p className="text-[11px] text-primary mt-1">{prevScene.titleZh}</p>
                      </Link>
                    ) : <div />}
                    {nextScene ? (
                      <Link to={`/scenes/${nextScene.slug}`} className="border border-border rounded-xl p-4 text-right bg-card hover:border-primary/30 hover:shadow-sm transition-all">
                        <div className="flex items-center gap-1 justify-end text-[10px] text-muted-foreground mb-2">
                          Next scene<ChevronRight size={10} />
                        </div>
                        <p className="text-xs font-bold text-foreground leading-snug">{nextScene.titleEn}</p>
                        <p className="text-[11px] text-primary mt-1">{nextScene.titleZh}</p>
                      </Link>
                    ) : <div />}
                  </div>
                )}

              </div>
            </section>

          </div>
        </>
      )}
    </div>
  );
}