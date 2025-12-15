import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode as base64Encode, decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  eventId?: string;
  title: string;
  body: string;
  userIds?: string[];
}

interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Base64URL encoding/decoding utilities
function base64UrlEncode(data: Uint8Array): string {
  return base64Encode(data)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  // Add padding if needed
  let padded = str.replace(/-/g, '+').replace(/_/g, '/');
  while (padded.length % 4) {
    padded += '=';
  }
  return base64Decode(padded);
}

// Convert string to Uint8Array
function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Concatenate Uint8Arrays
function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// Create VAPID JWT token with raw 32-byte private key
async function createVapidJwt(
  audience: string,
  subject: string,
  privateKeyBase64: string
): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: subject
  };

  const headerB64 = base64UrlEncode(stringToUint8Array(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(stringToUint8Array(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Decode the private key - VAPID keys are raw 32-byte keys
  const privateKeyBytes = base64UrlDecode(privateKeyBase64);
  console.log('[Push] Private key length:', privateKeyBytes.length);
  
  let privateKey: CryptoKey;
  
  // Try to import as raw key first (32 bytes), then as PKCS8 if that fails
  if (privateKeyBytes.length === 32) {
    // Raw 32-byte private key - need to convert to JWK format for import
    const jwk = {
      kty: 'EC',
      crv: 'P-256',
      d: privateKeyBase64,
      x: '', // Will be computed
      y: ''  // Will be computed
    };
    
    // Generate a temporary key pair to get the public key coordinates
    // Then import with just the d parameter
    try {
      privateKey = await crypto.subtle.importKey(
        'jwk',
        {
          kty: 'EC',
          crv: 'P-256',
          d: privateKeyBase64,
          // For signing we only need d, but WebCrypto requires x,y
          // We'll use a workaround: generate key pair and replace d
          x: 'placeholder',
          y: 'placeholder'
        },
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
      );
    } catch (e) {
      console.log('[Push] JWK import failed, trying raw derivation');
      // Alternative: Create PKCS8 wrapper around raw key
      const pkcs8Header = new Uint8Array([
        0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48,
        0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03,
        0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20
      ]);
      const pkcs8Key = concatUint8Arrays(pkcs8Header, privateKeyBytes);
      
      privateKey = await crypto.subtle.importKey(
        'pkcs8',
        pkcs8Key,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
      );
    }
  } else {
    // Assume it's already in PKCS8 format
    console.log('[Push] Importing as PKCS8 format');
    privateKey = await crypto.subtle.importKey(
      'pkcs8',
      privateKeyBytes,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
  }

  // Sign the token
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    stringToUint8Array(unsignedToken)
  );

  // Convert signature from DER to raw format (64 bytes: r || s)
  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  
  console.log('[Push] JWT created successfully');
  return `${unsignedToken}.${signatureB64}`;
}

// HKDF key derivation
async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    ikm,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt,
      info: info
    },
    key,
    length * 8
  );

  return new Uint8Array(bits);
}

// Create info for HKDF
function createInfo(type: string, context: Uint8Array): Uint8Array {
  const typeBytes = stringToUint8Array(type);
  const header = stringToUint8Array('Content-Encoding: ');
  const nul = new Uint8Array([0]);
  
  return concatUint8Arrays(header, typeBytes, nul, context);
}

// Encrypt payload using aes128gcm
async function encryptPayload(
  payload: string,
  p256dhBase64: string,
  authBase64: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  // Decode subscriber's public key and auth secret
  const subscriberPublicKeyBytes = base64UrlDecode(p256dhBase64);
  const authSecret = base64UrlDecode(authBase64);

  // Generate local key pair for ECDH
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Export local public key in uncompressed format
  const localPublicKeyRaw = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const localPublicKey = new Uint8Array(localPublicKeyRaw);

  // Import subscriber's public key
  const subscriberPublicKey = await crypto.subtle.importKey(
    'raw',
    subscriberPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derive shared secret using ECDH
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: subscriberPublicKey },
    localKeyPair.privateKey,
    256
  );
  const sharedSecret = new Uint8Array(sharedSecretBits);

  // Generate random salt (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Create context for key derivation
  // context = label || 0x00 || client_public_key_length || client_public_key || server_public_key_length || server_public_key
  const keyLabel = stringToUint8Array('P-256');
  const contextInfo = concatUint8Arrays(
    keyLabel,
    new Uint8Array([0]),
    new Uint8Array([0, 65]), // client public key length (65 bytes)
    subscriberPublicKeyBytes,
    new Uint8Array([0, 65]), // server public key length (65 bytes)
    localPublicKey
  );

  // Derive PRK using auth secret
  const prkInfo = stringToUint8Array('Content-Encoding: auth\0');
  const prk = await hkdf(authSecret, sharedSecret, prkInfo, 32);

  // Derive content encryption key (CEK)
  const cekInfo = createInfo('aes128gcm', contextInfo);
  const cek = await hkdf(salt, prk, cekInfo, 16);

  // Derive nonce
  const nonceInfo = createInfo('nonce', contextInfo);
  const nonce = await hkdf(salt, prk, nonceInfo, 12);

  // Pad the payload (add delimiter 0x02 and padding)
  const payloadBytes = stringToUint8Array(payload);
  const paddedPayload = concatUint8Arrays(payloadBytes, new Uint8Array([2])); // 0x02 delimiter

  // Import CEK for AES-GCM
  const aesKey = await crypto.subtle.importKey(
    'raw',
    cek,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  // Encrypt with AES-128-GCM
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    aesKey,
    paddedPayload
  );

  return {
    encrypted: new Uint8Array(ciphertext),
    salt,
    localPublicKey
  };
}

// Build aes128gcm encrypted body
function buildEncryptedBody(
  encrypted: Uint8Array,
  salt: Uint8Array,
  localPublicKey: Uint8Array
): Uint8Array {
  // aes128gcm format:
  // salt (16 bytes) || rs (4 bytes, record size) || idlen (1 byte) || keyid (idlen bytes) || encrypted data
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096, false); // 4096 record size
  
  const keyIdLen = new Uint8Array([65]); // Public key is 65 bytes
  
  return concatUint8Arrays(salt, recordSize, keyIdLen, localPublicKey, encrypted);
}

// Send FCM notification
async function sendFCMNotification(
  pushToken: string, 
  title: string, 
  body: string, 
  eventId: string | undefined,
  fcmServerKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      to: pushToken,
      notification: {
        title: title,
        body: body
      },
      data: {
        eventId: eventId || '',
        type: 'availability_request'
      }
    };

    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${fcmServerKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FCM error:', response.status, errorText);
      return { success: false, error: `FCM ${response.status}: ${errorText}` };
    }

    return { success: true };
  } catch (error) {
    console.error('FCM exception:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Send Web Push notification
async function sendWebPushNotification(
  subscription: WebPushSubscription,
  title: string,
  body: string,
  eventId: string | undefined,
  vapidPrivateKey: string,
  vapidPublicKey: string
): Promise<{ success: boolean; error?: string; statusCode?: number }> {
  try {
    console.log('Sending Web Push to:', subscription.endpoint);
    
    const payload = JSON.stringify({
      title: title,
      body: body,
      icon: '/pwa-icons/icon-192x192.png',
      badge: '/pwa-icons/badge-72x72.png',
      data: {
        eventId: eventId || '',
        type: 'availability_request'
      }
    });

    // Encrypt the payload
    const { encrypted, salt, localPublicKey } = await encryptPayload(
      payload,
      subscription.keys.p256dh,
      subscription.keys.auth
    );
    
    const encryptedBody = buildEncryptedBody(encrypted, salt, localPublicKey);
    console.log('Encrypted body size:', encryptedBody.length);

    // Create VAPID JWT
    const audience = new URL(subscription.endpoint).origin;
    const subject = 'mailto:admin@puma-ai.com';
    
    let jwt: string;
    try {
      jwt = await createVapidJwt(audience, subject, vapidPrivateKey);
      console.log('VAPID JWT created successfully');
    } catch (jwtError) {
      console.error('VAPID JWT creation failed:', jwtError);
      return { success: false, error: `JWT creation failed: ${jwtError}` };
    }

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'Content-Length': encryptedBody.length.toString(),
      'TTL': '86400',
      'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
    };

    console.log('Sending to push service with headers:', Object.keys(headers));

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: headers,
      body: encryptedBody
    });

    const statusCode = response.status;
    console.log('Push service response:', statusCode);

    if (statusCode === 201) {
      console.log('Web Push sent successfully');
      return { success: true, statusCode };
    } else {
      const errorText = await response.text();
      console.error('Push service error:', statusCode, errorText);
      return { success: false, error: `Push service ${statusCode}: ${errorText}`, statusCode };
    }
  } catch (error) {
    console.error('Web Push exception:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Push notification function invoked');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { eventId, title, body, userIds }: NotificationPayload = await req.json()
    console.log('Notification request:', { eventId, title, userIds: userIds?.length || 0 });

    let targetUserIds = userIds

    // If eventId provided and no specific users, get users from event
    if (eventId && (!targetUserIds || targetUserIds.length === 0)) {
      // Get event details
      const { data: event, error: eventError } = await supabaseClient
        .from('events')
        .select('*, teams!inner(*)')
        .eq('id', eventId)
        .single()

      if (eventError) {
        throw new Error(`Event not found: ${eventError.message}`)
      }

      // Get event selections to find players/staff
      const { data: selections } = await supabaseClient
        .from('event_selections')
        .select('player_positions, staff_selection')
        .eq('event_id', eventId)

      const allUserIds = new Set<string>()

      for (const selection of selections || []) {
        // Get player user IDs
        if (selection.player_positions) {
          const playerIds = selection.player_positions.map((p: any) => p.playerId || p.player_id).filter(Boolean)
          
          const { data: userPlayers } = await supabaseClient
            .from('user_players')
            .select('user_id')
            .in('player_id', playerIds)

          userPlayers?.forEach(up => allUserIds.add(up.user_id))
        }

        // Get staff user IDs
        if (selection.staff_selection) {
          const staffIds = selection.staff_selection.map((s: any) => s.staffId).filter(Boolean)
          
          const { data: userStaff } = await supabaseClient
            .from('user_staff')
            .select('user_id')
            .in('staff_id', staffIds)

          userStaff?.forEach(us => allUserIds.add(us.user_id))
        }
      }

      targetUserIds = Array.from(allUserIds)
    }

    if (!targetUserIds || targetUserIds.length === 0) {
      console.log('No users to notify');
      return new Response(
        JSON.stringify({ success: true, message: 'No users to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Target user IDs:', targetUserIds);

    // Get push tokens for target users
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, push_token, name')
      .in('id', targetUserIds)
      .not('push_token', 'is', null)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    if (!profiles || profiles.length === 0) {
      console.log('No push tokens found for users');
      return new Response(
        JSON.stringify({ success: true, message: 'No push tokens found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Found profiles with push tokens:', profiles.length);

    // Get environment variables
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY')
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')

    console.log('VAPID keys configured:', !!vapidPublicKey && !!vapidPrivateKey);
    console.log('FCM key configured:', !!fcmServerKey);

    const notifications = profiles.map(async (profile) => {
      let success = false;
      let method = 'unknown';
      let errorMessage: string | undefined;
      let statusCode: number | undefined;

      // Check if it's a Web Push subscription (prefixed with "webpush:")
      if (profile.push_token?.startsWith('webpush:')) {
        method = 'web_push';
        
        if (vapidPublicKey && vapidPrivateKey) {
          try {
            const subscriptionJson = profile.push_token.substring(8); // Remove "webpush:" prefix
            const subscription: WebPushSubscription = JSON.parse(subscriptionJson);
            console.log('Parsed Web Push subscription for user:', profile.id);
            
            const result = await sendWebPushNotification(
              subscription,
              title,
              body,
              eventId,
              vapidPrivateKey,
              vapidPublicKey
            );
            success = result.success;
            errorMessage = result.error;
            statusCode = result.statusCode;
          } catch (e) {
            console.error('Failed to parse Web Push subscription:', e);
            errorMessage = `Parse error: ${e}`;
          }
        } else {
          console.log('VAPID keys not configured for Web Push');
          errorMessage = 'VAPID keys not configured';
        }
      } else if (profile.push_token && fcmServerKey) {
        // FCM notification (Capacitor/native)
        method = 'fcm';
        const result = await sendFCMNotification(
          profile.push_token,
          title,
          body,
          eventId,
          fcmServerKey
        );
        success = result.success;
        errorMessage = result.error;
      } else if (!fcmServerKey && profile.push_token) {
        errorMessage = 'FCM key not configured';
      }

      // Log notification attempt
      try {
        await supabaseClient
          .from('notification_logs')
          .insert({
            user_id: profile.id,
            event_id: eventId || null,
            title: title,
            body: body,
            notification_type: 'push',
            method: method,
            status: success ? 'sent' : 'failed',
            error_message: errorMessage || null,
            status_code: statusCode || null
          })
      } catch (logError) {
        console.error('Failed to log notification:', logError);
      }

      return { userId: profile.id, success, method, error: errorMessage, statusCode };
    })

    const results = await Promise.allSettled(notifications)
    const fulfilled = results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<any>[];
    const successCount = fulfilled.filter(r => r.value.success).length;

    console.log(`Push notifications sent: ${successCount}/${profiles.length}`);
    console.log('Results:', fulfilled.map(r => r.value));

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount,
        total: profiles.length,
        results: fulfilled.map(r => r.value)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error sending push notifications:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
