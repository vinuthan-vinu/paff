import { useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import toast from 'react-hot-toast';

const WS_URL = 'http://localhost:8080/ws';

export function useUserNotifications(user, onNotificationReceived) {
  useEffect(() => {
    if (!user) return undefined;

    let subscription;
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 5000,
      onConnect: () => {
        subscription = client.subscribe(`/topic/notifications.${user.id}`, (message) => {
          if (message.body) {
            const notification = JSON.parse(message.body);
            toast.success(`New Notification: ${notification.title}`, {
              duration: 5000,
              icon: '🔔',
            });
            onNotificationReceived?.(notification);
          }
        });
      },
    });

    client.activate();

    return () => {
      subscription?.unsubscribe();
      client.deactivate();
    };
  }, [user]);
}
