/*	Main JQuery Function
	Author: Gianluca Maimeri
	Version: 1.0
	applicability: advaced.html, change.html, home.html, index.html, monitoring.html, setup.html 
----------------------------------------------------- */

/*	Funzione JQuery che viene eseguita 
	quando il documento è caricato.
	Se esiste l'input query esegue la cgi.
----------------------------------------------------- */
$(document).ready(function(){
	readSettings();
	
	/*	authentication*/
	$('.nav #authentication').click(function(){
		if (!$('#authentication-menu').hasClass('active')){
			$('#authentication-menu').next('#authentication-content').slideToggle();
			$('#authentication-menu').addClass('active');
		}
	});
		
	$('.nav #authentication').mouseleave(function() {
		if ($('#authentication-menu').hasClass('active')){
			$('#authentication-menu').next('#authentication-content').slideToggle();
			$('#authentication-menu').removeClass('active');
		}
	});
	
	$('#formlogin').submit(function(event){LoginFunc(event); return false;});
	$('#formchange').submit(function(event){ChangeFunc(event); return false;});
	
	
});
function showMenu(value){
	var lev = 0;
	if ($.cookie("CGISESSID") !== undefined){
		var cok = $.cookie("CGISESSID").slice(4,5);
		lev = LevelAuth[cok];
	}
		
	if (value !== undefined){
		if (parseInt(value,10) <= lev)
			return true;					
		else
			return false;		
	}
	else
		return true;
}


/*	function readSettings
	Funzione che legge il file di configurazione
----------------------------------------------------- */
function readSettings(){
	var url = $.trim($(location).attr('pathname'));	
	var login = true;
	var rebcgi = "", rebquery = "";
	var logquery = "", logset = "";
	var firstpage = '';
	document.title = "";
	var countPage = 0;
	$("#authentication-content").prepend("<p>Authentication level: <span class=\"level\">"+GetLevel()+"</span></p>");
	$("#authentication-content").append("<input type=\"button\" id=\"relog\" value=\"Change Level\" onclick=\"redirect('"+pageLogin+"?login=true');\">");	
	
	$.ajaxSetup({ cache: false });
	$.getJSON('Config/settings.json', function(data) {
		$.each(data, function(i, item) {
			switch (item.type.toLowerCase()){			
				case "page":
					if (firstpage == '')
						firstpage = item.site;
					
					if (showMenu(item.show_level)){
						countPage++;						
						
						if (url != "/"+item.site)
							$("<li><a href='"+item.site+"'><span>"+item.label+"</span></a></li>").insertBefore("li#authentication");
						else{
							$("<li class='active'><a href='"+item.site+"'><span>"+item.label+"</span></a></li>").insertBefore("li#authentication");
							$("div#parametri").append("<input type=\"hidden\" id=\"cgi\" value=\""+item.cgi+"\">");
							$("div#parametri").append("<input type=\"hidden\" id=\"query\" value=\""+item.query+"\">");
							document.title = document.title + item.label;							
						}
					}
					break;
				case "loginonstart":
					$("#formlogin").attr("action", item.cgi);
					$("#formchange").attr("action", item.cgi);
					var spliQuery = item.query.split("=");
					if (spliQuery.length > 1)
						logquery = "<input type=\"hidden\" name=\""+spliQuery[0]+"\" value=\""+spliQuery[1]+"\">";
					else
						logquery = "<input type=\"hidden\" name=\"query\" value=\""+item.query+"\">";
					
					spliQuery = item.change.split("=");
					if (spliQuery.length > 1)
						logset = "<input type=\"hidden\" name=\""+spliQuery[0]+"\" value=\""+spliQuery[1]+"\">";
					else
						logset = "<input type=\"hidden\" name=\"query\" value=\""+item.query+"\">";
					
					if (item.require.toLowerCase() == "false")
						login = false;
					break;
				case "logout":
					$("#authentication-content").append("<input type=\"button\" id=\"logout\" value=\"Log Out\" onclick=\"logout();\">");
					$("#authentication-content").append("<input type=\"hidden\" id=\"cgi-logout\" value=\""+item.cgi+"\" >");
					$("#authentication-content").append("<input type=\"hidden\" id=\"query-logout\" value=\""+item.query+"\" >");
					break;
				case "project":
					$("#footer h1").append(item.name);
					document.title = item.name + "  ~  " + document.title ;
					break;
				case "reboot":
					rebcgi = item.cgi
					rebquery = item.query ;
					break;
			}
		});
		
		switch (url){
			case "/":
			case pageLogin:
				if (!login){
					if (urlParam('login') !== undefined)
						if (urlParam('login') === 'true'){
							$( "div#login-Index:hidden" ).fadeIn( 500 );
							$("#inputs").append(logquery);
							$("#inputs").append("<input type=\"hidden\" id=\"firstpage\" value=\""+firstpage+"\">");
							return;
						}
					//console.log("redirect");
					location.href = firstpage;
				}
				else{
					$( "div#login-Index:hidden" ).fadeIn( 500 );
					$("#inputs").append(logquery);
					$("#inputs").append("<input type=\"hidden\" id=\"firstpage\" value=\""+firstpage+"\">");
				}
				break;
			case pageChangeLogin:
					$( "div#login-Index:hidden"	).fadeIn( 500 );
					$("#log h2").html(GetLevel());
					$("#inputs").append(logset);
					$("#inputs").append("<input type=\"hidden\" name=\"login\" value=\""+LevelAuth[$.cookie("CGISESSID").slice(4,5)]+"\">");
					$("#inputs").append("<input type=\"hidden\" id=\"firstpage\" value=\""+firstpage+"\">");				
				break;
			case pageReboot:
				eseguiAjax(rebcgi, rebquery, null,null, false);
				var rebmin = parseInt(urlParam('reboot'),10);
				var redir = urlParam('redirect');
				//console.log("reb time: "+rebmin);
				if (rebmin > 1){
					rebmin = rebmin *60;
					$('#CountDownTimer').attr('data-timer',rebmin);
					$('#CountDownTimer').css('width', '600px'); 
					$("#CountDownTimer").TimeCircles({count_past_zero: false, time: { Days: { show: false }, Hours: { show: false },Minutes: { "color": "#FFCC66" }, Seconds: { "color": "#00CC33" } }})
										.addListener(function(unit,value,total) { 
												if (total == 0) {
														if (redir != null && redir != "")
															location.href = "http://"+redir+pageLogin;
														else
															location.href = pageLogin;
												} 
										});
				}
				else{
					$('#CountDownTimer').attr('data-timer',60);
					$('#CountDownTimer').css('width', '300px'); 
					$("#CountDownTimer").TimeCircles({count_past_zero: false, time: { Days: { show: false }, Hours: { show: false },Minutes: { show: false }, Seconds: { "color": "#00CC33" } }})
										.addListener(function(unit,value,total) { 
												if (total == 0) { 
														if (redir != null && redir != "")
															location.href = "http://"+redir+pageLogin;
														else
															location.href = pageLogin;
												} 
										});
				}
				break;
			default:
				if (($("#query").length > 0)&&($("#cgi").length > 0)){
					var cgi = $("#cgi").val();
					var query = $("#query").val();
					var dati = eseguiAjax(cgi, query, fillSelect, menuFunc, true);
				}
				if (countPage == 0)
					location.href = pageLogin;
				break;
		}
	});
}

/*	function OpenIframe
	Funzione utile per l'apertura di un Iframe
	
	input:
	* pagina: pagina da aprire nell'iframe 
	* query: dati GET 
----------------------------------------------------- */
function OpenIframe(pagina, GET){
	$("#extruderRight").remove();
	var arr = GET.split('&');
	$.each(arr, function(i, item){
		var el = item.split('=');
		if ((el.length > 1) && (el[0] == 'help')){
			if (el[1] != "0")
			{
				$("#main").append($("<div>").attr('id','extruderRight'));
				$("#extruderRight").addClass("{title:'HELP', url:'help/"+el[1]+"'}");
				$("#extruderRight").buildMbExtruder({
					position:"right",
					width:450,
					extruderOpacity:.8,
					textOrientation:"tb",
					onExtOpen:function(){},
					onExtContentLoad:function(){},
					onExtClose:function(){}
				});
			}
		}
	});

	var url = pagina + (GET != "" ? "?"+GET : "");
	
	if (pagina.indexOf("#") != 0)		
		$('#iframe').attr('src', url);
	else
		$(location).attr('href',url.substring(1));
}

/*	funzione LoginFunc
	funzione per l'autenticazione
	
	input:
	* event: evento
----------------------------------------------------- */
function LoginFunc(event){
	event.isImmediatePropagationStopped();	
	var url = $("#formlogin").attr( "action" );
    var str = $( "#formlogin" ).serialize();
	var posting = $.post( url, str );								
	posting.done(function(data) {
					var arr = $.parseJSON(data);
					if (arr.value.toLowerCase() == "fail"){
						$("#resultLogin").empty().html("<b> Password Not Correct </b>").css("color", ROSSO);
						$("#pwd").val("");
					}
					else if(arr.value.toLowerCase() == "change"){
						$("#pwd").val("");
						$("#resultLogin").empty().html("<b>Welcome <i>"+$( "#login option:selected" ).text()+"</i></b>").css("color", VERDE);						
						setTimeout(function() {
							location.href = pageChangeLogin;
						}, 1000);
					}
					else{
						$("#pwd").val("");
						$("#resultLogin").empty().html("<b>Welcome <i>"+$( "#login option:selected" ).text()+"</i></b>").css("color", VERDE);						
						setTimeout(function() {
							location.href = $("#firstpage").val();
						}, 1000);
					}
			})
		   .fail(function() {
				$("#resultLogin").empty().html("<b> Communication Error </b>").css("color", ROSSO);
				$("#pwd").val("");
			});
}

/*	funzione ChangeFunc
	funzione per il cambio password
	
	input:
	* event: evento
----------------------------------------------------- */
function ChangeFunc(event){
	event.isImmediatePropagationStopped();
	var url = $("#formchange").attr( "action" );
    var str = $( "#formchange" ).serialize();
	var posting = $.post( url, str );
	posting.done(function(data) {
			var arr = $.parseJSON(data);
					if (arr.value.toLowerCase() == "fail"){
						$("#resultLogin").empty().html("<b> Password changing failed! </b>").css("color", ROSSO);
						$("#re-pwd").val("");
						$("#new-pwd").val("").focus();
					}
					else{
						$("#re-pwd").val("");
						$("#new-pwd").val("");
						$("#resultLogin").empty().html("<b>Password changed correctly!</b>").css("color", VERDE);
						setTimeout(function() {
							location.href = $("#firstpage").val();
						}, 1000);
					}
			})
		   .fail(function() {
				$("#resultLogin").empty().html("<b> Communication Error </b>").css("color", ROSSO);
				$("#re-pwd").val("");
				$("#new-pwd").val("").focus();
			});
}

function redirect(page){
	//console.debug(pageLogin); 
	location.href = page;
}

/*	funzione logout
	funzione che cancella i cookie e redirige alla pagina di login
----------------------------------------------------- */
function logout()
{	
	//notifico con una cgi che è stato fatto il logout
	eseguiAjax($("#cgi-logout").val(), $("#query-logout").val(), null, null, null);
	$.cookie("CGISESSID", null);
	redirect(pageLogin+'?login=true');
}