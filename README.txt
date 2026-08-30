サブスク管理 Webアプリ Ver.0.2.0

【主な変更】
・PWA対応
・ホーム画面追加時のアプリアイコン対応
・standalone表示（ホーム画面から単独起動）
・Service Workerによる基本キャッシュ対応
・分析ページの残存コードを完全削除

【GitHub Pagesへの更新方法】
このフォルダ内の以下を、GitHubリポジトリのルートへアップロードしてください。
index.html
styles.css
app.js
app_icon.png
manifest.json
sw.js
icons フォルダ（中の3ファイルを含む）

既存の同名ファイルは上書きしてください。
