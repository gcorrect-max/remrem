	
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
	
	eseguiAjax(cgi, queryR, true);
	
	var set = urlParam('set');
	if (set != ""){
		$("form#setData").attr('action', cgi);
		$("#foot").append("<input type=\"hidden\" name=\"rulefile\" value=\""+urlParam('rules')+"\" >");
		if (set != null){
			var query = set.split('=');					
			$("#foot").append("<input type=\"hidden\" name=\""+query[0]+"\" value=\""+query[1]+"\" >");
			var reboot = urlParam('reboot');						
			if (reboot != ""){
				$("#foot").append("<input type=\"hidden\" id=\"reboot\" value=\""+reboot+"\" >");
			}
			$("#foot").append("<input type=\"submit\" value=\"Set Values\" >");
			$( "form" ).submit( function(event){submitFunc(event, unescape(urlParam('label'))); return false;});
		}
	}
			
	$("#tabella_portFW").fadeIn( "slow" );
	if (cyc>0){		
		setInterval(function() {
			eseguiAjax(urlParam('cgi'),urlParam('query'), "fill", false);
		},cyc);
	}

	$("#Iframe_container").fadeIn( "slow" );	
});

/*	function eseguiAjax
	Funzione Ajax Jquery che esegue la cgi
	e passa la risposta ad una funzione
	
	input:
	* cgi				: cgi da eseguire
	* query				: query da associare alla cgi
	* operation			: funzione da eseguire
----------------------------------------------------- */
function eseguiAjax(cgi, query, Loadrule){
	$.ajaxSetup({ cache: false });
	var exeCgi = cgi;
	if (query != "")
		exeCgi += '?'+query;
	$.getJSON(exeCgi, function(data) {
		var r = 0;
		$.each(data[1], function(i, item) {
			var index = (r >9 ? r : "0"+r);	
			var classtd = ""
			if (r%2 == 0)
				classtd = 'alternate';
			
			$("tbody").append($('<tr>').append($('<td>').attr('id', 'SRCPORT'+index).addClass(classtd))
							   .append($('<td>').attr('id', 'DSTIP'+index).addClass(classtd))
							   .append($('<td>').attr('id', 'DSTPORT'+index).addClass(classtd))
							   .append($('<td>').attr('id', 'PROTO'+index).addClass(classtd)));
			
			r++;
			if (urlParam("ro") === 'true')
				buildTableRO(item, index);
			else
				buildTable(item, index);
		})
		$('#tabella_portFW').scrolltable({
					stripe: true,
					oddClass: 'odd'
				});	
	})
	.success(function(data) {
		if (data.value != undefined){
			if (data.value.toLowerCase() == "fail")
				$("#Iframe_container").empty().html("Needed Authentication!");
		}
		else
			if (Loadrule) 
				LoadRule();
	})
	.error(function(jqXHR, textStatus, errorThrown) { //console.log(cgi+ " error :" + textStatus);
	})
	.complete(function(data) { });
}

/*	function buildTable
	Funzione necessaria per creare la tabella 
	ed aggiornare il DOM
	
	input:
	* data: dati Json 
----------------------------------------------------- */
function buildTable(data, index){	
	var selected = "";
	var commonstyle = "style=\"background-color:transparent\"";
	$.each(data, function(i, item) {
		switch (item.tag){
			case "SRCPORT"+index:
			case "DSTIP"+index:
			case "DSTPORT"+index:
			case "PROTO"+index:
				switch (item.type){
					case "select":
						$("#"+item.tag).append($('<label>').append("<select name=\""+item.tag+"\" "+commonstyle+" id=\""+item.tag+"\" "+item.options+"></select>"));
						selected = item.value;
					break;
					case "option":
						if (selected == item.value)
							$("select#"+item.tag).append("<option value\""+item.value+"\" selected>"+item.value+"</option>");
						else
							$("select#"+item.tag).append("<option value\""+item.value+"\">"+item.value+"</option>");
					break;
					case "check":
						$("#"+item.tag).append("<input type=\"Checkbox\" name=\""+item.tag+"\" "+commonstyle+" id=\""+item.tag+"\" "+item.options+" onchange=\"checkRule(this.id)\">");			
					break;
					case "input":
					case "password":
						var realtype = (item.type=="password") ? "password" : "text";
						$("#"+item.tag).append("<input type=\""+realtype+"\" name=\""+item.tag+"\" "+commonstyle+" id=\""+item.tag+"\" value=\""+item.value+"\" "+item.options+">");
					break;			
					case "text":
						$("#"+item.tag).append($("<span>").attr('title', item.label).css('color', item.color).text(item.value)).attr('id', 'td_'+item.tag);
					break;			
				}
			break;
		}
	});
	
}

/*	function buildTable
	Funzione necessaria per creare la tabella in read only 
	ed aggiornare il DOM
	
	input:
	* data: dati Json 
----------------------------------------------------- */
function buildTableRO(data, index){	
	var selected = "";
	var commonstyle = "style=\"background-color:transparent\"";
	$.each(data, function(i, item) {
		switch (item.tag){
			case "SRCPORT"+index:
			case "DSTIP"+index:
			case "DSTPORT"+index:
			case "PROTO"+index:
				switch (item.type){
					case "select":
					case "text":
					case "input":
						$("#"+item.tag).append($("<span>").attr('title', item.label).css('color', item.color).text(item.value)).attr('id', 'td_'+item.tag);
					break;
					case "check":
						$("#"+item.tag).append("<input type=\"Checkbox\" name=\""+item.tag+"\" "+commonstyle+" id=\""+item.tag+"\" "+item.options+" onchange=\"checkRule(this.id)\">");			
					break;
					case "password":
						$("#"+item.tag).append($("<span>").attr('title', item.label).css('color', item.color).text("********")).attr('id', 'td_'+item.tag);
					break;			
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
function fillSelect(data) {	
	$.each(data, function(i, item) {
	switch (item.type){
		case "check":
			$('input[id='+item.tag+']').attr('checked', item.value);
		break;
		case "input":
		case "password":
			$('#'+item.tag).val(item.value);
		break;
		case "text":
			$('#lab_'+item.tag+':empty').text(item.label);
			$('#lab_'+item.tag).attr('title',item.label);
			$('#span_'+item.tag).empty().text(item.value).attr('title',item.label).css('color',item.color);
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
