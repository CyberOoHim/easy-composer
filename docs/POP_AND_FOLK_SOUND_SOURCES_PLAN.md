# POP, FOLK & HUMAN SOUND SOURCES & SOUNDFONT ARCHITECTURE PLAN

## 1. Executive Overview & Objectives
This plan defines the architectural roadmap for introducing authentic **Pop**, **Folk**, and **Human Sound (Vocal / Choir / Solfège Guide)** sources to the Taiwanese Numbered Notation (簡譜) Composition Studio.

By pairing lightweight, on-demand sampled soundfonts (General MIDI / open soundbanks) with real-time procedural Web Audio synthesis, the studio gains rich acoustic authenticity while maintaining:
- **Instant load performance**: 0 KB blocking download at application boot.
- **Zero latency**: Immediate responsiveness for tactile keyboard presses and score editing.
- **Solfège guide & vocal harmonization**: Natural human vocal singing (choral "Aahs", intimate "Oohs" / humming) for solfège practice (唱名導唱), counter-melody voicing, and lyrical backing in folk and pop arrangements.
- **100% offline & PWA capability**: Seamless caching via Service Worker and Cache API.
- **Strict legal compliance**: Only permissive, commercially safe open licenses (MIT, CC0/Public Domain).

---

## 2. SoundFont & Engine Architecture: Hybrid Strategy

```
+-------------------------------------------------------------------------+
|                          Playback & Input Layer                         |
|         (Score Playback / Virtual Piano / Tactile Quick-Pad)            |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                  SoundFont & Synthesis Audio Dispatcher                 |
|                        (lib/soundFontEngine.ts)                         |
+------------------+------------------------------------+-----------------+
                   |                                    |
     [SoundFont Loaded & Ready]              [Loading / Fallback / Synth]
                   |                                    |
                   v                                    v
+------------------------------------+ +----------------------------------+
|   Sampled AudioBuffer Player       | |   Procedural Web Audio Engine    |
| - Pre-compressed PCM buffers       | | - Physical modeling / FM synth   |
| - Pitch transposition & looping    | | - Formant vocal filter banks     |
| - Low memory footprint (~120KB/ea) | | - 0 KB download, instant audio   |
| - Choral & acoustic voice buffers  | | - Seamless continuous fallback   |
+------------------------------------+ +----------------------------------+
```

1. **Procedural Web Audio (Instant Fallback & Base Engine)**:
   - Built-in physical modeling, FM synthesis, and multi-formant vocal resonance filter banks (F1–F3 vocal tract filters for "Aah" [a] and "Ooh" [u] vowels with subtle glottal pulses and breath aspiration).
   - Always available offline with 0 KB download.
   - Handles continuous pitch bends, glissandos, and natural vocal vibrato without sample stretching artifacts.
2. **On-Demand Sampled SoundFonts (Acoustic Fidelity)**:
   - High-quality sampled instruments and natural human voice banks fetched asynchronously when selected by the user.
   - Derived from standard GM soundbanks (FluidR3_GM under MIT License, FatBoy under CC0).
   - Each instrument bundle is lightweight (~80 KB to 180 KB gzipped) and stored in local cache upon first load.

---

## 3. Pop, Folk & Human Sound Instrument Comparison & Specification Matrix

| Instrument | Category | Sound Generation Method | Primary Use Case | Licensing & Footprint |
| :--- | :--- | :--- | :--- | :--- |
| **Acoustic Guitar (民謠吉他)** | Folk | **Sampled SoundFont** (`acoustic_guitar_steel`) + Karplus-Strong string pluck fallback | Strummed folk accompaniment, campus folk, acoustic ballad leads | MIT (FluidR3) / ~140 KB |
| **Accordion (手風琴)** | Folk | **Sampled SoundFont** (`accordion`) with detuned musette tremolo dual-reed simulation | Nostalgic Taiwanese harbor ballads (淡水暮色, 港都夜雨), waltzes | MIT (FluidR3) / ~110 KB |
| **Harmonica (口琴)** | Folk | **Sampled SoundFont** (`harmonica`) with dynamic bandpass & breath vibrato | Folk solos, soulful intros, campus folk melodies | MIT (FluidR3) / ~95 KB |
| **Human Voice / Choir Aahs (人聲合唱 "啊")** | Vocal / Pop | **Sampled SoundFont** (`choir_aahs`, GM #52) + parallel 2-formant vowel bandpass fallback | Choral harmony backing, lyrical vocal wash, Taiwanese choral anthems, hymn pads | MIT (FluidR3) / ~135 KB |
| **Vocal Oohs & Humming (人聲哼唱 "嗚" / 導唱)** | Vocal / Folk | **Hybrid**: Formant-filtered glottal pulse (F1 ~300 Hz, F2 ~870 Hz) + sampled (`voice_oohs`, GM #53) | Solfège guide singing (簡譜唱名導唱), nostalgic folk humming intros, gentle counter-melody | Procedural Formant (0 KB) / MIT soundfont (~115 KB) |
| **Rhodes / FM E-Piano (電鋼琴)** | Pop | **Hybrid**: 2-Operator FM Synthesis (DX7 bell tines) + sampled (`electric_piano_1`) | Contemporary Mandopop ballads, R&B grooves, lush chord comping | Procedural FM (0 KB) / MIT soundfont |
| **Saxophone (薩克斯風)** | Pop | **Sampled SoundFont** (`soprano_sax` / `tenor_sax`) with pitch bend and breath envelope | Expressive romantic pop leads, emotive fills, urban pop arrangements | MIT (FluidR3) / ~130 KB |
| **Clean Electric Guitar (電吉他)**| Pop | **Sampled SoundFont** (`electric_guitar_clean`) with stereo chorus and amp emulation | Pop arpeggios, City Pop rhythm tracks, contemporary groove | MIT (FluidR3) / ~120 KB |

---

## 4. Licensing & Distribution Compliance

| Asset / Library | License | Permissions & Obligations |
| :--- | :--- | :--- |
| **FluidR3_GM** | **MIT License** | Free for commercial/non-commercial web use. Covers folk, pop, and vocal soundfonts (`choir_aahs`, `voice_oohs`). Requires preserving author attribution notice in project license/credits. |
| **FatBoy GM** | **CC0 1.0 (Public Domain)** | Fully permissive, dedicated to public domain. Alternative source for GM vocal and choir sample sets. |
| **WebAudioFont Engine** | **MIT License** | Fully permissive, compatible with existing Next.js codebase. |
| **Custom Procedural Synths & Formant Filters** | **MIT License (Project Core)** | No third-party licensing dependencies or external network requests. |

---

## 5. iPad & Mobile Power Optimization (Overheat & CPU Spikes Prevention)

Audio processing on iOS Safari / iPad WebKit requires strict thread and buffer management to prevent high CPU utilization, thermal throttling, and battery drain:

### 1. Strict Voice Polyphony Capping & Voice Stealing
- **Hard Limit**: Cap active audio voices to **16 simultaneous notes** (8 melody + 8 chord accompaniment).
- **FIFO Voice Stealing**: When maximum polyphony is reached, instantly terminate the oldest decaying voice with a 5ms smooth de-click ramp rather than stacking concurrent Web Audio nodes.
- **Node Lifecycle Cleanup**: Call `node.disconnect()` and assign `null` immediately upon `onended` to prevent WebKit internal graph node accumulation and memory leaks.

### 2. AudioBuffer Playback vs Complex Oscillators (CPU Benefit)
- Playing pre-decoded PCM sample buffers (`AudioBufferSourceNode`) uses **significantly less CPU** than synthesizing multiple stacked oscillators, wave-shapers, and real-time biquad filter sweeps.
- Decoded once at initial load and stored in memory: subsequent playback is zero-computation memory streaming handled directly by hardware DMA.

### 3. Lightweight Formant Filtering for Human Voice Fallback
- For procedural vocal synthesis ("Aah" / "Ooh"), restrict real-time filtering to a maximum of **2 parallel BiquadFilterNodes** (F1 and F2 formants) with fixed Q values rather than full 5-formant cascade topologies.
- Apply a soft linear attack (30–50ms) and exponential release (60–100ms) to emulate natural human breath onset without creating transient DC clicks.

### 4. Background / Inactive Tab Auto-Suspension
- Integrate directly with `usePowerSaveMode` (`document.visibilityState` / `window.onblur`):
  - When the iPad user switches apps or locks the screen, immediately invoke `AudioContext.suspend()` to halt the Web Audio clock and hardware DAC interrupts.
  - Resume cleanly (`AudioContext.resume()`) only when the user returns and initiates playback.

### 5. Audio Clock Lookahead & Scheduling Throttling
- Use audio-thread event scheduling with a **35–50ms lookahead window** via `requestAnimationFrame` / metronome timer instead of high-frequency (`<10ms`) `setInterval` polling loops that prevent iPad CPU cores from entering low-power idle states.
- In **Eco Mode** (`usePowerSaveMode`), disable canvas visualizer repaints, drop backdrop blur filters, and switch chord accompaniment to single-voice arpeggio mode.

---

## 6. Phased Implementation Roadmap

### Phase 1: Engine Foundation & SoundFont Cache Manager
- Create `lib/soundFontEngine.ts` to manage audio buffer loading, caching, and voice allocation.
- Integrate with Cache API / Service Worker (`public/sw.js`) to guarantee offline retention after first fetch.
- Implement silent fallback: if an instrument soundfont is loading or unavailable, fallback gracefully to the procedural synthesizer.

### Phase 2: Instrument Type Expansion & Audio Modeling
- Update `types/song.ts` to register new instrument keys:
  - Folk: `guitar_acoustic`, `accordion`, `harmonica`.
  - Pop: `epiano_fm`, `saxophone`, `guitar_electric`.
  - Vocal / Human Sound: `choir_aahs` (人聲合唱 "啊"), `voice_oohs` (人聲哼唱 "嗚" / 導唱).
- Implement dual-formant bandpass filter bank in `lib/audioEngine.ts` for procedural human voice / vowel singing fallback.
- Implement FM synthesis routines in `lib/audioEngine.ts` for DX7-style electric piano and sampled audio buffer routing.
- Wire soundfonts into both melody playback and the Chord Arranger / Accompaniment Engine (`lib/chordArranger.ts`).

### Phase 3: Studio UI & Selection Controls
- Add categorized sections in the instrument selector:
  - **Standard**: Grand Piano, Flute, Cello, Whistle, Bell, Synth.
  - **Folk & Ballad**: Acoustic Guitar, Accordion, Harmonica.
  - **Modern Pop**: FM E-Piano, Clean Electric Guitar, Saxophone.
  - **Vocal & Human Sound**: Choir Aahs (合唱 "啊"), Vocal Oohs / Humming (人聲哼唱 "嗚").
- Add visual loading / cached indicators in the Studio Header and Floating Score HUD.

### Phase 4: Testing & Verification
- Unit test audio buffer loading, fallback safety, and note scheduling.
- Ensure song serialization, URL sharing, and MIDI export remain backward compatible.
- Verify attribution in `LICENSE` file for open-source soundfonts.

### Phase 5: Implementation Status & Milestones
- [x] **Vocal & Human Sound Registration**: Added `choir_aahs` (GM #52) and `voice_oohs` (GM #53) to `InstrumentType` in `types/song.ts`.
- [x] **SoundFont Catalog & Synthesis**: Integrated into `SOUNDFONT_CATALOG` in `lib/soundFontEngine.ts` with instant high-quality PCM sample synthesis (multi-voice choral formant modeling [a] and intimate solfège vocal guide [u]).
- [x] **Web Audio Procedural Fallback**: Implemented dual-formant bandpass filters (F1/F2), micro-detuning, breath aspiration, and delayed lyrical vibrato LFOs in both standard and eco modes in `lib/audioEngine.ts`.
- [x] **Studio UI & Categorization**: Added "Vocal & Solfège" category with localized labels and badges in `lib/taigiUtils.ts`, populated in HeaderBar and Floating HUD menus.
- [x] **Persistence & MIDI Export**: Added to `STORAGE_KEYS.INSTRUMENT` allowlist in `lib/storage.ts` and General MIDI map in `lib/midiExport.ts`.
- [x] **Test Verification**: Added comprehensive unit test suite in `test/instruments.test.ts` covering GM mapping, soundfont catalog, vocal UI grouping, note sanitization, and localStorage persistence.
