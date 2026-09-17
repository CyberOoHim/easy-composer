/**
 * text-parser.mjs
 * 
 * High-performance parser and preprocessor for Text-based Numbered Musical Notation (簡譜)
 * with Taiwanese Hokkien (Taigi) lyrics.
 */

export function isStructuredAppText(text) {
  if (!text || typeof text !== 'string') return false;
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const hasMeasureHeader = lines.some(l => /^\[(Measure|Bar)\s*\d+\]/i.test(l));
  const hasNumberedNotation = lines.some(l => /^Numbered [Nn]otation:/i.test(l));
  return hasMeasureHeader || (hasNumberedNotation && lines.some(l => /^Title:/i.test(l)));
}

function parseGraceString(str) {
  const results = [];
  const regex = /([#b]?)([1-7])([\+',]*)/g;
  let match;
  while ((match = regex.exec(str)) !== null) {
    const accidental = (match[1] === '#' || match[1] === 'b') ? match[1] : '';
    const pitch = parseInt(match[2], 10);
    const octSigns = match[3] || '';
    const plusCount = (octSigns.match(/[\+']/g) || []).length;
    const commaCount = (octSigns.match(/,/g) || []).length;
    const octave = plusCount > 0 ? Math.min(2, plusCount) : commaCount > 0 ? -Math.min(2, commaCount) : 0;
    results.push({ pitch, octave, accidental });
  }
  return results;
}

function parseToken(tok, id) {
  let pitch = 1;
  let octave = 0;
  let accidental = '';
  let duration = 1;
  let isDotted = false;
  let isDoubleDotted = false;
  let tieToNext = false;
  let slurToNext = false;
  let isTriplet = false;
  let preGraceNotes = undefined;
  let postGraceNotes = undefined;

  let clean = tok.trim();

  // Annotations [xxx]
  if (clean.startsWith('[') && clean.endsWith(']')) {
    const annot = clean.slice(1, -1).trim();
    return {
      id,
      pitch: 'empty',
      octave: 0,
      accidental: '',
      duration: 0,
      isDotted: false,
      annotation: annot,
      lyric: { hanlo: annot, hanji: annot, poj: '', custom: annot },
    };
  }

  // Spacer / Punctuation
  if (clean === '_' || clean === '↵' || clean === '空' || clean === 'empty' || clean === 'V' || /^[，。！？、；：,.!?]+$/.test(clean)) {
    return {
      id,
      pitch: 'empty',
      octave: 0,
      accidental: '',
      duration: 0,
      isDotted: false,
      lyric: clean === '_' ? {} : { hanlo: clean, hanji: clean, poj: '', custom: clean },
    };
  }

  // Ties & slurs
  if (clean.includes('~')) {
    tieToNext = true;
    clean = clean.replace(/~/g, '');
  }
  if (clean.includes('^')) {
    slurToNext = true;
    clean = clean.replace(/\^/g, '');
  }

  // Pre-grace notes e.g. (5)1 or (61)2
  const preGraceMatch = clean.match(/^\(([^)]+)\)/);
  if (preGraceMatch) {
    const parsed = parseGraceString(preGraceMatch[1]);
    if (parsed.length > 0) preGraceNotes = parsed;
    clean = clean.slice(preGraceMatch[0].length);
  }

  // Post-grace notes e.g. 1(2)
  const postGraceMatch = clean.match(/\(([^)]+)\)$/);
  if (postGraceMatch) {
    const parsed = parseGraceString(postGraceMatch[1]);
    if (parsed.length > 0) postGraceNotes = parsed;
    clean = clean.slice(0, -postGraceMatch[0].length);
  }

  // Accidental prefix
  if (clean.startsWith('#')) {
    accidental = '#';
    clean = clean.substring(1);
  } else if (clean.startsWith('b')) {
    accidental = 'b';
    clean = clean.substring(1);
  }

  // Empty pitch representation
  if (clean.startsWith('_') || clean.startsWith('空') || clean.startsWith('empty')) {
    return {
      id,
      pitch: 'empty',
      octave: 0,
      accidental: '',
      duration: 0,
      isDotted: false,
      lyric: {},
    };
  }

  // Pitch number (0..7)
  const pitchMatch = clean.match(/^([0-7])/);
  if (pitchMatch) {
    pitch = parseInt(pitchMatch[1], 10);
    clean = clean.substring(1);
  }

  // Octave indicators (+ or ' for octave up, , or - for octave down)
  const plusCount = (clean.match(/[\+']/g) || []).length;
  const commaCount = (clean.match(/,/g) || []).length;
  if (plusCount > 0) {
    octave = Math.min(2, plusCount);
  } else if (commaCount > 0) {
    octave = -Math.min(2, commaCount);
  }

  // Underlines for durations (subdivisions)
  if (clean.includes('___')) duration = 0.125;
  else if (clean.includes('__')) duration = 0.25;
  else if (clean.includes('_')) duration = 0.5;
  else if (clean.includes('---')) duration = 4;
  else if (clean.includes('--')) duration = 3;
  else if (clean.includes('-')) duration = 2;

  // Triplet
  if (clean.includes('/3')) {
    isTriplet = true;
    if (clean.includes('*2/3')) duration = 0.667;
    else duration = 0.333;
  }

  // Dotted & double dotted
  if (clean.includes('..')) {
    isDoubleDotted = true;
    if (duration === 1) duration = 1.75;
    else if (duration === 2) duration = 3.5;
  } else if (clean.includes('.') || clean.includes('·')) {
    isDotted = true;
    if (duration === 1) duration = 1.5;
    else if (duration === 0.5) duration = 0.75;
    else if (duration === 2) duration = 3.0;
  }

  return {
    id,
    pitch,
    octave,
    accidental: accidental || undefined,
    duration,
    isDotted: isDotted || undefined,
    isDoubleDotted: isDoubleDotted || undefined,
    tieToNext: tieToNext || undefined,
    slurToNext: slurToNext || undefined,
    isTriplet: isTriplet || undefined,
    preGraceNotes,
    postGraceNotes,
    lyric: {},
  };
}

/**
 * Deterministically parse structured app text format into Song JSON
 */
export function parseStructuredTextScore(text, options = {}) {
  const lines = text.split(/\r?\n/);
  const song = {
    id: `song-${Date.now()}`,
    title: options.title || 'Imported Song',
    subtitle: '',
    composer: '',
    lyricist: '',
    notator: undefined,
    catalogNumber: undefined,
    footnote: undefined,
    orientation: 'portrait',
    key: options.key || 'F',
    timeSignature: options.time || '4/4',
    bpm: options.bpm || 80,
    notesPerLine: 4,
    description: '',
    measures: [],
  };

  let currentMeasure = null;
  let measureIndex = 1;
  let pendingRoman = null;
  let pendingHanlo = null;
  const pendingVerses = {};

  function applyLyrics() {
    if (!currentMeasure || !currentMeasure.notes || currentMeasure.notes.length === 0) return;
    if (pendingRoman) {
      pendingRoman.forEach((tok, idx) => {
        if (currentMeasure.notes[idx]) {
          const val = tok === '—' || tok === '-' ? '' : tok;
          currentMeasure.notes[idx].lyric.poj = val;
        }
      });
    }
    if (pendingHanlo) {
      pendingHanlo.forEach((tok, idx) => {
        if (currentMeasure.notes[idx]) {
          const val = tok === '—' || tok === '-' ? '' : tok;
          currentMeasure.notes[idx].lyric.hanlo = val;
          currentMeasure.notes[idx].lyric.hanji = val;
          currentMeasure.notes[idx].lyric.custom = val;
        }
      });
    }
    Object.keys(pendingVerses).forEach(vKey => {
      const v = parseInt(vKey, 10);
      const vData = pendingVerses[v];
      currentMeasure.notes.forEach((n, idx) => {
        if (!n.lyricsByVerse) n.lyricsByVerse = {};
        if (!n.lyricsByVerse[v]) n.lyricsByVerse[v] = {};
        if (vData.roman && vData.roman[idx]) {
          const tok = vData.roman[idx];
          n.lyricsByVerse[v].poj = tok === '—' || tok === '-' ? '' : tok;
        }
        if (vData.hanlo && vData.hanlo[idx]) {
          const tok = vData.hanlo[idx];
          const val = tok === '—' || tok === '-' ? '' : tok;
          n.lyricsByVerse[v].hanlo = val;
          n.lyricsByVerse[v].hanji = val;
          n.lyricsByVerse[v].custom = val;
        }
      });
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('Title:')) {
      song.title = line.replace('Title:', '').trim();
    } else if (line.startsWith('Subtitle:')) {
      song.subtitle = line.replace('Subtitle:', '').trim();
    } else if (line.startsWith('Composer:')) {
      song.composer = line.replace('Composer:', '').trim();
    } else if (line.startsWith('Lyricist:')) {
      song.lyricist = line.replace('Lyricist:', '').trim();
    } else if (line.startsWith('Notator:')) {
      song.notator = line.replace('Notator:', '').trim();
    } else if (line.startsWith('Catalog:')) {
      song.catalogNumber = line.replace('Catalog:', '').trim();
    } else if (line.startsWith('Footnote:')) {
      song.footnote = line.replace('Footnote:', '').trim();
    } else if (line.startsWith('Orientation:')) {
      const o = line.replace('Orientation:', '').trim();
      if (o === 'landscape' || o === 'portrait') song.orientation = o;
    } else if (line.startsWith('NotesPerLine:')) {
      const n = parseInt(line.replace('NotesPerLine:', '').trim(), 10);
      if (n > 0) song.notesPerLine = n;
    } else if (line.startsWith('VerseCount:')) {
      const v = parseInt(line.replace('VerseCount:', '').trim(), 10);
      if (v > 0) song.verseCount = v;
    } else if (line.startsWith('Description:')) {
      song.description = line.replace('Description:', '').trim();
    } else if (line.startsWith('Key:')) {
      const k = line.replace('Key:', '').trim();
      if (k) song.key = k;
    } else if (line.startsWith('Time:') || line.startsWith('TimeSignature:')) {
      const t = line.replace(/^(Time:|TimeSignature:)/, '').trim();
      if (t) song.timeSignature = t;
    } else if (line.startsWith('BPM:')) {
      const b = parseInt(line.replace('BPM:', '').trim(), 10);
      if (b > 0) song.bpm = b;
    } else if (line.startsWith('[Measure') || line.startsWith('[Bar') || (line.startsWith('[') && line.includes(']'))) {
      if (currentMeasure && currentMeasure.notes && currentMeasure.notes.length > 0) {
        applyLyrics();
        song.measures.push(currentMeasure);
      }

      pendingRoman = null;
      pendingHanlo = null;
      Object.keys(pendingVerses).forEach(k => delete pendingVerses[Number(k)]);

      const chordMatch = line.match(/Chord:\s*([A-Za-z0-9#b\/\s]+?)(?=(\s+[A-Z][a-z]+:|\s*\[|\s*$))/i);
      const sectionMatch = line.match(/\(([^)]+)\)/);
      const timeMatch = line.match(/Time:\s*([0-9\/]+)/i);
      const barlineMatch = line.match(/Barline:\s*([a-z_]+)/i);
      const voltaMatch = line.match(/Volta:\s*([0-9,\s]+)/i);
      const hasBreak = /\[Break\]/i.test(line) || /Break:\s*true/i.test(line);

      currentMeasure = {
        id: `m-${measureIndex}-${Date.now().toString(36)}`,
        measureNumber: measureIndex++,
        chord: chordMatch ? chordMatch[1].trim() : undefined,
        section: sectionMatch ? sectionMatch[1].trim() : undefined,
        timeSignature: timeMatch ? timeMatch[1].trim() : undefined,
        barlineType: barlineMatch ? barlineMatch[1].trim() : undefined,
        voltaEnding: voltaMatch ? voltaMatch[1].split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n)) : undefined,
        isLineBreak: hasBreak,
        notes: [],
      };
    } else if (currentMeasure) {
      if (/^Numbered [Nn]otation:/i.test(line)) {
        const tokens = line.replace(/^Numbered [Nn]otation:/i, '').trim().split(/\s+/).filter(Boolean);
        currentMeasure.notes = tokens.map((tok, nIdx) => parseToken(tok, `${currentMeasure.id}-n${nIdx + 1}`));
        applyLyrics();
      } else if (line.startsWith('Obbligato:')) {
        currentMeasure.obbligatoText = line.replace(/^Obbligato:/, '').trim();
      } else {
        const vRomanMatch = line.match(/^(羅馬字|Roman|POJ|TL)\s*([2-5])?:/i);
        const vHanloMatch = line.match(/^(漢羅|Hanlo|Hanji|Custom|歌詞|Lyrics)\s*([2-5])?:/i);

        if (vRomanMatch) {
          const verseNum = vRomanMatch[2] ? parseInt(vRomanMatch[2], 10) : 1;
          const tokens = line.replace(vRomanMatch[0], '').trim().split(/\s+/).filter(Boolean);
          if (verseNum === 1) {
            pendingRoman = tokens;
          } else {
            if (!pendingVerses[verseNum]) pendingVerses[verseNum] = {};
            pendingVerses[verseNum].roman = tokens;
          }
          applyLyrics();
        } else if (vHanloMatch) {
          const verseNum = vHanloMatch[2] ? parseInt(vHanloMatch[2], 10) : 1;
          const tokens = line.replace(vHanloMatch[0], '').trim().split(/\s+/).filter(Boolean);
          if (verseNum === 1) {
            pendingHanlo = tokens;
          } else {
            if (!pendingVerses[verseNum]) pendingVerses[verseNum] = {};
            pendingVerses[verseNum].hanlo = tokens;
          }
          applyLyrics();
        }
      }
    }
  }

  if (currentMeasure && currentMeasure.notes && currentMeasure.notes.length > 0) {
    applyLyrics();
    song.measures.push(currentMeasure);
  }

  if (song.measures.length === 0) {
    throw new Error('No valid measures found in text file.');
  }

  return song;
}

/**
 * Guideline and prompt specification for direct agent transcription of unstructured
 * or freeform text numbered notation with lyrics.
 */
export function buildTextTranscriptionPrompt(rawText, options = {}) {
  return `You are an expert Taiwanese Hokkien (Taigi / 臺語) music theorist, Numbered Musical Notation (簡譜) transcriber, and lyric editor.

The user provided the following text-based Numbered Musical Notation and Lyrics:

---
${rawText}
---

Your task is to transcribe this text input into a complete, pristine, and syntactically valid JSON object adhering strictly to the Taigi Song Schema.

### Key Rules & Requirements:
1. **Metadata**:
   - Extract or deduce: \`title\`, \`key\` (e.g. 'F', 'C', 'G', 'Bb', 'D'), \`timeSignature\` ('4/4', '3/4', '2/4', '6/8'), and \`bpm\` (e.g. 80).
   ${options.key ? `- Use forced key: "${options.key}"` : ''}
   ${options.time ? `- Use forced timeSignature: "${options.time}"` : ''}
   ${options.bpm ? `- Use forced bpm: ${options.bpm}` : ''}
   ${options.title ? `- Use forced title: "${options.title}"` : ''}

2. **Measures & Barlines**:
   - Group notes into measures using '|' or measure bounds.
   - Each measure must have sequential \`measureNumber\` starting from 1.
   - Extract chord symbols (e.g. "F", "C7", "Dm", "Bb") into \`measure.chord\`.
   - Extract section markers (e.g. "Verse 1", "Chorus", "前奏") into \`measure.section\`.

3. **Numbered Notation Pitch & Durations**:
   - \`pitch\`: 1 (Do), 2 (Re), 3 (Mi), 4 (Fa), 5 (Sol), 6 (La), 7 (Ti), 0 (Rest).
   - Non-notation spacers or annotations: \`pitch: 'empty'\`, \`duration: 0\`.
   - \`octave\`: 0 for middle octave, 1 for high dot (1̇ or 1'), 2 for double high dot, -1 for low dot (1̣ or 1,), -2 for double low dot.
   - \`duration\` (in quarter note beats):
     - Quarter note: 1.0
     - Half note: 2.0 (e.g. "5 -")
     - Dotted half note: 3.0 (e.g. "5 - -")
     - Whole note: 4.0 (e.g. "5 - - -")
     - Eighth note: 0.5 (single underline "5_")
     - Sixteenth note: 0.25 (double underline "5__")
     - Dotted quarter note: 1.5, with \`isDotted: true\` (e.g. "5.")
     - Dotted eighth note: 0.75, with \`isDotted: true\` (e.g. "5_.")
   - Measure rhythm balance: The sum of note durations in each measure MUST equal the time signature's expected beats (e.g. 4.0 for 4/4). Use rest notes (\`pitch: 0\`) if necessary to balance the measure.

4. **Taigi / Taiwanese Lyrics Alignment**:
   - Align lyrics syllable-by-syllable to each sung note.
   - Every sung note must have:
     \`lyric: { "hanlo": "<Traditional Han Character / Hanlo>", "poj": "<Pe̍h-ōe-jī with tone marks>" }\`
   - If the original text only has Han characters (or only romanization), provide BOTH \`hanlo\` and accurate Pe̍h-ōe-jī (\`poj\`) with official tone diacritics (e.g. "To̍k", "iā", "bô", "phōaⁿ", "siú", "teng").
   - Rest notes (\`pitch: 0\`) have empty lyric: \`lyric: {}\`.

5. **Karaoke Phrase Structuring**:
   - Organize measures so lyrics form natural singing phrases (typically 2 to 4 measures, 4 to 8 syllables).
   - Set \`isLineBreak: true\` on the last measure of each singing phrase to trigger a line break in the karaoke display.

Return ONLY the raw JSON object conforming to the schema.`;
}
