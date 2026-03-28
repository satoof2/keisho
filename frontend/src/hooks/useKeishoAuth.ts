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

  const ready = privyReady && walletsReady;

  useEffect(() => {
    if (authenticated && wallets && wallets.length > 0 && !token && !loading) {
      handleSiwe();
    }
  }, [authenticated, wallets, token, loading]);

  useEffect(() => {
    if (token && !isRegistered) {
      checkRegistration();
    }
  }, [token]);

  const checkRegistration = async () => {
    try {
      const res = await fetch(`${API_URL}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setIsRegistered(true);
      }
    } catch (e) {
      // Not registered or token invalid
    }
  };

  const handleSiwe = async () => {
    try {
      setLoading(true);
      const wallet = wallets?.[0];
      if (!wallet) {
        console.warn('SIWE: No wallet available');
        return;
      }
      const provider = await wallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider as any);
      const signer = await ethersProvider.getSigner();
      const address = await signer.getAddress();
      const network = await ethersProvider.getNetwork();

      // 1. Get nonce
      const nonceRes = await fetch(`${API_URL}/auth/nonce`);
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

      const data = await verifyRes.json();
      if (data.token) {
        setToken(data.token);
        setIsRegistered(data.isRegistered);
        localStorage.setItem('keisho_token', data.token);
      }
    } catch (error) {
      console.error('SIWE error:', error);
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, publicKey: string) => {
    try {
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
        }
    } catch (error) {
        console.error('Registration error:', error);
    }
  };

  const handleLogout = () => {
    logout();
    setToken(null);
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
    register,
    wallets,
    signMessage,
    ready
  };
}
