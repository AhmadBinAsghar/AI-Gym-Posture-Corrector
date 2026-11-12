/**
 * Guest and offline-sandbox users only exist on the device, so their ids are
 * not valid cloud UUIDs and must never be uploaded to Supabase.
 */
export const GUEST_USER = { id: 'guest-athlete', email: 'guest@aurafit.fit', fullName: 'Guest' };

export const isCloudUser = user =>
  !!user?.id && !user.id.startsWith('guest-') && !user.id.startsWith('mock-');
