// src/worker/handlers/processResume.ts
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { s3 } from '../../shared/storage';
import db from '../../shared/db';
import { config } from '../../shared/config';

// Downloads a résumé from S3/MinIO, counts words in the raw bytes, and stores the result.
export async function processResume(resumeId: string, s3Key: string): Promise<void> {
  const command = new GetObjectCommand({
    Bucket: config.S3_BUCKET,
    Key: s3Key,
  });
  const response = await s3.send(command);

  const stream = response.Body as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const buffer = Buffer.concat(chunks);

  // Word count: split the raw text on whitespace.
  // For a real parser, use pdf-parse or similar — this is a stand-in.
  const text = buffer.toString('utf-8', 0, Math.min(buffer.length, 100_000));
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  await db.query(`UPDATE resumes SET word_count = $1 WHERE id = $2`, [wordCount, resumeId]);
}