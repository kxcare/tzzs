auto.waitFor();
events.observeToast();//开启 Toast 监听，Toast 监听依赖于无障碍服务，因此此函数会确保无障碍服务运行
// auto.setMode("fast");//该模式下会启用控件缓存，从而选择器获取屏幕控件更快
/*
    @author: mondayfirst
    @github: https://github.com/mondayfirst/XXQG_TiKu
    @description: 本脚本可在Auto.js上执行。
*/
var w = fInit();
fInfo("挑战助手" + "脚本初始化");
var [device_w, device_h] = init_wh();//init_wh()是返回设备宽和高的函数


// =====================参数设置====================
var query_mode = "Json"; // 服务器答案查找模式，二选一："Server" or "Json" 
var 挑战答题索引 = "000001000000000000002010" // 挑战答题部分ui相对根节点的嵌套位置索引
var tk_path = "/sdcard/脚本/题库_排序版.json" // 本地题库路径
var tk_path_new = "/sdcard/脚本/新题库_排序版.json" // 重跑的新题库路径
var ct_path = "/sdcard/脚本/错题.json"

var imagetext_true = "AAAABJRU5ErkJggg=="// 答题正确时Image控件文本
var imagetext_false = "AAAAASUVORK5CYII=" // 答题错误时Image控件文本
// 定义日志文件的路径
var logFilePath = "/sdcard/脚本/挑战答题运行日志.txt";
// 创建日志文件
if (files.isFile(logFilePath)) {
    console.log("存在日志文件");
}
else {
    console.log("没有日志文件，将写新文件输出");
    files.create(logFilePath);
}
var re_log = "";

var start_wait_time = 10000 // 每轮答题最低时长，单位是毫秒
var re_times = 0;
// =====================读取自定义配置====================
var STZS_CONFIG = storages.create("STZS_CONFIG");
var cycle_wait_time = STZS_CONFIG.get("cycle_wait_time", "1100");
var chongzhi_cishu = STZS_CONFIG.get("chongzhi_cishu", "10");

// ================================================
// =====================主程序运行====================
// ================================================
// 判断是否是隐私模式版本，新版本为隐私模式不可截屏，2.33版本可截屏
// var isPrivateMode = version1GreaterVersion2(getVersion("cn.xuexi.android"), privateModeStartVersion)
// 其它全局变量定义
var globalAnswerRunning = false;
var globalLastdate = new Date().getTime();
var globalIsObjFrame = false;
var falseNum = 0;


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

// 初始化opencv
runtime.images.initOpenCvIfNeeded();

var thread_handling_access_exceptions = handling_access_exceptions();
var thread_handling_submit_exceptions = handling_submit_exceptions();

if (query_mode == "Json") {
    // 本地Json答案查找模式
    if (files.isFile(tk_path))
        var globalTiku = JSON.parse(json_str = files.read(tk_path));
    else {
        console.log("没有目标题库文件，将写新文件输出")
        var globalTiku = {}
    }
    if (files.isFile(ct_path))
        var ErrorTiku = JSON.parse(json_str2 = files.read(ct_path));
    else {
        console.log("没有目标题库文件，将写新文件输出")
        var ErrorTiku = {}
    }
    //重新跑题库
    // if (files.isFile(tk_path_new))
    //     var NewTiku = JSON.parse(json_str3 = files.read(tk_path_new));
    // else {
    //     console.log("没有目标题库文件，将写新文件输出")
    //     var NewTiku = {}
    // }
    var get_answer = get_answer_from_json
    var post_answer = post_answer_to_json
}
else {
    console.log("未选择题目答案的查找模式!退出中...")
    exit()
}

// =====================程序执行阶段====================
// 循环运行
console.log("开始循环答题");
fClear();
fInfo("错题：" + falseNum);
while (true) {
    //is_logExist();//判断日志文件是否存在
    // 获取根节点
    //globalIsObjFrame = false    
    //更改depth为24，尝试修复不检测答题失败情况
    if (!className("android.widget.Image").depth(24).textMatches(/\S+/).exists()) {
        sleep(100)
        var obj_node = get_ui_obj_from_posstr(挑战答题索引)
        if (obj_node == null) {
            console.log("找不到挑战答题索引")
            sleep(random_time(1000))
            continue
        }

        // 获取目标控件和文本
        var q_ui = get_ui_question_from_obj_node(obj_node);
        try {
            var a_uis = get_ui_answsers_from_obj_node(obj_node);
        } catch (e) {
            logWrite("获取不到答案控件，返回继续循环");
            sleep(random_time(1000))
            continue
        }
        var question = q_ui.text();
        var answers = [];
        for (var i = 0; i < a_uis.length; i++) {
            answers.push(a_uis[i].text())
        }
        console.log(join_question_with_answer(question, answers)) // 显示拼接后的键
        // 滑动窗口
        swipe_to_view_the_last_answer(a_uis); // 滑动窗口来显示最后一个答案
        // 点击答案
        var true_answer_index = get_answer(question, answers);
        console.log("开始点击");
        if (true_answer_index >= 0) {
            let click_value = click_answer_radio_button(a_uis, question, answers, true_answer_index, false, obj_node);
            //尝试修复旧机子因识别不到正确错误标识卡退
            if (click_value) {
                sleep(6000);
                continue;
            }
            console.log("题库已收录此题目");
        } else {
            // 如果没有查找到答案，就随机一个选项来点击，如果是非隐私模式，截屏查找正确答案，否则选项正确才更新答案
            click_answer_radio_button(a_uis, question, answers, random(0, a_uis.length - 1), true, obj_node);
            console.error('新题目已更新到题库');
            falseNum++;
            fSet("info", "错题：" + falseNum);
            sleep(2000);
        }
    }

    //显示已答题数
    try {
        if (textStartsWith("连续答对").exists()) {
            let lx_true = textStartsWith("连续答对").findOne(2000).text();
            console.info(lx_true);
        }
    } catch (error) {
        console.error("显示题数报错" + error);
    }

    sleep(cycle_wait_time);
    // 处理答题失败和50题选项
    //console.log("处理答题失败和50题选项");
    if (jump_tips_50TrueQuestions() || jump_tips_ErrorAnswer()) {
        sleep(2000)
    }
    if (textContains("全部通关").exists()) {
        is_logExist();//判断日志文件是否存在
        sleep(3000);
        console.log("完成任务截屏：" + auto.service.performGlobalAction(9));
        is_logExist();//判断日志文件是否存在
        finish();
        break
    }

}
is_logExist();//判断日志文件是否存在
exit();
// ================================================
// =======================函数======================
// =====================操作函数====================
function jump_tips_ErrorAnswer() {
    //console.log("开始检测答题失败");
    if (text("结束本局").exists()) {
        sleep(3000);
        if (text("立即复活").exists()) {
            sleep(2000);
            console.log("点击立即复活：" + text("立即复活").findOne().click());
            sleep(2000);
        } else {
            var nowdate = new Date().getTime();
            console.log((nowdate - globalLastdate))
            console.log(start_wait_time)
            if ((nowdate - globalLastdate) < start_wait_time) {
                toastLog("等待" + (start_wait_time + (globalLastdate - nowdate)) + "毫秒")
                sleep(random_time(start_wait_time + (globalLastdate - nowdate)))
            }
            text("结束本局").findOne().click();
            sleep(2000);
            console.log("点击再来一局：" + text("再来一局").findOne().click())
        }
        console.log("处理完结束本局提示")
        return true;
    } else if (text("challenge.66a1baf9").exists() || text("finish.7e0c026a").exists() || text("exceed.c9fe4914").exists()) {
        sleep(3000);
        text("再来一局").findOne().click();
        console.log("处理完代码存在提示");
        return true;
    }
    console.log("未检测到答题失败");
    return false;
}
function jump_tips_50TrueQuestions() {
    //console.log("开始检测50题选项");
    if (text("结束本局").exists() && text("continue.d28dbd3b").exists()) {
        sleep(2000);
        text("继续").findOne(3000).click()
        console.log("50题提示已执行通过");
        return true;
    }
    //console.log("没有出现50题提示");
    return false;
}
function swipe_to_view_the_last_answer(answer_uis) {
    var length = answer_uis.length
    var flag = false
    if (length <= 1) {
        return null
    }
    for (var i = 0; i < 10; i++) {
        flag = answer_uis[length - 1].bounds().bottom == answer_uis[length - 1].bounds().top
        if (flag) {
            // 滑动参数，当题目与答案较长时，需要滑动屏幕让最后一个答案显露出来。
            swipe(answer_uis[0].bounds().left, parseInt(device.height / 2), answer_uis[0].bounds().left, parseInt(device.height * 4 / 5), 500)
            sleep(random_time(0))
        }
        else {
            break
        }
    }
}
function click_answer_radio_button(answer_uis, question, answers, idx, isMustPost, obj_node) {
    answer_uis[idx].parent().click();
    var ansb = obj_node.child(1).bounds();
    var answers_region = [ansb.left, ansb.top, ansb.width(), ansb.height()]
    sleep(266);
    if (textEndsWith(imagetext_true).exists()) {
        console.log("点击正确");
        // 点击正确，视参数来更新答案
        var true_ans = answers[idx]
        console.log("正确答案是：" + true_ans);
        //更新到新题库
        // post_answer_to_newjson(question, answers, true_ans);
        if (isMustPost) {
            post_answer(question, answers, true_ans);
        }
    } else if (textEndsWith(imagetext_false).exists()) {
        console.log("点击错误");
        // 点击错误，立刻截图更新答案
        var true_ans = find_true_answer_from_img(answer_uis, answers_region);
        post_answer(question, answers, true_ans);
        sleep(2000);
    } else {
        //尝试修复旧机器卡退
        if (re_times < chongzhi_cishu) {
            re_times++;
            console.error("尝试修复第" + re_times + "次");
            logWrite("尝试修复第" + re_times + "次")
            return true;
        } else {
            console.error("Error:正确、错误image控件文本可能已经更换");
            exit();
        }
    }
    return false//增加返回，点击正常就不执行continue
}

function handling_submit_exceptions() {
    var thread_handling_submit_exceptions = threads.start(function () {
        while (true) {
            // console.log("检测网络开小差");
            // textStartsWith("网络开小差").waitFor();
            if (textStartsWith("网络开小差").exists()) {
                sleep(1000);
                console.log("网络开小差");
                text("确定").findOne().click();
                sleep(2000);
                while (true) {
                    let ztk_click = textStartsWith("total").findOne(3000).click();
                    console.log("点击强国总题库：" + ztk_click);
                    if (tz_click) {
                        break
                    } else {
                        console.log("找不到强国总体库按钮，点击挑战答题");
                        let tz_click = textStartsWith("challenge").findOne(3000).click();
                        console.log("点击挑战答题：" + tz_click);
                    }
                }
                logWrite("网络开小差已跳过");
                sleep(random_time(6000));
            }
            // throw "网络开小差"
            // sleep(1000);
            // console.log("网络开小差");
            // text("确定").findOne().click();
            // sleep(2000);
            // let ztk_click = text("total.88d389ee").findOne().click();
            // console.log("点击强国总题库：" + ztk_click)
            // sleep(random_time(2000));
        }
    });
    return thread_handling_submit_exceptions;
}

function handling_access_exceptions() {
    /**
     * 处理访问异常
     * 该函数来源：https://github.com/dundunnp/auto_xuexiqiangguo
     */
    // 在子线程执行的定时器，如果不用子线程，则无法获取弹出页面的控件
    var thread_handling_access_exceptions = threads.start(function () {
        while (true) {
            textContains("访问异常").waitFor();
            // 滑动按钮">>"位置
            idContains("nc_1_n1t").waitFor();
            var bound = idContains("nc_1_n1t").findOne().bounds();
            // 滑动边框位置
            text("向右滑动验证").waitFor();
            var slider_bound = text("向右滑动验证").findOne().bounds();
            // 通过更复杂的手势验证（先右后左再右）
            var x_start = bound.centerX();
            var dx = x_start - slider_bound.left;
            var x_end = slider_bound.right - dx;
            var x_mid = (x_end - x_start) * random(5, 8) / 10 + x_start;
            var back_x = (x_end - x_start) * random(2, 3) / 10;
            var y_start = random(bound.top, bound.bottom);
            var y_end = random(bound.top, bound.bottom);
            x_start = random(x_start - 7, x_start);
            x_end = random(x_end, x_end + 10);
            gesture(random_time(0), [x_start, y_start], [x_mid, y_end], [x_mid - back_x, y_start], [x_end, y_end]);
            sleep(random_time(0));
            if (textContains("刷新").exists()) {
                click("刷新");
                continue;
            }
            if (textContains("网络开小差").exists()) {
                click("确定");
                continue;
            }
            // 执行脚本只需通过一次验证即可，防止占用资源
            // break;
        }
    });
    return thread_handling_access_exceptions;
}
// =====================通用函数====================
function random_time(time) {
    return time + random(100, 1000);
}
function get_root_node(root_node_classname) {
    // 获取框架的根节点，假设根节点类名为FrameLayout
    obj = className(root_node_classname).findOne()
    while (true) {
        if (obj.parent() == null) {
            break
        } else {
            obj = obj.parent()
        }
    }
    return obj
}
function is_child_ui_existed(root_node, seq_str) {
    // 根据相对位置嵌套索引，判断目标子节点是否存在，同时obj变为目标子节点
    if (!root_node)
        return false
    obj = root_node
    try {
        for (var i = 0; i < seq_str.length; i++) {
            childUIs = obj.children()
            index = parseInt(seq_str[i])
            if (childUIs.length > index)
                obj = childUIs[index]
            else
                return false
        }
    }
    catch (err) {
        console.log(err.description)
        return false
    }
    return true
}


// =====================脚本函数====================
function get_ui_obj_from_posstr(seq_str) {
    // 根据相对位置嵌套索引，从根节点向下寻找目标子节点
    obj = get_root_node("FrameLayout")
    if (!is_child_ui_existed(obj, seq_str))
        return null
    return obj
}

function get_ui_question_from_obj_node(obj_node) {
    // 从目标节点根据相对位置获取题目文本所在的节点
    return obj_node.child(0)
}

function get_ui_answsers_from_obj_node(obj_node) {
    // 从目标节点根据相对位置获取答案文本所在的节点
    a_parent_uis = obj_node.child(1).children()
    a_uis = new Array()
    for (var i = 0; i < a_parent_uis.length; i++) {
        a_uis.push(obj_node.child(1).child(i).child(0).child(1))
    }
    return a_uis
}

function find_true_answer_from_img(Nodes, region) {
    // 截图并从图片中根据答案的颜色寻找正确的答案选项，输出答案的文本
    var img = images.captureScreen();
    var point = images.findColor(img, '#3dbf75', {
        // 目的是防止找到倒计时的绿色进度条
        region: region,
        threshold: 4
    });
    if (point == null) {
        images.save(img, "/sdcard/2.jpg");
        console.log("Error:未找到正确答案！截屏失效(手动更改隐私模式参数)或颜色错误")
        throw "Error:未找到正确答案！截屏失效(手动更改隐私模式参数)或颜色错误"
    }
    img.recycle();
    var true_ans = null
    var x = point.x
    var y = point.y
    for (var i = 0; i < Nodes.length; i++) {
        var a = Nodes[i].bounds()
        if (y >= a.top && y <= a.bottom) {
            true_ans = Nodes[i].text();
            break;
        }
    }
    if (true_ans == null) {
        console.log("Error:未找到答案！")
        throw "Error:未找到答案！"
    }
    return true_ans
}
function join_question_with_answer(question, answers) {
    question = question.replace(/ /g, "")
    var sort_answers = ([].concat(answers)).sort()
    var key = ([question].concat(sort_answers)).join("|")
    return key
}
//格式化时间
function dateFormat(thisDate, fmt) {
    var o = {
        "M+": thisDate.getMonth() + 1,
        "d+": thisDate.getDate(),
        "h+": thisDate.getHours(),
        "m+": thisDate.getMinutes(),
        "s+": thisDate.getSeconds(),
        "q+": Math.floor((thisDate.getMonth() + 3) / 3),
        "S": thisDate.getMilliseconds()
    };
    if (/(y+)/.test(fmt))
        fmt = fmt.replace(RegExp.$1, (thisDate.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt))
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}
// =====================题库函数====================

/////////////////通过本地json获取答案
function post_answer_to_json(question, answers, true_ans) {
    // 发送题目到Json更新答案
    var key = join_question_with_answer(question, answers)
    globalTiku[key] = true_ans;
    files.write(tk_path, JSON.stringify(globalTiku));
    ErrorTiku[key] = true_ans;
    files.write(ct_path, JSON.stringify(ErrorTiku));

}
//更新到新题库代码
function post_answer_to_newjson(question, answers, true_ans) {
    // 发送题目到Json更新答案
    var key = join_question_with_answer(question, answers)
    NewTiku[key] = true_ans;
    files.write(tk_path_new, JSON.stringify(NewTiku));
}
function get_answer_from_json(question, answers) {
    // 从Json获取正确答案，本地检索正确答案的索引并输出
    if (!globalTiku)
        console.log("ERROR:没有题库文件")
    var true_index = -1
    var key = join_question_with_answer(question, answers)
    var true_ans = globalTiku[key]
    for (var i = 0; i < answers.length; i++) {
        if (true_ans == answers[i]) {
            true_index = i
            break
        }
    }
    return true_index
}

//结束后配置
function finish() {
    sleep(6000);
    home();
    sleep(5000);
    text("文件管理").findOne().click();
    sleep(4000);
    text("我的手机").findOne().parent().parent().parent().parent().parent().click();
    sleep(5000);
    text("脚本").findOne().parent().parent().parent().click();
    sleep(5000);
    text("题库_排序版.json").findOne().parent().parent().parent().click();
    sleep(5000);
    // text("分享").findOne().click();
    // sleep(5000);
    // text("发送给好友").findOne().parent().click();
    // sleep(5000);
    text("其他").findOne().click();
    sleep(5000);
    text("发送给好友").findOne().parent().parent().click();
    sleep(5000);
    text("既雨晴亦佳").findOne().parent().parent().click();
    sleep(5000);
    text("发送").findOne().click();
    sleep(5000);
    home();
    sleep(2000);
    auto.service.performGlobalAction(8);//锁屏
}

//日志写到文件
function logWrite(logContent) {
    let currentTime = dateFormat(new Date(), 'yyyy年MM月dd日 hh:mm:ss'); // 获取当前时间
    re_log = currentTime + "   " + logContent; // 日志信息
    // 写入日志
    files.append(logFilePath, re_log + "\n");
}

//检测日志文件是否存在
function is_logExist() {
    if (files.isFile(logFilePath)) {
        console.info("存在日志文件");
    } else {
        console.error("日志文件已被删除")
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

/*******************悬浮窗*******************/
function fInit() {
    // ScrollView下只能有一个子布局
    var w = floaty.rawWindow(
        `<card cardCornerRadius='8dp' alpha="0.8">
            <vertical>
                <horizontal bg='#FF000000' padding='10 5'>
                    <text id='version' textColor="#FFFFFF" textSize="18dip">挑战刷题库+</text>
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
        w.version.setText("挑战刷题");
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