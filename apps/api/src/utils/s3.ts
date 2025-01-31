import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const generateSignedUrl = async (key: string) => {
  if (!key) return null;
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME!,
    Key: key,
  });
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
};

export const uploadToS3 = async (file: Express.Multer.File, prefix: string): Promise<string> => {
  const filename = `${prefix}-${Date.now()}-${file.originalname}`;
  const bucketName = process.env.AWS_S3_BUCKET_NAME!;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: filename,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3Client.send(command);
  return `https://${bucketName}.s3.amazonaws.com/${filename}`;
};

export const deleteFromS3 = async (url: string) => {
  const bucketName = process.env.AWS_S3_BUCKET_NAME!;
  const key = url.split(`https://${bucketName}.s3.amazonaws.com/`)[1];

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await s3Client.send(command);
};