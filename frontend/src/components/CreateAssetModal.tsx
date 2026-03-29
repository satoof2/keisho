import React, { useState } from 'react';
import { X, PenLine } from 'lucide-react';
import { deriveSymmetricKey, encryptAsset } from '../utils/encryption';

const API_URL = import.meta.env.VITE_API_URL;

interface Props {
  auth: any;
  onClose: () => void;
  onCreated: () => void;
}

const CreateAssetModal: React.FC<Props> = ({ auth, onClose, onCreated }) => {
  const [content, setContent] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSignPrompt, setShowSignPrompt] = useState(false);

  const MAX_CONTENT_LENGTH = 255;

  const handleCreate = async () => {
    if (!content || content.length > MAX_CONTENT_LENGTH) return;
    setShowSignPrompt(true);
  };

  const confirmAndCreate = async () => {
    try {
      setLoading(true);
      const signatureResult = await auth.signMessage({ 
        message: "Keisho Symmetric Key Seed" 
      });
      
      const symmetricKey = await deriveSymmetricKey(signatureResult.signature);
      const { encryptedContent, encryptedDEK } = await encryptAsset(content, symmetricKey);

      const res = await fetch(`${API_URL}/assets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({ encryptedContent, encryptedDEK, name })
      });

      if (res.ok) {
        onCreated();
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[2rem] border border-slate-200 p-10 shadow-2xl space-y-8 relative animate-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-indigo-600 transition-colors">
          <X size={24} />
        </button>
        
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-900">資産を作成</h2>
        </div>
        
        {!showSignPrompt ? (
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-widest">資産名 (公開)</label>
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-lg bg-white border border-slate-200 rounded-2xl text-slate-900 p-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-inner"
                  placeholder="例: 秘密のパスワード"
                />
              </div>

              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-widest">秘密の内容</label>
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={MAX_CONTENT_LENGTH}
                  className="w-full h-40 text-lg leading-relaxed bg-slate-50 border border-slate-200 text-slate-900 shadow-inner rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder=""
                />
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                  </div>
                  <p className={`text-[10px] font-mono font-bold ${content.length > MAX_CONTENT_LENGTH ? 'text-red-500' : 'text-slate-500'}`}>
                    {content.length}/{MAX_CONTENT_LENGTH}
                  </p>
                </div>
              </div>
            </div>
            <button 
              onClick={handleCreate}
              disabled={loading || !content || content.length > MAX_CONTENT_LENGTH}
              className="w-full btn-primary py-4 text-lg shadow-xl shadow-indigo-100 disabled:opacity-50"
            >
              署名の準備をする
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-indigo-500 font-bold">
                <PenLine size={18} />
                <span className="text-xs uppercase tracking-widest">署名ポリシー</span>
              </div>
              <p className="text-sm text-slate-500 font-mono bg-white/50 p-3 rounded-xl border border-slate-200 shadow-inner italic">
                "Keisho Symmetric Key Seed"
              </p>

            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowSignPrompt(false)}
                className="btn-secondary flex-1"
              >
                戻る
              </button>
              <button 
                onClick={confirmAndCreate}
                disabled={loading}
                className="btn-primary flex-[2] py-4 shadow-xl shadow-indigo-100 relative overflow-hidden"
              >
                <span className={loading ? 'opacity-0' : 'opacity-100'}>
                  {loading ? '処理中...' : '署名して作成'}
                </span>
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  </div>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateAssetModal;
