export async function getIds(from, to){
	var from = new Date(from);
	var to = new Date(to);
	from.setHours(0,0,0,0);
	to.setHours(0,0,0,0);
	var dict = {};
	dict["tmall"] = {};
	dict["taobao"] = {};

	var num = $(".pagination ").find("li").last().prev().attr("title");
	const next = $(".pagination-next");
	
	for (let index=0; index<num; index++){ 
		var stop=false;

		$("div").filter(".js-order-container").each(function() {
			// get date of item
			var date = $(this).find(".bought-wrapper-mod__create-time___yNWVS").first().html();
			date = new Date(date);
			date.setHours(0, 0, 0, 0);

			//check whether item's date is valid
			if (date>to){return true;}
			if (date<from){
				stop = true;
				return false;
			}

			// get item 's info
			$(this).find("#viewDetail").each(function() {	
				id = $(this).attr("href").split("=")[1];

				var url = $(this).attr("href");
				url = url.replace("//buyer", "//").replace("//", "https://");

				let data = {"date": date,"url": url};
				if (url.includes("taobao")){
					dict["taobao"][id] = data;
				}
				else if(url.includes("tmall")){
					dict["tmall"][id] = data;
				}
			});
		})
	
		if(stop){break;}
		if(index<num){next.click();}
		await new Promise(resolve => setTimeout(resolve, 3000));
	}
	
	console.log(dict);
	if(stop){
		chrome.runtime.sendMessage({command: 'first step', data: JSON.stringify(dict)});
	}
}