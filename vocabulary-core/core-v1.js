/* Rise Vocabulary Core v1
 * Normalizes native records while keeping progress in the existing native stores.
 * The quiz bootstrap loads only append-only Japanese vocabulary content; progress state is never migrated here.
 */
(function (root, factory) {
  if (root && root.document && /\/quiz\/?$/.test(root.location?.pathname || '') && !root.__AA_JAPANESE_VOCAB_SUPPLEMENT__) {
    try {
      if (root.document.readyState === 'loading') {
        root.document.write('<script src="../kokugo-chronologia/jukugo-bank-supplement-v1.js?v=20260905-2"></script>');
      }
    } catch (_) {}
  }
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.RISE_VOCABULARY_CORE_V1 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '1.2.0';
  const SUBJECTS = Object.freeze(['english', 'japanese', 'social']);

  const text = (value) => value == null ? '' : String(value).trim();
  const list = (value) => Array.isArray(value) ? value.map(text).filter(Boolean) : [];
  const unique = (values) => [...new Set(list(values))];

  function identityKey(record) {
    return [text(record && record.subject), text(record && record.id)].join(':');
  }

  function validateRecord(record) {
    const errors = [];
    if (!record || typeof record !== 'object') return { ok: false, errors: ['record must be an object'] };
    if (!text(record.id)) errors.push('id is required');
    if (!SUBJECTS.includes(record.subject)) errors.push('subject must be english, japanese or social');
    if (!text(record.category)) errors.push('category is required');
    if (!text(record.term)) errors.push('term is required');
    if (!text(record.meaning)) errors.push('meaning is required');
    if (!record.source || !text(record.source.system) || !text(record.source.nativeId)) errors.push('source.system and source.nativeId are required');
    if (!record.progressRef || !text(record.progressRef.store) || !text(record.progressRef.nativeId)) errors.push('progressRef.store and progressRef.nativeId are required');
    if (record.progressRef && record.progressRef.aliases != null && !Array.isArray(record.progressRef.aliases)) errors.push('progressRef.aliases must be an array');
    return { ok: errors.length === 0, errors };
  }

  function normalizeEnglish(native) {
    const id = text(native && native.id);
    const phrase = text(native && native.phrase);
    const isPhrase = Boolean(phrase);
    const word = text(native && (native.word || native.term || native.en || native.w || native.phrase));
    const meaning = text(native && (native.meaningJa || native.meaning || native.ja || native.m));
    const srsId = text(native && native.srsId) || (id ? (isPhrase ? 'phrase:' : 'v:') + id : '');
    const exampleEn = text(native && (native.example || native.sentence || native.exampleEn));
    const exampleJa = text(native && (native.exampleJa || native.jaSentence || native.exJa));
    return {
      id,
      subject: 'english',
      category: text(native && (native.kind || native.category)) || (isPhrase ? 'phrase' : 'word'),
      term: word,
      reading: text(native && (native.pronunciation || native.reading)) || null,
      meaning,
      examples: unique([...(Array.isArray(native && native.examples) ? native.examples : []), exampleEn]),
      importance: native && native.importance != null ? native.importance : null,
      examRank: text(native && native.examRank) || null,
      tags: list(native && native.tags),
      relatedTerms: list(native && native.relatedTerms),
      confusionGroup: text(native && native.confusionGroup) || null,
      source: {
        system: isPhrase ? 'english-collocation' : 'english-vocab',
        nativeId: id,
        path: isPhrase ? 'learning-engine-v15.js' : 'app/legacy/main-runtime.js',
        quality: native && (native.verified === true || native.qualityChecked === true) ? 'verified-local' : null
      },
      progressRef: {
        store: 'asahi_learning_os_v1',
        nativeId: srsId,
        aliases: [],
        adapter: 'AA_VOCAB_CATALOG_API',
        wrongStore: isPhrase ? null : 'aa_vocab_quiz_wrong_v1',
        cycleStore: null
      },
      english: {
        word: word || null,
        meaningJa: meaning || null,
        partOfSpeech: text(native && (native.partOfSpeech || native.pos)) || null,
        pronunciation: text(native && native.pronunciation) || null,
        forms: list(native && native.forms)
      },
      extensions: {
        native: native || null,
        exampleJa: exampleJa || null,
        distractors: list(native && native.distractors)
      }
    };
  }

  function japaneseFullBaseId(native) {
    const id = text(native && native.id);
    let match = id.match(/^quiz-full-(.+)$/);
    if (match) return match[1];
    match = id.match(/^j(\d+)$/);
    if (match) return match[1];
    if (/^\d+$/.test(id) && native && native.term != null) return id;
    if (/^\d+$/.test(id) && text(native && native.source) === 'full15000') return id;
    return '';
  }

  function normalizeJapanese(native) {
    const nativeId = text(native && native.id);
    const fullBaseId = japaneseFullBaseId(native);
    const id = fullBaseId ? `full-${fullBaseId}` : nativeId;
    const word = text(native && (native.word || native.term));
    const reading = text(native && (native.reading || native.yomi || native.kana));
    const type = text(native && (native.type || native.category)) || 'word';
    const inferredRank = (type === 'yoji' || type === 'idiom') ? 'B' : type === 'four' ? 'C' : '';
    const meaning = text(native && (native.verifiedMeaning || native.meaning));
    const listProgressId = fullBaseId ? `j${fullBaseId}` : nativeId;
    const quizProgressId = fullBaseId ? `quiz-full-${fullBaseId}` : '';
    return {
      id,
      subject: 'japanese',
      category: type,
      term: word,
      reading: reading || null,
      meaning,
      examples: unique([...(Array.isArray(native && native.examples) ? native.examples : []), text(native && native.example)]),
      importance: native && native.importance != null ? native.importance : null,
      examRank: text(native && (native.rank || native.examRank)) || inferredRank || null,
      tags: list(native && native.tags),
      relatedTerms: list(native && native.relatedTerms),
      confusionGroup: text(native && native.confusionGroup) || null,
      source: {
        system: fullBaseId ? 'kokugo-chronologia-full15000' : 'kokugo-chronologia',
        nativeId: fullBaseId || nativeId,
        path: fullBaseId ? 'kokugo-chronologia/data.jsonl' : 'kokugo-chronologia/',
        quality: native && (native.verified === true || native.qualityChecked === true) ? 'verified-local' : null
      },
      progressRef: {
        store: 'kokugoChronologiaStateV2',
        nativeId: listProgressId,
        aliases: unique([quizProgressId]),
        adapter: null,
        wrongStore: 'aa_kokugo_vocab_wrong_queue_v1',
        cycleStore: 'aa_kokugo_vocab_full15000_cycle_v1'
      },
      english: null,
      extensions: {
        native: native || null,
        full15000BaseId: fullBaseId || null
      }
    };
  }

  function normalizeSocial(native) {
    const id = text(native && native.id);
    const event = text(native && (native.event || native.term || native.title || native.name));
    const year = text(native && (native.year || native.date));
    const period = text(native && (native.period || native.periodCode));
    const area = text(native && (native.area || native.areaCode));
    return {
      id,
      subject: 'social',
      category: text(native && (native.category || native.field)) || period || 'history',
      term: event,
      reading: null,
      meaning: year || text(native && (native.meaning || native.description || native.detail)),
      examples: [],
      importance: native && native.importance != null ? native.importance : null,
      examRank: text(native && (native.level || native.rank)) || null,
      tags: list(native && native.tags),
      relatedTerms: list(native && native.relatedTerms),
      confusionGroup: text(native && native.confusionGroup) || null,
      source: { system: 'chronologia', nativeId: id, path: 'chronologia.html + chronologia-v7-data-*', quality: null },
      progressRef: { store: 'chronologia-aichi-v3', nativeId: id, aliases: [], adapter: null, wrongStore: null, cycleStore: null },
      english: null,
      extensions: {
        native: native || null,
        year: year || null,
        period: period || null,
        area: area || null,
        detail: text(native && native.detail) || null
      }
    };
  }

  return Object.freeze({
    VERSION,
    SUBJECTS,
    identityKey,
    validateRecord,
    normalizeEnglish,
    normalizeJapanese,
    normalizeSocial
  });
});
