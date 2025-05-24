// ==UserScript==
// @name         哔哩哔哩直播显示平均码率
// @namespace    bili_live_average_bitrate_display
// @version      1.0.0
// @author       Raven-tu
// @description  A userscript to display the average bitrate of Bilibili live streams.
// @icon         https://live.bilibili.com/favicon.ico
// @match        *://live.bilibili.com/*
// @connect      live.bilibili.com
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  var __defProp = Object.defineProperty;
  var __typeError = (msg) => {
    throw TypeError(msg);
  };
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
  var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), member.set(obj, value), value);
  var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
  var _bitrateRecord, _panel, _VideoMetricsMonitor_instances, addBitrateSampleAndRecalculateAverage_fn;
  const name = "bili_live_average_bitrate_display";
  const version = "1.0.0";
  const Package = {
    name,
    version
  };
  const PROJECT_NAME = Package.name;
  const PROJECT_VERSION = Package.version;
  var _unsafeWindow = /* @__PURE__ */ (() => typeof unsafeWindow != "undefined" ? unsafeWindow : void 0)();
  const BITRATE_RECORD_MAX_LENGTH = 60;
  const BYTES_TO_KBPS_FACTOR = 8 / 1024;
  class VideoMetricsMonitor {
    /**
     * `VideoMetricsMonitor` 类的构造函数。
     * @param {VideoPanel} panel - 视频面板对象。
     */
    constructor(panel) {
      __privateAdd(this, _VideoMetricsMonitor_instances);
      /**
       * 视频源 URL。
       * @type {string}
       */
      __publicField(this, "videoSrc", "");
      /**
       * 平均码率，单位：千比特每秒 (Kbps)。
       * @type {number}
       */
      __publicField(this, "averageBitrate", 0);
      /**
       * 码率记录数组，存储最近的码率样本，单位：千比特每秒 (Kbps)。
       * @type {number[]}
       */
      __privateAdd(this, _bitrateRecord, []);
      /**
       * 用于调试的 `VideoPanel` 实例引用。
       * @type {VideoPanel | null}
       */
      __privateAdd(this, _panel, null);
      __privateSet(this, _panel, panel);
      panel.updateVideoTemplate = new Proxy(panel.updateVideoTemplate, {
        apply: (target, thisArg, args) => {
          const streamInfo = args[0];
          const currentBitrate = streamInfo.realtimeInfo.videoNetworkActivity * BYTES_TO_KBPS_FACTOR;
          const currentVideoSrc = streamInfo.mediaInfo.videoSrc;
          __privateMethod(this, _VideoMetricsMonitor_instances, addBitrateSampleAndRecalculateAverage_fn).call(this, currentBitrate, currentVideoSrc);
          streamInfo.mediaInfo.fps = `[${__privateGet(this, _bitrateRecord).length}s] ${this.averageBitrate} Kbps. ${streamInfo.mediaInfo.fps}`;
          return Reflect.apply(target, thisArg, [streamInfo]);
        }
      });
    }
  }
  _bitrateRecord = new WeakMap();
  _panel = new WeakMap();
  _VideoMetricsMonitor_instances = new WeakSet();
  /**
   * 添加新的码率样本并重新计算平均码率。
   * @param {number} newBitrate - 新的码率样本，单位：Kbps。
   */
  addBitrateSampleAndRecalculateAverage_fn = function(newBitrate, newVideoSrc) {
    if (this.videoSrc.length === 0 || this.videoSrc !== newVideoSrc) {
      this.videoSrc = newVideoSrc;
      __privateSet(this, _bitrateRecord, []);
      console.debug(`视频源已更改: ${this.videoSrc}`);
    }
    __privateGet(this, _bitrateRecord).unshift(newBitrate);
    if (__privateGet(this, _bitrateRecord).length > BITRATE_RECORD_MAX_LENGTH) {
      __privateGet(this, _bitrateRecord).pop();
    }
    this.averageBitrate = (__privateGet(this, _bitrateRecord).reduce((sum, bitrate) => sum + bitrate, 0) / __privateGet(this, _bitrateRecord).length).toFixed(2);
  };
  function initializeScriptHook() {
    console.log(`${PROJECT_NAME} ${PROJECT_VERSION} - 已加载。`);
    const originalWeakMapSet = WeakMap.prototype.set;
    let isHookActive = true;
    const isVideoPanelCandidate = (obj) => {
      return obj && typeof obj === "object" && "updateVideoTemplate" in obj && "createTemplateProxy" in obj;
    };
    WeakMap.prototype.set = new Proxy(originalWeakMapSet, {
      apply(target, thisArg, args) {
        if (isHookActive) {
          const [key, value] = args;
          let panelObject = null;
          if (isVideoPanelCandidate(key)) {
            panelObject = key;
          } else if (isVideoPanelCandidate(value)) {
            panelObject = value;
          }
          if (panelObject) {
            isHookActive = false;
            console.debug("成功捕获到 VideoPanel 实例。");
            try {
              _unsafeWindow.debugVideoMetrics = new VideoMetricsMonitor(panelObject);
              console.debug("VideoMetricsMonitor 初始化成功，可通过 unsafeWindow.debugVideoMetrics 访问调试信息。");
            } catch (e) {
              console.error("VideoMetricsMonitor 初始化失败:", e);
            }
          }
        }
        return Reflect.apply(target, thisArg, args);
      }
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeScriptHook);
  } else {
    initializeScriptHook();
  }

})();