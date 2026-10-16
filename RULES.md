# Overseer Lexicon: Term Generation Rules

This document specifies the authoritative rules for generating new entries for the **Overseer Lexicon**.
When generating entries (via codebase scripts, AI agents, or manual curation), follow every section of this document strictly.

---

## 1. Task

Generate new entries for a multilingual lexicon of words that mean **a person who manages, oversees, keeps or runs something**: a household, estate, workshop or atelier, gallery or museum, office, treasury, market, ship or port, temple, school, village or state department.

Return data lines only, in the exact format in section 2. Another program reads your output, so any extra text breaks it.

---

## 2. Output Format

One entry per line. Seven fields separated by the pipe character `|`:

```
term|romanization|language|region|era|domain|meaning
```

| # | Field | Rule |
|---|---|---|
| 1 | `term` | The word in its **native script** (Greek, Arabic, 漢字, Devanagari, Cyrillic, Thai, etc.). For Latin-script languages, the normal spelling with its diacritics. If the concept is only known to you by a generic English descriptive phrase (for example "the dragon machete"), do **not** put that phrase, or a literal translation of it, in this field — find and use the actual native-language word speakers of that language use for it (for example `golok naga` in Indonesian). If you cannot find the real native word, leave the entry out (see section 6). |
| 2 | `romanization` | A Latin-letter reading for non-Latin scripts. For Latin-script terms, repeat the term exactly. |
| 3 | `language` | The specific variety in English: `Ancient Greek`, `Classical Chinese`, `Ottoman Turkish`, `Old Norse`, `Medieval Latin`, `Javanese`, etc. |
| 4 | `region` | One region code from section 3 (`EUR`, `MEA`, `CAS`, `SAS`, `EAS`, `SEAS`, `OCE`, `AFR`, `AME`). |
| 5 | `era` | One era code from section 3 (`A`, `M`, `N`). |
| 6 | `domain` | One domain code from section 3 (`STUDIO`, `GALLERY`, `OFFICE`, `HOUSE`, `LAND`, `STATE`, `FINANCE`, `TRADE`, `RELIGION`, `EDUCATION`, `PERFORM`, `PORT`, `MILITARY`, `LEAD`). |
| 7 | `meaning` | Plain English, 5 to 18 words. See section 5. |

### Hard Format Rules
- Output **raw lines only**. No header row, no numbering, no bullets, no code fences, no blank lines, no commentary before or after.
- Exactly **6 pipe characters per line** (7 fields). Never use `|` inside a field.
- Use UTF-8. Keep diacritics. Do not replace native script with romanization.
- Do not wrap fields in quotes.

---

## 2b. Romanization Standards

| Language | Scheme |
|---|---|
| Chinese | Pinyin with tone marks |
| Japanese | Hepburn, with macrons for long vowels (`ō`, `ū`) |
| Korean | Revised Romanization |
| Sanskrit, Pali, Prakrit | IAST (`ā`, `ī`, `ū`, `ṛ`, `ṣ`, `ś`, `ṭ`, `ḍ`, `ṇ`, `ṃ`, `ḥ`) |
| Hindi, Urdu, Bengali, Tamil, Indic | IAST-style with macrons and dots |
| Arabic, Persian, Hebrew | Common scholarly transliteration (`ā`, `ī`, `ū`, `ḥ`, `ṣ`, `ʿ`), no all-caps |
| Greek | Standard Latinization (`ē`, `ō`, `y` for upsilon) |
| Russian, Ukrainian, Bulgarian | Scholarly transliteration |
| Thai, Khmer, Burmese | Common reading, no tone marks needed |
| Ancient Egyptian | Conventional Egyptological spelling such as `imy-r per`, avoiding rare Unicode characters |

---

## 3. Allowed Codes

### Region (Field 4)
| Code | Meaning | Examples / Notes |
|---|---|---|
| `EUR` | Europe | Latin, French, German, Greek, Old Norse, Slavic, Gaelic, etc. |
| `MEA` | Middle East | Arabic, Hebrew, Persian, Aramaic, Akkadian, Ottoman Turkish |
| `CAS` | Central Asia and Caucasus | Georgian, Armenian, Kazakh, Uzbek, Mongolian, Tibetan |
| `SAS` | South Asia | Sanskrit, Hindi, Tamil, Bengali, Marathi, Urdu, Pali, Sinhala |
| `EAS` | East Asia | Chinese (Classical/Mandarin/Cantonese), Japanese, Korean |
| `SEAS` | Southeast Asia | Indonesian, Malay, Javanese, Balinese, Tagalog, Thai, Khmer, Burmese, Vietnamese |
| `OCE` | Oceania | Māori, Hawaiian, Samoan, Fijian |
| `AFR` | Africa | Ancient Egyptian, Coptic, Swahili, Amharic, Ge'ez, Hausa, Yoruba, Zulu |
| `AME` | Americas | Nahuatl, Quechua, Classic Maya, Inuktitut, Cherokee |

*Rule:* Pick the region where the language is or was spoken. Egyptian and Berber are `AFR`. Arabic, Hebrew and Persian are `MEA`.

### Era (Field 5)
| Code | Meaning | Time Period |
|---|---|---|
| `A` | Ancient | Before about 500 CE |
| `M` | Historic | About 500 to 1900 CE (Medieval, Early Modern, 19th c.) |
| `N` | Modern | In current use or coined in the modern era |

*Rule:* If unsure between two eras, choose the later one.

### Domain (Field 6)
| Code | Covers |
|---|---|
| `STUDIO` | workshop, atelier, studio, building site, craft master, foreman |
| `GALLERY` | gallery, museum, collection, curator, exhibition |
| `OFFICE` | office, company, administration, secretary, manager |
| `HOUSE` | household, palace staff, steward, butler, estate house |
| `LAND` | farm, estate land, village land, irrigation, overseer of workers |
| `STATE` | government office, district, city, provincial official |
| `FINANCE` | treasury, accounts, tax, mint |
| `TRADE` | market, merchants, guilds, trading post |
| `RELIGION` | temple, church, monastery, mosque, endowment |
| `EDUCATION` | library, school, college, archive |
| `PERFORM` | theatre, troupe, festival, stage, orchestra |
| `PORT` | ship, harbour, fleet, shipping |
| `MILITARY` | garrison, camp, supply, army or navy command |
| `LEAD` | general head, chief or leader with managing duties that fit no other domain |

*Rule:* Choose the single best fit.

---

## 4. What Counts as a Valid Term

Include a word only if **all** of these are true:
1. It names a **role or title of a person** (or a clearly personified office), not a place, tool or abstract noun.
2. The role is about **managing, supervising, keeping, administering or running** something, not only ruling, fighting or worshipping.
3. It is a **real word used in that language**, in the stated era, found in dictionaries, historical sources or normal modern usage.
4. You are **confident** about its spelling, script, and meaning.

Rulers, priests and generals are acceptable only when the title carries administrative or managerial duties (for example a temple administrator, a provincial governor, a treasury head). Skip pure royal or military rank titles.

---

## 5. Writing the Meaning (Field 7)

- English, one short phrase, **5 to 18 words**.
- Start with a **lowercase letter**. **No final period**.
- Say plainly what the person does and of what: `steward who managed a noble household`, `overseer of a royal workshop`.
- Add a short etymology only when it is well known and helps: `from Persian shāh-bandar`.
- Do not copy dictionary definitions word for word. Do not include the term itself in the meaning.
- No opinions, no marketing words, no emoji.

---

## 6. Accuracy Rules (Most Important)

- **Never invent a word.** Do not translate an English word into another language by guess. Do not blend roots or create plausible-sounding titles.
- **Never output an English descriptive phrase as the `term`.** If a concept is only nameable in English through a description (for example "the dragon machete"), the `term` must be the real native-language word for it (for example `golok naga` in Indonesian) — not a translation of the English phrase and not the phrase itself. This applies even when the source material (a request, an import file, existing data) gives you the concept only as an English description.
- If you are not sure a term exists, is spelled that way, or means that, **leave it out**.
- Do not guess the script of a language you cannot write reliably. Skip it.
- Prefer terms with clear historical or current use over obscure ones you cannot verify.
- Keep each entry to the sense of managing. Do not stretch a meaning to fit.
- Producing **fewer lines than requested is correct** when reaching the count would require guessing. Never pad.

---

## 7. Coverage and Balance

Spread entries across the lexicon instead of clustering:
- Use many languages in one batch. No single language should be more than about 12 percent of a batch.
- Give extra weight to regions that have fewer entries: `CAS`, `OCE`, `AME`, `AFR`, `SEAS`.
- Give extra weight to domains that have fewer entries: `GALLERY`, `EDUCATION`, `PERFORM`, `PORT`, `MILITARY`.
- Include a mix of eras, with modern workplace roles (studio, gallery, office, production) as well as ancient and historic ones.
- If the request names a **focus** (a region, era, domain or language), follow it, and ignore the balance rules above for that dimension.

---

## 8. Duplicate Prevention

- Do not repeat any `term` + `language` pair from the database or existing batch.
- The same word in a different language is allowed.
- Do not add a different spelling, script or romanization of a word that is already present.

---

## 9. Reference Examples

```
οἰκονόμος|oikonomos|Ancient Greek|EUR|A|HOUSE|household manager or steward; root of "economy"
Baumeister|Baumeister|German|EUR|M|STUDIO|master builder who oversees masonry and construction
学芸員|gakugeiin|Japanese|EAS|N|GALLERY|museum curator who manages collections and exhibitions
شاهبندر|shāhbandar|Arabic|MEA|M|PORT|harbour master and head of merchants in a port
pochtecatl|pōchtēcatl|Nahuatl|AME|M|TRADE|long-distance merchant directing guild trade caravans
pemangku|pemangku|Balinese|SEAS|M|RELIGION|temple priest managing ritual offerings and temple grounds
```

---

## 10. Request Template for AI Prompts

```
Generate {{COUNT}} new entries following the rules in the system prompt.

Focus (optional, leave blank for balanced coverage): {{FOCUS}}

Already have (do not repeat these term + language pairs):
{{EXISTING}}
```

