### 更新记录
| 编辑人员 | 时间 | 说明 |
| :---: | :---: | :---:|
| 梁安秋 | 2023-7-4 | 基于pc埋点sdk[report_sdk.js](http://10.10.19.236/SMS-Dept/public-components/blob/master/%E5%B0%8F%E7%A8%8B%E5%BA%8F/wxtrack/report_sdk.js)修改并使用rollup打包小程序埋点SDK |
git地址：http://10.10.19.236/SMS-Dept/public-components.git
### 目录结构

项目的整体结构。


```
├── _tests_                    # 单元测试
├── dist                       # 打包文件
│   ├── wxtrack-es.js          # ES 模块文件
│   ├── wxtrack.min.js         # 通用模块化
├── src                        # 源代码
│   ├── helper.js              # 页面操作
│   ├── report.js              # 埋点数据操作
│   ├── wrapper.js             # Page/App对象操作
│   ├── index.js               # 入口文件
├── .gitignore                 # git的忽略配置文件
├── package.json               # npm 包配置文件，依赖包信息
├── .babelrc                   # babel 配置
├── rollup.config.js           # rollup 配置
├── README.md                  # SDK介绍

```

### 使用

2、在app.js初始化

```
//引入埋点SDK
import Tracker from './tracks/wxtrack.min';
// 引入埋点配置信息，请自行参考tracks目录下埋点配置修改
import {eventConfig} from './tracks/config.js';

// 初始化
const report = new Tracker({
    tracks: eventConfig,
    base_url: 'https://xxxxxx', // 上报接口地址
    appid: 'xxxxxx', // 小程序appid
    appkey: 'xxxxxx', // 小程序appkey
    debug: '0'
});
// 小程序需要设置openid
getToken(){
  // 请求接口后设置
  ...
  report.openid = openid || '' // 设置openid作为埋点用户唯一标识
}

```

2、加入埋点信息（设置后可自动获取信息，也可单独使用，参考4）


```
/**
 * path 页面路径
 * elementTracks 页面元素埋点
 * methodTracks 执行函数埋点
 * eventName 上报事件
 * element 目标元素
 * dataKeys 目标埋点数据,传数组第一个参数为页面元素定义的数据data-xxx，第二个参数为上传参数，非数组默认传data
 * 如果配置了元素获取埋点，则需要最外层包裹view并加上方法catchtap="elementTracker"
*/
export const eventConfig = [{
    path: 'pages/newHome/newHome',
    elementTracks: [
      {
        element: '.banner',
		eventName: 'bannertest',
		dataKeys: ['imgUrls', ['$dataset.src', 'url_var']],
      }
    ],
    methodTracks: [
      {
        method: 'goToAd',
		eventName: 'bannertest',
        dataKeys: ['data'],
      }
    ],
  }]

```

  

3、在wxml最外层插入监听方法

```
<view catchtap='elementTracker'>
  <view></view>
</view>

```

4、单独使用

```

// 上报埋点数据
report.track("点击banner图", attributesMap) // attributesMap单独上报属性对象，除默认属性外。

// 链式使用，上报用户属性
report.userSetOnce({"address":"井湾子街道"}) //如果您要上传的用户属性只要设置一次，则可以调用 userSetOnce 来进行设置，当该属性之前已经有值的时候，将会忽略这条信息
.userSet({ name_tset:"张三",age:18})//对于一般的用户属性，您可以调用 userSet 来进行设置，如果之前存在该用户属性将会覆盖原有的属性值，如果之前不存在该用户属性，则会新建该用户属性。
.userUnset("name_tset")//当您要清空用户的某个用户属性值时，您可以调用 userUnset 来对指定属性进行清空操作
.userAdd({age:1})//当您要上传数值型的属性时，您可以调用 userAdd 来对该属性进行累加操作，如果该属性还未被设置，则会赋值 0 后再进行计算。如果传入负值，等同于减法操作
.trackUserData()//最终上报


```
5、滚动获取视图区域元素埋点上报

在app.js中 return report，方便其他页面调用
```
report(){
    return report
}
```
其他page页面
```
// 页面js头部引入方法并初始化
const report = getApp().report()
// 初始化监听
report.initObserver()

Page({
	/**
	 * 调用report.ElObserver上报，在接口返回数据并渲染后调用initObserver方法
	 * 参数1 元素节点
	 * 参数2 上报事件名称
	 * 参数3 自定义上报参数
	 */
	initObserver(data){
		report.delObserver() // 断开之前的监听
		data.forEach(item=>{
		  report.ElObserver('#img'+item.id,'case_browse',{url_var:item.oss_thumb_photo_url})
		})
	},
	/** 滚动方法内调用 监听页面滚动事件，更新 IntersectionObserver 实例 */
	onPageScroll: function (e) {
		this.initObserver(this.data.listData);
	}
})
```


6、监听页面跳转，进出页面上报，一般写在设置openid后.
```
// 在app.js中加入以下代码
report.track("view_access") // 埋点上报，进入小程序
report.watchRoute({pageIn: 'view_access',pageOut:'view_address'}) // pageIn：进入页面上报事件，pageOut：离开页面上报事件
```

7、如果数据库不支持html和css，我们内置了过滤的方法filterHTMLandCSS,在含有html和css的地方用该方法包裹即可

```
const content = report.filterHTMLandCSS(this.data.content)

```
### 特殊前缀

$APP 表示读取App下定义的数据

$DATASET.xxx 表示获取点击元素，定义data-xxx 中的 xxx值


$INDEX 表示获取列表，当前点击元素的索引

\*\*需要获取$INDEX时，需要在wxml中加入data-index={{index}}标记\*\*

```

<view class='playing-item' data-index="{{index}}" wx:for='{{playingFilms}}'></view>

```


### 兼容插件模式


由于SDK会改写Page对象，如果使用了插件，微信会禁止改写，可以通过以下方式改造。

```

// 初始化插件模式

const tracker = new Tracker({ tracks: trackConfig, isUsingPlugin: true });

// 将原来的App包装

tracker.createApp({

})

// 将原Page包装

tracker.createPage({

})

```