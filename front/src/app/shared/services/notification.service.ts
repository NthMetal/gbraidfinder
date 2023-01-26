import { Injectable } from '@angular/core';
import { Subject, throttleTime } from 'rxjs';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  notificationsSubject: Subject<{raid: any, questTitle: string}> = new Subject<{raid: any, questTitle: string}>();
  hasNotificationPermission = false;
  currentNotification: Notification;

  /**
   * Initialize, inject settingsService
   * Ask for permission to show notifications
   */
  constructor(private settingsService: SettingsService) {
    /**
     * Subscribe to notifications subject to show the notification
     * Lets us use rxjs pipe operators to modify how often notifications are shown
     */
    this.notificationsSubject.pipe(throttleTime(3000)).subscribe(notification => {
      this.showNotification(notification.raid, notification.questTitle);
    });
  }

  /**
   * Requests permission to show notifications
   * wrapped in a try/catch because Notification object may not exist in some contexts
   */
  public requestNotificationPermission() {
    try {
      if (!this.hasNotificationPermission && Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') this.hasNotificationPermission = true;
        });
      }
    } catch (error) {}
  }

  /**
   * Pulic method for scheduling a notification
   * @param raid 
   * @param questTitle 
   */
  public scheduleNotification(raid: any, questTitle: string) {
    this.notificationsSubject.next({raid, questTitle});
  }

  /**
   * shows a notification for a raid
   * @param raid raid info, may include update
   * @param questTitle quest title (ex Wings of Terror (Impossible)) to show
   */
  private showNotification(raid: any, questTitle: string) {
    // ▰▱
    // [▇-]
    // █▒
    /**
     * Check if notifications are enabled
     */
    if (!raid ||
      !this.settingsService.settings.notificationsEnabled ||
      !this.settingsService.settings.questNotificationSettings[raid.quest_id] ||
      !this.settingsService.settings.questNotificationSettings[raid.quest_id].enabled) return;
    
    /**
     * If notifications are enabled, request notification permission
     */
    this.requestNotificationPermission();

    // if (this.currentNotification) this.currentNotification.close();

    const bodyMessage = !this.settingsService.settings.copyOnly && raid.update ? `Click to open raid in new tab. 🚪` : `Click to Copy 📋`;
    const bodyHPInfo = raid.update ? `${'▰'.repeat(Math.floor((+raid.update.hp)/5))}${'▱'.repeat(20 - Math.floor((+raid.update.hp)/5))}` : '';
    const bodyOtherInfo = raid.update ? ` ${raid.update.hp}%                 ${raid.update.players}                        ${raid.update.timeLeft}` : '';
    const notification = new Notification(`${questTitle} - ${raid.battleKey}`, {
       body: `${bodyOtherInfo}\n${bodyHPInfo}\n${bodyMessage}`,
       image: `assets/big/${raid.quest_id}.jpg`,
       silent: !!this.settingsService.settings.silentNotifications,
       requireInteraction: !!this.settingsService.settings.requireInteraction
    });
    /**
     * handles click event, opens raid in new tab or copies
     * depending on the settings
     */
    notification.onclick = async (e) => {
      raid.selected = true;
      if (raid.update && !this.settingsService.settings.copyOnly) {
        const tab = this.settingsService.settings.openInTab ? '_blank' : 'gbfTab';
        window.open(`https://game.granbluefantasy.jp/${raid.update.link}`, tab, tab === '_blank' ? 'noreferrer' : '');
      } else {
        await this.copyTextToClipboard(raid.battleKey);
        if (this.settingsService.settings.openInTab) {
          window.open(`https://game.granbluefantasy.jp/#quest/assist`, 'gbfTab');
        }
      }
      notification.close();
    };
    this.currentNotification = notification;
 }

 /**
  * Plays a sound using the selected sound in the settings
  * and the selected sound volume from the settings
  */
  public playSound(raid: any) {
    if (!raid ||
      !this.settingsService.settings.soundEnabled ||
      !this.settingsService.settings.questSoundSettings[raid.quest_id] ||
      !this.settingsService.settings.questSoundSettings[raid.quest_id]?.enabled) return;
  
    const sound = this.settingsService.settings.questSoundSettings[raid.quest_id].sound || this.settingsService.settings.sound;
    const audio = new Audio(sound);
    audio.volume = this.settingsService.settings.soundVolume || 0.1;
    audio.play();
  }

  /**
   * Copies given text to clipboard
   * @param input text to be copied
   * @returns true if successful false otherwise
   */
  public async copyTextToClipboard(input: any): Promise<boolean> {
    if (navigator && navigator.clipboard) {
      await navigator.clipboard.writeText(input);
      return true;
    }

    const element = document.createElement('textarea');
    const previouslyFocusedElement: any = document.activeElement;

    element.value = input;

    // Prevent keyboard from showing on mobile
    element.setAttribute('readonly', '');

    // element.style.contain = 'strict';
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.fontSize = '12pt'; // Prevent zooming on iOS

    const selection: any = document.getSelection();
    const originalRange = selection.rangeCount > 0 && selection.getRangeAt(0);

    document.body.append(element);
    element.select();

    // Explicit selection workaround for iOS
    element.selectionStart = 0;
    element.selectionEnd = input.length;

    let isSuccess = false;
    try {
      isSuccess = document.execCommand('copy');
    } catch { }

    element.remove();

    if (originalRange) {
      selection.removeAllRanges();
      selection.addRange(originalRange);
    }

    // Get the focus back on the previously focused element, if any
    if (previouslyFocusedElement) {
      previouslyFocusedElement.focus();
    }

    return isSuccess;
  }

}
