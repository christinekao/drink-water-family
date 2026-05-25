import SwiftUI

struct HomeView: View {
    let members: [FamilyMember]
    let entries: [DrinkEntry]
    @Binding var selectedMemberId: UUID?
    let onAddBottle: (FamilyMember) -> Void
    let onAddMember: () -> Void

    @State private var showSplash = false
    @State private var nudge = NudgeCopy.random()

    var selectedMember: FamilyMember? {
        if let selectedMemberId, let member = members.first(where: { $0.id == selectedMemberId }) {
            return member
        }
        return members.first
    }

    var body: some View {
        ZStack {
            Color.appBackground.ignoresSafeArea()

            if let member = selectedMember {
                let stats = MemberDailyStats(member: member, bottleCount: entries.countFor(memberId: member.id))

                VStack(spacing: 22) {
                    Picker("家人", selection: selectedBinding(defaultId: member.id)) {
                        ForEach(members) { member in
                            Text(member.name).tag(member.id)
                        }
                    }
                    .pickerStyle(.segmented)
                    .accessibilityLabel("選擇家庭成員")

                    VStack(spacing: 12) {
                        AvatarBadge(member: member, size: 112)
                            .scaleEffect(showSplash ? 1.08 : 1)
                            .animation(.spring(response: 0.35, dampingFraction: 0.55), value: showSplash)

                        Text(stats.hasReachedGoal ? "太棒了，今天達標！" : nudge)
                            .font(.title3.bold())
                            .multilineTextAlignment(.center)
                            .foregroundStyle(.primaryText)
                            .padding(.horizontal)
                    }

                    VStack(spacing: 10) {
                        Text("\(stats.bottleCount) / \(stats.goalBottles) 瓶")
                            .font(.system(size: 58, weight: .black, design: .rounded))
                            .foregroundStyle(.primaryText)
                            .minimumScaleFactor(0.75)

                        Text("\(stats.amountMl) / \(stats.goalMl) ml")
                            .font(.title2.weight(.semibold))
                            .foregroundStyle(.secondaryText)

                        ProgressView(value: stats.progress)
                            .tint(stats.hasReachedGoal ? .green : .cyan)
                            .scaleEffect(y: 3)
                            .padding(.vertical, 10)

                        Text(stats.hasReachedGoal ? "今天可以少碎念你一點。" : "還差 \(stats.remainingBottles) 瓶")
                            .font(.title2.bold())
                            .foregroundStyle(stats.hasReachedGoal ? .green : .orange)
                    }
                    .padding(22)
                    .background(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .shadow(color: .black.opacity(0.08), radius: 16, y: 8)

                    Spacer(minLength: 0)

                    Button {
                        onAddBottle(member)
                        nudge = "收到一瓶 500ml 的愛！"
                        showSplash.toggle()
                    } label: {
                        Label("+1 瓶", systemImage: "plus.circle.fill")
                            .font(.system(size: 34, weight: .black, design: .rounded))
                            .frame(maxWidth: .infinity)
                            .frame(height: 88)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.cyan)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .accessibilityLabel("喝了一瓶水，增加五百毫升")
                }
                .padding(20)
            } else {
                ContentUnavailableView {
                    Label("先新增家人", systemImage: "person.crop.circle.badge.plus")
                } description: {
                    Text("新增第一位家庭成員後，就可以開始記錄喝水。")
                } actions: {
                    Button("新增家人", action: onAddMember)
                        .buttonStyle(.borderedProminent)
                        .controlSize(.large)
                }
            }
        }
    }

    private func selectedBinding(defaultId: UUID) -> Binding<UUID> {
        Binding {
            selectedMemberId ?? defaultId
        } set: {
            selectedMemberId = $0
        }
    }
}

