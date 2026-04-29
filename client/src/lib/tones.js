// Parse pinyin into syllables with tone numbers
// e.g. "nǐ hǎo" → [{syllable:"nǐ", tone:3}, {syllable:"hǎo", tone:3}]

const TONE_CHARS = {
  'ā':1,'á':2,'ǎ':3,'à':4,
  'ē':1,'é':2,'ě':3,'è':4,
  'ī':1,'í':2,'ǐ':3,'ì':4,
  'ō':1,'ó':2,'ǒ':3,'ò':4,
  'ū':1,'ú':2,'ǔ':3,'ù':4,
  'ǖ':1,'ǘ':2,'ǚ':3,'ǜ':4,
};

export function parsePinyinTones(pinyin) {
  return pinyin.split(/\s+/).filter(Boolean).map(syllable => {
    let tone = 5; // neutral
    for (const [char, t] of Object.entries(TONE_CHARS)) {
      if (syllable.includes(char)) { tone = t; break; }
    }
    return { syllable, tone };
  });
}

// Tone colors
export const TONE_COLORS = {
  1: '#e53e3e', // 1st — high level — red
  2: '#d69e2e', // 2nd — rising — yellow
  3: '#38a169', // 3rd — dipping — green
  4: '#3182ce', // 4th — falling — blue
  5: '#718096', // neutral — gray
};

// SVG path data for each tone contour (in a 40x24 viewBox)
export const TONE_PATHS = {
  1: 'M4 16 L36 16',            // flat
  2: 'M4 20 Q20 12 36 4',       // rising
  3: 'M4 12 Q12 22 20 20 Q28 18 36 4', // dip-rise
  4: 'M4 4 Q20 12 36 20',       // falling
  5: 'M12 12 L28 12',           // short neutral
};
