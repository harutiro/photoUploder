import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const WATCH_FOLDER = process.env.WATCH_FOLDER!;
const OUTPUT_FOLDER = './compressed';
const UPLOADED_FILES_PATH = './uploaded.json'; // アップロード済みのリストを保存するファイル

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const CLOUDFLARE_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const CLOUDFLARE_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const CLOUDFLARE_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;

const s3Client = new S3Client({
    credentials: {
        accessKeyId: CLOUDFLARE_ACCESS_KEY_ID,
        secretAccessKey: CLOUDFLARE_SECRET_ACCESS_KEY,
    },
    endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    region: 'auto',
    forcePathStyle: true,
});

// アップロード済みのファイルを記録するセット
let uploadedFiles = new Set<string>();

// アップロード済みリストを読み込む
const loadUploadedFiles = () => {
    if (fs.existsSync(UPLOADED_FILES_PATH)) {
        try {
            const data = fs.readFileSync(UPLOADED_FILES_PATH, 'utf-8');
            uploadedFiles = new Set(JSON.parse(data));
        } catch (error) {
            console.error('⚠️ Failed to load uploaded files list:', error);
        }
    }
};

// アップロード済みリストを保存する
const saveUploadedFiles = () => {
    try {
        fs.writeFileSync(UPLOADED_FILES_PATH, JSON.stringify(Array.from(uploadedFiles), null, 2), 'utf-8');
    } catch (error) {
        console.error('⚠️ Failed to save uploaded files list:', error);
    }
};

// 画像を処理してアップロードする
const processImage = async (filePath: string) => {
    const fileName = path.basename(filePath);

    // すでにアップロード済みなら処理しない
    if (uploadedFiles.has(fileName)) {
        console.log(`⏩ Skipping already uploaded file: ${fileName}`);
        return;
    }

    const outputFilePath = path.join(OUTPUT_FOLDER, fileName);

    try {
        await sharp(filePath)
            .resize({ width: 1920, height: 1080, fit: 'inside' })
            .toFormat('jpeg', { quality: 80 })
            .toFile(outputFilePath);

        console.log(`✅ Compressed: ${fileName}`);
        await uploadToR2(outputFilePath, fileName);
    } catch (error) {
        console.error(`❌ Failed to process ${fileName}:`, error);
    }
};

// Cloudflare R2 にアップロードする
const uploadToR2 = async (filePath: string, fileName: string) => {
    try {
        const fileContent = fs.readFileSync(filePath);
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fileName,
            Body: fileContent,
            ContentType: 'image/jpeg',
        });

        await s3Client.send(command);

        const imageUrl = `${R2_PUBLIC_URL}/${fileName}`;
        const clipboard = await import('clipboardy');
        await clipboard.default.write(imageUrl);
        console.log(`📤 Uploaded: ${imageUrl} (Copied to clipboard)`);

        // アップロード済みのファイルとして記録
        uploadedFiles.add(fileName);
        saveUploadedFiles(); // リストを更新
    } catch (error) {
        console.error(`❌ Upload failed for ${fileName}:`, error);
    }
};

// 初回起動時にアップロード済みリストを読み込む
loadUploadedFiles();

// 監視を開始
chokidar.watch(WATCH_FOLDER, { persistent: true })
    .on('add', filePath => {
        if (filePath.match(/\.(jpg|jpeg|png)$/i)) {
            console.log(`📸 New image detected: ${filePath}`);
            processImage(filePath);
        }
    });

console.log('👀 Watching for new images...');
