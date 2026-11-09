import assert from 'node:assert/strict'
import { test } from 'node:test'
import { describeStorage, detectStorageVendor } from '../src/core/s3/describe.ts'

test('detectStorageVendor recognises Tencent COS endpoints', () => {
  assert.equal(detectStorageVendor('https://cos.ap-guangzhou.myqcloud.com'), 'Tencent COS')
  assert.equal(detectStorageVendor('cos.ap-guangzhou.myqcloud.com'), 'Tencent COS')
  assert.equal(detectStorageVendor('https://picgo-1312673255.cos.ap-guangzhou.myqcloud.com'), 'Tencent COS')
})

test('detectStorageVendor recognises AWS / Aliyun / Huawei / R2', () => {
  assert.equal(detectStorageVendor('https://s3.ap-northeast-1.amazonaws.com'), 'AWS S3')
  assert.equal(detectStorageVendor('https://oss-cn-hangzhou.aliyuncs.com'), 'Aliyun OSS')
  assert.equal(detectStorageVendor('https://obs.cn-east-3.myhuaweicloud.com'), 'Huawei OBS')
  assert.equal(detectStorageVendor('https://account.r2.cloudflarestorage.com'), 'Cloudflare R2')
})

test('detectStorageVendor falls back to MinIO for local endpoints', () => {
  assert.equal(detectStorageVendor('http://localhost:9000'), 'MinIO')
  assert.equal(detectStorageVendor('http://127.0.0.1:9000'), 'MinIO')
  assert.equal(detectStorageVendor('http://192.168.1.20:9000'), 'MinIO')
})

test('detectStorageVendor keeps unknown providers generic', () => {
  assert.equal(detectStorageVendor('https://s3.example.com'), 'S3 兼容存储')
  assert.equal(detectStorageVendor(''), '')
  assert.equal(detectStorageVendor('not a url'), '')
})

test('describeStorage builds the footer label with region', () => {
  const descriptor = describeStorage({
    endpoint: 'https://cos.ap-guangzhou.myqcloud.com',
    customUrl: '',
    region: 'ap-guangzhou',
  })

  assert.equal(descriptor.vendor, 'Tencent COS')
  assert.equal(descriptor.region, 'ap-guangzhou')
  assert.equal(descriptor.label, 'Tencent COS (ap-guangzhou)')
})

test('describeStorage omits empty region and shows unconfigured state', () => {
  assert.equal(
    describeStorage({ endpoint: 'https://s3.ap-northeast-1.amazonaws.com', customUrl: '', region: '' }).label,
    'AWS S3'
  )
  assert.equal(
    describeStorage({ endpoint: '', customUrl: '', region: 'ap-guangzhou' }).label,
    '未配置'
  )
})

test('describeStorage falls back to customUrl when endpoint is empty', () => {
  const descriptor = describeStorage({
    endpoint: '',
    customUrl: 'https://picgo-1312673255.cos.ap-guangzhou.myqcloud.com',
    region: 'ap-guangzhou',
  })

  assert.equal(descriptor.vendor, 'Tencent COS')
  assert.equal(descriptor.label, 'Tencent COS (ap-guangzhou)')
})
