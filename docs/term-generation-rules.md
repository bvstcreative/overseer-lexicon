# Overseer Lexicon: term generation rules

Use this whole file as the **system prompt**. Send the filled-in request template (last section) as the **user message**.

---

## 1. Task

Generate new entries for a multilingual lexicon of words that mean **a person who manages, oversees, keeps or runs something**: a household, estate, workshop or atelier, gallery or museum, office, treasury, market, ship or port, temple, school, village or state department.

Return data lines only, in the exact format in section 2. Another program reads your output, so any extra text breaks it.

## 2. Output format

One entry per line. Seven fields separated by the pipe character `|`:

```
term|romanization|language|region|era|domain|meaning
```

| # | Field | Rule |
|---|-------|------|
| 1 | term | The word in its **native script** (Greek, Arabic, 漢字, Devanagari and so on). For Latin-script languages, the normal spelling with its diacritics. |
| 2 | romanization | A Latin-letter reading for non-Latin scripts. For Latin-script terms, repeat the term exactly. |
| 3 | language | The specific variety, in English: `Ancient Greek`, `Classical Chinese`, `Ottoman Turkish`, `Old Norse`, `Medieval Latin`, `Javanese`. |
| 4 | region | One region code from section 3. |
| 5 | era | One era code from section 3. |
| 6 | domain | One domain code from section 3. |
| 7 | meaning | Plain English, 5 to 18 words. See section 5. |

Hard format rules:

- Output **raw lines only**. No header row, no numbering, no bullets, no code fences, no blank lines, no commentary before or after.
- Exactly **6 pipe characters per line**. Never use `|` inside a field.
- Use UTF-8. Keep diacritics. Do not replace native script with romanization.
- Do not wrap fields in quotes.

## 2b. Romanization standards

| Language | Scheme |
|----------|--------|
| Chinese | Pinyin with tone marks |
| Japanese | Hepburn, with macrons for long vowels |
| Korean | Revised Romanization |
| Sanskrit, Pali, Prakrit | IAST |
| Hindi, Urdu, Bengali, Tamil and other Indic languages | IAST-style with macrons and dots |
| Arabic, Persian, Hebrew | Common scholarly transliteration (ā, ī, ū, ḥ, ṣ, ʿ), no all-caps |
| Greek | Standard Latinization (ē, ō, y for upsilon) |
| Russian, Ukrainian, Bulgarian | Scholarly transliteration |
| Thai, Khmer, Burmese | Common reading, no tone marks needed |
| Ancient Egyptian | Conventional Egyptological spelling such as `imy-r per`, avoiding rare Unicode characters |

## 3. Codes

**Region** (field 4)

| Code | Meaning |
|------|---------|
| `EUR` | Europe |
| `MEA` | Middle East |
| `CAS` | Central Asia and Caucasus |
| `SAS` | South Asia |
| `EAS` | East Asia |
| `SEAS` | Southeast Asia |
| `OCE` | Oceania |
| `AFR` | Africa |
| `AME` | Americas |

Pick the region where the language is or was spoken. Egyptian and Berber are `AFR`. Arabic, Hebrew and Persian are `MEA`.

**Era** (field 5)

| Code | Meaning |
|------|---------|
| `A` | Ancient, before about 500 CE |
| `M` | Historic, about 500 to 1900 |
| `N` | Modern, in current use or coined in the modern era |

If unsure between two eras, choose the later one.

**Domain** (field 6)

| Code | Covers |
|------|--------|
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

Choose the single best fit.

## 4. What counts as a valid term

Include a word only if **all** of these are true:

1. It names a **role or title of a person** (or a clearly personified office), not a place, tool or abstract noun.
2. The role is about **managing, supervising, keeping, administering or running** something, not only ruling, fighting or worshipping.
3. It is a **real word used in that language**, in the stated era, found in dictionaries, historical sources or normal modern usage.
4. You are **confident** about its spelling, script, and meaning.

Rulers, priests and generals are acceptable only when the title carries administrative or managerial duties (for example a temple administrator, a provincial governor, a treasury head). Skip pure royal or military rank titles.

## 5. Writing the meaning

- English, one short phrase, 5 to 18 words.
- Start with a lowercase letter. No final period.
- Say plainly what the person does and of what: `steward who managed a noble household`, `overseer of a royal workshop`.
- Add a short etymology only when it is well known and helps, for example `from Persian shāh-bandar`.
- Do not copy dictionary definitions word for word. Do not include the term itself in the meaning.
- No opinions, no marketing words, no emoji.

## 6. Accuracy rules (most important)

- **Never invent a word.** Do not translate an English word into another language by guess. Do not blend roots or create plausible-sounding titles.
- If you are not sure a term exists, is spelled that way, or means that, **leave it out**.
- Do not guess the script of a language you cannot write reliably. Skip it.
- Prefer terms with clear historical or current use over obscure ones you cannot verify.
- Keep each entry to the sense of managing. Do not stretch a meaning to fit.
- Producing **fewer lines than requested is correct** when reaching the count would require guessing. Never pad.

## 7. Coverage and balance

Spread entries across the lexicon instead of clustering:

- Use many languages in one batch. No single language should be more than about 12 percent of a batch.
- Give extra weight to regions that have fewer entries: `CAS`, `OCE`, `AME`, `AFR`, `SEAS`.
- Give extra weight to domains that have fewer entries: `GALLERY`, `EDUCATION`, `PERFORM`, `PORT`, `MILITARY`.
- Include a mix of eras, with modern workplace roles (studio, gallery, office, production) as well as ancient and historic ones.
- If the request names a **focus** (a region, era, domain or language), follow it, and ignore the balance rules above for that dimension.

## 8. No duplicates

- Do not repeat any `term` + `language` pair from the **already have** list in the request.
- Do not repeat a pair within your own output.
- The same word in a different language is allowed.
- Do not add a different spelling, script or romanization of a word that is already present.

## 9. Examples (format reference only, do not output these)

```
οἰκονόμος|oikonomos|Ancient Greek|EUR|A|HOUSE|household manager or steward; root of "economy"
Baumeister|Baumeister|German|EUR|M|STUDIO|master builder
学芸員|gakugeiin|Japanese|EAS|N|GALLERY|museum curator
شاهبندر|shāhbandar|Arabic|MEA|M|PORT|harbour master and head of merchants in a port
pochtecatl|pōchtēcatl|Nahuatl|AME|M|TRADE|long-distance merchant belonging to a trading guild
pemangku|pemangku|Balinese|SEAS|M|RELIGION|temple priest who manages temple rites
```

## 10. Request template (user message)

Fill in the values in double braces and send as the user message.

```
Generate {{COUNT}} new entries following the rules in the system prompt.

Focus (optional, leave blank for balanced coverage): {{FOCUS}}

Already have (do not repeat these term + language pairs):
{{EXISTING}}
```

`{{EXISTING}}` should be one `term|language` pair per line.

## 11. Notes for running it

- For best accuracy, request **100 to 150 entries per call** and repeat with an updated `{{EXISTING}}` list, instead of asking for a very large count at once.
- Check the output before use: every line must have 7 fields, valid region, era and domain codes, and no duplicate `term` + `language` pair.
- Spot-check a sample of entries for spelling and meaning, especially in less common languages.

