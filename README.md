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

## デプロイ (Cloud Run)

Terraformを使用してGoogle Cloud Runにデプロイすることが可能です。詳細な手順については `terraform/` ディレクトリ内の各ファイルを参照してください。

### 事前準備
1. Google Cloud プロジェクトの作成。
2. Google Cloud CLI (`gcloud`) の認証。
3. `terraform/variables.tf` の `project_id` を設定。

### 手順
```bash
cd terraform
terraform init
terraform plan
terraform apply
```
