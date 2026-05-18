let handPose;
let video;
let hands = [];

function preload() {
  // 載入 ml5.js 的 handPose 模型
  handPose = ml5.handPose();
}

function setup() {
  // 建立全螢幕畫布
  createCanvas(windowWidth, windowHeight);

  // 建立影像擷取
  video = createCapture(VIDEO, () => {
    console.log("攝影機已就緒");
  });
  // 將顯示影像的寬高設定為全螢幕寬高的 50%
  video.size(windowWidth * 0.5, windowHeight * 0.5);
  video.hide();

  // 開始偵測影像中的手部關鍵點
  handPose.detectStart(video, gotHands);
}

function draw() {
  // 設定畫布背景顏色為 e7c6ff
  background('#e7c6ff');

  // 計算影像在視窗中間的座標
  let offsetX = (width - video.width) / 2;
  let offsetY = (height - video.height) / 2;

  // 在視窗中間顯示擷取到的影像
  image(video, offsetX, offsetY);

  // 繪製偵測到的手部關鍵點連線
  for (let i = 0; i < hands.length; i++) {
    let hand = hands[i];
    
    stroke(255); // 設定線條顏色（此處設為白色）
    strokeWeight(3);
    noFill();

    // 根據需求定義手指連線段落：0-4, 5-8, 9-12, 13-16, 17-20
    let fingerSegments = [
      [0, 1, 2, 3, 4],     // 大拇指
      [5, 6, 7, 8],        // 食指
      [9, 10, 11, 12],     // 中指
      [13, 14, 15, 16],    // 無名指
      [17, 18, 19, 20]     // 小指
    ];

    for (let segment of fingerSegments) {
      beginShape();
      for (let index of segment) {
        let kp = hand.keypoints[index];
        // 關鍵點座標需加上影像的位移量 (offsetX, offsetY)
        vertex(kp.x + offsetX, kp.y + offsetY);
      }
      endShape();
    }
  }
}

function gotHands(results) {
  hands = results;
}

function windowResized() {
  // 當視窗大小改變時，重新調整畫布與影像比例
  resizeCanvas(windowWidth, windowHeight);
  video.size(windowWidth * 0.5, windowHeight * 0.5);
}
