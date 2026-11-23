export type PlaybackMode = 'episode' | 'listening' | 'dictation';
export type Fallback = 'split' | 'main' | 'low';
export interface Timing { start: number; end: number; id?: string }
export interface Track {
  id: string; title: string; artist?: string; artwork?: MediaImage[];
  videoUrl: string; audioUrl?: string | null; lowUrl?: string | null; timing?: Timing[]; expiresAt?: number;
}
export interface PlayerEvent {
  type: 'trackchange' | 'time' | 'play' | 'pause' | 'ended' | 'rangeend' | 'fallback' | 'error' | 'loopchange';
  track: Track | null; time: number; duration: number; paused: boolean;
  mode: PlaybackMode; fallback: Fallback; range?: Timing; error?: string;
}
export interface PlayerEnvironment {
  visibility?: Pick<Document, 'hidden' | 'addEventListener' | 'removeEventListener'>;
  mediaSession?: MediaSession; metadata?: (value: MediaMetadataInit) => MediaMetadata;
  now?: () => number;
  sessionNavigation?: 'tracks' | 'seek';
}
// No account, route, collection, progress-storage or lesson-UI dependencies.
export class SplitPlayer {
  readonly audio: HTMLAudioElement;
  private video: HTMLVideoElement | null = null;
  private videoDisposers: (() => void)[] = [];
  private disposers: (() => void)[] = [];
  private listeners = new Set<(event: PlayerEvent) => void>();
  private sequence: Track[] = [];
  private resolve: (track: Track) => Promise<Track> = async track => track;
  private prepared = new Map<string, Track>();
  private preparing = new Map<string, Promise<Track>>();
  private playlistVersion = 0;
  private lastWarm = 0;
  track: Track | null = null;
  mode: PlaybackMode = 'episode';
  fallback: Fallback = 'split';
  loop = false;
  private range: (Timing & { repeat: boolean }) | null = null;
  private pendingSeek: number | null = null;
  private videoTarget: number | null = null;
  private videoDetached = false;
  private videoPlayRequest = false;
  private videoPauseRequest = false;
  private generation = 0;
  private guardUntil = 0;
  private lastCorrection = 0;
  private corrections = 0;
  private correctedAt = 0;
  private stallTimer: ReturnType<typeof setTimeout> | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private boundaryTimer: ReturnType<typeof setTimeout> | null = null;
  private lastTimeEvent = 0;
  private started = false;
  private switching = false;
  private wantsPlay = false;
  constructor(audio: HTMLAudioElement, private env: PlayerEnvironment = {}) {
    this.audio = audio;
    audio.preload = 'metadata';
  }
  get media(): HTMLMediaElement { return this.fallback === 'split' || !this.video ? this.audio : this.video; }
  get currentTime() { return this.pendingSeek ?? this.media.currentTime ?? 0; }
  get duration() { return Number.isFinite(this.media.duration) ? this.media.duration : 0; }
  get paused() { return this.media.paused; }
  private get hidden() { return Boolean(this.env.visibility?.hidden); }
  private now() { return this.env.now?.() ?? Date.now(); }
  on(listener: (event: PlayerEvent) => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private emit(type: PlayerEvent['type'], extra: Partial<PlayerEvent> = {}) {
    const event: PlayerEvent = { type, track: this.track, time: this.currentTime, duration: this.duration,
      paused: this.paused, mode: this.mode, fallback: this.fallback, ...extra };
    for (const listener of this.listeners) listener(event);
  }
  start() {
    if (this.started) return;
    this.started = true;
    const listen = (name: string, fn: EventListener) => {
      this.audio.addEventListener(name, fn); this.disposers.push(() => this.audio.removeEventListener(name, fn));
    };
    listen('loadedmetadata', () => { if (this.fallback === 'split') { this.applyPending(); this.audio.playbackRate = this.rate; this.sync(true); } });
    listen('play', () => { if (this.fallback === 'split' && !this.switching) { this.emit('play'); this.updateSession(); this.sync(true); } });
    listen('playing', () => { if (this.fallback === 'split') { this.armBoundary(); this.sync(true); this.restoreSession(); } });
    listen('pause', () => { if (this.fallback === 'split' && !this.switching) { this.pauseVideo(); this.emit('pause'); this.updateSession(); this.clearBoundary(); } });
    listen('timeupdate', () => { if (this.fallback === 'split') this.tick(); });
    listen('ended', () => { if (this.fallback === 'split') this.ended(); });
    listen('error', () => { if (this.track && this.fallback === 'split') this.degrade('main', 'audio-load'); });
    listen('seeking', () => { if (this.fallback === 'split') { this.guardUntil = this.now() + 900; this.armBoundary(); } });
    listen('seeked', () => { if (this.fallback === 'split') { this.sync(true); this.armBoundary(); this.emit('time'); } });
    const visibility = () => this.visibilityChanged();
    this.env.visibility?.addEventListener('visibilitychange', visibility);
    this.disposers.push(() => this.env.visibility?.removeEventListener('visibilitychange', visibility));
    this.timer = setInterval(() => this.tick(), 25);
    this.registerSession();
  }
  setPlaylist(sequence: Track[], resolve?: (track: Track) => Promise<Track>) {
    if (resolve !== this.resolve || JSON.stringify(sequence) !== JSON.stringify(this.sequence)) {
      this.playlistVersion++; this.prepared.clear(); this.preparing.clear();
    }
    this.sequence = sequence.slice(); if (resolve) this.resolve = resolve;
    this.registerSession();
  }
  private rate = 1;
  setRate(value: number) {
    if (!Number.isFinite(value) || value <= 0) return;
    this.rate = value; this.audio.playbackRate = value;
    if (this.video) this.video.playbackRate = value;
    this.armBoundary(); this.updateSession();
  }
  setLoop(value: boolean) { if (this.loop !== value) { this.loop = value; this.emit('loopchange'); } }
  setRangeRepeat(value: boolean) { if (this.range) this.range.repeat = value; }
  private readyTrack(id: string) {
    const track = this.prepared.get(id);
    return track && (track.expiresAt === undefined || track.expiresAt > this.now() + 60000) ? track : undefined;
  }
  private prepare(entry: Track): Promise<Track> {
    const cached = this.readyTrack(entry.id); if (cached) return Promise.resolve(cached);
    const pending = this.preparing.get(entry.id); if (pending) return pending;
    const version = this.playlistVersion;
    const request = this.resolve(entry).then(track => {
      if (version === this.playlistVersion) this.prepared.set(entry.id, track);
      return track;
    }).finally(() => { if (this.preparing.get(entry.id) === request) this.preparing.delete(entry.id); });
    this.preparing.set(entry.id, request); return request;
  }
  private warmAdjacent() {
    this.lastWarm = this.now();
    const index = this.sequence.findIndex(track => track.id === this.track?.id);
    if (index < 0) return;
    // Resolve URLs only: never fetch neighboring media or retain rejected auth.
    for (const entry of [this.sequence[index - 1], this.sequence[index + 1]]) {
      if (entry) void this.prepare(entry).catch(() => {});
    }
  }
  setMode(mode: PlaybackMode) { this.mode = mode; if (mode === 'episode') this.clearRange(); }
  async load(id: string, { startTime = 0, autoplay = false }: { startTime?: number; autoplay?: boolean } = {}) {
    if (this.track?.id === id) return this.track;
    const entry = this.sequence.find(track => track.id === id);
    if (!entry) throw new Error('Track is not in the supplied sequence');
    const ticket = ++this.generation;
    // A prepared track reaches audio.play() before any await in the OS action.
    const cached = this.readyTrack(id);
    const resolved = cached ?? await this.prepare(entry);
    if (ticket !== this.generation) return null;
    if (!resolved.videoUrl) throw new Error('Missing video URL');
    this.pause();
    this.switching = true;
    this.clearRange(); this.mode = 'episode'; this.fallback = resolved.audioUrl ? 'split' : 'main';
    this.track = resolved; this.corrections = 0; this.lastCorrection = 0; this.clearStall();
    this.pendingSeek = startTime > 0 ? startTime : null; this.guardUntil = this.now() + 900;
    this.audio.removeAttribute('src');
    if (resolved.audioUrl) this.audio.src = resolved.audioUrl;
    this.audio.load(); this.audio.playbackRate = this.rate;
    this.loadVideo();
    this.switching = false;
    this.emit('trackchange'); this.updateMetadata(); this.updateSession();
    const playing = autoplay ? this.play() : undefined;
    this.warmAdjacent();
    if (playing) await playing;
    return resolved;
  }
  async adjacent(delta: number) {
    const i = this.sequence.findIndex(track => track.id === this.track?.id);
    const next = i < 0 ? undefined : this.sequence[i + delta];
    if (!next) return;
    try { await this.load(next.id, { autoplay: true }); }
    catch (error) { this.pause(); this.emit('error', { error: String(error) }); }
  }
  seek(time: number) {
    if (!Number.isFinite(time)) return;
    const max = this.duration || Infinity;
    const value = Math.max(0, Math.min(time, max));
    this.guardUntil = this.now() + 900;
    this.pendingSeek = value;
    this.applyPending(); this.sync(true); this.armBoundary(); this.emit('time'); this.updateSession();
  }
  private applyPending() {
    if (this.pendingSeek === null || this.media.readyState < 1) return;
    const time = Math.min(this.pendingSeek, this.duration || this.pendingSeek);
    this.pendingSeek = null; // Clear before assigning: seek events may be synchronous.
    this.media.currentTime = time;
  }
  async play() {
    if (!this.track) return;
    this.wantsPlay = true;
    this.applyPending();
    const clock = this.media;
    try { await clock.play(); this.sync(true); this.armBoundary(); }
    catch (error) { if (clock === this.media) this.emit('error', { error: String(error) }); }
  }
  playEpisode() { this.clearRange(); this.mode = 'episode'; return this.play(); }
  playRange(range: Timing, mode: 'listening' | 'dictation', repeat = false) {
    if (!Number.isFinite(range.start) || !Number.isFinite(range.end) || range.start < 0 || range.end <= range.start) return;
    this.clearRange(); this.mode = mode; this.range = { ...range, repeat };
    this.seek(range.start); void this.play();
  }
  clearRange() { this.range = null; this.clearBoundary(); }
  pause() { this.wantsPlay = false; this.media.pause(); if (this.fallback === 'split') this.pauseVideo(); this.clearBoundary(); this.updateSession(); }
  stop() {
    this.generation++; this.playlistVersion++; this.prepared.clear(); this.preparing.clear(); this.pause(); this.clearRange(); this.track = null; this.sequence = [];
    this.audio.removeAttribute('src'); this.audio.load(); this.unloadVideo(); this.updateMetadata(); this.updateSession();
  }
  attachVideo(video: HTMLVideoElement | null) {
    if (video === this.video) return;
    this.unloadVideo(); for (const dispose of this.videoDisposers) dispose(); this.videoDisposers = [];
    this.video = video; this.videoPlayRequest = false; this.videoPauseRequest = false;
    if (!video) return;
    const on = (name: string, fn: EventListener) => { video.addEventListener(name, fn); this.videoDisposers.push(() => video.removeEventListener(name, fn)); };
    on('play', () => {
      if (this.videoPlayRequest) { this.videoPlayRequest = false; return; }
      if (this.switching || this.hidden) return;
      // Native video controls and desktop overlay both enter through this intent.
      if (this.fallback === 'split') { this.mode = 'episode'; this.clearRange(); if (Math.abs(video.currentTime - this.currentTime) > .3) this.seek(video.currentTime); void this.play(); }
      else { this.emit('play'); this.updateSession(); this.armBoundary(); }
    });
    on('pause', () => {
      if (this.videoPauseRequest) { this.videoPauseRequest = false; return; }
      if (this.switching || this.videoDetached) return;
      // A browser may suspend the muted follower before visibilitychange, or
      // deliver load()'s queued pause after foreground restoration. Neither
      // is user intent to pause the persistent audio clock.
      if (this.fallback === 'split' && (this.hidden || video.readyState < 2 || !video.paused)) return;
      // The follower may end a fraction earlier because of decoder padding.
      // Its automatic terminal pause must not stop the audio before ended.
      if (this.fallback === 'split' && video.ended) return;
      if (this.fallback === 'split') this.audio.pause();
      else { this.emit('pause'); this.updateSession(); this.clearBoundary(); }
    });
    on('seeking', () => {
      if (this.switching || this.videoDetached) return;
      if (this.videoTarget !== null && Math.abs(video.currentTime - this.videoTarget) < .1) return;
      if (this.fallback === 'split') this.seek(video.currentTime);
      else { this.guardUntil = this.now() + 900; this.armBoundary(); this.emit('time'); }
    });
    on('seeked', () => { this.videoTarget = null; if (this.fallback !== 'split') { this.applyPending(); this.armBoundary(); } });
    on('ratechange', () => { if (Math.abs(video.playbackRate - this.rate) > .001) this.setRate(video.playbackRate); });
    on('loadedmetadata', () => {
      video.playbackRate = this.rate;
      if (this.fallback === 'split') this.sync(true);
      else { this.applyPending(); if (this.fallbackResume) { this.fallbackResume = false; void this.play(); } }
    });
    on('playing', () => { this.clearStall(); if (this.fallback !== 'split') this.armBoundary(); this.restoreSession(); });
    on('waiting', () => this.scheduleStall());
    on('stalled', () => this.scheduleStall());
    on('error', () => { if (this.track && !this.videoDetached) this.degrade('low', 'video-file'); });
    on('ended', () => { if (this.fallback !== 'split') this.ended(); });
    on('timeupdate', () => { if (this.fallback !== 'split') this.tick(); });
    this.loadVideo();
  }
  private fallbackResume = false;
  private pauseVideo() {
    if (this.video && !this.video.paused) { this.videoPauseRequest = true; this.video.pause(); }
  }
  private unloadVideo() {
    if (!this.video) return;
    this.videoDetached = true; this.clearStall(); this.pauseVideo();
    this.video.removeAttribute('src'); this.video.load();
  }
  private loadVideo() {
    if (!this.video || !this.track || this.hidden) { this.unloadVideo(); return; }
    this.videoDetached = false;
    this.video.muted = this.fallback === 'split';
    const url = this.fallback === 'low' ? this.track.lowUrl : this.track.videoUrl;
    if (url && this.video.getAttribute('src') !== url) { this.videoTarget = null; this.video.src = url; this.video.load(); }
    this.video.playbackRate = this.rate;
    if (this.fallback === 'split') this.sync(true); else this.applyPending();
  }
  private sync(force = false) {
    const video = this.video;
    if (!video || !this.track || this.fallback !== 'split' || this.hidden || this.videoDetached || video.readyState < 1) return;
    video.muted = true;
    const drift = Math.abs(video.currentTime - this.currentTime);
    const now = this.now();
    if ((force || (drift > .3 && now >= this.guardUntil && now - this.lastCorrection > 800))) {
      if (!force) {
        this.corrections = now - this.correctedAt < 8000 ? this.corrections + 1 : 1;
        this.correctedAt = now;
        if (this.corrections >= 4) { this.degrade('main', 'sync-drift'); return; }
      }
      this.lastCorrection = now; this.videoTarget = this.currentTime;
      if (drift > .04) video.currentTime = this.videoTarget;
    } else if (drift < .12 && now - this.correctedAt > 1000) this.corrections = 0;
    if (this.audio.paused) this.pauseVideo();
    else if (video.ended && this.duration - this.currentTime < .5) return;
    else if (video.paused) {
      this.videoPlayRequest = true;
      void video.play().catch(() => { this.videoPlayRequest = false; });
    }
  }
  private clearBoundary() { if (this.boundaryTimer !== null) clearTimeout(this.boundaryTimer); this.boundaryTimer = null; }
  private armBoundary() {
    this.clearBoundary(); if (!this.range || this.paused) return;
    const remaining = Math.max(0, (this.range.end - this.currentTime) / this.rate * 1000);
    this.boundaryTimer = setTimeout(() => { this.checkBoundary(); if (this.range && !this.paused) this.armBoundary(); }, Math.max(8, remaining));
  }
  private checkBoundary() {
    if (!this.range || this.paused || this.currentTime < this.range.end) return;
    const range = { ...this.range };
    this.emit('rangeend', { range, time: range.end });
    if (range.repeat && this.range) { this.seek(range.start); this.armBoundary(); }
    else { this.clearRange(); this.pause(); this.seek(range.end); }
  }
  private tick() {
    if (!this.track || this.switching) return;
    this.checkBoundary(); this.sync();
    if (!this.paused && this.now() - this.lastWarm >= 60000) this.warmAdjacent();
    if (!this.paused && this.now() - this.lastTimeEvent >= 150) { this.lastTimeEvent = this.now(); this.emit('time'); this.updateSession(); }
  }
  private ended() {
    if (this.range) { this.checkBoundary(); if (this.range) { const range = this.range; this.emit('rangeend', { range, time: range.end }); if (range.repeat) { this.seek(range.start); void this.play(); } else { this.clearRange(); this.pause(); } } return; }
    if (this.mode !== 'episode') { this.pause(); return; }
    this.emit('ended');
    if (this.loop) { this.seek(0); void this.play(); }
    else { const i = this.sequence.findIndex(t => t.id === this.track?.id); if (i >= 0 && i + 1 < this.sequence.length) void this.adjacent(1); else { this.pause(); this.seek(0); } }
  }
  private clearStall() { if (this.stallTimer !== null) clearTimeout(this.stallTimer); this.stallTimer = null; }
  private scheduleStall() {
    if (this.hidden || this.paused || this.stallTimer !== null || this.fallback === 'low') return;
    this.stallTimer = setTimeout(() => { this.stallTimer = null; if (!this.hidden && !this.paused) this.degrade('low', 'video-buffering'); }, 8000);
  }
  private degrade(target: Exclude<Fallback, 'split'>, reason: string) {
    if (!this.track || (target === 'main' && this.fallback !== 'split')) return;
    if (target === 'low' && (!this.track.lowUrl || this.fallback === 'low')) { this.pause(); this.emit('error', { error: `Media unavailable: ${reason}` }); return; }
    const time = this.currentTime, playing = !this.paused || this.wantsPlay;
    this.switching = true; this.audio.pause(); this.pauseVideo();
    this.fallback = target; this.pendingSeek = time; this.fallbackResume = playing && !this.hidden;
    this.loadVideo(); this.switching = false; this.emit('fallback'); this.updateSession();
    if (this.video?.readyState && this.fallbackResume) { this.fallbackResume = false; void this.play(); }
  }
  private visibilityChanged() {
    if (this.hidden) {
      const time = this.currentTime;
      if (this.fallback !== 'split') { this.pause(); this.pendingSeek = time; }
      this.unloadVideo(); // src removal + load aborts fetching; pause alone does not.
    } else { this.loadVideo(); this.sync(true); }
    this.restoreSession();
  }
  private restoreSession() {
    if (!this.track) return;
    this.registerSession(); this.updateMetadata(); this.updateSession();
  }
  private sessionActions: MediaSessionAction[] = [];
  private registerSession() {
    const session = this.env.mediaSession; if (!session) return;
    const seek = this.env.sessionNavigation === 'seek';
    const handlers: Partial<Record<MediaSessionAction, MediaSessionActionHandler | null>> = {
      play: () => { void this.play(); }, pause: () => this.pause(),
      previoustrack: seek ? null : () => { void this.adjacent(-1); },
      nexttrack: seek ? null : () => { void this.adjacent(1); },
      // iOS returns to working seek controls; other platforms keep track controls.
      // Clear the unused group explicitly when restoring a reused session.
      seekto: seek ? event => { if (event.seekTime !== undefined) this.seek(event.seekTime); } : null,
      seekbackward: seek ? event => this.seek(this.currentTime - (event.seekOffset ?? 10)) : null,
      seekforward: seek ? event => this.seek(this.currentTime + (event.seekOffset ?? 10)) : null,
    };
    for (const [action, handler] of Object.entries(handlers)) {
      try { session.setActionHandler(action as MediaSessionAction, handler ?? null); if (!this.sessionActions.includes(action as MediaSessionAction)) this.sessionActions.push(action as MediaSessionAction); } catch { /* Not all WebViews support every action. */ }
    }
  }
  private updateMetadata() {
    if (!this.env.mediaSession) return;
    this.env.mediaSession.metadata = this.track && this.env.metadata ? this.env.metadata({ title: this.track.title, artist: this.track.artist, artwork: this.track.artwork }) : null;
  }
  private updateSession() {
    const session = this.env.mediaSession; if (!session) return;
    session.playbackState = this.track ? (this.paused ? 'paused' : 'playing') : 'none';
    if (this.duration > 0) { try { session.setPositionState?.({ duration: this.duration, playbackRate: this.rate, position: Math.max(0, Math.min(this.currentTime, this.duration)) }); } catch { /* unsupported / transitioning source */ } }
  }
  destroy() {
    this.stop(); this.attachVideo(null); for (const dispose of this.disposers) dispose(); this.disposers = [];
    if (this.timer !== null) clearInterval(this.timer); this.timer = null; this.clearStall(); this.clearBoundary();
    for (const action of this.sessionActions) { try { this.env.mediaSession?.setActionHandler(action, null); } catch {} }
    this.sessionActions = []; this.started = false;
  }
}
