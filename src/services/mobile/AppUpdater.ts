/**
 * Mobile App Updater Service
 * Handles automatic updates for iOS and Android apps from GitHub releases
 */
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const GITHUB_API = 'https://api.github.com/repos/huiejorjdsksfn/medi-procure-hub/releases';
const CURRENT_VERSION = '11.12.0'; // Should match package.json version

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface Release {
  tag_name: string;
  name: string;
  body: string;
  assets: ReleaseAsset[];
}

class AppUpdaterService {
  private isChecking = false;
  private lastCheck: Date | null = null;

  /**
   * Check if running on mobile platform
   */
  isMobile(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Get current platform (ios, android, or web)
   */
  getPlatform(): string {
    return Capacitor.getPlatform();
  }

  /**
   * Get current app version
   */
  getVersion(): string {
    return CURRENT_VERSION;
  }

  /**
   * Compare semantic versions
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.replace(/^v/, '').split('.').map(Number);
    const parts2 = v2.replace(/^v/, '').split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }

  /**
   * Find the appropriate download URL for current platform
   */
  private findDownloadUrl(assets: ReleaseAsset[], platform: string): string | null {
    const platformLower = platform.toLowerCase();
    
    // Android APK
    if (platformLower === 'android') {
      const apk = assets.find(a => 
        a.name.endsWith('.apk') || 
        a.name.includes('android')
      );
      if (apk) return apk.browser_download_url;
    }
    
    // iOS IPA
    if (platformLower === 'ios') {
      const ipa = assets.find(a => 
        a.name.endsWith('.ipa') || 
        a.name.includes('ios')
      );
      if (ipa) return ipa.browser_download_url;
    }
    
    return null;
  }

  /**
   * Check for updates from GitHub releases
   */
  async checkForUpdate(): Promise<{
    hasUpdate: boolean;
    latestVersion?: string;
    downloadUrl?: string;
    releaseNotes?: string;
  }> {
    if (this.isChecking) {
      return { hasUpdate: false };
    }

    if (!this.isMobile()) {
      console.log('AppUpdater: Not on mobile platform, skipping update check');
      return { hasUpdate: false };
    }

    this.isChecking = true;
    this.lastCheck = new Date();

    try {
      const response = await fetch(GITHUB_API, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'ProcurBosse-Mobile/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const releases: Release[] = await response.json();
      
      // Find the latest non-draft, non-prerelease
      const latestRelease = releases.find(r => !r.draft && !r.prerelease);
      
      if (!latestRelease) {
        this.isChecking = false;
        return { hasUpdate: false };
      }

      const latestVersion = latestRelease.tag_name.replace(/^v/, '');
      const hasUpdate = this.compareVersions(latestVersion, CURRENT_VERSION) > 0;
      const downloadUrl = this.findDownloadUrl(latestRelease.assets, this.getPlatform());

      this.isChecking = false;

      return {
        hasUpdate,
        latestVersion,
        downloadUrl: downloadUrl || undefined,
        releaseNotes: latestRelease.body || undefined,
      };
    } catch (error) {
      console.error('AppUpdater: Failed to check for updates', error);
      this.isChecking = false;
      return { hasUpdate: false };
    }
  }

  /**
   * Notify user about available update
   */
  async notifyUpdate(latestVersion: string, releaseNotes?: string): Promise<void> {
    try {
      // Haptic feedback
      if (this.isMobile()) {
        await Haptics.impact({ style: ImpactStyle.Medium });
      }

      // Local notification
      await LocalNotifications.requestPermissions();
      await LocalNotifications.schedule({
        notifications: [
          {
            title: 'ProcurBosse Update Available',
            body: `Version ${latestVersion} is ready to download!`,
            id: Date.now(),
            extra: { type: 'update' },
          },
        ],
      });
    } catch (error) {
      console.error('AppUpdater: Failed to send notification', error);
    }
  }

  /**
   * Open app store or download page
   */
  async openUpdateDownload(downloadUrl: string): Promise<void> {
    if (!this.isMobile()) return;

    // On mobile, open the download URL in browser
    // The user will download and install the new version
    window.open(downloadUrl, '_blank');
    
    // Trigger haptic feedback
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {}
  }

  /**
   * Initialize the app updater service
   * Call this on app startup
   */
  async initialize(): Promise<void> {
    if (!this.isMobile()) return;

    // Listen for app state changes
    CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
      if (isActive) {
        // Check for updates when app becomes active
        const result = await this.checkForUpdate();
        if (result.hasUpdate && result.latestVersion) {
          await this.notifyUpdate(result.latestVersion, result.releaseNotes);
        }
      }
    });

    // Initial update check
    setTimeout(async () => {
      const result = await this.checkForUpdate();
      if (result.hasUpdate && result.latestVersion) {
        await this.notifyUpdate(result.latestVersion, result.releaseNotes);
      }
    }, 3000); // Wait 3 seconds after app starts
  }
}

// Export singleton instance
export const appUpdater = new AppUpdaterService();
export default appUpdater;
