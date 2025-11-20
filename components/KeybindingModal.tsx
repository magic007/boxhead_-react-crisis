import React, { useState, useEffect } from 'react';
import { Action, KeyMap, getSavedKeyMap, saveKeyMap, DEFAULT_KEYMAP_P1, DEFAULT_KEYMAP_P2, ACTION_LABELS } from './game/inputConfig';

interface KeybindingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeybindingModal: React.FC<KeybindingModalProps> = ({ isOpen, onClose }) => {
  const [selectedPlayer, setSelectedPlayer] = useState<number>(1);
  const [keyMap, setKeyMap] = useState<KeyMap>(getSavedKeyMap(1));
  const [listeningAction, setListeningAction] = useState<Action | null>(null);

  useEffect(() => {
    if (isOpen) {
      setKeyMap(getSavedKeyMap(selectedPlayer));
      setListeningAction(null);
    }
  }, [isOpen, selectedPlayer]);

  useEffect(() => {
    if (!listeningAction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      setKeyMap(prev => ({
        ...prev,
        [listeningAction]: e.code
      }));
      setListeningAction(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [listeningAction]);

  const formatKey = (code: string) => {
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    if (code.startsWith('Arrow')) return code.slice(5);
    return code;
  };

  const handleSave = () => {
    saveKeyMap(selectedPlayer, keyMap);
    onClose();
  };
  
  const handleReset = () => {
      setKeyMap(selectedPlayer === 1 ? DEFAULT_KEYMAP_P1 : DEFAULT_KEYMAP_P2);
      setListeningAction(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={(e) => e.stopPropagation()}>
      <div className="bg-gray-900 border-2 border-gray-700 p-6 rounded-lg w-[500px] max-h-[80vh] overflow-y-auto shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-6 text-center uppercase tracking-wider">按键设置 (CONTROLS)</h2>
        
        <div className="flex justify-center gap-4 mb-6">
            <button 
                onClick={() => setSelectedPlayer(1)}
                className={`px-4 py-2 font-bold rounded ${selectedPlayer === 1 ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-400'}`}
            >
                玩家 1 (P1)
            </button>
            <button 
                onClick={() => setSelectedPlayer(2)}
                className={`px-4 py-2 font-bold rounded ${selectedPlayer === 2 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}
            >
                玩家 2 (P2)
            </button>
        </div>

        <div className="space-y-3 mb-8">
          {Object.values(Action).map((action) => (
            <div key={action} className="flex items-center justify-between bg-gray-800 p-3 rounded hover:bg-gray-750 transition-colors">
              <span className="text-gray-300 font-medium">{ACTION_LABELS[action]}</span>
              <button 
                onClick={() => setListeningAction(action)}
                className={`
                  px-4 py-2 rounded font-mono font-bold min-w-[120px] text-center border-2 transition-all
                  ${listeningAction === action 
                    ? 'bg-yellow-500 text-black border-yellow-600 animate-pulse scale-105' 
                    : 'bg-gray-700 text-white border-gray-600 hover:border-gray-500 hover:bg-gray-600'}
                `}
              >
                {listeningAction === action ? '请按键...' : formatKey(keyMap[action] || '')}
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-between pt-4 border-t border-gray-700">
           <button 
            onClick={handleReset}
            className="px-4 py-2 text-red-400 hover:text-red-300 font-medium text-sm"
          >
            恢复默认
          </button>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2 text-gray-400 hover:text-white font-bold"
            >
              取消
            </button>
            <button 
              onClick={handleSave}
              className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded shadow-lg hover:shadow-green-900/50 transition-all"
            >
              保存修改
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

