import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

export const uploadImageToCloudinary = async (uri: string): Promise<string> => {
    try {
        // Compress and resize image
        let finalUri = uri;
        try {
            const manipResult = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 1000 } }], // Resize width to max 1000px, keeping aspect ratio
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
            );
            finalUri = manipResult.uri;
        } catch (manipError) {
            console.warn('Image manipulation failed, falling back to original image:', manipError);
            // If manipulation fails, we just use the original URI
        }

        const data = new FormData();
        
        if (Platform.OS === 'web') {
            const res = await fetch(finalUri);
            const blob = await res.blob();
            data.append('file', blob, 'receipt.jpg');
        } else {
            data.append('file', {
                uri: finalUri,
                type: 'image/jpeg',
                name: 'receipt.jpg',
            } as any);
        }
        data.append('upload_preset', 'wisestock');

        const response = await fetch('https://api.cloudinary.com/v1_1/dpuxaz3gc/image/upload', {
            method: 'POST',
            body: data,
            headers: {
                Accept: 'application/json',
            },
        });

        const result = await response.json();
        
        if (result.secure_url) {
            return result.secure_url;
        } else {
            throw new Error(result.error?.message || 'Failed to upload image');
        }
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw error;
    }
};
