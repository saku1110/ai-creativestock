#!/usr/bin/env node

/**
 * Claude Code フック システム
 * 会話のたびに自動で履歴を保存し、CLAUDE.mdを更新する
 */

const SessionManager = require('./session-manager.js');

class ClaudeHook {
  constructor() {
    this.sessionManager = new SessionManager();
  }

  // 会話後の自動保存フック
  onConversationEnd(userMessage, assistantResponse, taskStatus = null) {
    try {
      const conversationId = this.sessionManager.saveConversation(
        userMessage,
        assistantResponse,
        taskStatus,
      );

      console.log(`[Hook] 会話が自動保存されました: ${conversationId}`);
      return conversationId;
    } catch (error) {
      console.error('[Hook] 会話の自動保存に失敗:', error.message);
      return null;
    }
  }

  // タスク状態変更フック
  onTaskStatusChange(taskId, status, description = null) {
    try {
      const taskEntry = this.sessionManager.updateTaskStatus(taskId, status, description);
      console.log(`[Hook] タスク状態が更新されました: ${taskId} -> ${status}`);
      return taskEntry;
    } catch (error) {
      console.error('[Hook] タスク状態の更新に失敗:', error.message);
      return null;
    }
  }

  // セッション開始フック
  onSessionStart() {
    try {
      const stats = this.sessionManager.getSessionStats();
      console.log('[Hook] セッションが開始されました');
      console.log(
        `[Hook] 統計: ${stats.totalConversations}回の会話, ${stats.activeTasks}個のアクティブタスク`,
      );

      // 自動バックアップ
      this.sessionManager.createBackup();

      return stats;
    } catch (error) {
      console.error('[Hook] セッション開始処理に失敗:', error.message);
      return null;
    }
  }

  // 定期的な自動保存（インターバル実行）
  startAutoSave(intervalMinutes = 5) {
    const interval = intervalMinutes * 60 * 1000;

    setInterval(() => {
      try {
        this.sessionManager.createBackup();
        console.log('[Hook] 定期バックアップが作成されました');
      } catch (error) {
        console.error('[Hook] 定期バックアップに失敗:', error.message);
      }
    }, interval);

    console.log(`[Hook] 定期自動保存が開始されました (${intervalMinutes}分間隔)`);
  }
}

// 使用例とCLIコマンド
if (require.main === module) {
  const hook = new ClaudeHook();
  const command = process.argv[2];

  switch (command) {
    case 'conversation':
      const userMsg = process.argv[3] || 'テストメッセージ';
      const assistantMsg = process.argv[4] || 'テスト応答';
      const taskStatus = process.argv[5] || null;
      hook.onConversationEnd(userMsg, assistantMsg, taskStatus);
      break;

    case 'task':
      const taskId = process.argv[3] || 'task-' + Date.now();
      const status = process.argv[4] || 'pending';
      const description = process.argv[5] || null;
      hook.onTaskStatusChange(taskId, status, description);
      break;

    case 'start':
      hook.onSessionStart();
      break;

    case 'auto-save':
      const interval = parseInt(process.argv[3]) || 5;
      hook.startAutoSave(interval);
      // プロセスを維持
      process.stdin.resume();
      break;

    default:
      console.log('使用方法:');
      console.log('  node claude-hook.js conversation [user] [assistant] [task]');
      console.log('  node claude-hook.js task [id] [status] [description]');
      console.log('  node claude-hook.js start');
      console.log('  node claude-hook.js auto-save [interval_minutes]');
  }
}

module.exports = ClaudeHook;
