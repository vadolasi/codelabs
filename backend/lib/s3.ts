import config from "./config"

const s3 = new Bun.S3Client({
	bucket: config.S3_BUCKET
})

export default s3
