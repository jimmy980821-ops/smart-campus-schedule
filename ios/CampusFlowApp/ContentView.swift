import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var model: CampusFlowModel

    var body: some View {
        Group {
            if model.user == nil {
                NavigationStack {
                    signedOutView
                        .navigationTitle("校園日程")
                }
            } else {
                CampusFlowWebView(model: model, credential: model.webCredential)
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
}

#Preview {
    ContentView().environmentObject(CampusFlowModel())
}
