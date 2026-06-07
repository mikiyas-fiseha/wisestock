import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export interface ActivityLog {
    id: string;
    company_id: string;
    user_id: string;
    user_name: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    entity_label: string | null;
    details: any | null;
    created_at: string;
}

export interface ActivityFilters {
    entityType?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
}

export function useActivityLogs(filters?: ActivityFilters) {
    const { company } = useAuth();

    return useQuery({
        queryKey: ['activity_logs', company?.id, filters],
        queryFn: async (): Promise<{ data: ActivityLog[]; count: number }> => {
            if (!company?.id) return { data: [], count: 0 };

            const page = filters?.page || 0;
            const limit = filters?.limit || 50;
            const from = page * limit;
            const to = from + limit - 1;

            let query = supabase
                .from('activity_logs')
                .select('*', { count: 'exact' })
                .eq('company_id', company.id)
                .order('created_at', { ascending: false })
                .range(from, to);

            if (filters?.entityType && filters.entityType !== 'all') {
                query = query.eq('entity_type', filters.entityType);
            }

            if (filters?.userId && filters.userId !== 'all') {
                query = query.eq('user_id', filters.userId);
            }

            if (filters?.dateFrom) {
                query = query.gte('created_at', filters.dateFrom);
            }

            if (filters?.dateTo) {
                query = query.lte('created_at', filters.dateTo);
            }

            const { data, error, count } = await query;

            if (error) {
                console.error('Error fetching activity logs:', error);
                throw error;
            }

            return { data: data as ActivityLog[], count: count || 0 };
        },
        enabled: !!company?.id,
    });
}

export function useEntityActivityLogs(entityType: string, entityId: string | null) {
    const { company } = useAuth();

    return useQuery({
        queryKey: ['activity_logs', 'entity', company?.id, entityType, entityId],
        queryFn: async (): Promise<ActivityLog[]> => {
            if (!company?.id || !entityId) return [];

            const { data, error } = await supabase
                .from('activity_logs')
                .select('*')
                .eq('company_id', company.id)
                .eq('entity_type', entityType)
                .eq('entity_id', entityId)
                .order('created_at', { ascending: false })
                .limit(20); // usually we just need the most recent 20 for a timeline

            if (error) {
                console.error('Error fetching entity activity logs:', error);
                throw error;
            }

            return data as ActivityLog[];
        },
        enabled: !!company?.id && !!entityId,
    });
}
