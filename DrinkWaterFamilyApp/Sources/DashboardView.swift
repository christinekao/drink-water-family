import SwiftUI
import Charts

struct DashboardView: View {
    let members: [FamilyMember]
    let entries: [DrinkEntry]

    private let waterTotalCost = 210.0

    private var stats: [MemberDailyStats] {
        members.map { MemberDailyStats(member: $0, bottleCount: entries.countFor(memberId: $0.id)) }
    }

    private var totalMl: Int {
        stats.reduce(0) { $0 + $1.amountMl }
    }

    private var champion: MemberDailyStats? {
        stats.max { $0.bottleCount < $1.bottleCount }
    }

    private var needsWater: MemberDailyStats? {
        stats.max { $0.remainingBottles < $1.remainingBottles }
    }

    private var costStartDate: Date {
        var components = DateComponents()
        components.year = 2026
        components.month = 5
        components.day = 22
        return Calendar.current.date(from: components) ?? .now
    }

    private var costBottleCount: Int {
        entries.filter { $0.createdAt >= costStartDate }.count
    }

    private var costPerBottleText: String {
        guard costBottleCount > 0 else { return "--" }
        let value = waterTotalCost / Double(costBottleCount)
        return value.rounded() == value ? "\(Int(value))" : String(format: "%.2f", value)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                VStack(alignment: .leading, spacing: 10) {
                    Text("今日家庭總喝水量")
                        .font(.headline)
                    Text("\(totalMl) ml")
                        .font(.system(size: 46, weight: .black, design: .rounded))
                    HStack {
                        Label("冠軍 \(champion?.member.name ?? "-")", systemImage: "crown.fill")
                        Spacer()
                        Label("補水提醒 \(needsWater?.member.name ?? "-")", systemImage: "bell.fill")
                    }
                    .font(.subheadline.bold())
                    .foregroundStyle(.secondaryText)
                }
                .dashboardPanel()

                VStack(alignment: .leading, spacing: 10) {
                    Text("水成本（5/22 起）")
                        .font(.headline)
                    Text("\(costPerBottleText) 元 / 瓶")
                        .font(.system(size: 42, weight: .black, design: .rounded))
                    Text("210 元 / 累計 \(costBottleCount) 瓶 · \(costBottleCount * 500) ml")
                        .font(.subheadline.bold())
                        .foregroundStyle(.secondaryText)
                }
                .dashboardPanel()

                ForEach(stats) { item in
                    MemberProgressRow(stats: item)
                }

                VStack(alignment: .leading, spacing: 12) {
                    Text("5/22 起統計")
                        .font(.headline)

                    Chart(weeklyPoints, id: \.day) { point in
                        BarMark(
                            x: .value("日期", point.day),
                            y: .value("瓶數", point.bottles)
                        )
                        .foregroundStyle(Color.cyan.gradient)
                    }
                    .frame(height: 180)
                }
                .dashboardPanel()
            }
            .padding(20)
        }
        .background(Color.appBackground)
    }

    private var weeklyPoints: [(day: String, bottles: Int)] {
        let calendar = Calendar.current
        let startDate = calendar.startOfDay(for: costStartDate)
        let today = calendar.startOfDay(for: .now)
        let dayCount = max(calendar.dateComponents([.day], from: startDate, to: today).day ?? 0, 0) + 1

        return (0..<dayCount).map { offset in
            let date = calendar.date(byAdding: .day, value: offset, to: startDate) ?? startDate
            let nextDate = calendar.date(byAdding: .day, value: 1, to: date) ?? date
            let bottles = entries.filter { $0.createdAt >= date && $0.createdAt < nextDate }.count
            let day = DateFormatter.monthDay.string(from: date)
            return (day, bottles)
        }
    }
}

struct MemberProgressRow: View {
    let stats: MemberDailyStats

    var body: some View {
        HStack(spacing: 14) {
            AvatarBadge(member: stats.member, size: 58)

            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(stats.member.name)
                        .font(.title3.bold())
                    Spacer()
                    Text("\(stats.progressPercent)%")
                        .font(.headline)
                }

                ProgressView(value: stats.progress)
                    .tint(stats.hasReachedGoal ? .green : .cyan)

                Text("\(stats.bottleCount)/\(stats.goalBottles) 瓶 · \(stats.amountMl) ml · 還差 \(stats.remainingBottles) 瓶")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.secondaryText)
            }
        }
        .dashboardPanel()
    }
}
