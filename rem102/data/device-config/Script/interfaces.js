/*	Main JQuery Function
	Author: Gianluca Maimeri
	Version: 1.0
	applicability: interfaces.html
----------------------------------------------------- */
	
/*	Funzione JQuery che viene eseguita 
	quando il documento � caricato.
	Se esiste l'input query esegue la cgi.
----------------------------------------------------- */
$(document).ready(function(){
	var cyc = parseInt(urlParam('cyclicTime'),10);
	$("caption").text(unescape(urlParam('label')));
	eseguiAjax(urlParam('cgi'),urlParam('query'), LoadTable, null, true);
	$("#tabella_interfaces").fadeIn( "slow" );
	if (cyc>0){		
		setInterval(function() {
			eseguiAjax(urlParam('cgi'),urlParam('query'), LoadTable, null, false);
		},cyc);
	}
});



var LoadTable = function (data) {
	$.each(data, function(i, item) {
		var cel1Color = NERO;
		var cel2Color = NERO;
		switch (item.value.toLowerCase()){
			case "enabled":
				if (item.options.toLowerCase() == "up")
					cel2Color = VERDE;
				else
					cel2Color = ROSSO;				
			break;
			case "disabled":			
				cel1Color = GRIGIO;
				cel2Color = GRIGIO;
				break;
		}
		
		$("tbody").append(
			$('<tr>').append(
				$('<th>').attr('title', item.label).attr('id', 'lab_'+item.tag).text(item.label)
			).append(
				$('<td>').append($("<span>").attr('title', item.label).css('color', cel1Color).text(item.value)).attr('id', 'td_'+item.tag)
			).append(
				$('<td>').append($("<span>").attr('title', item.label).css('color', cel2Color).text(item.options)).attr('id', 'td_'+item.tag)
			)
		);
	});
}