import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './client.js';

// Auth
export const useMe = () => useQuery({
  queryKey: ['me'],
  queryFn: () => api.get('/auth/me').then(r => r.data.user),
  retry: false
});

export const useUpdateMe = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.patch('/auth/me', data).then(r => r.data.user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] })
  });
};

// Groups
export const useMyGroups = () => useQuery({
  queryKey: ['groups'],
  queryFn: () => api.get('/groups').then(r => r.data.groups)
});

export const useCreateGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/groups', data).then(r => r.data.group),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] })
  });
};

export const useGroup = (id) => useQuery({
  queryKey: ['group', id],
  queryFn: () => api.get(`/groups/${id}`).then(r => r.data),
  enabled: !!id
});

export const useUpdateGroup = (id) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.patch(`/groups/${id}`, data).then(r => r.data.group),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group', id] });
      qc.invalidateQueries({ queryKey: ['groups'] });
    }
  });
};

export const useDeleteGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/groups/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] })
  });
};

export const useLeaveGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/groups/${id}/leave`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] })
  });
};

// Member management
export const useUpdateMemberRole = (groupId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }) => api.patch(`/groups/${groupId}/members/${userId}/role`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group', groupId] })
  });
};

export const useRemoveMember = (groupId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId) => api.delete(`/groups/${groupId}/members/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group', groupId] })
  });
};

export const useToggleSosNotify = (groupId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, enabled }) => api.patch(`/groups/${groupId}/members/${userId}/notify-sos`, { enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group', groupId] })
  });
};

// Invites
export const useCreateInvite = (groupId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post(`/groups/${groupId}/invites`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invites', groupId] })
  });
};

export const useGroupInvites = (groupId) => useQuery({
  queryKey: ['invites', groupId],
  queryFn: () => api.get(`/groups/${groupId}/invites`).then(r => r.data.invites),
  enabled: !!groupId
});

export const useRevokeInvite = (groupId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId) => api.delete(`/groups/${groupId}/invites/${inviteId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invites', groupId] })
  });
};

// Join
export const useInviteInfo = (token) => useQuery({
  queryKey: ['invite', token],
  queryFn: () => api.get(`/join/${token}`).then(r => r.data),
  enabled: !!token,
  retry: false
});

export const useRequestJoin = () => useMutation({
  mutationFn: (token) => api.post(`/join/${token}`).then(r => r.data)
});

export const useJoinRequestStatus = (token, enabled) => useQuery({
  queryKey: ['joinStatus', token],
  queryFn: () => api.get(`/join/${token}/status`).then(r => r.data.request),
  enabled: !!token && enabled,
  refetchInterval: 5000
});

// Join requests (admin)
export const usePendingRequests = (groupId) => useQuery({
  queryKey: ['requests', groupId],
  queryFn: () => api.get(`/groups/${groupId}/requests`).then(r => r.data.requests),
  enabled: !!groupId,
  refetchInterval: 10000
});

export const useReviewRequest = (groupId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, action }) => api.patch(`/groups/${groupId}/requests/${requestId}`, { action }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests', groupId] });
      qc.invalidateQueries({ queryKey: ['group', groupId] });
      qc.invalidateQueries({ queryKey: ['groups'] });
    }
  });
};

// Safety
export const usePostSafety = (groupId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post(`/groups/${groupId}/safety`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group', groupId] });
      qc.invalidateQueries({ queryKey: ['groups'] });
    }
  });
};

export const useGroupSafety = (groupId) => useQuery({
  queryKey: ['safety', groupId],
  queryFn: () => api.get(`/groups/${groupId}/safety`).then(r => r.data.statuses),
  enabled: !!groupId
});

// User status
export const useMyStatus = () => useQuery({
  queryKey: ['myStatus'],
  queryFn: () => api.get('/status').then(r => r.data.status)
});

export const useUpdateStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text) => api.put('/status', { text }).then(r => r.data.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['myStatus'] })
  });
};

// Messages
export const useMessages = (groupId, enabled = true) => useQuery({
  queryKey: ['messages', groupId],
  queryFn: () => api.get(`/groups/${groupId}/messages`).then(r => r.data.messages),
  enabled: !!groupId && enabled,
  refetchInterval: 5000
});

export const useSendMessage = (groupId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content) => api.post(`/groups/${groupId}/messages`, { content }).then(r => r.data.message),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages', groupId] })
  });
};

// Push
export const useSubscribePush = () => useMutation({
  mutationFn: (sub) => api.post('/push/subscribe', sub)
});

export const useUnsubscribePush = () => useMutation({
  mutationFn: (endpoint) => api.delete('/push/subscribe', { data: { endpoint } })
});
