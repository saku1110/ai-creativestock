#!/usr/bin/env node

/**
 * Claude Code セッション管理システム
 * 会話履歴とタスクを自動保存・復元する
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SessionManager {
  constructor() {
    this.projectRoot = process.cwd();
    this.claudeFile = path.join(this.projectRoot, 'CLAUDE.md');
    this.historyFile = path.join(this.projectRoot, '.claude-history.json');
    this.backupDir = path.join(this.projectRoot, '.claude-backups');

    // バックアップディレクトリを作成
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  // 現在のセッション状態を取得
  getCurrentSession() {
    try {
      const claudeContent = fs.readFileSync(this.claudeFile, 'utf8');
      const history = this.loadHistory();

      return {
        claudeContent,
        history,
        timestamp: new Date().toISOString(),
        projectRoot: this.projectRoot,
      };
    } catch (error) {
      console.error('セッション状態の取得に失敗:', error.message);
      return null;
    }
  }

  // 会話履歴を保存
  saveConversation(userMessage, assistantResponse, taskStatus = null) {
    const history = this.loadHistory();

    const conversationEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      userMessage,
      assistantResponse,
      taskStatus,
      sessionHash: this.generateSessionHash(),
    };

    history.conversations.push(conversationEntry);

    // 最新100件のみ保持
    if (history.conversations.length > 100) {
      history.conversations = history.conversations.slice(-100);
    }

    this.saveHistory(history);
    this.updateClaudeFile(conversationEntry);
    this.createBackup();

    return conversationEntry.id;
  }

  // タスク状態を更新
  updateTaskStatus(taskId, status, description = null) {
    const history = this.loadHistory();

    const taskEntry = {
      id: taskId,
      timestamp: new Date().toISOString(),
      status, // pending, in_progress, completed
      description,
      sessionHash: this.generateSessionHash(),
    };

    history.tasks.push(taskEntry);
    this.saveHistory(history);
    this.updateClaudeTaskSection(taskEntry);

    return taskEntry;
  }

  // 履歴を読み込み
  loadHistory() {
    try {
      if (fs.existsSync(this.historyFile)) {
        const data = fs.readFileSync(this.historyFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('履歴の読み込みに失敗:', error.message);
    }

    return {
      conversations: [],
      tasks: [],
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
  }

  // 履歴を保存
  saveHistory(history) {
    try {
      history.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2));
    } catch (error) {
      console.error('履歴の保存に失敗:', error.message);
    }
  }

  // CLAUDE.mdファイルを更新
  updateClaudeFile(conversationEntry) {
    try {
      let content = fs.readFileSync(this.claudeFile, 'utf8');

      // 会話履歴セクションを更新
      const historySection = this.generateHistorySection(conversationEntry);

      // 会話履歴の要約セクションを更新
      const summaryRegex = /## 会話履歴の要約\n([\s\S]*?)(?=\n## |$)/;
      if (summaryRegex.test(content)) {
        content = content.replace(summaryRegex, historySection);
      } else {
        // セクションが存在しない場合は追加
        content += '\n\n' + historySection;
      }

      fs.writeFileSync(this.claudeFile, content);
    } catch (error) {
      console.error('CLAUDE.mdの更新に失敗:', error.message);
    }
  }

  // CLAUDE.mdのタスクセクションを更新
  updateClaudeTaskSection(taskEntry) {
    try {
      let content = fs.readFileSync(this.claudeFile, 'utf8');

      // 現在のタスク状況セクションを更新
      const taskSection = this.generateTaskSection();

      const taskRegex = /## 現在のタスク状況\n([\s\S]*?)(?=\n## |$)/;
      if (taskRegex.test(content)) {
        content = content.replace(taskRegex, taskSection);
      } else {
        // セクションが存在しない場合は追加
        content += '\n\n' + taskSection;
      }

      fs.writeFileSync(this.claudeFile, content);
    } catch (error) {
      console.error('CLAUDE.mdのタスクセクション更新に失敗:', error.message);
    }
  }

  // 会話履歴セクションを生成
  generateHistorySection(latestEntry) {
    const history = this.loadHistory();
    const recentConversations = history.conversations.slice(-5); // 最新5件

    let section = '## 会話履歴の要約\n';

    recentConversations.forEach((conv, index) => {
      const num = recentConversations.length - index;
      section += `${num}. **${new Date(conv.timestamp).toLocaleString('ja-JP')}**\n`;
      section += `   - ユーザー: ${conv.userMessage.substring(0, 100)}${conv.userMessage.length > 100 ? '...' : ''}\n`;
      section += `   - 応答: ${conv.assistantResponse.substring(0, 100)}${conv.assistantResponse.length > 100 ? '...' : ''}\n`;
      if (conv.taskStatus) {
        section += `   - タスク: ${conv.taskStatus}\n`;
      }
      section += '\n';
    });

    return section;
  }

  // タスクセクションを生成
  generateTaskSection() {
    const history = this.loadHistory();
    const activeTasks = history.tasks.filter((task) => task.status !== 'completed');
    const completedTasks = history.tasks.filter((task) => task.status === 'completed');

    let section = '## 現在のタスク状況\n';

    if (activeTasks.length > 0) {
      section += '### 進行中のタスク\n';
      activeTasks.forEach((task) => {
        const status = task.status === 'pending' ? '⏳ 待機中' : '🔄 進行中';
        section += `- ${status}: ${task.description || task.id}\n`;
      });
      section += '\n';
    }

    if (completedTasks.length > 0) {
      section += '### 完了したタスク\n';
      completedTasks.slice(-5).forEach((task) => {
        // 最新5件
        section += `- ✅ 完了: ${task.description || task.id}\n`;
      });
      section += '\n';
    }

    return section;
  }

  // バックアップを作成
  createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(this.backupDir, `claude-session-${timestamp}.json`);

      const sessionData = this.getCurrentSession();
      fs.writeFileSync(backupFile, JSON.stringify(sessionData, null, 2));

      // 古いバックアップを削除（7日以上前）
      this.cleanupOldBackups();
    } catch (error) {
      console.error('バックアップの作成に失敗:', error.message);
    }
  }

  // 古いバックアップを削除
  cleanupOldBackups() {
    try {
      const files = fs.readdirSync(this.backupDir);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      files.forEach((file) => {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);

        if (stats.mtime < sevenDaysAgo) {
          fs.unlinkSync(filePath);
        }
      });
    } catch (error) {
      console.error('古いバックアップの削除に失敗:', error.message);
    }
  }

  // セッションを復元
  restoreSession(backupFile = null) {
    try {
      let sessionData;

      if (backupFile) {
        sessionData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
      } else {
        // 最新のバックアップを使用
        const files = fs.readdirSync(this.backupDir);
        const latestBackup = files
          .filter((f) => f.startsWith('claude-session-'))
          .sort()
          .pop();

        if (!latestBackup) {
          throw new Error('復元可能なバックアップが見つかりません');
        }

        sessionData = JSON.parse(fs.readFileSync(path.join(this.backupDir, latestBackup), 'utf8'));
      }

      // CLAUDE.mdを復元
      fs.writeFileSync(this.claudeFile, sessionData.claudeContent);

      // 履歴を復元
      this.saveHistory(sessionData.history);

      console.log('セッションが復元されました:', sessionData.timestamp);
      return sessionData;
    } catch (error) {
      console.error('セッションの復元に失敗:', error.message);
      return null;
    }
  }

  // ユーティリティ関数
  generateId() {
    return crypto.randomBytes(8).toString('hex');
  }

  generateSessionHash() {
    return crypto.createHash('md5').update(Date.now().toString()).digest('hex').substring(0, 8);
  }

  // セッション統計を取得
  getSessionStats() {
    const history = this.loadHistory();

    return {
      totalConversations: history.conversations.length,
      totalTasks: history.tasks.length,
      completedTasks: history.tasks.filter((t) => t.status === 'completed').length,
      activeTasks: history.tasks.filter((t) => t.status !== 'completed').length,
      lastActivity: history.lastUpdated,
      sessionAge: new Date(Date.now() - new Date(history.created).getTime()).toISOString(),
    };
  }
}

// CLI コマンド処理
if (require.main === module) {
  const manager = new SessionManager();
  const command = process.argv[2];

  switch (command) {
    case 'backup':
      manager.createBackup();
      console.log('バックアップが作成されました');
      break;

    case 'restore':
      const backupFile = process.argv[3];
      manager.restoreSession(backupFile);
      break;

    case 'stats':
      const stats = manager.getSessionStats();
      console.log('セッション統計:', JSON.stringify(stats, null, 2));
      break;

    case 'save':
      const userMsg = process.argv[3] || 'Manual save';
      const assistantMsg = process.argv[4] || 'Session saved manually';
      manager.saveConversation(userMsg, assistantMsg);
      console.log('会話が保存されました');
      break;

    default:
      console.log('使用方法:');
      console.log('  node session-manager.js backup    - バックアップを作成');
      console.log('  node session-manager.js restore   - 最新のバックアップから復元');
      console.log('  node session-manager.js stats     - セッション統計を表示');
      console.log('  node session-manager.js save [user] [assistant] - 手動で会話を保存');
  }
}

module.exports = SessionManager;
