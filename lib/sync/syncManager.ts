/**
 * SyncManager is disabled as the application has transitioned to a Supabase-only architecture.
 * Local SQLite storage and offline synchronization are no longer supported.
 */
export class SyncManager {
    async syncAll() {
        // No-op: Local database is disabled
        console.log('SyncManager: Synchronization disabled (Supabase-only mode)');
        return;
    }

    private async pushPendingChanges() {
        return;
    }

    private async pullRemoteObject() {
        return;
    }

    private async pullRemoteChanges_All() {
        return;
    }
}

export const syncManager = new SyncManager();
