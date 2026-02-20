import { useCollaboration } from '../../hooks/useCollaboration';
import { AlertTriangle, X } from 'lucide-react';

export function ConflictResolver() {
    const { conflicts, resolveConflict } = useCollaboration();

    if (conflicts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-4 max-w-sm" id="conflict-resolver">
            {conflicts.map((conflict, idx) => (
                <div key={idx} className="bg-white border-l-4 border-orange-500 rounded-lg shadow-xl p-4 animate-in slide-in-from-bottom flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 text-orange-600 font-bold">
                            <AlertTriangle className="w-5 h-5" />
                            <span>Concurrent Edit Detected</span>
                        </div>
                        <button onClick={() => resolveConflict(conflict.field, 'local')} className="text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <p className="text-sm text-gray-600">
                        <span className="font-semibold">{conflict.remoteUser}</span> also edited <span className="font-medium text-gray-900">{conflict.field}</span>.
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-gray-50 p-2 rounded border border-gray-100">
                            <span className="block text-gray-400 mb-1">Your change</span>
                            <span className="font-medium text-gray-900">{JSON.stringify(conflict.localValue)}</span>
                        </div>
                        <div className="bg-orange-50 p-2 rounded border border-orange-100">
                            <span className="block text-orange-400 mb-1">Their change</span>
                            <span className="font-medium text-gray-900">{JSON.stringify(conflict.remoteValue)}</span>
                        </div>
                    </div>

                    <div className="flex gap-2 mt-2">
                        <button
                            onClick={() => resolveConflict(conflict.field, 'local')}
                            className="flex-1 py-1.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium rounded-md transition"
                        >
                            Keep Mine
                        </button>
                        <button
                            onClick={() => resolveConflict(conflict.field, 'remote')}
                            className="flex-1 py-1.5 px-3 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-md transition"
                        >
                            Accept Theirs
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
