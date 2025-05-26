/**
 * @typedef {object} RealtimeInfo
 * @property {number} videoBufferLength - 视频缓冲长度，单位：秒 (s)。
 * @property {number} videoNetworkActivity - 视频网络活动量，单位：字节 (bytes)。
 */

/**
 * @typedef {object} MediaInfo
 * @property {string} fps - 帧率信息。此脚本会在此属性的开头追加码率信息。
 * @property {string} videoSrc - 视频源 URL。
 */

/**
 * @typedef {object} StreamInfo
 * @property {RealtimeInfo} realtimeInfo - 视频实时状态（如缓冲、网络活动）。
 * @property {MediaInfo} mediaInfo - 媒体元数据（如帧率）。
 */

/**
 * @typedef {object} VideoPanel
 * @property {function(StreamInfo): void} updateVideoTemplate - 更新视频播放器界面显示信息的方法。
 * @property {function(): unknown} createTemplateProxy - 创建模板代理的方法。
 */

const BITRATE_RECORD_MAX_LENGTH = 30 // 码率记录数组最大长度，用于计算平均码率。
const BYTES_TO_KBPS_FACTOR = 8 / 1024 // 将字节转换为千比特每秒 (Kbps) 的因子。

/**
 * `VideoMetricsMonitor` 类用于监控和计算视频流的实时码率和缓冲长度。
 * 它通过代理 `VideoPanel` 实例的 `updateVideoTemplate` 方法来处理视频流的实时数据。
 */
class VideoMetricsMonitor {
  /**
   * 视频源 URL。
   * @type {string}
   */
  videoSrc = ''

  /**
   * 平均码率，单位：千比特每秒 (Kbps)。
   * @type {number}
   */
  averageBitrate = 0

  /**
   * 码率记录数组，存储最近的码率样本，单位：千比特每秒 (Kbps)。
   * @type {number[]}
   */
  #bitrateRecord = []

  /**
   * 用于调试的 `VideoPanel` 实例引用。
   * @type {VideoPanel | null}
   */
  #panel = null

  /**
   * `VideoMetricsMonitor` 类的构造函数。
   * @param {VideoPanel} panel - 视频面板对象。
   */
  constructor(panel) {
    this.#panel = panel

    panel.updateVideoTemplate = new Proxy(panel.updateVideoTemplate, {
      apply: (target, thisArg, args) => {
        /** @type {StreamInfo} */
        const streamInfo = args[0]

        // console.log('streamInfo', streamInfo) // debugger 语句用于调试

        const currentBitrate = streamInfo.realtimeInfo.videoNetworkActivity * BYTES_TO_KBPS_FACTOR
        const currentVideoSrc = streamInfo.mediaInfo.videoSrc
        const currentBufferLength = streamInfo.realtimeInfo.videoBufferLength

        this.#addBitrateSampleAndRecalculateAverage(currentBitrate, currentVideoSrc, currentBufferLength)

        streamInfo.mediaInfo.fps = `[${this.#bitrateRecord.length}s] ${this.averageBitrate} Kbps. ${streamInfo.mediaInfo.fps}`

        return Reflect.apply(target, thisArg, [streamInfo])
      },
    })
  }

  /**
   * 添加新的码率样本并重新计算平均码率。
   * @param {number} newBitrate - 新的码率样本，单位：Kbps。
   * @param {string} newVideoSrc - 新的视频源 URL。
   * @param {number} [newBufferLength] - 新的视频缓冲长度，单位：秒 (s)。
   * @private
   */
  #addBitrateSampleAndRecalculateAverage(newBitrate, newVideoSrc, newBufferLength) {
    if (this.videoSrc.length === 0 || this.videoSrc !== newVideoSrc) {
      this.videoSrc = newVideoSrc
      this.#bitrateRecord = []
      console.debug(`视频源已更改: ${this.videoSrc}`)
    }

    this.#bitrateRecord.unshift(newBitrate)

    if (this.#bitrateRecord.length > BITRATE_RECORD_MAX_LENGTH) {
      this.#bitrateRecord.pop()
    }

    this.averageBitrate = (
      this.#bitrateRecord.reduce((sum, bitrate) => sum + bitrate, 0) / (this.#bitrateRecord.length + (newBufferLength || 0))
    ).toFixed(2)
  }
}

/**
 * 初始化用户脚本核心逻辑。
 */
function initializeScriptHook() {
  console.log(`${PROJECT_NAME} ${PROJECT_VERSION} - 已加载。`)
  const originalWeakMapSet = WeakMap.prototype.set
  let isHookActive = true

  /**
   * 检查一个对象是否是目标 `VideoPanel` 实例的候选者。
   * @param {object} obj - 待检查的对象。
   * @returns {boolean} 如果是 `VideoPanel` 候选者则返回 `true`，否则返回 `false`。
   */
  const isVideoPanelCandidate = (obj) => {
    return obj && typeof obj === 'object' && 'updateVideoTemplate' in obj && 'createTemplateProxy' in obj
  }

  // eslint-disable-next-line no-extend-native
  WeakMap.prototype.set = new Proxy(originalWeakMapSet, {
    apply(target, thisArg, args) {
      if (isHookActive) {
        const [key, value] = args
        let panelObject = null

        if (isVideoPanelCandidate(key)) {
          panelObject = key
        }
        else if (isVideoPanelCandidate(value)) {
          panelObject = value
        }

        if (panelObject) {
          isHookActive = false
          console.debug('成功捕获到 VideoPanel 实例。')

          try {
            unsafeWindow.debugVideoMetrics = new VideoMetricsMonitor(panelObject)
            console.debug('VideoMetricsMonitor 初始化成功，可通过 unsafeWindow.debugVideoMetrics 访问调试信息。')
          }
          catch (e) {
            console.error('VideoMetricsMonitor 初始化失败:', e)
          }
        }
      }

      return Reflect.apply(target, thisArg, args)
    },
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeScriptHook)
}
else {
  initializeScriptHook()
}
