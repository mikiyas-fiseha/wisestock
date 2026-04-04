import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform, Alert } from 'react-native';

/**
 * Downloads a file from a URL.
 * On Web: Triggers a browser download using a temporary <a> tag and fetch/blob.
 * On Mobile: Attempts to save directly to the "Recite" gallery album.
 * Fallback: If direct save fails (e.g. in Expo Go), falls back to the native Share sheet.
 * 
 * @param url The public URL of the file to download.
 * @param fileName Suggested name for the file (e.g., 'receipt_123.jpg').
 */
export async function downloadFile(url: string, fileName: string) {
    if (!url) return;

    if (Platform.OS === 'web') {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the object URL
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Web download failed:', error);
            window.open(url, '_blank');
        }
    } else {
        const fileUri = FileSystem.cacheDirectory + fileName;
        
        try {
            // Check if we are in Expo Go
            const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
            
            if (isExpoGo) {
                // Expo Go logic
                await FileSystem.downloadAsync(url, fileUri);
                await Sharing.shareAsync(fileUri);
                return;
            }

            // 1. Request Media Library Permissions (Android 13+ granular photo access)
            const { status } = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
            
            if (status !== 'granted') {
                // Fallback to Sharing if permission is denied
                await FileSystem.downloadAsync(url, fileUri);
                await Sharing.shareAsync(fileUri);
                return;
            }

            // 2. Download and save to "Recite" album
            await FileSystem.downloadAsync(url, fileUri);
            const asset = await MediaLibrary.createAssetAsync(fileUri);
            const albumName = 'Recite';
            const album = await MediaLibrary.getAlbumAsync(albumName);

            if (album) {
                await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
            } else {
                await MediaLibrary.createAlbumAsync(albumName, asset, false);
            }

            Alert.alert('Success', `Image saved to the "${albumName}" folder in your gallery.`);
        } catch (error) {
            console.error('Direct download failed, trying fallback...', error);
            try {
                // Final fallback effort: Just open the share sheet
                await FileSystem.downloadAsync(url, fileUri);
                await Sharing.shareAsync(fileUri);
            } catch (fallbackError) {
                Alert.alert('Error', 'Could not save or share the image. Please try again.');
            }
        }
    }
}
