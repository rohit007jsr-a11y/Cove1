import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import {
  Palette,
  X,
  Sparkles,
  Layers,
  Activity,
  Plus,
  Trash2,
  Send,
  Sliders,
  Check,
  Eye,
  Settings,
  User,
  MessageSquare,
  RefreshCw,
  Search,
  CheckCheck,
  Mic,
  Video,
  Phone,
  Paperclip,
  Smile,
  Shield,
  ArrowLeft,
  ChevronRight,
  Accessibility,
  SlidersHorizontal,
  Volume2,
} from 'lucide-react';

import { DESIGN_TOKENS } from '../theme/themeConfig';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Avatar } from './ui/Avatar';
import { Badge } from './ui/Badge';
import {
  FadeIn,
  SlideUp,
  ScaleIn,
  MessageBubbleEnter,
  ListItemEnter,
  LayoutListContainer,
  TypingDot,
} from './animations/Animations';

interface DesignSystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

interface MockContact {
  id: string;
  name: string;
  avatar: string;
  lastMsg: string;
  time: string;
  unread: number;
  online: boolean;
}

interface MockMessage {
  id: string;
  sender: 'me' | 'other';
  content: string;
  time: string;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'voice';
}

export const DesignSystemModal: React.FC<DesignSystemModalProps> = ({
  isOpen,
  onClose,
  showToast,
}) => {
  // Active sandbox section tabs
  const [activeTab, setActiveTab] = useState<'tokens' | 'components' | 'animations' | 'pages'>('tokens');

  const { curves } = DESIGN_TOKENS.animations;

  // Animation Demo states
  const [simulateReducedMotion, setSimulateReducedMotion] = useState(false);
  const [uiAnimationSpeed, setUiAnimationSpeed] = useState<'normal' | 'fast' | 'reduced'>('normal');

  // Live Contacts state
  const [mockContacts, setMockContacts] = useState<MockContact[]>([
    { id: '1', name: 'Amelia Gray', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', lastMsg: 'I have verified the security codes!', time: '10:42 AM', unread: 2, online: true },
    { id: '2', name: 'Julian Vance', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', lastMsg: 'Are we doing the WebRTC test?', time: 'Yesterday', unread: 0, online: true },
    { id: '3', name: 'Sophia Chen', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', lastMsg: 'Let’s check the server log tonight.', time: 'Monday', unread: 1, online: false },
  ]);

  // Live Message State
  const [mockMessages, setMockMessages] = useState<MockMessage[]>([
    { id: 'm1', sender: 'other', content: 'Welcome to Cove! Here is the live design system playground.', time: '10:15 AM', status: 'read', type: 'text' },
    { id: 'm2', sender: 'me', content: 'Wow, the spring animation feels incredibly swift and natural!', time: '10:16 AM', status: 'read', type: 'text' },
  ]);
  const [inputMsgText, setInputMsgText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Input state for component testing
  const [testInputVal, setTestInputVal] = useState('');
  const [testInputErr, setTestInputErr] = useState('');

  // Page View demo selected screen
  const [demoScreen, setDemoScreen] = useState<'chats' | 'conversation' | 'settings'>('chats');

  // Theme settings states for demo settings page
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [appDensity, setAppDensity] = useState<'cozy' | 'standard'>('standard');
  const [fontSizeScale, setFontSizeScale] = useState<'sm' | 'md' | 'lg'>('md');

  // Triggering test toast in mock UI
  const triggerSandboxToast = () => {
    showToast('success', 'Micro-Interaction Action', 'This is a design system notification toast in action!');
  };

  // Live Contacts Functions
  const addMockContact = () => {
    const names = ['Elijah Black', 'Mia Patel', 'Liam O’Connor', 'Emma Watson', 'Nolan Cruz'];
    const msgs = ['Let’s connect over WebRTC!', 'Can you check my public keys?', 'Meeting in five.', 'Typing status active...'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomMsg = msgs[Math.floor(Math.random() * msgs.length)];
    const randomId = `contact_${Date.now()}`;
    const randomAvatar = `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 999999)}?w=150`;

    const newContact: MockContact = {
      id: randomId,
      name: randomName,
      avatar: randomAvatar,
      lastMsg: randomMsg,
      time: 'Just Now',
      unread: Math.floor(Math.random() * 3),
      online: Math.random() > 0.4,
    };

    setMockContacts((prev) => [newContact, ...prev]);
    showToast('info', 'List Updated', `Added contact: ${randomName}`);
  };

  const removeMockContact = (id: string, name: string) => {
    setMockContacts((prev) => prev.filter((c) => c.id !== id));
    showToast('info', 'List Updated', `Removed contact: ${name}`);
  };

  const sortContactsAlphabetically = () => {
    setMockContacts((prev) => [...prev].sort((a, b) => a.name.localeCompare(b.name)));
    showToast('success', 'Layout Transition', 'Contacts sorted alphabetically.');
  };

  // Live Chat Messaging
  const sendMockMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMsgText.trim()) return;

    const myMsg: MockMessage = {
      id: `m_me_${Date.now()}`,
      sender: 'me',
      content: inputMsgText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
      type: 'text',
    };

    setMockMessages((prev) => [...prev, myMsg]);
    setInputMsgText('');

    // Update status to delivered, then read
    setTimeout(() => {
      setMockMessages((prev) =>
        prev.map((m) => (m.id === myMsg.id ? { ...m, status: 'delivered' } : m))
      );
    }, 1000);

    setTimeout(() => {
      setMockMessages((prev) =>
        prev.map((m) => (m.id === myMsg.id ? { ...m, status: 'read' } : m))
      );
    }, 2000);

    // Trigger mock automatic response
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const incoming: MockMessage = {
        id: `m_other_${Date.now()}`,
        sender: 'other',
        content: `Got it! Reduced motion mode is currently ${simulateReducedMotion ? 'ACTIVE' : 'INACTIVE'}. Check out how smoothly this bubble popped in!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'read',
        type: 'text',
      };
      setMockMessages((prev) => [...prev, incoming]);
    }, 3200);
  };

  // Keyboard support: Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <MotionConfig reducedMotion={simulateReducedMotion ? "always" : "user"}>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 md:p-6 backdrop-blur-xs select-none"
        id="design-system-backdrop"
      >
        <SlideUp className="relative w-full max-w-5xl h-[92vh] max-h-[820px] bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
          
          {/* Header Bar */}
          <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center border border-sky-200">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-slate-900 font-display">Cove Global UI/UX & Animation System</h1>
                  <Badge variant="success" size="sm">Cove spec v1.0</Badge>
                </div>
                <p className="text-xs text-slate-500 leading-none mt-1">Design language tokens, highly-tuned spring mechanics, & accessible UI templates</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Reduced Motion Quick Switch */}
              <button
                onClick={() => {
                  setSimulateReducedMotion(!simulateReducedMotion);
                  showToast('info', 'Motion Adjusted', simulateReducedMotion ? 'Standard spring physics active.' : 'Reduced motion active. Smooth fades applied.');
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  simulateReducedMotion 
                    ? 'bg-amber-100 text-amber-800 border-amber-300' 
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
                title="Toggle Reduced Motion for Accessibility"
              >
                <Accessibility className="w-4 h-4" />
                <span className="hidden sm:inline">Reduced Motion:</span>
                <span>{simulateReducedMotion ? 'Enabled' : 'Disabled'}</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-sky-500"
                aria-label="Close Design System Playground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="px-6 py-2 border-b border-slate-100 bg-white flex items-center gap-1.5 shrink-0 overflow-x-auto">
            <button
              onClick={() => setActiveTab('tokens')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'tokens' ? 'bg-sky-500/10 text-sky-600' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>1. Design Tokens</span>
            </button>
            <button
              onClick={() => setActiveTab('components')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'components' ? 'bg-sky-500/10 text-sky-600' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>2. Component Sandbox</span>
            </button>
            <button
              onClick={() => setActiveTab('animations')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'animations' ? 'bg-sky-500/10 text-sky-600' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>3. Animation Timings</span>
            </button>
            <button
              onClick={() => setActiveTab('pages')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'pages' ? 'bg-sky-500/10 text-sky-600' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>4. High-Fidelity Demos</span>
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            
            {/* TAB 1: DESIGN TOKENS */}
            {activeTab === 'tokens' && (
              <FadeIn className="space-y-8">
                
                {/* 1. Color Palette Section */}
                <section className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-sans">1. Core Color Swatches (Contrast Compliant)</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <div className="h-14 rounded-xl bg-[#0EA5E9] shadow-inner border border-slate-900/5 flex items-end p-2.5"><span className="text-[10px] font-mono font-extrabold text-white">#0EA5E9</span></div>
                      <p className="text-xs font-bold text-slate-700 leading-none">Primary Teal/Sky</p>
                      <p className="text-[11px] text-slate-400">Buttons, highlights</p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="h-14 rounded-xl bg-[#0284C7] shadow-inner border border-slate-900/5 flex items-end p-2.5"><span className="text-[10px] font-mono font-extrabold text-white">#0284C7</span></div>
                      <p className="text-xs font-bold text-slate-700 leading-none">Primary Hover</p>
                      <p className="text-[11px] text-slate-400">Pressed button actions</p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="h-14 rounded-xl bg-[#E0F2FE] shadow-inner border border-slate-200 flex items-end p-2.5"><span className="text-[10px] font-mono font-extrabold text-sky-800">#E0F2FE</span></div>
                      <p className="text-xs font-bold text-slate-700 leading-none">Primary Subtle</p>
                      <p className="text-[11px] text-slate-400">Self bubbles, indicators</p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="h-14 rounded-xl bg-[#10B981] shadow-inner border border-slate-900/5 flex items-end p-2.5"><span className="text-[10px] font-mono font-extrabold text-white">#10B981</span></div>
                      <p className="text-xs font-bold text-slate-700 leading-none">Accent Success</p>
                      <p className="text-[11px] text-slate-400">Online tag, read checkmark</p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="h-14 rounded-xl bg-[#F8FAFC] border border-slate-200 shadow-xs flex items-end p-2.5"><span className="text-[10px] font-mono font-bold text-slate-500">#F8FAFC</span></div>
                      <p className="text-xs font-bold text-slate-700 leading-none">Cool Neutral Bg</p>
                      <p className="text-[11px] text-slate-400">Main app canvas backings</p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="h-14 rounded-xl bg-[#F1F5F9] border border-slate-200 shadow-xs flex items-end p-2.5"><span className="text-[10px] font-mono font-bold text-slate-500">#F1F5F9</span></div>
                      <p className="text-xs font-bold text-slate-700 leading-none">Slate Secondary</p>
                      <p className="text-[11px] text-slate-400">Unselected active widgets</p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="h-14 rounded-xl bg-[#94A3B8] border border-slate-400/20 shadow-xs flex items-end p-2.5"><span className="text-[10px] font-mono font-bold text-white">#94A3B8</span></div>
                      <p className="text-xs font-bold text-slate-700 leading-none">Slate Auxiliary</p>
                      <p className="text-[11px] text-slate-400">Timestamps, small details</p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="h-14 rounded-xl bg-[#0F172A] border border-slate-950 shadow-inner flex items-end p-2.5"><span className="text-[10px] font-mono font-bold text-slate-300">#0F172A</span></div>
                      <p className="text-xs font-bold text-slate-700 leading-none">Contrast Dark Slate</p>
                      <p className="text-[11px] text-slate-400">Header backdrops, overlays</p>
                    </div>
                  </div>
                </section>

                {/* 2. Typography & Scale */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">2. Typography Major Second (1.125) Scale</h3>
                    </div>

                    <div className="space-y-3">
                      <div className="border-b border-slate-100 pb-2.5">
                        <span className="text-[10px] font-mono text-slate-400">caption (11px) - Metadata & Timestamps</span>
                        <p className="text-[11px] text-slate-600 font-mono">10:42 AM &bull; Verifying...</p>
                      </div>
                      <div className="border-b border-slate-100 pb-2.5">
                        <span className="text-[10px] font-mono text-slate-400">xs (12px) - Status Badges & Small Tags</span>
                        <p className="text-[12px] font-semibold text-slate-800">Cove Active Developer</p>
                      </div>
                      <div className="border-b border-slate-100 pb-2.5">
                        <span className="text-[10px] font-mono text-slate-400">sm (14px) - Sidebar Subtitles & Body Copy</span>
                        <p className="text-[14px] text-slate-500">I have verified the security codes!</p>
                      </div>
                      <div className="border-b border-slate-100 pb-2.5">
                        <span className="text-[10px] font-mono text-slate-400">base (16px) - Core Message Bubble Copy</span>
                        <p className="text-[16px] text-slate-800 font-medium">Hello greyhound, we are ready to test the voice call stream.</p>
                      </div>
                      <div className="border-b border-slate-100 pb-2.5">
                        <span className="text-[10px] font-mono text-slate-400">lg (20px) - Section Titles & Header Headers</span>
                        <p className="text-[20px] font-extrabold text-slate-900 font-display">Sophia Chen</p>
                      </div>
                    </div>
                  </div>

                  {/* 3. Spacing & Border Radii Guidelines */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">3. Rhythm, Spacing, & Corner Nesting</h3>
                      </div>

                      <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
                        <div className="bg-sky-50 p-3.5 rounded-xl border border-sky-100 text-sky-800">
                          <p className="font-bold mb-1 uppercase text-[10px]">Mathematical Corner Nesting Formula</p>
                          <code className="block font-mono font-bold text-[11px] bg-white/75 px-1.5 py-0.5 rounded border border-sky-200 text-sky-600">
                            Inner Radius = Outer Radius - Distance/Padding
                          </code>
                          <p className="mt-1 text-[11px]">
                            Ensures corners stay perfectly parallel and aesthetically concentric. E.g. outer card 16px radius containing a widget with 12px padding must have exactly 4px inner radius.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <p className="font-bold uppercase text-[10px] text-slate-500">Spacing Rhythm Bounds:</p>
                          <ul className="list-disc pl-4 space-y-1">
                            <li><strong>Outer margins</strong> (base layout bounds) are kept strictly at <strong>16px (1rem)</strong>.</li>
                            <li><strong>Internal margins</strong> between chat messages are set to <strong>12px (0.75rem)</strong>.</li>
                            <li><strong>Buttons padding proportion:</strong> Horizontal padding is always exactly <strong>2x vertical padding</strong> to ensure symmetric balance.</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Demonstration of Perfect Nested Corners */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-2">
                        <span>Outer: 16px radius</span>
                        <span>Padding: 12px</span>
                        <span>Inner: 4px radius</span>
                      </div>
                      {/* Outer Card (16px / xl) */}
                      <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center">
                        {/* Inner Widget (4px / sm) */}
                        <div className="w-full bg-[#0EA5E9] p-3 rounded-xs text-white font-bold text-xs text-center shadow-2xs">
                          Perfect Nested Corner Layout
                        </div>
                      </div>
                    </div>

                  </div>

                </div>

              </FadeIn>
            )}

            {/* TAB 2: COMPONENT SANDBOX */}
            {activeTab === 'components' && (
              <FadeIn className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Buttons Sandbox */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs space-y-5">
                    <div className="border-b border-slate-100 pb-3">
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Button Variations & Haptics</h4>
                      <p className="text-[11px] text-slate-500">Supports micro-tap scaling, spring physics, focus-visible tabs, and loaders</p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2.5">
                        <Button variant="primary">Primary Button</Button>
                        <Button variant="secondary">Secondary</Button>
                        <Button variant="outline">Outline</Button>
                        <Button variant="destructive">Destructive</Button>
                        <Button variant="ghost">Ghost link</Button>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-600">Button Sizes</p>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <Button size="sm">Compact Small (sm)</Button>
                          <Button size="md">Standard Medium (md)</Button>
                          <Button size="lg">Large Highlight (lg)</Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2.5 pt-2 border-t border-slate-100">
                        <Button variant="primary" isLoading={true}>Primary loading</Button>
                        <Button variant="outline" disabled={true}>Disabled state</Button>
                      </div>
                    </div>
                  </div>

                  {/* Inputs Sandbox */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs space-y-5">
                    <div className="border-b border-slate-100 pb-3">
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Inputs & Real-time Validations</h4>
                      <p className="text-[11px] text-slate-500">Accessible labels, placeholder pairings, error layouts, and integrated icon paths</p>
                    </div>

                    <div className="space-y-4">
                      <Input
                        label="Username"
                        placeholder="Enter username (e.g. grayhound)"
                        value={testInputVal}
                        onChange={(e) => {
                          setTestInputVal(e.target.value);
                          if (e.target.value.length > 0 && e.target.value.length < 3) {
                            setTestInputErr('Username must be at least 3 characters long.');
                          } else {
                            setTestInputErr('');
                          }
                        }}
                        error={testInputErr}
                        helperText="Usernames must be lowercase alpha characters only."
                        icon={<User className="w-4.5 h-4.5" />}
                      />

                      <Input
                        label="Secure Peer Passkey"
                        type="password"
                        placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                        disabled={true}
                        helperText="System-generated security keys cannot be modified manually."
                        icon={<Shield className="w-4.5 h-4.5" />}
                      />
                    </div>
                  </div>

                  {/* Avatars Sandbox */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs space-y-5">
                    <div className="border-b border-slate-100 pb-3">
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Avatars & Fallbacks</h4>
                      <p className="text-[11px] text-slate-500">Integrated online/offline indicators, initials math, and scaling classes</p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-end gap-6">
                        <div className="flex flex-col items-center space-y-1">
                          <Avatar size="xs" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150" isOnline={true} />
                          <span className="text-[10px] font-mono text-slate-400">xs (24px)</span>
                        </div>
                        <div className="flex flex-col items-center space-y-1">
                          <Avatar size="sm" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150" isOnline={true} />
                          <span className="text-[10px] font-mono text-slate-400">sm (32px)</span>
                        </div>
                        <div className="flex flex-col items-center space-y-1">
                          <Avatar size="md" src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150" isOnline={true} />
                          <span className="text-[10px] font-mono text-slate-400">md (40px)</span>
                        </div>
                        <div className="flex flex-col items-center space-y-1">
                          <Avatar size="lg" src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150" isOnline={false} />
                          <span className="text-[10px] font-mono text-slate-400">lg (56px)</span>
                        </div>
                        <div className="flex flex-col items-center space-y-1">
                          <Avatar size="xl" src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150" isOnline={true} />
                          <span className="text-[10px] font-mono text-slate-400">xl (80px)</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center gap-4">
                        <div className="flex flex-col space-y-1">
                          <p className="text-[11px] text-slate-400">Initials Fallback</p>
                          <Avatar name="Julian Vance" size="md" />
                        </div>
                        <div className="flex flex-col space-y-1">
                          <p className="text-[11px] text-slate-400">Broken Link Fallback</p>
                          <Avatar src="https://broken-link.com/avatar.jpg" alt="Emma Watson" size="md" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Badges & Toast sandbox */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs space-y-5">
                    <div className="border-b border-slate-100 pb-3">
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Badges & Interactive Feedback</h4>
                      <p className="text-[11px] text-slate-500">Unwrapped text tags for alerts, unread counts, and triggers for global toast messages</p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2.5">
                        <Badge variant="primary">primary tag</Badge>
                        <Badge variant="success">success</Badge>
                        <Badge variant="warning">warning</Badge>
                        <Badge variant="danger">danger</Badge>
                        <Badge variant="slate">slate badge</Badge>
                      </div>

                      <div className="pt-4 border-t border-slate-100">
                        <p className="text-xs font-bold text-slate-600 mb-3">Notification Toast Micro-Interaction</p>
                        <Button variant="outline" size="sm" onClick={triggerSandboxToast}>
                          Trigger Test System Toast
                        </Button>
                      </div>
                    </div>
                  </div>

                </div>
              </FadeIn>
            )}

            {/* TAB 3: ANIMATION SYSTEM */}
            {activeTab === 'animations' && (
              <FadeIn className="space-y-8">
                
                {/* Guidelines Section */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <h4 className="text-xs font-extrabold text-[#0EA5E9] uppercase tracking-wider">1. The Golden Timings</h4>
                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                      <li><strong>100ms:</strong> Micro-interactions (hover overlays, tick pops, scale drops).</li>
                      <li><strong>150ms:</strong> Fast actions (message entrances, search bar triggers).</li>
                      <li><strong>220ms:</strong> Primary animations (dialog entries, sidebar slips, status slides).</li>
                      <li><strong>350ms:</strong> Deep navigation entries.</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-extrabold text-emerald-500 uppercase tracking-wider">2. When to Animate</h4>
                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                      <li>To establish <strong>spatial continuity</strong> (where an overlay came from).</li>
                      <li>To confirm <strong>instant response</strong> to a click or user submission.</li>
                      <li>To highlight <strong>context updates</strong> (a new bubble pops into the feed).</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-extrabold text-rose-500 uppercase tracking-wider">3. When NOT to Animate</h4>
                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                      <li><strong>Avoid infinite loops</strong> on non-typing status indicators (causes CPU drain).</li>
                      <li><strong>Avoid double animations</strong> (e.g. fading a parent container AND sliding all children separately).</li>
                      <li><strong>No forced transitions</strong> when Reduced Motion is enabled.</li>
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Interactive List sorting animation demo */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs flex flex-col h-[400px]">
                    <div className="border-b border-slate-100 pb-3 flex items-center justify-between shrink-0">
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Interactive List Sorting (layout transitions)</h4>
                        <p className="text-[11px] text-slate-500">Add, delete, or sort to witness Framer Motion layout springs in action</p>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <Button variant="outline" size="sm" onClick={sortContactsAlphabetically} className="!h-8 !px-2.5">
                          Sort A-Z
                        </Button>
                        <Button variant="primary" size="sm" onClick={addMockContact} className="!h-8 !px-2.5">
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </Button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pt-3">
                      <LayoutListContainer className="space-y-2">
                        <AnimatePresence initial={false}>
                          {mockContacts.map((contact, idx) => (
                            <ListItemEnter 
                              key={contact.id} 
                              index={idx}
                              layout="position"
                              className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/40 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-3 overflow-hidden">
                                <Avatar src={contact.avatar} alt={contact.name} isOnline={contact.online} size="sm" />
                                <div className="overflow-hidden">
                                  <h5 className="text-xs font-bold text-slate-800 truncate leading-tight">{contact.name}</h5>
                                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{contact.lastMsg}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0 ml-2">
                                {contact.unread > 0 && (
                                  <span className="w-4.5 h-4.5 bg-sky-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">
                                    {contact.unread}
                                  </span>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeMockContact(contact.id, contact.name);
                                  }}
                                  className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-md transition-colors"
                                  title="Delete Contact"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </ListItemEnter>
                          ))}
                        </AnimatePresence>
                      </LayoutListContainer>
                    </div>
                  </div>

                  {/* Interactive message bubble pop entrance demo */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs flex flex-col h-[400px]">
                    <div className="border-b border-slate-100 pb-3 shrink-0">
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Dynamic Message Bubble Pop (spring dynamics)</h4>
                      <p className="text-[11px] text-slate-500">Send message to witness physical scaling pop & slide transitions</p>
                    </div>

                    {/* Messages Frame */}
                    <div className="flex-1 overflow-y-auto bg-slate-100/40 border border-slate-100 rounded-xl p-4 my-3 flex flex-col space-y-3">
                      <div className="text-center">
                        <span className="px-2.5 py-0.5 bg-slate-200/60 rounded-md text-[10px] font-bold text-slate-500 tracking-wide uppercase">Cove Safe Channel</span>
                      </div>

                      <div className="flex-1 flex flex-col justify-end space-y-3">
                        <AnimatePresence initial={false}>
                          {mockMessages.map((msg) => {
                            const isMe = msg.sender === 'me';
                            return (
                              <MessageBubbleEnter
                                key={msg.id}
                                isOwn={isMe}
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                              >
                                <div
                                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 shadow-2xs text-sm relative leading-normal ${
                                    isMe
                                      ? 'bg-sky-500 text-white rounded-br-xs text-left'
                                      : 'bg-white text-slate-800 rounded-bl-xs text-left border border-slate-200/40'
                                  }`}
                                >
                                  <p className="font-semibold">{msg.content}</p>
                                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-70">
                                    <span>{msg.time}</span>
                                    {isMe && (
                                      <span>
                                        {msg.status === 'read' ? (
                                          <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />
                                        ) : msg.status === 'delivered' ? (
                                          <CheckCheck className="w-3.5 h-3.5 text-slate-300" />
                                        ) : (
                                          <Check className="w-3.5 h-3.5 text-slate-300" />
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </MessageBubbleEnter>
                            );
                          })}

                          {isTyping && (
                            <FadeIn className="flex justify-start">
                              <div className="bg-white border border-slate-200/40 rounded-2xl px-4 py-3 shadow-2xs flex items-center gap-1">
                                <TypingDot delay={0} />
                                <TypingDot delay={0.15} />
                                <TypingDot delay={0.3} />
                              </div>
                            </FadeIn>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Messages Send Form */}
                    <form onSubmit={sendMockMessage} className="flex gap-2 shrink-0">
                      <Input
                        placeholder="Type a preview message..."
                        value={inputMsgText}
                        onChange={(e) => setInputMsgText(e.target.value)}
                        className="!h-10 !text-xs"
                      />
                      <Button variant="primary" size="sm" type="submit" className="!h-10 !px-4 shrink-0">
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>

                  </div>

                </div>

              </FadeIn>
            )}

            {/* TAB 4: ACCESSIBLE PAGES VIEW DEMOS */}
            {activeTab === 'pages' && (
              <FadeIn className="space-y-6">
                
                {/* Switcher Header */}
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/60 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Device Viewport Simulator</h4>
                    <p className="text-[11px] text-slate-500">Experience true layout continuity, responsive scaling, and focus states across views</p>
                  </div>

                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/40">
                    <button
                      onClick={() => setDemoScreen('chats')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        demoScreen === 'chats' ? 'bg-white text-sky-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Chat List
                    </button>
                    <button
                      onClick={() => setDemoScreen('conversation')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        demoScreen === 'conversation' ? 'bg-white text-sky-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Active Chat
                    </button>
                    <button
                      onClick={() => setDemoScreen('settings')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        demoScreen === 'settings' ? 'bg-white text-sky-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Settings View
                    </button>
                  </div>
                </div>

                {/* Viewport Frame */}
                <div className="relative mx-auto w-full max-w-[420px] h-[500px] bg-white border-4 border-slate-800 rounded-3xl shadow-xl flex flex-col overflow-hidden">
                  
                  {/* Speaker Bar & Camera notch */}
                  <div className="absolute top-0 inset-x-0 h-4.5 bg-slate-800 flex items-center justify-center z-40">
                    <div className="w-16 h-1 rounded-full bg-slate-700" />
                  </div>

                  {/* Device Content Screen */}
                  <div className="w-full h-full pt-4.5 bg-slate-50 flex flex-col overflow-hidden relative">
                    <AnimatePresence mode="wait">
                      
                      {/* VIEWPORT 1: CHATS LISTING SCREEN */}
                      {demoScreen === 'chats' && (
                        <motion.div
                          key="screen_chats"
                          initial={{ opacity: 0, x: -15 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -15 }}
                          transition={{ duration: 0.22, ease: curves.smoothIn }}
                          className="absolute inset-0 pt-4.5 flex flex-col bg-white"
                        >
                          {/* Chats header */}
                          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/60">
                            <h3 className="font-extrabold text-base text-slate-800 font-display">Cove Messages</h3>
                            <div className="flex gap-1.5">
                              <button className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-500"><Search className="w-4 h-4" /></button>
                              <button className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-500" onClick={() => setDemoScreen('settings')}><Settings className="w-4 h-4" /></button>
                            </div>
                          </div>

                          {/* Quick Tabs */}
                          <div className="flex px-3 py-2 border-b border-slate-50 gap-1.5 shrink-0 overflow-x-auto">
                            <Badge variant="primary" size="sm" className="cursor-pointer">All Chats</Badge>
                            <Badge variant="slate" size="sm" className="cursor-pointer">Groups</Badge>
                            <Badge variant="slate" size="sm" className="cursor-pointer">Unread (3)</Badge>
                          </div>

                          {/* Chat row listings */}
                          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                            {mockContacts.map((contact) => (
                              <div
                                key={contact.id}
                                onClick={() => setDemoScreen('conversation')}
                                className="p-3.5 hover:bg-slate-50/80 transition-colors flex items-center justify-between cursor-pointer"
                              >
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <Avatar src={contact.avatar} alt={contact.name} isOnline={contact.online} size="md" />
                                  <div className="overflow-hidden">
                                    <h4 className="text-xs font-extrabold text-slate-800 truncate leading-tight">{contact.name}</h4>
                                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{contact.lastMsg}</p>
                                  </div>
                                </div>

                                <div className="text-right shrink-0 ml-2">
                                  <span className="text-[10px] text-slate-400 font-mono">{contact.time}</span>
                                  {contact.unread > 0 && (
                                    <span className="w-4 h-4 bg-[#0EA5E9] text-white text-[9px] font-extrabold rounded-full flex items-center justify-center mt-1 ml-auto shadow-2xs">
                                      {contact.unread}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {/* VIEWPORT 2: CONVERSATION ACTIVE THREAD */}
                      {demoScreen === 'conversation' && (
                        <motion.div
                          key="screen_conv"
                          initial={{ opacity: 0, x: 15 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 15 }}
                          transition={{ duration: 0.22, ease: curves.smoothIn }}
                          className="absolute inset-0 pt-4.5 flex flex-col bg-[#F8FAFC]"
                        >
                          {/* Thread Header */}
                          <div className="px-3 py-2 border-b border-slate-200/60 bg-white flex items-center justify-between shrink-0 shadow-3xs">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <button 
                                onClick={() => setDemoScreen('chats')} 
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
                              >
                                <ArrowLeft className="w-4 h-4" />
                              </button>
                              <Avatar src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150" alt="Amelia Gray" isOnline={true} size="sm" />
                              <div className="overflow-hidden">
                                <h4 className="text-xs font-extrabold text-slate-800 truncate leading-none">Amelia Gray</h4>
                                <span className="text-[9px] text-emerald-500 font-mono font-bold uppercase leading-none">Online</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button className="p-1 rounded hover:bg-slate-100 text-slate-500"><Phone className="w-3.5 h-3.5" /></button>
                              <button className="p-1 rounded hover:bg-slate-100 text-slate-500"><Video className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>

                          {/* Message feed content */}
                          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                            <div className="text-center my-1">
                              <span className="px-2 py-0.5 bg-slate-200/50 rounded text-[9px] font-mono text-slate-500 uppercase font-semibold">Active Encryption Key Verification</span>
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-start">
                                <div className="max-w-[85%] bg-white border border-slate-200/40 rounded-xl rounded-bl-xs px-3 py-2 text-[12px] text-slate-800 shadow-3xs">
                                  <span>Hey grayhound, did you verify the keys on the dashboard? Let me know if there are discrepancies.</span>
                                  <p className="text-[9px] text-slate-400 font-mono text-right mt-1">10:41 AM</p>
                                </div>
                              </div>

                              <div className="flex justify-end">
                                <div className="max-w-[85%] bg-sky-500 text-white rounded-xl rounded-br-xs px-3 py-2 text-[12px] shadow-3xs">
                                  <span>Yes Amelia! Verified and completely secure. Double tick checks are clean.</span>
                                  <div className="flex items-center justify-end gap-1 mt-1 text-[9px] opacity-75">
                                    <span>10:42 AM</span>
                                    <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Text input footer */}
                          <div className="p-2 border-t border-slate-150 bg-white flex items-center gap-1.5 shrink-0">
                            <button className="p-1 hover:bg-slate-100 text-slate-400 rounded"><Smile className="w-4 h-4" /></button>
                            <button className="p-1 hover:bg-slate-100 text-slate-400 rounded"><Paperclip className="w-4 h-4" /></button>
                            <input 
                              type="text" 
                              placeholder="Message..." 
                              className="flex-1 h-8 bg-slate-100 px-3 rounded-lg text-xs border border-transparent focus:outline-none focus:bg-white focus:border-sky-400"
                              readOnly
                            />
                            <button className="p-1.5 bg-sky-500 text-white rounded-lg"><Send className="w-3.5 h-3.5" /></button>
                          </div>

                        </motion.div>
                      )}

                      {/* VIEWPORT 3: SETTINGS ACCESSIBILITY PAGE */}
                      {demoScreen === 'settings' && (
                        <motion.div
                          key="screen_settings"
                          initial={{ opacity: 0, x: 15 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 15 }}
                          transition={{ duration: 0.22, ease: curves.smoothIn }}
                          className="absolute inset-0 pt-4.5 flex flex-col bg-white"
                        >
                          {/* Settings header */}
                          <div className="px-3 py-3 border-b border-slate-100 flex items-center gap-2 shrink-0">
                            <button 
                              onClick={() => setDemoScreen('chats')} 
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
                            >
                              <ArrowLeft className="w-4 h-4" />
                            </button>
                            <h3 className="font-extrabold text-sm text-slate-800">Accessibility Settings</h3>
                          </div>

                          <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            
                            <div className="space-y-3">
                              <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wide">Motion & Transition Physics</h4>
                              
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer">
                                  <span>Simulate Reduced Motion</span>
                                  <input 
                                    type="checkbox" 
                                    checked={simulateReducedMotion}
                                    onChange={(e) => {
                                      setSimulateReducedMotion(e.target.checked);
                                      showToast('info', 'Motion Mode', e.target.checked ? 'Smooth low-delay fades enabled.' : 'Spring dynamics enabled.');
                                    }}
                                    className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                                  />
                                </label>
                                <p className="text-[10px] text-slate-400 leading-normal">Override spring trajectories with swift linear fades. Protects from vestibular sensitivity.</p>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wide">Application Sizing Scales</h4>
                              
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-3">
                                <div className="space-y-1.5">
                                  <span className="text-xs font-semibold text-slate-700">Message Sizing Scale</span>
                                  <div className="grid grid-cols-3 gap-1.5 p-0.5 bg-slate-200/50 rounded-lg">
                                    {['sm', 'md', 'lg'].map((scale) => (
                                      <button
                                        key={scale}
                                        onClick={() => {
                                          setFontSizeScale(scale as any);
                                          showToast('success', 'Text Scale Updated', `Sizing scale adjusted to: ${scale.toUpperCase()}`);
                                        }}
                                        className={`py-1 text-[10px] font-bold rounded-md capitalize transition-all cursor-pointer ${
                                          fontSizeScale === scale ? 'bg-white text-sky-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                      >
                                        {scale}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <span className="text-xs font-semibold text-slate-700">Display Density</span>
                                  <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-slate-200/50 rounded-lg">
                                    {['standard', 'cozy'].map((density) => (
                                      <button
                                        key={density}
                                        onClick={() => {
                                          setAppDensity(density as any);
                                          showToast('success', 'Density Adjusted', `Display set to ${density}`);
                                        }}
                                        className={`py-1 text-[10px] font-bold rounded-md capitalize transition-all cursor-pointer ${
                                          appDensity === density ? 'bg-white text-sky-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                      >
                                        {density}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wide">Auditory System</h4>
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-700">Play Ringback Sound</span>
                                <button 
                                  onClick={() => setSoundEnabled(!soundEnabled)}
                                  className={`p-1 rounded-lg ${soundEnabled ? 'text-sky-600' : 'text-slate-400'}`}
                                >
                                  <Volume2 className="w-5 h-5" />
                                </button>
                              </div>
                            </div>

                          </div>
                        </motion.div>
                      )}

                    </AnimatePresence>
                  </div>

                  {/* Device Bottom Home Bar */}
                  <div className="absolute bottom-1 inset-x-0 h-4.5 bg-transparent flex items-center justify-center z-40">
                    <div className="w-28 h-1 rounded-full bg-slate-800/40" />
                  </div>

                </div>
              </FadeIn>
            )}

          </div>

          {/* Footer Guidelines Checkoff */}
          <div className="px-6 py-4.5 border-t border-slate-100 bg-slate-50/60 shrink-0 text-xs text-slate-500 font-semibold font-mono flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>WCAG AA Contrast Compliant Palette</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Dynamic Reduced-Motion Handlers Active</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span>Optimized Spring: stiffness=400, damping=28</span>
            </span>
          </div>

        </SlideUp>
      </div>
    </MotionConfig>
  );
};
