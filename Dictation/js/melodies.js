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
//            no colon = 1 beat. A rest is R:1 (one beat of silence); rests are heard in the
//            finale only, the spelling skips them. In the spelling a note of 2 beats or more
//            keeps its letter lit twice as long; shorter notes get one step each.
//   finale – how many tokens (notes and rests) of the tune to play at the end
//            (aim for about 7 seconds at most)
// Keep the range roughly between G3 and G6 so it sounds soft and warm.
//
// All tunes are traditional. Several were checked against the free ABC transcriptions on
// abcnotation.com (Paul Hardy's Songs Tunebook, John Chambers' collection).

const spellMelodies = [
    { name: 'Do-Re-Mi scale', bpm: 150, finale: 8,
      notes: 'C4 D4 E4 F4 G4 A4 B4 C5:2 D5 E5 F5 G5 A5 B5 C6:2' },

    { name: 'Twinkle Twinkle / Baa Baa Black Sheep / ABC Song', bpm: 132, finale: 14,
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

    { name: 'Frère Jacques / Are You Sleeping?', bpm: 132, finale: 14,
      notes: 'C4 D4 E4 C4 C4 D4 E4 C4 E4 F4 G4:2 E4 F4 G4:2 ' +
             'G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4 C4 G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4 C4 C4 G3 C4:2 C4 G3 C4:2' },

    { name: 'Jingle Bells', bpm: 132, finale: 11,
      notes: 'E4 E4 E4:2 E4 E4 E4:2 E4 G4 C4:1.5 D4:0.5 E4:4 ' +
             'E4 E4 E4:2 E4 E4 E4:2 E4 G4 C4:1.5 D4:0.5 E4:4' },

    { name: 'Happy Birthday / Good Morning to You', bpm: 108, finale: 12,
      notes: 'G4:0.75 G4:0.25 A4 G4 C5 B4:2 G4:0.75 G4:0.25 A4 G4 D5 C5:2 ' +
             'G4:0.75 G4:0.25 G5 E5 C5 B4 A4:2 F5:0.75 F5:0.25 E5 C5 D5 C5:2' },

    { name: 'Hot Cross Buns', bpm: 132, finale: 17,
      notes: 'E4 D4 C4:2 E4 D4 C4:2 C4:0.5 C4:0.5 C4:0.5 C4:0.5 D4:0.5 D4:0.5 D4:0.5 D4:0.5 E4 D4 C4:2' },

    { name: 'Ode to Joy', bpm: 132, finale: 15,
      notes: 'E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4:1.5 D4:0.5 D4:2 ' +
             'E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4:1.5 C4:0.5 C4:2' },

    // ---- more children's songs ----

    // 6/8, written here in C major; full verse with "Down came the rain" and "Out came the sun"
    { name: 'Itsy Bitsy Spider', bpm: 132, finale: 14,
      notes: 'G3:0.5 C4 C4:0.5 C4 D4:0.5 E4:1.5 E4 E4:0.5 D4 C4:0.5 D4 E4:0.5 C4:1.5 R:1.5 ' +
             'E4:1.5 E4 F4:0.5 G4:1.5 G4:1.5 F4 E4:0.5 F4 G4:0.5 E4:1.5 R:1.5 ' +
             'C4:1.5 C4 D4:0.5 E4:1.5 E4:1.5 D4 C4:0.5 D4 E4:0.5 C4:1.5 G3 G3:0.5 ' +
             'C4 C4:0.5 C4 D4:0.5 E4:1.5 E4 E4:0.5 D4 C4:0.5 D4 E4:0.5 C4:1.5 R:1' },

    { name: 'When the Saints Go Marching In', bpm: 126, finale: 9,
      notes: 'C4 E4 F4 G4:4 R:1 C4 E4 F4 G4:4 R:1 C4 E4 F4 ' +
             'G4:2 E4:2 C4:2 E4:2 D4:4 R:1 E4 E4 D4 ' +
             'C4:4 E4:2 G4:2 G4 F4:3 R:2 E4 F4 ' +
             'G4:2 E4:2 C4:2 D4:2 C4:4' },

    { name: "If You're Happy and You Know It", bpm: 126, finale: 13,
      notes: 'G4:0.5 G4:0.5 C5:0.5 C5:0.5 C5:0.5 C5:0.5 C5:0.5 C5:0.5 B4:0.5 C5:0.5 D5:3 G4:0.5 G4:0.5 ' +
             'D5:0.5 D5:0.5 D5:0.5 D5:0.5 D5:0.5 D5:0.5 C5:0.5 D5:0.5 E5:3 E5:0.5 E5:0.5 ' +
             'F5:0.5 F5:0.5 F5:0.5 F5:0.5 A4:0.5 A4:0.5 F5:0.5 F5:0.5 ' +
             'E5:0.5 E5:0.5 E5:0.5 D5:0.5 C5:0.5 C5:0.5 E5:0.5 E5:0.5 ' +
             'D5:0.5 D5:0.5 D5:0.5 C5:0.5 B4:0.5 B4:0.5 A4:0.5 B4:0.5 C5:3' },

    // 6/8 jig, key of D (F and C are sharp)
    { name: 'Pop Goes the Weasel', bpm: 168, finale: 14,
      notes: 'D4:1 F#4:0.5 E4:1 G4:0.5 F#4:0.5 A4:0.5 F#4:0.5 D4:1.5 D4:1 F#4:0.5 E4:1 G4:0.5 F#4:1.5 D4:1.5 ' +
             'D4:1 F#4:0.5 E4:1 G4:0.5 F#4:0.5 A4:0.5 F#4:0.5 D4:1.5 B4:0.5 R:1 E4:1 G4:0.5 F#4:1.5 D4:1.5' },

    { name: 'Head, Shoulders, Knees and Toes', bpm: 120, finale: 9,
      notes: 'G4:2 A4:0.5 G4:0.5 F#4:0.5 G4:0.5 E4 G4:0.5 G4:0.5 G4:2 ' +
             'G4:2 A4:0.5 G4:0.5 F#4:0.5 G4:0.5 D4 G4:0.5 G4:0.5 G4:0.5 F4:0.5 E4:0.5 D4:0.5 ' +
             'C4 E4 G4 C5 D5:0.5 C5:0.5 B4:0.5 C5:0.5 A4:2 B4:2 B4:0.5 G4:0.5 A4:0.5 B4:0.5 C5 C4:0.5 C4:0.5 C4:2' },

    // 6/8, key of G
    { name: 'Here We Go Round the Mulberry Bush', bpm: 150, finale: 16,
      notes: 'G4:0.5 G4:0.5 G4:0.5 G4 B4:0.5 D5 B4:0.5 G4 G4:0.5 A4 A4:0.5 A4 G4:0.5 F#4 E4:0.5 D4:1.5 ' +
             'G4:0.5 G4:0.5 G4:0.5 G4 B4:0.5 D5 B4:0.5 G4 G4:0.5 A4 A4:0.5 D4:0.5 E4:0.5 F#4:0.5 G4:1.5 G4' },

    // 6/8, key of D (F is sharp)
    { name: 'The Farmer in the Dell', bpm: 150, finale: 12,
      notes: 'A3:0.5 D4 D4:0.5 D4 D4:0.5 D4:2.5 E4:0.5 F#4 F#4:0.5 F#4 F#4:0.5 F#4:3 ' +
             'A4:1.5 A4 B4:0.5 A4 F#4:0.5 D4 E4:0.5 F#4 F#4:0.5 E4 E4:0.5 D4:3' },

    // from memory (first two lines of the tune)
    { name: 'Yankee Doodle', bpm: 132, finale: 13,
      notes: 'C4 C4 D4 E4 C4 E4 D4:2 C4 C4 D4 E4 C4 B3:3 ' +
             'C4 C4 D4 E4 C4 E4 D4:2 C4 C4 D4 E4 C4 B3:3' }
];

// "F#4:2" -> { freq: 369.99, beats: 2, steps: 2 }     "R:1.5" -> { rest: true, beats: 1.5 }
function parseMelody(text) {
    const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    return text.trim().split(/\s+/).map((token) => {
        const rest = /^R(?::(\d+(?:\.\d+)?))?$/.exec(token);
        if (rest) return { rest: true, beats: rest[1] ? Number(rest[1]) : 1 };

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

// ---- choosing the tune ----
// The spellings of a session alternate: English tune, Thai tune, English tune, Thai tune ...
// Tunes marked  thai: true  are the Thai ones; all others are English. Within a session no
// tune repeats until all tunes of its language have been played (then that language's
// tunes are shuffled again). While there is no Thai tune in the bank, only English ones play.
// A session = one run through the words (see resetSpellSession, called from initStudents).
let lastMelodyIndex = { en: -1, th: -1 };   // last tune played in each language
let melodyDecks = { en: [], th: [] };       // shuffled tune numbers not played yet in this session
let nextIsThai = false;

function resetSpellSession() {
    melodyDecks = { en: [], th: [] };
    nextIsThai = false;                  // every session starts with an English tune
}
resetSpellSession();

// Tune numbers of one language in random order; the first one is never the tune just played
function freshDeck(thai) {
    const ids = [];
    spellMelodies.forEach((m, i) => { if (!!m.thai === thai) ids.push(i); });
    for (let i = ids.length - 1; i > 0; i--) {          // Fisher-Yates shuffle
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    // the deck is played from the end (pop), so keep the tune played last away from the end
    if (ids.length > 1 && ids[ids.length - 1] === lastMelodyIndex[thai ? 'th' : 'en']) {
        [ids[0], ids[ids.length - 1]] = [ids[ids.length - 1], ids[0]];
    }
    return ids;
}

function pickSpellMelody() {
    const thaiAvailable = spellMelodies.some((m) => m.thai);
    const useThai = nextIsThai && thaiAvailable;
    const key = useThai ? 'th' : 'en';

    if (!melodyDecks[key].length) melodyDecks[key] = freshDeck(useThai);
    const index = melodyDecks[key].pop();
    lastMelodyIndex[key] = index;
    nextIsThai = thaiAvailable ? !nextIsThai : false;

    const melody = spellMelodies[index];
    if (!melody.parsed) {
        melody.parsed = parseMelody(melody.notes);                 // notes and rests: for the finale
        melody.spell = melody.parsed.filter((n) => !n.rest);       // notes only: one per letter
    }
    return melody;
}
