import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Lock,
  Bell,
  Monitor,
  ShieldCheck,
  Camera,
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Check,
  Smartphone,
  Trash2,
  LogOut,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { authService, type SessionItem } from '@/auth/authService';

type SettingsTab = 'account' | 'security' | 'notifications' | 'sessions' | 'privacy';

export function Settings() {
  const { profile, updateProfile, refreshProfile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');

  // --- Profile Information State ---
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [confirmNewEmail, setConfirmNewEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; newEmail?: string; confirmNewEmail?: string }>({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // --- Password Confirmation for Direct Email Change ---
  const [showPasswordConfirmModal, setShowPasswordConfirmModal] = useState(false);
  const [emailChangePassword, setEmailChangePassword] = useState('');
  const [showEmailChangePassword, setShowEmailChangePassword] = useState(false);
  const [emailChangePasswordError, setEmailChangePasswordError] = useState<string | null>(null);

  // --- Avatar State ---
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Change Password State ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // --- Sessions State ---
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionsFeedback, setSessionsFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // --- Notification Preferences ---
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    securityNotifications: true,
    marketingUpdates: false,
    newReleases: true,
  });

  // --- Privacy Preferences ---
  const [privacy, setPrivacy] = useState({
    profilePublic: false,
    activityTracking: true,
    shareDiagnostics: false,
  });

  // Initialize profile values from current auth state
  useEffect(() => {
    if (profile) {
      setUsername(profile.fullName || profile.userId || '');
      setEmail(profile.email || '');
      // Check for saved local avatar
      const savedAvatar = localStorage.getItem(`skinlab_avatar_${profile.id}`);
      if (savedAvatar) {
        setAvatarUrl(savedAvatar);
      }
    }
  }, [profile]);

  // Load sessions when the sessions tab is active
  useEffect(() => {
    if (activeTab === 'sessions') {
      loadSessions();
    }
  }, [activeTab]);

  const loadSessions = async () => {
    setLoadingSessions(true);
    setSessionsFeedback(null);
    try {
      const data = await authService.getSessions();
      setSessions(data);
    } catch {
      setSessionsFeedback({ type: 'error', message: 'Unable to load active sessions.' });
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await authService.revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setSessionsFeedback({ type: 'success', message: 'Session revoked successfully.' });
    } catch (err) {
      setSessionsFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to revoke session.',
      });
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!window.confirm('Are you sure you want to log out all other active sessions?')) return;
    try {
      await authService.revokeAllSessions();
      await loadSessions();
      setSessionsFeedback({ type: 'success', message: 'All other sessions have been revoked.' });
    } catch (err) {
      setSessionsFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to revoke all sessions.',
      });
    }
  };

  // Avatar Upload Handler
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setProfileFeedback({ type: 'error', message: 'Avatar image must be smaller than 2MB.' });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setAvatarUrl(result);
        if (profile?.id) {
          localStorage.setItem(`skinlab_avatar_${profile.id}`, result);
        }
        setProfileFeedback({ type: 'success', message: 'Profile picture updated.' });
      };
      reader.readAsDataURL(file);
    }
  };

  const validateEmailFormat = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleNewEmailBlur = async () => {
    const trimmed = newEmail.trim();
    if (!trimmed) return;
    if (!validateEmailFormat(trimmed)) {
      setFieldErrors((prev) => ({ ...prev, newEmail: 'Please enter a valid email address.' }));
      return;
    }
    if (trimmed.toLowerCase() === email.trim().toLowerCase()) {
      setFieldErrors((prev) => ({ ...prev, newEmail: 'New email must be different from current email address.' }));
      return;
    }
    try {
      const res = await authService.checkEmail(trimmed);
      if (!res.available) {
        setFieldErrors((prev) => ({
          ...prev,
          newEmail: res.message || 'This email address is already registered.',
        }));
      } else {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next.newEmail;
          return next;
        });
      }
    } catch {
      // ignore network errors on blur
    }
  };

  // Profile Information Submit
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFeedback(null);

    const errors: { username?: string; newEmail?: string; confirmNewEmail?: string } = {};

    if (!username.trim()) {
      errors.username = 'Username cannot be empty.';
    }

    const trimmedNewEmail = newEmail.trim();
    const trimmedConfirm = confirmNewEmail.trim();
    const isChangingEmail = Boolean(trimmedNewEmail || trimmedConfirm);

    if (isChangingEmail) {
      if (!trimmedNewEmail) {
        errors.newEmail = 'Please enter your new email address.';
      } else if (!validateEmailFormat(trimmedNewEmail)) {
        errors.newEmail = 'Please enter a valid email address.';
      } else if (trimmedNewEmail.toLowerCase() === email.trim().toLowerCase()) {
        errors.newEmail = 'New email must be different from current email address.';
      }

      if (!trimmedConfirm) {
        errors.confirmNewEmail = 'Please confirm your new email address.';
      } else if (trimmedNewEmail && trimmedNewEmail.toLowerCase() !== trimmedConfirm.toLowerCase()) {
        errors.confirmNewEmail = 'New email address and confirm email address do not match.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    // Check if new email is registered before proceeding
    if (isChangingEmail && trimmedNewEmail) {
      try {
        const check = await authService.checkEmail(trimmedNewEmail);
        if (!check.available) {
          setFieldErrors((prev) => ({
            ...prev,
            newEmail: check.message || 'This email address is already registered.',
          }));
          return;
        }
      } catch {
        // Continue to server request which also verifies
      }
    }

    setFieldErrors({});

    // If changing email, prompt for current password verification
    if (isChangingEmail && trimmedNewEmail) {
      setEmailChangePassword('');
      setEmailChangePasswordError(null);
      setShowPasswordConfirmModal(true);
      return;
    }

    // Otherwise only saving username
    setProfileSaving(true);
    try {
      await updateProfile({
        fullName: username.trim(),
      });
      await refreshProfile();
      setProfileFeedback({ type: 'success', message: 'Profile updated successfully.' });
    } catch (err) {
      setProfileFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Unable to update profile.',
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleConfirmEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailChangePassword) {
      setEmailChangePasswordError('Please enter your current password.');
      return;
    }
    setEmailChangePasswordError(null);
    setProfileSaving(true);

    try {
      // 1. Update username if changed
      if (username.trim() !== (profile?.fullName || profile?.userId || '')) {
        await updateProfile({ fullName: username.trim() });
      }

      // 2. Direct email update with current password verification
      const res = await authService.changeEmail(newEmail.trim(), emailChangePassword);
      setEmail(res.user.email);
      setNewEmail('');
      setConfirmNewEmail('');
      setEmailChangePassword('');
      setShowPasswordConfirmModal(false);
      await refreshProfile();
      setProfileFeedback({
        type: 'success',
        message: 'Email address updated successfully.',
      });
    } catch (err) {
      setEmailChangePasswordError(err instanceof Error ? err.message : 'Failed to update email address.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleCancelProfile = () => {
    if (profile) {
      setUsername(profile.fullName || profile.userId || '');
      setEmail(profile.email || '');
    }
    setNewEmail('');
    setConfirmNewEmail('');
    setFieldErrors({});
    setProfileFeedback(null);
    setShowPasswordConfirmModal(false);
    setEmailChangePassword('');
    setEmailChangePasswordError(null);
  };

  // Password Requirements Logic
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);
  const isPasswordValid = hasMinLength && hasUppercase && hasNumber && hasSpecialChar;

  // Change Password Submit
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (!currentPassword) {
      setPasswordFeedback({ type: 'error', message: 'Please enter your current password.' });
      return;
    }
    if (!newPassword) {
      setPasswordFeedback({ type: 'error', message: 'Please enter a new password.' });
      return;
    }
    if (!isPasswordValid) {
      setPasswordFeedback({
        type: 'error',
        message: 'Password must satisfy all security requirements below.',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'New password and confirm password do not match.' });
      return;
    }

    setPasswordUpdating(true);
    try {
      await authService.changePassword(newPassword, currentPassword || undefined);
      setPasswordFeedback({ type: 'success', message: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Unable to update password.',
      });
    } finally {
      setPasswordUpdating(false);
    }
  };

  const handleCancelPassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordFeedback(null);
  };

  // Initial letter for the avatar
  const avatarLetter = (username || profile?.fullName || profile?.email || 'I')
    .trim()
    .slice(0, 1)
    .toUpperCase();

  return (
    <div className="w-full min-h-[calc(100vh-120px)] bg-white py-8 sm:py-10">
      <div className="max-w-[1240px] mx-auto">
        {/* ============================================================ */}
        {/* PAGE HEADING WITH GEOMETRIC DECORATIVE ACCENTS               */}
        {/* ============================================================ */}
        <div className="relative flex items-center justify-between pb-8 sm:pb-10">
          <div className="flex items-start gap-3.5 z-10">
            {/* 3D Isometric Cube Icon (Exact from reference) */}
            <div className="mt-1 text-[#191B36] shrink-0">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-sm"
              >
                <path d="M12 2.5L20.5 7.4V16.6L12 21.5L3.5 16.6V7.4L12 2.5Z" />
                <path d="M12 12L20.5 7.4" />
                <path d="M12 12V21.5" />
                <path d="M12 12L3.5 7.4" />
              </svg>
            </div>

            <div>
              <h1 className="font-display text-3xl sm:text-[34px] font-extrabold text-[#191B36] tracking-tight leading-none">
                Settings
              </h1>
              <p className="mt-1.5 text-xs sm:text-[13px] text-[#777987] font-medium">
                Manage your account, security and preferences.
              </p>
              {/* Lime Green Accent Underline Bar */}
              <div className="w-12 h-[3px] bg-[#C5F044] rounded-full mt-2" />
            </div>
          </div>

          {/* RIGHT SIDE GEOMETRIC DECORATIVE GRAPHICS (Exact from reference) */}
          <div className="relative hidden md:flex items-center justify-end h-20 w-44 pointer-events-none select-none z-0">
            {/* Top Lime Green Quarter / Semicircle */}
            <div className="absolute top-0 right-14 w-14 h-14 bg-[#C5F044] rounded-tr-full rounded-br-none rounded-tl-full opacity-95" />

            {/* Bottom Sky Blue Semicircle */}
            <div className="absolute bottom-1 right-24 w-12 h-6 bg-[#5798F5] rounded-b-full opacity-90" />

            {/* Crosshatch 3x3 Grid Box */}
            <div className="absolute top-1 right-0 w-16 h-16 border border-[#191B36]/20 bg-transparent">
              <div className="w-full h-1/3 border-b border-[#191B36]/20" />
              <div className="w-full h-1/3 border-b border-[#191B36]/20" />
              <div className="absolute top-0 left-1/3 w-1/3 h-full border-x border-[#191B36]/20" />
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* MAIN SETTINGS DASHBOARD GRID LAYOUT                          */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          {/* ---------------------------------------------------------- */}
          {/* LEFT SIDEBAR NAVIGATION CARD                               */}
          {/* ---------------------------------------------------------- */}
          <aside className="md:col-span-4 lg:col-span-3 bg-[#F8F9FB] rounded-[20px] border border-[#E9EAF0] p-3 sm:p-3.5 shadow-sm space-y-1 h-auto md:h-full flex flex-col justify-start">
            {/* Item 1: Account */}
            <button
              type="button"
              onClick={() => setActiveTab('account')}
              className={`w-full flex items-start gap-3.5 px-4 py-3.5 rounded-[18px] text-left transition-all ${
                activeTab === 'account'
                  ? 'bg-[#C5F044] text-[#191B36] shadow-sm font-semibold'
                  : 'text-[#191B36] hover:bg-white text-opacity-90'
              }`}
            >
              <User
                size={19}
                className={`mt-0.5 shrink-0 ${
                  activeTab === 'account' ? 'text-[#191B36]' : 'text-[#191B36]'
                }`}
                strokeWidth={2}
              />
              <div className="min-w-0">
                <span className="block text-sm font-bold leading-snug">Account</span>
                <span
                  className={`block text-[11px] truncate mt-0.5 ${
                    activeTab === 'account' ? 'text-[#191B36]/80 font-medium' : 'text-[#777987]'
                  }`}
                >
                  Profile and personal information
                </span>
              </div>
            </button>

            {/* Item 2: Security */}
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-start gap-3.5 px-4 py-3.5 rounded-[18px] text-left transition-all ${
                activeTab === 'security'
                  ? 'bg-[#C5F044] text-[#191B36] shadow-sm font-semibold'
                  : 'text-[#191B36] hover:bg-white text-opacity-90'
              }`}
            >
              <Lock
                size={19}
                className={`mt-0.5 shrink-0 ${
                  activeTab === 'security' ? 'text-[#191B36]' : 'text-[#191B36]'
                }`}
                strokeWidth={2}
              />
              <div className="min-w-0">
                <span className="block text-sm font-bold leading-snug">Security</span>
                <span
                  className={`block text-[11px] truncate mt-0.5 ${
                    activeTab === 'security' ? 'text-[#191B36]/80 font-medium' : 'text-[#777987]'
                  }`}
                >
                  Password and account protection
                </span>
              </div>
            </button>

            {/* Item 3: Notifications */}
            <button
              type="button"
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-start gap-3.5 px-4 py-3.5 rounded-[18px] text-left transition-all ${
                activeTab === 'notifications'
                  ? 'bg-[#C5F044] text-[#191B36] shadow-sm font-semibold'
                  : 'text-[#191B36] hover:bg-white text-opacity-90'
              }`}
            >
              <Bell
                size={19}
                className={`mt-0.5 shrink-0 ${
                  activeTab === 'notifications' ? 'text-[#191B36]' : 'text-[#191B36]'
                }`}
                strokeWidth={2}
              />
              <div className="min-w-0">
                <span className="block text-sm font-bold leading-snug">Notifications</span>
                <span
                  className={`block text-[11px] truncate mt-0.5 ${
                    activeTab === 'notifications' ? 'text-[#191B36]/80 font-medium' : 'text-[#777987]'
                  }`}
                >
                  Manage email and alerts
                </span>
              </div>
            </button>

            {/* Item 4: Sessions */}
            <button
              type="button"
              onClick={() => setActiveTab('sessions')}
              className={`w-full flex items-start gap-3.5 px-4 py-3.5 rounded-[18px] text-left transition-all ${
                activeTab === 'sessions'
                  ? 'bg-[#C5F044] text-[#191B36] shadow-sm font-semibold'
                  : 'text-[#191B36] hover:bg-white text-opacity-90'
              }`}
            >
              <Monitor
                size={19}
                className={`mt-0.5 shrink-0 ${
                  activeTab === 'sessions' ? 'text-[#191B36]' : 'text-[#191B36]'
                }`}
                strokeWidth={2}
              />
              <div className="min-w-0">
                <span className="block text-sm font-bold leading-snug">Sessions</span>
                <span
                  className={`block text-[11px] truncate mt-0.5 ${
                    activeTab === 'sessions' ? 'text-[#191B36]/80 font-medium' : 'text-[#777987]'
                  }`}
                >
                  Manage your active sessions
                </span>
              </div>
            </button>

            {/* Item 5: Privacy */}
            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className={`w-full flex items-start gap-3.5 px-4 py-3.5 rounded-[18px] text-left transition-all ${
                activeTab === 'privacy'
                  ? 'bg-[#C5F044] text-[#191B36] shadow-sm font-semibold'
                  : 'text-[#191B36] hover:bg-white text-opacity-90'
              }`}
            >
              <ShieldCheck
                size={19}
                className={`mt-0.5 shrink-0 ${
                  activeTab === 'privacy' ? 'text-[#191B36]' : 'text-[#191B36]'
                }`}
                strokeWidth={2}
              />
              <div className="min-w-0">
                <span className="block text-sm font-bold leading-snug">Privacy</span>
                <span
                  className={`block text-[11px] truncate mt-0.5 ${
                    activeTab === 'privacy' ? 'text-[#191B36]/80 font-medium' : 'text-[#777987]'
                  }`}
                >
                  Data and visibility preferences
                </span>
              </div>
            </button>
          </aside>

          {/* ---------------------------------------------------------- */}
          {/* RIGHT MAIN CONTENT CARDS                                   */}
          {/* ---------------------------------------------------------- */}
          <main className="md:col-span-8 lg:col-span-9 flex flex-col gap-6">
            {/* TAB: ACCOUNT (Default - shows Profile Info & Change Password) */}
            {(activeTab === 'account' || activeTab === 'security') && (
              <>
                {/* ==================================================== */}
                {/* CARD 1: PROFILE INFORMATION                          */}
                {/* ==================================================== */}
                {activeTab === 'account' && (
                  <section className="bg-white rounded-[20px] border border-[#E9EAF0] p-6 sm:p-7 shadow-[0_2px_12px_rgba(23,26,53,0.02)]">
                    {/* Header */}
                    <div className="flex items-center gap-3 pb-6">
                      <div className="w-9 h-9 rounded-full bg-[#EBF7C2] flex items-center justify-center text-[#191B36] shrink-0">
                        <User size={18} strokeWidth={2.2} />
                      </div>
                      <div>
                        <h2 className="font-display text-lg font-bold text-[#191B36] tracking-tight">
                          Profile Information
                        </h2>
                        <p className="text-xs text-[#777987]">
                          Update your public profile details.
                        </p>
                      </div>
                    </div>

                    {/* Feedback message */}
                    {profileFeedback && (
                      <div
                        className={`mb-5 p-3 rounded-xl flex items-center gap-2.5 text-xs font-semibold ${
                          profileFeedback.type === 'success'
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}
                      >
                        {profileFeedback.type === 'success' ? (
                          <Check size={16} className="text-green-600 shrink-0" />
                        ) : (
                          <AlertCircle size={16} className="text-red-600 shrink-0" />
                        )}
                        <span>{profileFeedback.message}</span>
                      </div>
                    )}

                    <form onSubmit={handleSaveProfile}>
                      {/* Avatar & Fields Row */}
                      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 pb-6">
                        {/* Avatar Section */}
                        <div className="flex flex-col items-center shrink-0">
                          <div className="relative group">
                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#C5F044] flex items-center justify-center overflow-hidden border border-black/5 shadow-sm">
                              {avatarUrl ? (
                                <img
                                  src={avatarUrl}
                                  alt="Profile"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="font-display font-extrabold text-3xl sm:text-4xl text-[#191B36]">
                                  {avatarLetter}
                                </span>
                              )}
                            </div>

                            {/* Camera overlay button */}
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#191B36] text-white flex items-center justify-center hover:bg-black transition-colors shadow-md border-2 border-white cursor-pointer"
                              title="Change profile picture"
                              aria-label="Upload photo"
                            >
                              <Camera size={14} />
                            </button>

                            <input
                              type="file"
                              ref={fileInputRef}
                              accept="image/*"
                              onChange={handleAvatarChange}
                              className="hidden"
                            />
                          </div>
                        </div>

                        {/* Subtle Vertical Divider */}
                        <div className="hidden md:block w-[1px] bg-[#E9EAF0] self-stretch" />

                        {/* Input Fields */}
                        <div className="flex-1 w-full space-y-4">
                          {/* 1. Username */}
                          <div>
                            <label className="block text-xs font-bold text-[#191B36] mb-1.5">
                              Username
                            </label>
                            <div className="relative flex items-center">
                              <User
                                size={15}
                                className="absolute left-4 text-gray-400 pointer-events-none"
                              />
                              <input
                                type="text"
                                value={username}
                                onChange={(e) => {
                                  setUsername(e.target.value);
                                  if (fieldErrors.username) {
                                    setFieldErrors((prev) => ({ ...prev, username: undefined }));
                                  }
                                }}
                                placeholder="Enter username"
                                className={`w-full pl-11 pr-4 py-2.5 text-xs sm:text-sm font-medium text-[#191B36] bg-white border rounded-full outline-none transition-all ${
                                  fieldErrors.username
                                    ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                                    : 'border-[#E9EAF0] focus:border-[#C5F044] focus:ring-2 focus:ring-[#C5F044]/20'
                                }`}
                              />
                            </div>
                            {fieldErrors.username && (
                              <p className="mt-1.5 pl-4 text-[11px] font-medium text-red-600 flex items-center gap-1.5">
                                <AlertCircle size={12} className="shrink-0" />
                                <span>{fieldErrors.username}</span>
                              </p>
                            )}
                          </div>

                          {/* 2. Current Email Address */}
                          <div>
                            <label className="block text-xs font-bold text-[#191B36] mb-1.5">
                              Current Email Address
                            </label>
                            <div className="relative flex items-center">
                              <Mail
                                size={15}
                                className="absolute left-4 text-gray-400 pointer-events-none"
                              />
                              <input
                                type="email"
                                value={email}
                                readOnly
                                disabled
                                className="w-full pl-11 pr-4 py-2.5 text-xs sm:text-sm font-medium text-[#777987] bg-[#F8F9FB] border border-[#E9EAF0] rounded-full cursor-not-allowed select-none outline-none"
                              />
                            </div>
                          </div>

                          {/* 3. New Email Address */}
                          <div>
                            <label className="block text-xs font-bold text-[#191B36] mb-1.5">
                              New Email Address
                            </label>
                            <div className="relative flex items-center">
                              <Mail
                                size={15}
                                className="absolute left-4 text-gray-400 pointer-events-none"
                              />
                              <input
                                type="email"
                                value={newEmail}
                                onChange={(e) => {
                                  setNewEmail(e.target.value);
                                  if (fieldErrors.newEmail) {
                                    setFieldErrors((prev) => ({ ...prev, newEmail: undefined }));
                                  }
                                }}
                                onBlur={handleNewEmailBlur}
                                placeholder="Enter your new email address"
                                className={`w-full pl-11 pr-4 py-2.5 text-xs sm:text-sm font-medium text-[#191B36] bg-white border rounded-full outline-none transition-all ${
                                  fieldErrors.newEmail
                                    ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                                    : 'border-[#E9EAF0] focus:border-[#C5F044] focus:ring-2 focus:ring-[#C5F044]/20'
                                }`}
                              />
                            </div>
                            {fieldErrors.newEmail && (
                              <p className="mt-1.5 pl-4 text-[11px] font-medium text-red-600 flex items-center gap-1.5">
                                <AlertCircle size={12} className="shrink-0" />
                                <span>{fieldErrors.newEmail}</span>
                              </p>
                            )}
                          </div>

                          {/* 4. Confirm New Email Address */}
                          <div>
                            <label className="block text-xs font-bold text-[#191B36] mb-1.5">
                              Confirm New Email Address
                            </label>
                            <div className="relative flex items-center">
                              <Mail
                                size={15}
                                className="absolute left-4 text-gray-400 pointer-events-none"
                              />
                              <input
                                type="email"
                                value={confirmNewEmail}
                                onChange={(e) => {
                                  setConfirmNewEmail(e.target.value);
                                  if (fieldErrors.confirmNewEmail) {
                                    setFieldErrors((prev) => ({ ...prev, confirmNewEmail: undefined }));
                                  }
                                }}
                                placeholder="Confirm your new email address"
                                className={`w-full pl-11 pr-4 py-2.5 text-xs sm:text-sm font-medium text-[#191B36] bg-white border rounded-full outline-none transition-all ${
                                  fieldErrors.confirmNewEmail
                                    ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                                    : 'border-[#E9EAF0] focus:border-[#C5F044] focus:ring-2 focus:ring-[#C5F044]/20'
                                }`}
                              />
                            </div>
                            {fieldErrors.confirmNewEmail && (
                              <p className="mt-1.5 pl-4 text-[11px] font-medium text-red-600 flex items-center gap-1.5">
                                <AlertCircle size={12} className="shrink-0" />
                                <span>{fieldErrors.confirmNewEmail}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E9EAF0]/60">
                        <button
                          type="button"
                          onClick={handleCancelProfile}
                          disabled={profileSaving}
                          className="px-6 py-2 rounded-full border border-[#E9EAF0] bg-white text-xs sm:text-sm font-semibold text-[#191B36] hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={profileSaving}
                          className="px-6 py-2 rounded-full bg-[#C5F044] text-xs sm:text-sm font-bold text-[#191B36] hover:brightness-95 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                        >
                          {profileSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>

                      {/* Password Confirmation Modal for Direct Email Change */}
                      {showPasswordConfirmModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                          <div className="bg-white rounded-[24px] border border-[#E9EAF0] p-6 sm:p-7 shadow-2xl max-w-md w-full">
                            <div className="flex items-center gap-3 pb-4 border-b border-[#E9EAF0]/60">
                              <div className="w-10 h-10 rounded-full bg-[#EBF7C2] flex items-center justify-center text-[#191B36] shrink-0">
                                <Lock size={18} strokeWidth={2.2} />
                              </div>
                              <div>
                                <h3 className="font-display text-base sm:text-lg font-bold text-[#191B36]">
                                  Confirm Email Change
                                </h3>
                                <p className="text-xs text-[#777987]">
                                  Security verification required
                                </p>
                              </div>
                            </div>

                            <p className="text-xs sm:text-sm text-[#777987] mt-4">
                              You are changing your account email address to{' '}
                              <strong className="text-[#191B36]">{newEmail.trim()}</strong>. Please enter your
                              current password to confirm this change.
                            </p>

                            {emailChangePasswordError && (
                              <div className="mt-3.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
                                <AlertCircle size={15} className="shrink-0" />
                                <span>{emailChangePasswordError}</span>
                              </div>
                            )}

                            <div className="mt-4">
                              <label className="block text-xs font-bold text-[#191B36] mb-1.5">
                                Current Password
                              </label>
                              <div className="relative flex items-center">
                                <Lock
                                  size={15}
                                  className="absolute left-4 text-gray-400 pointer-events-none"
                                />
                                <input
                                  type={showEmailChangePassword ? 'text' : 'password'}
                                  value={emailChangePassword}
                                  onChange={(e) => {
                                    setEmailChangePassword(e.target.value);
                                    if (emailChangePasswordError) setEmailChangePasswordError(null);
                                  }}
                                  placeholder="Enter your current password"
                                  autoFocus
                                  className="w-full pl-11 pr-11 py-2.5 text-xs sm:text-sm font-medium text-[#191B36] bg-white border border-[#E9EAF0] rounded-full outline-none focus:border-[#C5F044] focus:ring-2 focus:ring-[#C5F044]/20 transition-all"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowEmailChangePassword(!showEmailChangePassword)}
                                  className="absolute right-4 text-gray-400 hover:text-[#191B36] transition-colors"
                                >
                                  {showEmailChangePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#E9EAF0]/60">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowPasswordConfirmModal(false);
                                  setEmailChangePassword('');
                                  setEmailChangePasswordError(null);
                                }}
                                disabled={profileSaving}
                                className="px-5 py-2 rounded-full border border-[#E9EAF0] bg-white text-xs sm:text-sm font-semibold text-[#191B36] hover:bg-gray-50 transition-colors disabled:opacity-50"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={handleConfirmEmailChange}
                                disabled={profileSaving || !emailChangePassword}
                                className="px-5 py-2 rounded-full bg-[#C5F044] text-xs sm:text-sm font-bold text-[#191B36] hover:brightness-95 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                              >
                                {profileSaving ? 'Updating...' : 'Confirm & Save'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </form>
                  </section>
                )}

                {/* ==================================================== */}
                {/* CARD 2: CHANGE PASSWORD                              */}
                {/* ==================================================== */}
                <section className="bg-white rounded-[20px] border border-[#E9EAF0] p-6 sm:p-7 shadow-[0_2px_12px_rgba(23,26,53,0.02)]">
                  {/* Header */}
                  <div className="flex items-center gap-3 pb-6">
                    <div className="w-9 h-9 rounded-full bg-[#EBF7C2] flex items-center justify-center text-[#191B36] shrink-0">
                      <Lock size={18} strokeWidth={2.2} />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-bold text-[#191B36] tracking-tight">
                        Change Password
                      </h2>
                      <p className="text-xs text-[#777987]">
                        Keep your account secure with a strong password.
                      </p>
                    </div>
                  </div>

                  {/* Feedback message */}
                  {passwordFeedback && (
                    <div
                      className={`mb-5 p-3 rounded-xl flex items-center gap-2.5 text-xs font-semibold ${
                        passwordFeedback.type === 'success'
                          ? 'bg-green-50 text-green-800 border border-green-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}
                    >
                      {passwordFeedback.type === 'success' ? (
                        <Check size={16} className="text-green-600 shrink-0" />
                      ) : (
                        <AlertCircle size={16} className="text-red-600 shrink-0" />
                      )}
                      <span>{passwordFeedback.message}</span>
                    </div>
                  )}

                  <form onSubmit={handleUpdatePassword} className="space-y-4">
                    {/* Row 1: Current Password */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4">
                      <label className="w-full sm:w-44 lg:w-48 shrink-0 text-xs sm:text-sm font-semibold text-[#191B36]">
                        Current Password
                      </label>
                      <div className="relative flex-1 flex items-center">
                        <Lock
                          size={15}
                          className="absolute left-4 text-gray-400 pointer-events-none"
                        />
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter your current password"
                          className="w-full pl-11 pr-11 py-2.5 text-xs sm:text-sm font-medium text-[#191B36] bg-white border border-[#E9EAF0] rounded-full outline-none focus:border-[#C5F044] focus:ring-2 focus:ring-[#C5F044]/20 transition-all placeholder-[#777987]/70"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-4 p-1 text-gray-400 hover:text-[#191B36] transition-colors"
                          aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                        >
                          {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Row 2: New Password */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4">
                      <label className="w-full sm:w-44 lg:w-48 shrink-0 text-xs sm:text-sm font-semibold text-[#191B36]">
                        New Password
                      </label>
                      <div className="relative flex-1 flex items-center">
                        <Lock
                          size={15}
                          className="absolute left-4 text-gray-400 pointer-events-none"
                        />
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter a new password"
                          className="w-full pl-11 pr-11 py-2.5 text-xs sm:text-sm font-medium text-[#191B36] bg-white border border-[#E9EAF0] rounded-full outline-none focus:border-[#C5F044] focus:ring-2 focus:ring-[#C5F044]/20 transition-all placeholder-[#777987]/70"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-4 p-1 text-gray-400 hover:text-[#191B36] transition-colors"
                          aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                        >
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Row 3: Confirm New Password */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4">
                      <label className="w-full sm:w-44 lg:w-48 shrink-0 text-xs sm:text-sm font-semibold text-[#191B36]">
                        Confirm New Password
                      </label>
                      <div className="relative flex-1 flex items-center">
                        <Lock
                          size={15}
                          className="absolute left-4 text-gray-400 pointer-events-none"
                        />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm your new password"
                          className="w-full pl-11 pr-11 py-2.5 text-xs sm:text-sm font-medium text-[#191B36] bg-white border border-[#E9EAF0] rounded-full outline-none focus:border-[#C5F044] focus:ring-2 focus:ring-[#C5F044]/20 transition-all placeholder-[#777987]/70"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 p-1 text-gray-400 hover:text-[#191B36] transition-colors"
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* PASSWORD VALIDATION INDICATORS (Exact 4 requirements from reference) */}
                    <div className="pt-2 sm:pl-[180px] lg:pl-[196px]">
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] sm:text-xs">
                        {/* Requirement 1: At least 8 characters */}
                        <div
                          className={`flex items-center gap-1.5 transition-colors ${
                            hasMinLength ? 'text-[#191B36] font-semibold' : 'text-[#777987]'
                          }`}
                        >
                          <CheckCircle2
                            size={14}
                            className={hasMinLength ? 'text-green-600' : 'text-gray-300'}
                          />
                          <span>At least 8 characters</span>
                        </div>

                        {/* Requirement 2: One uppercase letter */}
                        <div
                          className={`flex items-center gap-1.5 transition-colors ${
                            hasUppercase ? 'text-[#191B36] font-semibold' : 'text-[#777987]'
                          }`}
                        >
                          <CheckCircle2
                            size={14}
                            className={hasUppercase ? 'text-green-600' : 'text-gray-300'}
                          />
                          <span>One uppercase letter</span>
                        </div>

                        {/* Requirement 3: One number */}
                        <div
                          className={`flex items-center gap-1.5 transition-colors ${
                            hasNumber ? 'text-[#191B36] font-semibold' : 'text-[#777987]'
                          }`}
                        >
                          <CheckCircle2
                            size={14}
                            className={hasNumber ? 'text-green-600' : 'text-gray-300'}
                          />
                          <span>One number</span>
                        </div>

                        {/* Requirement 4: One special character */}
                        <div
                          className={`flex items-center gap-1.5 transition-colors ${
                            hasSpecialChar ? 'text-[#191B36] font-semibold' : 'text-[#777987]'
                          }`}
                        >
                          <CheckCircle2
                            size={14}
                            className={hasSpecialChar ? 'text-green-600' : 'text-gray-300'}
                          />
                          <span>One special character</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Action Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#E9EAF0]/60">
                      <button
                        type="button"
                        onClick={handleCancelPassword}
                        disabled={passwordUpdating}
                        className="px-6 py-2 rounded-full border border-[#E9EAF0] bg-white text-xs sm:text-sm font-semibold text-[#191B36] hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={passwordUpdating}
                        className="px-6 py-2 rounded-full bg-[#C5F044] text-xs sm:text-sm font-bold text-[#191B36] hover:brightness-95 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                      >
                        {passwordUpdating ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  </form>
                </section>
              </>
            )}

            {/* TAB: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <section className="bg-white rounded-[20px] border border-[#E9EAF0] p-6 sm:p-7 shadow-[0_2px_12px_rgba(23,26,53,0.02)] space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-[#E9EAF0]">
                  <div className="w-9 h-9 rounded-full bg-[#EBF7C2] flex items-center justify-center text-[#191B36] shrink-0">
                    <Bell size={18} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-[#191B36] tracking-tight">
                      Notification Preferences
                    </h2>
                    <p className="text-xs text-[#777987]">
                      Manage when and how you receive alerts and communications.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Toggle 1 */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F8F9FB] border border-[#E9EAF0]">
                    <div>
                      <span className="block text-sm font-bold text-[#191B36]">
                        Email Notifications
                      </span>
                      <span className="block text-xs text-[#777987] mt-0.5">
                        Receive essential account, order, and security notifications via email.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setNotifications((p) => ({ ...p, emailAlerts: !p.emailAlerts }))
                      }
                      className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                        notifications.emailAlerts ? 'bg-[#C5F044]' : 'bg-gray-200'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-[#191B36] transition-transform ${
                          notifications.emailAlerts ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Toggle 2 */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F8F9FB] border border-[#E9EAF0]">
                    <div>
                      <span className="block text-sm font-bold text-[#191B36]">
                        Security Alerts
                      </span>
                      <span className="block text-xs text-[#777987] mt-0.5">
                        Instant notifications about new logins and password updates.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setNotifications((p) => ({
                          ...p,
                          securityNotifications: !p.securityNotifications,
                        }))
                      }
                      className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                        notifications.securityNotifications ? 'bg-[#C5F044]' : 'bg-gray-200'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-[#191B36] transition-transform ${
                          notifications.securityNotifications ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Toggle 3 */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F8F9FB] border border-[#E9EAF0]">
                    <div>
                      <span className="block text-sm font-bold text-[#191B36]">
                        New Design Drops
                      </span>
                      <span className="block text-xs text-[#777987] mt-0.5">
                        Get notified when brand new limited edition laptop skins are launched.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setNotifications((p) => ({ ...p, newReleases: !p.newReleases }))
                      }
                      className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                        notifications.newReleases ? 'bg-[#C5F044]' : 'bg-gray-200'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-[#191B36] transition-transform ${
                          notifications.newReleases ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* TAB: SESSIONS */}
            {activeTab === 'sessions' && (
              <section className="bg-white rounded-[20px] border border-[#E9EAF0] p-6 sm:p-7 shadow-[0_2px_12px_rgba(23,26,53,0.02)] space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-[#E9EAF0] flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#EBF7C2] flex items-center justify-center text-[#191B36] shrink-0">
                      <Monitor size={18} strokeWidth={2.2} />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-bold text-[#191B36] tracking-tight">
                        Active Sessions
                      </h2>
                      <p className="text-xs text-[#777987]">
                        These devices and browsers are currently logged into your account.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={loadSessions}
                      className="p-2 rounded-full border border-[#E9EAF0] text-[#191B36] hover:bg-gray-50 transition-colors"
                      title="Refresh sessions"
                    >
                      <RefreshCw size={15} className={loadingSessions ? 'animate-spin' : ''} />
                    </button>
                    {sessions.length > 1 && (
                      <button
                        type="button"
                        onClick={handleRevokeAllSessions}
                        className="px-4 py-2 rounded-full border border-red-200 bg-red-50 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors flex items-center gap-1.5"
                      >
                        <LogOut size={13} />
                        Log out all other sessions
                      </button>
                    )}
                  </div>
                </div>

                {sessionsFeedback && (
                  <div
                    className={`p-3 rounded-xl flex items-center gap-2.5 text-xs font-semibold ${
                      sessionsFeedback.type === 'success'
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {sessionsFeedback.type === 'success' ? (
                      <Check size={16} className="text-green-600" />
                    ) : (
                      <AlertCircle size={16} className="text-red-600" />
                    )}
                    <span>{sessionsFeedback.message}</span>
                  </div>
                )}

                {loadingSessions ? (
                  <div className="py-12 text-center text-xs text-[#777987]">
                    Loading active sessions...
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#777987]">
                    No active sessions found.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessions.map((sess, idx) => {
                      const isCurrent = idx === 0;
                      const isMobile = /Mobile|Android|iPhone/i.test(sess.userAgent || '');
                      return (
                        <div
                          key={sess.id}
                          className="flex items-center justify-between p-4 rounded-2xl bg-[#F8F9FB] border border-[#E9EAF0]"
                        >
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-white border border-[#E9EAF0] flex items-center justify-center text-[#191B36]">
                              {isMobile ? <Smartphone size={18} /> : <Monitor size={18} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs sm:text-sm font-bold text-[#191B36]">
                                  {sess.userAgent
                                    ? sess.userAgent.split(' ')[0]
                                    : 'Desktop Browser'}
                                </span>
                                {isCurrent && (
                                  <span className="px-2 py-0.5 rounded-full bg-[#C5F044] text-[10px] font-bold text-[#191B36]">
                                    Current Session
                                  </span>
                                )}
                              </div>
                              <span className="block text-[11px] text-[#777987] mt-0.5">
                                IP: {sess.ipAddress || '127.0.0.1'} • Started{' '}
                                {new Date(sess.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => handleRevokeSession(sess.id)}
                              className="p-2 rounded-full text-gray-400 hover:text-red-600 hover:bg-white transition-colors"
                              title="Revoke session"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* TAB: PRIVACY */}
            {activeTab === 'privacy' && (
              <section className="bg-white rounded-[20px] border border-[#E9EAF0] p-6 sm:p-7 shadow-[0_2px_12px_rgba(23,26,53,0.02)] space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-[#E9EAF0]">
                  <div className="w-9 h-9 rounded-full bg-[#EBF7C2] flex items-center justify-center text-[#191B36] shrink-0">
                    <ShieldCheck size={18} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-[#191B36] tracking-tight">
                      Data & Privacy Preferences
                    </h2>
                    <p className="text-xs text-[#777987]">
                      Control how your data and profile visibility are managed.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F8F9FB] border border-[#E9EAF0]">
                    <div>
                      <span className="block text-sm font-bold text-[#191B36]">
                        Public Profile Visibility
                      </span>
                      <span className="block text-xs text-[#777987] mt-0.5">
                        Allow other SkinLab community members to see your designer profile.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setPrivacy((p) => ({ ...p, profilePublic: !p.profilePublic }))
                      }
                      className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                        privacy.profilePublic ? 'bg-[#C5F044]' : 'bg-gray-200'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-[#191B36] transition-transform ${
                          privacy.profilePublic ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F8F9FB] border border-[#E9EAF0]">
                    <div>
                      <span className="block text-sm font-bold text-[#191B36]">
                        Personalized Recommendations
                      </span>
                      <span className="block text-xs text-[#777987] mt-0.5">
                        Use your preview studio and browsing history to suggest laptop skins.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setPrivacy((p) => ({ ...p, activityTracking: !p.activityTracking }))
                      }
                      className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                        privacy.activityTracking ? 'bg-[#C5F044]' : 'bg-gray-200'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-[#191B36] transition-transform ${
                          privacy.activityTracking ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E9EAF0] flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-[#191B36]">Export Account Data</h3>
                    <p className="text-[11px] text-[#777987]">
                      Download an archive of your account details, wishlists and designs.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => alert('An export link will be prepared and sent to your email.')}
                    className="px-4 py-2 rounded-full border border-[#E9EAF0] bg-white text-xs font-bold text-[#191B36] hover:bg-gray-50 transition-colors"
                  >
                    Request Archive
                  </button>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default Settings;
