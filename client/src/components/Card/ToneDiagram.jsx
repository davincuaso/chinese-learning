import { parsePinyinTones, TONE_COLORS, TONE_PATHS } from '../../lib/tones';

/**
 * ToneDiagram renders SVG tone curves beside each pinyin syllable.
 * compact=false (default): large display as a standalone block (card back, main pinyin)
 * compact=true: small inline display used inside example sentences
 */
export default function ToneDiagram({ pinyin, compact = false }) {
  const syllables = parsePinyinTones(pinyin);

  if (compact) {
    return (
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        {syllables.map(({ syllable, tone }, i) => (
          <span key={i} className="inline-flex items-center gap-0.5">
            <svg
              width="20"
              height="14"
              viewBox="0 0 44 28"
              className="inline-block opacity-80"
            >
              <path
                d={TONE_PATHS[tone] || TONE_PATHS[5]}
                stroke={TONE_COLORS[tone]}
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <span className="text-xs" style={{ color: TONE_COLORS[tone] }}>{syllable}</span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-3 justify-center">
      {syllables.map(({ syllable, tone }, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <svg width="44" height="28" viewBox="0 0 44 28" className="overflow-visible">
            {/* Staff lines */}
            {[6, 12, 18, 24].map(y => (
              <line key={y} x1="2" y1={y} x2="42" y2={y} stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" />
            ))}
            {/* Tone contour */}
            <path
              d={TONE_PATHS[tone] || TONE_PATHS[5]}
              stroke={TONE_COLORS[tone]}
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          <span className="text-sm font-medium" style={{ color: TONE_COLORS[tone] }}>
            {syllable}
          </span>
        </div>
      ))}
    </div>
  );
}
