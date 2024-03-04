auto.waitFor(); //mode = "fast"
var delay_time = 3000;
device.wakeUpIfNeeded();//如果屏幕没有点亮，则唤醒设备。
var fast_mode = false;
//判断是否快速模式
if (fast_mode) {
    auto.setMode("fast");//该模式下会启用控件缓存，从而选择器获取屏幕控件更快
}
events.observeToast();//开启 Toast 监听，Toast 监听依赖于无障碍服务，因此此函数会确保无障碍服务运行
sleep(delay_time);//暂停3秒


//设置全局函数
var is_exit = true;
var currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, "");
var pathname = "/sdcard/跑题库/" + `${currentDate}`;
var re_xuan_txt = '';
/*****************更新内容弹窗部分*****************/
var ocr_maxtime = "5000";
// let config = require("config.js");
let utils = require("utils.js");
// var commonStorage = storages.create(config.commonScriptKey);
var img3 = null;//初始一个参数，方便开启找色线程
sleep(1000);
// 初始化文字识别插件
// var 文字识别插件 = commonStorage.get("文字识别插件") || "谷歌"
var 文字识别插件 = "Paddle"
utils.initOcr(文字识别插件);
//打开悬浮窗
var w = fInit();
fInfo("四人赛刷题助手" + "脚本初始化");
// 初始化宽高
var [device_w, device_h] = init_wh();//init_wh()是返回设备宽和高的函数

// 设置题库保存路径、读取题库内容
var save_path = "/sdcard/跑题库/" + `${currentDate}` + "/四人赛" + random(0, 1000) + ".json"
sleep(2000);
if (files.isFile(save_path)) {
    fInfo("存在题库，题库读取中")
    var globalTiku = JSON.parse(json_str = files.read(save_path))
}
else {
    fInfo("没有目标题库文件，将写新文件输出");
    if (files.createWithDirs(save_path)) {
        var globalTiku = {};
        fInfo("题库创建成功")
    }
}

// 自动允许权限进程
threads.start(function () {
    //在新线程执行的代码
    toastLog("开始自动获取截图权限");
    var btn = className("android.widget.Button").textMatches(/允许|立即开始|START NOW/).findOne(5000);
    if (btn) {
        sleep(1000);
        btn.click();
    }
    toastLog("结束获取截图权限");
});
fInfo("请求截图权限");
// 请求截图权限、似乎请求两次会失效
if (!requestScreenCapture(false)) { // false为竖屏方向
    fError('请求截图失败');
    exit();
}
// //加载Google OCR插件
// fInfo("初始化MLkitOCR插件");
// try {
//     var MLKitOCR = plugins.load('org.autojs.autojspro.plugin.mlkit.ocr');
//     var googleOcr = new MLKitOCR();
// } catch (e) {
//     fError("GoogleMLKit插件加载失败");
//     exit();
// }

fInfo("初始化PaddleOCR插件");
var paddleOcr = $ocr.create({
    models: 'slim', // 指定精度相对低但速度更快的模型，若不指定则为default模型，精度高一点但速度慢一点
});
// 防止设备息屏
fInfo("设置屏幕常亮");
device.keepScreenOn(3600 * 1000);
// 下载题库
fInfo("检测题库更新");
fInfo("如果不动就是正在下载，多等会");
const update_info = get_tiku_by_http("https://gitcode.net/2301_80350381/tiku/-/raw/master/info.json");
fInfo("正在加载对战题库......请稍等\n题库版本:" + update_info["tiku_link"].split('_')[2]);
fInfo("题目数量:" + update_info["tiku_link"].split('_')[3].slice(0, -4));
var tiku = [];
try {
    tiku = get_tiku_by_http(update_info["tiku_link"]);
} catch (e) {
    tiku = get_tiku_by_http(update_info["tiku_link2"]);
}




if (is_exit) {
    fInfo("运行前重置学习APP");
    exit_app("学习强国");
    sleep(1500);
    fClear();
}
// 检测地理位置权限代码，出现就点掉
fInfo("开始位置权限弹窗检测");
var nolocate_thread = threads.start(function () {
    //在新线程执行的代码
    id("title_text").textContains("地理位置").waitFor();
    fInfo("检测到位置权限弹窗");
    sleep(1000);
    text("暂不开启").findOne().click();
    fInfo("已关闭定位");
});
fInfo("跳转学习APP");
// launch('cn.xuexi.android');
app.launchApp('学习强国');
sleep(2000);


/*******************运行部分*******************/
nolocate_thread.isAlive() && (nolocate_thread.interrupt(), fInfo("终止位置权限弹窗检测"));

//四人赛跑题库
fClear();
text("我的").findOne().click();
sleep(3000);
fInfo("OCR识字点击：我要答题");
clicktext("我要答题");
sleep(3000);
//检索点击我要答题四人赛按钮
var four_radio = textStartsWith("best").findOne();
if (four_radio != null) {
    four_radio.parent().click();
} else {
    exit();
    throw ("未检测到四人赛答题按钮，退出中……")
}

//点击四人赛
if (ocr_test()) {
    if (text("开始比赛").exists()) {
        toastLog("四人赛开始");
        do_duizhan1(4);
    }
} else {
    fError.push("OCR出现问题");
    back();
}
//zhaose_thread.isAlive() && (zhaose_thread.interrupt(), fInfo("终止找色线程"));
finish();//结束刷题


/*****************结束后配置*****************/
function finish() {
    fInfo("已全部结束");
    // 调回原始音量

    // 取消屏幕常亮
    fInfo("取消屏幕常亮");
    device.cancelKeepingAwake();
    // exit_app("学习强国");

    // 震动提示
    device.vibrate(500);
    fInfo("十秒后关闭悬浮窗");
    device.cancelVibration();
    sleep(10000);
    console.hide();
    home();
    exit();
}
/********双人、四人赛*********/
function do_duizhan1(renshu) {
    //   jifen_list = refind_jifen();
    fClear();
    // 等待开始比赛并点击
    fInfo("等待开始比赛");
    text("开始比赛").waitFor();
    sleep(1000);
    let start_click = text("开始比赛").findOne().click();
    fInfo("点击：" + start_click);
    hint_veri();
    className("android.widget.ListView").waitFor();
    fClear();
    //答题后回到答题初始界面
    fInfo("");//加个空对象，方便后面启用fset
    let num = 1;
    let y = 1;//用作刷题库序号
    let err_flag = true;
    for (let x = 1; x <= 30;) {
        fSet("title", "第" + x + "轮");
        while (num != 1 && err_flag) {
            // 检测是否结束并退出
            if (text("继续挑战").exists()) {
                fClear();
                sleep(1000);
                let tz_click = text("继续挑战").findOne().click();
                fInfo("点击继续挑战:" + tz_click);
                sleep(3000);//尝试增加等待时间，减少设备发热
                let bs_click = text("开始比赛").findOne().click();
                fInfo("点击开始比赛:" + bs_click);
                hint_veri();//检测是否用尽答题次数
                num = 1;//答对一轮后重置题目序号
                x++;//计数答题次数
                fSet("title", "第" + x + "轮");
                className("android.widget.ListView").waitFor();
                break
            } else if (text("第" + num + "题").exists()) {
                fClear();
                fInfo("第" + num + "题");
                break;
            }
        }
        while (text("第" + num + "题").exists()) { } //sleep(100);
        let listview = className("android.widget.ListView").findOne(1000);
        if (!listview) {
            log("找不到listview");
            err_flag = false;
            sleep(200);
            continue;
        }
        sleep(100); // 追求极限速度，不知道会不会出错
        let view_d28 = className("android.view.View").depth(28).indexInParent(0).findOne(1000);
        if (!view_d28) {
            toastLog("找不到view_d28");
            err_flag = false;
            sleep(200);
            continue;
        }
        // 根据父框的孩子数
        if (view_d28.childCount() > 0) {
            que_x = view_d28.bounds().left;
            que_y = view_d28.bounds().top;
            que_w = view_d28.bounds().width();
            if (view_d28.child(0).text().length <= 4) { //有来源的是前面两个空格元素，文本为4个空格
                que_h = view_d28.child(2).bounds().top - view_d28.bounds().top;
                if (que_h < 32) {
                    fError("有来源图片高度不够");
                    console.log(view_d28.child(2).bounds().top, view_d28.bounds().top);
                    let img = captureScreen();
                    images.save(img, '/sdcard/跑题库/img' + random(1,1000) + '.png');
                    img.recycle();
                    err_flag = false;
                    fClear();
                    continue;
                }
            } else { //无来源的是题目，文本为8个空格
                que_h = view_d28.child(0).bounds().bottom - view_d28.bounds().top;
                if (que_h < 32) {
                    fError("无来源，图片高度不够");
                    console.log(view_d28.child(0).bounds().bottom, view_d28.bounds().top);
                    let img = captureScreen();
                    images.save(img, '/sdcard/跑题库/img' + random(1,1000) + '.png');
                    img.recycle();
                    err_flag = false;
                    continue;
                }
            }
        } else {
            toastLog("找不到框体");
            log(view_d28.childCount(), view_d28.bounds());
            err_flag = false;
            sleep(200);
            continue;
        }

        // 查找选项个数
        var radio_num = className("android.widget.RadioButton").find().length;
        if (!radio_num) {
            log("找不到选项");
            err_flag = false;
            sleep(200);
            continue;
        }
        //fTips("开始识别题目");
        for (let i = 0; i < 1; i++) {
            let img = captureScreen();
            // 裁剪题干区域，识别题干
            let que_img = images.clip(img, que_x, que_y, que_w, que_h);
            console.log(que_x, que_y, que_w, que_h);
            if (que_h < 32) {
                images.save(que_img, '/sdcard/跑题库/que_img' + random(1,1000) + '.png');
                que_img.recycle();
                console.error("题目长度不够32");
                continue;
            }
            // 为了适配OCR插件改为下面这句
            console.time('题目识别');
            var que_txt = paddle_ocr_api(que_img).replace(/[^\u4e00-\u9fa5\d]|\d{1,2}\./g, "");//使用正则表达式将｜两侧的格式进行清理，左侧是指匹配所有汉字和数字然后取反，右侧是匹配数字1或2后面带点的，全部替换为空字符串
            console.timeEnd('题目识别');
            if (que_txt) {
                fInfo("题目识别：" + que_txt);
                img.recycle();
                que_img.recycle();
                break
            } else {
                fError("未识别出题目，可能被禁止截图或无障碍失效");
                img.recycle();
                que_img.recycle();
            }
        }

        // 选项清洗标识
        var replace_sign = "default_ocr_replace";
        let question_reg = new RegExp(update_info["question_reg"], "gi");//update_info是从网上下载的info中转信息
        let include_reg = new RegExp(update_info["include_reg"], "gi");
        var que_key = null;
        if (que_key = question_reg.exec(que_txt)) {
            replace_sign = "other_ocr_replace";
        } else if (que_key = (/读音|词形/g).exec(que_txt)) {
            replace_sign = "accent_ocr_replace";
        } else if (que_key = include_reg.exec(que_txt)) {
            replace_sign = "include_ocr_replace";
        }
        let ans_list = get_ans_by_tiku(que_txt);
        //log("ans_list:" + ans_list);//暂时输出答案列表
        let idx_dict = {
            "A": 0,
            "B": 1,
            "C": 2,
            "D": 3
        };

        // 如果上面答案不唯一或者不包含找到的选项，直到选项完全出现在屏幕
        try {
            while (className("android.widget.ListView").findOne(1000).indexInParent() == 0) { }
            //fTips("选项显现");
        } catch (e) {
            log("error2:", e);
            err_flag = false;
            sleep(200);
            continue;
        }
        let xuanxiang_list = className("android.widget.ListView").findOne(1000);
        //let xuanxiang_index = xuanxiang_list.indexInParent();//后面没有用到，先注释掉
        let xuanxiang_list_x = xuanxiang_list.bounds().left;
        let xuanxiang_list_y = xuanxiang_list.bounds().top;
        let xuanxiang_list_w = xuanxiang_list.bounds().width();
        let xuanxiang_list_h = xuanxiang_list.bounds().height();

        if (!xuanxiang_list || !xuanxiang_list.parent().childCount() || !xuanxiang_list.parent().child(0)) {
            log("xuan_box is null");
            err_flag = false;
            sleep(200);
            continue;
        }
        log("开始截选项");
        console.time("选项识别");
        img = captureScreen();
        // 裁剪所有选项区域
        img = images.clip(img, xuanxiang_list_x, xuanxiang_list_y, xuanxiang_list_w, xuanxiang_list_h);
        //images.save(allx_img, '/sdcard/1/x_img' + num + '.png');
        let xuan_txt_list = [];
        let allx_txt = "";
        let x_results = paddleOcr.detect(img);
        //console.log(x_results);//打桩看哪里有问题
        try {
            allx_txt = ocr_rslt_to_txt(x_results).replace(/\s+/g, "");
        } catch (e) {
            console.log(x_results);
            for(i = 0;i<3;i++){
                log("error_top:", e);
                err_flag = false;
                fClear();
                auto.clearCache();//清空控件缓存
                sleep(200);
                continue;
              }
              fRefocus();//尝试使用refocus
              console.log("已连续重试三次跳过top错误");
        }
        console.timeEnd("选项识别");
        // log(allx_txt);
        if (!allx_txt) {
            log("识别不出选项文本，可能被禁止截图");
            err_flag = false;
            sleep(200);
            continue;
        }
        img.recycle();//后置清除图片
        // 清洗选项文本
        log("replace_sign:" + replace_sign);
        log("清洗前：" + allx_txt);
        let replace_d = update_info[replace_sign];
        if (replace_sign == "include_ocr_replace") {
            let result = true;
            log("que_key:" + que_key);
            let [words, r, repl] = replace_d[que_key];
            for (let word of words) {
                let reg = new RegExp(word, "gi");
                if (!reg.test(allx_txt)) {
                    result = false;
                    break;
                }
            }
            if (result) {
                let reg = new RegExp(r, "gi");
                allx_txt = allx_txt.replace(reg, repl);
            }
        } else {
            for (let r of Object.keys(replace_d)) {
                let reg = new RegExp(r, "gi");
                allx_txt = allx_txt.replace(reg, replace_d[r]);
            }
        }
        // allx_txt.replace(/令媛/g, "令嫒");
        // 获取选项列表
        console.log("清洗一遍后：" + allx_txt.toString());
        if(allx_txt.toString().includes("不要气")){
            console.error("对局结束，返回")
            continue;
        }
        xuan_txt_list = allx_txt.match(/[a-d][^a-z\u4e00-\u9fa5\d]?\s*.*?(?=[a-d][^a-z\u4e00-\u9fa5\d]?|$)/gi);
        if (!xuan_txt_list) {
            log("识别不出选项");
            err_flag = false;
            sleep(200);
            continue;
        }
        if (xuan_txt_list && xuan_txt_list.length != radio_num) {
            console.error("选项个数和识别个数不匹配处理");
            //xuan_txt_list = allx_txt.match(/[A-D][^a-zA-Z\u4e00-\u9fa5\d]\s*.*?(?=[A-D][^a-zA-Z\u4e00-\u9fa5\d]|$)/g);
            xuan_txt_list = allx_txt.match(/[a-d]\.\s*.*?(?=[a-d]\.|$)/gi);
        }
        log(xuan_txt_list);
        log("清洗后：" + xuan_txt_list.toString());//输出清洗后的选项列表

        if (xuan_txt_list.length != 0) {
            let max_simi = 0;
            let right_xuan = '';
            let right_xuan2 = '';
            let ans_txt = '';
            for (let xuan_txt of xuan_txt_list) {
                let txt = xuan_txt.replace(/^[A-Z]\.?\,?/gi, "");
                for (let ans of ans_list) {
                    let similar = str_similar(ans, txt);
                    if (similar > max_simi) {
                        max_simi = similar;
                        ans_txt = ans;
                        right_xuan2 = ans[0];
                        right_xuan = xuan_txt[0].toUpperCase();
                        re_xuan_txt = txt;//取掉字母加点，取选项
                    }
                }
            }
            // if (ans_list.length > 1) {
            //     fTips("匹配答案:" + ans_txt);
            // }
            fTips("匹配答案:" + ans_txt);
            let serial_que = y + "." + que_txt;
            console.log("开始验证");
            let ans_flag = '';
            // console.log("ans_txt:" + ans_txt)
            // console.log("re_xuan_txt:" + re_xuan_txt);
            if (ans_txt.replace(/\s/g, '')== re_xuan_txt){
                fInfo("识别正确");
                ans_flag = "识别正确";
            }else{
                fError("识别错误");
                ans_flag = "识别错误";
            }
            if (right_xuan != '') {
                let idx = idx_dict[right_xuan];
                fInfo("最终:" + right_xuan);
                try {
                    className("android.widget.RadioButton").findOnce(idx).parent().click();
                } catch (e) {
                    console.log("e:" + e);
                    idx = idx_dict[right_xuan2];
                    fInfo("备选:" + right_xuan2);
                    try {
                        className("android.widget.RadioButton").findOnce(idx).parent().click();
                    } catch (e1) {
                        log("error3:", e1);
                        err_flag = false;
                        sleep(200);
                        continue;
                    }
                }
            } else {
                try {
                    className("android.widget.RadioButton").findOnce().parent().click();
                    // let img4 = captureScreen();
                    // imgSave(img4);
                    // img4.recycle();
                    fError("识别不出选项，盲选A");
                } catch (e1) {
                    log("error4:", e1);
                    err_flag = false;
                    sleep(200);
                    continue;
                }
            }
            if (post_answer_to_json(serial_que, allx_txt, ans_txt, right_xuan, ans_flag)) {//将问题答案写入文件
                fTips("写入题库成功");
            } else {
                fError("题库写入失败");
            }
            y++;
        } else {
            fError("未识别出选项，随机选择");
            className("android.widget.RadioButton").findOnce(random(0, radio_num - 1)).parent().click();
            err_flag = false;
            continue;
        }
        num++;
        err_flag = true;//修正err_flag
    }
}




// 通过缓存题库获取答案
function get_ans_by_tiku(que_txt) {
  let ans_list = [];
  let max_simi = 0;
  let simi = 0;
  let ti_txt = "";
  let len = que_txt.length;
  let threshold = 0.25; // 相似度阈值
  for (let ti of Object.keys(tiku)) {//遍历题库中的键（题目）
    //log(ti.replace(/[\s_]/g, "").indexOf(que_txt));
    ti_txt = ti.replace(/\[.+\]|^\d+\./g, "").replace(/[^\u4e00-\u9fa5\d]/g, "");//对题目文本进行处理，去除方括号内的内容、开头的数字和点以及非中文和数字字符
    //log(ti_txt);
    //let simi = str_similar(ti_txt.slice(0, len+6), que_txt);
    simi = str_similar(ti_txt.slice(0, len), que_txt);
    //if (ti_txt.indexOf(que_txt) >= 0) {
    if (simi >= threshold) {
      if (simi > max_simi) {
        ans_list.length = 0;
        ans_list.push(tiku[ti][1]);
        max_simi = simi;
      } else if (simi == max_simi) {
        ans_list.push(tiku[ti][1]);
      }
    }
  }
  return ans_list;
}

// 获取直链json
function get_tiku_by_http(link) {
    // 通过gitee的原始数据保存题库

    let req = http.get(link, {//没有回调函数，返回请求的响应
        headers: {
            "Accept-Language": "zh-cn,zh;q=0.5",
            "User-Agent": random(0, 17),
        },
    });
    log("状态码：" + req.statusCode);//statusCode为当前响应的HTTP状态码。例如200(OK), 404(Not Found)
    // 更新题库时若获取不到，则文件名+1
    if (req.statusCode != 200) {
        throw "网络原因未获取到题库，请尝试切换流量或者更换114DNS，退出脚本";
        return false;
    }
    return req.body.json();//body的属性json，把响应内容作为JSON格式的数据并调用JSON.parse，返回解析后的对象
}



// 把ocr结果转换为正序的字符串
function ocr_rslt_to_txt(result) {
    let top = 0;
    let previous_left = 0;
    let txt = "";
    let txt_list = [];
    for (let idx in result) {
        if (top == 0) {
            top = result[idx]['bounds']['top'];
        }
        if (previous_left == 0) {
            previous_left = result[idx]['bounds']['top'];
        }
        if (result[idx]['bounds']['top'] >= top - 10 && result[idx]['bounds']['top'] <= top + 10) {
            if (result[idx]['bounds']['left'] > previous_left) {
                txt = txt + "   " + result[idx].text;
            } else {
                txt = result[idx].text + "   " + txt;
            }
        } else {
            top = result[idx]['bounds']['top'];
            txt_list.push(txt);
            txt = result[idx].text;
        }
        if (idx == result.length - 1) {
            txt_list.push(txt);
            break
        }
        previous_left = result[idx]['bounds']['left'];
    }
    //每行直接加个换行
    let ans = txt_list.join("\n");
    //log(ans);
    return ans;
}


// 从首页进入积分界面初始化
function jifen_init() {
    for (id("comm_head_xuexi_score").findOne().click(); !className("android.view.View").text("登录").findOne(9E3);) back(), sleep(1E3), id("comm_head_xuexi_score").findOne().click();
    fRefocus();
    text("登录").waitFor();
    className("android.webkit.WebView").scrollable().findOne().scrollForward()
}

// 模拟随机时间0.5-3秒，后期可以用户自定义
function ran_sleep() {
    return sleep(random(1000, delay_time));
}

// 比较两个字符串相似度
function str_similar(str1, str2) {
    str1 = str1.replace(/[^\u4e00-\u9fa5\u2460-\u2469\wāáǎàōóǒòēéěèīíǐìūúǔùüǖǘǚǜ]/g, "");
    str2 = str2.replace(/[^\u4e00-\u9fa5\u2460-\u2469\wāáǎàōóǒòēéěèīíǐìūúǔùüǖǘǚǜ]/g, "");
    if (str1 == str2) {
        return 99;
    }
    if (str1.length > str2.length) {
        var muzi = str2;
        var instr = str1;
    } else {
        muzi = str1;
        instr = str2;
    }
    let reg = "/[" + muzi + "]{1}/g";
    let resu = instr.match(eval(reg));
    if (resu) {
        return (resu.length / instr.length);
    } else {
        return 0;
    }
}



// 屏幕宽高、方向初始化
function init_wh() {
    fInfo("屏幕方向检测");
    log(device.width + "*" + device.height);
    var device_w = depth(0).findOne().bounds().width();
    var device_h = depth(0).findOne().bounds().height();
    log(device_w + "*" + device_h);
    if (device.width == device_h && device.height == device_w) {
        fError("设备屏幕方向检测为横向，后续运行很可能会报错，建议调整后重新运行脚本");
        sleep(10000);
    } else if (device.width == 0 || device.height == 0) {
        fError("识别不出设备宽高，建议重启强国助手后重新运行脚本");
        sleep(10000);
    }
    return [device_w, device_h]
}

// 尝试成功点击
function real_click(obj) {
    for (let i = 1; i <= 3; i++) {
        if (obj.click()) {
            log("real click: true");
            return true;
        }
        sleep(300);
    }
    console.warn("控件无法正常点击：", obj);
    log("尝试再次点击");
    click(obj.bounds().centerX(), obj.bounds().centerY());
    return false;
}

// 测试ocr功能
function ocr_test() {
    if (Number(ocr_maxtime)) {
        var test_limit = Number(ocr_maxtime);
    } else {
        var test_limit = 5000;
    }
    try {
        fInfo("测试ocr功能，开始截图");
        let img_test = captureScreen();
        img_test = images.clip(img_test, 0, 100, device_w, 250);
        log("开始识别");
        //console.time("OCR识别结束");
        let begin = new Date();
        let test_txt = paddle_ocr_api(img_test);

        //console.timeEnd("OCR识别结束");
        let end = new Date();
        let test_time = end - begin;
        fInfo("OCR识别结束:" + test_time + "ms");
        if (test_time > test_limit) {
            fError("OCR识别过慢(>" + test_limit + "ms)，已跳过多人对战，可在配置中设置跳过阈值");
            fError("如偶然变慢，可能为无障碍服务抽风，建议重启强国助手后重试");
            sleep(3000);
            return false
        } else {
            fInfo("OCR功能正常");
            img_test.recycle();
            return true;
        }
    } catch (e) {
        fError(e + "：ocr功能异常，退出脚本");
        exit();
        return false;
    }
}


// 强行退出应用名称
function exit_app(name) {
    // fClear();
    fInfo("尝试结束" + name + "APP");
    var packageName = getPackageName(name);
    if (!packageName) {
        if (getAppName(name)) {
            packageName = name;
        } else {
            return false;
        }
    }
    log("打开应用设置界面");
    app.openAppSetting(packageName);
    var appName = app.getAppName(packageName);
    //log(appName);
    log("等待加载界面")
    //textMatches(/应用信息|应用详情/).findOne(5000);
    text(appName).findOne(5000);
    sleep(1500);
    log("查找结束按钮")
    //let stop = textMatches(/(^强行.*|.*停止$|^结束.*)/).packageNameMatches(/.*settings.*|.*securitycenter.*/).findOne();
    let stop = textMatches(/(强.停止$|.*停止$|结束运行|停止运行|[Ff][Oo][Rr][Cc][Ee] [Ss][Tt][Oo][Pp])/).findOne(5000);
    log("stop:", stop.enabled())
    if (stop.enabled()) {
        //log("click:", stop.click());
        real_click(stop);
        sleep(1000);
        log("等待确认弹框")
        //let sure = textMatches(/(确定|^强行.*|.*停止$)/).packageNameMatches(/.*settings.*|.*securitycenter.*/).clickable().findOne();
        let sure = textMatches(/(确定|.*停止.*|[Ff][Oo][Rr][Cc][Ee] [Ss][Tt][Oo][Pp]|O[Kk])/).clickable().findOne(1500);
        if (!sure) {
            fInfo(appName + "应用已关闭");
            back();
            return false;
        }
        log("sure click:", sure.click());
        fInfo(appName + "应用已被关闭");
        sleep(1000);
        back();
    } else {
        fInfo(appName + "应用不能被正常关闭或不在后台运行");
        sleep(1000);
        back();
    }
    return true;
}





/*******************悬浮窗*******************/
function fInit() {
    // ScrollView下只能有一个子布局
    var w = floaty.rawWindow(
        `<card cardCornerRadius='8dp' alpha="0.8">
            <vertical>
                <horizontal bg='#FF000000' padding='10 5'>
                    <text id='version' textColor="#FFFFFF" textSize="18dip">四人赛跑题库+</text>
                    <text id='title' h="*" textColor="#FFFFFF" textSize="13dip" layout_weight="1" gravity="top|right"></text>
                </horizontal>
                <ScrollView>
                    <vertical bg='#AA000000' id='container' minHeight='20' gravity='center'></vertical>
                </ScrollView>
            </vertical>
            <relative gravity="right|bottom">
                <text id="username" textColor="#FFFFFF" textSize="12dip" padding='5 0'></text>
            </relative>
        </card>`
    );
    ui.run(function () {
        //w.title.setFocusable(true);
        w.version.setText("四人赛刷题助手");
    });
    w.setSize(720, -2);
    w.setPosition(10, 10);
    w.setTouchable(false);
    return w;
}

function fSet(id, txt) {
    ui.run(function () {
        w.findView(id).setText(txt);
    });
}

function fInfo(str) {
    ui.run(function () {
        let textView = ui.inflate(`<text id="info" maxLines="2" textColor="#7CFC00" textSize="15dip" padding='5 0'></text>`, w.container);
        textView.setText(str.toString());
        w.container.addView(textView);
    });
    console.info(str);
}

function fError(str) {
    ui.run(function () {
        let textView = ui.inflate(`<text id="error" maxLines="2" textColor="#FF0000" textSize="15dip" padding='5 0'></text>`, w.container);
        textView.setText(str.toString());
        w.container.addView(textView);
    });
    console.error(str);
}

function fTips(str) {
    ui.run(function () {
        let textView = ui.inflate(`<text id="tips" maxLines="2" textColor="#FFFF00" textSize="15dip" padding='5 0'></text>`, w.container);
        textView.setText(str.toString());
        w.container.addView(textView);
    });
    console.info(str);
}

function fClear() {
    ui.run(function () {
        w.container.removeAllViews();
    });
}

function fRefocus() {
    threads.start(function () {
        ui.run(function () {
            w.requestFocus();
            w.title.requestFocus();
            ui.post(function () {
                w.title.clearFocus();
                w.disableFocus();
            }, 200);
        });
    });
    sleep(500);
}

// //Google OCR配置函数
// function google_ocr_api(img) {
//     console.log('GoogleMLKit文字识别中');
//     let list = googleOcr.detect(img); // 识别文字，并得到results
//     let eps = 30; // 坐标误差
//     for (
//         var i = 0; i < list.length; i++ // 选择排序对上下排序,复杂度O(N²)但一般list的长度较短只需几十次运算
//     ) {
//         for (var j = i + 1; j < list.length; j++) {
//             if (list[i]['bounds']['bottom'] > list[j]['bounds']['bottom']) {
//                 var tmp = list[i];
//                 list[i] = list[j];
//                 list[j] = tmp;
//             }
//         }
//     }

//     for (
//         var i = 0; i < list.length; i++ // 在上下排序完成后，进行左右排序
//     ) {
//         for (var j = i + 1; j < list.length; j++) {
//             // 由于上下坐标并不绝对，采用误差eps
//             if (
//                 Math.abs(list[i]['bounds']['bottom'] - list[j]['bounds']['bottom']) <
//                 eps &&
//                 list[i]['bounds']['left'] > list[j]['bounds']['left']
//             ) {
//                 var tmp = list[i];
//                 list[i] = list[j];
//                 list[j] = tmp;
//             }
//         }
//     }
//     let res = '';
//     for (var i = 0; i < list.length; i++) {
//         res += list[i]['text'];
//     }
//     list = null;
//     return res;
// }

//Paddle OCR配置函数
function paddle_ocr_api(img) {
    console.log('PaddleOcr文字识别中');
    let list = paddleOcr.detect(img); // 识别文字，并得到results
    let eps = 30; // 坐标误差
    for (
        var i = 0; i < list.length; i++ // 选择排序对上下排序,复杂度O(N²)但一般list的长度较短只需几十次运算
    ) {
        for (var j = i + 1; j < list.length; j++) {
            if (list[i]['bounds']['bottom'] > list[j]['bounds']['bottom']) {
                var tmp = list[i];
                list[i] = list[j];
                list[j] = tmp;
            }
        }
    }

    for (
        var i = 0; i < list.length; i++ // 在上下排序完成后，进行左右排序
    ) {
        for (var j = i + 1; j < list.length; j++) {
            // 由于上下坐标并不绝对，采用误差eps
            if (
                Math.abs(list[i]['bounds']['bottom'] - list[j]['bounds']['bottom']) <
                eps &&
                list[i]['bounds']['left'] > list[j]['bounds']['left']
            ) {
                var tmp = list[i];
                list[i] = list[j];
                list[j] = tmp;
            }
        }
    }
    let res = '';
    for (var i = 0; i < list.length; i++) {
        res += list[i]['text'];
    }
    list = null;
    return res;
}
//识字点击
function clicktext(wenzi) {
    let img = captureScreen();
    utils.regionalClickText2(img, 0, 0, device_w, device_h, 60, 255, wenzi, false, false, () => { toastLog("找到文字" + "“" + wenzi + "”") });
    utils.recycleNull(img);
    return true
}
//更新题库
function post_answer_to_json(question, answers, true_ans, right_xuan, ans_flag) {
    // 发送题目到Json更新答案
    question = question.replace(/ /g, "");
    var key = join_answers_with_true(answers, true_ans, right_xuan, ans_flag);
    // console.log(key);
    globalTiku[question] = key;
    files.write(save_path, JSON.stringify(globalTiku))
    return true
}
//连接题目和答案
function join_answers_with_true(answers, true_ans, right_xuan, ans_flag) {
    var key = answers + "，" + true_ans + "，" + "最终:" + right_xuan + "，" + ans_flag;
    return key
}

//检测是否达到今日最大答题次数
function hint_veri() {
    sleep(500);
    if (text("温馨提示").exists()) {
        // let tishi = confirm("今日四人赛答题次数已用完,点击“确定”，退出刷题助手");
        // if (tishi) {
        //     alert("已退出!");
        sleep(2000);
        finish();//结束刷题
        //     }
    }
}

//保存图片img
function imgSave(img){
    let jingmiao = new Date().toISOString().slice(0, 19).replace(/[-:]/g, "");
    let imgname = `${jingmiao}`;
    images.save(img, pathname + "/" + imgname + ".jpg", "jpg", 60);
    toastLog("截图已保存");
}
