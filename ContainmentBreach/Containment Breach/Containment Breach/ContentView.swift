import SwiftUI
import SpriteKit

struct GameView: View {
    @State private var scene: GameScene?

    var body: some View {
        Group {
            if let scene = scene {
                SpriteView(scene: scene, preferredFramesPerSecond: 60, options: [.ignoresSiblingOrder])
                    .ignoresSafeArea()
            } else {
                Color.red // Debug: show red if scene is nil
                    .ignoresSafeArea()
            }
        }
        .onAppear {
            print("GameView onAppear called")
            if scene == nil {
                print("Creating new GameScene...")
                let screenSize = UIScreen.main.bounds.size
                print("Screen bounds: \(screenSize)")
                
                // Create scene with proper size BEFORE it loads
                let newScene = GameScene(size: screenSize)
                newScene.scaleMode = .resizeFill
                print("Scene created with size: \(newScene.size)")
                scene = newScene
            }
        }
    }
}

#Preview {
    GameView()
}
