"use client";

import React, { useEffect, useRef, useState } from "react";

type VuMetersProps = {
  /** Nível RMS 0–1 do canal (saída de useAudioLevels). */
  level?: number;
  width?: number;
  /** @deprecated Ignorado — altura via CSS flex. */
  height?: number;
  /** Número de segmentos. Padrão 20 para melhor resolução dB. */
  segments?: number;
};

// ── Calibração dBFS ───────────────────────────────────────────────────────────
const DB_FLOOR  = -60;   // piso (silêncio)
const DB_CEIL   =   0;   // teto (clip)
const DB_RANGE  = DB_CEIL - DB_FLOOR;  // 60 dB

// 0 VU padrão broadcast = −18 dBFS  →  zona amarela começa aqui
const DB_YELLOW = -18;
// Zona vermelha a partir de −6 dBFS  (headroom de 6 dB até clip)
const DB_RED    =  -6;

// Peak hold: ms antes de começar a cair
const PEAK_HOLD_MS   = 1500;
// Taxa de decaimento do peak: dB por frame (~60 fps)
const PEAK_DECAY_DB  = 0.25;

/** Converte amplitude linear 0–1 → dBFS */
function toDB(linear: number): number {
  if (linear <= 0) return -Infinity;
  return 20 * Math.log10(linear);
}

/** dBFS → índice de segmento (0 = base, segments-1 = topo) */
function dbToSegment(db: number, segments: number): number {
  const ratio = (Math.max(DB_FLOOR, Math.min(DB_CEIL, db)) - DB_FLOOR) / DB_RANGE;
  return ratio * segments;
}

/**
 * Cor sólida de um segmento activo — gradiente de verde com 5 tons.
 * Verde escuro na base → verde elétrico próximo de 0 VU → âmbar → vermelho.
 */
function segmentColor(db: number): string {
  if (db >= DB_RED)    return "#ff4040";  // vermelho – clip
  if (db >= DB_YELLOW) return "#ffc200";  // âmbar dourado – acima de 0 VU
  // Zona verde: 5 tons interpolados entre DB_FLOOR e DB_YELLOW
  const t = (db - DB_FLOOR) / (DB_YELLOW - DB_FLOOR); // 0 (base) → 1 (0 VU)
  if (t > 0.80) return "#00e676";  // verde elétrico brilhante  (-22 dBFS ~)
  if (t > 0.60) return "#00c853";  // verde vivo                (-30 dBFS ~)
  if (t > 0.40) return "#00a846";  // verde médio               (-36 dBFS ~)
  if (t > 0.20) return "#007d35";  // verde escuro              (-48 dBFS ~)
  return "#005528";                  // verde profundo – zona baixa
}

/** Glow glass de um segmento activo */
function segmentGlow(db: number): string {
  if (db >= DB_RED)    return "0 0 7px 2px rgba(255,64,64,0.75), inset 0 1px 0 rgba(255,180,180,0.25)";
  if (db >= DB_YELLOW) return "0 0 7px 2px rgba(255,194,0,0.70), inset 0 1px 0 rgba(255,240,160,0.25)";
  const t = (db - DB_FLOOR) / (DB_YELLOW - DB_FLOOR);
  if (t > 0.60) return "0 0 6px 2px rgba(0,230,118,0.60), inset 0 1px 0 rgba(180,255,200,0.20)";
  if (t > 0.30) return "0 0 4px 1px rgba(0,200,80,0.45),  inset 0 1px 0 rgba(140,255,160,0.15)";
  return                "0 0 3px 1px rgba(0,150,50,0.30),  inset 0 1px 0 rgba(100,200,120,0.10)";
}

/** Estado independente de um canal (L ou R). */
function useChannel(linear: number) {
  // dBFS do sinal atual
  const db = toDB(linear);

  // peak em dBFS + timestamp em que atingiu esse peak
  const peakDB   = useRef<number>(-Infinity);
  const peakTime = useRef<number>(0);
  const [peakDisplay, setPeakDisplay] = useState<number>(-Infinity);

  useEffect(() => {
    const now = performance.now();
    if (db > peakDB.current) {
      peakDB.current   = db;
      peakTime.current = now;
      setPeakDisplay(db);
    }
  }, [db]);

  // Decaimento do peak via rAF
  useEffect(() => {
    let rafId = 0;
    function decay() {
      const now = performance.now();
      if (now - peakTime.current > PEAK_HOLD_MS) {
        peakDB.current = Math.max(DB_FLOOR, peakDB.current - PEAK_DECAY_DB);
        setPeakDisplay(peakDB.current);
      }
      rafId = requestAnimationFrame(decay);
    }
    rafId = requestAnimationFrame(decay);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return { db, peakDB: peakDisplay };
}

export function VuMeters(props: VuMetersProps): React.ReactElement {
  const { level = 0, width = 22, segments = 20 } = props;

  // L e R com leve diferença para simular estéreo
  const L = useChannel(level);
  const R = useChannel(level * 0.93);

  function renderBar(
    db: number,
    peakDB: number,
    label: string
  ): React.ReactElement {
    // Quantos segmentos estão activos
    const activeCount = Math.ceil(dbToSegment(db, segments));
    // Em qual segmento está o peak marker
    const peakSeg = Math.floor(dbToSegment(peakDB, segments));

    return (
      <div className="vu-meter-channel">
        <div className="vu-meter-bar" style={{ width: `${width}px` }}>
          {Array.from({ length: segments }, (_, i) => {
            // dBFS do centro deste segmento
            const segDB = DB_FLOOR + ((i + 0.5) / segments) * DB_RANGE;
            const filled  = i < activeCount;
            const isPeak  = i === peakSeg && peakDB > DB_FLOOR + 1;

            return (
              <div
                key={i}
                className="vu-meter-segment"
                style={{
                  background: isPeak
                    ? segmentColor(segDB)
                    : filled
                      ? segmentColor(segDB)
                      : "rgba(255,255,255,0.04)",
                  opacity: isPeak
                    ? 1
                    : filled
                      ? 0.92
                      : 1,
                  boxShadow: isPeak || filled ? segmentGlow(segDB) : "none",
                }}
              />
            );
          })}
        </div>
        <span className="vu-meter-label">{label}</span>
      </div>
    );
  }

  return (
    <div className="vu-meters" aria-label="Níveis L/R">
      {renderBar(L.db, L.peakDB, "L")}
      {renderBar(R.db, R.peakDB, "R")}
    </div>
  );
}
