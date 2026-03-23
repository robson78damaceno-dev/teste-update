# Estrutura do frontend (MJC Player)

Estrutura moderna por domínio e responsabilidade, com imports via alias `@/`.

## Diretórios principais

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Layout raiz
│   ├── page.tsx            # Página principal (Server Component)
│   ├── globals.css         # Design system e estilos globais
│   └── page.spec.tsx       # Testes da página
│
├── components/
│   ├── layout/             # Shell da aplicação (header, sidebars, footer)
│   │   ├── AppHeader.tsx
│   │   ├── ScenesSidebar.tsx
│   │   ├── RightSidebar.tsx
│   │   ├── ControlPanel.tsx
│   │   ├── BottomNowPlayingBar.tsx
│   │   ├── FooterBar.tsx
│   │   └── AppMetaTags.tsx
│   │
│   ├── player/             # Domínio do player (touchpad, faixas, waveform)
│   │   ├── TouchpadView.tsx
│   │   ├── NowPlayingBar.tsx
│   │   ├── PadGrid.tsx
│   │   ├── TrackCard.tsx
│   │   ├── FiltersBar.tsx
│   │   ├── VuMeters.tsx
│   │   ├── WaveformFromEngine.tsx
│   │   ├── WaveformCanvas.tsx
│   │   ├── SpectrogramCanvas.tsx
│   │   ├── WaveSurferWaveform.tsx
│   │   └── TrackCard.spec.tsx
│   │
│   └── ui/                  # Componentes reutilizáveis (glass, etc.)
│       └── GlassCard.tsx
│
├── types/                   # Tipos partilhados por domínio
│   └── player.ts            # TrackViewModel, BankId, SceneItem, PlaylistItem
│
├── hooks/
│   └── useAudioLevels.ts
│
└── lib/
    ├── api/                 # Cliente HTTP e helpers
    │   └── tracks-api.ts
    └── audio/               # Motor de áudio (decode, peaks, analyser)
        ├── audio-engine.ts
        ├── peaks.ts
        └── constants.ts
```

## Convenções

- **Imports**: usar alias `@/` (ex.: `@/types/player`, `@/components/layout/AppHeader`, `@/lib/api/tracks-api`).
- **Tipos**: centralizados em `src/types/` por domínio; componentes importam de `@/types/...`.
- **Layout**: componentes de shell em `components/layout/`; não contêm lógica de negócio do player.
- **Player**: toda a UI do touchpad, faixas, waveform e controles em `components/player/`.
- **Named exports**: preferir export nomeado; evitar barrel files (index) fora de `lib`.
