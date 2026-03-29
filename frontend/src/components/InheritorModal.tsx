import React, { useState, useEffect } from 'react';
import { X, Search, User as UserIcon } from 'lucide-react';
import { deriveSymmetricKey, hexToBuf, bufToHex } from '../utils/encryption';

const API_URL = import.meta.env.VITE_API_URL;

interface User {
  address: string;
  name: string;
  publicKey: string;
}

interface Props {
  auth: any;
  asset: any;
  onClose: () => void;
  onUpdated: () => void;
}

const InheritorModal: React.FC<Props> = ({ auth, asset, onClose, onUpdated }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const res = await fetch(`${API_URL}/users`, {
      headers: { 'Authorization': `Bearer ${auth.token}` }
    });
    const data = await res.json();
    setUsers(data.filter((u: User) => u.address.toLowerCase() !== auth.wallets?.[0]?.address?.toLowerCase()));
  };

  const [showSignPrompt, setShowSignPrompt] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  const handleAssign = async (user: User) => {
    setPendingUser(user);
    setShowSignPrompt(true);
  };

  const confirmAndAssign = async () => {
    if (!pendingUser) return;
    try {
      setLoading(true);
      const signatureResult = await auth.signMessage({
        message: "Keisho Symmetric Key Seed"
      });

      // 1. Decrypt DEK using owner's symmetric key
      const symmetricKey = await deriveSymmetricKey(signatureResult.signature);

      const [dekIvHex, dekCipherHex] = asset.encryptedDEK.split(':');
      const dekIv = hexToBuf(dekIvHex);
      const dekCipher = hexToBuf(dekCipherHex);

      const rawDek = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: dekIv as any },
        symmetricKey,
        dekCipher as any
      );

      // 2. Encrypt DEK for inheritor
      // NOTE: In this POC, the "Public Key" is just a hash of a signature.
      // We'll use it as a shared secret for symmetric encryption for simplicity of the POC
      // since the spec didn't specify the asymmetric algorithm.
      // "継承者の公開鍵で暗号化して" -> we'll treat the "public key" as their encryption key.

      const inheritorPkBuf = hexToBuf(pendingUser.publicKey.slice(2));
      const inheritorKey = await window.crypto.subtle.importKey(
        'raw',
        inheritorPkBuf as any,
        'AES-GCM',
        false,
        ['encrypt']
      );

      const sharedIv = window.crypto.getRandomValues(new Uint8Array(12));
      const encryptedDekForInheritor = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: sharedIv as any },
        inheritorKey,
        rawDek as any
      );

      const ivHex = bufToHex(sharedIv as any);
      const encryptedDekBuf = new Uint8Array(encryptedDekForInheritor);
      const cipherHex = bufToHex(encryptedDekBuf as any);

      const res = await fetch(`${API_URL}/assets/${asset._id}/inheritor`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          inheritorAddress: pendingUser.address,
          encryptedDEK: ivHex + ':' + cipherHex
        })
      });

      if (res.ok) {
        onUpdated();
        onClose();
      }
    } catch (err) {
      console.error(err);
      alert('継承者の指定に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (inheritorAddress: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/assets/${asset._id}/inheritor/${inheritorAddress}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${auth.token}` }
      });
      if (res.ok) {
        onUpdated();
        onClose();
      }
    } catch (err) {
      console.error(err);
      alert('継承者の削除に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.address.toLowerCase().includes(search.toLowerCase())
  );

  const currentInheritorAddresses = asset.inheritors.map((i: any) => i.inheritorAddress.toLowerCase());

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] border border-slate-200 p-10 shadow-2xl space-y-8 relative animate-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-8 right-8 text-slate-500 hover:text-indigo-600 transition-colors">
          <X size={24} />
        </button>

        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">継承者を指定</h2>
        </div>

        <div className="relative group">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 shadow-sm"
            placeholder="名前またはアドレスで検索..."
          />
        </div>

        <div className="max-h-64 overflow-y-auto space-y-3 pr-1 py-1 custom-scrollbar">
          {filteredUsers.map(user => (
            <div key={user.address} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-600/20 hover:shadow-md transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                  <UserIcon size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{user.name || '匿名'}</p>
                  <p className="text-[10px] text-slate-500 font-mono tracking-wider">{user.address.slice(0, 10)}...{user.address.slice(-4)}</p>
                </div>
              </div>

              {currentInheritorAddresses.includes(user.address.toLowerCase()) ? (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-green-500 uppercase tracking-widest bg-green-50 px-2 py-1 rounded-md">指定済み</span>
                  <button
                    onClick={() => handleRemove(user.address)}
                    disabled={loading}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
                    title="継承者を削除"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleAssign(user)}
                  disabled={loading}
                  className="btn-secondary py-2 px-4 text-xs font-black uppercase tracking-widest active:scale-95 disabled:opacity-50"
                >
                  指定する
                </button>
              )}
            </div>
          ))}
          {filteredUsers.length === 0 && (
            <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
              <p className="text-slate-500 italic text-sm font-medium">ユーザーが見つかりませんでした。</p>
            </div>
          )}
        </div>
      </div>

      {showSignPrompt && pendingUser && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center p-4 z-[110] animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] border border-slate-200 p-10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900">セキュリティチェック</h2>
              <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">所有権の確認が必要です</p>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-indigo-500 font-bold">
                <span className="text-xs uppercase tracking-widest">再暗号化ポリシー</span>
              </div>
              <p className="text-sm text-slate-600 font-mono bg-white/50 p-3 rounded-xl border border-slate-200 shadow-inner italic">
                "Keisho Symmetric Key Seed"
              </p>

            </div>

            <div className="flex gap-4">
              <button
                onClick={() => { setShowSignPrompt(false); setPendingUser(null); }}
                className="btn-secondary flex-1"
              >
                キャンセル
              </button>
              <button
                onClick={confirmAndAssign}
                disabled={loading}
                className="btn-primary flex-[2] py-4 shadow-xl shadow-indigo-100 relative overflow-hidden"
              >
                <span className={loading ? 'opacity-0' : 'opacity-100'}>
                  {loading ? '指定中...' : '署名して指定'}
                </span>
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InheritorModal;
