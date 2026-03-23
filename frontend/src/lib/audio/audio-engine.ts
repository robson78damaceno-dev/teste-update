/**
 * Engine de áudio isolada do React (Web Audio API).
 * Mapa mental: Decodificar → Processar → Renderizar.
 * Referência: Sports Sounds Pro (https://www.sportssoundspro.com/)
 *
 * React não processa áudio; esta engine faz decode, peaks e efeitos.
 */

import { DEFAULT_FFT_SIZE } from "./constants";
import { getPeaks as computePeaks } from "./peaks";

let sharedContext: AudioContext | null = null;

/**
 * Retorna um AudioContext (reutilizado; deve ser (re)iniciado após user gesture).
 */
export function getAudioContext(): AudioContext {
  if (sharedContext === null) {
    sharedContext = new AudioContext();
  }
  return sharedContext;
}

/**
 * Retoma o AudioContext se estiver suspended (obrigatório após user gesture para evitar aviso do browser).
 */
export function resumeAudioContext(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    return ctx.resume();
  }
  return Promise.resolve();
}

/**
 * Reseta o contexto compartilhado (útil após suspend/resume).
 */
export function resetAudioContext(): void {
  if (sharedContext !== null) {
    sharedContext.close().catch(() => {});
    sharedContext = null;
  }
}

/** Cache URL → Promise<AudioBuffer> para evitar fetch+decode repetido ao trocar de faixa. */
const decodeCache = new Map<string, Promise<AudioBuffer>>();

/**
 * Carrega e decodifica áudio a partir da URL.
 * Reutiliza o resultado em cache se a URL já foi solicitada.
 * Retorna AudioBuffer com os samples crus (domínio do tempo).
 */
export function decodeAudioUrl(url: string): Promise<AudioBuffer> {
  const cached = decodeCache.get(url);
  if (cached !== undefined) return cached;
  const ctx = getAudioContext();
  const promise = fetch(url, { mode: "cors" })
    .then(async (response) => {
      if (!response.ok) throw new Error(`Failed to fetch audio: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      return ctx.decodeAudioData(arrayBuffer);
    })
    .catch((err) => {
      decodeCache.delete(url); // permite retry em caso de erro
      throw err;
    });
  decodeCache.set(url, promise);
  return promise;
}

/**
 * Peaks downsampled para desenho de waveform em `width` pixels.
 * Usa canal 0 (mono) ou primeiro canal.
 */
export function getPeaksFromBuffer(
  buffer: AudioBuffer,
  width: number,
  channelIndex = 0
): { min: Float32Array; max: Float32Array } {
  const channel = buffer.getChannelData(
    Math.min(channelIndex, buffer.numberOfChannels - 1)
  );
  return computePeaks(channel, width);
}

/**
 * Opções para playback com efeitos (fade in/out, cut in/out).
 */
export type PlaybackOptions = {
  /** Fade in em segundos (0 = sem fade) */
  fadeInSec?: number;
  /** Fade out em segundos (0 = sem fade) */
  fadeOutSec?: number;
  /** Início do trecho (cut in) em segundos */
  startSec?: number;
  /** Fim do trecho (cut out) em segundos; undefined = fim do buffer */
  endSec?: number;
};

/**
 * Cria grafo de playback: BufferSource → GainNode → destination.
 * Fade in/out via automação do GainNode (linearRampToValueAtTime).
 * Cut via source.start(0, offset) e source.stop(endTime).
 * BufferSource só pode ser iniciado uma vez; esta função inicia e retorna handle para stop/disconnect.
 */
export function createPlaybackGraph(
  buffer: AudioBuffer,
  options: PlaybackOptions = {}
): {
  gainNode: GainNode;
  source: AudioBufferSourceNode;
  stop: (when?: number) => void;
  disconnect: () => void;
} {
  const ctx = getAudioContext();
  const { fadeInSec = 0, fadeOutSec = 0, startSec = 0, endSec } = options;

  const duration = buffer.duration;
  const start = Math.max(0, startSec);
  const end = endSec !== undefined ? Math.min(duration, endSec) : duration;
  const playDuration = end - start;

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gainNode = ctx.createGain();
  source.connect(gainNode);
  gainNode.connect(ctx.destination);

  const now = ctx.currentTime;

  gainNode.gain.setValueAtTime(0, now);
  const fadeInEnd = now + (fadeInSec > 0 ? Math.min(fadeInSec, playDuration) : 0);
  if (fadeInEnd > now) {
    gainNode.gain.linearRampToValueAtTime(1, fadeInEnd);
  } else {
    gainNode.gain.setValueAtTime(1, now);
  }

  const fadeOutStart =
    now + playDuration - (fadeOutSec > 0 ? Math.min(fadeOutSec, playDuration) : 0);
  if (fadeOutSec > 0 && fadeOutStart < now + playDuration) {
    gainNode.gain.setValueAtTime(gainNode.gain.value, fadeOutStart);
    gainNode.gain.linearRampToValueAtTime(0, now + playDuration);
  }

  source.start(now, start);
  source.stop(now + playDuration);

  return {
    gainNode,
    source,
    stop: (when?: number): void => {
      source.stop(when ?? ctx.currentTime);
    },
    disconnect: (): void => {
      try {
        source.disconnect();
        gainNode.disconnect();
      } catch {
        // already disconnected
      }
    },
  };
}

/**
 * Cria AnalyserNode para espectrograma (FFT no tempo).
 * Conectar entre source e destination; usar getByteFrequencyData em requestAnimationFrame.
 */
export function createAnalyser(fftSize = DEFAULT_FFT_SIZE): AnalyserNode {
  const ctx = getAudioContext();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = fftSize;
  analyser.smoothingTimeConstant = 0.8;
  return analyser;
}

/** Um mesmo HTMLMediaElement só pode ter um MediaElementSourceNode; cache por elemento. */
const mediaSourceCache = new WeakMap<
  HTMLMediaElement,
  { source: MediaElementAudioSourceNode; analyser: AnalyserNode }
>();

/**
 * Retorna (ou cria) o grafo source → analyser → destination para um elemento de áudio.
 * Partilha o analyser com espectrograma e medidores de nível.
 */
export function getOrCreateMediaGraph(
  audioElement: HTMLMediaElement
): { source: MediaElementAudioSourceNode; analyser: AnalyserNode } {
  const cached = mediaSourceCache.get(audioElement);
  if (cached !== undefined) return cached;
  const ctx = getAudioContext();
  const source = ctx.createMediaElementSource(audioElement);
  const analyser = createAnalyser(2048);
  source.connect(analyser);
  analyser.connect(ctx.destination);
  mediaSourceCache.set(audioElement, { source, analyser });
  return { source, analyser };
}

export type { MinMax } from "./peaks";
