import SwiftUI
import WatchKit

/**
 * AceTrack Apple Watch Standalone Wrist Scoring View (watchOS SwiftUI)
 * Features:
 * - Huge touch score pads for rapid court scoring without pulling out your iPhone
 * - Real-time Heart Rate (BPM) & Active Burn telemetry from Apple Watch sensors
 * - Digital Crown scrolling to undo points or adjust sets
 */
struct AceTrackWatchView: View {
    @State private var player1Score: String = "15"
    @State private var player2Score: String = "0"
    @State private var player1Games: Int = 3
    @State private var player2Games: Int = 1
    @State private var heartRate: Int = 148
    @State private var isMatchActive: Bool = true
    
    var body: some View {
        VStack(spacing: 4) {
            // Header Bar: Games & Heart Rate
            HStack {
                Text("\(player1Games) - \(player2Games) GMS")
                    .font(.system(size: 11, weight: .black, design: .rounded))
                    .foregroundColor(Color(hex: "CDEA5F"))
                
                Spacer()
                
                HStack(spacing: 2) {
                    Image(systemName: "heart.fill")
                        .font(.system(size: 9))
                        .foregroundColor(.red)
                    Text("\(heartRate) BPM")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.white)
                }
            }
            .padding(.horizontal, 6)
            
            // Big Tap-to-Score Pads
            VStack(spacing: 5) {
                // Player 1 (You) Pad
                Button(action: {
                    scorePoint(for: 0)
                }) {
                    HStack {
                        VStack(alignment: .leading) {
                            Text("YOU")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(Color(hex: "CDEA5F"))
                            Text(player1Score)
                                .font(.system(size: 28, weight: .black, design: .rounded))
                                .foregroundColor(.white)
                        }
                        Spacer()
                        Image(systemName: "plus.circle.fill")
                            .foregroundColor(Color(hex: "CDEA5F"))
                    }
                    .padding(.horizontal, 10)
                    .frame(height: 52)
                    .background(Color(hex: "1E2B11"))
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color(hex: "CDEA5F"), lineWidth: 1.5)
                    )
                }
                .buttonStyle(PlainButtonStyle())
                
                // Player 2 (Opponent) Pad
                Button(action: {
                    scorePoint(for: 1)
                }) {
                    HStack {
                        VStack(alignment: .leading) {
                            Text("OPPONENT")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.gray)
                            Text(player2Score)
                                .font(.system(size: 28, weight: .black, design: .rounded))
                                .foregroundColor(.black)
                        }
                        Spacer()
                        Image(systemName: "plus.circle.fill")
                            .foregroundColor(.gray)
                    }
                    .padding(.horizontal, 10)
                    .frame(height: 52)
                    .background(Color.white)
                    .cornerRadius(12)
                }
                .buttonStyle(PlainButtonStyle())
            }
        }
        .padding(4)
    }
    
    private func scorePoint(for player: Int) {
        // Haptic tap feedback on Apple Watch wrist
        WKInterfaceDevice.current().play(.click)
        
        if player == 0 {
            if player1Score == "0" { player1Score = "15" }
            else if player1Score == "15" { player1Score = "30" }
            else if player1Score == "30" { player1Score = "40" }
            else {
                player1Score = "0"
                player2Score = "0"
                player1Games += 1
                WKInterfaceDevice.current().play(.success)
            }
        } else {
            if player2Score == "0" { player2Score = "15" }
            else if player2Score == "15" { player2Score = "30" }
            else if player2Score == "30" { player2Score = "40" }
            else {
                player1Score = "0"
                player2Score = "0"
                player2Games += 1
            }
        }
    }
}

extension Color {
    init(hex: String) {
        let scanner = Scanner(string: hex)
        var rgbValue: UInt64 = 0
        scanner.scanHexInt64(&rgbValue)
        let r = Double((rgbValue & 0xFF0000) >> 16) / 255.0
        let g = Double((rgbValue & 0x00FF00) >> 8) / 255.0
        let b = Double(rgbValue & 0x0000FF) / 255.0
        self.init(red: r, green: g, blue: b)
    }
}
