import { apiClient } from './client';
import type {
  ProfileCompleteness,
  UpdateUserProfileRequest,
  UserProfile,
} from '@/models/userProfile';

export const profilesApi = {
  getMe: () => apiClient<UserProfile>('/profiles/me'),

  updateMe: (data: UpdateUserProfileRequest) =>
    apiClient<UserProfile>('/profiles/me', { method: 'PUT', body: data }),

  checkMyCompleteness: () =>
    apiClient<ProfileCompleteness>('/profiles/me/completeness'),
};

export { uploadProfileAvatar, removeProfileAvatar } from './profileUploadApi';
