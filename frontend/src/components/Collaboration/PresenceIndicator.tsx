import { useCollaboration } from '../../hooks/useCollaboration';

export function PresenceIndicator() {
    const { presence, connected } = useCollaboration();

    const users = Object.values(presence);
    if (!connected && users.length === 0) return null;

    const typingUsers = users.filter((u) => u.isTyping);

    return (
        <div className="bg-white rounded-lg shadow px-4 py-3 flex items-center justify-between" id="presence-indicator">
            <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm font-medium text-gray-700">
                    {connected ? 'Live' : 'Disconnected'}
                </span>
            </div>

            <div className="flex items-center gap-4">
                {typingUsers.length > 0 && (
                    <div className="text-sm text-gray-500 animate-pulse flex items-center gap-1">
                        <span className="font-medium text-gray-700">
                            {typingUsers.map(u => u.name || 'Anonymous').join(', ')}
                        </span>
                        {' '}is typing
                        <span className="flex gap-0.5 ml-1">
                            <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                    </div>
                )}

                <div className="flex -space-x-2 overflow-hidden">
                    {users.map((user, i) => (
                        <div key={user.userId || i} className="relative group">
                            {user.avatar ? (
                                <img
                                    className={`inline-block h-8 w-8 rounded-full ring-2 ring-white ${user.isTyping ? 'animate-pulse ring-purple-200' : ''}`}
                                    src={user.avatar}
                                    alt={user.name || 'User'}
                                />
                            ) : (
                                <div className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 ring-2 ring-white text-white font-medium text-xs ${user.isTyping ? 'animate-pulse ring-purple-200' : ''}`}>
                                    {(user.name || 'A').charAt(0).toUpperCase()}
                                </div>
                            )}
                            {/* Tooltip */}
                            <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
                                {user.name || 'Anonymous'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
