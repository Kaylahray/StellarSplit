import { createContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import type { PresenceUser, ActivityEvent, ConflictInfo, CollaborationState, SplitUpdate } from '../../types/collaboration';
import { BASE_API_URL } from '../../constants/api';

export interface CollaborationContextType extends CollaborationState {
    joinSplit: (splitId: string, user: Partial<PresenceUser>) => void;
    leaveSplit: () => void;
    setTyping: (isTyping: boolean) => void;
    sendUpdate: (update: Omit<SplitUpdate, 'timestamp'>) => void;
    resolveConflict: (field: string, resolution: 'local' | 'remote' | 'merge') => void;
    updateCursor: (x: number, y: number) => void;
}

export const CollaborationContext = createContext<CollaborationContextType | undefined>(undefined);

export function CollaborationProvider({ children }: { children: ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);
    const [presence, setPresence] = useState<Record<string, PresenceUser>>({});
    const [activities, setActivities] = useState<ActivityEvent[]>([]);
    const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);

    const currentSplitId = useRef<string | null>(null);
    const currentUser = useRef<Partial<PresenceUser>>({});

    // Yjs CRDT for Operational Transform & Cursor Sync
    const ydoc = useRef(new Y.Doc());
    const yprovider = useRef<WebsocketProvider | null>(null);

    useEffect(() => {
        // Extract domain from BASE_API_URL to construct socket URL
        const url = new URL(BASE_API_URL.startsWith('http') ? BASE_API_URL : window.location.origin);
        const socketUrl = `${url.protocol}//${url.host}`;

        const newSocket = io(socketUrl, {
            path: '/socket.io',
            autoConnect: true, // Auto connect on provider mount
            transports: ['websocket', 'polling']
        });

        newSocket.on('connect', () => {
            setConnected(true);
            if (currentSplitId.current) {
                newSocket.emit('join-room', { roomId: currentSplitId.current, user: currentUser.current });
            }
        });

        newSocket.on('disconnect', () => {
            setConnected(false);
        });

        newSocket.on('presence-update', (users: Record<string, PresenceUser>) => {
            setPresence(users);
        });

        newSocket.on('activity-new', (activity: ActivityEvent) => {
            setActivities((prev) => [activity, ...prev].slice(0, 50));
        });

        newSocket.on('split-update', (update: SplitUpdate) => {
            console.log('Received split update:', update);
            // Simulate conflict detection if editing the same item, etc
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    const joinSplit = useCallback((splitId: string, user: Partial<PresenceUser>) => {
        currentSplitId.current = splitId;
        currentUser.current = user;

        // Connect standard Socket.io presence events
        if (socket && socket.connected) {
            socket.emit('join-room', { roomId: splitId, user });
        }

        // Connect Yjs CRDT for Operational Transform
        const url = new URL(BASE_API_URL.startsWith('http') ? BASE_API_URL : window.location.origin);
        const wsUrl = `ws://${url.host}/yjs`;

        if (yprovider.current) {
            yprovider.current.disconnect();
        }

        yprovider.current = new WebsocketProvider(wsUrl, splitId, ydoc.current);

        // Sync cursor and presence via Yjs Awareness
        yprovider.current.awareness.setLocalStateField('user', user);

        yprovider.current.awareness.on('change', () => {
            const states = Array.from(yprovider.current!.awareness.getStates().values());
            const yPresence: Record<string, PresenceUser> = {};
            states.forEach((state: any) => {
                if (state.user?.userId) {
                    yPresence[state.user.userId] = {
                        ...state.user,
                        cursor: state.cursor
                    };
                }
            });
            setPresence((prev) => ({ ...prev, ...yPresence }));
        });

    }, [socket]);

    const leaveSplit = useCallback(() => {
        if (socket && currentSplitId.current) {
            socket.emit('leave-room', { roomId: currentSplitId.current, userId: currentUser.current?.userId });
        }
        currentSplitId.current = null;
        setPresence({});
        setActivities([]);
    }, [socket]);

    const setTyping = useCallback((isTyping: boolean) => {
        if (socket && currentSplitId.current) {
            socket.emit('typing-status', { roomId: currentSplitId.current, userId: currentUser.current?.userId, isTyping });
        }
    }, [socket]);

    const sendUpdate = useCallback((update: Omit<SplitUpdate, 'timestamp'>) => {
        if (socket && currentSplitId.current) {
            const fullUpdate: SplitUpdate = { ...update, timestamp: new Date() };
            socket.emit('split-update', { roomId: currentSplitId.current, update: fullUpdate });
        }
    }, [socket]);

    const resolveConflict = useCallback((field: string, resolution: 'local' | 'remote' | 'merge') => {
        setConflicts((prev) => prev.filter(c => c.field !== field));
        console.log(`Resolved conflict for ${field} with ${resolution}`);
    }, []);

    const updateCursor = useCallback((x: number, y: number) => {
        if (yprovider.current) {
            yprovider.current.awareness.setLocalStateField('cursor', { x, y });
        }
    }, []);

    const value: CollaborationContextType = {
        connected,
        presence,
        activities,
        conflicts,
        joinSplit,
        leaveSplit,
        setTyping,
        sendUpdate,
        resolveConflict,
        updateCursor,
    };

    return <CollaborationContext.Provider value={value}>{children}</CollaborationContext.Provider>;
}
