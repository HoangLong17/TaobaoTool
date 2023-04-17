chrome.tabs.onUpdated.addListener(handle_open_tabs);

async function get_taobao_mail_no(data)
{   
    var result = data;
    console.log(data);
    var xmlHttp = new XMLHttpRequest();
    for(key in result){
        if ((result[key]["updateTime"] != null && Date.now()-result[key]["updateTime"]<1e8) || result[key]["complete"]) continue;
        var url = result[key]["url"];
        let string = "";
        xmlHttp.open("GET", url, false); // false for synchronous request
        xmlHttp.send(null);
        string = xmlHttp.responseText;
        string = string.split(",");
        let mailNos = [];
        let tag = "";
        for (let i=0; i<string.length; i++){
            if (string[i].includes("logisticsNum") || string[i].includes("invoiceNo")){
                if(string[i].includes("logisticsNum")) tag = "logisticsNum";
                else tag = "invoiceNo";
                let value = string[i].split(":")[1].slice(2,-2);
                if (mailNos.includes(value)){
                    continue;
                }
                mailNos.push(value);
            }
        }
        result[key]["mailNos"] = mailNos;
        if (mailNos.toString() !== [].toString()){
            if(tag=="logisticsNum" && mailNos.toString() !== ['\\u2014'].toString()){
                result[key]["complete"] = true;
                result[key]["updateTime"] = Date.now();
            }
            else{
                result[key]["updateTime"] = Date.now();
            }
        }
        console.log(url);
        console.log(mailNos);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    chrome.runtime.sendMessage({command: 'second step', data: JSON.stringify(result)});
}

async function get_tmall_mail_no(data)
{    
    var result = data;
    console.log(data);
    var xmlHttp = new XMLHttpRequest();
    for(key in result){
        if ((result[key]["updateTime"] != null && Date.now()-result[key]["updateTime"]<1e8) || result[key]["complete"]) continue;
        var url = result[key]["url"];
        xmlHttp.open("GET", url, false); // false for synchronous request
        xmlHttp.send(null);
        string = xmlHttp.responseText;
        string = string.split(",");
        let mailNos = [];
        for (let i=0; i<string.length; i++){
            if (string[i].includes("mailNo")){
                let value = string[i].split(":")[1].slice(1,-1);
                if (mailNos.includes(value)){
                    continue;
                }
                mailNos.push(value);
            }
        }
        result[key]["mailNos"] = mailNos;
        if (mailNos.toString() != [].toString()) {
            result[key]["updateTime"] = Date.now();
        }
        console.log(url);
        console.log(mailNos);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    chrome.runtime.sendMessage({command: 'final step', data: JSON.stringify(result)});
}

function get_item_by_mail_no(mail_no){
    chrome.storage.local.get("taobao", function(data){
        var data_taobao = JSON.parse(data.taobao);
        for (let key in data_taobao){
            if (data_taobao[key]["mailNos"].includes(mail_no)){
                var taobao_url = data_taobao[key]["url"];
                chrome.tabs.create({url: taobao_url});
            }
        }
    });
    chrome.storage.local.get("tmall", function(data){
        var data_tmall = JSON.parse(data.tmall);
        for (let key in data_tmall){
            if (data_tmall[key]["mailNos"].includes(mail_no)){
                var tmall_url = data_tmall[key]["url"];
                chrome.tabs.create({url: tmall_url});
            }
        }
    });
}

function handle_open_tabs(tabId, changeInfo, tab){
    // make sure the status is 'complete' and it's the right tab
    if (tab.url.indexOf("buyertrade") == -1 && tab.url.indexOf("taobao") != -1 &&  changeInfo.status == 'complete') {
        chrome.storage.local.get("taobao", function(res){
            var data = JSON.parse(res.taobao);
            chrome.scripting.executeScript({
                args: [data],
                target: {
                    tabId: tabId,
                },
                func: get_taobao_mail_no,
            });
        }); 
    }
    else if (tab.url.indexOf("tmall") != -1 && changeInfo.status == "complete"){
        chrome.storage.local.get("tmall", function(res){
            var data = JSON.parse(res.tmall);
            chrome.scripting.executeScript({
                args: [data],
                target: {
                    tabId: tabId,
                },
                func: get_tmall_mail_no,
            });
        }); 
    }
}


chrome.runtime.onMessage.addListener((request) => {
    if (request.command === 'first step') {
        var data = request.data;
        data = JSON.parse(data);
        var new_data_taobao = data["taobao"];
        var new_data_tmall = data["tmall"];

        chrome.storage.local.get("taobao", function(data){
            if (data.taobao){
                var old_data_taobao = JSON.parse(data.taobao);
                var data_taobao = {...new_data_taobao, ...old_data_taobao};
                chrome.storage.local.set({taobao: JSON.stringify(data_taobao)});
            }
            else{
                chrome.storage.local.set({taobao: JSON.stringify(new_data_taobao)});
            }
        });

        chrome.storage.local.get("tmall", function(data){
            if (data.tmall){
                var old_data_tmall = JSON.parse(data.tmall);
                var data_tmall = {...new_data_tmall, ...old_data_tmall};
                chrome.storage.local.set({tmall: JSON.stringify(data_tmall)});
            }
            else{
                chrome.storage.local.set({tmall: JSON.stringify(new_data_tmall)});
            }
        });

        if (Object.keys(data["taobao"]).length>0){
            var taobao_url = data["taobao"][Object.keys(data["taobao"])[0]]["url"];
            chrome.tabs.create({url: taobao_url});
        }
    }
    else if (request.command === "second step") {
        var new_data_taobao = JSON.parse(request.data);
        chrome.storage.local.get("taobao", function(data){
            var old_data_taobao = JSON.parse(data.taobao);
            var data_taobao = {...old_data_taobao, ...new_data_taobao};
            chrome.storage.local.set({taobao: JSON.stringify(data_taobao)});
        });
        chrome.storage.local.get("tmall", function(data){
            var data_tmall = JSON.parse(data.tmall);
            if (Object.keys(data_tmall).length>0){
                let tmp = false;
                for(let key in data_tmall){
                    if(!data_tmall[key]["complete"]) tmp=true;
                }
                var tmall_url = data_tmall[Object.keys(data_tmall)[0]]["url"];
                if(tmp) chrome.tabs.create({url: tmall_url});
            }
        });
    }
    else if (request.command === "final step"){
        var new_data_tmall = JSON.parse(request.data);
        chrome.storage.local.get("tmall", function(data){
            var old_data_tmall = JSON.parse(data.tmall);
            var data_tmall = {...old_data_tmall, ...new_data_tmall};
            chrome.storage.local.set({tmall: JSON.stringify(data_tmall)});
        });
    }
    else if (request.command === "find item"){
        var data = request.data;
        get_item_by_mail_no(data);
    }
});

