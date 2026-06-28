import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  addResponsiveZoneListener,
  removeResponsiveZoneListener,
} from '../src/app/responsive-zone-listener.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const panelLayoutSrc = readFileSync(
  resolve(__dirname, '../src/app/panel-layout.ts'),
  'utf-8',
);

class FakeMediaQueryList extends EventTarget {
  constructor(media) {
    super();
    this.media = media;
    this.matches = false;
  }

  setMatches(matches) {
    if (this.matches === matches) return;
    this.matches = matches;
    this.dispatchEvent(new Event('change'));
  }
}

function createTarget() {
  const lists = [];
  return {
    lists,
    target: {
      matchMedia(query) {
        const list = new FakeMediaQueryList(query);
        lists.push(list);
        return list;
      },
    },
  };
}

describe('responsive zone listener', () => {
  it('listens to the configured min-width media query', () => {
    const { target, lists } = createTarget();

    const listener = addResponsiveZoneListener(target, 1600, () => {});

    assert.equal(lists.length, 1);
    assert.equal(lists[0].media, '(min-width: 1600px)');
    removeResponsiveZoneListener(listener);
  });

  it('runs immediately when the breakpoint state changes', () => {
    const { target, lists } = createTarget();
    let callCount = 0;

    const listener = addResponsiveZoneListener(target, 1600, () => { callCount++; });

    lists[0].setMatches(true);

    assert.equal(callCount, 1, 'breakpoint changes must not wait for a timeout debounce');
    removeResponsiveZoneListener(listener);
  });

  it('does not fire repeatedly while the breakpoint state is stable', () => {
    const { target, lists } = createTarget();
    let callCount = 0;

    const listener = addResponsiveZoneListener(target, 1600, () => { callCount++; });

    lists[0].setMatches(true);
    lists[0].setMatches(true);
    lists[0].setMatches(true);

    assert.equal(callCount, 1);
    removeResponsiveZoneListener(listener);
  });

  it('cleanup removes the breakpoint listener', () => {
    const { target, lists } = createTarget();
    let callCount = 0;

    const listener = addResponsiveZoneListener(target, 1600, () => { callCount++; });
    removeResponsiveZoneListener(listener);

    lists[0].setMatches(true);

    assert.equal(callCount, 0);
  });

  it('re-init cleanup prevents old listeners from firing after replacement', () => {
    const { target, lists } = createTarget();
    let callCount = 0;

    const firstListener = addResponsiveZoneListener(target, 1600, () => { callCount++; });
    removeResponsiveZoneListener(firstListener);
    const secondListener = addResponsiveZoneListener(target, 1600, () => { callCount++; });

    lists[0].setMatches(true);
    lists[1].setMatches(true);

    assert.equal(callCount, 1);
    removeResponsiveZoneListener(secondListener);
  });
});

describe('panel layout responsive zone wiring', () => {
  it('registers breakpoint-aware zone reconciliation', () => {
    assert.match(
      panelLayoutSrc,
      /this\.responsiveZoneListener\s*=\s*addResponsiveZoneListener\(\s*window,\s*this\.getUltraWideMinWidth\(\),\s*\(\)\s*=>\s*this\.ensureCorrectZones\(\),\s*\)/s,
    );
  });

  it('does not keep the original per-resize ensureCorrectZones listener', () => {
    assert.doesNotMatch(
      panelLayoutSrc,
      /window\.addEventListener\s*\(\s*['"]resize['"]\s*,\s*\(\)\s*=>\s*this\.ensureCorrectZones\(\)\s*\)/,
    );
  });

  it('does not use a trailing timeout debounce for zone reconciliation', () => {
    assert.doesNotMatch(
      panelLayoutSrc,
      /ensureCorrectZones[\s\S]{0,120}(100|setTimeout|debounce)/,
    );
  });
});
