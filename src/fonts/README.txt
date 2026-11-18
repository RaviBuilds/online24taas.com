Noto Sans Devanagari 2.007 (variable, wght 100-900), self-hosted. SIL Open Font License 1.1, see LICENSE-noto-sans-devanagari.txt.
Source: official release https://github.com/notofonts/devanagari/releases/tag/NotoSansDevanagari-v2.007
  asset NotoSansDevanagari-v2.007.zip (SHA-256 820C7DA45B1E63562CB41C0A8CAC5D9A4202312043A3A040ED1325857EF469B1),
  file NotoSansDevanagari/googlefonts/variable-ttf/NotoSansDevanagari[wdth,wght].ttf
Build: fontTools subset (all layout features and scripts kept, same codepoints as the previous Fontsource 5.3.0 / v2.006 subsets),
  then wdth axis pinned to 100 and converted to WOFF2. Two files so each script downloads only when used:
  *-devanagari-*  U+0900-097F, U+1CD0-1CF6/1CF8-1CF9, U+200B-200D, U+20B9, U+20F0, U+25CC, U+A830-A839, U+A8E0-A8FF, U+11B00-11B09 (+ space, NBSP, U+02BC)
  *-latin-*       Basic Latin, Latin-1 Supplement, common punctuation, EUR, trademark, minus
Previous version: 2.006 from @fontsource-variable/noto-sans-devanagari 5.3.0 (see git history).
Roboto files: Fontsource @fontsource/roboto 5.3.0 (Apache 2.0, LICENSE-roboto.txt).