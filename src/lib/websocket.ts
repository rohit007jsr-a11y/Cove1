/**
 * Real-Time WebSocket Client Service for Cove 1:1 WhatsApp Messaging
 * Handles auto-reconnection, online presence, typing indicators, read receipts, and offline sync.
 */

import { Message, MessageStatus } from '../types';
import { idbSavePendingMessage, idbGetPendingSyncMessages, idbRemovePendingMessage } from './idb';

type EventCallback = (data: any) => void;

class RealtimeChatClient {
  private socket: WebSocket | null = null;
  private userId: string | null = null;
  private userName: string | null = null;
  private avatarUrl?: string;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private reconnectTimer: any = null;
  private connectTimeoutTimer: any = null;
  private pendingOutbox: string[] = [];
  private inflight: Map<string, { timerId: any; message: any; attempts: number }> = new Map();
  private eventListeners: Map<string, Set<EventCallback>> = new Map();

  constructor() {
    this.eventListeners.set('connect', new Set());
    this.eventListeners.set('disconnect', new Set());
    this.eventListeners.set('message', new Set());
    this.eventListeners.set('status', new Set());
    this.eventListeners.set('read_receipt', new Set());
    this.eventListeners.set('typing', new Set());
    this.eventListeners.set('presence', new Set());
    this.eventListeners.set('sync_complete', new Set());
    this.eventListeners.set('group:created', new Set());
    this.eventListeners.set('group:updated', new Set());
    this.eventListeners.set('status:updated_all', new Set());
    this.eventListeners.set('reaction_updated', new Set());
    this.eventListeners.set('call_event', new Set());
  }

  public async ensureConnected(timeoutMs = 4000): Promise<boolean> {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return true;
    }
    if (!this.userId) return false;

    if (!this.socket || this.socket.readyState === WebSocket.CLOSED || this.socket.readyState === WebSocket.CLOSING) {
      this.connect(this.userId, this.userName || undefined, this.avatarUrl);
    }

    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        return true;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    return this.socket?.readyState === WebSocket.OPEN;
  }

  public connect(userId: string, userName?: string, avatarUrl?: string) {
    this.userId = userId;
    this.userName = userName || 'Cove User';
    this.avatarUrl = avatarUrl;

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.sendAuth();
      return;
    }

    if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      if (this.connectTimeoutTimer) clearTimeout(this.connectTimeoutTimer);
      this.connectTimeoutTimer = setTimeout(() => {
        if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
          console.warn('⏱️ WebSocket connection timed out in CONNECTING state. Resetting...');
          try {
            this.socket.close();
          } catch {}
          this.socket = null;
          this.scheduleReconnect();
        }
      }, 5000);

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        if (this.connectTimeoutTimer) clearTimeout(this.connectTimeoutTimer);
        console.log('⚡ Connected to Cove Real-Time Chat WebSocket Server');
        this.isConnected = true;
        this.sendAuth();
        this.flushPendingOutbox();
        this.emit('connect', { isConnected: true });
      };

      this.socket.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          this.handleServerEvent(data);
        } catch (err) {
          console.error('WebSocket JSON parse error:', err);
        }
      };

      this.socket.onclose = () => {
        if (this.connectTimeoutTimer) clearTimeout(this.connectTimeoutTimer);
        console.log('🔌 WebSocket disconnected');
        this.isConnected = false;
        this.emit('disconnect', { isConnected: false });
        this.scheduleReconnect();
      };

      this.socket.onerror = (error) => {
        console.warn('WebSocket error:', error);
      };
    } catch (err) {
      console.error('Failed creating WebSocket client:', err);
      this.scheduleReconnect();
    }
  }

  private async flushPendingOutbox() {
    try {
      const storedPending = await idbGetPendingSyncMessages();
      storedPending.forEach((msg) => {
        const payload = JSON.stringify({
          type: msg.is_group ? 'group:message:send' : 'message:send',
          message: {
            id: msg.id,
            conversationId: msg.conversation_id,
            senderId: msg.sender_id,
            receiverId: msg.receiver_id,
            groupId: msg.group_id,
            isGroup: msg.is_group,
            content: msg.content,
            type: msg.type || 'text',
            mediaUrl: msg.media_url,
            createdAt: msg.created_at,
            status: 'sending',
          },
        });
        if (!this.pendingOutbox.includes(payload)) {
          this.pendingOutbox.push(payload);
        }
      });
    } catch (e) {
      console.warn('Failed loading pending outbox from IDB:', e);
    }

    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.pendingOutbox.length > 0) {
      console.log(`📤 Flushing ${this.pendingOutbox.length} buffered outbox messages`);
      const queue = [...this.pendingOutbox];
      this.pendingOutbox = [];
      queue.forEach((payload) => {
        try {
          this.socket!.send(payload);
        } catch (err) {
          console.warn('Error flushing outbox item:', err);
          this.pendingOutbox.push(payload);
        }
      });
    }
  }

  private sendAuth() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.userId) {
      this.socket.send(
        JSON.stringify({
          type: 'auth',
          userId: this.userId,
          userName: this.userName,
          avatarUrl: this.avatarUrl,
        })
      );
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectAttempts++;
    const baseDelay = Math.min(1000 * Math.pow(1.4, this.reconnectAttempts), 15000);
    const jitter = Math.random() * 1000;
    const delay = baseDelay + jitter;
    console.log(`Will attempt WebSocket reconnection in ${Math.round(delay)}ms (Attempt ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => {
      if (this.userId) {
        this.connect(this.userId, this.userName || undefined, this.avatarUrl);
      }
    }, delay);
  }

  private handleServerEvent(data: any) {
    switch (data.type) {
      case 'auth:success':
        console.log('✅ WebSocket authenticated successfully');
        this.reconnectAttempts = 0;
        break;

      case 'message:ack': {
        const { messageId } = data;
        if (messageId && this.inflight.has(messageId)) {
          const item = this.inflight.get(messageId)!;
          clearTimeout(item.timerId);
          this.inflight.delete(messageId);
          idbRemovePendingMessage(messageId).catch(() => {});
        }
        this.emit('status', data);
        break;
      }

      case 'message:error': {
        const { messageId, conversationId, reason, code } = data;
        if (messageId && this.inflight.has(messageId)) {
          const item = this.inflight.get(messageId)!;
          clearTimeout(item.timerId);
          this.inflight.delete(messageId);
        }
        this.emit('status', {
          type: 'message:status_updated',
          messageId,
          conversationId,
          status: 'failed',
          reason: reason || code || 'Send failed',
        });
        break;
      }

      case 'message:receive':
        this.emit('message', data);
        break;

      case 'message:status_updated':
        this.emit('status', data);
        break;

      case 'message:read_receipt':
        this.emit('read_receipt', data);
        break;

      case 'typing:start':
      case 'typing:stop':
        this.emit('typing', data);
        break;

      case 'presence:update':
      case 'presence:response':
        this.emit('presence', data);
        break;

      case 'sync_complete':
        this.emit('sync_complete', data);
        break;

      case 'group:created':
        this.emit('group:created', data);
        break;

      case 'group:updated':
        this.emit('group:updated', data);
        break;

      case 'status:created':
      case 'status:viewed':
      case 'status:deleted':
        this.emit('status:updated_all', data);
        break;

      case 'message:reaction_updated':
        this.emit('reaction_updated', data);
        break;

      case 'call:incoming':
      case 'call:accepted':
      case 'call:declined':
      case 'call:ended':
      case 'call:signal':
        this.emit('call_event', data);
        break;

      default:
        break;
    }
  }

  private trackInflightMessage(message: Message, payload: string) {
    if (this.inflight.has(message.id)) {
      clearTimeout(this.inflight.get(message.id)!.timerId);
    }

    const timerId = setTimeout(async () => {
      if (this.inflight.has(message.id)) {
        console.warn(`⏱️ Message ${message.id} ack timeout. Attempting HTTP fallback...`);
        try {
          const res = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: JSON.parse(payload).message }),
          });
          if (res.ok) {
            this.inflight.delete(message.id);
            idbRemovePendingMessage(message.id).catch(() => {});
            this.emit('status', {
              type: 'message:status_updated',
              messageId: message.id,
              conversationId: message.conversation_id,
              status: 'sent',
            });
            return;
          }
        } catch (e) {
          console.warn('HTTP fallback on timeout failed:', e);
        }

        this.inflight.delete(message.id);
        idbSavePendingMessage(message).catch(() => {});
        this.emit('status', {
          type: 'message:status_updated',
          messageId: message.id,
          conversationId: message.conversation_id,
          status: 'failed',
          reason: 'Network timeout',
        });
      }
    }, 8000);

    this.inflight.set(message.id, { timerId, message, attempts: 1 });
  }

  public sendGroupMessage(message: Message): 'sent' | 'queued' | 'failed' {
    const payload = JSON.stringify({
      type: 'group:message:send',
      message: {
        id: message.id,
        conversationId: message.conversation_id,
        senderId: message.sender_id,
        senderName: message.sender_name,
        senderAvatar: message.sender_avatar,
        groupId: message.group_id || message.conversation_id,
        isGroup: true,
        content: message.content,
        type: message.type || 'text',
        mediaUrl: message.media_url,
        thumbnailUrl: message.thumbnail_url,
        mimeType: message.mime_type,
        fileSize: message.file_size,
        duration: message.duration,
        fileName: message.file_name,
        createdAt: message.created_at,
        status: 'sending',
        replyTo: message.reply_to ? {
          id: message.reply_to.id,
          senderName: message.reply_to.sender_name,
          content: message.reply_to.content,
        } : null,
      },
    });

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(payload);
        this.trackInflightMessage(message, payload);
        return 'sent';
      } catch (err) {
        console.warn('Error sending group message via WS:', err);
      }
    }

    if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
      if (!this.pendingOutbox.includes(payload)) {
        this.pendingOutbox.push(payload);
      }
      return 'queued';
    }

    idbSavePendingMessage(message).catch(() => {});
    return 'failed';
  }

  public sendMessage(message: Message): 'sent' | 'queued' | 'failed' {
    const payload = JSON.stringify({
      type: 'message:send',
      message: {
        id: message.id,
        conversationId: message.conversation_id,
        senderId: message.sender_id,
        receiverId: message.receiver_id,
        content: message.content,
        type: message.type || 'text',
        mediaUrl: message.media_url,
        thumbnailUrl: message.thumbnail_url,
        mimeType: message.mime_type,
        fileSize: message.file_size,
        duration: message.duration,
        fileName: message.file_name,
        createdAt: message.created_at,
        status: 'sending',
        replyTo: message.reply_to ? {
          id: message.reply_to.id,
          senderName: message.reply_to.sender_name,
          content: message.reply_to.content,
        } : null,
      },
    });

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(payload);
        this.trackInflightMessage(message, payload);
        return 'sent';
      } catch (err) {
        console.warn('Error sending message via WS:', err);
      }
    }

    if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
      if (!this.pendingOutbox.includes(payload)) {
        this.pendingOutbox.push(payload);
      }
      return 'queued';
    }

    idbSavePendingMessage(message).catch(() => {});
    return 'failed';
  }

  public markAsRead(conversationId: string, messageIds: string[], senderId: string, readerId: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: 'message:read',
          conversationId,
          messageIds,
          senderId,
          readerId,
        })
      );
    }
  }

  public sendTypingStatus(conversationId: string, receiverId: string, senderId: string, isTyping: boolean) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: isTyping ? 'typing:start' : 'typing:stop',
          conversationId,
          receiverId,
          senderId,
        })
      );
    }
  }

  public queryPresence(userIds: string[]) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: 'presence:query',
          userIds,
        })
      );
    }
  }

  public syncOfflineQueue(pendingMessages: Message[], userId: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN && pendingMessages.length > 0) {
      const formatted = pendingMessages.map((msg) => ({
        id: msg.id,
        conversationId: msg.conversation_id,
        senderId: msg.sender_id,
        receiverId: msg.receiver_id,
        content: msg.content,
        type: msg.type || 'text',
        mediaUrl: msg.media_url,
        createdAt: msg.created_at,
        status: msg.status || 'sent',
      }));

      this.socket.send(
        JSON.stringify({
          type: 'sync:offline',
          pendingMessages: formatted,
          userId,
        })
      );
    }
  }

  public sendReaction(messageId: string, conversationId: string, userId: string, userName: string, emoji: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: 'message:react',
          messageId,
          conversationId,
          userId,
          userName,
          emoji,
        })
      );
    }
  }

  public forwardMessage(message: Message, selectedTargets: any[], senderId: string, senderName?: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: 'message:forward',
          message,
          selectedTargets,
          senderId,
          senderName,
        })
      );
    }
  }

  public sendCallSignal(payload: {
    type: 'call:initiate' | 'call:accept' | 'call:decline' | 'call:end' | 'call:signal';
    callId: string;
    [key: string]: any;
  }) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }

  public on(event: string, callback: EventCallback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  public off(event: string, callback: EventCallback) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event)!.delete(callback);
    }
  }

  private emit(event: string, data: any) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event)!.forEach((cb) => cb(data));
    }
  }

  public disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.connectTimeoutTimer) clearTimeout(this.connectTimeoutTimer);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
  }

  public getStatus(): boolean {
    return this.isConnected;
  }
}

export const realtimeChat = new RealtimeChatClient();
