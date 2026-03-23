# Engine de áudio (Web Audio API)

Referência: [Sports Sounds Pro](https://www.sportssoundspro.com/) – software profissional para eventos ao vivo (waveform, equalizador, trim, fade, etc.).

## Mapa mental: três camadas

| Camada | Quem faz | O quê |
|--------|---------|--------|
| **1. Decodificar** | Web Audio API | `AudioContext.decodeAudioData()` transforma MP3/WAV em `AudioBuffer` (array de samples no tempo). |
| **2. Processar** | Web Audio API + nossa engine | Downsample para peaks (waveform), FFT para espectrograma, `GainNode` para fade, `source.start(0, offset)` para cut. |
| **3. Renderizar** | React + Canvas (ou WebGL) | React organiza a UI; o desenho da onda/spectro é em `<canvas>` (ou WebGL para espectrograma pesado). |

**React não processa áudio.** Ele só controla estado e chama a engine.

---

## Fluxo no código

### Decodificar

```ts
const buffer = await decodeAudioUrl(streamUrl);
const channelData = buffer.getChannelData(0); // onda crua
```

### Waveform (processar + desenhar)

- **Processar:** não desenhar sample a sample. Reduzir resolução: blocos de N samples → min/max por coluna (`getPeaks` / `getPeaksFromBuffer`).
- **Renderizar:** em `useEffect`, desenhar no `CanvasRenderingContext2D` (ou usar wavesurfer.js que já faz isso).

### Espectrograma (frequência no tempo)

- **Processar:** FFT via `AnalyserNode` (`createAnalyser()`), `getByteFrequencyData(frequencyData)` a cada frame.
- **Renderizar:** cada frame = uma linha vertical; eixo Y = frequência, eixo X = tempo; cor = intensidade (mapa térmico). Para performance, considerar WebGL.

### Efeitos: fade e cut

- **Fade in/out:** automação do `GainNode`:
  ```ts
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(1, now + 2); // 2s fade in
  ```
- **Cut (trecho):** `source.start(0, offsetInSeconds)` e `source.stop(endTime)`.
- **Trim permanente (edição não destrutiva):** criar novo `AudioBuffer`, copiar só os samples do trecho desejado.

---

## Arquivos

| Arquivo | Responsabilidade |
|---------|------------------|
| `constants.ts` | FFT size, largura padrão da waveform, duração de fade. |
| `peaks.ts` | Downsample: `getMinMax`, `getPeaks` (min/max por coluna). |
| `audio-engine.ts` | `getAudioContext`, `decodeAudioUrl`, `getPeaksFromBuffer`, `createPlaybackGraph` (BufferSource → GainNode), `createAnalyser`. |

---

## Uso no UI

- **Waveform “pura” (engine + canvas):** componente `WaveformFromEngine` – usa `decodeAudioUrl` + `getPeaksFromBuffer` e desenha no canvas.
- **Waveform interativa (regiões, envelope):** wavesurfer.js com plugins Regions e Envelope (já integrado em `WaveSurferWaveform`).

Para algo nível Sports Sounds Pro: engine isolada, React só estado, Canvas/WebGL para render, Web Workers para FFT pesado, preload de buffers, fila de disparo rápido.
