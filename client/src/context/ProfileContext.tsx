import {

  createContext,

  useCallback,

  useContext,

  useEffect,

  useMemo,

  useRef,

  useState,

  type ReactNode,

} from 'react';

import { getApiErrorMessage } from '@/lib/apiErrors';

import { ApiError } from '@/api/client';

import { profilesApi, removeProfileAvatar, uploadProfileAvatar } from '@/api/profilesApi';

import { removeProfileResume, uploadProfileResume } from '@/api/profileUploadApi';

import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/models/auth';

import { syncAuthUserProfileId } from '@/api/client';

import { normalizeUserProfile } from '@/lib/normalizeProfile';

import type { UpdateUserProfileRequest, UserProfile } from '@/models/userProfile';



const CACHE_MS = 30_000;



interface ProfileContextValue {

  profile: UserProfile | null;

  loading: boolean;

  saving: boolean;

  error: string | null;

  reload: (force?: boolean) => Promise<void>;

  updateProfile: (data: UpdateUserProfileRequest) => Promise<UserProfile>;

  uploadAvatar: (file: File, onProgress?: (percent: number) => void) => Promise<UserProfile>;

  removeAvatar: () => Promise<UserProfile>;

  uploadResume: (file: File, onProgress?: (percent: number) => void) => Promise<UserProfile>;

  removeResume: () => Promise<UserProfile>;

}



const ProfileContext = createContext<ProfileContextValue | null>(null);



export function ProfileProvider({ children }: { children: ReactNode }) {

  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const lastLoadedRef = useRef(0);

  const profileRef = useRef<UserProfile | null>(null);



  profileRef.current = profile;



  const load = useCallback(async (force = false) => {

    if (!isAuthenticated || user?.role === UserRole.Company) {

      setProfile(null);

      profileRef.current = null;

      setLoading(false);

      setError(null);

      lastLoadedRef.current = 0;

      return;

    }



    if (!force && profileRef.current && Date.now() - lastLoadedRef.current < CACHE_MS) {

      setLoading(false);

      return;

    }



    setLoading(true);

    setError(null);

    try {

      const p = normalizeUserProfile(await profilesApi.getMe());

      setProfile(p);

      profileRef.current = p;

      lastLoadedRef.current = Date.now();

      syncAuthUserProfileId(p.id);

    } catch (e) {

      if (e instanceof ApiError && e.status === 404) {

        setProfile(null);

        profileRef.current = null;

      } else {

        const message = getApiErrorMessage(e, 'Failed to load profile');

        setError(message);

      }

    } finally {

      setLoading(false);

    }

  }, [isAuthenticated, user?.role]);



  useEffect(() => {

    if (authLoading) return;

    void load();

  }, [authLoading, load]);



  const refreshProfile = useCallback(async () => {

    const refreshed = normalizeUserProfile(await profilesApi.getMe());

    setProfile(refreshed);

    profileRef.current = refreshed;

    lastLoadedRef.current = Date.now();

    syncAuthUserProfileId(refreshed.id);

    return refreshed;

  }, []);



  const updateProfile = useCallback(async (data: UpdateUserProfileRequest) => {

    setSaving(true);

    setError(null);

    try {

      const updated = normalizeUserProfile(await profilesApi.updateMe(data));

      setProfile(updated);

      profileRef.current = updated;

      lastLoadedRef.current = Date.now();

      syncAuthUserProfileId(updated.id);

      return updated;

    } catch (e) {

      const message = getApiErrorMessage(e, 'Failed to save profile');

      setError(message);

      throw e;

    } finally {

      setSaving(false);

    }

  }, []);



  const uploadAvatar = useCallback(async (file: File, onProgress?: (percent: number) => void) => {

    setSaving(true);

    setError(null);

    try {

      await uploadProfileAvatar(file, onProgress);

      return await refreshProfile();

    } catch (e) {

      const message = e instanceof Error ? e.message : 'Failed to upload image';

      setError(message);

      throw e;

    } finally {

      setSaving(false);

    }

  }, [refreshProfile]);



  const removeAvatarFn = useCallback(async () => {

    setSaving(true);

    setError(null);

    try {

      await removeProfileAvatar();

      return await refreshProfile();

    } catch (e) {

      const message = e instanceof Error ? e.message : 'Failed to remove image';

      setError(message);

      throw e;

    } finally {

      setSaving(false);

    }

  }, [refreshProfile]);



  const uploadResumeFn = useCallback(async (file: File, onProgress?: (percent: number) => void) => {

    setSaving(true);

    setError(null);

    try {

      await uploadProfileResume(file, onProgress);

      return await refreshProfile();

    } catch (e) {

      const message = e instanceof Error ? e.message : 'Failed to upload resume';

      setError(message);

      throw e;

    } finally {

      setSaving(false);

    }

  }, [refreshProfile]);



  const removeResumeFn = useCallback(async () => {

    setSaving(true);

    setError(null);

    try {

      await removeProfileResume();

      return await refreshProfile();

    } catch (e) {

      const message = e instanceof Error ? e.message : 'Failed to remove resume';

      setError(message);

      throw e;

    } finally {

      setSaving(false);

    }

  }, [refreshProfile]);



  const value = useMemo<ProfileContextValue>(

    () => ({

      profile,

      loading: authLoading || loading,

      saving,

      error,

      reload: load,

      updateProfile,

      uploadAvatar,

      removeAvatar: removeAvatarFn,

      uploadResume: uploadResumeFn,

      removeResume: removeResumeFn,

    }),

    [profile, authLoading, loading, saving, error, load, updateProfile, uploadAvatar, removeAvatarFn, uploadResumeFn, removeResumeFn],

  );



  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;

}



export function useProfileContext() {

  const ctx = useContext(ProfileContext);

  if (!ctx) throw new Error('useProfileContext must be used within ProfileProvider');

  return ctx;

}

