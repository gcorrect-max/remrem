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
	$("#App_container h1").first().text(unescape(urlParam('label')));
	
	var url = $.trim($(location).attr('pathname'));	
	var cgi = urlParam('cgi');
	var queryR = urlParam('query').replace(/\~/g, '&');
	eseguiAjax(cgi, queryR, buildAutoTable, null, true);
	$("#App_container").fadeIn( "slow" );
	
	var set = urlParam('set');
	if (set != "" && set != null ){
		$("form#setData").attr('action', cgi);
		$("#head_date").append($("<fieldset id=\"db_fieldset\">").append($("<legend>").text("Hour Select")));
		
		var q = set.split('~');
			for (var qi=0;qi < q.length; qi++){
				var query = q[qi].split('=');					
				$("#db_fieldset").append("<input type=\"hidden\" name=\""+query[0]+"\" value=\""+query[1]+"\" >");
			}
		
		$("#db_fieldset").append("<input type=\"text\" name=\"datetime\" id=\"date_timepicker_start\" required placeholder=\"Select a Date\"/>")
							.append("<input type=\"hidden\" name=\"year\">")
								.append("<input type=\"hidden\" name=\"month\">")
								.append("<input type=\"hidden\" name=\"day\">")
								.append("<input type=\"hidden\" name=\"hour\">")
								.append("<input type=\"hidden\" name=\"minute\" value=\"00\">")
							.append("<input type=\"submit\" value=\"Set Values\" >");
		$( "form" ).submit( function(event){RangeTime(event); return false;});
		
		$('#date_timepicker_start').datetimepicker({
											format:'F j, Y - H:00',
											minDate:'2010/01/01',
											maxDate:'2037/12/31',
											onChangeDateTime:function(dp,$input){
												$("#head_date input[name='year']").val(dp.getUTCFullYear());
												$("#head_date input[name='month']").val(("0" + (dp.getUTCMonth() + 1)).slice(-2));
												$("#head_date input[name='day']").val(("0" + (dp.getUTCDate())).slice(-2));
												$("#head_date input[name='hour']").val(("0" + (dp.getUTCHours())).slice(-2));
											},
											timepicker:true
										});
	}
	
	if (cyc>0){		
		setInterval(function() {
			eseguiAjax(cgi, queryR, fillAutoTable, null, false);
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
var buildAutoTable = function (data){	
	var selected = "";
	
	$(".dbtable thead tr").empty();
	$(".dbtable tbody").empty();
	
	var conNum =0;
	var myArray = [];
	
	$.each(data, function(i, item) {
		switch(item.type.toLowerCase()){
			case "header":
				if (item.table_head.length > 0){
					
					item.table_head = item.table_head.sort(function sortmyway(data_A, data_B){
						return (data_A.column_no - data_B.column_no);
					});
					
					conNum = item.table_head.length;
					$.each(item.table_head, function(j,head){
						$(".dbtable thead tr").append($('<th>').text(head.column_label));
						myArray.push( head.column_name );
					});
				}
				break;
			case "data":
				var r = 0;
				if (item.table_rows.length > 0){
					$.each(item.table_rows, function(j,eve) {					
						$(".dbtable tbody").append($('<tr>'));	
						
						for (var rn=0; rn<conNum; rn++){
							/*if (rn==0)
								$("tbody tr:last").append($('<th>').attr('ID','td_'+myArray[rn]+"_"+j).text(eve[myArray[rn]]));
							else*/
								$(".dbtable tbody tr:last").append($('<td>').attr('ID','td_'+myArray[rn]+"_"+j).text(eve[myArray[rn]]));
						}
							
					});
				}
				else{
					$(".dbtable tbody").append(
						$('<tr>').append($('<td>').attr('colspan',conNum).text("There are no events available in the device!")));
				}
				break;
			
		}
	});	
	$('.dbtable').scrolltable({
					stripe: true,
					oddClass: 'odd'
				});	
}

var fillAutoTable = function(data) {	
	var myArray = [];
	var enable = isEnabled(data);	
	$.each(data, function(i, item) {
		switch(item.type.toLowerCase()){
			case "header":
				if (item.table_head.length > 0){
					
					item.table_head = item.table_head.sort(function sortmyway(data_A, data_B){
						return (data_A.column_no - data_B.column_no);
					});
					
					conNum = item.table_head.length;
					$.each(item.table_head, function(j,head){
						myArray.push( head.column_name );
					});
				}
				break;
			case "data":
				var r = 0;
				if (item.table_rows.length > 0){
					$.each(item.table_rows, function(j,eve) {					
						$(".dbtable tbody").append($('<tr>'));	
						
						for (var rn=0; rn<conNum; rn++){
							$('td_'+myArray[rn]+"_"+j).text(eve[myArray[rn]]);
						}
							
					});
				}				
				break;
			
		}
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
			buildAutoTable(arr);
			
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