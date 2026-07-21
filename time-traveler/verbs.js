// ═══════════════════════════════════════════════════════════════
// VERB LIST — edit this file to add, remove, or change verbs.
// Each entry: base (present), pastSimple, pastParticiple,
// irregular (true/false), emoji (used as a visual cue).
// ═══════════════════════════════════════════════════════════════
const VERBS = [
  { base: 'eat',   pastSimple: 'ate',     pastParticiple: 'eaten',   irregular: true,  emoji: '🍕' },
  { base: 'go',    pastSimple: 'went',    pastParticiple: 'gone',    irregular: true,  emoji: '🚗' },
  { base: 'see',   pastSimple: 'saw',     pastParticiple: 'seen',    irregular: true,  emoji: '👀' },
  { base: 'play',  pastSimple: 'played',  pastParticiple: 'played',  irregular: false, emoji: '⚽' },
  { base: 'drink', pastSimple: 'drank',   pastParticiple: 'drunk',   irregular: true,  emoji: '🥤' },
  { base: 'watch', pastSimple: 'watched', pastParticiple: 'watched', irregular: false, emoji: '📺' },
  { base: 'read',  pastSimple: 'read',    pastParticiple: 'read',    irregular: true,  emoji: '📖' },
  { base: 'write', pastSimple: 'wrote',   pastParticiple: 'written', irregular: true,  emoji: '✍️' },
  { base: 'run',   pastSimple: 'ran',     pastParticiple: 'run',     irregular: true,  emoji: '🏃' },
  { base: 'swim',  pastSimple: 'swam',    pastParticiple: 'swum',    irregular: true,  emoji: '🏊' },
  { base: 'fly',   pastSimple: 'flew',    pastParticiple: 'flown',   irregular: true,  emoji: '✈️' },
  { base: 'buy',   pastSimple: 'bought',  pastParticiple: 'bought',  irregular: true,  emoji: '🛍️' },
  { base: 'make',  pastSimple: 'made',    pastParticiple: 'made',    irregular: true,  emoji: '🎂' },
  { base: 'take',  pastSimple: 'took',    pastParticiple: 'taken',   irregular: true,  emoji: '📸' },
  { base: 'give',  pastSimple: 'gave',    pastParticiple: 'given',   irregular: true,  emoji: '🎁' },
  { base: 'come',  pastSimple: 'came',    pastParticiple: 'come',    irregular: true,  emoji: '🏠' },
  { base: 'be',    pastSimple: 'was',     pastParticiple: 'been',    irregular: true,  emoji: '🌟' },
  { base: 'do',    pastSimple: 'did',     pastParticiple: 'done',    irregular: true,  emoji: '✅' },
  { base: 'have',  pastSimple: 'had',     pastParticiple: 'had',     irregular: true,  emoji: '🍽️' },
  { base: 'ride',  pastSimple: 'rode',    pastParticiple: 'ridden',  irregular: true,  emoji: '🚲' },

  // ── extra common verbs ──
  { base: 'sleep', pastSimple: 'slept',    pastParticiple: 'slept',    irregular: true,  emoji: '😴' },
  { base: 'speak', pastSimple: 'spoke',    pastParticiple: 'spoken',   irregular: true,  emoji: '🗣️' },
  { base: 'sing',  pastSimple: 'sang',     pastParticiple: 'sung',     irregular: true,  emoji: '🎤' },
  { base: 'dance', pastSimple: 'danced',   pastParticiple: 'danced',   irregular: false, emoji: '💃' },
  { base: 'jump',  pastSimple: 'jumped',   pastParticiple: 'jumped',   irregular: false, emoji: '🤸' },
  { base: 'walk',  pastSimple: 'walked',   pastParticiple: 'walked',   irregular: false, emoji: '🚶' },
  { base: 'talk',  pastSimple: 'talked',   pastParticiple: 'talked',   irregular: false, emoji: '💬' },
  { base: 'listen',pastSimple: 'listened', pastParticiple: 'listened', irregular: false, emoji: '🎧' },
  { base: 'clean', pastSimple: 'cleaned',  pastParticiple: 'cleaned',  irregular: false, emoji: '🧹' },
  { base: 'cook',  pastSimple: 'cooked',   pastParticiple: 'cooked',   irregular: false, emoji: '🍳' },
  { base: 'help',  pastSimple: 'helped',   pastParticiple: 'helped',   irregular: false, emoji: '🤝' },
  { base: 'wash',  pastSimple: 'washed',   pastParticiple: 'washed',   irregular: false, emoji: '🧼' },
  { base: 'open',  pastSimple: 'opened',   pastParticiple: 'opened',   irregular: false, emoji: '🚪' },
  { base: 'close', pastSimple: 'closed',   pastParticiple: 'closed',   irregular: false, emoji: '🔒' },
  { base: 'study', pastSimple: 'studied',  pastParticiple: 'studied',  irregular: false, emoji: '📝' },
  { base: 'catch', pastSimple: 'caught',   pastParticiple: 'caught',   irregular: true,  emoji: '🧤' },
  { base: 'throw', pastSimple: 'threw',    pastParticiple: 'thrown',   irregular: true,  emoji: '🥏' },
  { base: 'draw',  pastSimple: 'drew',     pastParticiple: 'drawn',    irregular: true,  emoji: '🎨' },
  { base: 'break', pastSimple: 'broke',    pastParticiple: 'broken',   irregular: true,  emoji: '🪟' },
  { base: 'bring', pastSimple: 'brought',  pastParticiple: 'brought',  irregular: true,  emoji: '🎒' },
  { base: 'build', pastSimple: 'built',    pastParticiple: 'built',    irregular: true,  emoji: '🧱' },
  { base: 'think', pastSimple: 'thought',  pastParticiple: 'thought',  irregular: true,  emoji: '🤔' },
  { base: 'tell',  pastSimple: 'told',     pastParticiple: 'told',     irregular: true,  emoji: '📢' },
  { base: 'find',  pastSimple: 'found',    pastParticiple: 'found',    irregular: true,  emoji: '🔍' },
  { base: 'feel',  pastSimple: 'felt',     pastParticiple: 'felt',     irregular: true,  emoji: '❤️' },
  { base: 'get',   pastSimple: 'got',      pastParticiple: 'gotten',   irregular: true,  emoji: '🎯' },
  { base: 'meet',  pastSimple: 'met',      pastParticiple: 'met',      irregular: true,  emoji: '🤗' },
  { base: 'hear',  pastSimple: 'heard',    pastParticiple: 'heard',    irregular: true,  emoji: '👂' },
  { base: 'know',  pastSimple: 'knew',     pastParticiple: 'known',    irregular: true,  emoji: '🧠' },
  { base: 'grow',  pastSimple: 'grew',     pastParticiple: 'grown',    irregular: true,  emoji: '🌱' },
  { base: 'wear',  pastSimple: 'wore',     pastParticiple: 'worn',     irregular: true,  emoji: '👕' },
  { base: 'wake',  pastSimple: 'woke',     pastParticiple: 'woken',    irregular: true,  emoji: '⏰' },
  { base: 'stand', pastSimple: 'stood',    pastParticiple: 'stood',    irregular: true,  emoji: '🧍' },
  { base: 'sit',   pastSimple: 'sat',      pastParticiple: 'sat',      irregular: true,  emoji: '🪑' },
  { base: 'win',   pastSimple: 'won',      pastParticiple: 'won',      irregular: true,  emoji: '🏆' },
  { base: 'teach', pastSimple: 'taught',   pastParticiple: 'taught',   irregular: true,  emoji: '👩‍🏫' },
];

// ═══════════════════════════════════════════════════════════════
// "HAVE YOU EVER...?" TOPICS — Module 2
// Each references a verb (by base form, looked up in VERBS) plus
// an object/phrase to complete the question, an emoji, and a
// fixed "keyAnswer" (true = Yes I have / false = No I haven't)
// used as the quiz's answer key.
// ═══════════════════════════════════════════════════════════════
const HAVE_YOU_EVER_TOPICS = [
  { verb: 'eat',   object: 'pizza',                 emoji: '🍕', keyAnswer: true  },
  { verb: 'ride',  object: 'an elephant',            emoji: '🐘', keyAnswer: false },
  { verb: 'see',   object: 'the ocean',              emoji: '🌊', keyAnswer: true  },
  { verb: 'fly',   object: 'in an airplane',         emoji: '✈️', keyAnswer: true  },
  { verb: 'make',  object: 'a birthday cake',        emoji: '🎂', keyAnswer: false },
  { verb: 'swim',  object: 'in the sea',              emoji: '🏊', keyAnswer: true  },
  { verb: 'write', object: 'a letter',                emoji: '✍️', keyAnswer: true  },
  { verb: 'read',  object: 'a comic book',            emoji: '📖', keyAnswer: true  },
  { verb: 'buy',   object: 'a video game',            emoji: '🎮', keyAnswer: false },
  { verb: 'give',  object: 'a present to a friend',   emoji: '🎁', keyAnswer: true  },
  { verb: 'take',  object: 'a photo of an animal',    emoji: '📸', keyAnswer: true  },
  { verb: 'run',   object: 'a race',                  emoji: '🏃', keyAnswer: false },
  { verb: 'go',    object: 'to another country',      emoji: '🌍', keyAnswer: false },
  { verb: 'watch', object: 'a scary movie',           emoji: '👻', keyAnswer: false },
  { verb: 'drink', object: 'hot chocolate',           emoji: '☕', keyAnswer: true  },
];

// ═══════════════════════════════════════════════════════════════
// "I'VE NEVER..." PROMPTS — Module 3
// Each references a verb (by base form) and an object/phrase.
// ═══════════════════════════════════════════════════════════════
const NEVER_PROMPTS = [
  { verb: 'eat',   object: 'sushi',                emoji: '🍣' },
  { verb: 'ride',  object: 'a horse',               emoji: '🐴' },
  { verb: 'see',   object: 'a shooting star',       emoji: '🌠' },
  { verb: 'fly',   object: 'in a hot air balloon',  emoji: '🎈' },
  { verb: 'make',  object: 'a snowman',             emoji: '⛄' },
  { verb: 'swim',  object: 'with dolphins',         emoji: '🐬' },
  { verb: 'write', object: 'a song',                emoji: '🎵' },
  { verb: 'buy',   object: 'a pet',                 emoji: '🐹' },
  { verb: 'take',  object: 'a trip on a train',     emoji: '🚂' },
  { verb: 'drink', object: 'coconut water',         emoji: '🥥' },
];
