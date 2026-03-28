import { ethers } from 'ethers';

// Helper to convert ArrayBuffer to hex string
export function bufToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper to convert hex string to Uint8Array
export function hexToBuf(hex: string): Uint8Array {
  return new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
}

export async function deriveSymmetricKey(signature: string): Promise<CryptoKey> {
  const hash = ethers.sha256(ethers.toUtf8Bytes(signature));
  const keyBuf = hexToBuf(hash.slice(2)); // remove 0x

  return await window.crypto.subtle.importKey(
    'raw',
    keyBuf as any,
    'AES-GCM',
    false,
    ['encrypt', 'decrypt']
  );
}

export async function deriveAsymmetricKeypair(signature: string): Promise<CryptoKey> {
  const hash = ethers.sha256(ethers.toUtf8Bytes(signature));
  const keyBuf = hexToBuf(hash.slice(2));

  return await window.crypto.subtle.importKey(
    'raw',
    keyBuf as any,
    'AES-GCM',
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptAsset(content: string, symmetricKey: CryptoKey) {
  const encodedContent = new TextEncoder().encode(content);
  
  // 1. Generate a random DEK (AES-GCM 256)
  const dek = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const rawDek = await window.crypto.subtle.exportKey('raw', dek);

  // 2. Encrypt content with DEK
  const contentIv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedContentBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: contentIv as any },
    dek,
    encodedContent as any
  );

  // 3. Encrypt DEK with owner's symmetric key
  const dekIv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedDekBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: dekIv as any },
    symmetricKey,
    rawDek as any
  );

  return {
    encryptedContent: bufToHex(contentIv) + ':' + bufToHex(encryptedContentBuffer),
    encryptedDEK: bufToHex(dekIv) + ':' + bufToHex(encryptedDekBuffer)
  };
}

export async function decryptAssetWithOwnerKey(
  encryptedContent: string, 
  encryptedDEK: string, 
  symmetricKey: CryptoKey
): Promise<string> {
  // 1. Decrypt DEK
  const [dekIvHex, dekCipherHex] = encryptedDEK.split(':');
  const dekIv = hexToBuf(dekIvHex);
  const dekCipher = hexToBuf(dekCipherHex);
  
  const rawDek = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: dekIv as any },
    symmetricKey,
    dekCipher as any
  );

  const dek = await window.crypto.subtle.importKey(
    'raw',
    rawDek as any,
    'AES-GCM',
    false,
    ['decrypt']
  );

  // 2. Decrypt Content
  const [contentIvHex, contentCipherHex] = encryptedContent.split(':');
  const contentIv = hexToBuf(contentIvHex);
  const contentCipher = hexToBuf(contentCipherHex);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: contentIv as any },
    dek,
    contentCipher as any
  );

  return new TextDecoder().decode(decryptedBuffer);
}

// Public Key according to spec: hash(sign("Keisho Public Key Seed"))
export async function deriveKeishoPublicKey(signature: string): Promise<string> {
    return ethers.sha256(ethers.toUtf8Bytes(signature));
}
