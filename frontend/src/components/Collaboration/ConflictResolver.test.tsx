import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictResolver } from './ConflictResolver';
import * as useCollaborationModule from '../../hooks/useCollaboration';

vi.mock('../../hooks/useCollaboration');

describe('ConflictResolver', () => {
    const mockResolveConflict = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders nothing when no conflicts', () => {
        vi.mocked(useCollaborationModule.useCollaboration).mockReturnValue({
            connected: true,
            presence: {},
            activities: [],
            conflicts: [],
            joinSplit: vi.fn(),
            leaveSplit: vi.fn(),
            setTyping: vi.fn(),
            sendUpdate: vi.fn(),
            resolveConflict: mockResolveConflict,
            updateCursor: vi.fn(),
        });

        const { container } = render(<ConflictResolver />);
        expect(container.firstChild).toBeNull();
    });

    it('renders conflict details and handles resolution clicks', () => {
        vi.mocked(useCollaborationModule.useCollaboration).mockReturnValue({
            connected: true,
            presence: {},
            activities: [],
            conflicts: [
                { field: 'Lunch item', localValue: 15, remoteValue: 25, remoteUser: 'Charlie', timestamp: new Date() }
            ],
            joinSplit: vi.fn(),
            leaveSplit: vi.fn(),
            setTyping: vi.fn(),
            sendUpdate: vi.fn(),
            resolveConflict: mockResolveConflict,
            updateCursor: vi.fn(),
        });

        render(<ConflictResolver />);
        expect(screen.getByText('Concurrent Edit Detected')).toBeDefined();
        expect(screen.getByText('Charlie')).toBeDefined();
        expect(screen.getByText('Lunch item')).toBeDefined();
        expect(screen.getByText('15')).toBeDefined();
        expect(screen.getByText('25')).toBeDefined();

        // Click Keep Mine
        fireEvent.click(screen.getByText('Keep Mine'));
        expect(mockResolveConflict).toHaveBeenCalledWith('Lunch item', 'local');

        // Click Accept Theirs
        fireEvent.click(screen.getByText('Accept Theirs'));
        expect(mockResolveConflict).toHaveBeenCalledWith('Lunch item', 'remote');
    });
});
