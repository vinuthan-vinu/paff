import { useEffect, useEffectEvent } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WS_URL = 'http://localhost:8080/ws';

export function useAdminRealtimeRefresh(onRefresh, enabled = true) {
  const handleRefresh = useEffectEvent(() => {
    onRefresh?.();
  });

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let subscription;
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 5000,
      onConnect: () => {
        subscription = client.subscribe('/topic/admin-updates', () => {
          handleRefresh();
        });
      },
    });

    client.activate();

    return () => {
      subscription?.unsubscribe();
      client.deactivate();
    };
  }, [enabled]);
}
