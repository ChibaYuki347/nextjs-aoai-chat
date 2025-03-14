# デプロイの解説

## GitHub Actionsを使ったデプロイ

deploy.yamlの例と要点の解説をします。

```yaml
name: Build and deploy Node.js app to Azure Web App

on:
    push:
      branches:
        - main
      paths-ignore:
        - "Readme.md"
        - "docs/**"
        - "samples/**"
        - .env*
    workflow_dispatch:
jobs:
    deploy:
        runs-on: ubuntu-latest
        permissions:
            contents: read
        steps:
            - uses: actions/checkout@v4

            - name: Set up Node.js version
              uses: actions/setup-node@v4
              with:
                node-version: '20'

            - name: create env file
              run: |
                    touch .env
                    echo "AZURE_OPENAI_RESOURCE_NAME=${{ secrets.AZURE_OPENAI_RESOURCE_NAME }}" >> .env
                    echo "AZURE_OPENAI_API_KEY=${{ secrets.AZURE_OPENAI_API_KEY }}" >> .env
                    echo "COSMOS_DB_ENDPOINT=${{ secrets.COSMOS_DB_ENDPOINT }}" >> .env
                    echo "COSMOS_DB_KEY=${{ secrets.COSMOS_DB_KEY }}" >> .env
                    echo "ASSISTANT_ID=${{ secrets.ASSISTANT_ID }}" >> .env
                    echo "AZURE_OPENAI_FONT_FILE_ID=${{ secrets.AZURE_OPENAI_FONT_FILE_ID }}" >> .env
            
            - name: npm install, build and test
              run: |
                    npm install
                    npm run build
                    npm run test --if-present
            
            - name: Zip all files for upload between jobs
                # IMPORTANT: .next is a hidden folder and will NOT be included in the zip unless we specify it
                # To fix: /home/site/wwwroot/node_modules/.bin/next: 1: ../next/dist/bin/next: not found
              run: zip next.zip ./* .next .env -qr
            
            - name: Deploy to Azure Web App
              uses: azure/webapps-deploy@v2
              with:
                app-name: ${{ secrets.AZURE_WEBAPP_NAME }}
                publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
                package: 'next.zip'
```

on:

```yaml
on:
    push:
      branches:
        - main
      paths-ignore:
        - "Readme.md"
        - "docs/**"
        - "samples/**"
        - .env*
    workflow_dispatch:
```

- `push`はmainブランチにpushされたときに実行されます。
- `paths-ignore`は、特定のパスが変更されたときには実行されないようにします。今回の場合Readme.mdやdocs、samples、.env*が対象です。
- `workflow_dispatch`は手動で実行できるようにします。

jobs:

```yaml
jobs:
    deploy:
        runs-on: ubuntu-latest
        permissions:
            contents: read
```

- `jobs`は実行するジョブを定義します。
- `deploy`はジョブの名前です。
- `runs-on`は実行する環境を指定します。`ubuntu-latest`は最新のUbuntu環境です。
- `permissions`はジョブが必要とする権限を指定します。`contents: read`はリポジトリのコンテンツを読み取る権限です。

- `steps`はジョブの中で実行するステップを定義します。

```yaml
steps:
            - uses: actions/checkout@v4
```

- `actions/checkout@v4`はリポジトリのコードをチェックアウトします。これにより、リポジトリのコードがジョブの実行環境にコピーされます。

```yaml
            - name: Set up Node.js version
              uses: actions/setup-node@v4
              with:
                node-version: '20'
```

- `actions/setup-node@v4`はNode.jsのバージョンを設定します。`node-version: '20'`はNode.jsのバージョン20を指定しています。

```yaml
            - name: create env file
              run: |
                    touch .env
                    echo "AZURE_OPENAI_RESOURCE_NAME=${{ secrets.AZURE_OPENAI_RESOURCE_NAME }}" >> .env
                    echo "AZURE_OPENAI_API_KEY=${{ secrets.AZURE_OPENAI_API_KEY }}" >> .env
                    echo "COSMOS_DB_ENDPOINT=${{ secrets.COSMOS_DB_ENDPOINT }}" >> .env
                    echo "COSMOS_DB_KEY=${{ secrets.COSMOS_DB_KEY }}" >> .env
                    echo "ASSISTANT_ID=${{ secrets.ASSISTANT_ID }}" >> .env
                    echo "AZURE_OPENAI_FONT_FILE_ID=${{ secrets.AZURE_OPENAI_FONT_FILE_ID }}" >> .env
```

- `create env file`は環境変数を設定するステップです。
Build時に必要な環境変数を`.env`ファイルに書き込みます。
- `${{ secrets.AZURE_OPENAI_RESOURCE_NAME }}`などはGitHub Secretsから取得した値です。これにより、機密情報をリポジトリに直接書き込むことなく、環境変数を設定できます。

```yaml
            - name: npm install, build and test
              run: |
                    npm install
                    npm run build
                    npm run test --if-present
```

- `npm install, build and test`はNode.jsの依存関係をインストールし、ビルドとテストを実行するステップです。
- `npm install`は依存関係をインストールします。
- `npm run build`はアプリケーションをビルドします。
- `npm run test --if-present`はテストを実行します。`--if-present`はテストスクリプトが存在する場合のみ実行します。

```yaml
            - name: Zip all files for upload between jobs
                # IMPORTANT: .next is a hidden folder and will NOT be included in the zip unless we specify it
                # To fix: /home/site/wwwroot/node_modules/.bin/next: 1: ../next/dist/bin/next: not found
              run: zip next.zip ./* .next .env -qr
```

この部分は最重要です。
通常通りデプロイしてしまうと、以下のようなエラーが発生します。

```bash
/home/site/wwwroot/node_modules/.bin/next: 1: ../next/dist/bin/next: not found
```

このセクションは、デプロイメントプロセスの一部として、ファイルを圧縮して次のジョブにアップロードするための手順を示しています。具体的には、zipコマンドを使用して、現在のディレクトリ内のすべてのファイルとフォルダを圧縮し、next.zipという名前のZIPファイルを作成しています。

重要なポイントとして、.nextフォルダは隠しフォルダであり、通常の設定ではZIPファイルに含まれません。そのため、.nextフォルダを明示的に指定してZIPファイルに含める必要があります。これにより、Next.jsアプリケーションのビルド成果物が正しく含まれるようになります。

また、.envファイルもZIPファイルに含めるように指定されています。このファイルには環境変数が含まれており、アプリケーションの設定や機密情報が格納されています。

コメントには、/home/site/wwwroot/node_modules/.bin/next: 1: ../next/dist/bin/next: not foundというエラーを修正するための手順が記載されています。このエラーは、Next.jsの実行ファイルが見つからないことを示しており、適切なファイルをZIPに含めることで解決されます。

最終的に、-qrオプションはZIPコマンドの動作を制御します。-qはクワイエットモードを意味し、出力を最小限に抑えます。-rは再帰的にディレクトリを処理することを意味し、サブディレクトリ内のファイルも含めて圧縮します。

```yaml
            - name: Deploy to Azure Web App
              uses: azure/webapps-deploy@v2
              with:
                app-name: ${{ secrets.AZURE_WEBAPP_NAME }}
                publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
                package: 'next.zip'
```

- `Deploy to Azure Web App`はAzure Web Appにデプロイするステップです。
- `uses: azure/webapps-deploy@v2`はAzure Web Appsにデプロイするためのアクションを使用しています。
- `app-name: ${{ secrets.AZURE_WEBAPP_NAME }}`はデプロイ先のAzure Web Appの名前を指定します。これもGitHub Secretsから取得した値です。
- `publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}`はAzure Web Appの公開プロファイルを指定します。これもGitHub Secretsから取得した値です。
App Serviceの公開プロファイルは、Azure Portalからダウンロードできます。
- `package: 'next.zip'`はデプロイするZIPファイルのパスを指定します。この場合、先ほど作成したnext.zipファイルです。
- これにより、Azure Web Appにアプリケーションがデプロイされます。

## スタートアップコマンドについて

App Service Node.jsにはpm2がインストールされており、pm2を使ってアプリケーションの起動が推奨されています。

`npm run start`を使ってしまうと、思わぬことでアプリケーションが落ちてしまうことがあります。
pm2を使うことで、アプリケーションの監視や自動再起動が可能になります。

[公式ガイド](https://learn.microsoft.com/ja-jp/azure/app-service/configure-language-nodejs?pivots=platform-linux&source=post_page-----9027d7e93eb5---------------------------------------#configure-nodejs-server)

`ecosystem.config.json`にpm2の設定を記載します。

```js
module.exports = {
    apps: [
      {
        name: "aoai-nextjs",
        script: "./node_modules/next/dist/bin/next",
        args: "start -p " + (process.env.PORT || 3000),
        watch: false,
        autorestart: true,
      },
    ],
  };
```

node_modules以下の`next/dist/bin/next`を指定します。
`args`にはポート番号を指定します。App Serviceは環境変数PORTにポート番号を指定するので、`${process.env.PORT}`で取得します。

`watch`はファイルの変更を監視するかどうかを指定します。`false`にすると、ファイルの変更を監視しません。
`autorestart`はアプリケーションがクラッシュした場合に自動的に再起動するかどうかを指定します。`true`にすると、自動的に再起動します。

pm2を使う利点:

- Node.jsはシングルスレッドで動作するため、アプリがエラーを吐いた時に、アプリが落ちてしまうことがあります。pm2を使うことで、アプリが落ちても自動的に再起動してくれます。
- App Serviceではその場合App Service自体の再起動が必要になりますが、pm2を使うことでアプリだけを再起動することができます。
- アプリが落ちてもApp Service自体は動いているのでsshなどで接続したり、アプリログを確認したりすることができます。
- pm2はアプリケーションの監視やログ管理などの機能も提供しており、運用が容易になります。

App Serviceのスタートアップコマンドは下記のように設定します。

```bash
pm2 --no-daemon start  ecosystem.config.js
```

- `--no-daemon`はpm2をデーモンモードで起動しないようにします。これにより、App Serviceがpm2を監視することができます。
- `ecosystem.config.js`はpm2の設定ファイルです。これを指定することで、pm2がアプリケーションを起動します。
- `ecosystem.config.js`はリポジトリのルートに配置します。
