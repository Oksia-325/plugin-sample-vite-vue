import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'

const projectRoot = new URL('../', import.meta.url)

function readJson(relativePath) {
  return JSON.parse(readFileSync(new URL(relativePath, projectRoot), 'utf8'))
}

test('plugin.json uses the Pigo plugin identity', () => {
  const info = readJson('plugin.json')

  assert.equal(info.name, 'siyuan-plugin-pigo')
  assert.equal(info.version, '0.1.0')
  assert.equal(info.displayName['zh-CN'], 'Pigo 图床')
  assert.ok(info.minAppVersion)
  assert.ok(Array.isArray(info.backends) && info.backends.length > 0)
  assert.ok(Array.isArray(info.frontends) && info.frontends.length > 0)
})

test('package.json version matches plugin.json', () => {
  const pluginInfo = readJson('plugin.json')
  const packageInfo = readJson('package.json')

  assert.equal(packageInfo.name, pluginInfo.name)
  assert.equal(packageInfo.version, pluginInfo.version)
})

test('development plan document is present', () => {
  const plan = readFileSync(new URL('开发步骤.md', projectRoot), 'utf8')

  assert.match(plan, /Phase 0/)
  assert.match(plan, /Phase 8/)
})
