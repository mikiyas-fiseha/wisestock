export const formatDate = (d: string | Date) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
export const formatTime = (d: string | Date) => new Date(d).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
export const formatDateTime = (d: string | Date) => `${formatDate(d)} • ${formatTime(d)}`;

export const formatTimeAgo = (date: string | Date): string => {
    const now = new Date();
    const then = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
    return `${Math.floor(diffInSeconds / 31536000)}y ago`;
};
