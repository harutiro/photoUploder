# Photo Uploader

画像を監視フォルダにドロップすると自動的に圧縮し、Cloudflare R2にアップロードするツールです。

## 機能

- 指定したフォルダの監視
- 画像の自動圧縮
- Cloudflare R2への自動アップロード
- アップロードされた画像のURLを自動的にクリップボードにコピー
- QRコードの生成
- アップロード履歴の管理

## 必要要件

- Node.js 14.0.0以上
- Cloudflare R2アカウントとアクセスキー

## インストール

```bash
# リポジトリをクローン
git clone [repository-url]
cd photoUploder

# 依存パッケージのインストール
npm install
```

## 環境設定

1. `.env.default`ファイルを`.env`にコピーします。
2. `.env`ファイルを編集し、以下の環境変数を設定します：

```env
WATCH_FOLDER=監視するフォルダのパス
R2_BUCKET_NAME=CloudflareのR2バケット名
R2_ACCOUNT_ID=CloudflareのアカウントID
R2_ACCESS_KEY_ID=R2のアクセスキーID
R2_SECRET_ACCESS_KEY=R2のシークレットアクセスキー
R2_PUBLIC_URL=R2の公開URL
```

## 使用方法

### 開発モード

```bash
npm run dev
```

### ビルドと実行

```bash
# TypeScriptのビルド
npm run build

# アプリケーションの実行
npm start
```

## 使い方

1. アプリケーションを起動します。
2. 監視フォルダに画像ファイルをドラッグ＆ドロップします。
3. 自動的に以下の処理が実行されます：
   - 画像の圧縮
   - Cloudflare R2へのアップロード
   - アップロードされたURLのクリップボードへのコピー
   - QRコードの生成

## 主な依存パッケージ

- `@aws-sdk/client-s3`: Cloudflare R2との連携
- `chokidar`: フォルダの監視
- `sharp`: 画像の圧縮処理
- `clipboardy`: クリップボード操作
- `qrcode`: QRコード生成
- `dotenv`: 環境変数の管理
- `uuid`: ユニークなファイル名の生成

## ディレクトリ構造

```
photoUploder/
├── compressed/     # 圧縮された画像の保存先
├── test/          # テストファイル
├── index.ts       # メインアプリケーションコード
├── package.json   # プロジェクト設定
├── tsconfig.json  # TypeScript設定
└── .env          # 環境変数
```

## 注意事項

- アップロードされたファイルの履歴は`uploaded.json`に保存されます
- 監視フォルダとcompressedフォルダは自動的に作成されます
- 既にアップロードされたファイルは再アップロードされません

## ライセンス
MIT License

