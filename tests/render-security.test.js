const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('client/script.js', 'utf8');
const functionSource = source.match(/function setMetric\(element, value, label\) \{[\s\S]*?\n\}/)[0];
function element() { return { children: [], textContent: '', replaceChildren(...children) { this.children = children; } }; }
const context = { document: { createElement: element } };
vm.runInNewContext(functionSource, context);
test('usage labels remain literal text', () => {
  const target = element();
  const payload = '<img src=x onerror=alert(1)>';
  context.setMetric(target, payload, 'Usage Level');
  assert.equal(target.children[0].textContent, payload);
  assert.equal(target.children[1], ' Usage Level');
});
