# 会話履歴・タスク自動保存システム 使用方法

## 概要

Claude Codeでの会話履歴とタスクを自動保存し、セッションを再開できるシステムです。

## 機能

- **自動保存**: 会話のたびに履歴を自動保存
- **タスク追跡**: TODO状態を自動で追跡・更新
- **バックアップ**: 定期的な自動バックアップ（7日間保持）
- **セッション復元**: 過去のセッションを復元可能

## ファイル構成

### システムファイル

- `session-manager.js`: メインの保存・復元システム
- `claude-hook.js`: 自動保存フック
- `.claude-history.json`: 会話履歴データ（自動生成）
- `.claude-backups/`: バックアップフォルダ（自動生成）

### プロジェクトファイル

- `CLAUDE.md`: セッション管理・プロジェクト情報
- `要件定義書.md`: プロジェクトの詳細要件

## 使用方法

### 1. 基本的な使用

```bash
# 手動で会話を保存
node session-manager.js save "ユーザーメッセージ" "アシスタント応答"

# 手動バックアップ作成
node session-manager.js backup

# 統計情報を確認
node session-manager.js stats
```

### 2. セッション復元

```bash
# 最新のバックアップから復元
node session-manager.js restore

# 特定のバックアップから復元
node session-manager.js restore .claude-backups/claude-session-2024-01-01T12-00-00-000Z.json
```

### 3. 自動保存フック

```bash
# セッション開始
node claude-hook.js start

# 定期自動保存を開始（5分間隔）
node claude-hook.js auto-save 5

# タスク状態を更新
node claude-hook.js task "task-id" "completed" "タスク完了"
```

## 自動保存の仕組み

### 1. 会話保存

- ユーザーメッセージと応答を自動保存
- 最新100件の会話を保持
- CLAUDE.mdの会話履歴セクションを自動更新

### 2. タスク追跡

- pending → in_progress → completed の状態遷移
- CLAUDE.mdのタスクセクションを自動更新
- 完了したタスクも履歴として保持

### 3. バックアップ

- 会話のたびに自動バックアップ
- 7日以上古いバックアップは自動削除
- JSON形式で完全なセッション状態を保存

## データ構造

### 会話履歴 (.claude-history.json)

```json
{
  "conversations": [
    {
      "id": "unique-id",
      "timestamp": "2024-01-01T12:00:00.000Z",
      "userMessage": "ユーザーのメッセージ",
      "assistantResponse": "アシスタントの応答",
      "taskStatus": "タスクの状態",
      "sessionHash": "セッションハッシュ"
    }
  ],
  "tasks": [
    {
      "id": "task-id",
      "timestamp": "2024-01-01T12:00:00.000Z",
      "status": "completed",
      "description": "タスクの説明",
      "sessionHash": "セッションハッシュ"
    }
  ],
  "created": "2024-01-01T12:00:00.000Z",
  "lastUpdated": "2024-01-01T12:00:00.000Z"
}
```

### バックアップファイル

```json
{
  "claudeContent": "CLAUDE.mdの内容",
  "history": "会話履歴データ",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "projectRoot": "プロジェクトルートパス"
}
```

## 統計情報

```bash
node session-manager.js stats
```

出力例:

```json
{
  "totalConversations": 50,
  "totalTasks": 15,
  "completedTasks": 12,
  "activeTasks": 3,
  "lastActivity": "2024-01-01T12:00:00.000Z",
  "sessionAge": "P1DT5H30M"
}
```

## トラブルシューティング

### 1. 履歴が保存されない

- Node.jsがインストールされているか確認
- 書き込み権限があるか確認
- ファイルパスが正しいか確認

### 2. バックアップが作成されない

- ディスク容量を確認
- `.claude-backups/` フォルダの権限を確認

### 3. セッションが復元できない

- バックアップファイルが存在するか確認
- JSONファイルが破損していないか確認

## 注意事項

- 大量の会話履歴は自動的に古いものから削除されます
- バックアップは7日間保持されます
- セッション復元は現在の状態を上書きします
- 手動でファイルを編集する場合は事前にバックアップを作成してください

## 連携

このシステムは以下の方法で Claude Code と連携できます：

1. 会話後の自動実行
2. タスク状態変更時の自動更新
3. 定期的なバックアップ実行
4. セッション開始時の自動復元
