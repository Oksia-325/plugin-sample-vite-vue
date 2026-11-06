import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  classifyUrl,
  decodeHtmlEntities,
  extractAssetPath,
  extractFileMapFromIal,
  extractIalAttributes,
  extractTitleImageFromIal,
  parseHtmlImages,
  parseMarkdownImages,
  parseTitleImage,
} from '../src/core/scan/parser.ts'
import { matchS3Key } from '../src/core/scan/s3Key.ts'

const s3Config = {
  endpoint: 'https://cos.ap-guangzhou.myqcloud.com',
  region: 'ap-guangzhou',
  bucket: 'picgo-1312673255',
  accessKeyId: 'ak',
  secretAccessKey: 'sk',
  uploadPath: 'siyuan/{year}/{month}/{md5}.{ext}',
  customUrl: 'https://picgo-1312673255.cos.ap-guangzhou.myqcloud.com',
  extraUrlPrefixes: ['https://cdn.example.com/images'],
  pathStyleAccess: false,
  acl: 'public-read',
  useSiyuanProxy: true,
  timeoutMs: 60000,
}

test('parseMarkdownImages handles queries, titles and nested parentheses', () => {
  const markdown = [
    '![austin](https://picgo-1312673255.cos.ap-guangzhou.myqcloud.com/siyuan/austin.jpg)',
    '![google](assets/google.jpg "local title")',
    '![](https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQx96&s=10)',
    '![wiki](https://example.com/a_(b).jpg)',
    '![space](<https://example.com/a file.jpg>)',
  ].join('\n')

  const images = parseMarkdownImages(markdown)

  assert.equal(images.length, 5)
  assert.equal(images[0].url, 'https://picgo-1312673255.cos.ap-guangzhou.myqcloud.com/siyuan/austin.jpg')
  assert.equal(images[1].url, 'assets/google.jpg')
  assert.equal(images[1].title, 'local title')
  assert.equal(images[2].url, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQx96&s=10')
  assert.equal(images[3].url, 'https://example.com/a_(b).jpg')
  assert.equal(images[4].url, 'https://example.com/a file.jpg')
})

test('parseHtmlImages reads src, alt, title and decodes entities', () => {
  const html = '<p><img src="https://example.com/a.png?x=1&amp;y=2" alt="A" title="T"></p><img src=\'/b.jpg\'>'
  const images = parseHtmlImages(html)

  assert.equal(images.length, 2)
  assert.equal(images[0].url, 'https://example.com/a.png?x=1&y=2')
  assert.equal(images[0].alt, 'A')
  assert.equal(images[0].title, 'T')
  assert.equal(images[1].url, '/b.jpg')
})

test('parseTitleImage handles background-image and plain URLs', () => {
  assert.equal(parseTitleImage('background-image:url("assets/cover.webp")')?.url, 'assets/cover.webp')
  assert.equal(parseTitleImage('background-image:url(\'https://x/a.jpg\')')?.url, 'https://x/a.jpg')
  assert.equal(parseTitleImage('url(assets/a.jpg)')?.url, 'assets/a.jpg')
  assert.equal(parseTitleImage('https://x/a.jpg')?.url, 'https://x/a.jpg')
  assert.equal(parseTitleImage(''), null)
})

test('IAL parsing extracts title-img and fileMap', () => {
  const ial = '{: id="doc" title="图片测试" title-img="background-image:url(&quot;assets/cover_062.webp&quot;)" type="doc" custom-picgo-file-map-key="&#123;&quot;abc&quot;:&#123;&quot;url&quot;:&quot;https://x/a.jpg&quot;&#125;&#125;"}'
  const attrs = extractIalAttributes(ial)
  const fileMap = extractFileMapFromIal(ial)

  assert.equal(attrs.id, 'doc')
  assert.equal(extractTitleImageFromIal(ial), 'background-image:url("assets/cover_062.webp")')
  assert.ok(fileMap)
  assert.equal(fileMap.abc.url, 'https://x/a.jpg')
})

test('decodeHtmlEntities handles named and numeric entities', () => {
  assert.equal(decodeHtmlEntities('&quot;x&quot; &amp; &#123; &#x7D;'), '"x" & { }')
})

test('classifyUrl distinguishes local, S3, remote and data', () => {
  assert.deepEqual(
    classifyUrl('assets/中文 图片.jpg', s3Config),
    { sourceType: 'local', normalizedUrl: 'local:assets/中文 图片.jpg', assetPath: 'assets/中文 图片.jpg' }
  )
  assert.equal(classifyUrl('/assets/a.jpg', s3Config).assetPath, 'assets/a.jpg')
  assert.equal(classifyUrl('http://127.0.0.1:6806/assets/a.jpg', s3Config).sourceType, 'local')
  assert.equal(classifyUrl('data:image/png;base64,AAAA', s3Config).sourceType, 'data')
  assert.equal(classifyUrl('https://other.example.com/a.jpg', s3Config).sourceType, 'remote')

  const s3 = classifyUrl('https://picgo-1312673255.cos.ap-guangzhou.myqcloud.com/siyuan/a.jpg?x=1', s3Config)
  assert.equal(s3.sourceType, 's3')
  assert.equal(s3.s3Key, 'siyuan/a.jpg')
})

test('matchS3Key supports customUrl, extra prefixes, virtual host and path style', () => {
  assert.equal(
    matchS3Key('https://picgo-1312673255.cos.ap-guangzhou.myqcloud.com/siyuan/a.jpg?x=1', s3Config),
    'siyuan/a.jpg'
  )
  assert.equal(
    matchS3Key('https://cdn.example.com/images/2026/11/a.jpg', s3Config),
    '2026/11/a.jpg'
  )
  assert.equal(
    matchS3Key('https://picgo-1312673255.cos.ap-guangzhou.myqcloud.com/siyuan/%E4%B8%AD%E6%96%87.jpg', s3Config),
    'siyuan/中文.jpg'
  )
  assert.equal(
    matchS3Key('https://cos.ap-guangzhou.myqcloud.com/picgo-1312673255/siyuan/a.jpg', {
      ...s3Config,
      pathStyleAccess: true,
    }),
    'siyuan/a.jpg'
  )
  assert.equal(matchS3Key('https://other.example.com/a.jpg', s3Config), undefined)
})

test('extractAssetPath handles query strings and full asset URLs', () => {
  assert.equal(extractAssetPath('assets/a.jpg?x=1'), 'assets/a.jpg')
  assert.equal(extractAssetPath('./assets/a.jpg'), 'assets/a.jpg')
  assert.equal(extractAssetPath('http://127.0.0.1:6806/assets/a.jpg'), 'assets/a.jpg')
  assert.equal(extractAssetPath('https://example.com/a.jpg'), undefined)
})
