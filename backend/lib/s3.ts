import { S3Client } from "bun"
import { Resource } from "sst"

const s3 = new S3Client({
	bucket: Resource.CodelabsBucket.name
})

export default s3
