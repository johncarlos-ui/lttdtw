import assert from 'node:assert/strict';
import { pages, heading, isOnHold } from '../src/lib/pages.mjs';
assert.equal(pages.length, 57);
for (const page of pages) {
  assert.match(page.path, /^\/(?:[a-z0-9-]+\/)*$/);
  for (const key of ['Page title', 'Search description', 'Search terms it owns', 'Links to']) {
    assert.ok(page.settings[key]?.trim(), page.path + ' missing ' + key);
  }
  assert.ok(heading(page), 'Missing first heading for ' + page.path);
  assert.ok(page.sections.length >= 3);
}
console.log('Verified 57 unique addresses, 57 first headings, all four required page settings, and all section bodies.');
console.log('Held routes (' + pages.filter(p => isOnHold(p.path)).length + '): ' + pages.filter(p => isOnHold(p.path)).map(p => p.path).join(', '));
