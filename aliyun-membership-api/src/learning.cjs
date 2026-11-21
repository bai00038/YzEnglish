const ENTRY = /^(?:word|chunk|pattern)-[A-Za-z0-9_-]{1,160}$/;
const SCENE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,100}$/;
const emptyLearning = () => ({ progress: {}, learned: [], mistakes: [], migratedDevices: [] });
const validDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
function progressRecord(value) {
  if (!value || !Number.isFinite(value.percent) || value.percent < 0 || value.percent > 100 || !validDate(value.updatedAt)) throw new Error('invalid_learning_data');
  return { percent: value.percent, updatedAt: new Date(value.updatedAt).toISOString() };
}
function mistakeRecord(value) {
  if (!value || !ENTRY.test(value.entryId) || !['manual', 'dictation'].includes(value.source) || (value.sceneId != null && !SCENE.test(value.sceneId)) || !validDate(value.addedAt)) throw new Error('invalid_learning_data');
  return { entryId: value.entryId, source: value.source, sceneId: value.sceneId || null, addedAt: new Date(value.addedAt).toISOString() };
}
function validateChange(body) {
  if (!body || typeof body !== 'object') throw new Error('invalid_learning_data');
  if (body.type === 'progress' && typeof body.sceneId === 'string' && SCENE.test(body.sceneId) && !['__proto__', 'constructor', 'prototype'].includes(body.sceneId)) return { type: body.type, sceneId: body.sceneId, value: progressRecord(body.value) };
  if (['learn', 'unlearn', 'removeMistake'].includes(body.type) && ENTRY.test(body.entryId)) return { type: body.type, entryId: body.entryId };
  if (body.type === 'addMistake') return { type: body.type, value: mistakeRecord(body.value) };
  if (body.type === 'merge') {
    const value = body.value;
    if (!value || !value.progress || typeof value.progress !== 'object' || Array.isArray(value.progress) || !Array.isArray(value.learned) || !Array.isArray(value.mistakes)) throw new Error('invalid_learning_data');
    if (Object.keys(value.progress).length > 5000 || value.learned.length > 10000 || value.mistakes.length > 10000) throw new Error('invalid_learning_data');
    const progress = {};
    for (const [id, record] of Object.entries(value.progress)) {
      if (!SCENE.test(id) || ['__proto__', 'constructor', 'prototype'].includes(id)) throw new Error('invalid_learning_data');
      progress[id] = progressRecord(record);
    }
    if (!value.learned.every(id => typeof id === 'string' && ENTRY.test(id))) throw new Error('invalid_learning_data');
    return { type: 'merge', value: { progress, learned: [...new Set(value.learned)], mistakes: value.mistakes.map(mistakeRecord) } };
  }
  throw new Error('invalid_learning_data');
}
function applyChange(previous, change, deviceHash) {
  const state = structuredClone(previous ?? emptyLearning());
  const putProgress = (id, value) => {
    if (!state.progress[id] || Date.parse(value.updatedAt) > Date.parse(state.progress[id].updatedAt)) state.progress[id] = value;
  };
  const putMistake = value => {
    const current = state.mistakes.find(item => item.entryId === value.entryId);
    if (!current) state.mistakes.push(value);
    else if (Date.parse(value.addedAt) >= Date.parse(current.addedAt)) Object.assign(current, value);
  };
  if (change.type === 'merge') {
    if (state.migratedDevices.includes(deviceHash)) return state;
    for (const [id, value] of Object.entries(change.value.progress)) putProgress(id, value);
    state.learned = [...new Set([...state.learned, ...change.value.learned])];
    change.value.mistakes.forEach(putMistake);
    state.migratedDevices.push(deviceHash);
  } else if (change.type === 'progress') putProgress(change.sceneId, change.value);
  else if (change.type === 'learn') state.learned = [...new Set([...state.learned, change.entryId])];
  else if (change.type === 'unlearn') state.learned = state.learned.filter(id => id !== change.entryId);
  else if (change.type === 'addMistake') putMistake(change.value);
  else if (change.type === 'removeMistake') state.mistakes = state.mistakes.filter(item => item.entryId !== change.entryId);
  if (Object.keys(state.progress).length > 5000 || state.learned.length > 10000 || state.mistakes.length > 10000) throw new Error('learning_capacity');
  return state;
}
function publicLearning(state) {
  const { progress, learned, mistakes } = state ?? emptyLearning();
  return { progress, learned, mistakes };
}
module.exports = { emptyLearning, validateChange, applyChange, publicLearning };
