import SwiftUI

extension Color {
    static let appBackground = Color(red: 0.94, green: 0.99, blue: 1.0)
    static let primaryText = Color(red: 0.09, green: 0.20, blue: 0.30)
    static let secondaryText = Color(red: 0.33, green: 0.45, blue: 0.55)
}

struct AvatarBadge: View {
    let member: FamilyMember
    let size: CGFloat

    var body: some View {
        ZStack {
            Circle()
                .fill(LinearGradient(colors: [.cyan.opacity(0.25), .green.opacity(0.18)], startPoint: .topLeading, endPoint: .bottomTrailing))

            Image(systemName: member.avatar.symbol)
                .font(.system(size: size * 0.42, weight: .black))
                .foregroundStyle(.cyan)
        }
        .frame(width: size, height: size)
        .accessibilityLabel(member.avatar.rawValue)
    }
}

extension View {
    func dashboardPanel() -> some View {
        self
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.white)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .shadow(color: .black.opacity(0.06), radius: 12, y: 6)
    }
}

extension DateFormatter {
    static let monthDay: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "zh_Hant_TW")
        formatter.dateFormat = "M/d"
        return formatter
    }()

    static let shortWeekday: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "zh_Hant_TW")
        formatter.dateFormat = "E"
        return formatter
    }()
}

