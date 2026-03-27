// End-to-End Encryption utilities using Web Crypto API

const DB_NAME = "gameswap_crypto";
const STORE_NAME = "keys";
const KEY_ID = "user_keypair";

// Open IndexedDB for secure key storage
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
};

// Generate RSA key pair for asymmetric encryption
export const generateKeyPair = async (): Promise<CryptoKeyPair> => {
  return await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
};

// Export public key to base64 string for database storage
export const exportPublicKey = async (publicKey: CryptoKey): Promise<string> => {
  const exported = await crypto.subtle.exportKey("spki", publicKey);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
};

// Import public key from base64 string
export const importPublicKey = async (publicKeyString: string): Promise<CryptoKey> => {
  const binaryString = atob(publicKeyString);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return await crypto.subtle.importKey(
    "spki",
    bytes.buffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
};

// Store key pair in IndexedDB
export const storeKeyPair = async (keyPair: CryptoKeyPair): Promise<void> => {
  const db = await openDB();
  const privateKeyExported = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  const publicKeyExported = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({
      id: KEY_ID,
      privateKey: Array.from(new Uint8Array(privateKeyExported)),
      publicKey: Array.from(new Uint8Array(publicKeyExported)),
    });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

// Retrieve key pair from IndexedDB
export const getStoredKeyPair = async (): Promise<CryptoKeyPair | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(KEY_ID);
      request.onerror = () => reject(request.error);
      request.onsuccess = async () => {
        if (!request.result) {
          resolve(null);
          return;
        }
        const { privateKey, publicKey } = request.result;
        try {
          const importedPrivateKey = await crypto.subtle.importKey(
            "pkcs8",
            new Uint8Array(privateKey).buffer,
            { name: "RSA-OAEP", hash: "SHA-256" },
            true,
            ["decrypt"]
          );
          const importedPublicKey = await crypto.subtle.importKey(
            "spki",
            new Uint8Array(publicKey).buffer,
            { name: "RSA-OAEP", hash: "SHA-256" },
            true,
            ["encrypt"]
          );
          resolve({ privateKey: importedPrivateKey, publicKey: importedPublicKey });
        } catch {
          resolve(null);
        }
      };
    });
  } catch {
    return null;
  }
};

// Generate a random AES key for message encryption
export const generateMessageKey = async (): Promise<CryptoKey> => {
  return await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
};

// Encrypt message content with AES-GCM
export const encryptMessage = async (
  message: string,
  key: CryptoKey
): Promise<{ iv: number[]; data: number[] }> => {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(message)
  );
  return {
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted)),
  };
};

// Decrypt message content with AES-GCM
export const decryptMessage = async (
  iv: number[],
  data: number[],
  key: CryptoKey
): Promise<string> => {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    new Uint8Array(data)
  );
  return new TextDecoder().decode(decrypted);
};

// Encrypt AES key with recipient's RSA public key
export const encryptKeyForRecipient = async (
  aesKey: CryptoKey,
  recipientPublicKey: CryptoKey
): Promise<string> => {
  const exportedKey = await crypto.subtle.exportKey("raw", aesKey);
  const encrypted = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    recipientPublicKey,
    exportedKey
  );
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
};

// Decrypt AES key with user's RSA private key
export const decryptKeyFromSender = async (
  encryptedKeyString: string,
  privateKey: CryptoKey
): Promise<CryptoKey> => {
  const binaryString = atob(encryptedKeyString);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const decryptedKeyData = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    bytes.buffer
  );
  return await crypto.subtle.importKey(
    "raw",
    decryptedKeyData,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
};
