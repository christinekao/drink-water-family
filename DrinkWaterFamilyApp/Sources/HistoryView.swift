import SwiftUI
import Charts

struct HistoryView: View {
    @Environment(\.modelContext) private var modelContext

    let members: [FamilyMember]
    let entries: [DrinkEntry]

    @State private var editingDay: HistoryDay?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text("5/22 起紀錄")
                    .font(.title2.bold())

                Text("點選某一天可以幫家人補登或修正瓶數。")
                    .font(.headline)
                    .foregroundStyle(.secondaryText)

                Chart(lastSevenDays) { point in
                    LineMark(
                        x: .value("日期", point.day),
                        y: .value("瓶數", point.bottles)
                    )
                    .foregroundStyle(Color.cyan)
                    .symbol(.circle)
                }
                .frame(height: 220)
                .dashboardPanel()

                ForEach(lastSevenDays.reversed()) { point in
                    Button {
                        editingDay = point
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 6) {
                                Text(point.day)
                                    .font(.title2.bold())
                                    .foregroundStyle(.primaryText)
                                Text("點一下編輯紀錄")
                                    .font(.subheadline.bold())
                                    .foregroundStyle(.secondaryText)
                            }
                            Spacer()
                            VStack(alignment: .trailing, spacing: 6) {
                                Text("\(point.bottles) 瓶")
                                    .font(.title3.bold())
                                    .foregroundStyle(.primaryText)
                                Text("\(point.bottles * 500) ml")
                                    .foregroundStyle(.secondaryText)
                            }
                        }
                    }
                    .dashboardPanel()
                }
            }
            .padding(20)
        }
        .background(Color.appBackground)
        .sheet(item: $editingDay) { day in
            HistoryEditorView(
                day: day,
                members: members,
                entries: entries,
                setBottleCount: setBottleCount
            )
        }
    }

    private var lastSevenDays: [HistoryDay] {
        let calendar = Calendar.current
        var components = DateComponents()
        components.year = 2026
        components.month = 5
        components.day = 22
        let startDate = calendar.startOfDay(for: calendar.date(from: components) ?? .now)
        let today = calendar.startOfDay(for: .now)
        let dayCount = max(calendar.dateComponents([.day], from: startDate, to: today).day ?? 0, 0) + 1

        return (0..<dayCount).map { offset in
            let date = calendar.date(byAdding: .day, value: offset, to: startDate) ?? startDate
            let nextDate = calendar.date(byAdding: .day, value: 1, to: date) ?? date
            let bottles = entries.filter { $0.createdAt >= date && $0.createdAt < nextDate }.count
            return HistoryDay(date: date, day: DateFormatter.monthDay.string(from: date), bottles: bottles)
        }
    }

    private func setBottleCount(member: FamilyMember, date: Date, targetCount: Int) {
        let calendar = Calendar.current
        let startDate = calendar.startOfDay(for: date)
        let endDate = calendar.date(byAdding: .day, value: 1, to: startDate) ?? startDate
        let currentEntries = entries.filter {
            $0.memberId == member.id && $0.createdAt >= startDate && $0.createdAt < endDate
        }

        if targetCount > currentEntries.count {
            for index in currentEntries.count..<targetCount {
                let createdAt = calendar.date(byAdding: .minute, value: index, to: startDate) ?? startDate
                modelContext.insert(DrinkEntry(memberId: member.id, createdAt: createdAt))
            }
            return
        }

        let removeCount = currentEntries.count - targetCount
        currentEntries.prefix(removeCount).forEach(modelContext.delete)
    }
}

struct HistoryDay: Identifiable {
    let date: Date
    let day: String
    let bottles: Int

    var id: Date { date }
}

struct HistoryEditorView: View {
    @Environment(\.dismiss) private var dismiss

    let day: HistoryDay
    let members: [FamilyMember]
    let entries: [DrinkEntry]
    let setBottleCount: (FamilyMember, Date, Int) -> Void

    @State private var selectedMemberId: UUID?
    @State private var bottleCount = 0

    private var selectedMember: FamilyMember? {
        if let selectedMemberId, let member = members.first(where: { $0.id == selectedMemberId }) {
            return member
        }
        return members.first
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("家人") {
                    Picker("家人", selection: selectedBinding) {
                        ForEach(members) { member in
                            Text(member.name).tag(member.id)
                        }
                    }
                    .pickerStyle(.segmented)
                    .onChange(of: selectedMemberId) { _, _ in
                        syncBottleCount()
                    }
                }

                Section("當天瓶數") {
                    HStack {
                        Button {
                            bottleCount = max(0, bottleCount - 1)
                        } label: {
                            Image(systemName: "minus.circle.fill")
                                .font(.largeTitle)
                        }

                        Spacer()

                        VStack(spacing: 6) {
                            Text("\(bottleCount) 瓶")
                                .font(.largeTitle.bold())
                            Text("\(bottleCount * 500) ml")
                                .font(.title3.bold())
                                .foregroundStyle(.secondaryText)
                        }

                        Spacer()

                        Button {
                            bottleCount += 1
                        } label: {
                            Image(systemName: "plus.circle.fill")
                                .font(.largeTitle)
                        }
                    }
                }
            }
            .navigationTitle("編輯 \(day.day)")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("儲存") {
                        if let selectedMember {
                            setBottleCount(selectedMember, day.date, bottleCount)
                        }
                        dismiss()
                    }
                }
            }
            .onAppear {
                selectedMemberId = selectedMember?.id
                syncBottleCount()
            }
        }
    }

    private var selectedBinding: Binding<UUID> {
        Binding {
            selectedMember?.id ?? UUID()
        } set: {
            selectedMemberId = $0
        }
    }

    private func syncBottleCount() {
        guard let selectedMember else {
            bottleCount = 0
            return
        }

        let calendar = Calendar.current
        let startDate = calendar.startOfDay(for: day.date)
        let endDate = calendar.date(byAdding: .day, value: 1, to: startDate) ?? startDate
        bottleCount = entries.filter {
            $0.memberId == selectedMember.id && $0.createdAt >= startDate && $0.createdAt < endDate
        }.count
    }
}
