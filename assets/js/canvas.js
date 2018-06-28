// 下面定义一些常量
let latterX = 0
let formerResultLength = 1
let formerLineNum = 0
let timer = null
let currentLineNum = 1
let timeoutSpace = 60
let referenceSpace = 60
let tolerancePitchDelta = 1.5
let formerPitch = 0
let mutationPitchDelta = 5
let audio = document.getElementById('audio')
let currentTime = 0
// 常量定义完毕

let marginBottomOfPiece = 150
let contentHeight = state.noteInfo.length * (marginBottomOfPiece + state.noteInfo[1].startY - state.noteInfo[0].startY)
let contentWidth = state.pictureInfo.pictureWidth
let contentNode = document.getElementById('content')
contentNode.style.width = `${contentWidth}px`
// 创建一个fragement
let fragement = document.createDocumentFragment()
console.log('state: ', state)
for (let index = 0; index < state.noteInfo.length; index++) {
  let element = state.noteInfo[index]
  let node = document.createElement('div')
  node.style.height = `${state.noteInfo[1].startY - state.noteInfo[0].startY}px`
  node.style.marginBottom = `${marginBottomOfPiece}px`
  node.style.backgroundPosition = `0px ${-element.startY + 10}px`
  node.style.backgroundImage = `url(${state.pictureInfo.pictureUrl})`
  node.style.backgroundSize = `${state.pictureInfo.pictureWidth}px`
  fragement.appendChild(node)
}
contentNode.appendChild(fragement)
// 内存回收?
fragement = null
// contentNode = null
// 创建一个pixi应用
let app = new PIXI.Application({
  antialias: true,
  transparent: true,
  resolution: 1,
})
app.renderer.autoResize = true
// 重新设置宽和高
app.renderer.resize(contentWidth, contentHeight)


let referenceLine = new PIXI.Graphics()
let resultLine = new PIXI.Graphics()
document.getElementById('canvas-container').appendChild(app.view)
app.stage.addChild(referenceLine)
app.stage.addChild(resultLine)


function drawCurve(operator) {
  // 这里是画完图，将数据全部初始化
  if (currentLineNum === state.noteInfo.length + 1) {
    initParamsCanvas('finish')
    console.timeEnd('time')
    return
  }
  if (operator === 'init') {
    console.time('time')
    initParamsCanvas()
  }

  const {
    noteInfo,
    pictureInfo,
    recordingAnalysisResult,
    recordingEachlineMoveStep,
  } = state

  let { minPitch, maxPitch, lineWidth } = noteInfo[currentLineNum - 1]
  let moveStep = recordingEachlineMoveStep[currentLineNum - 1]
  let lineHeight = noteInfo[1].startY - noteInfo[0].startY
  // 每两条曲线起始点的Y间距
  let eachLineSpace = marginBottomOfPiece + lineHeight
  let noteList = noteInfo[currentLineNum - 1].noteList
  let lineStartX = noteList[0].x
  let lineYpos = eachLineSpace * (currentLineNum - 1) + lineHeight + marginBottomOfPiece / 4 * 3

  // 下面这些是准备画基准线
  if (formerLineNum !== currentLineNum) {
    let startLineYpos = getYpos(maxPitch, minPitch, lineYpos, noteList[0].pitch)
    // 如果前一行和现在这一行不是同一行，就把这一行画出来
    referenceLine.lineStyle(1, 0xF000FF, 0.6);
    // 移动到这一行的起始位置
    referenceLine.moveTo(lineStartX, startLineYpos)
    for (let index = 0; index < noteList.length; index++) {
      let element = noteList[index]
      referenceLine.lineTo(element.end, getYpos(maxPitch, minPitch, lineYpos, element.pitch))
      if (index < noteList.length - 1) {
        referenceLine.lineTo(noteList[index + 1].x, getYpos(maxPitch, minPitch, lineYpos, noteList[index + 1].pitch))
      } else {
        referenceLine.lineTo(noteList[index].end, getYpos(maxPitch, minPitch, lineYpos, noteList[index].pitch))
      }
    }
    // 画完了，改动formerLineNum
    formerLineNum = currentLineNum
  }
  // 上面是画基准线

  // 下面是结果的线    
  let lineResult = recordingAnalysisResult[currentLineNum - 1]
  let lineResultLength = lineResult.length
  let startLineResultYpos = getYpos(maxPitch, minPitch, lineYpos, lineResult[0])
  let lineResultPointXposDelta = lineWidth / (lineResult.length - 1)

  let latterResultLength = Math.round(latterX / lineWidth * lineResultLength)
  // 获取当前位置的基准pitch
  let referencePitch = 0
  for (let index = 0; index < noteList.length; index++) {
    let element = noteList[index]
    if ((latterX + lineStartX >= element.x) && (latterX + lineStartX < element.end)) {
      referencePitch = element.pitch
      break
    }
  }
  // recordingAnalysisResultCtx.beginPath()
  if (formerResultLength === 1) {
    // 假如是一行的开始
    resultLine.moveTo(lineStartX, startLineResultYpos)
    formerPitch = lineResult[0]
  } else {
    // 假如不是一行的开始，就移动到上次的位置
    let formerPitchYpos = getYpos(maxPitch, minPitch, lineYpos, lineResult[formerResultLength])
    resultLine.moveTo(lineStartX + formerResultLength * lineResultPointXposDelta, formerPitchYpos)
    formerPitch = lineResult[formerResultLength]
  }

  for (let index = formerResultLength; (index <= latterResultLength) && (latterResultLength < lineResultLength); index++) {
    let resultPointValue = lineResult[index]
    if (Math.abs(resultPointValue - formerPitch) >= mutationPitchDelta) {
      resultLine.moveTo(lineStartX + index * lineResultPointXposDelta
        , getYpos(maxPitch, minPitch, lineYpos, resultPointValue))
    } else {
      if (Math.abs(resultPointValue - referencePitch) <= tolerancePitchDelta) {
        // 假如要画的pitch和参考pitch相差0.5之内，就画绿线
        resultLine.lineStyle(1, 0x00ff00, 1)
      } else {
        // 否则画红线
        resultLine.lineStyle(1, 0xff0000, 1)
      }
      resultLine.lineTo(lineStartX + index * lineResultPointXposDelta
        , getYpos(maxPitch, minPitch, lineYpos, resultPointValue))
    }
    formerPitch = resultPointValue
  }
  // 上面是画结果的线

  //描边，draw
  // app.stage.addChild(resultLine)
  if (latterX >= lineWidth) {
    latterX = 0
    formerResultLength = 1
    currentLineNum = currentLineNum + 1
    if (currentLineNum + 1 <= noteInfo.length) {
      // $emit('picture-scroll-view-event', currentLineNum * eachLineSpace);
    }
  } else {
    latterX += moveStep
    formerResultLength = latterResultLength
  }
  // let end = new Date().getTime()
  // if(end - start > timeoutSpace) {
  if(operator !== 'init') {
    let start = new Date().getTime()    
    timeoutSpace = 2 * referenceSpace - (start - currentTime) - 1.5
    currentTime = start
  }
  if (operator === 'init') {
    currentTime = new Date().getTime()
  }
  timer = setTimeout(() => {
    // console.log('time1: ', new Date().getTime())
    drawCurve()
    // console.log('time2: ', new Date().getTime())
  }, timeoutSpace)
}

// let a = 0
// function drawCurve() {
//   a += 1.785015242676023
//   if(a >= 931.68077388219) {
//     console.timeEnd('111')
//     return
//   }
//   setTimeout(() => {
//     drawCurve()
//   }, 60);
// }

function initParamsCanvas(operator) {
  if(operator !== 'finish') {
    audio.play()
  }
  clearTimeout(timer)
  // audio.stop()
  currentLineNum = 1
  latterX = 0
  formerResultLength = 1
  formerPitch = 0
}

function getYpos(maxPitch, minPitch, lineStartY, notePitch) {
  let deltaPitch = maxPitch - minPitch + 2
  let temptEachPitchSpace = marginBottomOfPiece / 2 / deltaPitch
  let relativePitchYpos =
    notePitch - minPitch >= 0 ? (notePitch - minPitch + 1) * temptEachPitchSpace : 0
  // 统一向上移动20个像素，要不然会和下面重叠
  let pitchYpos = lineStartY - relativePitchYpos - 20
  return pitchYpos
}


audio.src = state.recordingUrl
drawCurve('init')
// console.time('111')