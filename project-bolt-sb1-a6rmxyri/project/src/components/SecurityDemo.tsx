// セキュリティ機能のデモンストレーション
import React, { useState } from 'react';
import { sanitizeInput, InputType } from '../lib/inputSecurity';
import { detectXSS, escapeHTML } from '../lib/xssSecurity';
import { detectSQLInjection } from '../lib/sqlSecurity';
import { validatePasswordStrength } from '../lib/passwordSecurity';

const SecurityDemo: React.FC = () => {
  const [testInput, setTestInput] = useState('');
  const [inputType, setInputType] = useState<InputType>(InputType.TEXT);
  const [results, setResults] = useState<any>(null);

  const handleTest = () => {
    // 各種セキュリティチェックを実行
    const sanitizationResult = sanitizeInput(testInput, inputType);
    const xssDetected = detectXSS(testInput);
    const sqlInjectionDetected = detectSQLInjection(testInput);
    const escapedHtml = escapeHTML(testInput);
    
    let passwordStrength = null;
    if (inputType === InputType.PASSWORD) {
      passwordStrength = validatePasswordStrength(testInput);
    }

    setResults({
      original: testInput,
      sanitization: sanitizationResult,
      xssDetected,
      sqlInjectionDetected,
      escapedHtml,
      passwordStrength
    });
  };

  const xssTestCases = [
    '<script>alert("XSS")</script>',
    'javascript:alert("XSS")',
    '<img src=x onerror=alert("XSS")>',
    '<svg onload=alert("XSS")>'
  ];

  const sqlTestCases = [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "' UNION SELECT * FROM users --",
    "; DELETE FROM products;"
  ];

  const passwordTestCases = [
    'password123',
    'StrongPass123!',
    'weak',
    'VerySecurePassword2024!'
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">🛡️ セキュリティ機能デモ</h2>
      
      {/* 入力テストセクション */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">入力値セキュリティテスト</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            入力タイプ:
          </label>
          <select
            value={inputType}
            onChange={(e) => setInputType(e.target.value as InputType)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            {Object.values(InputType).map(type => (
              <option key={type} value={type}>{type.toUpperCase()}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            テスト入力:
          </label>
          <textarea
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="テストしたい入力値を入力してください..."
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>

        <button
          onClick={handleTest}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          セキュリティテスト実行
        </button>
      </div>

      {/* テストケースボタン */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">プリセットテストケース</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-600 mb-2">XSS攻撃パターン:</h4>
            <div className="flex flex-wrap gap-2">
              {xssTestCases.map((testCase, index) => (
                <button
                  key={index}
                  onClick={() => setTestInput(testCase)}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                >
                  XSS #{index + 1}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-600 mb-2">SQLインジェクション攻撃パターン:</h4>
            <div className="flex flex-wrap gap-2">
              {sqlTestCases.map((testCase, index) => (
                <button
                  key={index}
                  onClick={() => setTestInput(testCase)}
                  className="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors"
                >
                  SQL #{index + 1}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-600 mb-2">パスワードテストケース:</h4>
            <div className="flex flex-wrap gap-2">
              {passwordTestCases.map((testCase, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setInputType(InputType.PASSWORD);
                    setTestInput(testCase);
                  }}
                  className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                >
                  PWD #{index + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 結果表示 */}
      {results && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">テスト結果</h3>
          
          <div className="space-y-4">
            {/* 元の入力 */}
            <div className="p-4 bg-gray-50 rounded-md">
              <h4 className="font-medium text-gray-600 mb-2">元の入力:</h4>
              <code className="text-sm text-gray-800 break-all">{results.original}</code>
            </div>

            {/* セキュリティ脅威検出 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-md ${results.xssDetected ? 'bg-red-50 border-l-4 border-red-500' : 'bg-green-50 border-l-4 border-green-500'}`}>
                <h4 className="font-medium mb-2">
                  {results.xssDetected ? '🚨 XSS攻撃検出' : '✅ XSS攻撃なし'}
                </h4>
                <p className="text-sm text-gray-600">
                  {results.xssDetected ? 'クロスサイトスクリプティング攻撃パターンが検出されました' : 'XSS攻撃パターンは検出されませんでした'}
                </p>
              </div>

              <div className={`p-4 rounded-md ${results.sqlInjectionDetected ? 'bg-red-50 border-l-4 border-red-500' : 'bg-green-50 border-l-4 border-green-500'}`}>
                <h4 className="font-medium mb-2">
                  {results.sqlInjectionDetected ? '🚨 SQLインジェクション検出' : '✅ SQLインジェクションなし'}
                </h4>
                <p className="text-sm text-gray-600">
                  {results.sqlInjectionDetected ? 'SQLインジェクション攻撃パターンが検出されました' : 'SQLインジェクション攻撃パターンは検出されませんでした'}
                </p>
              </div>
            </div>

            {/* サニタイゼーション結果 */}
            <div className={`p-4 rounded-md ${results.sanitization.isValid ? 'bg-green-50' : 'bg-yellow-50'}`}>
              <h4 className="font-medium text-gray-600 mb-2">サニタイゼーション結果:</h4>
              
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-600">サニタイズ後: </span>
                  <code className="text-sm text-gray-800 break-all">{results.sanitization.sanitizedValue}</code>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-600">有効性: </span>
                  <span className={`text-sm ${results.sanitization.isValid ? 'text-green-600' : 'text-red-600'}`}>
                    {results.sanitization.isValid ? '有効' : '無効'}
                  </span>
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-600">長さ変化: </span>
                  <span className="text-sm text-gray-800">
                    {results.sanitization.originalLength} → {results.sanitization.finalLength}
                  </span>
                </div>

                {results.sanitization.errors.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-red-600">エラー: </span>
                    <ul className="text-sm text-red-600 ml-4">
                      {results.sanitization.errors.map((error: string, index: number) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {results.sanitization.warnings.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-yellow-600">警告: </span>
                    <ul className="text-sm text-yellow-600 ml-4">
                      {results.sanitization.warnings.map((warning: string, index: number) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* HTMLエスケープ結果 */}
            <div className="p-4 bg-blue-50 rounded-md">
              <h4 className="font-medium text-gray-600 mb-2">HTMLエスケープ結果:</h4>
              <code className="text-sm text-gray-800 break-all">{results.escapedHtml}</code>
            </div>

            {/* パスワード強度（パスワードタイプの場合のみ） */}
            {results.passwordStrength && (
              <div className={`p-4 rounded-md ${results.passwordStrength.isValid ? 'bg-green-50' : 'bg-red-50'}`}>
                <h4 className="font-medium text-gray-600 mb-2">パスワード強度分析:</h4>
                
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-600">強度スコア: </span>
                    <span className="text-sm text-gray-800">{results.passwordStrength.score}/100</span>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className={`h-2 rounded-full ${
                          results.passwordStrength.score >= 80 ? 'bg-green-500' :
                          results.passwordStrength.score >= 60 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${results.passwordStrength.score}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-gray-600">要件チェック:</span>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1">
                      {Object.entries(results.passwordStrength.requirements).map(([requirement, met]) => (
                        <div key={requirement} className="flex items-center">
                          <span className={`text-sm ${met ? 'text-green-600' : 'text-red-600'}`}>
                            {met ? '✅' : '❌'} {requirement}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {results.passwordStrength.feedback.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">フィードバック:</span>
                      <ul className="text-sm text-gray-600 ml-4 mt-1">
                        {results.passwordStrength.feedback.map((feedback: string, index: number) => (
                          <li key={index}>• {feedback}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* セキュリティ機能説明 */}
      <div className="bg-gray-50 p-6 rounded-md">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">実装されたセキュリティ機能</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-600 mb-2">🛡️ XSS対策</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• HTMLタグの検出・除去</li>
              <li>• 危険なJavaScriptコードの検出</li>
              <li>• HTMLエスケープ処理</li>
              <li>• DOMPurify統合</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-gray-600 mb-2">🗃️ SQLインジェクション対策</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 危険なSQLキーワード検出</li>
              <li>• パラメータ化クエリ強制</li>
              <li>• 入力値サニタイゼーション</li>
              <li>• データベース監査ログ</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-gray-600 mb-2">🔐 パスワードセキュリティ</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• bcryptソルト付きハッシュ化</li>
              <li>• 強度チェック機能</li>
              <li>• パスワード履歴管理</li>
              <li>• リセットトークン生成</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-gray-600 mb-2">📝 入力値検証</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• タイプ別バリデーション</li>
              <li>• 自動サニタイゼーション</li>
              <li>• 長さ制限・文字制限</li>
              <li>• リアルタイム検証</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityDemo;