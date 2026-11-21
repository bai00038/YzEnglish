// Approximately +5dB for quiet core-expression speech. A high-ratio
// compressor catches peaks instead of raising the video's volume too.
export function connectTtsBoost(context: AudioContext, audio: HTMLMediaElement) {
  const gain = context.createGain();
  const limiter = context.createDynamicsCompressor();
  gain.gain.value = 1.8;
  limiter.threshold.value = -3;
  limiter.knee.value = 3;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.08;
  const source = context.createMediaElementSource(audio);
  source.connect(gain);
  gain.connect(limiter);
  limiter.connect(context.destination);
  return () => { source.disconnect(); gain.disconnect(); limiter.disconnect(); };
}
