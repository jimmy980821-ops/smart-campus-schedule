import Foundation
import SwiftUI
import UIKit
import WebKit

struct CampusFlowWebView: UIViewRepresentable {
    @ObservedObject var model: CampusFlowModel
    let credential: NativeWebCredential?

    func makeCoordinator() -> Coordinator {
        Coordinator(model: model)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.userContentController.add(context.coordinator, name: "campusFlow")
        configuration.userContentController.addUserScript(
            WKUserScript(
                source: Self.nativeBridgeScript(credential: credential),
                injectionTime: .atDocumentStart,
                forMainFrameOnly: true
            )
        )

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic
        context.coordinator.webView = webView

        guard let url = Self.websiteURL else {
            model.errorMessage = "網站網址設定不正確。"
            return webView
        }
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        context.coordinator.model = model
        context.coordinator.credential = credential
        guard let credential else { return }
        webView.evaluateJavaScript(
            Self.signInScript(credential: credential),
            completionHandler: nil
        )
    }

    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "campusFlow")
        webView.navigationDelegate = nil
    }

    private static var websiteURL: URL? {
        guard let raw = Bundle.main.object(forInfoDictionaryKey: "WEBSITE_URL") as? String else {
            return nil
        }
        return URL(string: raw)
    }

    private static func credentialJSON(_ credential: NativeWebCredential?) -> String {
        guard let credential else { return "null" }
        let value: [String: String] = [
            "uid": credential.uid,
            "idToken": credential.idToken,
            "accessToken": credential.accessToken,
            "deviceID": credential.deviceID
        ]
        guard let data = try? JSONSerialization.data(withJSONObject: value),
              let json = String(data: data, encoding: .utf8)
        else {
            return "null"
        }
        return json
    }

    private static func nativeBridgeScript(credential: NativeWebCredential?) -> String {
        let payload = credentialJSON(credential)
        return """
        window.__CAMPUS_FLOW_NATIVE_APP__ = true;
        window.__CAMPUS_FLOW_NATIVE_AUTH__ = \(payload);
        window.__CAMPUS_FLOW_NATIVE_DEVICE_ID__ =
          window.__CAMPUS_FLOW_NATIVE_AUTH__?.deviceID || "";

        window.campusFlowNativeSignIn = async function(payload, attempt = 0) {
          if (!payload || !payload.idToken) return;
          try {
            const [appModule, authModule] = await Promise.all([
              import("https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js"),
              import("https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js")
            ]);
            const apps = appModule.getApps();
            if (!apps.length) {
              if (attempt < 30) {
                setTimeout(() => window.campusFlowNativeSignIn(payload, attempt + 1), 200);
              }
              return;
            }
            const auth = authModule.getAuth(apps[0]);
            if (auth.currentUser && auth.currentUser.uid === payload.uid) return;
            const credential = authModule.GoogleAuthProvider.credential(
              payload.idToken,
              payload.accessToken
            );
            await authModule.signInWithCredential(auth, credential);
            document.querySelector("#login-guide-modal")?.close();
          } catch (error) {
            window.webkit?.messageHandlers?.campusFlow?.postMessage({
              type: "web-auth-error",
              message: error?.message || "網站登入同步失敗"
            });
          }
        };

        document.addEventListener("DOMContentLoaded", () => {
          window.campusFlowNativeSignIn(window.__CAMPUS_FLOW_NATIVE_AUTH__);
          const message = document.querySelector("#notification-message");
          if (message) message.textContent = "原生 App 會由 iOS 管理背景通知。";
        });

        document.addEventListener("click", (event) => {
          const button = event.target instanceof Element
            ? event.target.closest("button")
            : null;
          if (!button) return;
          if (button.id === "notification-button") {
            event.preventDefault();
            event.stopImmediatePropagation();
            window.webkit.messageHandlers.campusFlow.postMessage({
              type: "request-notifications"
            });
          }
          if (button.id === "auth-button") {
            event.preventDefault();
            event.stopImmediatePropagation();
            window.webkit.messageHandlers.campusFlow.postMessage({ type: "sign-out" });
          }
        }, true);
        """
    }

    private static func signInScript(credential: NativeWebCredential) -> String {
        let payload = credentialJSON(credential)
        return """
        window.__CAMPUS_FLOW_NATIVE_AUTH__ = \(payload);
        window.__CAMPUS_FLOW_NATIVE_DEVICE_ID__ =
          window.__CAMPUS_FLOW_NATIVE_AUTH__?.deviceID || "";
        window.campusFlowNativeSignIn?.(window.__CAMPUS_FLOW_NATIVE_AUTH__);
        """
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var model: CampusFlowModel
        var credential: NativeWebCredential?
        weak var webView: WKWebView?

        init(model: CampusFlowModel) {
            self.model = model
        }

        func userContentController(
            _ userContentController: WKUserContentController,
            didReceive message: WKScriptMessage
        ) {
            guard message.name == "campusFlow",
                  let body = message.body as? [String: Any],
                  let type = body["type"] as? String
            else {
                return
            }

            Task { @MainActor in
                switch type {
                case "request-notifications":
                    if await model.requestNotifications() {
                        webView?.evaluateJavaScript(
                            """
                            (() => {
                              const notificationButton = document.querySelector("#notification-button");
                              const notificationMessage = document.querySelector("#notification-message");
                              if (notificationButton) notificationButton.textContent = "背景通知已開啟";
                              if (notificationMessage) {
                                notificationMessage.textContent =
                                  "設定完成；關閉 App 後仍可收到課程、作業與學測倒數通知。";
                              }
                            })();
                            """,
                            completionHandler: nil
                        )
                    }
                case "sign-out":
                    model.signOut()
                case "web-auth-error":
                    model.errorMessage = body["message"] as? String ?? "網站登入同步失敗。"
                default:
                    break
                }
            }
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            guard let credential else { return }
            webView.evaluateJavaScript(
                CampusFlowWebView.signInScript(credential: credential),
                completionHandler: nil
            )
        }

        func webView(
            _ webView: WKWebView,
            didFailProvisionalNavigation navigation: WKNavigation!,
            withError error: Error
        ) {
            Task { @MainActor in
                model.errorMessage = "網站載入失敗：\(error.localizedDescription)"
            }
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard navigationAction.navigationType == .linkActivated,
                  let url = navigationAction.request.url,
                  url.host != CampusFlowWebView.websiteURL?.host
            else {
                decisionHandler(.allow)
                return
            }

            UIApplication.shared.open(url)
            decisionHandler(.cancel)
        }
    }
}
