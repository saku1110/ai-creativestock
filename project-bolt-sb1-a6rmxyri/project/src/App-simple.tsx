import React from 'react';

function App() {
  return (
    <div style={{
      padding: '50px',
      color: 'white',
      background: '#0a0a0a',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <h1 style={{ fontSize: '48px', marginBottom: '20px', textAlign: 'center' }}>
        ✨ AI Creative Stock
      </h1>
      <p style={{ fontSize: '24px', marginBottom: '40px', textAlign: 'center' }}>
        開発サーバーが正常に動作しています！
      </p>
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        padding: '20px',
        borderRadius: '10px',
        maxWidth: '600px'
      }}>
        <p style={{ fontSize: '16px', lineHeight: '1.6' }}>
          このテストページが表示されている場合、Vite開発サーバーは正しく動作しています。<br />
          元のApp.tsxに問題がある可能性があります。
        </p>
      </div>
    </div>
  );
}

export default App;
