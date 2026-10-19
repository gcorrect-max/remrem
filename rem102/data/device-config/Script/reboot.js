/*	Main JQuery Function
	Author: Gianluca Maimeri
	Version: 1.0
	applicability: rtc.html
----------------------------------------------------- */
	
/*	Funzione JQuery che viene eseguita 
	quando il documento è caricato.
	Se esiste l'input query esegue la cgi.
----------------------------------------------------- */
$(document).ready(function(){
	$("#Iframe_reboot_container h1").first().text(unescape(urlParam('label')));
});

function redirect(page){
	window.top.$("body").append("<div id=\"overlaydiv\" class=\"ui-widget-overlay ui-front\"><div id=\"wait\"></div></div>");									 
	window.top.$('#wait').css({width:'200px',height:'100px',color:'white',margin:'0 auto',}).center();
	var msg =""; var btn = ""; var tit = "";  var col = "";
	col=  "#ff920a";
	tit = "Reboot Request!";
	msg = "Are You sure to execute the reboot of the device?";
	btn = { "Yes": function() { window.top.$("#dialog").dialog("destroy"); $(top.location).attr('href',page);},
			"No" : function() { window.top.$("#overlaydiv").remove(); window.top.$("#dialog").dialog("destroy"); window.location.reload();}};
	window.top.$("#overlaydiv").remove();
	openDialog(tit, msg, col, btn );	
}