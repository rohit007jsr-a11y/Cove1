import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

interface ChatClient {
  userId: string;
  userName?: string;
  ws: WebSocket;
  lastActive: number;
}

interface ReactionPayload {
  emoji: string;
  userId: string;
  userName?: string;
}

interface MessagePayload {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  receiverId?: string;
  isGroup?: boolean;
  groupId?: string;
  content: string;
  type?: 'text' | 'image' | 'video' | 'document' | 'voice' | 'voice_note' | 'file' | 'system';
  mediaUrl?: string;
  thumbnailUrl?: string;
  mimeType?: string;
  fileSize?: number;
  duration?: number;
  fileName?: string;
  createdAt: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
  } | null;
  reactions?: ReactionPayload[];
  isForwarded?: boolean;
  forwardCount?: number;
  originalMessageId?: string;
}

interface GroupSettings {
  onlyAdminsCanSend: boolean;
  onlyAdminsCanEditInfo: boolean;
}

interface GroupData {
  id: string;
  name: string;
  description?: string;
  creatorId: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  participants: string[]; // array of user IDs
  admins: string[]; // array of user IDs
  settings: GroupSettings;
}

const app = express();
const PORT = 3000;
const server = http.createServer(app);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// In-memory real-time state for connected clients, offline message queue, status, and groups
const clientsMap = new Map<string, Set<WebSocket>>();
const activeUsers = new Map<string, { userName: string; avatarUrl?: string; lastSeen: string }>();
const offlineQueue = new Map<string, MessagePayload[]>(); // receiverId -> array of undelivered messages
const conversationMessages = new Map<string, MessagePayload[]>(); // conversationId -> messages
const groupsMap = new Map<string, GroupData>(); // groupId -> GroupData

// Helper: Broadcast WebSocket message to group members
function broadcastToGroup(groupId: string, payload: any, excludeUserId?: string) {
  const group = groupsMap.get(groupId);
  if (!group) return;

  const jsonStr = JSON.stringify(payload);
  group.participants.forEach((pUserId) => {
    if (excludeUserId && pUserId === excludeUserId) return;
    const sockets = clientsMap.get(pUserId);
    if (sockets) {
      sockets.forEach((s) => {
        if (s.readyState === WebSocket.OPEN) {
          s.send(jsonStr);
        }
      });
    }
  });
}

// Helper: Broadcast WebSocket message to all connected clients
function broadcastToAll(payloadObj: any) {
  const payload = JSON.stringify(payloadObj);
  clientsMap.forEach((sockets) => {
    sockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  });
}

// API REST routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    connectedClients: clientsMap.size,
    groupsCount: groupsMap.size,
    timestamp: new Date().toISOString(),
  });
});

// Status/Stories Data Store
interface StatusViewerData {
  userId: string;
  userName: string;
  userAvatar?: string;
  viewedAt: string;
}

interface StatusItemData {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
  type: 'text' | 'image' | 'video';
  contentUrl?: string;
  text?: string;
  bgColor?: string;
  caption?: string;
  createdAt: string;
  expiresAt: string;
  privacy: 'all' | 'contacts' | 'except';
  viewers: StatusViewerData[];
}

const statusesMap = new Map<string, StatusItemData>();

// Seed initial active demo statuses with 24-hour expiration window
const seedNow = Date.now();
const hourMs = 60 * 60 * 1000;

const seedStatuses: StatusItemData[] = [
  {
    id: 'status-sarah-1',
    ownerId: 'contact-1',
    ownerName: 'Sarah Chen',
    ownerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80',
    type: 'image',
    contentUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80',
    caption: 'Golden hour vibes 🌅',
    createdAt: new Date(seedNow - 2 * hourMs).toISOString(),
    expiresAt: new Date(seedNow + 22 * hourMs).toISOString(),
    privacy: 'contacts',
    viewers: [
      {
        userId: 'contact-2',
        userName: 'Alex Rivera',
        userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
        viewedAt: new Date(seedNow - 1 * hourMs).toISOString(),
      },
    ],
  },
  {
    id: 'status-sarah-2',
    ownerId: 'contact-1',
    ownerName: 'Sarah Chen',
    ownerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80',
    type: 'text',
    text: 'Launching our new design system & AI feature updates today! 🚀✨',
    bgColor: 'from-violet-600 to-indigo-900',
    createdAt: new Date(seedNow - 1 * hourMs).toISOString(),
    expiresAt: new Date(seedNow + 23 * hourMs).toISOString(),
    privacy: 'contacts',
    viewers: [],
  },
  {
    id: 'status-alex-1',
    ownerId: 'contact-2',
    ownerName: 'Alex Rivera',
    ownerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
    type: 'image',
    contentUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80',
    caption: 'Late night coding & architecture session ⚡',
    createdAt: new Date(seedNow - 4 * hourMs).toISOString(),
    expiresAt: new Date(seedNow + 20 * hourMs).toISOString(),
    privacy: 'contacts',
    viewers: [],
  },
];

seedStatuses.forEach((st) => statusesMap.set(st.id, st));

// Helper to clean up expired statuses
function cleanupExpiredStatuses() {
  const now = Date.now();
  statusesMap.forEach((status, id) => {
    if (new Date(status.expiresAt).getTime() <= now) {
      statusesMap.delete(id);
    }
  });
}

// REST API for Status/Stories
app.get('/api/statuses', (req, res) => {
  cleanupExpiredStatuses();
  const userId = req.query.userId as string;
  const activeList = Array.from(statusesMap.values());

  // Group statuses by owner
  const groupsMap = new Map<string, {
    ownerId: string;
    ownerName: string;
    ownerAvatar?: string;
    isOwn: boolean;
    hasUnviewed: boolean;
    lastUpdated: string;
    statuses: StatusItemData[];
  }>();

  activeList.forEach((st) => {
    if (!groupsMap.has(st.ownerId)) {
      groupsMap.set(st.ownerId, {
        ownerId: st.ownerId,
        ownerName: st.ownerName,
        ownerAvatar: st.ownerAvatar,
        isOwn: Boolean(userId && st.ownerId === userId),
        hasUnviewed: false,
        lastUpdated: st.createdAt,
        statuses: [],
      });
    }

    const grp = groupsMap.get(st.ownerId)!;
    grp.statuses.push(st);

    // Update lastUpdated timestamp to latest status
    if (new Date(st.createdAt).getTime() > new Date(grp.lastUpdated).getTime()) {
      grp.lastUpdated = st.createdAt;
    }

    // Check if current user has viewed this item
    const isViewed = userId
      ? st.viewers.some((v) => v.userId === userId)
      : false;
    if (!isViewed && (!userId || st.ownerId !== userId)) {
      grp.hasUnviewed = true;
    }
  });

  res.json({
    statuses: activeList,
    groups: Array.from(groupsMap.values()),
  });
});

app.post('/api/statuses', (req, res) => {
  cleanupExpiredStatuses();
  const {
    ownerId,
    ownerName,
    ownerAvatar,
    type,
    contentUrl,
    text,
    bgColor,
    caption,
    privacy,
  } = req.body;

  if (!ownerId || !ownerName) {
    return res.status(400).json({ error: 'Missing required owner fields' });
  }

  const now = Date.now();
  const newStatus: StatusItemData = {
    id: `status-${now}-${Math.random().toString(36).substring(2, 7)}`,
    ownerId,
    ownerName,
    ownerAvatar,
    type: type || 'text',
    contentUrl,
    text,
    bgColor: bgColor || 'from-sky-500 to-blue-700',
    caption,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
    privacy: privacy || 'contacts',
    viewers: [],
  };

  statusesMap.set(newStatus.id, newStatus);

  // Broadcast to all WebSocket clients
  broadcastToAll({
    type: 'status:created',
    status: newStatus,
  });

  res.json({ success: true, status: newStatus });
});

app.post('/api/statuses/:id/view', (req, res) => {
  const { id } = req.params;
  const { userId, userName, userAvatar } = req.body;

  const status = statusesMap.get(id);
  if (!status) {
    return res.status(404).json({ error: 'Status not found or expired' });
  }

  if (userId && !status.viewers.some((v) => v.userId === userId)) {
    const newViewer: StatusViewerData = {
      userId,
      userName: userName || 'Anonymous',
      userAvatar,
      viewedAt: new Date().toISOString(),
    };
    status.viewers.push(newViewer);
    statusesMap.set(id, status);

    // Broadcast view update to owner
    broadcastToAll({
      type: 'status:viewed',
      statusId: id,
      viewer: newViewer,
      ownerId: status.ownerId,
    });
  }

  res.json({ success: true, status });
});

app.delete('/api/statuses/:id', (req, res) => {
  const { id } = req.params;
  const status = statusesMap.get(id);
  if (!status) return res.status(404).json({ error: 'Status not found' });

  statusesMap.delete(id);

  broadcastToAll({
    type: 'status:deleted',
    statusId: id,
    ownerId: status.ownerId,
  });

  res.json({ success: true });
});

// REST API for Media Uploads
app.post('/api/upload', (req, res) => {
  try {
    const { fileData, fileName, mimeType, fileSize, duration, thumbnailData } = req.body;
    if (!fileData) {
      return res.status(400).json({ error: 'Missing fileData payload' });
    }

    let detectedType: 'image' | 'video' | 'document' | 'voice_note' | 'file' = 'file';
    if (mimeType?.startsWith('image/')) {
      detectedType = 'image';
    } else if (mimeType?.startsWith('video/')) {
      detectedType = 'video';
    } else if (mimeType?.startsWith('audio/')) {
      detectedType = 'voice_note';
    } else if (
      mimeType?.includes('pdf') ||
      mimeType?.includes('word') ||
      mimeType?.includes('sheet') ||
      mimeType?.includes('presentation') ||
      mimeType?.includes('zip') ||
      mimeType?.includes('text') ||
      mimeType?.includes('json')
    ) {
      detectedType = 'document';
    }

    const mediaObj = {
      url: fileData,
      thumbnailUrl: thumbnailData || (detectedType === 'image' ? fileData : undefined),
      mimeType: mimeType || 'application/octet-stream',
      size: fileSize || (typeof fileData === 'string' ? Math.round(fileData.length * 0.75) : 0),
      duration: duration || 0,
      fileName: fileName || 'file',
      type: detectedType,
    };

    res.json({
      success: true,
      media: mediaObj,
    });
  } catch (err: any) {
    console.error('Error handling upload:', err);
    res.status(500).json({ error: err.message || 'Media processing failed' });
  }
});

// REST API for Groups
app.get('/api/groups', (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.json({ groups: Array.from(groupsMap.values()) });
  }

  const userGroups = Array.from(groupsMap.values()).filter((g) =>
    g.participants.includes(userId)
  );
  res.json({ groups: userGroups });
});

app.get('/api/groups/:groupId', (req, res) => {
  const group = groupsMap.get(req.params.groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  res.json({ group });
});

app.post('/api/groups', (req, res) => {
  const { id, name, description, avatarUrl, creatorId, creatorName, participants, settings } = req.body;
  if (!name || !creatorId) {
    return res.status(400).json({ error: 'Missing required fields: name, creatorId' });
  }

  const groupId = id || `group-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const participantSet = new Set<string>([creatorId, ...(participants || [])]);
  const newGroup: GroupData = {
    id: groupId,
    name,
    description: description || '',
    creatorId,
    avatarUrl: avatarUrl || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    participants: Array.from(participantSet),
    admins: [creatorId],
    settings: settings || { onlyAdminsCanSend: false, onlyAdminsCanEditInfo: false },
  };

  groupsMap.set(groupId, newGroup);

  // System Message for group creation
  const systemMsg: MessagePayload = {
    id: `sys-${Date.now()}`,
    conversationId: groupId,
    senderId: creatorId,
    senderName: 'System',
    isGroup: true,
    groupId,
    content: `${creatorName || 'A member'} created group "${name}"`,
    type: 'system',
    createdAt: new Date().toISOString(),
    status: 'delivered',
  };

  if (!conversationMessages.has(groupId)) {
    conversationMessages.set(groupId, []);
  }
  conversationMessages.get(groupId)!.push(systemMsg);

  // Broadcast to all participants via WebSocket
  broadcastToGroup(groupId, {
    type: 'group:created',
    group: newGroup,
    systemMessage: systemMsg,
  });

  res.json({ group: newGroup, systemMessage: systemMsg });
});

app.patch('/api/groups/:groupId', (req, res) => {
  const { groupId } = req.params;
  const group = groupsMap.get(groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const { name, description, avatarUrl, settings, actorId, actorName } = req.body;

  if (name !== undefined) group.name = name;
  if (description !== undefined) group.description = description;
  if (avatarUrl !== undefined) group.avatarUrl = avatarUrl;
  if (settings !== undefined) group.settings = { ...group.settings, ...settings };
  group.updatedAt = new Date().toISOString();

  groupsMap.set(groupId, group);

  const sysMsg: MessagePayload = {
    id: `sys-${Date.now()}`,
    conversationId: groupId,
    senderId: actorId || 'system',
    isGroup: true,
    groupId,
    content: `${actorName || 'An admin'} updated group settings`,
    type: 'system',
    createdAt: new Date().toISOString(),
    status: 'delivered',
  };

  conversationMessages.get(groupId)?.push(sysMsg);

  broadcastToGroup(groupId, {
    type: 'group:updated',
    group,
    systemMessage: sysMsg,
  });

  res.json({ group, systemMessage: sysMsg });
});

app.post('/api/groups/:groupId/participants', (req, res) => {
  const { groupId } = req.params;
  const group = groupsMap.get(groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const { action, targetUserId, targetUserName, actorId, actorName } = req.body;

  let sysText = '';
  if (action === 'add') {
    if (!group.participants.includes(targetUserId)) {
      group.participants.push(targetUserId);
    }
    sysText = `${actorName || 'An admin'} added ${targetUserName || 'a new member'}`;
  } else if (action === 'remove' || action === 'leave') {
    group.participants = group.participants.filter((id) => id !== targetUserId);
    group.admins = group.admins.filter((id) => id !== targetUserId);
    sysText = action === 'leave'
      ? `${targetUserName || 'A member'} left the group`
      : `${actorName || 'An admin'} removed ${targetUserName || 'a member'}`;
  }

  group.updatedAt = new Date().toISOString();
  groupsMap.set(groupId, group);

  const sysMsg: MessagePayload = {
    id: `sys-${Date.now()}`,
    conversationId: groupId,
    senderId: actorId || 'system',
    isGroup: true,
    groupId,
    content: sysText,
    type: 'system',
    createdAt: new Date().toISOString(),
    status: 'delivered',
  };

  conversationMessages.get(groupId)?.push(sysMsg);

  broadcastToGroup(groupId, {
    type: 'group:updated',
    group,
    systemMessage: sysMsg,
  });

  res.json({ group, systemMessage: sysMsg });
});

app.post('/api/groups/:groupId/roles', (req, res) => {
  const { groupId } = req.params;
  const group = groupsMap.get(groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const { targetUserId, targetUserName, newRole, actorId, actorName } = req.body;

  if (newRole === 'admin') {
    if (!group.admins.includes(targetUserId)) group.admins.push(targetUserId);
  } else {
    group.admins = group.admins.filter((id) => id !== targetUserId);
  }

  group.updatedAt = new Date().toISOString();
  groupsMap.set(groupId, group);

  const sysText = newRole === 'admin'
    ? `${actorName || 'An admin'} promoted ${targetUserName || 'a member'} to Admin`
    : `${actorName || 'An admin'} demoted ${targetUserName || 'an admin'} to Member`;

  const sysMsg: MessagePayload = {
    id: `sys-${Date.now()}`,
    conversationId: groupId,
    senderId: actorId || 'system',
    isGroup: true,
    groupId,
    content: sysText,
    type: 'system',
    createdAt: new Date().toISOString(),
    status: 'delivered',
  };

  conversationMessages.get(groupId)?.push(sysMsg);

  broadcastToGroup(groupId, {
    type: 'group:updated',
    group,
    systemMessage: sysMsg,
  });

  res.json({ group, systemMessage: sysMsg });
});

app.get('/api/search', (req, res) => {
  const query = (req.query.q as string || '').trim().toLowerCase();
  const userId = req.query.userId as string;

  if (!query) {
    return res.json({ messages: [], groups: [] });
  }

  // 1. Search messages in conversationMessages
  const matchingMessages: any[] = [];

  conversationMessages.forEach((msgs, convId) => {
    msgs.forEach((msg) => {
      if (!msg.content) return;
      const contentLower = msg.content.toLowerCase();
      const matchIdx = contentLower.indexOf(query);

      if (matchIdx !== -1) {
        // Snippet excerpt
        const start = Math.max(0, matchIdx - 25);
        const end = Math.min(msg.content.length, matchIdx + query.length + 35);
        let snippet = msg.content.substring(start, end);
        if (start > 0) snippet = '...' + snippet;
        if (end < msg.content.length) snippet = snippet + '...';

        let chatName = msg.senderName || 'Conversation';
        if (msg.isGroup && msg.groupId) {
          const group = groupsMap.get(msg.groupId);
          if (group) chatName = group.name;
        }

        matchingMessages.push({
          messageId: msg.id,
          conversationId: convId,
          senderId: msg.senderId,
          senderName: msg.senderName || 'Member',
          senderAvatar: msg.senderAvatar,
          content: msg.content,
          snippet,
          matchedTerm: query,
          createdAt: msg.createdAt,
          isGroup: msg.isGroup,
          groupId: msg.groupId,
          chatName,
          chatAvatar: msg.senderAvatar,
          contactId: msg.isGroup ? msg.groupId : (msg.senderId === userId ? msg.receiverId : msg.senderId),
        });
      }
    });
  });

  // 2. Search matching groups by name or description
  const matchingGroups = Array.from(groupsMap.values()).filter((g) => {
    if (userId && !g.participants.includes(userId)) return false;
    return (
      g.name.toLowerCase().includes(query) ||
      (g.description && g.description.toLowerCase().includes(query))
    );
  });

  matchingMessages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({
    messages: matchingMessages.slice(0, 50),
    groups: matchingGroups,
  });
});

app.get('/api/architecture', (req, res) => {
  res.json({
    title: 'Cove 1:1 Real-Time WhatsApp Architecture',
    protocol: 'WebSocket (ws) over HTTP Server (Port 3000)',
    dataModel: {
      Message: {
        id: 'string (UUID)',
        conversationId: 'string',
        senderId: 'string (UUID)',
        receiverId: 'string (UUID)',
        content: 'string (text/caption)',
        type: "'text' | 'image' | 'voice' | 'file'",
        mediaUrl: 'string (optional base64 or CDN URL)',
        createdAt: 'ISO String',
        status: "'sending' | 'sent' | 'delivered' | 'read'",
        replyTo: 'object { id, senderName, content } (optional)',
      },
    },
    cachingStrategy: 'IndexedDB (cove_offline_store) + Dual-tier LocalStorage Sync Queue',
    animations: 'Framer Motion (motion/react) with 150-250ms spring physics',
  });
});

// Real-time WebSocket Server setup
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcastUserPresence(userId: string, isOnline: boolean, userName?: string) {
  const payload = JSON.stringify({
    type: 'presence:update',
    userId,
    isOnline,
    userName,
    timestamp: new Date().toISOString(),
  });

  clientsMap.forEach((sockets, clientUserId) => {
    if (clientUserId !== userId) {
      sockets.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
      });
    }
  });
}

wss.on('connection', (ws: WebSocket) => {
  let authenticatedUserId: string | null = null;

  ws.on('message', (rawMessage: string) => {
    try {
      const data = JSON.parse(rawMessage.toString());

      switch (data.type) {
        // 1. Client authentication & session connection
        case 'auth': {
          const { userId, userName, avatarUrl } = data;
          if (!userId) return;

          authenticatedUserId = userId;
          if (!clientsMap.has(userId)) {
            clientsMap.set(userId, new Set());
          }
          clientsMap.get(userId)!.add(ws);

          activeUsers.set(userId, {
            userName: userName || 'Cove User',
            avatarUrl,
            lastSeen: new Date().toISOString(),
          });

          // Confirm authentication back to client
          ws.send(
            JSON.stringify({
              type: 'auth:success',
              userId,
              timestamp: new Date().toISOString(),
            })
          );

          // Broadcast user online status
          broadcastUserPresence(userId, true, userName);

          // Deliver any queued offline messages for this user
          if (offlineQueue.has(userId)) {
            const queued = offlineQueue.get(userId) || [];
            if (queued.length > 0) {
              queued.forEach((msg) => {
                msg.status = 'delivered';
                ws.send(
                  JSON.stringify({
                    type: 'message:receive',
                    message: msg,
                  })
                );

                // Notify original sender that queued message was delivered
                const senderSockets = clientsMap.get(msg.senderId);
                if (senderSockets) {
                  senderSockets.forEach((s) => {
                    if (s.readyState === WebSocket.OPEN) {
                      s.send(
                        JSON.stringify({
                          type: 'message:status_updated',
                          messageId: msg.id,
                          conversationId: msg.conversationId,
                          status: 'delivered',
                          receiverId: userId,
                        })
                      );
                    }
                  });
                }
              });
              offlineQueue.delete(userId);
            }
          }
          break;
        }

        // 2. Client sends a 1:1 message
        case 'message:send': {
          const { message } = data as { message: MessagePayload };
          if (!message || !message.senderId || !message.receiverId) return;

          // Mark message as 'sent' by server
          const processedMessage: MessagePayload = {
            ...message,
            status: 'sent',
            createdAt: message.createdAt || new Date().toISOString(),
          };

          // Store in in-memory conversation list
          const convId = processedMessage.conversationId;
          if (!conversationMessages.has(convId)) {
            conversationMessages.set(convId, []);
          }
          conversationMessages.get(convId)!.push(processedMessage);

          // Acknowledge sender that message reached server ('sent' status with single tick)
          ws.send(
            JSON.stringify({
              type: 'message:ack',
              messageId: processedMessage.id,
              conversationId: processedMessage.conversationId,
              status: 'sent',
            })
          );

          // Check if receiver is online
          const receiverSockets = clientsMap.get(processedMessage.receiverId);
          let isDelivered = false;

          if (receiverSockets && receiverSockets.size > 0) {
            receiverSockets.forEach((rSocket) => {
              if (rSocket.readyState === WebSocket.OPEN) {
                processedMessage.status = 'delivered';
                rSocket.send(
                  JSON.stringify({
                    type: 'message:receive',
                    message: processedMessage,
                  })
                );
                isDelivered = true;
              }
            });
          }

          if (isDelivered) {
            // Notify sender of 'delivered' status (double gray ticks)
            ws.send(
              JSON.stringify({
                type: 'message:status_updated',
                messageId: processedMessage.id,
                conversationId: processedMessage.conversationId,
                status: 'delivered',
                receiverId: processedMessage.receiverId,
              })
            );
          } else {
            // Queue for offline delivery when receiver connects
            if (!offlineQueue.has(processedMessage.receiverId)) {
              offlineQueue.set(processedMessage.receiverId, []);
            }
            offlineQueue.get(processedMessage.receiverId)!.push(processedMessage);
          }
          break;
        }

        // 2b. Client sends a Group message
        case 'group:message:send': {
          const { message } = data as { message: MessagePayload };
          if (!message || !message.senderId || !message.groupId) return;

          const processedMessage: MessagePayload = {
            ...message,
            status: 'sent',
            isGroup: true,
            createdAt: message.createdAt || new Date().toISOString(),
          };

          const convId = processedMessage.conversationId || processedMessage.groupId;
          if (!conversationMessages.has(convId)) {
            conversationMessages.set(convId, []);
          }
          conversationMessages.get(convId)!.push(processedMessage);

          // Acknowledge sender
          ws.send(
            JSON.stringify({
              type: 'message:ack',
              messageId: processedMessage.id,
              conversationId: convId,
              status: 'sent',
            })
          );

          // Broadcast to all connected participants of the group except sender
          broadcastToGroup(
            processedMessage.groupId,
            {
              type: 'message:receive',
              message: processedMessage,
            },
            processedMessage.senderId
          );
          break;
        }

        // 3. Status updates (Read receipts: double blue ticks)
        case 'message:read': {
          const { conversationId, messageIds, senderId, readerId } = data;
          if (!conversationId || !senderId) return;

          // Notify the original sender that message(s) were read
          const senderSockets = clientsMap.get(senderId);
          if (senderSockets) {
            senderSockets.forEach((sSocket) => {
              if (sSocket.readyState === WebSocket.OPEN) {
                sSocket.send(
                  JSON.stringify({
                    type: 'message:read_receipt',
                    conversationId,
                    messageIds,
                    readerId,
                    status: 'read',
                    readAt: new Date().toISOString(),
                  })
                );
              }
            });
          }
          break;
        }

        // 4. Real-time typing indicators
        case 'typing:start':
        case 'typing:stop': {
          const { conversationId, receiverId, senderId } = data;
          if (!receiverId) return;

          const receiverSockets = clientsMap.get(receiverId);
          if (receiverSockets) {
            receiverSockets.forEach((rSocket) => {
              if (rSocket.readyState === WebSocket.OPEN) {
                rSocket.send(
                  JSON.stringify({
                    type: data.type,
                    conversationId,
                    senderId,
                  })
                );
              }
            });
          }
          break;
        }

        // 5. Offline sync request from client reconnecting
        case 'sync:offline': {
          const { pendingMessages, userId } = data;
          if (Array.isArray(pendingMessages) && pendingMessages.length > 0) {
            const syncedIds: string[] = [];
            pendingMessages.forEach((msg: MessagePayload) => {
              const receiverSockets = clientsMap.get(msg.receiverId);
              if (receiverSockets && receiverSockets.size > 0) {
                receiverSockets.forEach((rSocket) => {
                  if (rSocket.readyState === WebSocket.OPEN) {
                    msg.status = 'delivered';
                    rSocket.send(
                      JSON.stringify({
                        type: 'message:receive',
                        message: msg,
                      })
                    );
                  }
                });
              } else {
                if (!offlineQueue.has(msg.receiverId)) {
                  offlineQueue.set(msg.receiverId, []);
                }
                offlineQueue.get(msg.receiverId)!.push(msg);
              }
              syncedIds.push(msg.id);
            });

            ws.send(
              JSON.stringify({
                type: 'sync:complete',
                syncedIds,
              })
            );
          }
          break;
        }

        // 6. Presence query
        case 'presence:query': {
          const { userIds } = data;
          if (Array.isArray(userIds)) {
            const result: Record<string, boolean> = {};
            userIds.forEach((uid) => {
              const sockets = clientsMap.get(uid);
              result[uid] = Boolean(sockets && sockets.size > 0);
            });

            ws.send(
              JSON.stringify({
                type: 'presence:response',
                presenceMap: result,
              })
            );
          }
          break;
        }

        // 7. Message reactions
        case 'message:react': {
          const { messageId, conversationId, userId, userName, emoji } = data;
          if (!messageId || !conversationId || !userId || !emoji) break;

          const msgs = conversationMessages.get(conversationId) || [];
          const targetMsg = msgs.find((m) => m.id === messageId);

          if (targetMsg) {
            if (!targetMsg.reactions) {
              targetMsg.reactions = [];
            }

            // Toggle logic: if user already reacted with SAME emoji, remove it. If different emoji or new, toggle/add.
            const existingIdx = targetMsg.reactions.findIndex(
              (r) => r.userId === userId && r.emoji === emoji
            );

            if (existingIdx >= 0) {
              // Remove reaction
              targetMsg.reactions.splice(existingIdx, 1);
            } else {
              // Remove any existing reaction from this user if one reaction per user rule, or allow multiple
              // We'll replace user's previous reaction with the new emoji or append
              targetMsg.reactions = targetMsg.reactions.filter((r) => r.userId !== userId);
              targetMsg.reactions.push({ emoji, userId, userName });
            }

            // Broadcast reaction update to all connected clients
            const broadcastPayload = JSON.stringify({
              type: 'message:reaction_updated',
              conversationId,
              messageId,
              reactions: targetMsg.reactions,
            });

            // Deliver to recipient sockets & sender
            if (targetMsg.receiverId) {
              const receiverSockets = clientsMap.get(targetMsg.receiverId);
              if (receiverSockets) {
                receiverSockets.forEach((s) => s.readyState === WebSocket.OPEN && s.send(broadcastPayload));
              }
            }

            if (targetMsg.senderId) {
              const senderSockets = clientsMap.get(targetMsg.senderId);
              if (senderSockets) {
                senderSockets.forEach((s) => s.readyState === WebSocket.OPEN && s.send(broadcastPayload));
              }
            }

            if (targetMsg.isGroup && targetMsg.groupId) {
              const grp = groupsMap.get(targetMsg.groupId);
              if (grp) {
                grp.participants.forEach((pId) => {
                  const pSockets = clientsMap.get(pId);
                  if (pSockets) {
                    pSockets.forEach((s) => s.readyState === WebSocket.OPEN && s.send(broadcastPayload));
                  }
                });
              }
            }
          }
          break;
        }

        // 8. Message forwarding
        case 'message:forward': {
          const { message, selectedTargets, senderId, senderName } = data;
          if (!message || !Array.isArray(selectedTargets) || !senderId) break;

          // Limit forwarding to max 5 targets (anti-spam)
          const validTargets = selectedTargets.slice(0, 5);

          validTargets.forEach((target: { conversationId?: string; contactId?: string; groupId?: string }) => {
            const fwdId = 'fwd_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
            const targetConversationId = target.conversationId || target.groupId || target.contactId || 'fwd_chat';

            const forwardedMsg: MessagePayload = {
              id: fwdId,
              conversationId: targetConversationId,
              senderId: senderId,
              senderName: senderName || 'You',
              receiverId: target.contactId,
              isGroup: Boolean(target.groupId),
              groupId: target.groupId,
              content: message.content || '',
              type: message.type || 'text',
              mediaUrl: message.media_url || message.mediaUrl,
              thumbnailUrl: message.thumbnail_url || message.thumbnailUrl,
              mimeType: message.mime_type || message.mimeType,
              fileSize: message.file_size || message.fileSize,
              duration: message.duration,
              fileName: message.file_name || message.fileName,
              createdAt: new Date().toISOString(),
              status: 'sent',
              isForwarded: true,
              forwardCount: (message.forward_count || message.forwardCount || 0) + 1,
              originalMessageId: message.id,
              reactions: [],
            };

            // Save to server conversation state
            if (!conversationMessages.has(targetConversationId)) {
              conversationMessages.set(targetConversationId, []);
            }
            conversationMessages.get(targetConversationId)!.push(forwardedMsg);

            const sendPayload = JSON.stringify({
              type: 'message:receive',
              message: forwardedMsg,
            });

            // Deliver to target recipient / group
            if (target.contactId) {
              const rSockets = clientsMap.get(target.contactId);
              if (rSockets) {
                rSockets.forEach((s) => s.readyState === WebSocket.OPEN && s.send(sendPayload));
              }
            }

            if (target.groupId) {
              const grp = groupsMap.get(target.groupId);
              if (grp) {
                grp.participants.forEach((pId) => {
                  const pSockets = clientsMap.get(pId);
                  if (pSockets) {
                    pSockets.forEach((s) => s.readyState === WebSocket.OPEN && s.send(sendPayload));
                  }
                });
              }
            }

            // Also echo back to sender socket so UI updates immediately
            ws.send(sendPayload);
          });
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    if (authenticatedUserId) {
      const userSockets = clientsMap.get(authenticatedUserId);
      if (userSockets) {
        userSockets.delete(ws);
        if (userSockets.size === 0) {
          clientsMap.delete(authenticatedUserId);
          broadcastUserPresence(authenticatedUserId, false);
        }
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket connection error:', error);
  });
});

async function startServer() {
  // Vite integration in development mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Cove 1:1 Real-Time WhatsApp Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
