import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var model: CampusFlowModel

    var body: some View {
        NavigationStack {
            Group {
                if model.user == nil {
                    signedOutView
                } else {
                    dashboard
                }
            }
            .navigationTitle("校園日程")
            .toolbar {
                if model.user != nil {
                    ToolbarItem(placement: .topBarTrailing) {
                        Menu {
                            Button("開啟網站", systemImage: "safari") { openWebsite() }
                            Button("登出", systemImage: "rectangle.portrait.and.arrow.right", role: .destructive) {
                                model.signOut()
                            }
                        } label: {
                            Image(systemName: "person.crop.circle")
                        }
                    }
                }
            }
        }
        .alert(
            "校園日程",
            isPresented: Binding(
                get: { model.errorMessage != nil },
                set: { if !$0 { model.errorMessage = nil } }
            ),
            actions: { Button("知道了") { model.errorMessage = nil } },
            message: { Text(model.errorMessage ?? "") }
        )
    }

    private var signedOutView: some View {
        VStack(spacing: 22) {
            Image(systemName: "calendar.badge.clock")
                .font(.system(size: 68))
                .foregroundStyle(.blue)
            Text("課表、作業與考試\n一次同步到所有裝置")
                .font(.title2.bold())
                .multilineTextAlignment(.center)
            Button {
                Task { await model.signInWithGoogle() }
            } label: {
                HStack {
                    if model.isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "person.crop.circle.badge.checkmark")
                    }
                    Text(model.isLoading ? "正在開啟 Google 登入…" : "使用 Google 帳號登入")
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .disabled(model.isLoading || !model.isFirebaseReady)

            if !model.isFirebaseReady {
                Text("請先在 Xcode 專案加入 GoogleService-Info.plist。")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(28)
    }

    private var dashboard: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                nextCourseCard
                summaryGrid

                Button {
                    Task { await model.requestNotifications() }
                } label: {
                    Label("開啟原生背景通知", systemImage: "bell.badge")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)

                Button {
                    openWebsite()
                } label: {
                    Label("編輯課表、作業與考試", systemImage: "square.and.pencil")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .controlSize(.large)

                Text("資料來自同一個 Firebase 帳號。開啟 App 後，小工具會自動更新。")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            .padding()
        }
        .refreshable {
            if let uid = model.user?.uid {
                await PushNotificationManager.shared.refreshDeviceRegistration(uid: uid)
            }
        }
    }

    private var nextCourseCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("下一節課", systemImage: "clock")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white.opacity(0.8))
            if let course = model.snapshot.nextCourse {
                Text(course.subject).font(.largeTitle.bold())
                Text("第 \(course.period) 節・\(CampusFlowDate.periodTimes[course.period] ?? "")・\(course.room)")
                    .foregroundStyle(.white.opacity(0.85))
            } else {
                Text("今天的課程已結束").font(.title2.bold())
                Text("記得查看最近作業與考試")
                    .foregroundStyle(.white.opacity(0.85))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(22)
        .foregroundStyle(.white)
        .background(
            LinearGradient(
                colors: [Color(red: 0.08, green: 0.27, blue: 0.62), .blue],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 24)
        )
    }

    private var summaryGrid: some View {
        HStack(spacing: 12) {
            summaryCard(
                title: "最近作業",
                value: model.snapshot.nearestAssignment?.content ?? "沒有待辦",
                symbol: "checklist"
            )
            summaryCard(
                title: model.snapshot.gsat?.name ?? "學測倒數",
                value: model.snapshot.gsatDays.map { "\($0) 天" } ?? "尚未設定",
                symbol: "graduationcap"
            )
        }
    }

    private func summaryCard(title: String, value: String, symbol: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: symbol).foregroundStyle(.blue)
            Text(title).font(.caption).foregroundStyle(.secondary)
            Text(value).font(.headline).lineLimit(2)
        }
        .frame(maxWidth: .infinity, minHeight: 110, alignment: .topLeading)
        .padding()
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 18))
    }

    private func openWebsite() {
        let raw = Bundle.main.object(forInfoDictionaryKey: "WEBSITE_URL") as? String
        guard let raw, let url = URL(string: raw) else { return }
        UIApplication.shared.open(url)
    }
}

#Preview {
    ContentView().environmentObject(CampusFlowModel())
}
