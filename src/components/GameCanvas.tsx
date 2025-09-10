import React, { useRef, useEffect, useState } from 'react';
import { Game } from '../game/Game';

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

    // Input handlers
    const keys = new Set<string>();
    const mouse = { x: 0, y: 0, clicked: false, rightClicked: false };

    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowup' || k === 'arrowdown' || k === 'arrowleft' || k === 'arrowright') {
        e.preventDefault();
      }
      keys.add(k);
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
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Menu Screen */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-6xl font-bold mb-4 text-red-500">SUPERHOT</h1>
            <p className="text-xl mb-8">UNLIMITED</p>
            <p className="mb-4">Time moves only when you move</p>
            <div className="mb-4 text-sm space-y-1">
              <p>WASD or Arrow Keys to move</p>
              <p>Left click to shoot/attack/punch</p>
              <p>Right click to throw weapon</p>
              <p>Walk over weapons to pick them up</p>
              <p>Weapons degrade with use</p>
              <p>Shurikens: throw with Left Click when equipped</p>
              <p>Some enemies are shielded — break shields first</p>
              <p>Pick up cyan shields to gain protection</p>
            </div>
            <button
              onClick={startGame}
              className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xl transition-colors"
            >
              START
            </button>
          </div>
        </div>
      )}

        {/* Game Over Screen */}
      {gameState === 'gameOver' && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold mb-4 text-red-500">GAME OVER</h1>
            <p className="text-2xl mb-4">Final Score: {score}</p>
            <p className="text-xl mb-4">Waves Survived: {wave}</p>
            <button
              onClick={restartGame}
              className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xl transition-colors"
            >
              RESTART
            </button>
          </div>
        </div>
      )}
      </div>

      {/* HUD sidebar on the right */}
      {gameState === 'playing' && (
        <div className="w-[300px] flex-none text-red-600 font-mono font-bold px-2 space-y-3">
          <div className="text-2xl">STATS</div>
          <div className="space-y-2">
            <div className="text-xl">SCORE: {score}</div>
            <div className="text-xl">WAVE: {wave}</div>
            <div className="text-xl break-words">WEAPON: {gameRef.current?.player?.weapon?.type.toUpperCase() || 'FISTS'}</div>
            {gameRef.current?.player?.weapon && gameRef.current.player.weapon.type !== 'katana' && (
              <div className="text-xl">AMMO: {gameRef.current.player.weapon.ammo}/{gameRef.current.player.weapon.maxAmmo}</div>
            )}
            {gameRef.current?.player?.weapon && (
              <div className="text-xl">DURABILITY: {Math.ceil(gameRef.current.player.weapon.getDurabilityPercentage() * 100)}%</div>
            )}
            <div className="text-xl">SHIELD: {gameRef.current ? Math.round(gameRef.current['player']['shield']) : 0}%</div>
            <div className="flex items-center text-xl">
              HEALTH:
              {Array.from({ length: health }, (_, i) => (
                <div key={i} className="w-4 h-4 bg-red-500 ml-2"></div>
              ))}
            </div>
          </div>
          {/* Kill Stats */}
          {(() => {
            const stats = gameRef.current?.getStats?.();
            if (!stats) return null;
            const accuracy = Math.round((stats.bulletsHit / Math.max(1, stats.bulletsFired)) * 100);
            return (
              <div className="space-y-1 pt-2 border-t border-red-600/40">
                <div className="text-2xl">KILL STATS</div>
                <div className="text-xl">Accuracy: {accuracy}%</div>
                <div className="text-xl">Friendly Fire Kills: {stats.friendlyFireKills}</div>
                <div className="text-xl">Thrown Kills: {stats.thrownKills}</div>
                <div className="text-xl">Top Guns:</div>
                <div className="text-sm leading-tight">
                  <div>Pistol: {stats.killsByWeapon.pistol || 0}</div>
                  <div>Rifle: {stats.killsByWeapon.rifle || 0}</div>
                  <div>Shotgun: {stats.killsByWeapon.shotgun || 0}</div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default GameCanvas;
