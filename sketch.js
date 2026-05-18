let handPose;
let video;
let hands = [];

// 遊戲狀態與變數
let gameState = "WAITING"; // WAITING, COUNTING, PLAYER_DECIDING, RESULT
let countdown = 3;
let timerStart = 0;
let playerChoice = "";
let computerChoice = "";
let resultMessage = "";
let startProgress = 0; // 修改：累積比讚的進度 (0 到 3000 毫秒)
let rpsProgress = 0;   // 新增：累積出拳偵測的進度 (0 到 2000 毫秒)

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

  // --- 繪製影像 (左右顛倒鏡像效果) ---
  push();
  translate(offsetX + video.width, offsetY);
  scale(-1, 1);
  image(video, 0, 0);
  pop();

  let currentHand = null;

  // --- 繪製手部連線 ---
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
        // 因為影像已左右顛倒，關鍵點 X 座標也需對應翻轉
        let mirroredX = video.width - kp.x;
        vertex(mirroredX + offsetX, kp.y + offsetY);
      }
      endShape();
    }
    
    // 取得第一隻偵測到的手進行邏輯判斷
    if (i === 0) currentHand = hand;
  }

  // --- 遊戲邏輯處理 ---
  displayUI(offsetX, offsetY);
  handleGameLogic(currentHand);
}

function handleGameLogic(hand) {
  if (gameState === "WAITING") {
    // 如果有偵測到手且正在比讚，進度增加；否則進度減少
    if (hand && isThumbsUp(hand)) {
      startProgress += deltaTime;
    } else {
      startProgress -= deltaTime;
    }
    
    // 限制進度範圍在 0 到 3000 之間
    startProgress = constrain(startProgress, 0, 3000);

    if (startProgress >= 3000) {
      gameState = "COUNTING";
      timerStart = millis();
      countdown = 3;
      startProgress = 0; // 進入遊戲後重置進度
    }
    return; // WAITING 階段不需要後續的出拳判斷
  }

  if (gameState === "COUNTING") {
    let elapsed = (millis() - timerStart) / 1000;
    countdown = 3 - floor(elapsed);
    
    if (countdown <= 0) {
      gameState = "PLAYER_DECIDING";
      rpsProgress = 0; // 重置出拳進度
    }
  }

  if (gameState === "PLAYER_DECIDING") {
    // 取得當前手勢
    let currentGesture = hand ? getRPSGesture(hand) : "未知";
    
    if (currentGesture !== "未知") {
      rpsProgress += deltaTime;
      playerChoice = currentGesture; // 暫存目前偵測到的手勢
    } else {
      rpsProgress -= deltaTime;
    }
    
    rpsProgress = constrain(rpsProgress, 0, 2000);

    if (rpsProgress >= 2000) {
      // 進度滿了，電腦才出拳並進入結果
      gameState = "RESULT";
      let choices = ["石頭", "剪刀", "布"];
      computerChoice = random(choices);
      resultMessage = decideWinner(playerChoice, computerChoice);
      
      // 3秒後自動回到等待畫面
      setTimeout(() => {
        gameState = "WAITING";
      }, 3000);
    }
  }
}

function displayUI(offsetX, offsetY) {
  textAlign(CENTER, CENTER);
  fill(0);
  noStroke();
  
  if (gameState === "WAITING") {
    textSize(40);
    text("👍 比讚開始遊戲", width / 2, offsetY - 50);

    // 繪製進度條背景 (始終顯示，讓玩家能看到進度「退回」的視覺效果)
    let barWidth = 200;
    let barHeight = 20;
    fill(255, 180); // 半透明白色背景
    rect(width / 2 - barWidth / 2, offsetY - 30, barWidth, barHeight, 10);

    // 繪製進度量 (綠色)
    let progress = startProgress / 3000;
    fill(0, 255, 0);
    rect(width / 2 - barWidth / 2, offsetY - 30, barWidth * progress, barHeight, 10);
    
    textSize(16);
    fill(0);
    let statusMsg = startProgress > 0 ? (startProgress === 3000 ? "完成！" : "偵測中...") : "等待比讚...";
    text(statusMsg, width / 2, offsetY - 15);
  } else if (gameState === "COUNTING") {
    textSize(80);
    fill(255, 0, 0);
    text(countdown, width / 2, height / 2);
  } else if (gameState === "PLAYER_DECIDING") {
    // 顯示「請出拳」提示與進度條
    textSize(60);
    fill(255, 0, 0);
    text("👊 請出拳！", width / 2, height / 2 - 50);
    
    textSize(24);
    fill(0);
    text("保持手勢不要動...", width / 2, height / 2 + 30);

    // 出拳偵測進度條
    let barWidth = 250;
    let barHeight = 25;
    fill(255);
    rect(width / 2 - barWidth / 2, height / 2 + 60, barWidth, barHeight, 12);
    fill(255, 100, 0); // 橘色代表出拳偵測
    rect(width / 2 - barWidth / 2, height / 2 + 60, (rpsProgress / 2000) * barWidth, barHeight, 12);
  } else if (gameState === "RESULT") {
    textSize(30);
    fill(50);
    text(`玩家: ${playerChoice}  VS  電腦: ${computerChoice}`, width / 2, offsetY - 60);
    textSize(60);
    fill(0);
    text(resultMessage, width / 2, offsetY - 120);
  }
}

// 手勢辨識：比讚 (Start)
function isThumbsUp(hand) {
  let thumbTip = hand.keypoints[4];
  let thumbIP = hand.keypoints[3];
  let indexTip = hand.keypoints[8];
  let indexBase = hand.keypoints[5];
  // 拇指尖端高於拇指關節，且食指尖端低於食指根部（指頭收合）
  return thumbTip.y < thumbIP.y && indexTip.y > indexBase.y;
}

// 手勢辨識：石頭剪刀布
function getRPSGesture(hand) {
  // 判斷手指是否伸直 (y 座標愈小代表位置愈高)
  let indexUp = hand.keypoints[8].y < hand.keypoints[6].y;
  let middleUp = hand.keypoints[12].y < hand.keypoints[10].y;
  let ringUp = hand.keypoints[16].y < hand.keypoints[14].y;
  let pinkyUp = hand.keypoints[20].y < hand.keypoints[18].y;

  if (indexUp && middleUp && ringUp && pinkyUp) return "布";
  if (indexUp && middleUp && !ringUp && !pinkyUp) return "剪刀";
  if (!indexUp && !middleUp && !ringUp && !pinkyUp) return "石頭";
  return "未知";
}

function decideWinner(p, c) {
  if (p === "未知") return "看不清楚，請重試！";
  if (p === c) return "平手！";
  if (
    (p === "石頭" && c === "剪刀") ||
    (p === "剪刀" && c === "布") ||
    (p === "布" && c === "石頭")
  ) {
    return "你贏了！ 🎉";
  }
  return "電腦贏了 😭";
}

function gotHands(results) {
  hands = results;
}

function windowResized() {
  // 當視窗大小改變時，重新調整畫布與影像比例
  resizeCanvas(windowWidth, windowHeight);
  video.size(windowWidth * 0.5, windowHeight * 0.5);
}
