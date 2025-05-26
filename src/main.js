// --- 常量定义 ---
/**
 * 码率记录数组的最大长度，用于计算滑动平均码率。
 * 记录的长度决定了平均码率的平滑程度和响应速度。
 */
const BITRATE_RECORD_MAX_LENGTH = 30

/**
 * 将字节 (bytes) 转换为千比特每秒 (Kbps) 的转换因子。
 * 1 byte = 8 bits, 1 KB = 1024 bytes.
 */
const BYTES_TO_KBPS_FACTOR = 8 / 1024

/** 视频信息容器的 DOM 元素 ID。码率显示元素将插入到此元素之后。 */
const VIDEO_INFO_CONTAINER_ID = 'p-video-info-videoInfo'

/** 码率显示元素的 DOM 元素 ID。 */
const VIDEO_BITRATE_DISPLAY_ID = 'p-video-info-videobitrate'

// --- 类型定义 (JSDoc) ---
/**
 * @typedef {object} RealtimeInfo
 * @property {number} videoBufferLength - 视频缓冲长度，单位：秒 (s)。
 * @property {number} videoNetworkActivity - 视频网络活动量，单位：字节 (bytes)。
 */

/**
 * @typedef {object} MediaInfo
 * @property {string} fps - 帧率信息。
 * @property {string} videoSrc - 视频源 URL。
 */

/**
 * @typedef {object} StreamInfo
 * @property {RealtimeInfo} realtimeInfo - 视频实时状态。
 * @property {MediaInfo} mediaInfo - 媒体元数据。
 */

/**
 * @typedef {object} VideoPanel
 * @property {function(StreamInfo): void} updateVideoTemplate - 更新视频播放器界面显示信息的方法。
 * @property {function(): unknown} createTemplateProxy - 创建模板代理的方法。
 */

/**
 * `VideoMetricsMonitor` 类用于监控和计算视频流的实时码率。
 * 它通过代理 `VideoPanel` 实例的 `updateVideoTemplate` 方法来捕获视频流的实时数据，
 * 并计算滑动平均码率，最终在页面上动态显示。
 */
class VideoMetricsMonitor {
  /** 当前正在播放的视频源 URL。 */
  #currentVideoSrc = ''

  /** 平均码率，单位：千比特每秒 (Kbps)。 */
  #averageBitrate = 0

  /** 码率记录数组，存储最近的码率样本。 */
  #bitrateRecord = []

  /** 对 `VideoPanel` 实例的引用。 */
  #panel

  /** 缓存的码率显示 DOM 元素。 */
  #bitrateDisplayElement = null

  /**
   * `VideoMetricsMonitor` 类的构造函数。
   * @param {VideoPanel} panel - 视频面板对象。
   * @throws {Error} 如果传入的 `panel` 对象无效。
   */
  constructor(panel) {
    if (!panel || typeof panel.updateVideoTemplate !== 'function') {
      throw new Error('VideoMetricsMonitor: 构造函数参数无效。传入的 panel 对象必须包含 updateVideoTemplate 方法。')
    }

    this.#panel = panel
    this.#setupUpdateVideoTemplateProxy()
    console.debug('VideoMetricsMonitor: 实例已创建并成功代理 updateVideoTemplate 方法。')
  }

  /** 设置 `panel.updateVideoTemplate` 的代理。 */
  #setupUpdateVideoTemplateProxy() {
    this.#panel.updateVideoTemplate = new Proxy(this.#panel.updateVideoTemplate, {
      /**
       * 拦截 `updateVideoTemplate` 方法的调用。
       * @param {Function} target - 原始的 `updateVideoTemplate` 方法。
       * @param {object} thisArg - 原始方法被调用时的 `this` 上下文。
       * @param {Array<any>} args - 传递给原始方法的参数数组。
       * @returns {any} 原始方法的返回值。
       */
      apply: (target, thisArg, args) => {
        /** @type {StreamInfo} */
        const streamInfo = args[0]

        this.#processStreamInfo(streamInfo)
        this.#renderBitrateDisplay()

        return Reflect.apply(target, thisArg, args)
      },
    })
  }

  /**
   * 处理传入的视频流信息，计算当前码率并更新内部的码率记录和平均码率。
   * @param {StreamInfo} streamInfo - 包含实时视频数据的对象。
   */
  #processStreamInfo(streamInfo) {
    const { realtimeInfo, mediaInfo } = streamInfo
    const currentBitrate = realtimeInfo.videoNetworkActivity * BYTES_TO_KBPS_FACTOR
    const newVideoSrc = mediaInfo.videoSrc

    // 视频源变化时重置码率记录。
    if (this.#currentVideoSrc.length === 0 || this.#currentVideoSrc !== newVideoSrc) {
      this.#currentVideoSrc = newVideoSrc
      this.#bitrateRecord = []
      console.debug(`VideoMetricsMonitor: 视频源已更改为: ${this.#currentVideoSrc}，码率记录已重置。`)
    }

    this.#bitrateRecord.unshift(currentBitrate)

    if (this.#bitrateRecord.length > BITRATE_RECORD_MAX_LENGTH) {
      this.#bitrateRecord.pop()
    }

    // 修正：原始代码中将 `newBufferLength` 加入分母的逻辑不符合标准平均码率计算。
    const sumBitrate = this.#bitrateRecord.reduce((sum, bitrate) => sum + bitrate, 0)
    this.#averageBitrate = Number.parseFloat((sumBitrate / this.#bitrateRecord.length).toFixed(2))
  }

  /** 在页面上创建或更新码率显示元素。 */
  #renderBitrateDisplay() {
    if (!this.#bitrateDisplayElement) {
      this.#bitrateDisplayElement = document.getElementById(VIDEO_BITRATE_DISPLAY_ID)
      if (!this.#bitrateDisplayElement) {
        this.#createBitrateDisplayElement()
      }
    }

    if (this.#bitrateDisplayElement) {
      const dataElement = this.#bitrateDisplayElement.querySelector('.web-player-line-data')
      if (dataElement) {
        dataElement.textContent = ` [${this.#bitrateRecord.length}s] ${this.#averageBitrate} Kbps.`
      }
      else {
        console.warn(`VideoMetricsMonitor: 码率显示元素 (ID: ${VIDEO_BITRATE_DISPLAY_ID}) 缺少 '.web-player-line-data' 子元素。`)
      }
    }
    else {
      console.warn(`VideoMetricsMonitor: 无法找到或创建码率显示元素 (ID: ${VIDEO_BITRATE_DISPLAY_ID})。`)
    }
  }

  /** 创建码率显示 DOM 元素并将其插入到页面中指定位置。 */
  #createBitrateDisplayElement() {
    const targetElement = document.getElementById(VIDEO_INFO_CONTAINER_ID)

    if (targetElement) {
      const newDiv = document.createElement('div')
      newDiv.id = VIDEO_BITRATE_DISPLAY_ID
      newDiv.style.minWidth = '290px'
      newDiv.style.lineHeight = '18px'
      newDiv.style.fontSize = '12px'

      const labelDiv = document.createElement('div')
      labelDiv.style.display = 'inline-block'
      labelDiv.style.whiteSpace = 'nowrap'
      labelDiv.style.width = '100px'
      labelDiv.style.textAlign = 'right'
      labelDiv.style.fontWeight = '500'
      labelDiv.style.marginRight = '15px'
      labelDiv.textContent = 'Video Bitrate:'
      newDiv.appendChild(labelDiv)

      const dataDiv = document.createElement('div')
      dataDiv.style.display = 'inline-block'
      dataDiv.style.minWidth = '58px'
      dataDiv.classList.add('web-player-line-data')
      newDiv.appendChild(dataDiv)

      targetElement.insertAdjacentElement('afterend', newDiv)
      this.#bitrateDisplayElement = newDiv
      console.debug(`VideoMetricsMonitor: 码率显示元素 (ID: ${VIDEO_BITRATE_DISPLAY_ID}) 已成功创建并插入。`)
    }
    else {
      console.warn(`VideoMetricsMonitor: 未找到 id 为 "${VIDEO_INFO_CONTAINER_ID}" 的目标元素，无法创建码率显示 div。`)
    }
  }

  /**
   * 获取当前的平均码率。
   * @returns {number} 平均码率，单位：Kbps。
   */
  getAverageBitrate() {
    return this.#averageBitrate
  }

  /**
   * 获取当前的码率记录数组的副本。
   * @returns {number[]} 码率记录数组。
   */
  getBitrateRecord() {
    return [...this.#bitrateRecord]
  }

  /**
   * 获取当前监控的视频源 URL。
   * @returns {string} 视频源 URL。
   */
  getCurrentVideoSrc() {
    return this.#currentVideoSrc
  }
}

/**
 * 初始化用户脚本的核心逻辑。
 * 该函数负责通过代理 `WeakMap.prototype.set` 来捕获应用程序内部的 `VideoPanel` 实例。
 */
function initializeScriptHook() {
  console.log(`${PROJECT_NAME} ${PROJECT_VERSION} - 脚本已加载，正在尝试捕获 VideoPanel 实例...`)

  const originalWeakMapSet = WeakMap.prototype.set
  let isHookActive = true

  /**
   * 检查一个对象是否是目标 `VideoPanel` 实例的候选者。
   * @param {object} obj - 待检查的对象。
   * @returns {boolean} 如果是 `VideoPanel` 候选者则返回 `true`，否则返回 `false`。
   */
  const isVideoPanelCandidate = (obj) => {
    return obj && typeof obj === 'object'
      && typeof obj.updateVideoTemplate === 'function'
      && typeof obj.createTemplateProxy === 'function'
  }

  // 代理 WeakMap.prototype.set 方法，以捕获 VideoPanel 实例。
  // eslint-disable-next-line no-extend-native
  WeakMap.prototype.set = new Proxy(originalWeakMapSet, {
    /**
     * 拦截 `WeakMap.prototype.set` 的调用。
     * @param {Function} target - 原始的 `WeakMap.prototype.set` 方法。
     * @param {WeakMap} thisArg - 调用 `set` 方法的 `WeakMap` 实例。
     * @param {Array<any>} args - 传递给 `set` 方法的参数 `[key, value]`。
     * @returns {any} 原始 `set` 方法的返回值。
     */
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
          console.debug('Hook: 成功捕获到 VideoPanel 实例。')

          try {
            // @ts-ignore
            unsafeWindow.debugVideoMetrics = new VideoMetricsMonitor(panelObject)
            console.debug('Hook: VideoMetricsMonitor 初始化成功，可通过 unsafeWindow.debugVideoMetrics 访问调试信息。')
          }
          catch (e) {
            console.error('Hook: VideoMetricsMonitor 初始化失败:', e)
          }
        }
      }

      return Reflect.apply(target, thisArg, args)
    },
  })
}

// 确保脚本在 DOM 完全加载后执行。
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeScriptHook)
}
else {
  initializeScriptHook()
}
