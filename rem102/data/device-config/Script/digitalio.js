/*	Main JQuery Function
	Author: Massimo Ischia
	Version: 1.0
	applicability: digitalio.html
----------------------------------------------------- */

/*	Funzione JQuery che viene eseguita 
	quando il documento è caricato.
	Se esiste l'input query esegue la cgi.
----------------------------------------------------- */
$(document).ready(function(){
	var cyc = parseInt(urlParam('cyclicTime'),10);
	$("h1").text(unescape(urlParam('label')));
	
	var queryy = urlParam('query') != null ? urlParam('query').replace(/\~/g, '&') : "";
	
	eseguiAjax(urlParam('cgi'),queryy, CreateTables, null, true);
	$("#measure_container").fadeIn( "slow" );
	if (cyc>0){		
		setInterval(function() {
			eseguiAjax(urlParam('cgi'),queryy, FillTables, null, false);
		},cyc);
	}
});

var CreateTables = function (data){
	$.each(data, function(i, item) {
		switch (item.tag.toLowerCase()){
			case "remshm_13312_0":
			case "remshm_13312_32":
				$("#measure tbody").append($("<tr>")
										.append($("<th>").attr('id', 'lab_'+item.tag).text(item.label))
										.append($("<td>").append($("<span>").attr('id', 'span_'+item.tag).css('color', item.color).text(item.value)).attr('id', 'td_'+item.tag).attr("width","50%")));
								   
			break;
			case "remshm_13312_256":
			case "remshm_13312_288":
			case "remshm_13312_320":
			case "remshm_13312_352":
				$("#gps tbody").append($("<tr>")
										.append($("<th>").attr('id', 'lab_'+item.tag).text(item.label))
										.append($("<td>").append($("<span>").attr('id', 'span_'+item.tag).css('color', item.color).text(item.value)).attr('id', 'td_'+item.tag).attr("width","50%")));
								   
			break;
		}
	});
	LoadAlias();
}

var FillTables = function (data){
	$.each(data, function(i, item) {
		$('#span_'+item.tag).css('color', item.color).text(item.value);		
	});
}