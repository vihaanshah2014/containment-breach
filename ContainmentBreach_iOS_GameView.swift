import SwiftUI
import SpriteKit

struct GameView: View {
    @State private var scene = GameScene()

    var body: some View {
        SpriteView(scene: scene, preferredFramesPerSecond: 60, options: [.ignoresSiblingOrder])
            .ignoresSafeArea()
            .onAppear {
                scene.scaleMode = .resizeFill
                scene.size = UIScreen.main.bounds.size
            }
    }
}

#Preview {
    GameView()
}
