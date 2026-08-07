import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Camera,
  Edit3,
  Clock,
  Eye,
  Lock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Circle
} from 'lucide-react';
import { UserStatusGroup, StatusItem } from '../types';
import { StatusViewerModal } from './StatusViewerModal';
import { CreateStatusModal } from './CreateStatusModal';

interface StatusListProps {
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  statusGroups: UserStatusGroup[];
  onRefreshStatuses: () => void;
  onReplyToStatus?: (statusOwnerId: string, text: string) => void;
}

export const StatusList: React.FC<StatusListProps> = ({
  currentUserId,
  currentUserName,
  currentUserAvatar,
  statusGroups,
  onRefreshStatuses,
  onReplyToStatus,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [showViewedSection, setShowViewedSection] = useState(true);

  // Find own status group
  const ownGroup = statusGroups.find((g) => g.ownerId === currentUserId);
  const otherGroups = statusGroups.filter((g) => g.ownerId !== currentUserId);

  const recentUnviewedGroups = otherGroups.filter((g) => g.hasUnviewed);
  const viewedGroups = otherGroups.filter((g) => !g.hasUnviewed);

  const handleOpenGroupViewer = (group: UserStatusGroup) => {
    const idx = statusGroups.findIndex((g) => g.ownerId === group.ownerId);
    setActiveGroupIndex(idx >= 0 ? idx : 0);
    setIsViewerOpen(true);
  };

  const handleMarkViewed = async (statusId: string) => {
    try {
      await fetch(`/api/statuses/${statusId}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          userName: currentUserName,
          userAvatar: currentUserAvatar,
        }),
      });
      onRefreshStatuses();
    } catch (err) {
      console.error('Error marking status as viewed:', err);
    }
  };

  const handleDeleteStatus = async (statusId: string) => {
    try {
      await fetch(`/api/statuses/${statusId}`, {
        method: 'DELETE',
      });
      onRefreshStatuses();
    } catch (err) {
      console.error('Error deleting status:', err);
    }
  };

  const formatTimeAgo = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return `${Math.floor(hrs / 24)}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/60 overflow-y-auto select-none p-4 sm:p-6 space-y-6">
      {/* Top Section Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>Status</span>
            <span className="px-2 py-0.5 bg-sky-100 text-sky-700 text-[10px] font-mono font-bold rounded-full">
              24h Stories
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Share end-to-end encrypted updates that expire after 24 hours
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="px-3.5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Status</span>
        </button>
      </div>

      {/* 1. "My Status" Header Card */}
      <div className="bg-white rounded-3xl p-4 shadow-2xs border border-slate-200/80 flex items-center justify-between transition-all hover:border-slate-300">
        <div
          onClick={() => {
            if (ownGroup && ownGroup.statuses.length > 0) {
              handleOpenGroupViewer(ownGroup);
            } else {
              setIsCreateModalOpen(true);
            }
          }}
          className="flex items-center gap-4 cursor-pointer flex-1"
        >
          <div className="relative">
            <div
              className={`p-0.5 rounded-full transition-all ${
                ownGroup && ownGroup.statuses.length > 0
                  ? 'bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-600 p-[2.5px]'
                  : 'bg-transparent'
              }`}
            >
              <img
                src={
                  currentUserAvatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    currentUserName
                  )}&background=0284c7&color=fff`
                }
                alt="My Profile"
                className="w-13 h-13 rounded-full object-cover border-2 border-white"
              />
            </div>

            {(!ownGroup || ownGroup.statuses.length === 0) && (
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-sky-500 text-white rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            )}
          </div>

          <div>
            <h3 className="font-bold text-sm text-slate-900">My Status</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {ownGroup && ownGroup.statuses.length > 0
                ? `${ownGroup.statuses.length} status update${
                    ownGroup.statuses.length > 1 ? 's' : ''
                  } • ${formatTimeAgo(ownGroup.lastUpdated)}`
                : 'Tap to add a 24-hour status update'}
            </p>
          </div>
        </div>

        {/* View counter pill if user has active status */}
        {ownGroup && ownGroup.statuses.length > 0 && (
          <button
            type="button"
            onClick={() => handleOpenGroupViewer(ownGroup)}
            className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-sky-200/50"
          >
            <Eye className="w-3.5 h-3.5 text-sky-600" />
            <span>
              {ownGroup.statuses.reduce((acc, curr) => acc + curr.viewers.length, 0)} views
            </span>
          </button>
        )}
      </div>

      {/* 2. Recent Unviewed Updates */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 px-1">
          Recent Updates
        </h3>

        {recentUnviewedGroups.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-slate-200/60 text-slate-500 text-xs font-medium space-y-1">
            <Sparkles className="w-5 h-5 text-sky-400 mx-auto" />
            <p>No new status updates from contacts</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl divide-y divide-slate-100 shadow-2xs border border-slate-200/80 overflow-hidden">
            {recentUnviewedGroups.map((group) => (
              <div
                key={group.ownerId}
                onClick={() => handleOpenGroupViewer(group)}
                className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  {/* Vibrant Gradient Unviewed Status Ring */}
                  <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-sky-500 via-cyan-400 to-emerald-500 shadow-2xs">
                    <img
                      src={
                        group.ownerAvatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          group.ownerName
                        )}&background=0284c7&color=fff`
                      }
                      alt={group.ownerName}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white"
                    />
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{group.ownerName}</h4>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      {formatTimeAgo(group.lastUpdated)}
                    </p>
                  </div>
                </div>

                <div className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Viewed Updates Section */}
      {viewedGroups.length > 0 && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowViewedSection(!showViewedSection)}
            className="w-full flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-slate-400 px-1 hover:text-slate-600"
          >
            <span>Viewed Updates ({viewedGroups.length})</span>
            {showViewedSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showViewedSection && (
            <div className="bg-white rounded-3xl divide-y divide-slate-100 shadow-2xs border border-slate-200/80 overflow-hidden">
              {viewedGroups.map((group) => (
                <div
                  key={group.ownerId}
                  onClick={() => handleOpenGroupViewer(group)}
                  className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    {/* Muted Slate Viewed Status Ring */}
                    <div className="p-[2px] rounded-full bg-slate-300">
                      <img
                        src={
                          group.ownerAvatar ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            group.ownerName
                          )}&background=0284c7&color=fff`
                        }
                        alt={group.ownerName}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white opacity-85"
                      />
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-slate-800">{group.ownerName}</h4>
                      <p className="text-xs text-slate-400 mt-0.5 font-medium">
                        {formatTimeAgo(group.lastUpdated)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CreateStatusModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserAvatar={currentUserAvatar}
        onStatusCreated={onRefreshStatuses}
      />

      <StatusViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        statusGroups={statusGroups}
        initialGroupIndex={activeGroupIndex}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserAvatar={currentUserAvatar}
        onMarkViewed={handleMarkViewed}
        onDeleteStatus={handleDeleteStatus}
        onReplyToStatus={onReplyToStatus}
      />
    </div>
  );
};
