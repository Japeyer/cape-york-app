// Erzeugt License-Keys für die Cape-York-App.
//
// Verwendung:
//   node scripts/generate-license.mjs                      → 1 Code mit Random-Payload
//   node scripts/generate-license.mjs buyer@example.com      → 1 Code für diese Email (deterministisch)
//   node scripts/generate-license.mjs --batch 10           → 10 Random-Codes (für Beta-Tester etc.)
//
// Das SECRET muss identisch zu src/lib/premium.js sein. Bei Rotation:
// hier UND dort ändern, alte Codes werden danach abgelehnt.

import { createHmac, randomBytes, createHash } from 'node:crypto'

const SECRET = 'cape-york-2026-rev1-7Q4mZ8Lk'
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const PAYLOAD_LENGTH = 12
const CHECKSUM_LENGTH = 4

function bytesToBase32(bytes, count) {
  let out = ''
  let buffer = 0
  let bits = 0
  let i = 0
  while (out.length < count) {
    if (bits < 5) {
      buffer = (buffer << 8) | bytes[i++]
      bits += 8
    }
    bits -= 5
    out += ALPHABET[(buffer >> bits) & 0x1f]
  }
  return out
}

function checksumFor(payload) {
  const bytes = createHmac('sha256', SECRET).update(payload).digest()
  return bytesToBase32(bytes, CHECKSUM_LENGTH)
}

function randomPayload() {
  const bytes = randomBytes(PAYLOAD_LENGTH)
  let out = ''
  for (let i = 0; i < PAYLOAD_LENGTH; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return out
}

function payloadFromSeed(seed) {
  const hash = createHash('sha256').update(seed).digest()
  return bytesToBase32(hash, PAYLOAD_LENGTH)
}

function generateOne(seed) {
  const payload = seed ? payloadFromSeed(seed) : randomPayload()
  const checksum = checksumFor(payload)
  const full = payload + checksum
  return `${full.slice(0, 4)}-${full.slice(4, 8)}-${full.slice(8, 12)}-${full.slice(12, 16)}`
}

const args = process.argv.slice(2)
let batchCount = null
let seed = null
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--batch' && args[i + 1]) {
    batchCount = Number(args[i + 1])
    i++
  } else if (!seed) {
    seed = args[i]
  }
}

if (batchCount && Number.isFinite(batchCount) && batchCount > 0) {
  for (let i = 0; i < batchCount; i++) console.log(generateOne(null))
} else {
  console.log(generateOne(seed))
}
