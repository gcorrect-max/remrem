/*	Main JQuery Function
	Author: Gianluca Maimeri
	Version: 1.0
	applicability: rtc.html
----------------------------------------------------- */
	
/*	Funzione JQuery che viene eseguita 
	quando il documento è caricato.
	Se esiste l'input query esegue la cgi.
----------------------------------------------------- */
var timer;

$(document).ready(function(){
	var cyc = parseInt(urlParam('cyclicTime'),10);
	$("#rtc_container h1").first().text(unescape(urlParam('label')));
	
	var set = urlParam('set');
	if (set != ""){
		$("form#setData").attr('action', urlParam('cgi'));
		$("#foot").append("<input type=\"hidden\" name=\"rulefile\" value=\""+urlParam('rules')+"\" >");
		var query = set.split('=');					
		$("#foot").append("<input type=\"hidden\" name=\""+query[0]+"\" value=\""+query[1]+"\" >");
		$("#foot").append("<br><br><h2>Set New DateTime</h2>");
		$("#foot").append("<input type=\"text\" name=\"datetimepicker\" id=\"datetimepicker\" required placeholder=\"Click here to select a date\"/><br>");
		$("#foot").append("<input type=\"hidden\" name=\"year\">")
				  .append("<input type=\"hidden\" name=\"month\">")
				  .append("<input type=\"hidden\" name=\"day\">")
				  .append("<input type=\"hidden\" name=\"hour\">")
				  .append("<input type=\"hidden\" name=\"minute\">")
				  .append("<input type=\"hidden\" name=\"second\">");
		$("#foot").append("<input type=\"submit\" value=\"Set Value\" >").append("<br>");
		$("#foot").append("<input type=\"button\" value=\"Change Date and Time from PC\" onclick=\"ChangeFromPC()\">");
		$( "form" ).submit( function(event){ ChangeTime(event); return false;});
		
		$('#datetimepicker').datetimepicker({step:1, 
											 format:'F j, Y,  H:i:00',
											 todayButton: true,
											 yearStart: '1970',
											 yearEnd: '2069',
											 minDate:'1970/01/01',
											 maxDate:'2069/12/31',
											 onChangeDateTime:function(dp,$input){												 
												$("#foot input[name='year']").val(dp.getUTCFullYear());
												$("#foot input[name='month']").val(("0" + (dp.getUTCMonth() + 1)).slice(-2));
												$("#foot input[name='day']").val(("0" + (dp.getUTCDate())).slice(-2));
												$("#foot input[name='hour']").val(("0" + (dp.getUTCHours())).slice(-2));
												$("#foot input[name='minute']").val(("0" + (dp.getUTCMinutes())).slice(-2));
												$("#foot input[name='second']").val(("0" + (dp.getUTCSeconds())).slice(-2));
											}
										});
	}
	eseguiAjax(urlParam('cgi'),urlParam('query').replace(/\~/g, '&'), fillRTC, null, true);
	$("#rtc_container").fadeIn( "slow" );
	if (cyc>0){		
		timer = setInterval(function() {
			eseguiAjax(urlParam('cgi'),urlParam('query').replace(/\~/g, '&'), fillRTC, null, false);
		},cyc);
	}
});


function ChangeTime(event){
	clearInterval(timer);			
	event.isImmediatePropagationStopped();
	$.ajaxSetup({ cache: false });
	var url = $("form").attr( "action" );
	var str = $( "form" ).serialize();
	var posting = $.post( url, str );
	
	
	var alwaysShow = true;
	posting.done(function(data) {
					//console.debug("done "+data);
					var arr = $.parseJSON(data);
					if (arr.value.toLowerCase() == "fail"){						
						$("#result").empty().html("<b> Changing Error! </b>").css("color", ROSSO).show().delay(1000).fadeOut();
					}
					else{						
						$("#result").empty().html("<b> Changing Done Correctly! </b>").css("color", VERDE).show().delay(1000).fadeOut();
					}
					alwaysShow = false;				
			})
		   .fail(function(xhr, textStatus, errorThrown) {
				//$("#result").empty().html("<b> Communication Error </b>").css("color", ROSSO).show().delay(1000).fadeOut();
			})
			.always(function(){
				if (alwaysShow)
					$("#result").empty().html("<b> Changing Done Correctly! </b>").css("color", VERDE).show().delay(1000).fadeOut();
					
				$("#datetimepicker").val("");
				
				var cyc = parseInt(urlParam('cyclicTime'),10);
					if (cyc>0){		
						timer = setInterval(function() {
							eseguiAjax(urlParam('cgi'),urlParam('query').replace(/\~/g, '&'), fillRTC, null,  false);
						},cyc);
					}
			});
		
}

function ChangeFromPC(){
	clearInterval(timer);
	var currentTime = new Date();
	var day = currentTime.getUTCDate();
	var month = currentTime.getUTCMonth() + 1;
	var hour = currentTime.getUTCHours();
	var min = currentTime.getUTCMinutes();		
	var sec = currentTime.getUTCSeconds();
	var yearFull = currentTime.getUTCFullYear();
	if (day < 10)
		day = "0" + day;
	if (month < 10)
		month = "0" + month;
	if (hour < 10)
		hour = "0" + hour;
	if (min < 10)
		min = "0" + min;
	if (sec < 10)
		sec = "0" + sec;
		
	var url = $("form").attr( "action" );
	var str = urlParam('set')+"&year="+yearFull+"&month="+month+"&day="+day+"&hour="+hour+"&minute="+min+"&second="+sec ;
	var posting = $.post( url, str );
	var alwaysShow = true;
	posting.done(function(data) {
					//console.debug("done "+data);
					var arr = $.parseJSON(data);
					if (arr.value.toLowerCase() == "fail"){
						$("#result").empty().html("<b> Changing Error! </b>").css("color", ROSSO).show().delay(1000).fadeOut();
					}
					else{
						$("#result").empty().html("<b> Changing Done Correctly! </b>").css("color", VERDE).show().delay(1000).fadeOut();
					}
					
					alwaysShow = false;
			})
		   .fail(function(xhr, textStatus, errorThrown) {
				//$("#result").empty().html("<b> Communication Error </b>").css("color", ROSSO).show().delay(1000).fadeOut();
			})
			.always(function(){
				if (alwaysShow)
					$("#result").empty().html("<b> Changing Done Correctly! </b>").css("color", VERDE).show().delay(1000).fadeOut();
					
				$("#datetimepicker").val("");	
				var cyc = parseInt(urlParam('cyclicTime'),10);
				if (cyc>0){		
					timer = setInterval(function() {
						eseguiAjax(urlParam('cgi'),urlParam('query').replace(/\~/g, '&'), fillRTC, null,  false);
					},cyc);
				}
			});
	

}
