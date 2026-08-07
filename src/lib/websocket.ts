/**
 * Real-Time WebSocket Client Service for Cove 1:1 WhatsApp Messaging
 * Handles auto-reconnection, online presence, typing indicators, read receipts, and offline sync.
 */

import { Message, MessageStatus } from '../types';

type EventCallback = (data: any) => void;

class RealtimeChatClient {
  private socket: WebSocket | null = null;
  private userId: string | null = null;
  private userName: string | null = null;
  private avatarUrl?: string;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectTimer: any = null;
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
  }

  /**
   * Initialize or connect WebSocket connection
   */
  public connect(userId: string, userName?: string, avatarUrl?: string) {
    this.userId = userId;
    this.userName = userName || 'Cove User';
    this.avatarUrl = avatarUrl;

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.sendAuth();
      }
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('⚡ Connected to Cove Real-Time Chat WebSocket Server');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.sendAuth();
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
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
      console.log(`Will attempt WebSocket reconnection in ${Math.round(delay)}ms (Attempt ${this.reconnectAttempts})`);
      this.reconnectTimer = setTimeout(() => {
        if (this.userId) {
          this.connect(this.userId, this.userName || undefined, this.avatarUrl);
        }
      }, delay);
    }
  }

  private handleServerEvent(data: any) {
    switch (data.type) {
      case 'auth:success':
        console.log('✅ WebSocket authenticated successfully');
        break;

      case 'message:receive':
      case 'message:ack':
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

      case 'sync:complete':
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

      default:
        break;
    }
  }

  /**
   * Send Group Message over WebSocket
   */
  public sendGroupMessage(message: Message): boolean {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const payload = {
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
          status: message.status || 'sending',
          replyTo: message.reply_to ? {
            id: message.reply_to.id,
            senderName: message.reply_to.sender_name,
            content: message.reply_to.content,
          } : null,
        },
      };
      this.socket.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }

  /**
   * Send 1:1 Message over WebSocket
   */
  public sendMessage(message: Message): boolean {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const payload = {
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
          status: message.status || 'sending',
          replyTo: message.reply_to ? {
            id: message.reply_to.id,
            senderName: message.reply_to.sender_name,
            content: message.reply_to.content,
          } : null,
        },
      };
      this.socket.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }

  /**
   * Broadcast message read receipt
   */
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

  /**
   * Send real-time typing indicator status
   */
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

  /**
   * Query online presence for user IDs
   */
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

  /**
   * Flush offline queue to server when back online
   */
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

  /**
   * Send Message Reaction over WebSocket
   */
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

  /**
   * Forward Message to targets over WebSocket
   */
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

  /**
   * Event Listener Subscriptions
   */
  public on(event: 'connect' | 'disconnect' | 'message' | 'status' | 'read_receipt' | 'typing' | 'presence' | 'sync_complete' | 'group:created' | 'group:updated' | 'status:updated_all' | 'reaction_updated', callback: EventCallback) {
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
