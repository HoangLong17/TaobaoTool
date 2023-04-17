import {getIds}  from "./utils.js";

$("#idSubmit").click(submitId);
$("#submitMailNoButton").click(findMailNo);


function findMailNo(){
    var txt = $("#insertMailNo").val();
    chrome.runtime.sendMessage({command: "find item", data: txt});
}

function submitId(){
    chrome.tabs.query({ active: true, lastFocusedWindow: true }).then( (tabs) => {
        var from = $("#fromId").val();
        var to = $("#toId").val();
        chrome.scripting.executeScript({
            args: [from, to],
            target: {
                tabId: tabs[0].id,
            },
            func: getIds,
        });
    });
}
