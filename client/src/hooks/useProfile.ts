import { useProfileContext } from '@/context/ProfileContext';

/** Shared profile state backed by ProfileProvider. */
export function useProfile() {
  const ctx = useProfileContext();
  return {
    profile: ctx.profile,
    loading: ctx.loading,
    saving: ctx.saving,
    error: ctx.error,
    reload: ctx.reload,
    setProfile: () => {
      /* deprecated: use updateProfile */
    },
    updateProfile: ctx.updateProfile,
    uploadAvatar: ctx.uploadAvatar,
    removeAvatar: ctx.removeAvatar,
    uploadResume: ctx.uploadResume,
    removeResume: ctx.removeResume,
  };
}
