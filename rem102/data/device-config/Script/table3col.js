/*	Main JQuery Function
	Author: Gianluca Maimeri
	Version: 1.0
	applicability: reservation.html
----------------------------------------------------- */
	
/*	Funzione JQuery che viene eseguita 
	quando il documento è caricato.
	Se esiste l'input query esegue la cgi.
----------------------------------------------------- */
$(document).ready(function(){
	var cyc = parseInt(urlParam('cyclicTime'),10);
	$("#Iframe_container h1").first().text(unescape(urlParam('label')));
	eseguiAjax(urlParam('cgi'),urlParam('query'), LoadTable, null, true);
	var cgi = urlParam('cgi');
	var set = urlParam('set');
	if (set != ""){
		$("form#setData").attr('action', cgi);
		$("#foot").append("<input type=\"hidden\" name=\"rulefile\" value=\""+urlParam('rules')+"\" >");
		if (set != null){
			var query = set.split('=');					
			$("#foot").append("<input type=\"hidden\" name=\""+query[0]+"\" value=\""+query[1]+"\" >");
			var reboot = urlParam('reboot');						
			if (reboot != ""){
				$("#foot").append("<input type=\"hidden\" id=\"reboot\" value=\""+reboot+"\" >");
			}
			$("#foot").append("<input type=\"submit\" value=\"Set Values\" >");
			$( "form" ).submit( function(event){submitFunc(event, unescape(urlParam('label'))); return false;});
		}
	}
	
	$("#tabella_reservation").fadeIn( "slow" );
	if (cyc>0){		
		setInterval(function() {
			eseguiAjax(urlParam('cgi'),urlParam('query'), LoadTable, null, false);
		},cyc);
	}
	$("#Iframe_container").fadeIn( "slow" );
});



var LoadTable = function (data) {
	var rowNum = data.length / 3;
	for (var row=0; row< rowNum; row++){
		$("tbody").append(
			$('<tr>').attr('id', 'row'+(("0" + (row)).slice(-2))).append(
				$('<td>').attr('id', 'col00')
			).append(
				$('<td>').attr('id', 'col01')
			).append(
				$('<td>').attr('id', 'col02')
			)
		);
	}
	var commonstyle = "style=\"background-color:transparent\"";
	$.each(data, function(i, item) {
		switch (item.type){
			case "input":
				$('tr#'+item.label+' td#'+item.options).append("<input type=\"text\" name=\""+item.tag+"\" "+commonstyle+" id=\""+item.tag+"\" value=\""+item.value+"\">");
			break;			
			case "text":
				$('tr#'+item.label+' td#'+item.options).text(item.value);
			break;	
		}
			
		
		
	});
}