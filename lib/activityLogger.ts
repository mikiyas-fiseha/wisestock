import { supabase } from './supabase';

export interface ActivityLogParams {
    userId: string;
    userName: string;
    companyId: string;
    action: string;      // e.g., 'created_sale', 'deleted_product', 'added_payment'
    entityType: string;  // e.g., 'sale', 'product', 'expense', 'purchase', 'return'
    entityId?: string;   // the record's UUID
    entityLabel?: string; // a friendly string, like "Sale #1234" or "Item X"
    details?: any;       // JSON object for any extra tracking data
}

/**
 * Logs an activity directly to Supabase.
 * We use fire-and-forget so that it doesn't break the main thread if it fails.
 */
export const logActivity = async (params: ActivityLogParams) => {
    try {
        const userId = params.userId === 'unknown' ? null : params.userId;

        const { error } = await supabase.from('activity_logs').insert({
            company_id: params.companyId,
            user_id: userId,
            user_name: params.userName,
            action: params.action,
            entity_type: params.entityType,
            entity_id: params.entityId || null,
            entity_label: params.entityLabel || null,
            details: params.details || null
        });

        if (error) {
            console.error('Supabase error logging activity:', error);
            // Re-throw or return error if we want hooks to know
        }
        return { error };
    } catch (error) {
        console.error('Failed to log activity:', error);
        return { error };
    }
};
