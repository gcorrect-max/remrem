/*	Main JQuery Function
	Author: Gianluca Maimeri
	Version: 1.0
	applicability: energy.html
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
			case "remshm_10240_480":
			case "remshm_10240_416":
			case "remshm_10240_384":
			case "remshm_10240_512":
				$("#measure tbody").append($("<tr>")
										.append($("<th>").attr('id', 'lab_'+item.tag).text(item.label))
										.append($("<td>").append($("<span>").attr('id', 'span_'+item.tag).css('color', item.color).text(item.value)).attr('id', 'td_'+item.tag).attr("width","50%")));
								   
			break;
			case "remshm_10240_64":
			case "remshm_10240_96":
			case "remshm_10240_128":
			case "remshm_10240_160":
			case "remshm_10240_192":
			case "remshm_10240_224":
				$("#gps tbody").append($("<tr>")
										.append($("<th>").attr('id', 'lab_'+item.tag).text(item.label))
										.append($("<td>").append($("<span>").attr('id', 'span_'+item.tag).css('color', item.color).text(item.value)).attr('id', 'td_'+item.tag).attr("width","50%")));
								   
			break;
			case "remshm_10240_288":
			case "remshm_10240_320":
			case "remshm_10240_352":
				$("#radio tbody").append($("<tr>")
										.append($("<th>").attr('id', 'lab_'+item.tag).text(item.label))
										.append($("<td>").append($("<span>").attr('id', 'span_'+item.tag).css('color', item.color).text(item.value)).attr('id', 'td_'+item.tag).attr("width","50%")));
								   
			break;
			case "remshm_10240_32":
			case "remshm_10240_256":
			case "remshm_10240_448":
			case "remshm_10240_0":
				$("#info tbody").append($("<tr>")
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