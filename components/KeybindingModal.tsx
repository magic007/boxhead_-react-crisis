import React, { useState, useEffect } from 'react';
import { Action, KeyMap, getSavedKeyMap, saveKeyMap, DEFAULT_KEYMAP_P1, DEFAULT_KEYMAP_P2, ACTION_LABELS } from './game/inputConfig';
import { Difficulty } from '../types';

interface KeybindingModalProps {
  isOpen: boolean;
  onClose: () => void;
  showVirtualControls: boolean;
  onToggleVirtualControls: () => void;
  isMobile: boolean;
  onRequestFullScreen: () => void;
  livesPerPlayer: number;
  onLivesChange: (lives: number) => void;
  difficulty: Difficulty;
  onDifficultyChange: (difficulty: Difficulty) => void;
}

export const KeybindingModal: React.FC<KeybindingModalProps> = ({ 
  isOpen, 
  onClose, 
  showVirtualControls, 
  onToggleVirtualControls,
  isMobile,
  onRequestFullScreen,
  livesPerPlayer,
  onLivesChange,
  difficulty,
  onDifficultyChange
}) => {
  const [selectedTab, setSelectedTab] = useState<'general' | 1 | 2>('general');
  const [selectedPlayer, setSelectedPlayer] = useState<number>(1);
  const [keyMap, setKeyMap] = useState<KeyMap>(getSavedKeyMap(1));
  const [listeningAction, setListeningAction] = useState<Action | null>(null);
  const [showGamepadModal, setShowGamepadModal] = useState(false);
  const [gamepadInfo, setGamepadInfo] = useState<{
    supported: boolean;
    connected: number;
    gamepads: Array<{
      id: string;
      index: number;
      buttons: number;
      axes: number;
      mapping: string;
    }>;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (selectedTab === 'general') {
        setListeningAction(null);
      } else {
        setSelectedPlayer(selectedTab);
        setKeyMap(getSavedKeyMap(selectedTab));
        setListeningAction(null);
      }
    }
  }, [isOpen, selectedTab]);

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
    if (selectedTab !== 'general') {
      saveKeyMap(selectedTab, keyMap);
    }
    onClose();
  };
  
  const handleReset = () => {
    if (selectedTab !== 'general') {
      setKeyMap(selectedTab === 1 ? DEFAULT_KEYMAP_P1 : DEFAULT_KEYMAP_P2);
      setListeningAction(null);
    }
  };

  const detectGamepads = () => {
    const supported = 'getGamepads' in navigator;
    let connected = 0;
    const gamepads: Array<{
      id: string;
      index: number;
      buttons: number;
      axes: number;
      mapping: string;
    }> = [];

    if (supported) {
      // 尝试获取游戏手柄列表
      const gamepadList = navigator.getGamepads();
      if (gamepadList) {
        for (let i = 0; i < gamepadList.length; i++) {
          const gamepad = gamepadList[i];
          if (gamepad) {
            connected++;
            gamepads.push({
              id: gamepad.id || `手柄 ${i + 1}`,
              index: gamepad.index,
              buttons: gamepad.buttons.length,
              axes: gamepad.axes.length,
              mapping: gamepad.mapping || 'standard'
            });
          }
        }
      }

      // 如果当前没有检测到手柄，添加事件监听器等待连接
      if (connected === 0) {
        const handleGamepadConnected = (e: GamepadEvent) => {
          const gamepad = e.gamepad;
          if (gamepad) {
            setGamepadInfo({
              supported: true,
              connected: 1,
              gamepads: [{
                id: gamepad.id || '未知手柄',
                index: gamepad.index,
                buttons: gamepad.buttons.length,
                axes: gamepad.axes.length,
                mapping: gamepad.mapping || 'standard'
              }]
            });
          }
          window.removeEventListener('gamepadconnected', handleGamepadConnected);
        };

        window.addEventListener('gamepadconnected', handleGamepadConnected);
        // 5秒后移除监听器
        setTimeout(() => {
          window.removeEventListener('gamepadconnected', handleGamepadConnected);
        }, 5000);
      }
    }

    setGamepadInfo({
      supported,
      connected,
      gamepads
    });
    setShowGamepadModal(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={(e) => e.stopPropagation()}>
      <div className="bg-gray-900 border-2 border-gray-700 p-6 rounded-lg w-[500px] max-h-[80vh] overflow-y-auto shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-6 text-center uppercase tracking-wider">按键设置 (CONTROLS)</h2>
        
        {/* Tab Selection */}
        <div className="flex justify-center gap-2 mb-6">
          <button 
            onClick={() => setSelectedTab('general')}
            className={`px-4 py-2 font-bold rounded transition-colors ${
              selectedTab === 'general' 
                ? 'bg-gray-600 text-white' 
                : 'bg-gray-700 text-gray-400 hover:bg-gray-650'
            }`}
          >
            通用设置
          </button>
          <button 
            onClick={() => setSelectedTab(1)}
            className={`px-4 py-2 font-bold rounded transition-colors ${
              selectedTab === 1 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-700 text-gray-400 hover:bg-gray-650'
            }`}
          >
            玩家 1 (P1)
          </button>
          <button 
            onClick={() => setSelectedTab(2)}
            className={`px-4 py-2 font-bold rounded transition-colors ${
              selectedTab === 2 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-400 hover:bg-gray-650'
            }`}
          >
            玩家 2 (P2)
          </button>
        </div>

        {/* General Settings Tab */}
        {selectedTab === 'general' && (
          <div className="mb-8 p-4 bg-gray-800 rounded-lg border border-gray-600">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 font-medium">游戏难度 (Difficulty)</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onDifficultyChange(Difficulty.EASY)}
                    className={`px-4 py-2 rounded font-bold transition-colors ${
                      difficulty === Difficulty.EASY
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    简单
                  </button>
                  <button
                    onClick={() => onDifficultyChange(Difficulty.MEDIUM)}
                    className={`px-4 py-2 rounded font-bold transition-colors ${
                      difficulty === Difficulty.MEDIUM
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    中等
                  </button>
                  <button
                    onClick={() => onDifficultyChange(Difficulty.HARD)}
                    className={`px-4 py-2 rounded font-bold transition-colors ${
                      difficulty === Difficulty.HARD
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    困难
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300 font-medium">生命数量 (Lives Per Player)</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onLivesChange(Math.max(1, livesPerPlayer - 1))}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded transition-colors"
                  >
                    -
                  </button>
                  <span className="text-white font-bold min-w-[2rem] text-center">{livesPerPlayer}</span>
                  <button
                    onClick={() => onLivesChange(Math.min(10, livesPerPlayer + 1))}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
              {isMobile && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 font-medium">虚拟按键 (Virtual Controls)</span>
                  <button
                    onClick={onToggleVirtualControls}
                    className={`px-4 py-2 rounded font-bold transition-colors ${
                      showVirtualControls ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}
                  >
                    {showVirtualControls ? '开启 (ON)' : '关闭 (OFF)'}
                  </button>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-300 font-medium">全屏模式 (Fullscreen)</span>
                <button
                  onClick={onRequestFullScreen}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded transition-colors"
                >
                  进入全屏
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300 font-medium">手柄检测 (Gamepad)</span>
                <button
                  onClick={detectGamepads}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded transition-colors"
                >
                  检测手柄
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Player Settings Tab */}
        {selectedTab !== 'general' && (
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
        )}

        <div className="flex justify-between pt-4 border-t border-gray-700">
          {selectedTab !== 'general' && (
            <button 
              onClick={handleReset}
              className="px-4 py-2 text-red-400 hover:text-red-300 font-medium text-sm"
            >
              恢复默认
            </button>
          )}
          {selectedTab === 'general' && <div />}
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

      {/* Gamepad Detection Modal */}
      {showGamepadModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60]" onClick={() => setShowGamepadModal(false)}>
          <div className="bg-gray-900 border-2 border-gray-700 p-6 rounded-lg w-[500px] max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white mb-6 text-center uppercase tracking-wider">手柄检测结果</h2>
            
            {gamepadInfo && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-800 rounded-lg border border-gray-600">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300 font-medium">API 支持:</span>
                    <span className={`font-bold ${gamepadInfo.supported ? 'text-green-400' : 'text-red-400'}`}>
                      {gamepadInfo.supported ? '✓ 支持' : '✗ 不支持'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300 font-medium">已连接手柄:</span>
                    <span className="text-white font-bold">{gamepadInfo.connected} 个</span>
                  </div>
                </div>

                {!gamepadInfo.supported && (
                  <div className="p-4 bg-yellow-900/50 border border-yellow-700 rounded-lg">
                    <p className="text-yellow-200 text-sm">
                      您的浏览器不支持 Gamepad API。请使用现代浏览器（Chrome、Firefox、Edge 等）并确保已连接手柄。
                    </p>
                  </div>
                )}

                {gamepadInfo.supported && gamepadInfo.connected === 0 && (
                  <div className="p-4 bg-blue-900/50 border border-blue-700 rounded-lg">
                    <p className="text-blue-200 text-sm">
                      未检测到已连接的手柄。请确保：
                    </p>
                    <ul className="text-blue-200 text-sm mt-2 list-disc list-inside space-y-1">
                      <li>手柄已通过 USB 或蓝牙连接到设备</li>
                      <li>手柄已正确配对（蓝牙手柄）</li>
                      <li>按下手柄上的任意按钮以激活连接</li>
                    </ul>
                  </div>
                )}

                {gamepadInfo.gamepads.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-bold text-white">检测到的手柄:</h3>
                    {gamepadInfo.gamepads.map((gamepad, idx) => (
                      <div key={idx} className="p-4 bg-gray-800 rounded-lg border border-gray-600">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">手柄名称:</span>
                            <span className="text-white font-bold">{gamepad.id}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">索引:</span>
                            <span className="text-white font-bold">{gamepad.index}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">按钮数量:</span>
                            <span className="text-white font-bold">{gamepad.buttons} 个</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">摇杆数量:</span>
                            <span className="text-white font-bold">{gamepad.axes / 2} 个</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">映射标准:</span>
                            <span className="text-white font-bold">{gamepad.mapping === 'standard' ? '标准' : '自定义'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end mt-6 pt-4 border-t border-gray-700">
              <button 
                onClick={() => setShowGamepadModal(false)}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

