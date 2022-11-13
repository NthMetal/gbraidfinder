import { Injectable } from '@angular/core';

/**
 * Service that manages storing and using user settings.
 */
@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  public readonly settings = {
    subscribedRaidQuestIds: [] as string[],
    enabledGlobalNotifications: true,
    enabledSoundNotifications: true,
    // display: 'vertical',
    // columnWidth: 20,
    // language: 'EN',
    removeRaidsAfterSeconds: 5400, // 1 hour 30 mins (time limit for most raids)
    removeRaidsAfterLimit: 20,

    copyOnly: false,
    openInTab: true,

    removeDuplicates: false,
    minHP: 0,
    maxHP: 100,
    minPlayers: 1,
    maxPlayers: 30,
    theme: 'dark',

    // Sound Settings
    sound: 'https://wiki.teamfortress.com/w/images/c/cf/Hitsound.wav',
    soundVolume: 0.1,
    soundEnabled: true,
    questSoundSettings: {} as { [key: string]: { enabled: boolean, soundOnUpdate: boolean, sound: string}},

    // Notification Settings
    silentNotifications: true,
    requireInteraction: false,
    notificationsEnabled: true,
    questNotificationSettings: {} as { [key: string]: { enabled: boolean, notificationOnUpdate: boolean}}
  }

  constructor() {
    /**
     * Get settings from local storage.
     */
    const savedSettings = JSON.parse(localStorage.getItem('settings') || JSON.stringify(this.settings));
    /**
     * Apply defaults if they're not already saved.
     */
    Object.assign(this.settings, savedSettings);
  }


  /**
   * Update the saved settings
   */
  public updateSettings() {
    localStorage.setItem('settings', JSON.stringify(this.settings));
  }

}
