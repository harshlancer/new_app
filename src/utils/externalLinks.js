import { Linking } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { showToast } from '../../App';

export async function openExternalLink(url, fallbackMessage) {
    try {
        // Direct openURL handles standard http/https links perfectly and avoids Android 11+ <queries> issues
        await Linking.openURL(url);
        return true;
    } catch (error) {
        Clipboard.setString(url);
        showToast(fallbackMessage + ' URL copied to clipboard.', 'error');
        return false;
    }
}

export async function openEmailLink(emailAddress) {
    const emailUrl = `mailto:${emailAddress}`;

    try {
        // Try opening directly first
        await Linking.openURL(emailUrl);
        return true;
    } catch (error) {
        // If direct open fails (e.g. no email app), try canOpenURL check or just fall back to clipboard
        try {
            const supported = await Linking.canOpenURL(emailUrl);
            if (supported) {
                await Linking.openURL(emailUrl);
                return true;
            }
        } catch (innerError) {
            // Silently fall through to clipboard
        }

        Clipboard.setString(emailAddress);
        showToast('No email app found. Address copied to clipboard.', 'warning');
        return false;
    }
}
