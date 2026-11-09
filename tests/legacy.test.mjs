import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mapLegacyPicgoConfig, parseLegacyConfig } from '../src/core/legacyConfig.ts'

test('maps old Tencent COS config to S3 config', () => {
  const parsed = parseLegacyConfig({
    picBed: {
      uploader: 'tcyun',
      tcyun: {
        area: 'ap-guangzhou',
        bucket: 'picgo-1312673255',
        secretId: 'AKIDEXAMPLE',
        secretKey: 'SECRETEXAMPLE',
        path: 'siyuan/',
        customUrl: 'https://picgo-1312673255.cos.ap-guangzhou.myqcloud.com/',
      },
    },
  })

  assert.ok(parsed)
  const result = mapLegacyPicgoConfig(parsed)
  assert.ok(result)
  assert.equal(result.source, 'tcyun')
  assert.equal(result.s3.endpoint, 'https://cos.ap-guangzhou.myqcloud.com')
  assert.equal(result.s3.region, 'ap-guangzhou')
  assert.equal(result.s3.bucket, 'picgo-1312673255')
  assert.equal(result.s3.accessKeyId, 'AKIDEXAMPLE')
  assert.equal(result.s3.secretAccessKey, 'SECRETEXAMPLE')
  assert.equal(result.s3.uploadPath, 'siyuan/{year}/{month}/{md5}.{ext}')
  assert.equal(result.s3.customUrl, 'https://picgo-1312673255.cos.ap-guangzhou.myqcloud.com')
  assert.deepEqual(result.s3.extraUrlPrefixes, ['https://picgo-1312673255.cos.ap-guangzhou.myqcloud.com'])
  assert.deepEqual(result.warnings, [])
})

test('maps old AWS S3 config and keeps path style', () => {
  const result = mapLegacyPicgoConfig({
    picBed: {
      uploader: 'awss3',
      awss3: {
        endpoint: 'https://s3.us-east-1.amazonaws.com/',
        region: 'us-east-1',
        bucketName: 'my-bucket',
        accessKeyID: 'AKIAEXAMPLE',
        secretAccessKey: 'SECRET',
        uploadPath: 'notes/{fullName}',
        customUrl: 'https://cdn.example.com',
        pathStyleAccess: true,
        acl: 'private',
      },
    },
  })

  assert.ok(result)
  assert.equal(result.source, 'awss3')
  assert.equal(result.s3.endpoint, 'https://s3.us-east-1.amazonaws.com')
  assert.equal(result.s3.bucket, 'my-bucket')
  assert.equal(result.s3.uploadPath, 'notes/{fullName}')
  assert.equal(result.s3.customUrl, 'https://cdn.example.com')
  assert.equal(result.s3.pathStyleAccess, true)
  assert.equal(result.s3.acl, 'private')
})

test('parseLegacyConfig accepts JSON strings and rejects API error objects', () => {
  assert.deepEqual(
    parseLegacyConfig('{"picBed":{"uploader":"tcyun"}}'),
    { picBed: { uploader: 'tcyun' } }
  )
  assert.equal(parseLegacyConfig('not json'), null)
  assert.equal(parseLegacyConfig({ code: -1, msg: 'not found' }), null)
  assert.equal(parseLegacyConfig(null), null)
})

test('mapLegacyPicgoConfig warns when credentials are missing', () => {
  const result = mapLegacyPicgoConfig({
    picBed: {
      tcyun: {
        area: 'ap-guangzhou',
        bucket: 'bucket-1250000000',
        path: 'siyuan/',
      },
    },
  })

  assert.ok(result)
  assert.ok(result.warnings.some((item) => item.includes('secretId/secretKey')))
})
