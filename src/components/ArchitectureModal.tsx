import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Server,
  Cpu,
  Layers,
  Database,
  ShieldCheck,
  Zap,
  Globe,
  Radio,
  CheckCheck,
  Smartphone,
  Lock,
  Code2,
  ListOrdered,
  FileText
} from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'caching' | 'animations' | 'security'>('overview');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
          className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  Cove WhatsApp-Style Architecture System
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
                    WebSocket v1.0
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Full-stack 1:1 Messaging Engine, Offline Caching, & Animation Specs
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50 px-6 shrink-0 overflow-x-auto">
            {[
              { id: 'overview', label: 'Architecture Overview', icon: Server },
              { id: 'events', label: 'Data Model & WS Events', icon: Radio },
              { id: 'caching', label: 'IndexedDB & Sync Strategy', icon: Database },
              { id: 'animations', label: 'Animations & UX Specs', icon: Zap },
              { id: 'security', label: 'Security & Scaling', icon: ShieldCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                    isActive
                      ? 'border-sky-500 text-sky-600 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-500' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content Body */}
          <div className="p-6 overflow-y-auto flex-1 text-slate-700 text-xs font-sans space-y-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-sky-600 font-bold text-sm">
                      <Server className="w-4 h-4" />
                      <span>Backend Node.js / Express Architecture</span>
                    </div>
                    <ul className="space-y-1.5 text-slate-600 list-disc list-inside leading-relaxed text-[11px]">
                      <li><strong className="text-slate-800">WebSocket Server (`server.ts`)</strong>: Runs on Port 3000 alongside Express HTTP.</li>
                      <li><strong className="text-slate-800">Client Map (`clientsMap`)</strong>: Maintains active sockets keyed by `userId`.</li>
                      <li><strong className="text-slate-800">Direct 1:1 Routing</strong>: Instant message forwarding with low latency (&lt;20ms).</li>
                      <li><strong className="text-slate-800">Offline Message Queue</strong>: Queues undelivered messages until recipient connects.</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                      <Smartphone className="w-4 h-4" />
                      <span>Frontend React + Vite Architecture</span>
                    </div>
                    <ul className="space-y-1.5 text-slate-600 list-disc list-inside leading-relaxed text-[11px]">
                      <li><strong className="text-slate-800">RealtimeChatClient (`websocket.ts`)</strong>: Auto-reconnecting socket service.</li>
                      <li><strong className="text-slate-800">IndexedDB (`cove_offline_store`)</strong>: Persistent local database for instant offline access.</li>
                      <li><strong className="text-slate-800">Optimistic UI Updates</strong>: Messages appear instantly before server ACK.</li>
                      <li><strong className="text-slate-800">Framer Motion</strong>: 150–250ms spring entrance/exit transitions.</li>
                    </ul>
                  </div>
                </div>

                <div className="p-4 bg-sky-50/60 border border-sky-200/80 rounded-xl space-y-3">
                  <h3 className="font-bold text-sky-900 text-sm flex items-center gap-2">
                    <Globe className="w-4 h-4 text-sky-600" />
                    End-to-End Event Stream Workflow
                  </h3>
                  <div className="font-mono text-[11px] bg-slate-900 text-slate-200 p-3 rounded-lg overflow-x-auto leading-relaxed">
{`Client A (Sender)                  Express WS Server                   Client B (Receiver)
     |                                    |                                    |
     |--- (1) message:send ------------->|                                    |
     |    [status: 'sending']             |                                    |
     |<-- (2) message:ack ---------------|                                    |
     |    [status: 'sent' ✓]              |                                    |
     |                                    |--- (3) message:receive ----------->|
     |                                    |    [status: 'delivered']           |
     |<-- (4) message:status_updated -----|                                    |
     |    [status: 'delivered' ✓✓]        |                                    |
     |                                    |<-- (5) message:read --------------|
     |<-- (6) message:read_receipt -------|    [status: 'read']                |
     |    [status: 'read' ✓✓ (blue)]      |                                    |`}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'events' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-sky-500" />
                    Core Message Data Model Schema
                  </h3>
                  <pre className="p-4 bg-slate-900 text-sky-300 rounded-xl font-mono text-[11px] overflow-x-auto">
{`export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';
export type MessageType = 'text' | 'image' | 'video' | 'document' | 'voice' | 'voice_note' | 'file' | 'system';

export interface Message {
  id: string;               // UUID v4
  conversation_id: string;  // Shared 1:1 or Group conversation ID
  sender_id: string;        // Authenticated user UUID
  sender_name?: string;     // Sender display name
  receiver_id?: string;     // Recipient or Group ID
  content: string;          // Text or caption
  type: MessageType;        // 'text' | 'image' | 'video' | 'document' | 'voice_note' | 'file'
  media_url?: string;       // Base64 thumbnail or CDN URL
  thumbnail_url?: string;   // Image/Video preview thumbnail URL
  mime_type?: string;       // MIME type (e.g. video/mp4, application/pdf)
  file_size?: number;       // Size in bytes
  duration?: number;        // Media duration in seconds (for voice/video)
  file_name?: string;       // Document/File display name
  created_at: string;       // ISO 8601 Timestamp
  status: MessageStatus;    // 'sending' -> 'sent' -> 'delivered' -> 'read'
  read_at?: string | null;  // Read timestamp
  is_group?: boolean;       // Group message flag
  group_id?: string;        // Target group ID
  reply_to?: {             // Replying context
    id: string;
    sender_name: string;
    content: string;
  } | null;
}`}
                  </pre>
                </div>

                <div className="space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-500" />
                    WebSocket Event Types Table
                  </h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-800">
                        <tr>
                          <th className="p-2.5">Event Name</th>
                          <th className="p-2.5">Direction</th>
                          <th className="p-2.5">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr>
                          <td className="p-2.5 font-mono text-sky-600 font-semibold">auth</td>
                          <td className="p-2.5">Client → Server</td>
                          <td className="p-2.5">Authenticates socket session with `userId` and user info.</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-mono text-sky-600 font-semibold">message:send</td>
                          <td className="p-2.5">Client → Server</td>
                          <td className="p-2.5">Submits 1:1 message payload for delivery.</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-mono text-sky-600 font-semibold">message:ack</td>
                          <td className="p-2.5">Server → Client</td>
                          <td className="p-2.5">Acknowledges server receipt (`sent` status with single tick).</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-mono text-sky-600 font-semibold">message:receive</td>
                          <td className="p-2.5">Server → Client</td>
                          <td className="p-2.5">Delivers 1:1 message to target recipient in real-time.</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-mono text-sky-600 font-semibold">message:read</td>
                          <td className="p-2.5">Client → Server</td>
                          <td className="p-2.5">Triggers read receipt when receiver focuses open chat thread.</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-mono text-sky-600 font-semibold">typing:start / stop</td>
                          <td className="p-2.5">Bi-directional</td>
                          <td className="p-2.5">Emits real-time typing indicator status to target contact.</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-mono text-sky-600 font-semibold">sync:offline</td>
                          <td className="p-2.5">Client → Server</td>
                          <td className="p-2.5">Flushes pending offline messages queued in IndexedDB on reconnect.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'caching' && (
              <div className="space-y-6">
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <Database className="w-4 h-4 text-emerald-600" />
                    <span>Dual-Tier Offline Caching Architecture</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Cove utilizes an offline-first data model. Reads are fulfilled instantly from <strong>IndexedDB</strong> (`cove_offline_store`) and <strong>LocalStorage</strong> before network requests resolve. When the device is offline, sent messages are stored in a local <strong>`pending_sync` queue</strong> and automatically flushed upon reconnection.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 space-y-1">
                    <h4 className="font-bold text-slate-800 text-xs">1. Instant Read Strategy</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      On app launch, message history and contact list load instantly from IndexedDB in 0 milliseconds.
                    </p>
                  </div>
                  <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 space-y-1">
                    <h4 className="font-bold text-slate-800 text-xs">2. Offline Queueing</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      If `navigator.onLine === false`, messages receive status `sending` with a clock icon and enter the IndexedDB `pending_sync` store.
                    </p>
                  </div>
                  <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 space-y-1">
                    <h4 className="font-bold text-slate-800 text-xs">3. Background Sync</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Upon reconnection, `syncOfflineQueue()` flushes pending items via WebSocket and updates statuses to `sent`/`delivered`.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'animations' && (
              <div className="space-y-6">
                <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <span>WhatsApp Motion & Timing Specifications</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Animations strictly adhere to WhatsApp spring physics (150ms–250ms duration, stiffness 400, damping 28) for high precision and zero lag.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-3 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900">Message Bubble Entrance (`MessageBubbleEnter`)</h4>
                      <p className="text-[11px] text-slate-500">Pop and subtle slide (16px horizontal shift, spring damping 28)</p>
                    </div>
                    <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-mono font-bold text-slate-700">180ms Spring</span>
                  </div>

                  <div className="p-3 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900">Chat List Reordering (`ListItemEnter`)</h4>
                      <p className="text-[11px] text-slate-500">Staggered entrance fade & vertical shift (180ms duration)</p>
                    </div>
                    <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-mono font-bold text-slate-700">180ms Ease</span>
                  </div>

                  <div className="p-3 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900">Typing Indicator (`TypingDot`)</h4>
                      <p className="text-[11px] text-slate-500">Infinite wave pulse loop with 0.7s duration across 3 dots</p>
                    </div>
                    <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-mono font-bold text-slate-700">0.7s Loop</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                    <Lock className="w-4 h-4" />
                    <span>Security, Authentication & Integrity Notes</span>
                  </div>
                  <ul className="space-y-2 text-slate-300 text-[11px] list-disc list-inside leading-relaxed">
                    <li><strong className="text-white">Session Authentication</strong>: Users authenticate via Supabase Auth JWT tokens before initiating WebSocket session handshakes.</li>
                    <li><strong className="text-white">Message Verification</strong>: Server verifies `sender_id` matches the authenticated socket connection to prevent impersonation.</li>
                    <li><strong className="text-white">Scalability Design</strong>: For high concurrency (100k+ users), the WebSocket layer can be backed by Redis Pub/Sub channels to distribute sockets across multiple container instances.</li>
                    <li><strong className="text-white">E2EE Ready</strong>: Data model supports Client-side public/private key exchanges (Signal protocol or AES-256-GCM) where payload content is encrypted client-side prior to transit.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
            <span className="text-[10px] text-slate-500 font-mono">
              Cove 1:1 WhatsApp Architecture &bull; Built with Express, React & Motion
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Close Overview
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
