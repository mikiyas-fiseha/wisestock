import { getLocalPathFromOfflineUri, isOfflineUri } from '@/lib/offlineImage';
import React from 'react';
import { Image, ImageProps, Platform } from 'react-native';

interface SafeImageProps extends ImageProps {
    source: { uri?: string | null } | any;
}

/**
 * A wrapper around React Native's Image component that handles 'offline://' URIs
 */
export const SafeImage: React.FC<SafeImageProps> = ({ source, ...props }) => {
    let finalSource = source;

    if (source && typeof source === 'object' && source.uri) {
        if (isOfflineUri(source.uri)) {
            if (Platform.OS === 'web') {
                // On web, pointing to a local path like /offline_images/ will 404
                // unless we have a service worker. For now, we skip it to avoid console noise.
                finalSource = null;
            } else {
                const localPath = getLocalPathFromOfflineUri(source.uri);
                finalSource = { ...source, uri: localPath };
            }
        }
    }

    return <Image source={finalSource} {...props} />;
};
