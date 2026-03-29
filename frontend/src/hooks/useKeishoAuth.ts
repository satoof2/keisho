import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { SiweMessage } from 'siwe';

const API_URL = import.meta.env.VITE_API_URL;

export function useKeishoAuth() {
  const { login, logout, authenticated, user, signMessage, ready: privyReady } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const [token, setToken] = useState<string | null>(localStorage.getItem('keisho_token'));
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = privyReady && walletsReady;

  useEffect(() => {
    if (authenticated && wallets && wallets.length > 0 && !token && !loading && !error) {
      handleSiwe();
    }
  }, [authenticated, wallets, token, loading, error]);

  useEffect(() => {
    if (token && !isRegistered && !error) {
      checkRegistration();
    }
  }, [token]);

  const checkRegistration = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setIsRegistered(true);
      } else if (res.status === 401) {
        handleLogout();
      } else if (res.status !== 404) {
        const data = await res.json().catch(() => ({}));
        setError(`ご登録状況の確認に失敗しました。 (Status: ${res.status}${data.message ? `, Error: ${data.message}` : ''})`);
      }
    } catch (e) {
      setError(`サーバーとの通信に失敗しました。 (${e instanceof Error ? e.message : 'Unknown error'})`);
    } finally {
      setLoading(false);
    }
  };

  const handleSiwe = async () => {
    try {
      setLoading(true);
      setError(null);
      const wallet = wallets?.[0];
      if (!wallet) {
        throw new Error('No wallet available');
      }
      const provider = await wallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider as any);
      const signer = await ethersProvider.getSigner();
      const address = await signer.getAddress();
      const network = await ethersProvider.getNetwork();

      // 1. Get nonce
      const nonceRes = await fetch(`${API_URL}/auth/nonce`);
      if (!nonceRes.ok) {
        const data = await nonceRes.json().catch(() => ({}));
        throw new Error(`Failed to fetch nonce (Status: ${nonceRes.status}${data.message ? `, Error: ${data.message}` : ''})`);
      }
      const nonce = await nonceRes.text();

      // 2. Create SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to Keisho',
        uri: window.location.origin,
        version: '1',
        chainId: Number(network.chainId),
        nonce,
      });

      const signatureResult = await signMessage({ 
        message: message.prepareMessage()
      });
      const signature = signatureResult.signature;

      // 3. Verify
      const verifyRes = await fetch(`${API_URL}/auth/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, signature }),
      });
      if (!verifyRes.ok) {
        const data = await verifyRes.json().catch(() => ({}));
        throw new Error(`Verification failed (Status: ${verifyRes.status}${data.message ? `, Error: ${data.message}` : ''})`);
      }

      const data = await verifyRes.json();
      if (data.token) {
        setToken(data.token);
        setIsRegistered(data.isRegistered);
        localStorage.setItem('keisho_token', data.token);
      }
    } catch (e) {
      console.error('SIWE error:', e);
      setError(`ログイン処理中にエラーが発生しました。 (${e instanceof Error ? e.message : 'Unknown error'})`);
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, publicKey: string) => {
    try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, publicKey })
        });
        if (res.ok) {
            setIsRegistered(true);
        } else {
            const data = await res.json().catch(() => ({}));
            setError(`プロフィールの登録に失敗しました。 (Status: ${res.status}${data.message ? `, Error: ${data.message}` : ''})`);
        }
    } catch (error) {
        console.error('Registration error:', error);
        setError(`サーバーとの通信に失敗しました。 (${error instanceof Error ? error.message : 'Unknown error'})`);
    } finally {
        setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setToken(null);
    setIsRegistered(false);
    setError(null);
    localStorage.removeItem('keisho_token');
  };

  return {
    login,
    logout: handleLogout,
    authenticated,
    user,
    token,
    isRegistered,
    loading: loading || !ready,
    error,
    setError,
    clearError: () => setError(null),
    register,
    wallets,
    signMessage,
    ready
  };
}
