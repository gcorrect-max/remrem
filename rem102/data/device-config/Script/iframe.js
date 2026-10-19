/*	Main JQuery Function
	Author: Gianluca Maimeri
	Version: 1.0
	applicability: default.html, eth.html 
----------------------------------------------------- */
	
/*	Funzione JQuery che viene eseguita 
	quando il documento è caricato.
	Se esiste l'input query esegue la cgi.
----------------------------------------------------- */
$(document).ready(function(){
	var cyc = parseInt(urlParam('cyclicTime'),10);
	$("caption").text(unescape(urlParam('label')));
	
	var url = $.trim($(location).attr('pathname'));	
	var cgi = urlParam('cgi');
	var queryR = urlParam('query') != null ? urlParam('query').replace(/\~/g, '&'):"";
	
	switch (url)
	{
		case "/default.html":
		case "/position.html":
			if (urlParam("ro") === 'true')
				eseguiAjax(cgi, queryR, buildTableRO,null, true);
			else{
                $("#loading-img").fadeIn(1000);
                $("#setData").hide();

				eseguiAjax(cgi, queryR, buildTable,null, true);

				var set = urlParam('set') != null ? urlParam('set') : "";
				if (set != ""){
					$("form#setData").attr('action', cgi);
					$("#foot").append("<input type=\"hidden\" name=\"rulefile\" value=\""+urlParam('rules')+"\" >");
										
				
					if (set != null){
						var q = set.split('~');
						for (var qi=0;qi < q.length; qi++){
							var query = q[qi].split('=');					
							$("#foot").append("<input type=\"hidden\" name=\""+query[0]+"\" value=\""+query[1]+"\" >");
						}
						var reboot = urlParam('reboot');						
						if (reboot != ""){
							$("#foot").append("<input type=\"hidden\" id=\"reboot\" value=\""+reboot+"\" >");
						}
						
						$("#foot").append("<input type=\"submit\" value=\"Set Values\" >");
						
						var redir = unescape(urlParam('label'));
						if (urlParam('tag') != undefined && urlParam('tag') != "" && urlParam('tag') != null)
							redir = unescape(urlParam('tag'));
						$( "form" ).submit( function(event){submitFunc(event, redir); return false;});
					}
				}
			}
		break;
		case "/setdefault.html":
			var set = urlParam('set') != null ? urlParam('set'):"";
			if (set != ""){
				$("form#setData").attr('action', cgi);
				$("#foot").append("<input type=\"hidden\" name=\"rulefile\" value=\""+urlParam('rules')+"\" >");
			
				if (set != null){
					var q = set.split('~');
					for (var qi=0;qi < q.length; qi++){
						var query = q[qi].split('=');					
						$("#foot").append("<input type=\"hidden\" name=\""+query[0]+"\" value=\""+query[1]+"\" >");
					}
					/*var query = set.split('=');					
					$("#foot").append("<input type=\"hidden\" name=\""+query[0]+"\" value=\""+query[1]+"\" >");*/
					var reboot = urlParam('reboot');						
					if (reboot != ""){
						$("#foot").append("<input type=\"hidden\" id=\"reboot\" value=\""+reboot+"\" >");
					}
					$("#foot").append("<input type=\"submit\" value=\"Restore Configuration\" >");
					var redir = unescape(urlParam('label'));
					if (urlParam('tag') != undefined && urlParam('tag') != "" && urlParam('tag') != null)
						redir = unescape(urlParam('tag'));
					
					$( "form" ).submit( function(event){submitFunc(event,redir); return false;});
				}
				else{
					$("#Iframe_container").append($("<p>").html("No set a query in configuration file"));				
				}				
			}
		break;
		default:
			if (urlParam("ro") === 'true')
			eseguiAjax(cgi, queryR, fillSelectRO, null, true);
		else
			eseguiAjax(cgi, queryR, fillSelect, null, true);
		break;
	}
	
	$("#Iframe_container").fadeIn( "slow" );
	if (cyc>0){		
		setInterval(function() {
			if (urlParam("ro") === 'true')
				eseguiAjax(urlParam('cgi'),urlParam('query').replace(/\~/g, '&'), fillSelectRO, null, false);
			else
				eseguiAjax(urlParam('cgi'),urlParam('query').replace(/\~/g, '&'), fillSelect, null, false);
			
		},cyc);
	}
});

