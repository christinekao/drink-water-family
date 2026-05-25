import SwiftUI
import SwiftData

struct MembersView: View {
    @Environment(\.modelContext) private var modelContext
    let members: [FamilyMember]
    @State private var editingMember: FamilyMember?
    @State private var isAdding = false

    var body: some View {
        List {
            Section {
                ForEach(members) { member in
                    Button {
                        editingMember = member
                    } label: {
                        HStack {
                            AvatarBadge(member: member, size: 50)
                            VStack(alignment: .leading) {
                                Text(member.name)
                                    .font(.title3.bold())
                                    .foregroundStyle(.primaryText)
                                Text("每日 \(member.dailyGoalBottles) 瓶 · \(member.dailyGoalBottles * 500) ml")
                                    .foregroundStyle(.secondaryText)
                            }
                        }
                    }
                }
                .onDelete { indexSet in
                    indexSet.map { members[$0] }.forEach(modelContext.delete)
                }
            }
        }
        .toolbar {
            Button {
                isAdding = true
            } label: {
                Label("新增", systemImage: "plus")
            }
        }
        .sheet(isPresented: $isAdding) {
            MemberEditorView(member: nil)
        }
        .sheet(item: $editingMember) { member in
            MemberEditorView(member: member)
        }
    }
}

struct MemberEditorView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext

    let member: FamilyMember?

    @State private var name: String
    @State private var avatar: AvatarType
    @State private var dailyGoalBottles: Int

    init(member: FamilyMember?) {
        self.member = member
        _name = State(initialValue: member?.name ?? "")
        _avatar = State(initialValue: member?.avatar ?? .droplet)
        _dailyGoalBottles = State(initialValue: member?.dailyGoalBottles ?? 4)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("名字") {
                    TextField("例如：媽媽", text: $name)
                        .font(.title3)
                }

                Section("頭像") {
                    Picker("頭像", selection: $avatar) {
                        ForEach(AvatarType.allCases) { avatar in
                            Text(avatar.rawValue).tag(avatar)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                Section("每日目標") {
                    HStack {
                        Button {
                            dailyGoalBottles = max(1, dailyGoalBottles - 1)
                        } label: {
                            Image(systemName: "minus.circle.fill")
                                .font(.largeTitle)
                        }

                        Spacer()
                        Text("\(dailyGoalBottles) 瓶")
                            .font(.largeTitle.bold())
                        Spacer()

                        Button {
                            dailyGoalBottles += 1
                        } label: {
                            Image(systemName: "plus.circle.fill")
                                .font(.largeTitle)
                        }
                    }

                    Text("等於 \(dailyGoalBottles * 500) ml")
                        .font(.title3.bold())
                }
            }
            .navigationTitle(member == nil ? "新增家人" : "編輯家人")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("儲存", action: save)
                        .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }

    private func save() {
        let cleanName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        if let member {
            member.name = cleanName
            member.avatar = avatar
            member.dailyGoalBottles = dailyGoalBottles
            member.updatedAt = .now
        } else {
            modelContext.insert(FamilyMember(name: cleanName, avatar: avatar, dailyGoalBottles: dailyGoalBottles))
        }
        dismiss()
    }
}

