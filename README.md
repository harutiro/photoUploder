# Photo Uploader

このプログラムは、指定したフォルダを監視し、新しく追加された画像を圧縮した後、Cloudflare R2 に自動アップロードするツールです。
アップロードされた画像の URL はクリップボードにコピーされます。

## 機能
- 指定フォルダの監視
- 画像（JPG, JPEG, PNG）の自動圧縮（1920x1080 にリサイズ & JPEG 80% 品質）
- Cloudflare R2 への自動アップロード
- アップロード済みの画像を記録し、再アップロードを防止
- アップロード後の URL をクリップボードにコピー

## 必要環境
- Node.js (推奨: v18 以上)
- Cloudflare R2 アカウント

## インストール

### 1. リポジトリをクローン
```sh
$ git clone https://github.com/your-repo/photo-uploader.git
$ cd photo-uploader
```

### 2. 依存関係をインストール
```sh
$ npm install
```

### 3. 環境変数の設定
`.env` ファイルを作成し、以下のように Cloudflare R2 の情報を設定してください。

```ini
R2_BUCKET_NAME=your-bucket-name
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_PUBLIC_URL=https://your-bucket-name.r2.cloudflarestorage.com
```

## 使い方

### 1. 監視フォルダの指定
`index.ts` の `WATCH_FOLDER` を、監視したいフォルダのパスに設定してください。
```ts
const WATCH_FOLDER = 'C:\\Users\\yourname\\Pictures\\VRChat\\2025-02';
```

### 2. 開発モードで実行
```sh
$ npm run dev
```

### 3. 新しい画像が追加されたら、自動アップロード
- `WATCH_FOLDER` に新しい画像を追加すると、自動で圧縮＆アップロードされます。
- アップロード済みの画像は `uploaded.json` に記録され、再アップロードは行われません。

## 注意点
- `.env` ファイルには機密情報が含まれるため、公開リポジトリには追加しないようにしてください。
- `uploaded.json` はアップロード済みのファイルリストを保存するため、削除するとすべての画像が再アップロードされます。

## ライセンス
MIT License

