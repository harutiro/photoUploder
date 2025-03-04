import fs from 'node:fs';
import path from 'node:path';
import chokidar from 'chokidar';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import clipboardy from 'clipboardy';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';

dotenv.config();

const WATCH_FOLDER = process.env.WATCH_FOLDER!;
const OUTPUT_FOLDER = './compressed';
const UPLOADED_FILES_PATH = './uploaded.json';

// 必要なディレクトリの作成
if (!fs.existsSync(OUTPUT_FOLDER)) {
    fs.mkdirSync(OUTPUT_FOLDER, { recursive: true });
    console.log(`📁 Created output directory: ${OUTPUT_FOLDER}`);
}

if (!fs.existsSync(WATCH_FOLDER)) {
    fs.mkdirSync(WATCH_FOLDER, { recursive: true });
    console.log(`📁 Created watch directory: ${WATCH_FOLDER}`);
}

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

// QRコードを生成する
const generateQRCode = async (url: string): Promise<Buffer> => {
    try {
        // QRコードを生成
        const qrBuffer = await QRCode.toBuffer(url, {
            errorCorrectionLevel: 'H',
            margin: 4,
            width: 180,
        });

        // QRコードを白背景で囲み、余白を追加
        const processedQR = await sharp(qrBuffer)
            .extend({
                top: 32,
                bottom: 32,
                left: 32,
                right: 32,
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .toBuffer();

        return processedQR;
    } catch (error) {
        console.error('❌ Failed to generate QR code:', error);
        throw error;
    }
};

// 画像を処理してアップロードする
const processImage = async (filePath: string) => {
    const originalFileName = path.basename(filePath);

    // すでにアップロード済みなら処理しない
    if (uploadedFiles.has(originalFileName)) {
        console.log(`⏩ Skipping already uploaded file: ${originalFileName}`);
        return;
    }

    try {
        // オリジナル画像用のファイル名を生成
        const originalUuid = uuidv4();
        const originalNewFileName = `${originalUuid}.jpg`;
        const originalOutputFilePath = path.join(OUTPUT_FOLDER, originalNewFileName);
        const originalImageUrl = `${R2_PUBLIC_URL}/${originalNewFileName}`;

        // QRコード付き画像用のファイル名を生成
        const qrNewFileName = `${originalUuid}_qr.jpg`;
        const qrOutputFilePath = path.join(OUTPUT_FOLDER, qrNewFileName);

        // QRコードを生成（オリジナル画像のURLを使用）
        const qrBuffer = await generateQRCode(originalImageUrl);

        // QRコードのメタデータを取得
        const qrMetadata = await sharp(qrBuffer).metadata();
        const qrWidth = qrMetadata.width || 244;
        const qrHeight = qrMetadata.height || 244;

        // 元の画像を処理
        const image = sharp(filePath);
        
        // 画像をリサイズ
        const resizedImage = await image
            .resize({ width: 1920, height: 1080, fit: 'inside' })
            .toBuffer();

        // オリジナル画像を保存（QRコードなし）
        await sharp(resizedImage)
            .jpeg({ quality: 80 })
            .toFile(originalOutputFilePath);

        // リサイズした画像のメタデータを取得
        const metadata = await sharp(resizedImage).metadata();
        const width = metadata.width || 1920;
        const height = metadata.height || 1080;

        // QRコード付きの画像を生成
        await sharp(resizedImage)
            .composite([{
                input: qrBuffer,
                top: height - qrHeight - 32,
                left: width - qrWidth - 32,
            }])
            .jpeg({ quality: 80 })
            .toFile(qrOutputFilePath);

        // オリジナル画像をアップロード（クリップボードにコピーしない）
        await uploadToR2(originalOutputFilePath, originalNewFileName, false);
        console.log(`✅ Uploaded original image: ${originalFileName}`);

        // QRコード付き画像をアップロード（クリップボードにコピーする）
        await uploadToR2(qrOutputFilePath, qrNewFileName, true);
        console.log(`✅ Uploaded QR code version: ${qrNewFileName}`);

    } catch (error) {
        console.error(`❌ Failed to process ${originalFileName}:`, error);
    }
};

// Cloudflare R2 にアップロードする
const uploadToR2 = async (filePath: string, fileName: string, copyToClipboard: boolean = true) => {
    try {
        const fileContent = fs.readFileSync(filePath);
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fileName,
            Body: fileContent,
            ContentType: 'image/jpeg'
        });

        await s3Client.send(command);

        const imageUrl = `${R2_PUBLIC_URL}/${fileName}`;
        if (copyToClipboard) {
            await clipboardy.write(imageUrl);
            console.log(`📤 Uploaded: ${imageUrl} (Copied to clipboard)`);
        } else {
            console.log(`📤 Uploaded: ${imageUrl}`);
        }

        // アップロード済みのファイルとして記録
        uploadedFiles.add(fileName);
        saveUploadedFiles();
    } catch (error) {
        console.error(`❌ Upload failed for ${fileName}:`, error);
    }
};

// 初回起動時にアップロード済みリストを読み込む
loadUploadedFiles();

// 監視を開始
chokidar.watch(WATCH_FOLDER, { 
    persistent: true,
    ignoreInitial: true  // 起動時の既存ファイルスキャンを無効化
})
    .on('add', filePath => {
        if (filePath.match(/\.(jpg|jpeg|png)$/i)) {
            console.log(`📸 New image detected: ${filePath}`);
            processImage(filePath);
        }
    });

console.log('👀 Watching for new images... (Only new files will be processed)');
