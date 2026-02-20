import { useCollaboration } from '../../hooks/useCollaboration';
import { Activity, CreditCard, PlusCircle, Trash, RefreshCw } from 'lucide-react';

export function LiveActivityFeed() {
    const { activities } = useCollaboration();

    if (activities.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-6 text-center" id="live-activity-feed">
                <Activity className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-gray-900">No recent activity</h3>
                <p className="text-xs text-gray-500 mt-1">Updates will appear here live</p>
            </div>
        );
    }

    const getEventIcon = (type: string) => {
        switch (type) {
            case 'payment-status': return <CreditCard className="w-4 h-4 text-green-500" />;
            case 'item-added': return <PlusCircle className="w-4 h-4 text-blue-500" />;
            case 'item-deleted': return <Trash className="w-4 h-4 text-red-500" />;
            case 'item-updated': return <RefreshCw className="w-4 h-4 text-purple-500" />;
            default: return <Activity className="w-4 h-4 text-gray-500" />;
        }
    };

    const getTimeAgo = (date: Date) => {
        const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
        if (seconds < 60) return 'Just now';
        const mins = Math.floor(seconds / 60);
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        return `${hours}h ago`;
    };

    return (
        <div className="bg-white rounded-lg shadow p-0 overflow-hidden" id="live-activity-feed">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-md font-bold text-gray-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-500" /> Live Feed
                </h3>
                <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                </span>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto w-full">
                <ul className="space-y-4">
                    {activities.map((activity, idx) => (
                        <li key={activity.id || idx} className="flex gap-3 animate-in slide-in-from-left-2 duration-300">
                            <div className="mt-0.5 bg-gray-50 p-1.5 rounded-full border border-gray-100">
                                {getEventIcon(activity.type)}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-gray-800">
                                    <span className="font-semibold">{activity.userName}</span> {activity.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {getTimeAgo(activity.timestamp)}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
