import SwiftUI
import SwiftData

struct RootView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \FamilyMember.createdAt) private var members: [FamilyMember]
    @Query(sort: \DrinkEntry.createdAt, order: .reverse) private var entries: [DrinkEntry]

    @State private var selectedMemberId: UUID?
    @State private var showMemberEditor = false

    var selectedMember: FamilyMember? {
        if let selectedMemberId, let member = members.first(where: { $0.id == selectedMemberId }) {
            return member
        }
        return members.first
    }

    var body: some View {
        TabView {
            NavigationStack {
                HomeView(
                    members: members,
                    entries: entries,
                    selectedMemberId: $selectedMemberId,
                    onAddBottle: addBottle,
                    onAddMember: { showMemberEditor = true }
                )
                .navigationTitle("全家補水")
                .sheet(isPresented: $showMemberEditor) {
                    MemberEditorView(member: nil)
                }
            }
            .tabItem {
                Label("首頁", systemImage: "drop.fill")
            }

            NavigationStack {
                DashboardView(members: members, entries: entries)
                    .navigationTitle("全家進度")
            }
            .tabItem {
                Label("全家", systemImage: "chart.bar.fill")
            }

            NavigationStack {
                HistoryView(members: members, entries: entries)
                    .navigationTitle("紀錄")
            }
            .tabItem {
                Label("紀錄", systemImage: "calendar")
            }

            NavigationStack {
                MembersView(members: members)
                    .navigationTitle("家人")
            }
            .tabItem {
                Label("家人", systemImage: "person.3.fill")
            }
        }
        .tint(.cyan)
        .onAppear(perform: seedMembersIfNeeded)
    }

    private func addBottle(for member: FamilyMember) {
        modelContext.insert(DrinkEntry(memberId: member.id))
    }

    private func seedMembersIfNeeded() {
        guard members.isEmpty else { return }
        modelContext.insert(FamilyMember(name: "媽媽", avatar: .droplet, dailyGoalBottles: 5))
        modelContext.insert(FamilyMember(name: "爸爸", avatar: .capybara, dailyGoalBottles: 5))
        modelContext.insert(FamilyMember(name: "阿嬤", avatar: .penguin, dailyGoalBottles: 4))
    }
}

