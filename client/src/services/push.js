export async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push not supported');
  }

  const registration = await navigator.serviceWorker.ready;
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidKey) return null;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey)
  });

  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
      auth: arrayBufferToBase64(subscription.getKey('auth'))
    }
  };
}

export async function unsubscribeFromPush() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    return endpoint;
  }
  return null;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

function arrayBufferToBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}
