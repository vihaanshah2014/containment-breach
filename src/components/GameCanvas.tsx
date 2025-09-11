import React, { useRef, useEffect, useState } from 'react';
import { Game } from '../game/Game';
import { loadCharacterSpriteSets } from '../game/CharacterSprites';
import charactersUrl from '../assets/characters.png';

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameOver'>('menu');
  const gameStateRef = useRef<'menu' | 'playing' | 'gameOver'>(gameState);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(3);
  const [wave, setWave] = useState(1);
  const [hudTick, setHudTick] = useState(0); // force HUD refresh on actions

  // Keep a ref in sync with the latest game state to avoid stale closures
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Re-run responsive sizing when the state changes (sidebar appears in playing)
  useEffect(() => {
    window.dispatchEvent(new Event('resize'));
  }, [gameState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Compute and set canvas size responsively
    const resize = () => {
      const gap = 16; // space-x-4
      const sidebar = gameStateRef.current === 'playing' ? 300 + gap : 0; // fixed sidebar width + gap
      const padding = 16; // p-2 left+right total
      const width = Math.max(600, Math.floor(window.innerWidth - sidebar - padding));
      const height = Math.max(400, Math.floor(window.innerHeight - padding));
      canvas.width = width;
      canvas.height = height;
      if (gameRef.current) gameRef.current.resize(width, height);
    };
    resize();

    // Initialize game
    const game = new Game(canvas.width, canvas.height);
    gameRef.current = game;

    // Game state callbacks
    game.onScoreUpdate = setScore;
    game.onHealthUpdate = setHealth;
    game.onWaveUpdate = setWave;
    game.onGameOver = () => setGameState('gameOver');
    game.onHudUpdate = () => setHudTick(t => t + 1);

    // Load character sprites from src/assets/characters.png
    loadCharacterSpriteSets(charactersUrl)
      .then(sets => {
        game.setCharacterSprites(sets);
      })
      .catch(error => {
        console.error('Failed to load character sprites:', error);
      });

    // Input handlers
    const keys = new Set<string>();
    const mouse = { x: 0, y: 0, clicked: false, rightClicked: false };

    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowup' || k === 'arrowdown' || k === 'arrowleft' || k === 'arrowright') {
        e.preventDefault();
      }
      keys.add(k);
      if (k >= '1' && k <= '5' && gameRef.current) {
        const idx = parseInt(k, 10) - 1;
        gameRef.current.selectPlayerSprite(idx);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowup' || k === 'arrowdown' || k === 'arrowleft' || k === 'arrowright') {
        e.preventDefault();
      }
      keys.delete(k);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) { // Left click
        mouse.clicked = true;
      } else if (e.button === 2) { // Right click
        mouse.rightClicked = true;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) { // Left click
        mouse.clicked = false;
      } else if (e.button === 2) { // Right click
        mouse.rightClicked = false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // Prevent right-click menu
    };

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', resize);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('contextmenu', handleContextMenu);

    // Game loop
    let lastTime = 0;
    let animationId = 0;
    const gameLoop = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      // Update game
      if (gameStateRef.current === 'playing' && game) {
        game.update(deltaTime, keys, mouse);
        game.render(ctx, mouse);
        
        // Render minimap
        const minimapCanvas = minimapRef.current;
        if (minimapCanvas) {
          const minimapCtx = minimapCanvas.getContext('2d');
          if (minimapCtx) {
            game.renderMinimap(minimapCtx, minimapCanvas.width, minimapCanvas.height);
          }
        }
      }

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      cancelAnimationFrame(animationId);
    };
  }, []);

  const startGame = () => {
    if (gameRef.current) {
      gameRef.current.reset();
      setScore(0);
      setHealth(3);
      setWave(1);
    }
    setGameState('playing');
  };

  const restartGame = () => {
    if (gameRef.current) {
      gameRef.current.reset();
      setScore(0);
      setHealth(3);
      setWave(1);
    }
    setGameState('playing');
  };

  return (
    <div className="w-screen h-screen p-2 overflow-hidden flex flex-row items-start space-x-4">
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="border-2 border-red-500 bg-white cursor-crosshair"
        />

        {/* Menu Screen */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 bg-black bg-opacity-95 bg-grid-pattern bg-grid overflow-y-auto">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="max-w-4xl w-full text-white font-code">
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-6xl md:text-7xl font-bold mb-4 text-neon-400 animate-glow">
                  CONTAINMENT BREACH
                </h1>
                <div className="text-lg mb-2 text-electric-300 animate-flicker">
                  <span className="inline-block mr-2">&gt;</span>
                  FACILITY STATUS: 
                  <span className="text-danger-400 font-bold ml-2">CRITICAL</span>
                </div>
                <p className="text-base text-neon-200 mb-6">
                  Lab lockdown initiated. Glass containment compromised. Friendly fire protocols: LETHAL
                </p>
              </div>

              {/* How to Play Section */}
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                {/* Controls */}
                <div className="bg-gray-900/70 border border-neon-500/30 p-6 rounded-lg">
                  <h2 className="text-2xl font-bold mb-4 text-matrix-400 flex items-center">
                    <span className="mr-2">⌨️</span> CONTROLS
                  </h2>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Movement:</span>
                      <div className="flex space-x-1">
                        <kbd className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-electric-300">WASD</kbd>
                        <span className="text-gray-500">or</span>
                        <kbd className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-electric-300">↑↓←→</kbd>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Aim & Look:</span>
                      <kbd className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-plasma-300">Mouse</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Fire Weapon:</span>
                      <kbd className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-danger-400">Left Click</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Throw Weapon:</span>
                      <kbd className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-warning-400">Right Click</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Switch Sprite:</span>
                      <div className="flex space-x-1">
                        <kbd className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-neon-300">1</kbd>
                        <kbd className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-neon-300">2</kbd>
                        <kbd className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-neon-300">3</kbd>
                        <kbd className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-neon-300">4</kbd>
                        <kbd className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-neon-300">5</kbd>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gameplay */}
                <div className="bg-gray-900/70 border border-danger-500/30 p-6 rounded-lg">
                  <h2 className="text-2xl font-bold mb-4 text-danger-400 flex items-center">
                    <span className="mr-2">⚔️</span> COMBAT SYSTEM
                  </h2>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start space-x-3">
                      <span className="text-plasma-400 font-bold">●</span>
                      <div>
                        <span className="text-matrix-300 font-semibold">Katana:</span>
                        <span className="text-gray-300 ml-2">Swing in arcs, blocks bullets, durability cost</span>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="text-electric-400 font-bold">●</span>
                      <div>
                        <span className="text-matrix-300 font-semibold">Firearms:</span>
                        <span className="text-gray-300 ml-2">Limited ammo, high damage, throwable</span>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="text-warning-400 font-bold">●</span>
                      <div>
                        <span className="text-matrix-300 font-semibold">Environment:</span>
                        <span className="text-gray-300 ml-2">Walls block, glass breaks, use cover</span>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="text-neon-400 font-bold">●</span>
                      <div>
                        <span className="text-matrix-300 font-semibold">Shields:</span>
                        <span className="text-gray-300 ml-2">Cyan pickups provide protection</span>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="text-danger-400 font-bold">●</span>
                      <div>
                        <span className="text-matrix-300 font-semibold">Friendly Fire:</span>
                        <span className="text-gray-300 ml-2">Your bullets can kill allies - be careful!</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Survival Tips */}
              <div className="bg-gray-900/70 border border-plasma-500/30 p-6 rounded-lg mb-8">
                <h2 className="text-2xl font-bold mb-4 text-plasma-400 flex items-center">
                  <span className="mr-2">🧠</span> SURVIVAL PROTOCOL
                </h2>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-3xl mb-2">🎯</div>
                    <h3 className="font-bold text-electric-300 mb-1">ACCURACY MATTERS</h3>
                    <p className="text-gray-400">Every shot counts. Conserve ammo and aim carefully.</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-2">🏃</div>
                    <h3 className="font-bold text-matrix-300 mb-1">STAY MOBILE</h3>
                    <p className="text-gray-400">Moving targets are harder to hit. Never stand still.</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-2">🛡️</div>
                    <h3 className="font-bold text-neon-300 mb-1">USE COVER</h3>
                    <p className="text-gray-400">Walls protect you. Glass can be broken for flanking.</p>
                  </div>
                </div>
              </div>

              {/* Start Button */}
              <div className="text-center">
                <div className="mb-4">
                  <span className="text-warning-400 text-sm font-bold animate-pulse">
                    WARNING: CONTAINMENT BREACH IMMINENT
                  </span>
            </div>
            <button
              onClick={startGame}
                  className="group relative px-12 py-4 bg-gradient-to-r from-danger-600 to-danger-700 hover:from-danger-500 hover:to-danger-600 text-white font-bold text-xl transition-all duration-300 transform hover:scale-105 border border-danger-400 rounded-lg shadow-lg hover:shadow-xl"
                >
                  <span className="relative z-10 flex items-center justify-center">
                    <span className="mr-2">🚨</span>
                    INITIATE BREACH PROTOCOL
                    <span className="ml-2">🚨</span>
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-danger-400 to-danger-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-lg"></div>
            </button>
                <p className="text-xs text-gray-500 mt-2 font-mono">
                  &gt; System initialized. Good luck, Agent.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Game Over Screen */}
      {gameState === 'gameOver' && (
        <div className="absolute inset-0 bg-black bg-opacity-95 bg-grid-pattern bg-grid overflow-y-auto">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="max-w-2xl w-full text-white font-code">
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-6xl md:text-7xl font-bold mb-4 text-danger-400 animate-glow">
                  SYSTEM BREACH
                </h1>
                <div className="text-lg mb-2 text-danger-300 animate-flicker">
                  <span className="inline-block mr-2">&gt;</span>
                  CONTAINMENT STATUS: 
                  <span className="text-danger-500 font-bold ml-2">FAILED</span>
                </div>
                <p className="text-base text-danger-200 mb-6">
                  Agent compromised. Lab security protocols terminated.
                </p>
              </div>

              {/* Mission Results */}
              <div className="bg-gray-900/70 border border-danger-500/30 p-6 rounded-lg mb-8">
                <h2 className="text-3xl font-bold mb-6 text-danger-400 flex items-center justify-center">
                  <span className="mr-2">💀</span> MISSION REPORT <span className="ml-2">💀</span>
                </h2>
                
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  {/* Primary Stats */}
                  <div className="space-y-4">
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-electric-500/20">
                      <div className="text-lg text-electric-300 mb-2">FINAL SCORE</div>
                      <div className="text-4xl font-bold text-electric-400 font-mono">
                        {score.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-plasma-500/20">
                      <div className="text-lg text-plasma-300 mb-2">WAVES SURVIVED</div>
                      <div className="text-4xl font-bold text-plasma-400 font-mono">
                        {wave}
                      </div>
                    </div>
                  </div>

                  {/* Combat Stats */}
                  <div className="space-y-2">
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-matrix-500/20">
                      <div className="text-lg text-matrix-400 mb-3 flex items-center">
                        <span className="mr-2">⚔️</span>COMBAT ANALYSIS
                      </div>
                      {(() => {
                        const stats = gameRef.current?.getStats?.();
                        if (!stats) return <div className="text-gray-400">Data corrupted</div>;
                        const accuracy = Math.round((stats.bulletsHit / Math.max(1, stats.bulletsFired)) * 100);
                        return (
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-neon-300">Accuracy:</span>
                              <span className={`font-mono font-bold ${accuracy > 70 ? 'text-matrix-400' : accuracy > 50 ? 'text-warning-400' : 'text-danger-400'}`}>
                                {accuracy}%
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-warning-300">Thrown Kills:</span>
                              <span className="text-warning-400 font-mono font-bold">{stats.thrownKills}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-danger-300">Friendly Fire:</span>
                              <span className="text-danger-400 font-mono font-bold">{stats.friendlyFireKills}</span>
                            </div>
                            <div className="border-t border-gray-600 pt-2 mt-2">
                              <div className="text-xs text-gray-400 mb-1">TOP WEAPONS:</div>
                              <div className="grid grid-cols-2 gap-1 text-xs">
                                <div className="text-plasma-300">Pistol: <span className="text-plasma-400 font-mono">{stats.killsByWeapon.pistol || 0}</span></div>
                                <div className="text-electric-300">Rifle: <span className="text-electric-400 font-mono">{stats.killsByWeapon.rifle || 0}</span></div>
                                <div className="text-warning-300">Shotgun: <span className="text-warning-400 font-mono">{stats.killsByWeapon.shotgun || 0}</span></div>
                                <div className="text-matrix-300">Katana: <span className="text-matrix-400 font-mono">{stats.killsByWeapon.katana || 0}</span></div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Performance Rating */}
                <div className="text-center mb-4">
                  <div className="text-lg text-neon-300 mb-2">AGENT PERFORMANCE</div>
                  <div className={`text-2xl font-bold font-mono ${
                    score > 50000 ? 'text-matrix-400' : 
                    score > 25000 ? 'text-electric-400' : 
                    score > 10000 ? 'text-warning-400' : 
                    'text-danger-400'
                  }`}>
                    {score > 50000 ? '★ LEGENDARY ★' : 
                     score > 25000 ? '◆ ELITE ◆' : 
                     score > 10000 ? '▲ OPERATIVE ▲' : 
                     '● RECRUIT ●'}
                  </div>
                </div>
              </div>

              {/* Restart Button */}
              <div className="text-center">
                <div className="mb-4">
                  <span className="text-warning-400 text-sm font-bold animate-pulse">
                    INITIATING EMERGENCY REBOOT...
                  </span>
                </div>
            <button
              onClick={restartGame}
                  className="group relative px-12 py-4 bg-gradient-to-r from-danger-600 to-danger-700 hover:from-danger-500 hover:to-danger-600 text-white font-bold text-xl transition-all duration-300 transform hover:scale-105 border border-danger-400 rounded-lg shadow-lg hover:shadow-xl"
                >
                  <span className="relative z-10 flex items-center justify-center">
                    <span className="mr-2">🔄</span>
                    RESTART MISSION
                    <span className="ml-2">🔄</span>
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-danger-400 to-danger-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-lg"></div>
            </button>
                <p className="text-xs text-gray-500 mt-2 font-mono">
                  &gt; Backup systems online. Try again, Agent.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* HUD sidebar on the right */}
      {gameState === 'playing' && (
        <div className="w-[300px] flex-none font-code font-bold px-2 space-y-3 bg-gray-900/90 border-l-2 border-neon-500/30 backdrop-blur-sm">
          {/* Stats Header */}
          <div className="text-2xl text-neon-400 border-b border-neon-500/30 pb-2 flex items-center">
            <span className="mr-2">📊</span>
            SYSTEM STATUS
          </div>
          
          {/* Core Stats */}
          <div className="space-y-2 bg-gray-800/50 p-3 rounded-lg border border-electric-500/20">
            <div className="text-xl text-electric-300 flex justify-between items-center">
              <span>SCORE:</span>
              <span className="text-matrix-400 font-mono">{score.toLocaleString()}</span>
            </div>
            <div className="text-xl text-plasma-300 flex justify-between items-center">
              <span>WAVE:</span>
              <span className="text-warning-400 font-mono">{wave}</span>
            </div>
            <div className="text-xl text-neon-300 flex justify-between items-center">
              <span>ROOM:</span>
              <span className="text-electric-200 font-mono text-sm">{gameRef.current?.getPlayerRoomLabel?.() || 'Hallway'}</span>
            </div>
          </div>

          {/* Weapon Info */}
          <div className="bg-gray-800/50 p-3 rounded-lg border border-danger-500/20">
            <div className="text-lg text-danger-400 mb-2 flex items-center">
              <span className="mr-2">⚔️</span>
              ARMAMENT
            </div>
            <div className="space-y-1">
              <div className="text-lg text-warning-300 flex justify-between items-center">
                <span>WEAPON:</span>
                <span className="text-warning-400 font-mono text-sm">{gameRef.current?.player?.weapon?.type.toUpperCase() || 'FISTS'}</span>
              </div>
            {gameRef.current?.player?.weapon && gameRef.current.player.weapon.type !== 'katana' && (
                <div className="text-lg text-electric-300 flex justify-between items-center">
                  <span>AMMO:</span>
                  <span className="text-electric-400 font-mono">{gameRef.current.player.weapon.ammo}/{gameRef.current.player.weapon.maxAmmo}</span>
                </div>
            )}
            {gameRef.current?.player?.weapon && (
                <div className="text-lg text-plasma-300 flex justify-between items-center">
                  <span>DURABILITY:</span>
                  <span className={`font-mono ${Math.ceil(gameRef.current.player.weapon.getDurabilityPercentage() * 100) > 50 ? 'text-matrix-400' : Math.ceil(gameRef.current.player.weapon.getDurabilityPercentage() * 100) > 20 ? 'text-warning-400' : 'text-danger-400'}`}>
                    {Math.ceil(gameRef.current.player.weapon.getDurabilityPercentage() * 100)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Player Status */}
          <div className="bg-gray-800/50 p-3 rounded-lg border border-matrix-500/20">
            <div className="text-lg text-matrix-400 mb-2 flex items-center">
              <span className="mr-2">🛡️</span>
              VITALS
            </div>
            <div className="space-y-2">
              <div className="text-lg text-neon-300 flex justify-between items-center">
                <span>SHIELD:</span>
                <span className={`font-mono ${Math.round(gameRef.current ? gameRef.current['player']['shield'] : 0) > 50 ? 'text-neon-400' : 'text-warning-400'}`}>
                  {gameRef.current ? Math.round(gameRef.current['player']['shield']) : 0}%
                </span>
              </div>
              <div className="flex items-center text-lg text-danger-300">
                <span className="mr-3">HEALTH:</span>
                <div className="flex space-x-1">
              {Array.from({ length: health }, (_, i) => (
                    <div key={i} className="w-5 h-3 bg-gradient-to-r from-danger-400 to-danger-600 border border-danger-300 rounded-sm shadow-sm"></div>
                  ))}
                  {Array.from({ length: 3 - health }, (_, i) => (
                    <div key={i + health} className="w-5 h-3 bg-gray-700 border border-gray-600 rounded-sm"></div>
              ))}
                </div>
              </div>
            </div>
          </div>

          {/* Kill Stats */}
          {(() => {
            const stats = gameRef.current?.getStats?.();
            if (!stats) return null;
            const accuracy = Math.round((stats.bulletsHit / Math.max(1, stats.bulletsFired)) * 100);
            return (
              <div className="bg-gray-800/50 p-3 rounded-lg border border-plasma-500/20">
                <div className="text-lg text-plasma-400 mb-2 flex items-center">
                  <span className="mr-2">💀</span>
                  COMBAT STATS
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between items-center text-electric-300">
                    <span>Accuracy:</span>
                    <span className={`font-mono ${accuracy > 70 ? 'text-matrix-400' : accuracy > 50 ? 'text-warning-400' : 'text-danger-400'}`}>
                      {accuracy}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-danger-300">
                    <span>Friendly Fire:</span>
                    <span className="text-danger-400 font-mono">{stats.friendlyFireKills}</span>
                  </div>
                  <div className="flex justify-between items-center text-warning-300">
                    <span>Thrown Kills:</span>
                    <span className="text-warning-400 font-mono">{stats.thrownKills}</span>
                  </div>
                  <div className="text-neon-300 font-semibold mt-2 mb-1">Weapon Kills:</div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div className="text-plasma-300">Pistol: <span className="text-plasma-400 font-mono">{stats.killsByWeapon.pistol || 0}</span></div>
                    <div className="text-electric-300">Rifle: <span className="text-electric-400 font-mono">{stats.killsByWeapon.rifle || 0}</span></div>
                    <div className="text-warning-300">Shotgun: <span className="text-warning-400 font-mono">{stats.killsByWeapon.shotgun || 0}</span></div>
                    <div className="text-matrix-300">Katana: <span className="text-matrix-400 font-mono">{stats.killsByWeapon.katana || 0}</span></div>
                  </div>
                </div>
              </div>
            );
          })()}
          
          {/* Minimap */}
          <div className="bg-gray-800/50 p-3 rounded-lg border border-neon-500/20">
            <div className="text-lg text-neon-400 mb-2 flex items-center">
              <span className="mr-2">🗺️</span>
              TACTICAL MAP
            </div>
            <canvas 
              ref={minimapRef}
              width={150}
              height={150}
              className="border-2 border-neon-500/40 bg-black rounded shadow-inner"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default GameCanvas;
