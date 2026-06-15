import { apiClient } from './client';
import { createRequestTimer } from '@/lib/apiDiagnostics';
import type {
  ProfileCompleteness,
  UpdateUserProfileRequest,
  UserProfile,
} from '@/models/userProfile';
import type { PublicProfile } from '@/models/publicProfile';

export const profilesApi = {
  getMe: (signal?: AbortSignal) => {
    const timer = createRequestTimer('profiles/me');
    return apiClient<UserProfile>('/profiles/me', { signal })
      .then((profile) => {
        timer.end({ profileId: profile.id });
        return profile;
      })
      .catch((error) => {
        if (signal?.aborted) {
          timer.cancel({ reason: 'aborted' });
        } else {
          const reason = error instanceof Error ? error.message : 'unknown';
          timer.error(reason);
        }
        throw error;
      });
  },

  getPublic: (id: string) => apiClient<PublicProfile>(`/profiles/public/${id}`, { skipAuth: true }),

  updateMe: (data: UpdateUserProfileRequest) =>
    apiClient<UserProfile>('/profiles/me', { method: 'PUT', body: data }),

  checkMyCompleteness: () =>
    apiClient<ProfileCompleteness>('/profiles/me/completeness'),
};

export { uploadProfileAvatar, removeProfileAvatar, uploadProfileBanner, removeProfileBanner } from './profileUploadApi';
