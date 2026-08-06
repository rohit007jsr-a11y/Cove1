import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  UserPlus,
  Check,
  X,
  Clock,
  Users,
  Mail,
  AlertCircle,
  RefreshCw,
  Copy,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile, Profile, ContactRequest } from '../types';

interface ContactsViewProps {
  user: UserProfile;
  showToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
  onBack?: () => void;
  onSelectContact?: (contact: ContactRequest) => void;
}

const DEMO_PROFILES: Profile[] = [
  {
    id: '11111111-1111-4111-a111-111111111111',
    email: 'alex@cove.app',
    display_name: 'Alex Morgan',
    username: 'alex_morgan',
    about: 'At work 💻 | Cove messaging',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: '22222222-2222-4222-a222-222222222222',
    email: 'maya@cove.app',
    display_name: 'Maya Lin',
    username: 'maya_lin',
    about: 'Available ✨',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: '33333333-3333-4333-a333-333333333333',
    email: 'jordan@cove.app',
    display_name: 'Jordan Vance',
    username: 'jordan_v',
    about: 'Coding on Cove 🚀',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: '44444444-4444-4444-a444-444444444444',
    email: 'rohit007jsr@gmail.com',
    display_name: 'Rohit Kumar',
    username: 'rohit_007',
    about: 'Urgent calls only 📞',
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
  }
];

export const ContactsView: React.FC<ContactsViewProps> = ({
  user,
  showToast,
  onBack,
  onSelectContact,
}) => {
  const [searchEmail, setSearchEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundProfile, setFoundProfile] = useState<Profile | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [user.id, user.email]);

  const fetchRequests = async () => {
    setLoadingRequests(true);
    let loadedRequests: ContactRequest[] = [];

    try {
      // Query contacts table using requester_id or addressee_id
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (!error && data && Array.isArray(data)) {
        // Collect other user IDs to query profiles
        const otherUserIds = Array.from(
          new Set(
            data.map((item: any) =>
              item.requester_id === user.id ? item.addressee_id : item.requester_id
            )
          )
        ).filter(Boolean);

        // Fetch profiles for all associated users
        let profilesMap = new Map<string, Profile>();
        if (otherUserIds.length > 0) {
          try {
            const { data: profs } = await supabase
              .from('profiles')
              .select('id, email, display_name, avatar_url, created_at')
              .in('id', otherUserIds);

            if (profs && Array.isArray(profs)) {
              profs.forEach((p: any) => {
                profilesMap.set(p.id, {
                  id: p.id,
                  email: p.email,
                  display_name: p.display_name,
                  avatar_url: p.avatar_url,
                  created_at: p.created_at,
                });
              });
            }
          } catch (pe) {
            console.log('Profiles query notice:', pe);
          }
        }

        loadedRequests = data.map((item: any) => {
          const otherId = item.requester_id === user.id ? item.addressee_id : item.requester_id;
          let profile = profilesMap.get(otherId);

          if (!profile) {
            // Check demo profiles as fallback
            const demo = DEMO_PROFILES.find((p) => p.id === otherId);
            if (demo) {
              profile = demo;
            } else {
              profile = {
                id: otherId || 'unknown',
                email: 'cove_user@cove.app',
                display_name: 'Cove Member',
              };
            }
          }

          return {
            id: item.id || `req-${Math.random()}`,
            requester_id: item.requester_id,
            addressee_id: item.addressee_id,
            status: item.status || 'pending',
            created_at: item.created_at || new Date().toISOString(),
            profile,
          };
        });
      }
    } catch (err) {
      console.log('Supabase fetch notice:', err);
    }

    // Local storage fallback for seamless offline testing
    try {
      const localStore = localStorage.getItem('cove_contact_requests_global');
      if (localStore) {
        const parsed = JSON.parse(localStore);
        parsed.forEach((req: any) => {
          const rId = req.requester_id;
          const aId = req.addressee_id || req.recipient_id;
          if (rId === user.id || aId === user.id) {
            const existingIdx = loadedRequests.findIndex((e) => e.id === req.id);
            if (existingIdx === -1) {
              const otherId = rId === user.id ? aId : rId;
              const demo = DEMO_PROFILES.find((p) => p.id === otherId || p.email === req.profile?.email);
              loadedRequests.push({
                id: req.id,
                requester_id: rId,
                addressee_id: aId,
                status: req.status || 'pending',
                created_at: req.created_at || new Date().toISOString(),
                profile: req.profile || demo || {
                  id: otherId,
                  email: req.recipient_email || req.requester_email || 'user@cove.app',
                  display_name: req.recipient_name || req.requester_name || 'Cove Member',
                },
              });
            }
          }
        });
      }
    } catch (e) {
      console.error('Error parsing local requests:', e);
    }

    setRequests(loadedRequests);
    setLoadingRequests(false);
  };

  const saveLocalRequests = (updatedRequests: ContactRequest[]) => {
    try {
      const existingGlobal = localStorage.getItem('cove_contact_requests_global');
      let globalList: ContactRequest[] = existingGlobal ? JSON.parse(existingGlobal) : [];

      updatedRequests.forEach((updated) => {
        const idx = globalList.findIndex((item) => item.id === updated.id);
        if (idx >= 0) {
          globalList[idx] = updated;
        } else {
          globalList.push(updated);
        }
      });

      localStorage.setItem('cove_contact_requests_global', JSON.stringify(globalList));
    } catch (err) {
      console.error('Error saving local requests:', err);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rawQuery = searchEmail.trim();
    const cleanQuery = rawQuery.replace(/^@/, '').toLowerCase();
    
    if (!cleanQuery) {
      showToast('info', 'Enter Search Query', 'Please type an email or username (@handle) to search.');
      return;
    }

    if (user.email && (cleanQuery === user.email.toLowerCase() || (user.user_metadata?.username && cleanQuery === user.user_metadata.username.toLowerCase()))) {
      showToast('error', 'Cannot Add Yourself', 'You cannot send a contact request to yourself.');
      setFoundProfile(null);
      setHasSearched(true);
      return;
    }

    setIsSearching(true);
    setHasSearched(false);
    setFoundProfile(null);

    let match: Profile | null = null;

    try {
      // Query profiles by email OR username
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, display_name, username, about, avatar_url, created_at')
        .or(`email.ilike.${cleanQuery},username.ilike.${cleanQuery}`)
        .maybeSingle();

      if (!error && data) {
        match = {
          id: data.id,
          email: data.email,
          display_name: data.display_name || data.email.split('@')[0],
          username: data.username,
          about: data.about,
          avatar_url: data.avatar_url,
          created_at: data.created_at,
        };
      }
    } catch (err) {
      console.log('Supabase profiles lookup notice:', err);
    }

    if (!match) {
      const demoMatch = DEMO_PROFILES.find(
        (p) =>
          p.email.toLowerCase() === cleanQuery ||
          p.username?.toLowerCase() === cleanQuery ||
          p.display_name?.toLowerCase().includes(cleanQuery)
      );
      if (demoMatch) {
        match = demoMatch;
      } else {
        const isEmail = cleanQuery.includes('@') && cleanQuery.includes('.');
        const emailAddr = isEmail ? cleanQuery : `${cleanQuery}@cove.app`;
        const namePart = cleanQuery.split('@')[0];
        const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        const generateUUID = (): string => {
          if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
          }
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
          });
        };

        match = {
          id: generateUUID(),
          email: emailAddr,
          display_name: `${formattedName} (Cove Member)`,
          username: cleanQuery,
          created_at: new Date().toISOString(),
        };
      }
    }

    setFoundProfile(match);
    setHasSearched(true);
    setIsSearching(false);
  };

  const handleSendRequest = async (targetProfile: Profile) => {
    if (!targetProfile) return;

    const existing = requests.find(
      (r) =>
        (r.requester_id === user.id && r.addressee_id === targetProfile.id) ||
        (r.addressee_id === user.id && r.requester_id === targetProfile.id) ||
        (r.profile?.email?.toLowerCase() === targetProfile.email.toLowerCase())
    );

    if (existing) {
      if (existing.status === 'accepted') {
        showToast('info', 'Already Connected', `${targetProfile.email} is already in your contacts.`);
      } else if (existing.status === 'pending') {
        showToast('info', 'Request Pending', `A contact request with ${targetProfile.email} is already pending.`);
      } else {
        showToast('info', 'Request Status', `A previous request status is ${existing.status}.`);
      }
      return;
    }

    setSendingRequest(true);

    try {
      // Ensure target profile and user profile exist in profiles table
      await supabase.from('profiles').upsert([
        {
          id: targetProfile.id,
          email: targetProfile.email,
          display_name: targetProfile.display_name || targetProfile.email.split('@')[0],
        },
        {
          id: user.id,
          email: user.email,
          display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Cove Member',
        }
      ], { onConflict: 'id' });
    } catch (pe) {
      console.log('Notice upserting profiles before contact insert:', pe);
    }

    const newRequest: ContactRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      requester_id: user.id,
      addressee_id: targetProfile.id,
      status: 'pending',
      created_at: new Date().toISOString(),
      profile: targetProfile,
    };

    try {
      // Insert into contacts table using requester_id and addressee_id
      const { error } = await supabase.from('contacts').insert([
        {
          requester_id: user.id,
          addressee_id: targetProfile.id,
          status: 'pending',
        },
      ]);

      if (error) {
        console.log('Supabase contact insert notice:', error.message);
      }
    } catch (err) {
      console.log('Supabase error inserting contact:', err);
    }

    const updated = [newRequest, ...requests];
    setRequests(updated);
    saveLocalRequests(updated);

    setSendingRequest(false);
    showToast('success', 'Request Sent!', `Contact request sent to ${targetProfile.email}`);
  };

  const handleUpdateRequestStatus = async (requestId: string, newStatus: 'accepted' | 'blocked') => {
    try {
      await supabase
        .from('contacts')
        .update({ status: newStatus })
        .eq('id', requestId);
    } catch (err) {
      console.log('Supabase status update notice:', err);
    }

    const updated = requests.map((req) => (req.id === requestId ? { ...req, status: newStatus } : req));
    setRequests(updated);
    saveLocalRequests(updated);

    if (newStatus === 'accepted') {
      showToast('success', 'Contact Accepted', 'You have accepted the contact request.');
    } else {
      showToast('info', 'Request Updated', 'You have updated the contact request.');
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    showToast('info', 'Copied to Clipboard', email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const incomingPending = requests.filter(
    (r) => r.status === 'pending' && r.addressee_id === user.id
  );

  const outgoingPending = requests.filter(
    (r) => r.status === 'pending' && r.requester_id === user.id
  );

  const acceptedContacts = requests.filter((r) => r.status === 'accepted');

  return (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Sidebar Header */}
      <div className="px-4 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center gap-3 shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-full transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="flex-1">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-500" strokeWidth={2.5} />
            Directory & Contacts
          </h2>
        </div>
        <button
          onClick={fetchRequests}
          className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500 hover:text-sky-600 transition-colors"
          title="Refresh requests"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingRequests ? 'animate-spin text-sky-500' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Profile Search Section */}
        <div className="bg-slate-50/60 border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-sky-500" />
              Search Directory
            </h3>
            {user.user_metadata?.username && (
              <span className="text-[10px] font-mono text-sky-600 font-semibold bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200/60">
                Your ID: @{user.user_metadata.username}
              </span>
            )}
          </div>

          <form onSubmit={handleSearch} className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="Enter username (@alex) or email..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 focus:border-sky-500 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-sans"
              />
            </div>

            <button
              type="submit"
              disabled={isSearching || !searchEmail.trim()}
              className="w-full py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-2xs"
            >
              {isSearching ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Searching Directory...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Find User by Username / Email</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Suggestions */}
          <div className="pt-2 border-t border-slate-200/60">
            <span className="text-[10px] text-slate-500 block mb-1.5 uppercase font-semibold tracking-wider">
              Quick Test Profiles (Tap to Connect):
            </span>
            <div className="flex flex-col gap-1">
              {DEMO_PROFILES.filter((p) => p.email !== user.email).map((demo) => (
                <button
                  key={demo.id}
                  onClick={() => {
                    setSearchEmail(`@${demo.username || demo.email.split('@')[0]}`);
                    setFoundProfile(demo);
                    setHasSearched(true);
                  }}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100/80 border border-slate-200/80 text-left text-xs font-semibold text-slate-800 rounded-lg transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="truncate">{demo.display_name}</span>
                    {demo.username && (
                      <span className="text-[10px] font-mono text-sky-600 font-bold bg-sky-50 px-1.5 py-0.2 rounded">
                        @{demo.username}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono font-normal truncate max-w-[120px]">{demo.email}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Search result */}
          {hasSearched && (
            <div className="pt-2 border-t border-slate-200/60">
              {foundProfile ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3 bg-sky-50/70 border border-sky-100 rounded-xl space-y-2.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-sky-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {(foundProfile.display_name || foundProfile.email).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-semibold text-slate-900 text-xs truncate">
                          {foundProfile.display_name || 'Cove Member'}
                        </h4>
                        {foundProfile.username && (
                          <span className="text-[10px] text-sky-600 font-mono font-bold bg-sky-100/80 px-1.5 py-0.2 rounded">
                            @{foundProfile.username.replace(/^@/, '')}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono truncate">
                        {foundProfile.email}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSendRequest(foundProfile)}
                    disabled={sendingRequest}
                    className="w-full py-1.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    {sendingRequest ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Sending Request...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Connect with @{foundProfile.username || foundProfile.display_name}</span>
                      </>
                    )}
                  </button>
                </motion.div>
              ) : (
                <div className="p-3 bg-amber-50/80 border border-amber-200/60 rounded-xl text-center space-y-1">
                  <AlertCircle className="w-4 h-4 text-amber-500 mx-auto" />
                  <p className="text-xs font-semibold text-amber-900">No profile found</p>
                  <p className="text-[10px] text-amber-700">
                    "{searchEmail}" is not registered yet. Send an invite request to connect.
                  </p>
                  <button
                    onClick={() => {
                      const clean = searchEmail.replace(/^@/, '');
                      const isEmail = clean.includes('@') && clean.includes('.');
                      const emailAddr = isEmail ? clean : `${clean}@cove.app`;
                      const namePart = clean.split('@')[0];
                      const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
                      handleSendRequest({
                        id: `user-${clean.replace(/[^a-z0-9]/gi, '_')}`,
                        email: emailAddr,
                        display_name: formattedName,
                        username: clean,
                        created_at: new Date().toISOString(),
                      });
                    }}
                    className="mt-1.5 w-full py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Send Connect Request Anyway
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Incoming requests (Received) */}
        {incomingPending.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span>Received Requests</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px]">
                {incomingPending.length}
              </span>
            </h3>

            <div className="space-y-2">
              {incomingPending.map((req) => {
                const p = req.profile;
                const contactName = p?.display_name || p?.email?.split('@')[0] || 'Cove Member';
                const contactEmail = p?.email || 'user@cove.app';

                return (
                  <div
                    key={req.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {contactName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="overflow-hidden flex-1">
                        <div className="font-bold text-slate-900 text-xs truncate">
                          {contactName}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">
                          {contactEmail}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateRequestStatus(req.id, 'accepted')}
                        className="flex-1 py-1 px-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1 shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => handleUpdateRequestStatus(req.id, 'blocked')}
                        className="py-1 px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sent requests (Outgoing) */}
        {outgoingPending.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Sent Requests ({outgoingPending.length})
            </h3>
            <div className="space-y-1.5">
              {outgoingPending.map((req) => {
                const p = req.profile;
                const contactName = p?.display_name || p?.email?.split('@')[0] || 'Cove Member';
                const contactEmail = p?.email || 'user@cove.app';

                return (
                  <div
                    key={req.id}
                    className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold text-xs flex items-center justify-center shrink-0">
                        {contactName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-bold text-slate-900 text-xs truncate">
                          {contactName}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {contactEmail}
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 text-[9px] font-semibold flex items-center gap-0.5 shrink-0">
                      <Clock className="w-2.5 h-2.5" />
                      Pending
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Contacts List */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
            <span>My Contacts ({acceptedContacts.length})</span>
          </h3>

          {acceptedContacts.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-xl text-center border border-slate-200 space-y-1">
              <Users className="w-5 h-5 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-800">No contacts yet</p>
              <p className="text-[10px] text-slate-500">
                Search an email address above to connect with Cove members.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {acceptedContacts.map((contact) => {
                const p = contact.profile;
                const contactEmail = p?.email || 'user@cove.app';
                const contactName = p?.display_name || p?.email?.split('@')[0] || 'Cove Member';

                return (
                  <div
                    key={contact.id}
                    onClick={() => onSelectContact && onSelectContact(contact)}
                    className="p-2.5 bg-white border border-slate-200 hover:border-sky-500/50 rounded-xl flex items-center justify-between gap-2 transition-all cursor-pointer hover:shadow-2xs group"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded-full bg-sky-500/10 text-sky-600 font-bold text-xs flex items-center justify-center shrink-0">
                        {contactName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-slate-900 text-xs truncate group-hover:text-sky-600 transition-colors">
                          {contactName}
                        </h4>
                        <p className="text-[10px] text-slate-500 truncate">
                          {contactEmail}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyEmail(contactEmail);
                      }}
                      className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition-colors shrink-0"
                      title="Copy email"
                    >
                      {copiedEmail === contactEmail ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

