import { Resource } from "sst"

const s3 = new Bun.S3Client({
	bucket: Resource.CodelabsBucket.name
})

export default s3
