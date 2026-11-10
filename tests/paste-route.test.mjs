import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isPigoPanelElement, isPigoPanelPaste } from '../src/core/paste/panelPaste.ts'

function fakeElement(matchesPanel) {
  return {
    closest(selector) {
      return matchesPanel && selector === '.pigo-popup' ? { selector } : null
    },
  }
}

test('isPigoPanelElement detects nodes inside the pigo popup', () => {
  assert.equal(isPigoPanelElement(fakeElement(true)), true)
  assert.equal(isPigoPanelElement(fakeElement(false)), false)
})

test('isPigoPanelElement tolerates missing or invalid nodes', () => {
  assert.equal(isPigoPanelElement(null), false)
  assert.equal(isPigoPanelElement(undefined), false)
  assert.equal(isPigoPanelElement({}), false)
  assert.equal(isPigoPanelElement('not-an-element'), false)
})

test('isPigoPanelPaste checks both the target and the active element', () => {
  assert.equal(isPigoPanelPaste(fakeElement(true), fakeElement(false)), true)
  assert.equal(isPigoPanelPaste(fakeElement(false), fakeElement(true)), true)
  assert.equal(isPigoPanelPaste(fakeElement(false), fakeElement(false)), false)
  assert.equal(isPigoPanelPaste(null, null), false)
})
