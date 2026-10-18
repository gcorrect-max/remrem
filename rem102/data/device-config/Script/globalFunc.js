/*	Main JQuery Function
	Author: Gianluca Maimeri
	Version: 1.0
----------------------------------------------------- */

/*	Constant
----------------------------------------------------- */
var pageLogin = "/index.html";
var pageChangeLogin = "/change.html";
var pageReboot = "/reboot.html";

var timer;

/*	Colori
----------------------------------------------------- */
var ROSSO  = "#FF0000";
var VERDE  = "green";
var GIALLO = "#FFFF00";
var BLU    = "#0000FF";
var GRIGIO = "gray";
var NERO   = "#000000";
var BIANCO = "#FFFFFF";

/*	Array qualita segnale segnale	
----------------------------------------------------- */
	var SignalQality = new Array( "Very Low", "Low", "Good", "Very Good", "Excellent" );

/*	Array livello	
----------------------------------------------------- */
	var LevelAuth = { "A": 0, "B":1, "C":2 , "D":3 };

	var months =  new Array( "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December");
	var dayOfWeek = new Array("Sun","Mon", "Tue", "Wed", "Thu", "Fri", "Sat");

/*	funzione di recupero parametri GET
	
	input:
	* name: nome del parametro GET da recuperare

	output
	* valore del parametro GET richiesto
----------------------------------------------------- */
function urlParam(name){
	return ((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
}

/*	funzione LoadRule
	funzione che carica le regole della pagina
----------------------------------------------------- */
function LoadRule(){	
	var nChe =  $(":checkbox:checked").length;
	var matches = [];
	$(":checkbox:checked").each(function() {
		matches.push(this.id);
	});
	if ($("#foot input[name='rulefile']") != undefined){
		var ruleFile = $("#foot input[name='rulefile']").val();
		if (ruleFile != "null"){
			$.getJSON(ruleFile, function(data) {	
				$.each(data, function(ind, val){
					if ((val.tag === "default") && (nChe === 0)){
						updateCheckRule(val);					
					}
					else if($.inArray(val.tag, matches) > -1){
						updateCheckRule(val);
					}
				});
			});
		}
	}
}

/*	funzione submitFunc
	funzione che esegue le cgi di configurazione
	
	input:
	* event:evento
	* lab: label	
----------------------------------------------------- */
function submitFunc(event, lab){
	event.isImmediatePropagationStopped();
	var reboot = $("#foot #reboot").val();
	openDialog("Confirmation!",
			   "Do you want to Change the settings?",
			   "#4a4a4a",
			   { "Yes": function() { window.top.$("#dialog").dialog("destroy");
									 window.top.$("body").append("<div id=\"overlaydiv\" class=\"ui-widget-overlay ui-front\"><div id=\"wait\"></div></div>");									 
									 window.top.$('#wait').css({width:'200px',height:'100px',color:'white',margin:'0 auto',}).center();
									 var url = $("form").attr( "action" );
									 var str = $( "form" ).serialize();
									 var msg =""; var btn = ""; var tit = "";  var col = "";
									 var error= false;
									 var posting = $.post( url, str );
									 
									 posting.done(function(data){
										var obj = jQuery.parseJSON( data );
										if (obj.value.toLowerCase() == "fail"){
											error = true;
											col=  ROSSO;
											tit = "Configuration Error!";
											$("div#result h1").text("Error: No Change in Settings!").css('color', ROSSO);
											msg = "The change is not allowed by the device. Try with higher level credentials.";
											btn = { "OK": function() { window.top.$("#dialog").dialog("destroy"); window.location.reload();}};
										}
										else if (obj.value.toLowerCase() == "error"){
											error = true;
											col=  ROSSO;
											tit = "Configuration Error!";
											$("div#result h1").text("Error: No Change in Settings!").css('color', ROSSO);
											msg = "The change is not allowed by the device. Something has gone wrong!";
											btn = { "OK": function() { window.top.$("#dialog").dialog("destroy"); window.location.reload();}};
										}
										else{
											var redirect=""; 
											if (obj.redirect != undefined){
												if (obj.redirect != ""){
													redirect= "&redirect="+obj.redirect;
												}											
											}											
											col=  "green";
											tit = "Configuration Done!";
											msg = "Setting changed succesfully!<br>Device Required a Reboot. Execute it now?";
											btn = { "Yes": function() { window.top.$("#dialog").dialog("destroy"); window.top.location.href = pageReboot+"?reboot="+urlParam("reboot")+redirect;},
													"No" : function() { window.top.$("#overlaydiv").remove(); window.top.$("#dialog").dialog("destroy"); window.location.reload();}};
										}
									 })
									 .fail(function(xhr, textStatus, errorThrown) {										 
										error = true;
										col=  ROSSO;
										tit = "Configuration Error!";
										$("div#result h1").text("Error: No Change in Settings!").css('color', ROSSO);
										msg = "Error: No Change in Settings!";
										btn = { "OK": function() { window.top.$("#dialog").dialog("destroy"); window.location.reload();}};
									 })
									 .always(function() {
										if (error){
											openDialog(tit, msg, col, btn );
											window.top.$("#overlaydiv").remove();											
										}
										else{
											window.top.$("#overlaydiv").remove();
											if ( parseInt(reboot,10) > 0)
												openDialog(tit, msg, col, btn );										
											else{
												setTimeout(function(){
														parent.$("#"+lab.replace(" ", "_")).trigger("click");
														//parent.$('ul li > ul li a:contains("'+lab+'")').trigger("click");
													 },1000);
											}
										}
									});
						},
				"No" : function() { window.top.$("#dialog").dialog("close"); window.location.reload();}
			});
}

/*	funzione openDialog
	funzione che apre una finestra di dialogo castomizzata
	
	input:
	* title: titolo della finestra
	* message: messaggio da visualizzare
	* color: colore dell'header
	* btn: bottoni e azioni
----------------------------------------------------- */
function openDialog(title,message, color, btn ){
	//console.log("dialogo");
	window.top.$( "#dialog" ).html(message);
	window.top.$( "#dialog" ).dialog( {
             autoOpen: false,
             show: "fade",
             hide: "fade",
             modal: true,
             minHeight: 150,
			 width: 400,
			 resizable: false,
             title: title,
             buttons: btn
        });
	if ((color != undefined) && (color != null) && (color != ""))
		window.top.$(".ui-dialog-titlebar").css("background",color);
			
	window.top.$("#dialog").dialog("open");
}

/*	function GetLevel
	Funzione che legge i cookie e restituisce l'utente	
----------------------------------------------------- */
function GetLevel(){
	var user = "Guest";
	if ($.cookie("CGISESSID") !== undefined){
		switch (LevelAuth[$.cookie("CGISESSID").slice(4,5)]){
			case 1: user = "User"; break;
			case 2: user = "Admin"; break;
			case 3: user = "Super Admin"; break;
		}
	}
	return user;	
}

/*	function eseguiAjax
	Funzione Ajax Jquery che esegue la cgi
	e passa la risposta ad una funzione
	
	input:
	* cgi				: cgi da eseguire
	* query				: query da associare alla cgi
	* operation			: funzione da eseguire
----------------------------------------------------- */
function eseguiAjax(cgi, query, func1Toexe, func2Toexe, Loadrule){
	$.ajaxSetup({ cache: false });
	var exeCgi = cgi;
	if (query != "")
        exeCgi += '?' + query;

    

	$.getJSON(exeCgi, function(data) {
		if (func1Toexe != null)
			func1Toexe(data);
		if (func2Toexe != null)
			func2Toexe();		
	})
	.success(function(data) {
		var enable = isEnabled(data);
		if (data.value != undefined){
			if (data.value.toLowerCase() == "fail")
				$("#Iframe_container").empty().html("Needed Authentication!");
		}
		else
			if (enable && Loadrule) 
				LoadRule();
	})
	.error(function(jqXHR, textStatus, errorThrown) { //console.log(cgi+ " error :" + textStatus);
	})
	.complete(function(data) { });
}

var menuFunc = function(){
	$('#accordNav > li > a').click(function(){
										if ($(this).attr('class') != 'active'){
										  $('#accordNav li ul').slideUp();
										  $(this).next().slideToggle();
										  $('#accordNav li a').removeClass('active');
										  $(this).addClass('active');
										}
									});									  
	if ($("body").attr("id") == "main"){
		$('#accordNav > li:eq(0) > a').trigger("click");
	}
}

/*	function fillSelect
	Funzione necessaria per aggiornare il DOM
	
	input:
	* data: dati Json 
----------------------------------------------------- */
var fillSelect = function(data) {	
	var enable = isEnabled(data);	
	$.each(data, function(i, item) {
	switch (item.type){
		case "check":
			$('input[id='+item.tag+']').attr('checked', item.value);
			if (!enable){
				$("#"+item.tag).attr("disabled", true);
				$("#td_"+item.tag).css('background',"#EAEAAE");					
			}
		break;
		case "input":
		case "password":
			$('#'+item.tag).val(item.value);
			if (!enable){
				$("#"+item.tag).attr("disabled", true);
				$("#td_"+item.tag).css('background',"#EAEAAE");					
			}
		break;
		case "text":
			$('#lab_'+item.tag+':empty').text(item.label);
			$('#lab_'+item.tag).attr('title',item.label);
			$('#span_'+item.tag).empty().text(item.value).attr('title',item.label).css('color',item.color);			
			if (!enable){
				$("#td_"+item.tag).css('background',"#EAEAAE");					
			}
		break;
		case "select":
			$("#"+item.tag).val(item.value);
			if (!enable){
				$("#"+item.tag).attr("disabled", true);
				$("#td_"+item.tag).css('background',"#EAEAAE");					
			}
		break;
		case "menu":
            if( (item.hasOwnProperty("en_cgi")) && (item.hasOwnProperty("en_query")) )
            {
                var exeCgi = item.en_cgi + "?" + item.en_query;

                $.ajaxSetup({ cache: false, async: false});

                $.getJSON(exeCgi, function(data) 
                {

                }).success(function(data)
                {
                    if(data.value == "ok")
                    {
                        createMenu(item);
                    }
                }).error(function(jqXHR, textStatus, errorThrown)
                {

                }).complete(function(data)
                {

                });
            }
            else
            {
                createMenu(item);
            }
		break;
		case "bar":
			$('td[id="td_'+item.tag+'"]').attr('title', 'Quality: '+SignalQality[item.value - 1]);
			for (var c=1; c<6; c++){				
				if (item.value < c)
					$('.B'+c).css('display','none');
				else
					$('.B'+c).css('display','block');
			}
			break;
	}
  });  
}

/*	function fillSelect
	Funzione necessaria per aggiornare il DOM
	
	input:
	* data: dati Json 
----------------------------------------------------- */
var fillSelectRO = function(data) {
	$.each(data, function(i, item) {
	switch (item.type){
		case "check":
			$('input[id='+item.tag+']').attr('checked', item.value).prop('disabled', true);		
		break;
		case "input":
		case "text":
		case "select":
			$('#span_'+item.tag).empty().text(item.value).attr('title',item.label).css('color',item.color);
		break;
		case "password":
			$('#span_'+item.tag).empty().text("********").attr('title',item.label).css('color',item.color);
		break;
		case "menu":
			createMenu(item);
		break;
		case "bar":
			$('td[id="td_'+item.tag+'"]').attr('title', 'Quality: '+SignalQality[item.value - 1]);
			for (var c=1; c<6; c++){				
				if (item.value < c)
					$('.B'+c).css('display','none');
				else
					$('.B'+c).css('display','block');
			}
			break;
	}
  });  
}

function isEnabled(data){
	var enable = true;
	$.map(data, function(obj) {
		if (obj.type != undefined)
			if(obj.type.toLowerCase() === "enable")
				enable = (obj.value.toLowerCase() === 'true');
	});	
	return enable;
}

/*	function buildTable
	Funzione necessaria per creare la tabella 
	ed aggiornare il DOM
	
	input:
	* data: dati Json 
----------------------------------------------------- */
var buildTable = function (data){
	var enable = isEnabled(data);	
	var selected = "";
	$.each(data, function(i, item) {
		switch (item.type){
			case "select":
				$("tbody").append(
						$('<tr>').append(
							$('<th>').attr('title', item.label).attr('id', 'lab_'+item.tag).text(item.label)
						).append(
							$('<td>').attr('title', item.label).attr('id', 'td_'+item.tag).css('color', item.color)
						)
					);				
				$("tbody tr:last td").append($('<label>').append("<select name=\""+item.tag+"\" id=\""+item.tag+"\" "+item.options+"></select>"));				
				selected = item.value;
				if (!enable){
					$("#"+item.tag).attr("disabled", true);
					$("#td_"+item.tag).css('background',"#EAEAAE");					
				}
			break;
			case "option":
				if (selected == item.value)
					$("select#"+item.tag).append("<option value=\""+item.value+"\" selected>"+item.options+"</option>");
				else
					$("select#"+item.tag).append("<option value=\""+item.value+"\">"+item.options+"</option>");
			break;
			case "check":
				$("tbody").append(
						$('<tr>').append(
							$('<th>').attr('title', item.label).attr('id', 'lab_'+item.tag).text(item.label)
						).append(
							$('<td>').attr('title', item.label).attr('id', 'td_'+item.tag).css('color', item.color)
						)
					);								
				if (!enable){
					$("tbody tr:last td").append("<input type=\"Checkbox\" name=\""+item.tag+"\" id=\""+item.tag+"\" "+item.options+">");
					$("#"+item.tag).attr("disabled", true);
					$("#td_"+item.tag).css('background',"#EAEAAE");					
				}
				else
					$("tbody tr:last td").append("<input type=\"Checkbox\" name=\""+item.tag+"\" id=\""+item.tag+"\" "+item.options+" onchange=\"checkRule(this.id)\">");
			break;
			case "input":
			case "password":
				var realtype = (item.type=="password") ? "password" : "text";
				$("tbody").append(
						$('<tr>').append(
							$('<th>').attr('title', item.label).attr('id', 'lab_'+item.tag).text(item.label)
						).append(
							$('<td>').attr('title', item.label).attr('id', 'td_'+item.tag).css('color', item.color)
						)
					);				
				$("tbody tr:last td").append("<input type=\""+realtype+"\" name=\""+item.tag+"\" id=\""+item.tag+"\" value=\""+item.value+"\" "+item.options+">");
				if (!enable){
					$("#"+item.tag).attr("disabled", true);
					$("#td_"+item.tag).css('background',"#EAEAAE");					
				}
			break;			
			case "text":
				$("tbody").append(
						$('<tr>').append(
							$('<th>').attr('title', item.label).attr('id', 'lab_'+item.tag).text(item.label)
						).append(
							$('<td>').append($("<span>").attr('id', 'span_'+item.tag).attr('title', item.label).css('color', item.color).text(item.value)).attr('id', 'td_'+item.tag)
							
						)
					);
				if (!enable){
					$("#td_"+item.tag).css('background',"#EAEAAE");					
				}
			break;
			case "bar":
				$("tbody").append(
						$('<tr>').append(
							$('<th>').attr('title', item.label).attr('id', 'lab_'+item.tag).text(item.label)
						).append(
							$('<td>').attr('title', 'Quality: '+SignalQality[item.value - 1]).attr('id', 'td_'+item.tag).attr('align','center')
						)
					);
				$("tbody tr:last td").append($("<div>").attr('id','Bar_container'));
				var idbar = "commonBar";
				if (item.color ==  "green")
					idbar += "Green";
					
				for (var c=1; c<6; c++){				
					if (item.value < c)
						$('#Bar_container').append($("<div>").addClass( idbar +" B"+c ).css('display','none'));
					else
						$('#Bar_container').append($("<div>").addClass( idbar +" B"+c ).css('display','block'));
				}
				break;
			case "note":
				$('table').after("<p><span>Note:</span> "+item.value+"</p>");
				break;
		}
	});
	LoadAlias();

    $("#loading-img").hide();
    $("#setData").show();
}

/*	function buildTable
	Funzione necessaria per creare la tabella 
	ed aggiornare il DOM
	
	input:
	* data: dati Json 
----------------------------------------------------- */
var buildTableRO = function (data){
	var selected = "";
	$.each(data, function(i, item) {
		switch (item.type){
			case "select":
			case "input":
			case "text":
				$("tbody").append(
						$('<tr>').append(
							$('<th>').attr('title', item.label).attr('id', 'lab_'+item.tag).text(item.label)
						).append(
							$('<td>').append($("<span>").attr('id', 'span_'+item.tag).attr('title', item.label).css('color', item.color).text(item.value)).attr('id', 'td_'+item.tag)
						)
					);
			break;			
			case "check":
				$("tbody").append(
						$('<tr>').append(
							$('<th>').attr('title', item.label).attr('id', 'lab_'+item.tag).text(item.label)
						).append(
							$('<td>').attr('title', item.label).attr('id', 'td_'+item.tag).css('color', item.color)
						)
					);
				$("tbody tr:last td").append("<input type=\"Checkbox\" name=\""+item.tag+"\" id=\""+item.tag+"\" "+item.options+" disabled=\"disabled\"  \">");
			break;
			case "password":
				$("tbody").append(
						$('<tr>').append(
							$('<th>').attr('title', item.label).attr('id', 'lab_'+item.tag).text(item.label)
						).append(
							$('<td>').append($("<span>").attr('id', 'span_'+item.tag).attr('title', item.label).css('color', item.color).text("********")).attr('id', 'td_'+item.tag)
						)
					);			
			break;			
		}
	});
	LoadAlias();
}

/*	function createMenu
	Funzione funzione che crea il menu laterale
	
	input:
	* data: dati Json
----------------------------------------------------- */
function createMenu(item){
	var lev = 0;
	if ($.cookie("CGISESSID") !== undefined){
		var cok = $.cookie("CGISESSID").slice(4,5);
		lev = LevelAuth[cok];
	}

	$.each(item.submenu, function (j, val) {
        if( (val.hasOwnProperty("en_cgi")) && (val.hasOwnProperty("en_query")) )
        {
            var exeCgi = item.en_cgi + "?" + item.en_query;

            $.getJSON(exeCgi, function(data) 
            {

            }).success(function(data)
            {

            }).error(function(jqXHR, textStatus, errorThrown)
            {

            }).complete(function(data)
            {
                if(data.value != "ok")
                {
                    delete item.submenu[j];
                }
            });
        }
    });
	
	var first = null;
	$.each(item.submenu, function(j, val) {
        if(val != undefined)
        {
            if (val.show_level !== undefined){
                if (parseInt(val.show_level,10) <= lev)
                    if (first === null){
                        first = val;
                        return false;
                    }
            }
            else{
                first = val;
                return false;
            }
        }
	});
	
	if (first !== null){
		var id = item.label.replace(/\s/g, '');
		var tag = (first.tag != undefined) ? "&tag="+first.tag : "&tag=";
		var set = (first.set != undefined) ? "&set="+first.set : "";
		var set1 = (first.set1 != undefined) ? "&set1="+first.set1 : "";
		var set2 = (first.set2 != undefined) ? "&set2="+first.set2 : "";
		var set1_ite = (item.set1 != undefined) ? "&set1="+item.set1 : "";
		var set2_ite = (item.set2 != undefined) ? "&set2="+item.set2 : "";
		var rules = (first.rules != undefined) ? "&rules="+first.rules : "";
		var alias = (first.alias != undefined) ? "&alias="+first.alias : "";
		var reb = (first.reboot != undefined) ? "&reboot="+first.reboot : "&reboot=0";
		var help = (first.help != undefined) ? "&help="+first.help : "&help=0";
		var ro = (first.write_level !== undefined) ?  ((first.write_level <= lev) ? "&ro=false" : "&ro=true" ): "&ro=false";
		var onClick = (item.web == undefined) ? "OpenIframe('"+first.web+"','query="+first.query+"&label="+first.label+tag+"&cgi="+first.cgi+"&cyclicTime="+first.cyclicTime+set+set1+set2+rules+alias+reb+ro+help+"')" 
											  : "OpenIframe('"+item.web+"','query="+item.query+"&label="+item.label+tag+"&cgi="+item.cgi+"&cyclicTime="+item.cyclicTime+"&set="+item.set+set1_ite+set2_ite+"&rules="+item.rules+"&alias="+item.alias+"&reboot="+item.reboot+"&help="+item.help+"')";
		
		$("#accordNav").append("<li id=\""+id+"\"><a onClick=\""+onClick+"\">"+item.label+"</a><ul id=\"accordNavSub\"></ul></li>");	
		$.each(item.submenu, function(j, val) {
            if(val != undefined)
            {
                var ro = (val.write_level !== undefined) ?  ((val.write_level <= lev) ? "&ro=false" : "&ro=true" ): "&ro=false";
                var reboot = (val.reboot != undefined) ? "&reboot="+val.reboot : "&reboot=0";
                tag = (val.tag != undefined) ? "&tag="+val.tag : "&tag=";
                rules = (val.rules != undefined) ? "&rules="+val.rules : "";
                alias = (val.alias != undefined) ? "&alias="+val.alias : "";
                set = (val.set != undefined) ? "&set="+val.set : "";
                set1 = (val.set1 != undefined) ? "&set1="+val.set1 : "";
                set2 = (val.set2 != undefined) ? "&set2="+val.set2 : "";
                var hel = (val.help != undefined) ? "&help="+val.help : "&help=0";

                var aId = (val.tag != undefined) ? val.tag : val.label;
                if (val.show_level !== undefined){
                    if (parseInt(val.show_level,10) <= lev)
                        $("li#"+id+" ul" ).append("<li><a id=\""+aId.replace(" ", "_")+"\" onClick=\"OpenIframe('"+val.web+"','query="+val.query+"&label="+val.label+tag+"&cgi="+val.cgi+"&cyclicTime="+val.cyclicTime+set+set1+set2+rules+alias+reboot+ro+hel+"')\">"+val.label+"</a></li>");
                }
                else
                    $("li#"+id+" ul" ).append("<li><a id=\""+aId.replace(" ", "_")+"\" onClick=\"OpenIframe('"+val.web+"','query="+val.query+"&label="+val.label+tag+"&cgi="+val.cgi+"&cyclicTime="+val.cyclicTime+set+set1+set2+rules+alias+reboot+ro+hel+"')\">"+val.label+"</a></li>");
            }
		});
	}
}

/*	funzione updateCheckRule
	funzione che esegue l'aggiornamento degli stati delgli elementi
	
	input:
	* val: array di valori
----------------------------------------------------- */
function updateCheckRule(val){
	$.each(val.rules, function(i, item) {
		$("#"+item.tag).attr(item.action,item.action_value)
		if (item.backcolor != 'undefined')
			$("#td_"+item.tag).css('background',item.backcolor);
		});
}

/*	funzione checkRule
	funzione verifica le regole al cambio di una checkbox
	
	input:
	* id:id del Checkbox
----------------------------------------------------- */
function checkRule(id){
	var nChe =  0;//$(":checkbox:checked").length;	
	var ruleFile = $("#foot input[name='rulefile']").val();	
	$.getJSON(ruleFile, function(data) {
	
		$.each(data, function(ind, val){
			if (val.tag === "default"){
				$.each(val.rules, function(inn, va){
					if ($("#"+va.tag).is(":checked"))
						nChe++;
				});
			}
		});
		$.each(data, function(ind, val){
			if (nChe === 0){
				if (val.tag === "default"){
					updateCheckRule(val);
				}
			}
			else if (val.tag === id){
					updateCheckRule(val);
			}
		});
	});	
}


var fillRTC = function (data){
	var y="", m="", d="", h="", mi="", s="";
	$.each(data, function(i, item){
		switch (item.tag.toLowerCase()){
			case "year": y=item.value; break;
			case "month": m=item.value;	break;
			case "day":	d=item.value; break;
			case "hour": h=item.value; break;
			case "minute": mi=item.value; break;
			case "second": s=item.value; break;
		}
	});
	
	var nData = new Date(parseInt(y,10),parseInt(m,10)-1,parseInt(d,10));	
	$("#m").text(months[parseInt(m,10)-1]);
	$("#y").text(parseInt(y,10));
	$("#dayname").text(dayOfWeek[nData.getDay()]);
	$("#daynum").text(parseInt(d,10));
	$("#time").text(h+":"+mi+":"+s);
}

/*	funzione LoadRule
	funzione che carica le regole della pagina
----------------------------------------------------- */
function LoadRule(){	
	var nChe =  $(":checkbox:checked").length;
	var matches = [];
	$(":checkbox:checked").each(function() {
		matches.push(this.id);
	});
	if ($("#foot input[name='rulefile']") != undefined){
		var ruleFile = $("#foot input[name='rulefile']").val();
		if (ruleFile != "null"){
			$.getJSON(ruleFile, function(data) {	
				$.each(data, function(ind, val){
					if ((val.tag === "default") && (nChe === 0)){
						updateCheckRule(val);					
					}
					else if($.inArray(val.tag, matches) > -1){
						updateCheckRule(val);
					}
				});
			});
		}
	}
}

/*	funzione LoadAlias
	funzione che carica gli alias della pagina
----------------------------------------------------- */
function LoadAlias(){
	var aliasFile = urlParam("alias");
	if (aliasFile != ""){		
		$.getJSON(aliasFile, function(data) {	
			$.each(data, function(ind, val){
				$("#lab_"+val.tag).text(val.label);
			});
		});
	}	
}

jQuery.fn.center = function () {
    this.css("position","absolute");
    this.css("top", ( $(window).height() - this.height() ) / 2+$(window).scrollTop() + "px");
    this.css("left", ( $(window).width() - this.width() ) / 2+$(window).scrollLeft() + "px");
    return this;
}