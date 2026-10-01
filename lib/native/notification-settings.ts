import { registerPlugin } from '@capacitor/core';

interface NotificationSettingsPlugin {
  getStatus(): Promise<{ enabled: boolean }>;
  open(): Promise<void>;
}

export const NotificationSettings =
  registerPlugin<NotificationSettingsPlugin>('NotificationSettings');
