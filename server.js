require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require("fs");
const app = express();

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, 'pages')));

// ルートへのアクセス
app.get("/", (req, res) => {
  fs.readFile("./pages/index.html", (err, data) => {
    if (err) {
      res.status(500).send("ページ読み込みエラー");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.write(data);
    res.end();
  });
});

// ✅ Render対応：PORTを環境変数から取得
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`サーバーを開きました（PORT=${PORT}）`);
});

// Discord Botのトークン確認
if (!process.env.TOKEN) {
  console.log("TOKENを設定してください");
}

// Bot起動
require('./main.js');
