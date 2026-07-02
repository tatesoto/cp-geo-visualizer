[English Version (README.md)](./README.md)

# CP Geometry Visualizer

競技プログラミング(Competitive Programming)における幾何問題のデバッグや可視化を支援するためのツールです。
テキストベースのコマンドを入力することで、点、線、円、多角形などを簡単に描画し、視覚的に確認することができます。

[Web Page](https://tatesoto.github.io/cp-geo-visualizer)
> このアプリケーションは、Google AI Studioを用いて作成されました。

## 主な機能

- **リアルタイム描画**: エディタに入力すると即座に図形が描画されます。
- **多彩な図形**: 点、直線、線分、円、多角形、テキストなどに対応。
- **変数とループ**: `Read` コマンドによる入力値の読み込みや、`rep` コマンドによるループ処理が可能。
- **グルーピング**: `Group` コマンドで図形をグループ化し、個別に表示/非表示を切り替え可能。
- **画像保存**: 描画結果を画像として保存できます。

## 始め方

### 動作環境
- Node.js

### インストールと起動

1. 依存パッケージをインストールします:
   ```bash
   npm install
   ```
2. 開発サーバーを起動します:
   ```bash
   npm run dev
   ```
3. ブラウザで表示されたURL（通常は `http://localhost:5173`）にアクセスします。

## 使い方 (Syntax Guide)

エディタに以下のコマンドを入力して図形を描画します。
座標や数値には、数値リテラルのほか、事前に定義した変数や数式（`+`, `-`, `*`, `/`, `%`）を使用できます。
各コマンドの末尾にはオプションで `TOP` のようなラベル文字列や、`#ff0000` のような色指定を追加できます。
また、`key=...` で幾何オブジェクトに参照用 key を付与し、後続コマンドで `@key` として参照できます。

### 基本図形

- **点 (Point)**
  ```
  Point x y [label] [#color]
  ```
- **直線 (Line)**
  ```
  Line x1 y1 x2 y2 [label] [#color]
  ```
- **線分 (Segment)**
  ```
  Seg x1 y1 x2 y2 [label] [#color]
  ```
- **円 (Circle)**
  ```
  Circle x y r [label] [#color]
  ```
- **多角形 (Polygon)**
  ```
  Poly x1 y1 x2 y2 ... [label] [#color]
  ```
  または `Push` コマンドで頂点をバッファに追加してから `Poly` を引数なしで呼ぶことも可能です。
  ```
  Push x1 y1
  Push x2 y2
  Poly
  ```
- **テキスト (Text)**
  ```
  Text x y "content" [fontSize] [#color]
  ```

### 幾何 key 参照

任意の図形コマンドに `key=...` を追加すると、その図形を登録できます。以降の図形コマンドでは `@key` で参照できます。
参照は座標列として展開されます。点・円・テキストは1座標、直線・線分は2座標、多角形は頂点列として扱われます。
`Select @key` を使うと、新しいオブジェクトを作らずに既存の key 付き図形をオブジェクト一覧のSelect欄へ追加できます。

```
Read n m
rep i n:
    Read x y
    Point x y key=i

rep m:
    Read u v
    Seg @u @v
```

```
Read n
rep i n:
    Read x y
    Point x y key=i

Read q
rep q:
    Read i
    Select @i
```

```
Seg 0 0 10 0 key=e
Seg @e "#ff0000"

Poly 0 0 10 0 5 8 key=tri
Poly @tri "#00aa00"
```

### 変数と制御構文

- **入力読み込み (Read)**
  ```
  Read n m
  ```
  空白区切りの入力データから数値を読み取り、変数 `n`, `m` に代入します。

- **ループ (Rep)**
  ```
  rep n:
      // n回繰り返す処理
      Point ...
  
  rep i n:
      // 変数 i を 0 から n-1 まで変化させて繰り返す
      Point i i*2
  ```

- **条件分岐 (If / Elif / Else)**
  ```
  if n % 2 == 0:
      Point n 0
  elif n % 3 == 0:
      Point n 10
  else:
      Point n 20
  ```
  `elif` の代わりに `else if` も使用できます。

- **ループ制御 (break / continue)**
  ```
  rep i 10:
      if i == 5:
          break
      if i % 2 == 0:
          continue
      Point i i
  ```

- **グループ (Group)**
  ```
  Group 1:
      // グループ1に属する図形
      Seg ...
  ```

### コメント

- `//` 以降はコメントとして無視されます。

## サンプル

```
// 三角形の描画
Read x1 y1 x2 y2 x3 y3
Poly x1 y1 x2 y2 x3 y3 "Triangle" #blue

// 円の描画
Circle 0 0 10 #red
```
