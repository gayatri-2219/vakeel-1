/**
 * Audio utilities for VAKEEL voice recording.
 * Converts browser-recorded audio (WebM/Opus or OGG/Opus) to 16kHz mono WAV
 * for optimal Whisper transcription.
 */

/**
 * Returns the best supported MIME type for MediaRecorder in the current browser.
 */
export function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

/**
 * Converts any browser-recorded audio blob to a 16kHz mono 16-bit PCM WAV blob.
 * Whisper performs best with 16kHz mono audio.
 */
export async function convertToWav(audioBlob: Blob): Promise<Blob> {
  const TARGET_SAMPLE_RATE = 16000;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;

  if (!AudioContextClass) {
    // Can't convert — return raw blob and hope Whisper accepts it
    console.warn('[audio] AudioContext not available, sending raw audio');
    return audioBlob;
  }

  const audioContext = new AudioContextClass({ sampleRate: TARGET_SAMPLE_RATE });

  let audioBuffer: AudioBuffer;
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } catch (err) {
    console.warn('[audio] decodeAudioData failed, sending raw blob:', err);
    audioContext.close();
    return audioBlob;
  }

  // Downmix to mono by averaging all channels
  const numSamples = audioBuffer.length;
  const numChannels = audioBuffer.numberOfChannels;
  const monoData = new Float32Array(numSamples);

  for (let ch = 0; ch < numChannels; ch++) {
    const channelData = audioBuffer.getChannelData(ch);
    for (let i = 0; i < numSamples; i++) {
      monoData[i] += channelData[i] / numChannels;
    }
  }

  // Build WAV file: RIFF header + 16-bit PCM samples
  const byteCount = numSamples * 2; // 16-bit = 2 bytes per sample
  const buffer = new ArrayBuffer(44 + byteCount);
  const view = new DataView(buffer);

  function writeStr(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  // RIFF chunk
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + byteCount, true);           // file size - 8
  writeStr(8, 'WAVE');

  // fmt sub-chunk
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);                        // sub-chunk size
  view.setUint16(20, 1, true);                         // PCM format
  view.setUint16(22, 1, true);                         // mono
  view.setUint32(24, TARGET_SAMPLE_RATE, true);        // sample rate
  view.setUint32(28, TARGET_SAMPLE_RATE * 2, true);    // byte rate
  view.setUint16(32, 2, true);                         // block align
  view.setUint16(34, 16, true);                        // bits per sample

  // data sub-chunk
  writeStr(36, 'data');
  view.setUint32(40, byteCount, true);

  // Write 16-bit signed PCM samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, monoData[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  audioContext.close();
  return new Blob([view], { type: 'audio/wav' });
}
