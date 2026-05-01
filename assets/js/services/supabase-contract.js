/**
 * Supabase integration boundary.
 * Do not import Supabase directly inside page scripts. Pages should depend on services.
 */
export const SupabaseTables = Object.freeze({
  USERS: 'users',
  USER_PROFILES: 'user_profiles',
  PROFESSIONAL_PROFILES: 'professional_profiles',
  SERVICES: 'services',
  SERVICE_CATEGORIES: 'service_categories',
  SERVICE_MEDIA: 'service_media',
  ORDERS: 'orders',
  BUDGETS: 'budgets',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  REVIEWS: 'reviews',
  WALLETS: 'wallets',
  TRANSACTIONS: 'transactions',
  COMMUNITIES: 'communities',
  NOTIFICATIONS: 'notifications',
  REPORTS: 'reports',
  AUDIT_LOGS: 'audit_logs'
});

export const UserRoles = Object.freeze({
  CLIENT: 'client',
  PROFESSIONAL: 'professional',
  MODERATOR: 'moderator',
  ADMIN: 'admin'
});

export const OrderStatus = Object.freeze({
  DRAFT: 'draft',
  REQUESTED: 'requested',
  QUOTED: 'quoted',
  ACCEPTED: 'accepted',
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DISPUTED: 'disputed'
});
