/* Rise Vocabulary Core v1
 * Foundation only: this file is intentionally NOT loaded by the production UI yet.
 * It normalizes native records while keeping progress in the existing native stores.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.RISE_VOCABULARY_CORE_V1 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '1.0.0';
  const SUBJECTS = Object.freeze(['english', 'japanese', 'social']);

  const text = (value) => value == null ? '' : String(value).trim();
  const list = (value) => Array.isArray(value) ? value.map(text).filter(Boolean) : [];

  function identityKey(record) {
    return [text(record && record.subject), text(record && record.category), text(record && record.id)].join(':');
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
    return { ok: errors.length === 0, errors };
  }

  function normalizeEnglish(native) {
    const id = text(native && native.id);
    const word = text(native && (native.word || native.term));
    const meaning = text(native && (native.meaningJa || native.meaning || native.ja));
    const srsId = text(native && native.srsId) || (id ? 'v:' + id : '');
    return {
      id: id,
      subject: 'english',
      category: text(native && (native.kind || native.category)) || 'word',
      term: word,
      reading: text(native && (native.pronunciation || native.reading)) || null,
      meaning: meaning,
      examples: list(native && (native.examples || native.example ? (native.examples || [native.example]) : [])),
      importance: native && native.importance != null ? native.importance : null,
      examRank: text(native && native.examRank) || null,
      tags: list(native && native.tags),
      relatedTerms: list(native && native.relatedTerms),
      confusionGroup: text(native && native.confusionGroup) || null,
      source: { system: 'english-vocab', nativeId: id, path: 'vocab.html', quality: null },
      progressRef: { store: 'asahi_learning_os_v1', nativeId: srsId, adapter: 'AA_VOCAB_CATALOG_API', wrongStore: 'aa_vocab_quiz_wrong_v1', cycleStore: null },
      english: {
        word: word || null,
        meaningJa: meaning || null,
        partOfSpeech: text(native && (native.partOfSpeech || native.pos)) || null,
        pronunciation: text(native && native.pronunciation) || null,
        forms: list(native && native.forms)
      },
      extensions: { native: native || null }
    };
  }

  function normalizeJapanese(native) {
    const id = text(native && native.id);
    const word = text(native && (native.word || native.term));
    const reading = text(native && (native.reading || native.yomi || native.kana));
    return {
      id: id,
      subject: 'japanese',
      category: text(native && (native.type || native.category)) || 'word',
      term: word,
      reading: reading || null,
      meaning: text(native && native.meaning),
      examples: list(native && (native.examples || native.example ? (native.examples || [native.example]) : [])),
      importance: native && native.importance != null ? native.importance : null,
      examRank: text(native && (native.rank || native.examRank)) || null,
      tags: list(native && native.tags),
      relatedTerms: list(native && native.relatedTerms),
      confusionGroup: text(native && native.confusionGroup) || null,
      source: { system: 'kokugo-chronologia', nativeId: id || [word, reading].filter(Boolean).join('|'), path: 'kokugo-chronologia/data.jsonl', quality: null },
      progressRef: { store: 'kokugoChronologiaStateV2', nativeId: id || [word, reading].filter(Boolean).join('|'), adapter: null, wrongStore: 'aa_kokugo_vocab_wrong_queue_v1', cycleStore: 'aa_kokugo_vocab_full15000_cycle_v1' },
      english: null,
      extensions: { native: native || null }
    };
  }

  function normalizeSocial(native) {
    const id = text(native && native.id);
    const event = text(native && (native.event || native.term || native.title || native.name));
    const year = text(native && (native.year || native.date));
    return {
      id: id,
      subject: 'social',
      category: text(native && (native.category || native.period || native.field)) || 'history',
      term: event,
      reading: null,
      meaning: year || text(native && (native.meaning || native.description)),
      examples: [],
      importance: native && native.importance != null ? native.importance : null,
      examRank: text(native && (native.level || native.rank)) || null,
      tags: list(native && native.tags),
      relatedTerms: list(native && native.relatedTerms),
      confusionGroup: text(native && native.confusionGroup) || null,
      source: { system: 'chronologia', nativeId: id, path: 'chronologia.html', quality: null },
      progressRef: { store: 'chronologia-aichi-v3', nativeId: id, adapter: null, wrongStore: null, cycleStore: null },
      english: null,
      extensions: { native: native || null, year: year || null, period: text(native && native.period) || null }
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
