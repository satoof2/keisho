# Keisho

このプロジェクトの詳細については [spec.md](spec.md) を参照してください。

## セットアップ

### 1. 環境変数の設定
各ディレクトリで `.env.sample` を `.env` にコピーしてください。

```bash
cp backend/.env.sample backend/.env
cp frontend/.env.sample frontend/.env
```

### 2. データベースの起動
```bash
docker-compose up -d
```

### 2. バックエンドの起動
```bash
cd backend
npm install
npm run dev
```

### 3. フロントエンドの起動
```bash
cd frontend
npm install
npm run dev
```
