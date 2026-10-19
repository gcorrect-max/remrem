/*	Main JQuery Function
	Author: Gianluca Maimeri
	Version: 1.0
	applicability: energy.html
----------------------------------------------------- */
var inter;
	
/*	Funzione JQuery che viene eseguita 
	quando il documento è caricato.
	Se esiste l'input query esegue la cgi.
----------------------------------------------------- */
$(document).ready(function(){
	$("h1").first().text(unescape(urlParam('label')));
	var cgi = urlParam('cgi');
	var set = urlParam('set') != null ? urlParam('set') : "";
	if (set != ""){
		$("form#setData").attr('action', cgi);
		$( "form#setData" ).submit( function(event){StartCalibration(event); return false;});
		$("#foot").append("<input type=\"hidden\" name=\"rulefile\" value=\""+urlParam('rules')+"\" >");
		if (set != null){
			var q = set.split('~');
			for (var qi=0;qi < q.length; qi++){
				var query = q[qi].split('=');					
				$("#foot").append("<input type=\"hidden\" name=\""+query[0]+"\" value=\""+query[1]+"\" >");
			}
		}
	}
	$("#cal_container").fadeIn( "slow" );
});

/*	funzione StartCalibration
	funzione che esegue le cgi di calibrazione
	
	input:
	* event:evento
----------------------------------------------------- */
function StartCalibration(event){
	event.isImmediatePropagationStopped();
	openDialog("Confirmation!",
			   "Do you want to start Calibration?",
			   "#4a4a4a",
			   { "Yes": function() { window.top.$("#dialog").dialog("destroy");
									 window.top.$("body").append("<div id=\"overlaydiv\" class=\"ui-widget-overlay ui-front\"><div id=\"wait\"></div></div>");									 
									 window.top.$('#wait').css({width:'200px',height:'100px',color:'white',margin:'0 auto',}).center();
									 var url = $("form").attr( "action" );
									 var str = $( "form" ).serialize();
									 $("#Sequence").fadeOut( "slow", function(){
										 var posting = $.post( url, str );
										 
										 posting.done(function(data){
											var obj = jQuery.parseJSON( data );
											if (obj.value.toLowerCase() == "fail"){											
												$("div#result h1").text("Error: No Change in Settings!").css('color', "#ff0000");
											}
											else{											
												$("#output").html("<p><i>Calibration in progress! </i><b>Wait!</b></p>").css("display","block");
												$('#execution').empty();
												
												inter = setInterval(function() {
													var q = urlParam('query').replace(/\~/g, '&');
													eseguiAjax(urlParam('cgi'),q, answare, null, false);
												},1000);
												
												var cl = new CanvasLoader('execution');
												cl.setColor('#0066ff'); // default is '#000000'
												cl.setShape('spiral'); // default is 'oval'
												cl.setDiameter(155); // default is 40
												cl.setDensity(122); // default is 40
												cl.setRange(0.9); // default is 1.3
												cl.setSpeed(3); // default is 2
												cl.setFPS(30); // default is 24
												cl.show(); // Hidden by default
											}
										 })
										 .fail(function(xhr, textStatus, errorThrown) {
										 })
										 .always(function() {
										 window.top.$("#overlaydiv").remove();										
										});
									 });
						},
				"No" : function() { window.top.$("#dialog").dialog("close"); window.location.reload();}
			});
}


var answare = function(data) {
	$.each(data, function(i, item) {
		if (item.tag == "remshm_8192_0"){
			if (item.value == "0"){
				clearInterval(inter);
				$("#query_combination").empty();
				$("#query_combination").append($("<input>").attr("type","hidden")
												 .attr("name","remshm_0_0")
												 .val(0));
	
				$("#query_combination").append($("<input>").attr("type","hidden")
											     .attr("name","remshm_0_4")
												 .val(0));	
				
				$("#query_combination").append($("<input>").attr("type","hidden")
											     .attr("name","remshm_0_8")
												 .val(0));
												 
				$("#query_combination").append($("<input>").attr("type","hidden")
												 .attr("name","remshm_0_12")
												 .val(0));
												 
				$("#query_combination").append($("<input>").attr("type","hidden")
												 .attr("name","remshm_0_16")
												 .val(0));
				
				var url = $("form").attr( "action" );				
				var str = $( "form" ).serialize();
									
				var posting = $.post( url, str );
										 
				posting.done(function(data){
					var obj = jQuery.parseJSON( data );
					if (obj.value.toLowerCase() == "fail"){
						$("#output").empty().append($("<img>").attr("src","/Images/Warning.png"))
											.append($("<h2>").append("<span>").css("color","red").text("Calibration FAIL!"))
											.append($("<input>").attr("type","button").attr("onclick","window.location.reload();").val("New Calibration"))
											.css("display","block");
					}
					else{
						$("#output").empty().append($("<img>").attr("src","/Images/OK.png"))
											.append($("<h2>").append("<span>").css("color","green").text("Calibration DONE!"))
											.append($("<input>").attr("type","button").attr("onclick","window.location.reload();").val("New Calibration"))
											.css("display","block");
					}
				})
				.fail(function(xhr, textStatus, errorThrown) {
					$("#output").empty().append($("<img>").attr("src","/Images/Warning.png"))
											.append($("<h2>").append("<span>").css("color","red").text("Calibration ERROR!"))
											.append($("<input>").attr("type","button").attr("onclick","window.location.reload();").val("New Calibration"))
											.css("display","block");
				})
				.always(function(){ 
					$('#execution').empty();
				});				
			}
		}
	});
}


function Offset(value,ch){
	$("#query_combination").append($("<input>").attr("type","hidden")
											   .attr("name","remshm_0_0")
											   .val(1));
	
	$("#query_combination").append($("<input>").attr("type","hidden")
											   .attr("name","remshm_0_4")
											   .val(value));	
	
	$("h2").append($("<p>").append($("<span>").css("color","green").text("Calibration Selected: ")).append($("<span>").text("Chanel "+ch+" Offset")));
	sub();
	
}

function Gain(value, ch){
	$("#query_combination").append($("<input>").attr("type","hidden")
								.attr("name","remshm_0_0")
								.val(1));
	
	$("#query_combination").append($("<input>").attr("type","hidden")
								.attr("name","remshm_0_4")
								.val(value));
								
	$("#Sequence").fadeOut( "slow", function() {	
		$("#Sequence").empty().append($("<div>").addClass("div2")
												.append($("<a>").attr("onClick","SubGain('0','DC')").text("Chanel "+ch+" DC")))
							  .append($("<div>").addClass("div2")
												.append($("<a>").attr("onClick","SubGain('1','16Hz AC')").text("Chanel "+ch+" 16Hz AC")))
							  .append($("<div>").addClass("div2")
												.append($("<a>").attr("onClick","SubGain('2','50Hz AC')").text("Chanel "+ch+" 50Hz AC")));
	});	
	$("#Sequence").fadeIn( "slow" );
	$("h2").append($("<p>").append($("<span>").css("color","green").text("Calibration Selected: ")).append($("<span>").text("Chanel "+ch+" Gain ")));
}

function SubGain(value, txt){
	$("#query_combination").append($("<input>").attr("type","hidden")
								.attr("name","remshm_0_8")
								.val(value));
	
	$("#Sequence").fadeOut( "slow", function() {	
		$("#Sequence").empty().append($("<div>").addClass("div2")
												.append($("<a>").attr("onClick","SubSubGain(false)").text("without WT3000")))
							  .append($("<div>").addClass("div2")
												.append($("<a>").attr("onClick","SubSubGain(true)").text("with WT3000")));
	});
	$("#Sequence").fadeIn( "slow" );
	$("h2 p").append($("<span>").text("> "+txt));
	
}

function SubSubGain(value){
	if (!value){
		$("#query_combination").append($("<input>").attr("type","hidden")
									.attr("name","remshm_0_12")
									.val(0));
		$("#query_combination").append($("<input>").attr("type","hidden")
									.attr("name","remshm_0_16")
									.val(0));
		
		sub();
	}
	else{
		$("#Sequence").fadeOut( "slow", function() {	
			$("#Sequence").empty().append($("<div>").addClass("div2").html("<b>Voltage Correction Factor</b>")
									    .append($("<input>").attr("type","text")
										 				    .attr("name","remshm_0_12").val(0)))
								  .append($("<div>").addClass("div2").html("<b>Current Correction Factor</b>")
										.append($("<input>").attr("type","text")
															.attr("name","remshm_0_16").val(0)))
								  .append($("<input>").attr("type","submit").val("Start Calibration"));
	
		});
		$("#Sequence").fadeIn( "slow" );
	}
}



function sub(){
	$("#Sequence").fadeOut( "slow", function() {	
		$("#Sequence").empty().append($("<div>").addClass("div2")
													 .append($("<input>").attr("type","submit").val("Start Calibration")));
	});
	$("#Sequence").fadeIn( "slow" );
}
