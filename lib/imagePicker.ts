import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

/**
 * A resilient image picker that avoids expo-image-picker's "Unsupported file type"
 * crash on the Web platform by using a native HTML input directly.
 */
export const pickImage = async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
        return new Promise<string | null>((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                    // Create a blob URL that can be used by Image components and fetched
                    resolve(URL.createObjectURL(file));
                } else {
                    resolve(null);
                }
            };
            input.oncancel = () => resolve(null);
            input.click();
        });
    } else {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 1,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
            return result.assets[0].uri;
        }
        return null;
    }
};
