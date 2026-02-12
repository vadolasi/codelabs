#!/usr/bin/env node
import { createRequire } from "node:module"

const require = createRequire(new URL("../web/package.json", import.meta.url))
const { S3mini } = require("s3mini")

const bucketName = "codelabs"

const endpoint = "http://localhost:9000"
const accessKeyId = "rustfsadmin"
const secretAccessKey = "rustfsadmin"
const region = "auto"

const s3 = new S3mini({
  accessKeyId,
  secretAccessKey,
  endpoint: `${endpoint.replace(/\/$/, "")}/${bucketName}`,
  region
})

const created = await s3.createBucket()
if (!created) {
  console.error(`Failed to create bucket: ${bucketName}`)
  process.exit(1)
}

console.log(`Bucket created: ${bucketName}`)
