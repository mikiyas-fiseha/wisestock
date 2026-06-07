import * as FileSystem from 'expo-file-system/legacy';

const OFFLINE_PREFIX = 'offline://';

/**
 * Saves a temporary image URI to the app's persistent document directory.
 * Returns a URI prefixed with 'offline://' to indicate it needs syncing.
 */
export const saveImageOffline = async (uri: string): Promise<string> => {
    try {
        const uuid = require('react-native-uuid').default;

        // FileSystem.documentDirectory can be null on Web
        const baseDir = FileSystem.documentDirectory || '/';
        const directory = `${baseDir}offline_images/`;

        // Ensure directory exists
        const dirInfo = await FileSystem.getInfoAsync(directory);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
        }

        const fileName = `${uuid.v4()}.jpg`;
        const dest = `${directory}${fileName}`;

        await FileSystem.copyAsync({
            from: uri,
            to: dest
        });

        return `${OFFLINE_PREFIX}${dest}`;
    } catch (error) {
        console.error('Failed to save image offline:', error);
        throw error;
    }
};

/**
 * Checks if a URI is an offline-buffered image.
 */
export const isOfflineUri = (uri: string | null): boolean => {
    return !!uri && uri.startsWith(OFFLINE_PREFIX);
};

/**
 * Gets the actual local file path from an offline URI.
 */
export const getLocalPathFromOfflineUri = (uri: string): string => {
    return uri.replace(OFFLINE_PREFIX, '');
};
