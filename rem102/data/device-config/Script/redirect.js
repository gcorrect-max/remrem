/*	Main JQuery Function
	Author: Gianluca Maimeri
	Version: 1.0
	applicability: database.html
----------------------------------------------------- */
	
/*	Funzione JQuery che viene eseguita 
	quando il documento è caricato.
	Se esiste l'input query esegue la cgi.
----------------------------------------------------- */
$(document).ready(function(){
	var cyc = parseInt(urlParam('cyclicTime'),10);
	$("#Iframe_container h1").first().text(unescape(urlParam('label')));
	
	
	var cgi = urlParam('cgi');
	var queryR = urlParam('query');
	eseguiAjax(cgi, queryR, buildTable, null, true);
	$("#Iframe_container").fadeIn( "slow" );
		
	if (cyc>0){		
		setInterval(function() {
			eseguiAjax(urlParam('cgi'),urlParam('query'), buildTable, null, false);
		},cyc);
	}			
});

var buildTable = function (data){
	$("tbody").empty();	
	var url = $.trim($(location).attr('hostname'));	
	$.each(data, function(i, item) {		
		switch(item.type.toLowerCase()){			
			case "link":
				$("tbody").append(
					$('<tr>').append(
								$('<td>').attr("align","right").attr("valign","center").css("align","right")
									.append($('<a>').attr("onClick","javascript:window.open('http://"+url+item.value+"', '_blank')")
										.append($("<img>").attr("src","../Images/share.png")))
							).append(
							$('<td>').attr("align","left").attr("valign","center").append(
								$('<p>').append($('<a>').attr("onClick","javascript:window.open('http://"+url+item.value+"', '_blank')").text(item.label))
							)						
						));					
				break;
			}
	});
	
}