
import React, { createContext, useContext, useState } from 'react';

interface SyncContextType {
    isOnline: boolean;
    isDbInitialized: boolean;
    isInMemory: boolean;
    forceSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
    isOnline: true,
    isDbInitialized: true,
    isInMemory: false,
    forceSync: async () => { },
});

export const useSync = () => useContext(SyncContext);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOnline, setIsOnline] = useState(true);

    return (
        <SyncContext.Provider value={{ isOnline, isDbInitialized: true, isInMemory: false, forceSync: async () => { } }}>
            {children}
        </SyncContext.Provider>
    );
};
