import assert from 'node:assert/strict';
import { findTroubleshootingTopic, TROUBLESHOOTING_TOPICS } from '../data/troubleshooting';

const cases: [string, string | undefined][] = [
  ['My servo lid is not moving', 'servo'],
  ['HC-SR04 echo readings jump', 'sensor'],
  ['The night light LED stays on', 'light'],
  ['WebGL canvas is blank', 'studio'],
  ['Reserved parts change my match', 'inventory'],
  ['Firebase permission denied', 'account'],
  ['No Eco Points after completion', 'progress'],
  ['Battery is overheating', 'power'],
  ['My preserved notes disappeared', undefined],
  ['Tell me the weather tomorrow', undefined],
];
for (const [input, expected] of cases) assert.equal(findTroubleshootingTopic(input)?.id, expected, input);
assert.equal(new Set(TROUBLESHOOTING_TOPICS.map(topic => topic.id)).size, TROUBLESHOOTING_TOPICS.length);
for (const topic of TROUBLESHOOTING_TOPICS) {
  assert.ok(topic.checks.length >= 3 && topic.followUp.length > 0);
  assert.ok(topic.href.startsWith('/'));
}
console.log('Troubleshooting: 10 symptom-routing cases and topic integrity checks passed.');
