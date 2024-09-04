import test from 'ava'
import { suggestVersion } from './index.js'

test('should suggest latest stable same minor version if current is alpha', (t) => {
  const result = suggestVersion('2.0.0-alpha.7', versions)
  t.is(result, '2.0.1')
})

test('should suggest latest stable same minor version if current is alpha 2', (t) => {
  const result = suggestVersion('2.0.0-alpha.f8884044f', versions)
  t.is(result, '2.0.1')
})

test('should suggest latest stable same minor version if current is beta', (t) => {
  const result = suggestVersion('2.0.0-beta.3', versions)
  t.is(result, '2.0.1')
})

test('should suggest latest stable same minor version if current is beta 2', (t) => {
  const result = suggestVersion('2.0.0-beta.ff31de0ff', versions)
  t.is(result, '2.0.1')
})

test('should suggest latest stable same major version if current is stable', (t) => {
  const result = suggestVersion('2.0.0', versions)
  t.is(result, '2.4.3')
})

test('should suggest latest stable same minor version if current is latest in rc', (t) => {
  const result = suggestVersion('3.0.0-rc.1', versions)
  t.is(result, '3.0.1')
})

test('should suggest next stable major version if current is latest previous major version', (t) => {
  const result = suggestVersion('2.4.3', versions)
  t.is(result, '3.5.2')
})

test('should suggest no higher stable version available when already on latest stable', (t) => {
  const result = suggestVersion('3.5.2', versions)
  t.is(result, 'No higher stable version available')
})

test('should suggest latest canary version if current is outdated canary', (t) => {
  const result = suggestVersion('0.0.0-6062', versions)
  t.is(result, '0.0.0-6067')
})

test('should suggest no higher stable version available when already on latest canary', (t) => {
  const result = suggestVersion('0.0.0-6067', versions)
  t.is(result, 'No higher canary version available')
})

const versions = [
  '0.0.0-6058',
  '0.0.0-6060',
  '0.0.0-6061',
  '0.0.0-6062',
  '0.0.0-6063',
  '0.0.0-6064',
  '0.0.0-6065',
  '0.0.0-6067',
  '2.0.0-alpha.0',
  '2.0.0-alpha.1',
  '2.0.0-alpha.5',
  '2.0.0-alpha.6',
  '2.0.0-alpha.7',
  '2.0.0-alpha.10',
  '2.0.0-alpha.11',
  '2.0.0-alpha.f8884044f',
  '2.0.0-alpha.f8fda885f',
  '2.0.0-alpha.fb07bd871',
  '2.0.0-alpha.fc071b0c2',
  '2.0.0-alpha.fd17476c3',
  '2.0.0-alpha.fd7aa2bf32',
  '2.0.0-alpha.ffe8b6106',
  '2.0.0-beta.0',
  '2.0.0-beta.1',
  '2.0.0-beta.2',
  '2.0.0-beta.3',
  '2.0.0-beta.f71e83450',
  '2.0.0-beta.f7b5e9039',
  '2.0.0-beta.fa7aa0810',
  '2.0.0-beta.fa9b0cd9c',
  '2.0.0-beta.fbdeefcac',
  '2.0.0-beta.fc64c12e4',
  '2.0.0-beta.ff31de0ff',
  '2.0.0-rc.1',
  '2.0.0',
  '2.0.1',
  '2.1.0',
  '2.2.0',
  '2.3.0',
  '2.3.1',
  '2.4.0',
  '2.4.1',
  '2.4.3',
  '3.0.0-alpha.0',
  '3.0.0-beta.0',
  '3.0.0-rc.0',
  '3.0.0-rc.1',
  '3.0.0',
  '3.0.1',
  '3.1.0',
  '3.1.1',
  '3.2.0',
  '3.2.1',
  '3.3.0',
  '3.3.1',
  '3.3.2',
  '3.4.0',
  '3.5.0',
  '3.5.1',
  '3.5.2',
]
