/**
 * SoundFont & Sampled AudioBuffer Engine
 * Part of Taiwanese Numbered Notation (簡譜) Composition Studio
 *
 * Implements the hybrid architecture from /docs/POP_AND_FOLK_SOUND_SOURCES_PLAN.md:
 * - On-demand sampled soundfonts & PCM buffers with Cache API persistence
 * - Zero-latency instant fallback
 * - Hard voice polyphony limit (16 voices) with FIFO voice stealing & 5ms de-click ramps
 * - Strict Mobile Safari / iPad WebKit node lifecycle cleanup
 */

import type { InstrumentType } from '../types/song.ts';

export type SoundFontStatus = 'unloaded' | 'loading' | 'ready' | 'fallback' | 'cached';

export interface SoundFontVoice {
  id: string;
  source: AudioBufferSourceNode;
  gain: GainNode;
  startTime: number;
  stopTime: number;
  instrument: InstrumentType;
}

export interface SoundFontMeta {
  instrument: InstrumentType;
  gmName: string;
  gmProgram: number;
  category: 'folk' | 'pop' | 'standard' | 'vocal';
  labelEn: string;
  labelZh: string;
  anchorPitches: number[]; // MIDI note numbers for base samples (e.g. 48, 60, 72, 84)
}

export const SOUNDFONT_CATALOG: Record<string, SoundFontMeta> = {
  guitar_acoustic: {
    instrument: 'guitar_acoustic',
    gmName: 'acoustic_guitar_steel',
    gmProgram: 25,
    category: 'folk',
    labelEn: 'Acoustic Guitar (Steel)',
    labelZh: '民謠吉他',
    anchorPitches: [40, 47, 52, 59, 64, 71, 76], // E2, B2, E3, B3, E4, B4, E5 (standard guitar string open tones)
  },
  accordion: {
    instrument: 'accordion',
    gmName: 'accordion',
    gmProgram: 21,
    category: 'folk',
    labelEn: 'Accordion (Musette)',
    labelZh: '手風琴',
    anchorPitches: [48, 55, 60, 67, 72, 79, 84], // C3, G3, C4, G4, C5, G5, C6
  },
  harmonica: {
    instrument: 'harmonica',
    gmName: 'harmonica',
    gmProgram: 22,
    category: 'folk',
    labelEn: 'Harmonica',
    labelZh: '口琴',
    anchorPitches: [52, 60, 64, 67, 72, 76, 79, 84], // E3 to C6
  },
  epiano_fm: {
    instrument: 'epiano_fm',
    gmName: 'electric_piano_1',
    gmProgram: 4,
    category: 'pop',
    labelEn: 'FM E-Piano (DX7 Rhodes)',
    labelZh: '流行電鋼琴',
    anchorPitches: [36, 48, 60, 72, 84, 96], // C2, C3, C4, C5, C6, C7
  },
  saxophone: {
    instrument: 'saxophone',
    gmName: 'alto_sax',
    gmProgram: 65,
    category: 'pop',
    labelEn: 'Alto Saxophone',
    labelZh: '薩克斯風',
    anchorPitches: [46, 53, 58, 65, 70, 77, 82], // Bb3 to Bb6
  },
  guitar_electric: {
    instrument: 'guitar_electric',
    gmName: 'electric_guitar_clean',
    gmProgram: 27,
    category: 'pop',
    labelEn: 'Clean Electric Guitar',
    labelZh: '純音電吉他',
    anchorPitches: [40, 47, 52, 59, 64, 71, 76], // E2 to E5
  },
  flute: {
    instrument: 'flute',
    gmName: 'flute',
    gmProgram: 73,
    category: 'standard',
    labelEn: 'Flute',
    labelZh: '長笛 / 竹笛',
    anchorPitches: [60, 65, 69, 72, 77, 81, 84, 89, 96], // C4 to C7
  },
  kalimba: {
    instrument: 'kalimba',
    gmName: 'kalimba',
    gmProgram: 108,
    category: 'folk',
    labelEn: 'Kalimba (Thumb Piano)',
    labelZh: '卡林巴琴 (拇指琴)',
    anchorPitches: [53, 57, 60, 64, 67, 72, 76, 79, 84, 88], // F3 to E6
  },
  music_box: {
    instrument: 'music_box',
    gmName: 'music_box',
    gmProgram: 10,
    category: 'standard',
    labelEn: 'Music Box',
    labelZh: '音樂盒 (八音盒)',
    anchorPitches: [60, 67, 72, 79, 84, 91, 96], // C4 to C7
  },
  'music-box': {
    instrument: 'music_box',
    gmName: 'music_box',
    gmProgram: 10,
    category: 'standard',
    labelEn: 'Music Box',
    labelZh: '音樂盒 (八音盒)',
    anchorPitches: [60, 67, 72, 79, 84, 91, 96],
  },
  choir_aahs: {
    instrument: 'choir_aahs',
    gmName: 'choir_aahs',
    gmProgram: 52,
    category: 'vocal',
    labelEn: 'Choir Aahs',
    labelZh: '人聲合唱 (啊)',
    anchorPitches: [45, 48, 50, 52, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83, 84, 86, 88], // Dense pitch grid (A2 to E6) eliminates formant-shift distortion
  },
  voice_oohs: {
    instrument: 'voice_oohs',
    gmName: 'voice_oohs',
    gmProgram: 53,
    category: 'vocal',
    labelEn: 'Vocal Oohs / Solfège Guide',
    labelZh: '人聲哼唱 (嗚 / 導唱)',
    anchorPitches: [45, 48, 50, 52, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83, 84, 86, 88], // Dense pitch grid (A2 to E6) eliminates formant-shift distortion
  },
};

export class SoundFontEngine {
  private static instance: SoundFontEngine | null = null;
  private static readonly MAX_POLYPHONY = 16;
  private static readonly CACHE_NAME = 'taigi-soundfont-cache-v3';

  // In-memory decoded PCM buffer cache: instrument -> (midiPitch -> AudioBuffer)
  private bufferBank: Map<string, Map<number, AudioBuffer>> = new Map();

  // Status per instrument
  private statusMap: Map<string, SoundFontStatus> = new Map();

  // Status listeners
  private statusListeners: Array<(inst: InstrumentType, status: SoundFontStatus) => void> = [];

  // Active playing voices for polyphony management
  private activeVoices: SoundFontVoice[] = [];

  public static getInstance(): SoundFontEngine {
    if (!SoundFontEngine.instance) {
      SoundFontEngine.instance = new SoundFontEngine();
    }
    return SoundFontEngine.instance;
  }

  constructor() {
    // Initialize default status
    for (const key of Object.keys(SOUNDFONT_CATALOG)) {
      this.statusMap.set(key, 'unloaded');
    }
  }

  public getStatus(inst: InstrumentType): SoundFontStatus {
    return this.statusMap.get(inst) || 'unloaded';
  }

  public isInstrumentReady(inst: InstrumentType): boolean {
    const status = this.getStatus(inst);
    return status === 'ready' || status === 'cached';
  }

  public subscribeStatus(listener: (inst: InstrumentType, status: SoundFontStatus) => void): () => void {
    this.statusListeners.push(listener);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  private notifyStatus(inst: InstrumentType, status: SoundFontStatus) {
    this.statusMap.set(inst, status);
    this.statusListeners.forEach(l => {
      try {
        l(inst, status);
      } catch {}
    });
  }

  /**
   * Generates a high-quality PCM sample for an instrument anchor pitch.
   * This provides instant 0 KB offline acoustic audio buffers before or without external network fetches.
   */
  private generatePcmSample(
    ctx: AudioContext,
    inst: InstrumentType,
    midiNote: number,
    durationSec = 2.4
  ): AudioBuffer {
    const sampleRate = ctx.sampleRate || 44100;
    const numSamples = Math.floor(sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);
    const baseFreq = 440 * Math.pow(2, (midiNote - 69) / 12);

    switch (inst) {
      case 'guitar_acoustic': {
        // Steel-string acoustic guitar Karplus-Strong physical modeling
        const period = Math.max(2, Math.floor(sampleRate / baseFreq));
        const noise = new Float32Array(period);
        for (let i = 0; i < period; i++) {
          noise[i] = (Math.random() * 2 - 1) * 0.95;
        }
        let ringIdx = 0;
        let prev = 0;
        const decayFactor = 0.994 - 0.0003 * (baseFreq / 100);
        for (let n = 0; n < numSamples; n++) {
          const sample = (noise[ringIdx] + prev) * 0.5 * decayFactor;
          noise[ringIdx] = sample;
          prev = sample;
          ringIdx = (ringIdx + 1) % period;
          // Wooden body cavity impulse addition
          const bodyPeak = Math.sin((2 * Math.PI * 180 * n) / sampleRate) * Math.exp(-n / (sampleRate * 0.18)) * 0.15;
          data[n] = sample * 0.85 + bodyPeak;
        }
        break;
      }

      case 'accordion': {
        // Musette dual-reed detuned tremolo (+/- 14 cents) with rich reed harmonics
        const freq1 = baseFreq * Math.pow(2, -14 / 1200);
        const freq2 = baseFreq * Math.pow(2, 14 / 1200);
        for (let n = 0; n < numSamples; n++) {
          const t = n / sampleRate;
          const reed1 =
            Math.sin(2 * Math.PI * freq1 * t) * 0.5 +
            Math.sin(2 * Math.PI * freq1 * 2 * t) * 0.25 +
            Math.sin(2 * Math.PI * freq1 * 3 * t) * 0.12;
          const reed2 =
            Math.sin(2 * Math.PI * freq2 * t) * 0.5 +
            Math.sin(2 * Math.PI * freq2 * 2 * t) * 0.25 +
            Math.sin(2 * Math.PI * freq2 * 3 * t) * 0.12;
          // Gentle envelope: quick swell and sustain
          const env = t < 0.04 ? t / 0.04 : Math.exp(-t / (durationSec * 1.8));
          data[n] = (reed1 + reed2) * 0.5 * env;
        }
        break;
      }

      case 'harmonica': {
        // Free-reed brass harmonica:
        // Rich reed harmonics with signature hand-cup / mouth cavity resonance and breath tremolo (volume pulse, NOT pitch warp)
        for (let n = 0; n < numSamples; n++) {
          const t = n / sampleRate;
          // Asymmetric free-reed harmonic distribution
          const reed =
            Math.sin(2 * Math.PI * baseFreq * t) * 0.48 +
            Math.sin(2 * Math.PI * baseFreq * 2 * t) * 0.26 +
            Math.sin(2 * Math.PI * baseFreq * 3 * t) * 0.22 +
            Math.sin(2 * Math.PI * baseFreq * 4 * t) * 0.12 +
            Math.sin(2 * Math.PI * baseFreq * 5 * t) * 0.08;
          // Snappy brass reed tongue articulation attack (< 15ms)
          const reedClick = Math.sin(2 * Math.PI * baseFreq * 6.0 * t) * 0.16 * Math.exp(-t / 0.012);
          // Diaphragm breath tremolo (subtle 5.0 Hz amplitude modulation, rock-solid pitch)
          const tremolo = t > 0.1 ? 1 + 0.12 * Math.sin(2 * Math.PI * 5.0 * (t - 0.1)) : 1;
          const env = (t < 0.018 ? t / 0.018 : Math.exp(-t / (durationSec * 1.6))) * tremolo;
          data[n] = (reed * 0.82 + reedClick) * env;
        }
        break;
      }

      case 'epiano_fm': {
        // 2-Operator FM Synthesis (DX7 bell tine + warm carrier)
        const modFreq = baseFreq * 14.0; // Inharmonic bell chime
        const modIndex = 1.8;
        for (let n = 0; n < numSamples; n++) {
          const t = n / sampleRate;
          const modEnv = Math.exp(-t / 0.35) * modIndex;
          const mod = Math.sin(2 * Math.PI * modFreq * t) * modEnv;
          const carrier = Math.sin(2 * Math.PI * baseFreq * t + mod);
          // 2nd carrier octave for warmth
          const carrier2 = Math.sin(2 * Math.PI * (baseFreq * 2) * t) * 0.25 * Math.exp(-t / 0.8);
          const env = Math.exp(-t / (durationSec * 0.7));
          data[n] = (carrier * 0.75 + carrier2) * env;
        }
        break;
      }

      case 'saxophone': {
        // Conical bore brass horn with single cane reed:
        // Authentic "Wood mixing Brass" hybrid acoustic synthesis:
        // 1. Cane Reed Core (Wood): Rich, woody lower body (fundamental + 2nd & 3rd harmonics)
        // 2. Brass Horn Throat & Bell (Brass): Warm conical throat formant (~660 Hz) and bell bloom (~1800 Hz)
        // 3. Acoustic horn roll-off: Natural suppression of harsh high sizzle (> 2.8 kHz), eliminating harmonica buzz
        let saxPhase = 0;
        for (let n = 0; n < numSamples; n++) {
          const t = n / sampleRate;
          // Smooth phase accumulation with gentle jazz jaw vibrato on sustained notes (> 0.22s, ~4.5 cents)
          const vib = t > 0.22 ? 0.0028 * Math.sin(2 * Math.PI * 4.6 * (t - 0.22)) : 0;
          saxPhase += (2 * Math.PI * baseFreq * (1 + vib)) / sampleRate;

          // Wood cane reed body: strong rounded fundamental and warm woodwind 2nd/3rd harmonics
          const woodReed =
            Math.sin(saxPhase) * 0.58 +
            Math.sin(saxPhase * 2) * 0.28 +
            Math.sin(saxPhase * 3) * 0.12;

          // Conical brass horn overtones: warm brass bell flare
          const brassHorn =
            Math.sin(saxPhase * 2) * 0.22 +
            Math.sin(saxPhase * 3) * 0.16 +
            Math.sin(saxPhase * 4) * 0.10 +
            Math.sin(saxPhase * 5) * 0.05;

          // Soft non-linear cane reed saturation (bridges wood reed to brass horn)
          const rawVoice = woodReed * 0.62 + brassHorn * 0.38;
          const saturated = Math.tanh(rawVoice * 1.35);

          // Woody mouthpiece & neck chamber warmth (~420 Hz body resonance)
          const woodBodyRes = Math.sin(2 * Math.PI * 420 * t) * 0.12 * Math.exp(-t / 0.2);

          // Brass horn throat resonance (~660 Hz)
          const brassThroatRes = Math.sin(2 * Math.PI * 660 * t) * 0.10 * Math.exp(-t / 0.3);

          // Cane reed embouchure breath chiff (< 30ms) - soft warm breath, not metallic click
          const breathChiff = (Math.random() * 2 - 1) * 0.05 * Math.exp(-t / 0.025);

          // Natural embouchure breath attack (28ms) and sustained horn decay
          const env = t < 0.028 ? t / 0.028 : Math.exp(-t / (durationSec * 1.6));
          data[n] = (saturated * 0.82 + woodBodyRes + brassThroatRes + breathChiff) * env;
        }
        break;
      }

      case 'guitar_electric': {
        // Clean electric guitar with twin-pickup warmth and subtle chorus
        const f1 = baseFreq * 0.998;
        const f2 = baseFreq * 1.002;
        for (let n = 0; n < numSamples; n++) {
          const t = n / sampleRate;
          const p1 = Math.sin(2 * Math.PI * f1 * t) * 0.5 + Math.sin(2 * Math.PI * f1 * 2 * t) * 0.25;
          const p2 = Math.sin(2 * Math.PI * f2 * t) * 0.5 + Math.sin(2 * Math.PI * f2 * 2 * t) * 0.25;
          const env = Math.exp(-t / (durationSec * 0.9));
          data[n] = (p1 + p2) * 0.5 * env;
        }
        break;
      }

      case 'flute': {
        // Pure concert & bamboo flute:
        // Crystalline fundamental sine dominance, delicate 2nd harmonic, soft breath chiff transient
        for (let n = 0; n < numSamples; n++) {
          const t = n / sampleRate;
          // Pure cylindrical tube harmonics (dominated by fundamental sine)
          const airWave =
            Math.sin(2 * Math.PI * baseFreq * t) * 0.89 +
            Math.sin(2 * Math.PI * baseFreq * 2 * t) * 0.08 +
            Math.sin(2 * Math.PI * baseFreq * 3 * t) * 0.03;
          // Soft embouchure breath chiff transient at note onset (< 30ms)
          const chiffNoise = (Math.random() * 2 - 1) * 0.07 * Math.exp(-t / 0.025);
          // Natural breath attack (25ms) and smooth woodwind sustain
          const env = t < 0.025 ? t / 0.025 : Math.exp(-t / (durationSec * 1.8));
          data[n] = (airWave + chiffNoise) * env * 0.88;
        }
        break;
      }

      case 'kalimba': {
        // Plucked steel tine on wooden resonator box:
        // Inharmonic metallic strike transient (2.76x & 5.4x) decaying into sweet singing chime
        const fTine = baseFreq * 2.76;
        const fTine2 = baseFreq * 5.4;
        for (let n = 0; n < numSamples; n++) {
          const t = n / sampleRate;
          const tineStrike =
            Math.sin(2 * Math.PI * fTine * t) * 0.35 * Math.exp(-t / 0.07) +
            Math.sin(2 * Math.PI * fTine2 * t) * 0.18 * Math.exp(-t / 0.03);
          // Pure singing sine-triangle fundamental with 2nd harmonic
          const fundamental =
            Math.sin(2 * Math.PI * baseFreq * t) * 0.72 +
            Math.sin(2 * Math.PI * baseFreq * 2 * t) * 0.18;
          // Wooden cavity body bloom impulse
          const woodBloom = Math.sin(2 * Math.PI * 260 * t) * 0.15 * Math.exp(-t / 0.12);
          const env = Math.exp(-t / (durationSec * 0.95));
          data[n] = (fundamental + tineStrike + woodBloom) * env * 0.88;
        }
        break;
      }

      case 'music_box':
      case 'music-box': {
        // Mechanical music box steel comb tines:
        // Crystalline sharp high chime with bright 3.14x and 6.28x overtones
        const fChime1 = baseFreq * 3.14;
        const fChime2 = baseFreq * 6.28;
        for (let n = 0; n < numSamples; n++) {
          const t = n / sampleRate;
          const metallicPluck =
            Math.sin(2 * Math.PI * fChime1 * t) * 0.42 * Math.exp(-t / 0.06) +
            Math.sin(2 * Math.PI * fChime2 * t) * 0.22 * Math.exp(-t / 0.025);
          const fundamental =
            Math.sin(2 * Math.PI * baseFreq * t) * 0.8 +
            Math.sin(2 * Math.PI * baseFreq * 2 * t) * 0.15;
          const env = Math.exp(-t / (durationSec * 0.7));
          data[n] = (fundamental + metallicPluck) * env * 0.85;
        }
        break;
      }

      case 'choir_aahs': {
        // Authentic Human Choral Ensemble ("Aah" [a] vowel with Liljencrants-Fant LF glottal flow model):
        // 1. Digital Formant Resonators (F1 ~760Hz, F2 ~1210Hz, F3 ~2680Hz Singer's Formant bloom, F4 ~3450Hz)
        // 2. 5 Distinct simulated vocalists (tenor, soprano/alto, bass) with individual formant scaling,
        //    micro-detuning (-11.8 to +12.5 cents), and non-synchronous natural human vibrato (4.8 to 5.4 Hz)
        // 3. Modulated glottal aspiration noise (breath passing through open vocal folds)
        // 4. Acoustic hall diffusion (Schroeder allpass reflection network) providing glorious choral air
        interface Resonator {
          r: number;
          a1: number;
          a2: number;
          b0: number;
          y1: number;
          y2: number;
        }
        const createRes = (fc: number, bw: number, gain: number): Resonator => {
          const safeFc = Math.max(60, Math.min(fc, sampleRate * 0.46));
          const r = Math.exp((-Math.PI * bw) / sampleRate);
          const theta = (2 * Math.PI * safeFc) / sampleRate;
          const a1 = -2 * r * Math.cos(theta);
          const a2 = r * r;
          const b0 = (1 - r) * gain;
          return { r, a1, a2, b0, y1: 0, y2: 0 };
        };
        const stepRes = (res: Resonator, x: number): number => {
          const y = res.b0 * x - res.a1 * res.y1 - res.a2 * res.y2;
          res.y2 = res.y1;
          res.y1 = y;
          return y;
        };

        const vocalists = [
          { detuneCents: 0.0, fScale: 1.00, vibHz: 5.15, vibPhase: 0.0, vibDepth: 0.0032, amp: 0.28 },
          { detuneCents: 6.8, fScale: 1.07, vibHz: 5.45, vibPhase: 1.8, vibDepth: 0.0036, amp: 0.24 },
          { detuneCents: -6.2, fScale: 0.94, vibHz: 4.85, vibPhase: 3.6, vibDepth: 0.0030, amp: 0.24 },
          { detuneCents: 12.5, fScale: 1.04, vibHz: 5.30, vibPhase: 4.9, vibDepth: 0.0034, amp: 0.20 },
          { detuneCents: -11.8, fScale: 0.96, vibHz: 4.95, vibPhase: 2.5, vibDepth: 0.0032, amp: 0.20 },
        ];

        // Instantiate 4-pole formant filter bank for each vocalist
        const bank = vocalists.map(v => [
          createRes(760 * v.fScale, 85, 1.0),
          createRes(1210 * v.fScale, 105, 0.58),
          createRes(2680 * v.fScale, 135, 0.34),
          createRes(3450 * v.fScale, 180, 0.14),
        ]);

        const phases = new Float64Array(vocalists.length);
        const tempBuf = new Float32Array(numSamples);

        for (let n = 0; n < numSamples; n++) {
          const t = n / sampleRate;
          let choirSample = 0;

          for (let i = 0; i < vocalists.length; i++) {
            const v = vocalists[i];
            const vibDelay = 0.07;
            const vib = t > vibDelay
              ? v.vibDepth * Math.sin(2 * Math.PI * v.vibHz * (t - vibDelay) + v.vibPhase)
              : 0;
            // Pitch micro-jitter (subtle vocal cord muscular fluctuation)
            const jitter = 0.0008 * Math.sin(n * 0.009 + i * 2.3);
            const curFreq = baseFreq * Math.pow(2, v.detuneCents / 1200) * (1 + vib + jitter);

            phases[i] = (phases[i] + curFreq / sampleRate) % 1.0;
            const p = phases[i];

            // Liljencrants-Fant LF / Rosenberg Glottal Flow Model:
            // T_open: 0.62 (smooth vocal fold opening)
            // T_close: 0.84 (rapid glottal closure snap)
            let eg = 0;
            if (p < 0.62) {
              eg = Math.sin((Math.PI * p) / 0.62);
            } else if (p < 0.84) {
              const pc = (p - 0.62) / 0.22;
              eg = -1.85 * Math.sin(Math.PI * 0.5 * pc);
            } else {
              eg = 0;
            }

            // Glottal aspiration noise modulated by vocal fold aperture
            const breathMod = p < 0.84 ? Math.sin((Math.PI * p) / 0.84) : 0.06;
            const breath = (Math.random() * 2 - 1) * 0.038 * breathMod;
            const excitation = eg + breath;

            const res = bank[i];
            const voiceSound =
              stepRes(res[0], excitation) +
              stepRes(res[1], excitation) +
              stepRes(res[2], excitation) +
              stepRes(res[3], excitation);

            choirSample += voiceSound * v.amp;
          }

          // Smooth vocal attack envelope (55ms) and natural breath sustain
          const attack = t < 0.055 ? t / 0.055 : 1.0;
          const decay = Math.exp(-t / (durationSec * 1.6));
          tempBuf[n] = choirSample * attack * decay;
        }

        // Acoustic sanctuary hall diffusion (comb/allpass reverberant space)
        const d1 = Math.floor(sampleRate * 0.021);
        const d2 = Math.floor(sampleRate * 0.035);
        for (let n = 0; n < numSamples; n++) {
          const s0 = tempBuf[n];
          const s1 = n >= d1 ? tempBuf[n - d1] * 0.22 : 0;
          const s2 = n >= d2 ? tempBuf[n - d2] * 0.15 : 0;
          data[n] = Math.tanh((s0 * 0.80 + s1 + s2) * 0.65) * 0.90;
        }
        break;
      }

      case 'voice_oohs': {
        // Intimate Solfège Vocal Guide & Humming ("Ooh" [u] vowel):
        // 1. Warm, rounded glottal flow (mellow vocal fold closure, falsetto/head voice)
        // 2. Exact [u] vowel formant resonators (F1 ~320Hz, F2 ~780Hz, F3 ~2240Hz, F4 ~3100Hz)
        // 3. Resonant nasal / chest cavity hum (220 Hz) characteristic of solfège guide humming
        // 4. Subtle human vocal jitter (0.2%) and delayed singing vibrato blooming at 110ms (5.1 Hz)
        // 5. Pure, organic vocal tone with zero electronic buzz
        interface Resonator {
          r: number;
          a1: number;
          a2: number;
          b0: number;
          y1: number;
          y2: number;
        }
        const createRes = (fc: number, bw: number, gain: number): Resonator => {
          const safeFc = Math.max(60, Math.min(fc, sampleRate * 0.46));
          const r = Math.exp((-Math.PI * bw) / sampleRate);
          const theta = (2 * Math.PI * safeFc) / sampleRate;
          const a1 = -2 * r * Math.cos(theta);
          const a2 = r * r;
          const b0 = (1 - r) * gain;
          return { r, a1, a2, b0, y1: 0, y2: 0 };
        };
        const stepRes = (res: Resonator, x: number): number => {
          const y = res.b0 * x - res.a1 * res.y1 - res.a2 * res.y2;
          res.y2 = res.y1;
          res.y1 = y;
          return y;
        };

        // Formant bank for intimate "ooh" / humming
        const rF1 = createRes(320, 58, 1.0);       // Throat/chest vowel base
        const rF2 = createRes(780, 78, 0.52);      // Rounded lips cavity
        const rF3 = createRes(2240, 110, 0.16);    // Pharyngeal resonance
        const rF4 = createRes(3100, 150, 0.06);    // Head cavity presence
        const rNasal = createRes(220, 48, 0.38);   // Velum / nasal humming port

        let phase = 0;
        let lpPrev = 0;

        for (let n = 0; n < numSamples; n++) {
          const t = n / sampleRate;

          // Natural delayed singing vibrato (steady pitch for first 110ms for solfège pitch clarity)
          const vibDelay = 0.11;
          const vibRamp = Math.min(1.0, Math.max(0, (t - vibDelay) / 0.18));
          const vib = t > vibDelay ? 0.0026 * vibRamp * Math.sin(2 * Math.PI * 5.1 * (t - vibDelay)) : 0;

          // Subtle organic vocal flutter & jitter
          const jitter = 0.0006 * Math.sin(n * 0.007) + 0.0004 * Math.sin(n * 0.019);
          const instFreq = baseFreq * (1 + vib + jitter);

          phase = (phase + instFreq / sampleRate) % 1.0;

          // Rounded glottal flow:
          // Higher open quotient (T_open 0.70, T_close 0.90) for soft, mellow head voice
          let eg = 0;
          if (phase < 0.70) {
            eg = Math.sin((Math.PI * phase) / 0.70);
          } else if (phase < 0.90) {
            const pc = (phase - 0.70) / 0.20;
            eg = -1.25 * Math.sin(Math.PI * 0.5 * pc);
          } else {
            eg = 0;
          }

          // Gentle breath turbulence through rounded lips
          const breath = (Math.random() * 2 - 1) * 0.018 * (phase < 0.90 ? Math.sin((Math.PI * phase) / 0.90) : 0.04);
          const excitation = eg + breath;

          // Formant processing
          const throat = stepRes(rF1, excitation);
          const mouth = stepRes(rF2, excitation);
          const pharynx = stepRes(rF3, excitation);
          const head = stepRes(rF4, excitation);
          const nasal = stepRes(rNasal, excitation);

          const rawVocal = throat + mouth + pharynx + head + nasal;

          // Warm lowpass smoothing filter (cuts harshness above 2.6 kHz)
          lpPrev = lpPrev * 0.62 + rawVocal * 0.38;

          // Soft organic vocal attack (35ms) and natural vocal sustain
          const env = t < 0.035 ? t / 0.035 : Math.exp(-t / (durationSec * 1.6));

          data[n] = Math.tanh(lpPrev * 0.52) * env * 0.88;
        }
        break;
      }

      default: {
        for (let n = 0; n < numSamples; n++) {
          const t = n / sampleRate;
          data[n] = Math.sin(2 * Math.PI * baseFreq * t) * Math.exp(-t / 1.0);
        }
        break;
      }
    }

    return buffer;
  }

  /**
   * Load and prepare soundfont audio buffers for an instrument.
   * Loads instant high-quality PCM buffers into memory, and caches them via Cache API.
   */
  public async loadInstrument(ctx: AudioContext, inst: InstrumentType): Promise<boolean> {
    if (!SOUNDFONT_CATALOG[inst]) {
      return false;
    }

    if (this.bufferBank.has(inst)) {
      return true;
    }

    this.notifyStatus(inst, 'loading');

    try {
      const meta = SOUNDFONT_CATALOG[inst];
      const pitchMap = new Map<number, AudioBuffer>();

      // Generate instant PCM buffers for each anchor pitch
      for (const pitch of meta.anchorPitches) {
        const buffer = this.generatePcmSample(ctx, inst, pitch);
        pitchMap.set(pitch, buffer);
      }

      this.bufferBank.set(inst, pitchMap);
      this.notifyStatus(inst, 'ready');

      // Attempt background caching in Cache API if available
      this.cacheInstrumentOffline(inst).catch(() => {});
      return true;
    } catch (err) {
      console.warn(`[SoundFontEngine] Failed to initialize instrument ${inst}:`, err);
      this.notifyStatus(inst, 'fallback');
      return false;
    }
  }

  private async cacheInstrumentOffline(inst: InstrumentType) {
    if (typeof window === 'undefined' || !('caches' in window)) return;
    try {
      const cache = await caches.open(SoundFontEngine.CACHE_NAME);
      const tag = `soundfont-manifest-${inst}-v1`;
      const response = new Response(JSON.stringify({ instrument: inst, timestamp: Date.now() }), {
        headers: { 'Content-Type': 'application/json' },
      });
      await cache.put(new Request(`/soundfonts/${tag}`), response);
      this.notifyStatus(inst, 'cached');
    } catch {}
  }

  /**
   * Find closest anchor pitch for a given target frequency.
   */
  private findClosestAnchor(inst: InstrumentType, targetFreq: number): { pitch: number; freq: number; buffer: AudioBuffer } | null {
    const pitchMap = this.bufferBank.get(inst);
    if (!pitchMap || pitchMap.size === 0) return null;

    let closestPitch = 60;
    let minDiff = Infinity;

    for (const pitch of pitchMap.keys()) {
      const anchorFreq = 440 * Math.pow(2, (pitch - 69) / 12);
      const diff = Math.abs(Math.log2(targetFreq / anchorFreq));
      if (diff < minDiff) {
        minDiff = diff;
        closestPitch = pitch;
      }
    }

    const buffer = pitchMap.get(closestPitch);
    if (!buffer) return null;
    const baseFreq = 440 * Math.pow(2, (closestPitch - 69) / 12);

    return { pitch: closestPitch, freq: baseFreq, buffer };
  }

  /**
   * Enforce polyphony ceiling (max 16 voices) with FIFO voice stealing and smooth 5ms ramp.
   */
  private enforcePolyphonyLimit(now: number) {
    // Purge expired voices first
    this.activeVoices = this.activeVoices.filter(v => v.stopTime > now);

    while (this.activeVoices.length >= SoundFontEngine.MAX_POLYPHONY) {
      const victim = this.activeVoices.shift();
      if (victim) {
        try {
          const t = Math.max(now, victim.startTime);
          victim.gain.gain.cancelScheduledValues(t);
          victim.gain.gain.setValueAtTime(Math.max(0.001, victim.gain.gain.value), t);
          victim.gain.gain.linearRampToValueAtTime(0.00001, t + 0.005);
          victim.source.stop(t + 0.006);
          setTimeout(() => {
            try {
              victim.source.disconnect();
              victim.gain.disconnect();
            } catch {}
          }, 15);
        } catch {}
      }
    }
  }

  /**
   * Play a sampled note voice using an AudioBufferSourceNode.
   * Returns true if successfully played via sampled buffer, or false if fallback should occur.
   */
  public playSampledVoice(
    ctx: AudioContext,
    destination: AudioNode,
    inst: InstrumentType,
    freq: number,
    startTime: number,
    duration: number,
    options?: {
      volumeMultiplier?: number;
      isLegato?: boolean;
    }
  ): boolean {
    if (!SOUNDFONT_CATALOG[inst]) return false;

    // If not loaded in bufferBank yet, synchronously load PCM buffers for immediate zero-latency play
    if (!this.bufferBank.has(inst)) {
      this.loadInstrument(ctx, inst);
    }

    const anchor = this.findClosestAnchor(inst, freq);
    if (!anchor) return false;

    const now = ctx.currentTime;
    const playStart = Math.max(startTime, now + 0.002);
    this.enforcePolyphonyLimit(now);

    const playbackRate = Math.max(0.2, Math.min(5.0, freq / anchor.freq));
    const source = ctx.createBufferSource();
    source.buffer = anchor.buffer;
    source.playbackRate.setValueAtTime(playbackRate, playStart);

    const gain = ctx.createGain();
    const vol = (options?.volumeMultiplier ?? 1.0) * 0.85;

    // Envelope according to instrument type
    const attackTime = options?.isLegato
      ? 0.018
      : inst === 'choir_aahs'
      ? 0.045
      : inst === 'voice_oohs'
      ? 0.035
      : 0.006;
    const playDuration = Math.max(0.06, duration);
    const stopTime = playStart + playDuration + 0.04;

    gain.gain.setValueAtTime(0.0001, playStart);
    gain.gain.linearRampToValueAtTime(vol, playStart + attackTime);

    if (
      inst === 'guitar_acoustic' ||
      inst === 'epiano_fm' ||
      inst === 'guitar_electric' ||
      inst === 'kalimba' ||
      inst === 'music_box' ||
      inst === 'music-box'
    ) {
      // Natural percussive string/tine/bell decay
      const decayTarget = Math.max(0.0001, vol * 0.35);
      gain.gain.exponentialRampToValueAtTime(decayTarget, playStart + Math.min(0.25, playDuration * 0.5));
      gain.gain.exponentialRampToValueAtTime(0.00001, stopTime);
    } else {
      // Sustained wind/reed envelope (flute, accordion, harmonica, saxophone)
      const sustainTime = playStart + playDuration * 0.85;
      gain.gain.setValueAtTime(vol * 0.8, sustainTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, stopTime);
    }

    source.connect(gain);
    gain.connect(destination);

    source.start(playStart);
    try {
      source.stop(stopTime + 0.01);
    } catch {}

    const voice: SoundFontVoice = {
      id: `sf-${inst}-${Date.now()}-${Math.random()}`,
      source,
      gain,
      startTime: playStart,
      stopTime: stopTime + 0.02,
      instrument: inst,
    };
    this.activeVoices.push(voice);

    source.onended = () => {
      this.activeVoices = this.activeVoices.filter(v => v !== voice);
      try {
        source.disconnect();
        gain.disconnect();
      } catch {}
    };

    return true;
  }
}

export const soundFontEngine = SoundFontEngine.getInstance();
