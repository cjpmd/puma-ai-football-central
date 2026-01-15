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

// Create VAPID JWT token - RFC 8291 compliant
async function createVapidJwt(
  audience: string,
  subject: string,
  vapidPrivateKey: string,
  vapidPublicKey: string
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

  // Get public key bytes to extract x, y coordinates
  const publicKeyBytes = base64UrlDecode(vapidPublicKey);
  
  // Import the private key for signing
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      d: vapidPrivateKey,
      x: base64UrlEncode(publicKeyBytes.slice(1, 33)),
      y: base64UrlEncode(publicKeyBytes.slice(33, 65)),
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  // Sign the token
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    stringToUint8Array(unsignedToken)
  );

  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  
  console.log('[Push] VAPID JWT created successfully');
  return `${unsignedToken}.${signatureB64}`;
}

// RFC 5869 HKDF - Extract then Expand (critical for iOS compatibility)
async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  // Step 1: Extract - PRK = HMAC(salt, IKM)
  const saltKeyBytes = salt.length > 0 ? salt : new Uint8Array(32);
  const saltKey = await crypto.subtle.importKey(
    'raw',
    saltKeyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const prk = new Uint8Array(
    await crypto.subtle.sign('HMAC', saltKey, ikm)
  );

  // Step 2: Expand - OKM = T(1) || T(2) || ...
  const prkKey = await crypto.subtle.importKey(
    'raw',
    prk,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const hashLen = 32;
  const n = Math.ceil(length / hashLen);
  let t = new Uint8Array(0);
  const okm = new Uint8Array(n * hashLen);

  for (let i = 0; i < n; i++) {
    const input = new Uint8Array(t.length + info.length + 1);
    input.set(t, 0);
    input.set(info, t.length);
    input[input.length - 1] = i + 1;

    t = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, input));
    okm.set(t, i * hashLen);
  }

  return okm.slice(0, length);
}

// RFC 8291 compliant encryption for Web Push
async function encryptPayload(
  payload: string,
  p256dhBase64: string,
  authBase64: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  // Decode subscriber's public key and auth secret
  const subscriberPublicKeyBytes = base64UrlDecode(p256dhBase64);
  const authSecret = base64UrlDecode(authBase64);

  // Generate local (server) key pair for ECDH
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Export local public key in uncompressed format (65 bytes)
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

  // RFC 8291: IKM derivation
  // key_info = "WebPush: info" || 0x00 || ua_public || as_public
  const webPushInfo = stringToUint8Array('WebPush: info\0');
  const keyInfo = concatUint8Arrays(
    webPushInfo,
    subscriberPublicKeyBytes,
    localPublicKey
  );

  // Derive IKM using auth secret as salt
  const ikm = await hkdf(authSecret, sharedSecret, keyInfo, 32);

  // RFC 8291: CEK and nonce derivation (simple info, NO context for aes128gcm)
  const cekInfo = stringToUint8Array('Content-Encoding: aes128gcm\0');
  const contentEncryptionKey = await hkdf(salt, ikm, cekInfo, 16);

  const nonceInfo = stringToUint8Array('Content-Encoding: nonce\0');
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);

  // Pad the payload: payload || 0x02 (delimiter)
  const payloadBytes = stringToUint8Array(payload);
  const paddedPayload = concatUint8Arrays(payloadBytes, new Uint8Array([2]));

  // Import CEK for AES-GCM
  const aesKey = await crypto.subtle.importKey(
    'raw',
    contentEncryptionKey,
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

// Build aes128gcm encrypted body (RFC 8188)
function buildEncryptedBody(
  encrypted: Uint8Array,
  salt: Uint8Array,
  localPublicKey: Uint8Array
): Uint8Array {
  // aes128gcm format:
  // salt (16 bytes) || rs (4 bytes, record size) || idlen (1 byte) || keyid (idlen bytes) || encrypted data
  const recordSize = 4096;
  const result = new Uint8Array(16 + 4 + 1 + localPublicKey.length + encrypted.length);
  let offset = 0;

  // Salt (16 bytes)
  result.set(salt, offset);
  offset += 16;

  // Record size (4 bytes, big-endian)
  result[offset++] = (recordSize >>> 24) & 0xff;
  result[offset++] = (recordSize >>> 16) & 0xff;
  result[offset++] = (recordSize >>> 8) & 0xff;
  result[offset++] = recordSize & 0xff;

  // Key ID length (1 byte) + Key ID (server public key)
  result[offset++] = localPublicKey.length;
  result.set(localPublicKey, offset);
  offset += localPublicKey.length;

  // Encrypted data
  result.set(encrypted, offset);

  return result;
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

// Send Web Push notification with RFC 8291 compliant encryption
async function sendWebPushNotification(
  subscription: WebPushSubscription,
  title: string,
  body: string,
  eventId: string | undefined,
  vapidPrivateKey: string,
  vapidPublicKey: string
): Promise<{ success: boolean; error?: string; statusCode?: number }> {
  try {
    console.log('[Push] Sending Web Push to:', subscription.endpoint);
    
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

    // Encrypt the payload using RFC 8291 compliant encryption
    const { encrypted, salt, localPublicKey } = await encryptPayload(
      payload,
      subscription.keys.p256dh,
      subscription.keys.auth
    );
    
    const encryptedBody = buildEncryptedBody(encrypted, salt, localPublicKey);
    console.log('[Push] Encrypted body size:', encryptedBody.length);

    // Create VAPID JWT
    const audience = new URL(subscription.endpoint).origin;
    const subject = 'mailto:admin@puma-ai.com';
    
    let jwt: string;
    try {
      jwt = await createVapidJwt(audience, subject, vapidPrivateKey, vapidPublicKey);
      console.log('[Push] VAPID JWT created successfully');
    } catch (jwtError) {
      console.error('[Push] VAPID JWT creation failed:', jwtError);
      return { success: false, error: `JWT creation failed: ${jwtError}` };
    }

    // Convert to ArrayBuffer properly for fetch body
    const bodyBuffer = encryptedBody.buffer.slice(
      encryptedBody.byteOffset,
      encryptedBody.byteOffset + encryptedBody.byteLength
    );

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'Content-Length': encryptedBody.length.toString(),
      'TTL': '86400',
      'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
    };

    console.log('[Push] Sending to push service...');

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: headers,
      body: bodyBuffer
    });

    const statusCode = response.status;
    console.log('[Push] Push service response:', statusCode);

    if (statusCode === 201) {
      console.log('[Push] Web Push sent successfully');
      return { success: true, statusCode };
    } else {
      const errorText = await response.text();
      console.error('[Push] Push service error:', statusCode, errorText);
      return { success: false, error: `Push service ${statusCode}: ${errorText}`, statusCode };
    }
  } catch (error) {
    console.error('[Push] Web Push exception:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[Push] Push notification function invoked');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { eventId, title, body, userIds }: NotificationPayload = await req.json()
    console.log('[Push] Notification request:', { eventId, title, userIds: userIds?.length || 0 });

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
      console.log('[Push] No users to notify');
      return new Response(
        JSON.stringify({ success: true, message: 'No users to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[Push] Target user IDs:', targetUserIds);

    // Get push tokens for target users
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, push_token, name')
      .in('id', targetUserIds)
      .not('push_token', 'is', null)

    if (profilesError) {
      console.error('[Push] Error fetching profiles:', profilesError);
    }

    if (!profiles || profiles.length === 0) {
      console.log('[Push] No push tokens found for users');
      return new Response(
        JSON.stringify({ success: true, message: 'No push tokens found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[Push] Found profiles with push tokens:', profiles.length);

    // Get environment variables
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY')
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')

    console.log('[Push] VAPID keys configured:', !!vapidPublicKey && !!vapidPrivateKey);
    console.log('[Push] FCM key configured:', !!fcmServerKey);

    const notifications = profiles.map(async (profile) => {
      let success = false;
      let method = 'unknown';
      let errorMessage: string | undefined;
      let statusCode: number | undefined;

      const pushToken = profile.push_token;
      console.log(`[Push] Processing token for user ${profile.id}:`, pushToken?.substring(0, 30) + '...');

      // Check token type and send appropriate notification
      if (pushToken?.startsWith('webpush:')) {
        // Web Push subscription
        method = 'web_push';
        
        if (vapidPublicKey && vapidPrivateKey) {
          try {
            const subscriptionJson = pushToken.substring(8); // Remove "webpush:" prefix
            const subscription: WebPushSubscription = JSON.parse(subscriptionJson);
            console.log('[Push] Sending Web Push to user:', profile.id);
            
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
            console.error('[Push] Failed to parse Web Push subscription:', e);
            errorMessage = `Parse error: ${e}`;
          }
        } else {
          console.log('[Push] VAPID keys not configured for Web Push');
          errorMessage = 'VAPID keys not configured';
        }
      } else if (pushToken?.startsWith('native_ios:')) {
        // Native iOS token (APNs via FCM)
        method = 'fcm_ios';
        const deviceToken = pushToken.substring(11); // Remove "native_ios:" prefix
        console.log('[Push] Sending FCM to iOS device for user:', profile.id);
        
        if (fcmServerKey) {
          const result = await sendFCMNotification(deviceToken, title, body, eventId, fcmServerKey);
          success = result.success;
          errorMessage = result.error;
        } else {
          errorMessage = 'FCM key not configured for iOS native';
        }
      } else if (pushToken?.startsWith('native_android:')) {
        // Native Android token (FCM)
        method = 'fcm_android';
        const deviceToken = pushToken.substring(15); // Remove "native_android:" prefix
        console.log('[Push] Sending FCM to Android device for user:', profile.id);
        
        if (fcmServerKey) {
          const result = await sendFCMNotification(deviceToken, title, body, eventId, fcmServerKey);
          success = result.success;
          errorMessage = result.error;
        } else {
          errorMessage = 'FCM key not configured for Android native';
        }
      } else if (pushToken && fcmServerKey) {
        // Legacy: raw FCM token (Capacitor/native without prefix)
        method = 'fcm_legacy';
        console.log('[Push] Sending FCM (legacy format) to user:', profile.id);
        const result = await sendFCMNotification(pushToken, title, body, eventId, fcmServerKey);
        success = result.success;
        errorMessage = result.error;
      } else if (!fcmServerKey && pushToken) {
        errorMessage = 'FCM key not configured';
      } else {
        errorMessage = 'Unknown token format';
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
        console.error('[Push] Failed to log notification:', logError);
      }

      return { userId: profile.id, success, method, error: errorMessage, statusCode };
    })

    const results = await Promise.allSettled(notifications)
    const fulfilled = results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<any>[];
    const successCount = fulfilled.filter(r => r.value.success).length;

    console.log(`[Push] Push notifications sent: ${successCount}/${profiles.length}`);
    console.log('[Push] Results:', fulfilled.map(r => r.value));

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
    console.error('[Push] Error sending push notifications:', error)
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
