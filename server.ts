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

// API REST routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    connectedClients: clientsMap.size,
    groupsCount: groupsMap.size,
    timestamp: new Date().toISOString(),
  });
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
