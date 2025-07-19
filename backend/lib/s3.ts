import { S3Client } from "bun"

const s3 = new S3Client({
	endpoint: process.env.S3_ENDPOINT,
	accessKeyId: process.env.S3_ACCESS_KEY,
	secretAccessKey: process.env.S3_SECRET_KEY,
	bucket: process.env.S3_BUCKET
})

export default s3
