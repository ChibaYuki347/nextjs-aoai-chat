# 概要

Azure App Serviceを使って、NextjsアプリケーションでAzure OpenAIを扱うサンプルです。
各リソースはプライベートエンドポイントでの接続を可能とします。

## 構成

![構成図](./docs/images/Architecture.png)

## ディレクトリ構造(変更可能性あり)

下記のような構造です。

```bash
.azure # azdで作成される環境変数
.github # GitHub Actionsの設定
├── workflows
    ├── deploy.yml # デプロイ用のGitHub Actions
.next # Next.jsのビルド時に作成されるファイル
app # Next.jsアプリケーション
components # Next.jsのコンポーネント
docs # ドキュメント
infra # Azureリソースの定義
├── core # Azureリソース作成で汎用的に使えるファイル
├── main.bicep # Azureリソースの定義
├── main.parameters.json # Azureリソースのパラメータ
├── abbreviations.json # Azureリソースの省略名
├── network-isolation.bicep # ネットワーク分離のためのBicepファイル
├── private-endpoint.bicep # プライベートエンドポイントのためのBicepファイル
├── website.bicep # Web AppのためのBicepファイル
    |── scripts # Azureリソースの作成スクリプト
        ├── createAssistant.mjs # Assistantの作成スクリプト
        ├── input_files # Assistant作成に必要な日本語   フォントを格納
lib # Next.jsのアプリで使うutility関数
node_modules # npmのモジュール
public # Next.jsのアプリで使う静的ファイル
samples # Excel分析に使うデータサンプル
.env.example # 環境変数の例
.gitignore # gitignore
azure.yaml # azdの設定
components.json # UIライブラリshadcn/uiのコンポーネントの設定
ecosystem.config.json # App Service起動で使うpm2の設定
eslint.config.js # eslintの設定
next.config.ts # Next.jsの設定
package-lock.json # npmの設定
package.json # npmの設定
postcss.config.mjs # postcssの設定
tailwind.config.js # tailwindの設定
tsconfig.json # typescriptの設定
Readme.md # このドキュメント
```

## 使い方

### Azureリソースの作成

azdを使ってリソースを準備します。

azdのログイン:

```bash
azd auth login
```

インフラの作成:

```bash
azd provision
```

Assistantの作成:

```bash
node ./infra/scripts/createAssistant.mjs
```

本スクリプトで日本語フォントを読み込ませつつAssistantを作成します。

なお、サブプロセスとして`azd env set`を実行しておりazdの環境変数に設定されます。
例:
`.azure/{環境名}/.env`に以下のように記述されます。

```bash
AZURE_OPENAI_ASSISTANT_ID="asst_OdmRogIrNpJcyAmDyZf6u6W1"
AZURE_OPENAI_FONT_FILE_ID="assistant-AfmkrDSgyRyo9fzUXZ8gC7"
```

リソースの削除:

```bash
azd down
```

### プライベートエンドポイントを利用する場合

```bash
azd env set AZURE_USE_PRIVATE_ENDPOINT true
```

さらに、Azure OpenAIとCosmosDBのパブリックアクセスを無効する場合

```bash
azd env set AZURE_PUBLIC_NETWORK_ACCESS Disabled
```

もしくは`.azure/{環境名}/.env`に以下のように記述します。

```bash
AZURE_USE_PRIVATE_ENDPOINT="true"
AZURE_PUBLIC_NETWORK_ACCESS="Disabled"
```

その上で`azd provision`を実行します。

### ローカルでの開発

`.env.local`にAzureのリソース情報を設定します。  
`.env.example`を参考にしてください。

例:

```bash
# Azure OpenAI Resource Name
AZURE_OPENAI_RESOURCE_NAME=my-openai-resource 
# ex. my-openai-resource **.openai.azure.comの**の部分
# Azure OpenAI API Key
AZURE_OPENAI_API_KEY=f3699df8b6f345289cc5cb8c93740d1f
# Cosmos DB Endpoint
COSMOS_DB_ENDPOINT=https://**.documents.azure.com:443/
# Cosmos DB Key
COSMOS_DB_KEY=fq2XN4ZhXL6UVS54AY05wqzMEOR6XBBTVPh27okEfFvNxqL4FmgIXJOewDxZp96ogWIpg4QDQMVKACDbJiRQng==
# Assistant ID
ASSISTANT_ID=asst_OdmRogIrNpJcyAmDyZf6u6W1
# Japanese Font File ID
AZURE_OPENAI_FONT_FILE_ID="assistant-AfmkrDSgyRyo9fzUXZ8gC7"
```

実行:

事前に

```bash
npm install
```

を実行してから、以下のコマンドでアプリケーションを起動します。

```bash
npm run dev
```

### デプロイ

GitHub Actionsを使ってデプロイ可能です。
`.github/workflows/deploy.yml`を参考にしてください。

解説は[こちら](./docs/Deploy.md)にあります。

## 参照

[AI SDK, Next.js, and OpenAI Chat Example](https://github.com/vercel/ai/tree/main/examples/next-openai)