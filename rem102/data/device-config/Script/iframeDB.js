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
	
	var url = $.trim($(location).attr('pathname'));	
	var cgi = urlParam('cgi');
	var queryR = urlParam('query');
	eseguiAjax(cgi, queryR, buildTable_DB, null, true);
	$("#Iframe_container").fadeIn( "slow" );
	
	var set = urlParam('set');
	if (set != "" && set != null ){
		$("form#setData").attr('action', urlParam('cgi'));
		var query = set.split('=');
		
		$("#head_date").append($("<fieldset id=\"db_fieldset\">")
							.append($("<legend>").text("Start Date"))
							.append("<input type=\"hidden\" name=\""+query[0]+"\" value=\""+query[1]+"\" >")
							.append("<input type=\"text\" name=\"datetime\" id=\"date_timepicker_start\" required placeholder=\"Select a Date\"/>")
							.append("<input type=\"hidden\" name=\"year\">")
								.append("<input type=\"hidden\" name=\"month\">")
								.append("<input type=\"hidden\" name=\"day\">")
							.append("<input type=\"submit\" value=\"Set Values\" >"));
		$( "form" ).submit( function(event){RangeTime(event); return false;});
		
		$('#date_timepicker_start').datetimepicker({
											 format:'F j, Y',
											 minDate:'2010/01/01',
											 maxDate:'2037/12/31',
											 onChangeDateTime:function(dp,$input){
												$("#head_date input[name='year']").val(dp.getYear()+ 1900);
												$("#head_date input[name='month']").val(("0" + (dp.getMonth() + 1)).slice(-2));
												$("#head_date input[name='day']").val(("0" + (dp.getDate())).slice(-2));
											 },
											 timepicker:false
										});
	}
	
	if (cyc>0){		
		setInterval(function() {
			eseguiAjax(urlParam('cgi'),urlParam('query'), buildTable_DB, null, false);
		},cyc);
	}			
});



function sortmyway(data_A, data_B)
{
    return (data_A.column_no - data_B.column_no);
}

/*	function buildTable Database
	Funzione necessaria per creare la tabella 
	ed aggiornare il DOM
	
	input:
	* data: dati Json 
----------------------------------------------------- */
var buildTable_DB = function (data){	
	var selected = "";
	
	$("thead tr").empty();
	$("tbody").empty();
	
	
	data = data.sort(function sortmyway(data_A, data_B){
		return (data_A.column_no - data_B.column_no);
	});
	
	$.each(data, function(i, item) {
		switch(item.type.toLowerCase()){
			case "head":
				$("thead tr").append($('<th>').text(item.column_name));
				break;
			case "data":
				var r = 0;
				if (item.events.length > 0){
					$.each(item.events, function(j,eve) {
					var classtd = ""
					if (r%2 == 0)
						classtd = 'alternate';
						
					$("tbody").append(
						$('<tr>').append(
								$('<td>').text(eve.ID).addClass(classtd)
							).append(
								$('<td>').text(eve.DATATIME).addClass(classtd)
							).append(
								$('<td>').text(eve.CODE).addClass(classtd)
							).append(
								$('<td>').text(eve.USER).addClass(classtd)
							).append(
								$('<td>').text(eve.DESCRIPTION).addClass(classtd)
							));
						});
				}
				else{
					$("tbody").append(
						$('<tr>').append($('<td>').attr('colspan','5').text("There are no events available in the device!")));
				}
				break;
		}
	});
		
	$('.dbtable').scrolltable({
					stripe: true,
					oddClass: 'odd'
				});	
}

function RangeTime(event){
	clearInterval(timer);	
	event.isImmediatePropagationStopped();
	var url = $("form").attr( "action" );
	var str = $( "form" ).serialize();
	var msg =""; var btn = ""; var tit = "";  var col = "";
	var posting = $.post( url, str );
	posting.done(function(data) {
			var arr = $.parseJSON(data);
			$('.dbtable').scrolltable('destroy');
			buildTable_DB(arr);
			})
		   .fail(function() {
				$("#result").empty().html("<b> Communication Error </b>").css("color", ROSSO).show().delay(1000).fadeOut();
				//console.debug("fail ");
			})
			.always(function(){
				var cyc = parseInt(urlParam('cyclicTime'),10);
				if (cyc>0){		
					timer = setInterval(function() {
						eseguiAjax(urlParam('cgi'),urlParam('query'), fillRTC, null, false);
					},cyc);
				}
			});
	$("#datetimepicker").val("");
}