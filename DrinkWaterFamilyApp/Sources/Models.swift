import Foundation
import SwiftData

enum AvatarType: String, CaseIterable, Codable, Identifiable {
    case droplet = "小水滴"
    case capybara = "水豚"
    case penguin = "企鵝"
    case seal = "海豹"

    var id: String { rawValue }

    var symbol: String {
        switch self {
        case .droplet: return "drop.fill"
        case .capybara: return "leaf.fill"
        case .penguin: return "snowflake"
        case .seal: return "figure.pool.swim"
        }
    }
}

@Model
final class FamilyMember {
    var id: UUID
    var name: String
    var avatarRawValue: String
    var dailyGoalBottles: Int
    var reminderEnabled: Bool
    var reminderIntervalHours: Int
    var reminderStartHour: Int
    var reminderEndHour: Int
    var createdAt: Date
    var updatedAt: Date

    init(
        id: UUID = UUID(),
        name: String,
        avatar: AvatarType,
        dailyGoalBottles: Int,
        reminderEnabled: Bool = true,
        reminderIntervalHours: Int = 3,
        reminderStartHour: Int = 8,
        reminderEndHour: Int = 21,
        createdAt: Date = .now,
        updatedAt: Date = .now
    ) {
        self.id = id
        self.name = name
        self.avatarRawValue = avatar.rawValue
        self.dailyGoalBottles = dailyGoalBottles
        self.reminderEnabled = reminderEnabled
        self.reminderIntervalHours = reminderIntervalHours
        self.reminderStartHour = reminderStartHour
        self.reminderEndHour = reminderEndHour
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    var avatar: AvatarType {
        get { AvatarType(rawValue: avatarRawValue) ?? .droplet }
        set { avatarRawValue = newValue.rawValue }
    }
}

@Model
final class DrinkEntry {
    var id: UUID
    var memberId: UUID
    var amountMl: Int
    var createdAt: Date

    init(id: UUID = UUID(), memberId: UUID, amountMl: Int = 500, createdAt: Date = .now) {
        self.id = id
        self.memberId = memberId
        self.amountMl = amountMl
        self.createdAt = createdAt
    }
}

@Model
final class Achievement {
    var id: UUID
    var memberId: UUID?
    var type: String
    var unlockedAt: Date

    init(id: UUID = UUID(), memberId: UUID?, type: String, unlockedAt: Date = .now) {
        self.id = id
        self.memberId = memberId
        self.type = type
        self.unlockedAt = unlockedAt
    }
}

