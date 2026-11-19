// js/melodies.js
// Bank of tunes for "Spell it".
//
// While the letters light up, one note is played per letter. The tune runs on without a
// break across all words of a phrase ("do my homework" = one continuous tune) and starts
// again from the beginning only if the phrase is longer than the notes below.
// When the last letter is done, the opening of the tune is played once at its real tempo.
//
// How to add your own tune: add an entry to spellMelodies.
//   name   – shown on a small toast when the tune starts
//   bpm    – tempo of the finale (beats per minute, one beat = a quarter note)
//   notes  – note names separated by spaces: C4 D4 E4 F#4 Bb3 ...
//            after a colon the length in beats: G4:2 = half note, C4:0.5 = eighth,
//            no colon = 1 beat. In the spelling a note of 2 beats or more keeps its
//            letter lit twice as long; shorter notes get one step each.
//   finale – how many notes of the tune to play at the end (aim for about 7 seconds)
// Keep the range roughly between G3 and G6 so it sounds soft and warm.

const spellMelodies = [
    { name: 'Do-Re-Mi scale', bpm: 150, finale: 8,
      notes: 'C4 D4 E4 F4 G4 A4 B4 C5:2 D5 E5 F5 G5 A5 B5 C6:2' },

    { name: 'Twinkle Twinkle / ABC Song', bpm: 132, finale: 14,
      notes: 'C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2 G4 G4 F4 F4 E4 E4 D4:2 G4 G4 F4 F4 E4 E4 D4:2 ' +
             'C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2' },

    { name: 'Mary Had a Little Lamb', bpm: 132, finale: 13,
      notes: 'E4 D4 C4 D4 E4 E4 E4:2 D4 D4 D4:2 E4 G4 G4:2 E4 D4 C4 D4 E4 E4 E4 E4 D4 D4 E4 D4 C4:4' },

    { name: 'Row, Row, Row Your Boat', bpm: 112, finale: 10,
      notes: 'C4 C4 C4 D4 E4:2 E4 D4 E4 F4 G4:2 C5 C5 C5 G4 G4 G4 E4 E4 E4 C4 C4 C4 G4 F4 E4 D4 C4:2' },

    { name: 'Old MacDonald', bpm: 132, finale: 12,
      notes: 'G4 G4 G4 D4 E4 E4 D4:2 B4 B4 A4 A4 G4:4 D4 D4 G4 G4 G4 D4 E4 E4 D4:2 B4 B4 A4 A4 G4:4' },

    { name: 'London Bridge', bpm: 120, finale: 13,
      notes: 'G4:1.5 A4:0.5 G4 F4 E4 F4 G4:2 D4 E4 F4:2 E4 F4 G4:2 ' +
             'G4:1.5 A4:0.5 G4 F4 E4 F4 G4:2 D4 G4 E4 C4:2' },

    { name: 'Frère Jacques', bpm: 132, finale: 14,
      notes: 'C4 D4 E4 C4 C4 D4 E4 C4 E4 F4 G4:2 E4 F4 G4:2 ' +
             'G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4 C4 G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4 C4 C4 G3 C4:2 C4 G3 C4:2' },

    { name: 'Jingle Bells', bpm: 132, finale: 11,
      notes: 'E4 E4 E4:2 E4 E4 E4:2 E4 G4 C4:1.5 D4:0.5 E4:4 ' +
             'E4 E4 E4:2 E4 E4 E4:2 E4 G4 C4:1.5 D4:0.5 E4:4' },

    { name: 'Happy Birthday', bpm: 108, finale: 12,
      notes: 'G4:0.75 G4:0.25 A4 G4 C5 B4:2 G4:0.75 G4:0.25 A4 G4 D5 C5:2 ' +
             'G4:0.75 G4:0.25 G5 E5 C5 B4 A4:2 F5:0.75 F5:0.25 E5 C5 D5 C5:2' },

    { name: 'Hot Cross Buns', bpm: 132, finale: 17,
      notes: 'E4 D4 C4:2 E4 D4 C4:2 C4:0.5 C4:0.5 C4:0.5 C4:0.5 D4:0.5 D4:0.5 D4:0.5 D4:0.5 E4 D4 C4:2' },

    { name: 'Ode to Joy', bpm: 132, finale: 15,
      notes: 'E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4:1.5 D4:0.5 D4:2 ' +
             'E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4:1.5 C4:0.5 C4:2' }
];

// "F#4:2" -> { freq: 369.99, beats: 2, steps: 2 }
function parseMelody(text) {
    const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    return text.trim().split(/\s+/).map((token) => {
        const m = /^([A-G])([#b]?)(\d)(?::(\d+(?:\.\d+)?))?$/.exec(token);
        if (!m) throw new Error('Bad note in melody: ' + token);
        const accidental = m[2] === '#' ? 1 : (m[2] === 'b' ? -1 : 0);
        const midi = (Number(m[3]) + 1) * 12 + SEMITONES[m[1]] + accidental;
        const beats = m[4] ? Number(m[4]) : 1;
        return {
            freq: 440 * Math.pow(2, (midi - 69) / 12),
            beats: beats,
            steps: beats >= 2 ? 2 : 1      // spelling pace: long notes hold their letter longer
        };
    });
}

// Pick a random tune, never the same one twice in a row
let lastMelodyIndex = -1;
function pickSpellMelody() {
    let index;
    do {
        index = Math.floor(Math.random() * spellMelodies.length);
    } while (index === lastMelodyIndex && spellMelodies.length > 1);
    lastMelodyIndex = index;

    const melody = spellMelodies[index];
    if (!melody.parsed) melody.parsed = parseMelody(melody.notes);
    return melody;
}
