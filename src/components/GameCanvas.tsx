import React, { useRef, useEffect, useState } from 'react';
import { Game } from '../game/Game';

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameOver'>('menu');
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(3);
  const [wave, setWave] = useState(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 800;
    canvas.height = 600;

    // Initialize game
    const game = new Game(canvas.width, canvas.height);
    gameRef.current = game;

    // Game state callbacks
    game.onScoreUpdate = setScore;
    game.onHealthUpdate = setHealth;
    game.onWaveUpdate = setWave;
    game.onGameOver = () => setGameState('gameOver');

    // Input handlers
    const keys = new Set<string>();
    const mouse = { x: 0, y: 0, clicked: false, rightClicked: false };

    const handleKeyDown = (e: KeyboardEvent) => {
      keys.add(e.key.toLowerCase());
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key.toLowerCase());
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
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('contextmenu', handleContextMenu);

    // Game loop
    let lastTime = 0;
    const gameLoop = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      // Update game
      if (gameState === 'playing' && game) {
        game.update(deltaTime, keys, mouse);
        game.render(ctx, mouse);
      }

      requestAnimationFrame(gameLoop);
    };

    gameLoop(0);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [gameState]);

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
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="border-2 border-red-500 bg-white cursor-crosshair"
        style={{ imageRendering: 'pixelated' }}
      />
      
      {/* UI Overlay */}
      {gameState === 'playing' && (
        <div className="absolute top-4 left-4 text-red-600 font-mono text-xl font-bold">
          <div>SCORE: {score}</div>
          <div>WAVE: {wave}</div>
          <div>WEAPON: {gameRef.current?.player?.weapon?.type.toUpperCase() || 'FISTS'}</div>
          {gameRef.current?.player?.weapon && gameRef.current.player.weapon.type !== 'katana' && (
            <div>AMMO: {gameRef.current.player.weapon.ammo}/{gameRef.current.player.weapon.maxAmmo}</div>
          )}
          {gameRef.current?.player?.weapon && (
            <div>DURABILITY: {Math.ceil(gameRef.current.player.weapon.getDurabilityPercentage() * 100)}%</div>
          )}
          <div className="flex items-center mt-2">
            HEALTH: 
            {Array.from({ length: health }, (_, i) => (
              <div key={i} className="w-4 h-4 bg-red-500 ml-2"></div>
            ))}
          </div>
        </div>
      )}

      {/* Menu Screen */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-6xl font-bold mb-4 text-red-500">SUPERHOT</h1>
            <p className="text-xl mb-8">UNLIMITED</p>
            <p className="mb-4">Time moves only when you move</p>
            <div className="mb-4 text-sm space-y-1">
              <p>WASD to move</p>
              <p>Left click to shoot/attack/punch</p>
              <p>Right click to throw weapon</p>
              <p>Walk over weapons to pick them up</p>
              <p>Weapons degrade with use</p>
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
  );
};

export default GameCanvas;