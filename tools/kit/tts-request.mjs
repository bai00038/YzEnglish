// Gemini 3.8 treats text as a verbatim transcript. Delivery instructions
// belong to speechMetadata, never a prefix in the spoken text.
// https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/text-to-speech/migration-guide
export function buildTtsRequest(text, { voiceId, style }) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('TTS transcript must be non-empty');
  if (typeof voiceId !== 'string' || !voiceId.trim()) throw new Error('TTS voice must be specified');
  return {
    contents: [{ role: 'user', parts: [{ text, speechMetadata: { style } }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceId } } },
    },
  };
}
