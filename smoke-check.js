const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadChallenges() {
  const src = fs.readFileSync(path.join(__dirname, 'challenges.js'), 'utf8');
  const sandbox = { console };
  vm.createContext(sandbox);
  vm.runInContext(`${src}\nthis.__CHALLENGES__ = CHALLENGES;`, sandbox, { filename: 'challenges.js' });
  return sandbox.__CHALLENGES__;
}

function loadEngine() {
  const src = fs.readFileSync(path.join(__dirname, 'engine.js'), 'utf8');
  const sandbox = { console, Math };
  vm.createContext(sandbox);
  vm.runInContext(`${src}\nthis.__RAGEngine__ = RAGEngine;`, sandbox, { filename: 'engine.js' });
  return sandbox.__RAGEngine__;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function flattenChallenges(challenges) {
  return [...challenges.easy, ...challenges.medium, ...challenges.hard];
}

function run() {
  const challenges = loadChallenges();
  const RAGEngine = loadEngine();
  const engine = new RAGEngine();
  const all = flattenChallenges(challenges);

  assert(all.length === 9, `Expected 9 challenges, got ${all.length}`);

  const realRandom = Math.random;
  Math.random = () => 0.5;

  try {
    for (const challenge of all) {
      assert(Array.isArray(challenge.knowledgeBase) && challenge.knowledgeBase.length >= 3, `${challenge.id}: invalid knowledge base`);
      assert(challenge.targetQuery && challenge.successCriteria, `${challenge.id}: missing query or success criteria`);

      const poisonDoc = {
        title: `${challenge.id}_validation_doc.txt`,
        content: `${challenge.targetQuery} ${challenge.successCriteria.mustContain?.[0] || 'validation'} ${challenge.description}`
      };

      const retrieval = engine.simulateRetrieval(challenge, poisonDoc);
      const expectedMax = Math.min(challenge.system.topK || 3, challenge.knowledgeBase.length + 1);
      assert(Array.isArray(retrieval) && retrieval.length === expectedMax, `${challenge.id}: invalid retrieval output`);

      const result = engine.evaluateAttack(challenge, poisonDoc);
      assert(typeof result.success === 'boolean', `${challenge.id}: success is not boolean`);
      assert(Array.isArray(result.retrievedChunks), `${challenge.id}: retrievedChunks missing`);
      assert(result.siAnalysis && typeof result.siAnalysis.quality === 'string', `${challenge.id}: missing S+I analysis`);
    }
  } finally {
    Math.random = realRandom;
  }

  console.log(`Smoke check passed for ${all.length} challenges.`);
}

run();
