import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  storeKeyPair,
  getStoredKeyPair,
  generateMessageKey,
  encryptMessage,
  decryptMessage,
  encryptKeyForRecipient,
  decryptKeyFromSender,
} from "@/lib/crypto";

interface EncryptedMessage {
  iv: number[];
  data: number[];
}

export const useEncryption = () => {
  const { user } = useAuth();
  const [keyPair, setKeyPair] = useState<CryptoKeyPair | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [publicKeysCache, setPublicKeysCache] = useState<Map<string, CryptoKey>>(new Map());

  // Initialize encryption keys
  useEffect(() => {
    const initializeKeys = async () => {
      if (!user) return;

      try {
        // Try to get existing key pair from IndexedDB
        let storedKeyPair = await getStoredKeyPair();

        if (!storedKeyPair) {
          // Generate new key pair
          storedKeyPair = await generateKeyPair();
          await storeKeyPair(storedKeyPair);
        }

        setKeyPair(storedKeyPair);

        // Export and store public key in database if not already stored
        const publicKeyString = await exportPublicKey(storedKeyPair.publicKey);
        
        // Check if public key is already in database
        const { data: profile } = await supabase
          .from("profiles")
          .select("public_key")
          .eq("user_id", user.id)
          .single();

        if (!profile?.public_key || profile.public_key !== publicKeyString) {
          await supabase
            .from("profiles")
            .update({ public_key: publicKeyString })
            .eq("user_id", user.id);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to initialize encryption:", error);
        setIsInitialized(true); // Continue without encryption
      }
    };

    initializeKeys();
  }, [user]);

  // Get recipient's public key
  const getRecipientPublicKey = useCallback(async (userId: string): Promise<CryptoKey | null> => {
    // Check cache first
    if (publicKeysCache.has(userId)) {
      return publicKeysCache.get(userId)!;
    }

    try {
      const { data } = await supabase.rpc("get_public_profile", { target_user_id: userId }) as { 
        data: { public_key: string | null }[] | null 
      };
      const profile = data?.[0];
      
      if (!profile?.public_key) {
        return null;
      }

      const publicKey = await importPublicKey(profile.public_key);
      setPublicKeysCache((prev) => new Map(prev).set(userId, publicKey));
      return publicKey;
    } catch (error) {
      console.error("Failed to get recipient public key:", error);
      return null;
    }
  }, [publicKeysCache]);

  // Encrypt a message for multiple recipients
  const encryptForRecipients = useCallback(async (
    message: string,
    recipientIds: string[]
  ): Promise<{ encrypted: EncryptedMessage; encryptedKeys: Record<string, string> } | null> => {
    if (!keyPair) return null;

    try {
      // Generate a symmetric key for this message
      const messageKey = await generateMessageKey();

      // Encrypt the message content
      const encrypted = await encryptMessage(message, messageKey);

      // Encrypt the message key for each recipient
      const encryptedKeys: Record<string, string> = {};

      for (const recipientId of recipientIds) {
        const recipientPublicKey = await getRecipientPublicKey(recipientId);
        if (recipientPublicKey) {
          encryptedKeys[recipientId] = await encryptKeyForRecipient(messageKey, recipientPublicKey);
        }
      }

      // Also encrypt for sender (so they can read their own messages)
      if (user && !encryptedKeys[user.id]) {
        encryptedKeys[user.id] = await encryptKeyForRecipient(messageKey, keyPair.publicKey);
      }

      return { encrypted, encryptedKeys };
    } catch (error) {
      console.error("Encryption failed:", error);
      return null;
    }
  }, [keyPair, getRecipientPublicKey, user]);

  // Decrypt a message
  const decryptMessageContent = useCallback(async (
    encrypted: EncryptedMessage,
    encryptedKeys: Record<string, string>
  ): Promise<string | null> => {
    if (!keyPair || !user) return null;

    try {
      const encryptedKey = encryptedKeys[user.id];
      if (!encryptedKey) {
        return null; // User doesn't have access to this message
      }

      const messageKey = await decryptKeyFromSender(encryptedKey, keyPair.privateKey);
      return await decryptMessage(encrypted.iv, encrypted.data, messageKey);
    } catch (error) {
      console.error("Decryption failed:", error);
      return null;
    }
  }, [keyPair, user]);

  return {
    isInitialized,
    hasEncryption: !!keyPair,
    encryptForRecipients,
    decryptMessageContent,
    getRecipientPublicKey,
  };
};
