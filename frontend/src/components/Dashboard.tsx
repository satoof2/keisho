import React, { useState, useEffect } from 'react';
import { Plus, Users, Lock, Unlock, LogOut, PenLine, Copy, Check, X } from 'lucide-react';
import { deriveSymmetricKey, decryptAssetWithOwnerKey, deriveKeishoPublicKey, hexToBuf } from '../utils/encryption';
import CreateAssetModal from './CreateAssetModal';
import InheritorModal from './InheritorModal';

const API_URL = import.meta.env.VITE_API_URL;

interface IInheritor {
  inheritorAddress: string;
  encryptedDEK: string;
}

interface Asset {
  _id: string;
  ownerAddress: string;
  name?: string;
  encryptedContent: string;
  encryptedDEK: string;
  inheritors: IInheritor[];
  createdAt: string;
}

const Dashboard: React.FC<{ auth: any }> = ({ auth }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [sharedAssets, setSharedAssets] = useState<Asset[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showInheritorModal, setShowInheritorModal] = useState(false);
  const [decryptedContents, setDecryptedContents] = useState<Record<string, string>>({});
  const [showSignPrompt, setShowSignPrompt] = useState<'owner' | 'inheritor' | null>(null);
  const [pendingAsset, setPendingAsset] = useState<Asset | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editAssetName, setEditAssetName] = useState('');

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Wallet address display & sign
  const [copied, setCopied] = useState(false);
  const [signInput, setSignInput] = useState('');
  const [signResult, setSignResult] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);

  const walletAddress: string = auth.wallets?.[0]?.address ?? '';

  const handleCopyAddress = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignMessage = async () => {
    if (!signInput.trim()) return;
    try {
      setSigning(true);
      setSignResult(null);
      const result = await auth.signMessage({ message: signInput });
      setSignResult(result.signature);
      setToast({ message: 'Message signed successfully', type: 'success' });
    } catch (err) {
      console.error('Sign failed', err);
      setToast({ message: `Signing failed: ${err instanceof Error ? err.message : 'Unknown error'}`, type: 'error' });
    } finally {
      setSigning(false);
    }
  };

  // Reset state when token changes (e.g. login/logout)
  useEffect(() => {
    setAssets([]);
    setSharedAssets([]);
    setDecryptedContents({});
    setSignResult(null);
    setShowSignPrompt(null);
    setPendingAsset(null);
    setUserName('');
  }, [auth.token]);

  // Re-fetch data when everything is ready (handles page refresh)
  useEffect(() => {
    if (auth.token && auth.ready && auth.wallets?.length > 0) {
      fetchAssets();
      fetchSharedAssets();
      fetchAllUsers();
      fetchCurrentUser();
    }
  }, [auth.token, auth.ready, auth.wallets?.length]);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch(`${API_URL}/users/me`, {
        headers: { 'Authorization': `Bearer ${auth.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUserName(data.name || '');
        setNewName(data.name || '');
      }
    } catch (e) {
      console.error('Failed to fetch current user', e);
    }
  };
  
  const handleUpdateAssetName = async (assetId: string) => {
    try {
      const res = await fetch(`${API_URL}/assets/${assetId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({ name: editAssetName })
      });
      if (res.ok) {
        setEditingAssetId(null);
        fetchAssets();
        setToast({ message: 'Asset name updated', type: 'success' });
      }
    } catch (e) {
      console.error('Failed to update asset name', e);
      setToast({ message: 'Failed to update asset name', type: 'error' });
    }
  };

  const handleUpdateName = async () => {
    try {
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({ name: newName })
      });
      if (res.ok) {
        const data = await res.json();
        setUserName(data.name);
        setIsEditingName(false);
        setToast({ message: 'Username updated successfully', type: 'success' });
      }
    } catch (e) {
      console.error('Failed to update name', e);
      setToast({ message: 'Failed to update username', type: 'error' });
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/users`, {
        headers: { 'Authorization': `Bearer ${auth.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data);
      }
    } catch (e) {
      console.error('Failed to fetch users', e);
    }
  };

  if (auth.authenticated && (!Array.isArray(auth.wallets) || auth.wallets.length === 0)) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="text-slate-500">Loading wallet info...</p>
        </div>
      </div>
    );
  }

  let displayName = 'User';
  try {
    // Privy's user.email is an object { address: string }, not a plain string
    const userEmail = auth.user?.email?.address || auth.user?.email;
    const walletAddress = auth.wallets?.[0]?.address;
    const emailStr = typeof userEmail === 'string' ? userEmail : '';
    const addrStr = typeof walletAddress === 'string' ? walletAddress : '';
    displayName = userName || emailStr || (addrStr ? addrStr.slice(0, 6) + '...' : 'User');
  } catch (e) {
    console.error('Error computing display name', e);
  }

  const fetchAssets = async () => {
    const res = await fetch(`${API_URL}/assets`, {
      headers: { 'Authorization': `Bearer ${auth.token}` }
    });
    const data = await res.json();
    setAssets(data);
  };

  const fetchSharedAssets = async () => {
    const res = await fetch(`${API_URL}/assets/shared`, {
      headers: { 'Authorization': `Bearer ${auth.token}` }
    });
    const data = await res.json();
    setSharedAssets(data);
  };

  const handleDecrypt = (asset: Asset) => {
    setPendingAsset(asset);
    setShowSignPrompt('owner');
  };

  const confirmDecryptOwner = async () => {
    if (!pendingAsset) return;
    try {
      setDecrypting(true);
      const signatureResult = await auth.signMessage({ 
        message: "Keisho Symmetric Key Seed" 
      });
      
      const symmetricKey = await deriveSymmetricKey(signatureResult.signature);
      const content = await decryptAssetWithOwnerKey(
        pendingAsset.encryptedContent,
        pendingAsset.encryptedDEK,
        symmetricKey
      );
      setDecryptedContents((prev: Record<string, string>) => ({ ...prev, [pendingAsset._id]: content }));
      setShowSignPrompt(null);
      setPendingAsset(null);
    } catch (err) {
      console.error('Decryption failed', err);
      setToast({ message: `Decryption failed: ${err instanceof Error ? err.message : 'The symmetric key does not match. This asset may belong to a different account.'}`, type: 'error' });
      setShowSignPrompt(null);
      setPendingAsset(null);
    } finally {
      setDecrypting(false);
    }
  };

  const handleDecryptShared = (asset: Asset) => {
    setPendingAsset(asset);
    setShowSignPrompt('inheritor');
  };

  const confirmDecryptShared = async () => {
    if (!pendingAsset) return;
    try {
      setDecrypting(true);
      const signatureResult = await auth.signMessage({ 
        message: "Keisho Public Key Seed" 
      });
      
      // Get our "Public Key" which acts as the decryption key for this POC
      const myPk = await deriveKeishoPublicKey(signatureResult.signature);
      const myPkBuf = hexToBuf(myPk.slice(2));

      const decryptionKey = await window.crypto.subtle.importKey(
        'raw',
        myPkBuf as any,
        'AES-GCM',
        false,
        ['decrypt']
      );

      // 1. Find our specific encrypted DEK
      const myInheritorData = pendingAsset.inheritors.find(
        (i: any) => i.inheritorAddress.toLowerCase() === auth.wallets?.[0]?.address?.toLowerCase()
      );
      if (!myInheritorData) throw new Error('Not an inheritor');

      const [dekIvHex, dekCipherHex] = myInheritorData.encryptedDEK.split(':');
      const dekIv = hexToBuf(dekIvHex);
      const dekCipher = hexToBuf(dekCipherHex);

      // 2. Decrypt DEK
      const rawDek = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: dekIv as any },
        decryptionKey,
        dekCipher as any
      );

      const dek = await window.crypto.subtle.importKey(
        'raw',
        rawDek as any,
        'AES-GCM',
        false,
        ['decrypt']
      );

      // 3. Decrypt Content
      const [contentIvHex, contentCipherHex] = pendingAsset.encryptedContent.split(':');
      const contentIv = hexToBuf(contentIvHex);
      const contentCipher = hexToBuf(contentCipherHex);

      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: contentIv as any },
        dek,
        contentCipher as any
      );

      const content = new TextDecoder().decode(decryptedBuffer);
      setDecryptedContents((prev: Record<string, string>) => ({ ...prev, [pendingAsset._id]: content }));
      setShowSignPrompt(null);
      setPendingAsset(null);
    } catch (err) {
      console.error('Shared decryption failed', err);
      setToast({ message: `Shared decryption failed: ${err instanceof Error ? err.message : 'Key mismatch or corrupted data.'}`, type: 'error' });
      setShowSignPrompt(null);
      setPendingAsset(null);
    } finally {
      setDecrypting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8 md:p-12">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight text-indigo-600">Keisho</h1>
            <div className="flex items-center gap-2">
              <p className="text-slate-500 font-medium whitespace-nowrap">Welcome back, </p>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input 
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="py-1 px-3 text-sm bg-white border border-slate-200 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
                    autoFocus
                  />
                  <button onClick={handleUpdateName} className="p-1.5 text-indigo-500 hover:bg-slate-700 rounded-lg transition-colors">
                    <Check size={16} />
                  </button>
                  <button onClick={() => { setIsEditingName(false); setNewName(userName); }} className="p-1.5 text-slate-500 hover:bg-slate-700 rounded-lg transition-colors">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <span className="text-slate-200 font-bold">{displayName}</span>
                  <button 
                    onClick={() => setIsEditingName(true)}
                    className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-slate-700 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <PenLine size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={20} /> New Asset
            </button>
            <button 
              onClick={auth.logout}
              className="p-3 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
              title="Logout"
            >
              <LogOut size={22} />
            </button>
          </div>
        </header>

        {/* Wallet Info & Sign Section */}
        <section className="animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                <PenLine size={20} className="text-indigo-500" /> Wallet Identity
              </h2>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full uppercase tracking-widest">Headless Profile</span>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Address display */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Public Address</label>
                <div className="flex items-center gap-2 group">
                  <code className="flex-1 bg-zinc-950 text-indigo-600 text-sm font-mono px-4 py-3 rounded-xl border border-slate-200 shadow-inner truncate">
                    {walletAddress || '―'}
                  </code>
                  <button
                    onClick={handleCopyAddress}
                    disabled={!walletAddress}
                    className="p-3 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-40"
                    title="Copy address"
                  >
                    {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                  </button>
                </div>
              </div>

              {/* Sign message */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Signature Test</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={signInput}
                    onChange={(e) => setSignInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSignMessage()}
                    placeholder="Enter message to sign..."
                    className="flex-1 text-sm py-3"
                  />
                  <button
                    onClick={handleSignMessage}
                    disabled={signing || !signInput.trim()}
                    className="btn-secondary py-3 px-6 shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    {signing ? '...' : 'Sign'}
                  </button>
                </div>
              </div>
            </div>

            {signResult && (
              <div className="bg-zinc-950 rounded-xl p-4 border border-slate-200 animate-in zoom-in-95 duration-300">
                <div className="flex items-center gap-2 mb-2">
                  <Check size={14} className="text-green-500" />
                  <p className="text-xs font-bold text-green-600 uppercase tracking-widest">Cryptographic Signature Generated</p>
                </div>
                <p className="font-mono text-xs text-slate-500 break-all leading-relaxed">{signResult}</p>
              </div>
            )}
          </div>
        </section>

        <div className="grid md:grid-cols-2 gap-12">
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <Lock size={24} className="text-indigo-600" /> My Assets
              </h2>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{assets.length} Assets</span>
            </div>
            <div className="grid gap-4">
              {assets.length === 0 && (
                <div className="p-12 text-center bg-zinc-800/50 border-2 border-dashed border-slate-200 rounded-3xl">
                  <p className="text-slate-500 italic font-medium">No assets created yet.</p>
                </div>
              )}
              {assets.map((asset: Asset) => (
                <div key={asset._id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm card-hover flex justify-between items-center group">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></span>
                      {editingAssetId === asset._id ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="text"
                            value={editAssetName}
                            onChange={(e) => setEditAssetName(e.target.value)}
                            className="py-1 px-2 text-xs bg-zinc-950 border border-slate-200 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateAssetName(asset._id)}
                            autoFocus
                          />
                          <button onClick={() => handleUpdateAssetName(asset._id)} className="p-1 text-indigo-500 hover:bg-slate-700 rounded transition-colors">
                            <Check size={14} />
                          </button>
                          <button onClick={() => setEditingAssetId(null)} className="p-1 text-slate-500 hover:bg-slate-700 rounded transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group/name">
                          <p className={`font-bold text-sm uppercase tracking-widest ${asset.name ? 'text-slate-500' : 'text-slate-500 italic'}`}>
                            {asset.name || 'no asset name'}
                          </p>
                          <button 
                            onClick={() => { setEditingAssetId(asset._id); setEditAssetName(asset.name || ''); }}
                            className="p-1 text-slate-500 hover:text-indigo-400 opacity-0 group-hover/name:opacity-100 transition-all"
                          >
                            <PenLine size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xl font-bold tracking-tight">
                        {decryptedContents[asset._id] ? (
                          <span className="text-indigo-600 animate-in fade-in slide-in-from-left-2 duration-500">{decryptedContents[asset._id]}</span>
                        ) : (
                          <span className="text-slate-400 tracking-[0.3em] font-black">••••••••</span>
                        )}
                      </p>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{new Date(asset.createdAt).toLocaleDateString()}</p>
                    
                    {/* Inheritors List */}
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {asset.inheritors.length > 0 ? (
                        asset.inheritors.map(i => {
                          const inheritorUser = allUsers.find(u => u.address.toLowerCase() === i.inheritorAddress.toLowerCase());
                          const displayName = inheritorUser?.name || `${i.inheritorAddress.slice(0, 6)}...${i.inheritorAddress.slice(-4)}`;
                          
                          return (
                            <div key={i.inheritorAddress} className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-violet-800/20 rounded-full group/badge shadow-sm">
                              <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                              <span className="text-[9px] font-bold text-indigo-600 font-sans">
                                {displayName}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-full">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">No Inheritors</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleDecrypt(asset)}
                      className="p-3 bg-zinc-950 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 rounded-2xl transition-all shadow-sm active:scale-95"
                      title="Decrypt"
                    >
                      {decryptedContents[asset._id] ? <Unlock size={20} /> : <Lock size={20} />}
                    </button>
                    <button 
                      onClick={() => { setSelectedAsset(asset); setShowInheritorModal(true); }}
                      className="p-3 bg-zinc-950 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 rounded-2xl transition-all shadow-sm active:scale-95"
                      title="Assign Inheritor"
                    >
                      <Users size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <Users size={24} className="text-indigo-600" /> Inheritances
              </h2>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{sharedAssets.length} Assets</span>
            </div>
            <div className="grid gap-4">
              {sharedAssets.length === 0 && (
                <div className="p-12 text-center bg-zinc-800/50 border-2 border-dashed border-slate-200 rounded-3xl">
                  <p className="text-slate-500 italic font-medium">No shared assets assigned to you.</p>
                </div>
              )}
              {sharedAssets.map((asset: Asset) => (
                <div key={asset._id} className="bg-white/80 p-6 rounded-3xl border border-slate-200 shadow-sm card-hover flex justify-between items-center group">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      From: <span className="text-indigo-500">
                        {(() => {
                          const ownerUser = allUsers.find(u => u.address.toLowerCase() === asset.ownerAddress.toLowerCase());
                          return ownerUser?.name || `${asset.ownerAddress.slice(0, 6)}...${asset.ownerAddress.slice(-4)}`;
                        })()}
                      </span>
                    </p>
                    <p className={`text-xs font-bold uppercase tracking-widest ${asset.name ? 'text-slate-500' : 'text-slate-500 italic'}`}>
                      {asset.name || 'no asset name'}
                    </p>
                    <p className="text-xl font-bold tracking-tight">
                      {decryptedContents[asset._id] ? (
                        <span className="text-green-600 animate-in fade-in slide-in-from-left-2 duration-500">{decryptedContents[asset._id]}</span>
                      ) : (
                        <span className="text-slate-500 italic font-medium">Secure Shared Asset</span>
                      )}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleDecryptShared(asset)}
                    className="p-3 bg-zinc-950 border border-slate-200 hover:border-green-300 hover:text-green-600 rounded-2xl transition-all shadow-sm active:scale-95"
                    title="Decrypt Shared Asset"
                  >
                    {decryptedContents[asset._id] ? <Unlock size={20} /> : <Lock size={20} />}
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {showCreateModal && (
        <CreateAssetModal 
          auth={auth} 
          onClose={() => setShowCreateModal(false)} 
          onCreated={fetchAssets} 
        />
      )}

      {showInheritorModal && selectedAsset && (
        <InheritorModal 
          auth={auth} 
          asset={selectedAsset}
          onClose={() => setShowInheritorModal(false)}
          onUpdated={fetchAssets}
        />
      )}
      
      {/* Sign Prompt Overlay */}
      {showSignPrompt && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] border border-slate-200 p-10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900">Authorization</h2>
              <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">Cryptographic verification required</p>
            </div>

            {toast?.type === 'error' && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm animate-in slide-in-from-top-2">
                <p className="font-bold flex items-center gap-2">
                  <span>⚠️</span> Error
                </p>
                <p className="opacity-80">{toast.message}</p>
              </div>
            )}

            <div className="bg-zinc-950 p-6 rounded-3xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-indigo-500 font-bold">
                <PenLine size={18} />
                <span className="text-xs uppercase tracking-widest">Message to Sign</span>
              </div>
              <p className="text-sm text-slate-600 font-mono bg-white/50 p-3 rounded-xl border border-slate-200 shadow-inner italic">
                "{showSignPrompt === 'owner' ? "Keisho Symmetric Key Seed" : "Keisho Public Key Seed"}"
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                {showSignPrompt === 'owner' 
                  ? "Signing this message allows us to derive a secure, local-only encryption key for your assets."
                  : "Signing this message enables secure public key derivation to access shares granted to you."}
              </p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => { setShowSignPrompt(null); setPendingAsset(null); setToast(null); }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button 
                onClick={showSignPrompt === 'owner' ? confirmDecryptOwner : confirmDecryptShared}
                disabled={decrypting}
                className="btn-primary flex-[2] relative overflow-hidden group"
              >
                <span className={decrypting ? 'opacity-0' : 'opacity-100'}>
                  {decrypting ? 'Working...' : 'Sign & Decrypt'}
                </span>
                {decrypting && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast Notification */}
      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-4 rounded-3xl shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
          toast.type === 'success' 
            ? 'bg-white border-green-100 text-green-800' 
            : 'bg-white border-red-100 text-red-800'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
             toast.type === 'success' ? 'bg-green-100' : 'bg-red-100'
          }`}>
             {toast.type === 'success' ? '✅' : '❌'}
          </div>
          <p className="font-bold text-sm tracking-tight">{toast.message}</p>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-500 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
