import SwiftUI
import SwiftData

@main
struct DrinkWaterFamilyApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
        }
        .modelContainer(for: [FamilyMember.self, DrinkEntry.self, Achievement.self])
    }
}

