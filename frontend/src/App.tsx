import React, { useState } from 'react';
import { useKeishoAuth } from './hooks/useKeishoAuth';
import { deriveKeishoPublicKey } from './utils/encryption';
import Dashboard from './components/Dashboard';
import { PenLine, X } from 'lucide-react';

const App: React.FC = () => {
  const auth = useKeishoAuth();
  const [name, setName] = useState('');
  const [registering, setRegistering] = useState(false);
  const [showSignPrompt, setShowSignPrompt] = useState(false);

  const handleRegister = async () => {
    if (!auth.wallets?.[0] || !name) return;
    setShowSignPrompt(true);
  };

  const confirmAndRegister = async () => {
    try {
      setRegistering(true);
      const signatureResult = await auth.signMessage({
        message: "Keisho Public Key Seed"
      });
      const publicKey = await deriveKeishoPublicKey(signatureResult.signature);
      await auth.register(name, publicKey);
      setShowSignPrompt(false);
    } catch (err) {
      console.error(err);
    } finally {
      setRegistering(false);
    }
  };

  if (auth.loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 text-slate-900">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="text-slate-500">Keishoを初期化中...</p>
        </div>
      </div>
    );
  }

  if (auth.error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-900 p-8 text-center space-y-8">
        <div className="max-w-md w-full bg-white p-10 rounded-2xl border border-red-100 shadow-2xl space-y-6">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <X size={32} />
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">エラーが発生しました</h2>
            <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 text-left">
              <p className="text-red-800 text-sm font-medium leading-relaxed">{auth.error}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => auth.logout()}
              className="btn-secondary flex-1 py-3"
            >
              ログアウト
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary flex-1 py-3"
            >
              再試行
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!auth.authenticated || !auth.token) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-900 space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-bold tracking-tight text-indigo-600">Keisho</h1>
        </div>
        <button
          onClick={() => auth.login()}
          className="btn-primary text-lg px-12 py-4 shadow-xl shadow-indigo-200 hover:scale-105 active:scale-95 transition-all"
        >
          Privyでログイン
        </button>
      </div>
    );
  }

  if (!auth.isRegistered) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-900 p-8">
        <div className="max-w-md w-full bg-white p-10 rounded-2xl border border-slate-200 shadow-2xl space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">プロフィール登録</h2>
            <p className="text-slate-500 text-sm">デジタル遺産の管理用アカウントを作成します。</p>
          </div>

          {!showSignPrompt ? (
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider">お名前</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-lg"
                  placeholder="例: 山田 太郎"
                />
              </div>
              <button
                onClick={handleRegister}
                disabled={!name}
                className="w-full btn-primary py-4 text-lg disabled:opacity-50"
              >
                登録する
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 text-indigo-600 font-semibold mb-2">
                  <PenLine size={18} />
                  <span className="w-2 h-2 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(139,92,246,0.6)]"></span>
                </div>
                <p className="text-sm text-slate-500 font-mono bg-white p-2 rounded">"Keisho Public Key Seed"</p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowSignPrompt(false)}
                  className="btn-secondary flex-1"
                >
                  Back
                </button>
                <button
                  onClick={confirmAndRegister}
                  disabled={registering}
                  className="btn-primary flex-[2] py-4"
                >
                  {registering ? '登録中...' : '登録を完了する'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <Dashboard auth={auth} />;
};

export default App;
