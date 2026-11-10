import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  replaceImageUrlsInMarkdown,
  replaceMarkdownImageUrls,
  replaceTitleImageUrl,
} from '../src/core/scan/parser.ts'
import { runWithConcurrency } from '../src/core/upload/concurrency.ts'
import {
  detectImageContentType,
  extensionFromFileName,
  extensionFromMime,
} from '../src/core/upload/mime.ts'

test('replaceMarkdownImageUrls only replaces image destinations', () => {
  const markdown = [
    '正文里也出现了 https://old.example.com/a.jpg 这段文字',
    '![x](https://old.example.com/a.jpg "title")',
    '![y](assets/b.jpg)',
  ].join('\n')

  const result = replaceMarkdownImageUrls(markdown, new Map([
    ['https://old.example.com/a.jpg', 'https://new.example.com/a.jpg'],
  ]))

  assert.match(result, /正文里也出现了 https:\/\/old\.example\.com\/a\.jpg 这段文字/)
  assert.match(result, /!\[x\]\(https:\/\/new\.example\.com\/a\.jpg "title"\)/)
  assert.match(result, /!\[y\]\(assets\/b\.jpg\)/)
})

test('replaceMarkdownImageUrls handles angle bracket URLs', () => {
  const markdown = '![x](<https://old.example.com/a b.jpg>)'
  const result = replaceMarkdownImageUrls(markdown, new Map([
    ['https://old.example.com/a b.jpg', 'https://new.example.com/c.jpg'],
  ]))

  assert.equal(result, '![x](<https://new.example.com/c.jpg>)')
})

test('replaceImageUrlsInMarkdown replaces HTML src and decodes entities', () => {
  const markdown = '<p><img src="https://old.example.com/a.jpg?x=1&amp;y=2" alt="a"></p>'
  const result = replaceImageUrlsInMarkdown(markdown, new Map([
    ['https://old.example.com/a.jpg?x=1&y=2', 'https://new.example.com/b.jpg'],
  ]))

  assert.equal(result, '<p><img src="https://new.example.com/b.jpg" alt="a"></p>')
})

test('replaceTitleImageUrl keeps the background-image wrapper', () => {
  const value = 'background-image:url("assets/cover.webp")'
  assert.equal(
    replaceTitleImageUrl(value, 'assets/cover.webp', 'https://cdn.example.com/cover.webp'),
    'background-image:url("https://cdn.example.com/cover.webp")'
  )
})

test('detectImageContentType sniffs common image formats', () => {
  const png = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
  const jpeg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0])
  const gif = new TextEncoder().encode('GIF89a....')
  const webp = new Uint8Array([
    0x52, 0x49, 0x46, 0x46,
    0x00, 0x00, 0x00, 0x00,
    0x57, 0x45, 0x42, 0x50,
  ])
  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>')

  assert.equal(detectImageContentType(png), 'image/png')
  assert.equal(detectImageContentType(jpeg), 'image/jpeg')
  assert.equal(detectImageContentType(gif), 'image/gif')
  assert.equal(detectImageContentType(webp), 'image/webp')
  assert.equal(detectImageContentType(svg), 'image/svg+xml')
})

test('extension helpers handle queries and common MIME types', () => {
  assert.equal(extensionFromMime('image/jpeg'), 'jpg')
  assert.equal(extensionFromMime('image/svg+xml'), 'svg')
  assert.equal(extensionFromMime('application/octet-stream'), '')
  assert.equal(extensionFromFileName('photo.JPG?x=1'), 'jpg')
  assert.equal(extensionFromFileName('https://example.com/images?q=tbn:abc&s=10'), '')
})

test('runWithConcurrency limits parallelism and completes all tasks', async () => {
  let active = 0
  let maxActive = 0
  let completed = 0
  const tasks = Array.from({ length: 20 }, () => async () => {
    active++
    maxActive = Math.max(maxActive, active)
    await new Promise((resolve) => setTimeout(resolve, 1))
    active--
    completed++
  })

  await runWithConcurrency(tasks, 4, () => false)

  assert.equal(completed, 20)
  assert.ok(maxActive <= 4, `max active was ${maxActive}`)
})

test('runWithConcurrency works when isCancelled is omitted', async () => {
  let completed = 0
  const tasks = Array.from({ length: 6 }, () => async () => {
    await new Promise((resolve) => setTimeout(resolve, 1))
    completed++
  })

  await runWithConcurrency(tasks, 3)

  assert.equal(completed, 6)
})

test('runWithConcurrency stops scheduling after cancellation', async () => {
  let completed = 0
  let cancelled = false
  const tasks = Array.from({ length: 20 }, () => async () => {
    await new Promise((resolve) => setTimeout(resolve, 1))
    completed++
    if (completed >= 5) {
      cancelled = true
    }
  })

  await runWithConcurrency(tasks, 2, () => cancelled)
  assert.ok(completed < 20)
})
