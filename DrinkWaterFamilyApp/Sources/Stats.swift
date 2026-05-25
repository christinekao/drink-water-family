import Foundation

struct MemberDailyStats: Identifiable {
    let member: FamilyMember
    let bottleCount: Int

    var id: UUID { member.id }
    var goalBottles: Int { member.dailyGoalBottles }
    var amountMl: Int { bottleCount * 500 }
    var goalMl: Int { goalBottles * 500 }
    var remainingBottles: Int { max(goalBottles - bottleCount, 0) }
    var progress: Double {
        guard goalBottles > 0 else { return 0 }
        return min(Double(bottleCount) / Double(goalBottles), 1)
    }
    var progressPercent: Int { Int(progress * 100) }
    var hasReachedGoal: Bool { bottleCount >= goalBottles }
}

enum NudgeCopy {
    static let lines = [
        "你不喝水，小水滴會難過。",
        "小水豚等你喝水等到睡著了。",
        "你的水瓶在角落默默哭泣。",
        "今天的你，值得一瓶 500ml 的愛。",
        "再不喝水，你要進化成仙人掌了。",
        "你已經沉默太久了，快喝水。"
    ]

    static func random() -> String {
        lines.randomElement() ?? "該喝水囉～"
    }
}

extension Array where Element == DrinkEntry {
    func countFor(memberId: UUID, on date: Date = .now, calendar: Calendar = .current) -> Int {
        filter { entry in
            entry.memberId == memberId && calendar.isDate(entry.createdAt, inSameDayAs: date)
        }.count
    }

    func countFor(memberId: UUID, from startDate: Date, to endDate: Date) -> Int {
        filter { entry in
            entry.memberId == memberId && entry.createdAt >= startDate && entry.createdAt < endDate
        }.count
    }
}

