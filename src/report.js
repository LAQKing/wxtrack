class EventReport {
  constructor({ base_url, appid, appkey, debug }) {
    this.base_url = base_url;
    this.appid = appid;
    this.appkey = appkey;
    this.debug = debug;
    this.name = "rp_bi";
    this.reportEvent = "reportEvent";
    this.reportUser = "reportUser";
    this.libVersion = "1.0.0";
    this.lib = "js";
    this._state = {};
    this.observer = null // 监听元素实例
    this.visibleItems = [] // 记录可见元素参数

    let storageData = this.getKVForClient(this.name);

    if (storageData != null && storageData != "" && this.isJSONString(storageData)) {
        this._state = JSON.parse(storageData);
        this._save();
    }
  }
  getReportApi(eventName, reportType) {
    return `${this.base_url}/wxtrack/${reportType}/${this.appid}/${this.appkey}/${eventName}/${this.debug}`;
  }
  /**获取客户端标识 */
  getKVForClient(k) {
    return wx.getStorageSync(`${this.appid}_rp_${k}`);
  }
  /** 缓存信息 */
  _save() {
    this.setKVForClient(this.name, JSON.stringify(this._state));
  }
  setKVForClient(k, v) {
    wx.setStorageSync(`${this.appid}_rp_${k}`, v);
  }
  
  getUUid() {
    let uuid = this.getDistinctId();
    //老用户
    if (uuid != undefined) {
        return uuid;
    } else {
        //新用户
        var e = (new Date).getTime();
        uuid = this.openid || String(Math.random()).replace(".", "").slice(1, 11) + "-" + e;
        this.identify(uuid);
        this.setRegTime(this.getTimeStamp());
    }
    return uuid;
  }
  timeStamp2Date(timestamp) {
    if (timestamp.length == 10) {
        timestamp = Number(timestamp + "000");
    }
    let time = new Date(timestamp);
    let year = time.getFullYear();
    let month = time.getMonth() + 1;
    let date = time.getDate();
    let hours = time.getHours();
    let minute = time.getMinutes();
    let second = time.getSeconds();

    if (month < 10) {
        month = '0' + month
    }
    if (date < 10) {
        date = '0' + date
    }
    if (hours < 10) {
        hours = '0' + hours
    }
    if (minute < 10) {
        minute = '0' + minute
    }
    if (second < 10) {
        second = '0' + second
    }
    return year + '-' + month + '-' + date + ' ' + hours + ':' + minute + ':' + second;
  }
  getTimeStamp() {
    var time = Date.parse(new Date()).toString();//获取到毫秒的时间戳，精确到毫秒
    time = time.substr(0, 10);//精确到秒
    return time;
  }
  request(eventName,report,data){
    return new Promise((resolve, reject) => {
      wx.request({
        url: this.getReportApi(eventName, report),
        header: { 'appid': this.appid },
        data: data,
        method: 'post',
        success: (res) => {
          resolve(res)
        },
        fail: (err) => {
          reject(err)
        }
      })
    })
  }
  /** 字符串判断 */
  isJSONString(str) {
    if (typeof str === 'string') {
        try {
            var obj = JSON.parse(str);
            if (typeof obj === 'object' && obj) {
                return true;
            } else {
                return false;
            }
        } catch (e) {
            console.warn('error：' + str + '!!!' + e);
            return false;
        }
    }
    return false;
  }
  
  platform(val){
    const value = {
      'ios':	'iOS微信',
      'android':	'Android微信',
      'windows':	'Windows微信',
      'mac':	'macOS微信',
      'devtools':	'微信开发者工具',
    }
    return value[val]
  }
  /** 验证小程序页面路径是否正确 */
  validatePagePath(pagePath) {
    const pagePathRegex = /^(?:pages\/)?[\w-]+\/[\w-]+(?:\/[\w-]+)*$/;
    return pagePathRegex.test(pagePath);
  }
  getrpPage(s,t){
    let pages = getCurrentPages();
    let route = '';
    if(pages.length > s) {
      route = pages[pages.length - t].route;
    }
    
    const isValid = this.validatePagePath(route)
    if(isValid){
      let options = pages[pages.length - t].options;
        if (options) {
          for (let i in options) {
            if (route.indexOf("?") != -1) {
              route += ("&" + i + '=' + options[i])
            }  else {
              route += ("?" + i + '=' + options[i])
            }
          }
        };
      return route
    }else{
      return null
    }
  }
  /** 默认字段 */
  getDefaultAttr() {
    const res = wx.getSystemInfoSync()
    const deviceInfo = wx.getDeviceInfo()
    return {
        "rp_distinct_id": this.getUUid(),
        "rp_os": res.system.split(' ')[0],
        "rp_os_version": res.system.split(' ')[1],
        "rp_reg_time": this.timeStamp2Date(this.getRegTime()),
        "rp_client_time": this.timeStamp2Date(this.getTimeStamp()),
        "rp_update_time": this.timeStamp2Date(this.getTimeStamp()),
        "rp_lib": this.lib,
        "rp_lib_version": this.libVersion,
        "rp_cpu": deviceInfo.cpuType || '其他',
        "rp_screen_height": res.screenHeight,
        "rp_screen_width": res.screenWidth,
        "rp_browser": this.platform(res.platform),
        "rp_browser_version": res.version,
        "rp_network_type": '未知',
        "rp_manufacturer": res.brand,
        "rp_brand": res.brand,
        "rp_device_model": res.model,
        "rp_scene": this.getrpPage(0,1)
    };
  }
  
  /** 访问页面上报 */
  watchRoute({pageIn,pageOut}){
    const that = this
    const router = []
    // 添加第一个页面
    if(that.getrpPage(0,1)){
      router.push({path: that.getrpPage(0,1), time: that.timeStamp2Date(that.getTimeStamp())})
    }
    /** 监听路由变化 */
    wx.onAppRoute(function(res){
      if(that.getrpPage(0,1)){
        // const { openType } = res;
        // if (openType.indexOf('Back') <= -1) {
        //   that.track(pageIn);  // 非返回才触发
        // }
        that.track(pageIn) // 埋点上报，进入小程序
        const routeIndex = router.findIndex(item=>item.path == that.getrpPage(0,1))
        let time = that.timeStamp2Date(that.getTimeStamp()) // 记录进入页面的时间
        let obj = {}
        obj.path = that.getrpPage(0,1)
        obj.time = time
        if(routeIndex !== -1){
          router.splice(routeIndex,1)
        }
        router.push(obj)
        //埋点上报，离开小程序
        let respath = ''
        let restime = ''
        if(router.length>1){
          respath = router[router.length-2].path
          restime = router[router.length-2].time
        }else{
          respath = router[0].path
          restime = router[0].time
        }
        that.track(pageOut,{rp_scene: respath,rp_client_time: restime})
      }
    })
  }
  /** 监听元素初始化 */
  initObserver(){
    this.observer = null
    this.visibleItems = []
    return this
  }
  /** 监听元素
   * element
   */
  ElObserver(element,eventName,params){
    let that = this
    // 创建 IntersectionObserver 实例
    this.observer = wx.createIntersectionObserver();
    // 设置监听的选项
    const options = {
      thresholds: [0] // 监听的阈值，表示元素可见性的比例
    };
    this.observer.relativeToViewport(options);
    // 监听所有列表项的可见性变化
    this.observer.observe(element, (res) => {
      const paramsString = JSON.stringify(params)
      if (res.intersectionRatio > 0) {
        if (that.visibleItems.indexOf(paramsString) == -1) {
          that.visibleItems.push(paramsString);
          that.track(eventName,params)
        }
      } else {
        const index = that.visibleItems.indexOf(paramsString);
        if (index > -1) {
          that.visibleItems.splice(index, 1);
        }
      }
    });
  }
  /** 断开之前的监听 */
  delObserver(){
    if(this.observer){
      this.observer.disconnect();
    }
    return this
  }
  /** 事件上报 */
  track(eventName, attributesMap) {
    if (attributesMap == null || attributesMap == "" || attributesMap == undefined) {
        attributesMap = {};
    }
    let sendAttr = this.getDefaultAttr();
    for (let key in attributesMap) {
        if (attributesMap.hasOwnProperty(key) === true) {
            sendAttr[key] = attributesMap[key];
        }
    }
    let superProperties = this.getSuperProperties();
    for (let key in superProperties) {
        if (superProperties.hasOwnProperty(key) === true) {
            sendAttr[key] = superProperties[key];
        }
    }
    const that = this
    wx.getNetworkType({
      success(res){
        sendAttr['rp_network_type'] = res.networkType
        that.request(eventName, that.reportEvent, sendAttr).then((res) => {
          if (that.debug == 1 || that.debug == 2) {
              console.log("res", res);
          }
        }).catch((err) => {
          console.error("err", err);
        })
      }
    })
    if(this.getKVForClient(this.getDistinctId()+"/trackUserOnly")==null){
        this.trackUserData()
        this.setKVForClient(this.getDistinctId()+"/trackUserOnly","1")
    }
  }
  /** 用户属性上报 */
  trackUserData() {
    let userProperties = JSON.parse(JSON.stringify(this.getUserProperties()));
    userProperties["rp_distinct_id"] = this.getUUid();
    userProperties["rp_reg_time"] = this.timeStamp2Date(this.getRegTime());
    userProperties["rp_update_time"] = this.timeStamp2Date(this.getTimeStamp());
    userProperties["rp_client_time"] = this.timeStamp2Date(this.getTimeStamp());

    const that = this
    wx.getNetworkType({
      success(res){
        userProperties['rp_network_type'] = res.networkType
        that.request("用户属性", that.reportUser, userProperties).then((res) => {
          if (that.debug == 1 || that.debug == 2) {
              console.log("res", res);
          }
        }).catch((err) => {
            console.error("err", err);
        })
      }
    })
  }
  _set(k, v) {
    this._state = this._state || {}, this._state[k] = v, this._save();
  }
  getDistinctId() {
    return this._state["distinct_id"];
  }
  identify(e) {
    this._set("distinct_id", e);
  }
  clear() {
    this._state = {}, this._save();
  }
  logout() {
    var e = (new Date).getTime();
    let uuid = String(Math.random()).replace(".", "").slice(1, 11) + "-" + e;
    this.identify(uuid);
    this.setAccountId("");
  }
  setAccountId(e) {
    this._set("rp_account_id", e);
  }
  getAccountId() {
    return this._state["rp_account_id"];
  }
  setSuperProperties(e) {
    this._set("super_properties", e);
  }
  unsetSuperProperties = function (e) {
    let tmp = this.getSuperProperties();
    delete tmp[e];
    this.setSuperProperties(tmp);
  }

  clearSuperProperties() {
    this._set("super_properties", {});
  }

  getSuperProperties() {
    return this._state["super_properties"] || {};
  }

  getUserProperties(e) {
      return this._state["user_properties"] || {};
  }

  userSet(data) {
      let userProperties = this.getUserProperties();
      for (let k in data) {
          userProperties[k] = data[k];
      }
      this._set("user_properties", userProperties);
      return this
  }

  userSetOnce(data) {
      let userProperties = this.getUserProperties();
      for (let k in data) {
          if (!userProperties.hasOwnProperty(k)) {
              userProperties[k] = data[k];
          }
      }
      this._set("user_properties", userProperties);
      return this
  }

  userAdd(data) {
      let userProperties = this.getUserProperties();
      for (let k in data) {
          if (!userProperties.hasOwnProperty(k)) {
              userProperties[k] = 0;
          } else {
              userProperties[k] = userProperties[k] + data[k];
          }
      }
      this._set("user_properties", userProperties);
      return this
  }

  userUnset(key) {
      let userProperties = this.getUserProperties();
      delete userProperties[key];
      this._set("user_properties", userProperties);
      return this
  }

  login(e) {
      this._set("rp_account_id", e);
  }

  getUserProperties() {
      return this._state["user_properties"] || {};
  }

  getRegTime() {
      if (!this._state.hasOwnProperty("getRegTime")) {
          this.setRegTime(this.getTimeStamp());
      }
      return this._state["getRegTime"];
  }

  setRegTime(e) {
      this._state.hasOwnProperty("getRegTime") ? console.warn("Current getRegTime is ", this.getRegTime(), ", it couldn't been set to: ", e) : this._set("getRegTime", e);
  }
  /**
   * 解析数组类型dataKey
   * 例如list[$INDEX],返回{key:list, index: $INDEX}
   * 例如list[4],返回{key:list, index: 4}
   * @param {*} key
   * @param {*} index
   */
  resloveArrayDataKey(key, index){
    const leftBracketIndex = key.indexOf('[');
    const rightBracketIndex = key.indexOf(']');
    const result = {};
    if (leftBracketIndex > -1) {
      let arrIndex = key.substring(leftBracketIndex + 1, rightBracketIndex);
      const arrKey = key.substring(0, leftBracketIndex);
      if (arrIndex === '$INDEX') {
        arrIndex = index;
      }
      result.key = arrKey;
      result.index = parseInt(arrIndex, 10);
    }
    return result;
  };

  /**
   * 获取全局数据
   * @param {*} key 目前支持$APP.* $DATASET.* $INDEX
   * @param {*} dataset 点击元素dataset
   * @param {*} index 点击元素索引
   */
  getGloabData(key, dataset){
    let result = '';
    if (key.indexOf('$APP.') > -1) {
      const App = getApp();
      const appKey = key.split('$APP.')[1];
      result = App[appKey];
    } else if (key.indexOf('$DATASET.') > -1) {
      const setKey = key.split('$DATASET.')[1];
      result = dataset[setKey];
    } else if (key.indexOf('$INDEX') > -1) {
      result = dataset.index;
    }
    return result;
  };

  getPageData(key, dataset = {}, paegData) {
    const { index } = dataset;
    const keys = key.split('.');
    let result = paegData;
    if (keys.length > -1) {
      keys.forEach((name) => {
        const res = this.resloveArrayDataKey(name, index);
        if (res.key) {
          result = result[res.key][res.index];
        } else {
          result = result[name];
        }
      });
    } else {
      result = paegData[key];
    }
    return result;
  };

  dataReader(key, dataset, pageData) {
    try {
      let result = '';
      if (key.indexOf('$') === 0) {
        result = this.getGloabData(key, dataset);
      } else {
        result = this.getPageData(key, dataset, pageData);
      }
      return result;
    } catch (e) {
      console.log(e);
      return '';
    }
  };


  report(track, pageData) {
    const that = this;
    const { element, method, dataKeys=[], eventName } = track;
    const logger = [];
    const defaultAttr = this.getDefaultAttr();
    const attr = {element, method};
    if(dataKeys.length){
      dataKeys.forEach(datakKey => {
        let data = ''
        if(Object.prototype.toString.call(datakKey) == '[object Array]'){
          data = this.dataReader(datakKey[0], track.dataset, pageData);
          attr[datakKey[1]] = data
        }else{
          data = this.dataReader(datakKey, track.dataset, pageData);
          attr.data = data;
        }
        // attr.datakKey = datakKey;
      });
    }
    wx.getNetworkType({
      success(res){
        defaultAttr.rp_network_type = res.networkType;
        logger.push({...defaultAttr, ...attr});
        that.track(eventName,{...defaultAttr, ...attr});
      }
    });
  };
  filterHTMLandCSS(str){
    // 过滤 CSS 样式
    const filteredCSS = str.replace(/<style[^>]*>[^<]*<\/style>/g, '');
    // 过滤 HTML 标签
    const filteredHTML = filteredCSS.replace(/<[^>]+>/g, '');
    return filteredHTML;
  }
}


export default EventReport;
